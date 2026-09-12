/**
 * POST /api/forum/threads/:id/report   { reason: string, postId?: string }
 * Authenticated members only. One open report per (reporter, thread) to
 * avoid pile-ons; a fresh report can still be filed once a prior one resolves.
 */
import { requireSession, json } from '../../../../_lib/authz.js';

const REASONS = new Set(['spam', 'abuse', 'misinformation', 'inappropriate', 'dangerous_advice', 'other']);

export async function onRequestPost(context) {
  const { env, request, params } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured' }, 503);
  const session = await requireSession(request, env);
  if (!session) return json({ success: false, error: 'auth_required' }, 401);

  const thread = await env.DB.prepare('SELECT id FROM threads WHERE id = ?').bind(params.id).first();
  if (!thread) return json({ success: false, error: 'not_found' }, 404);

  let body;
  try { body = await request.json(); } catch { return json({ success: false, error: 'invalid_json' }, 400); }

  const reason = REASONS.has(body.reason) ? body.reason : 'other';
  let postId = null;
  if (body.postId) {
    const post = await env.DB.prepare('SELECT id FROM posts WHERE id = ? AND thread_id = ?')
      .bind(String(body.postId).slice(0, 100), params.id)
      .first();
    if (post) postId = post.id;
  }

  const existing = await env.DB.prepare(
    `SELECT id FROM reports WHERE reporter_id = ? AND thread_id = ? AND status = 'open' AND (post_id IS ? OR post_id = ?)`
  ).bind(session.uid, params.id, postId, postId).first();
  if (existing) return json({ success: true, already_reported: true });

  await env.DB.prepare(
    `INSERT INTO reports (id, reporter_id, thread_id, post_id, reason) VALUES (?, ?, ?, ?, ?)`
  ).bind(crypto.randomUUID(), session.uid, params.id, postId, reason).run();

  return json({ success: true, message: 'Report received — a moderator will take a look.' });
}
