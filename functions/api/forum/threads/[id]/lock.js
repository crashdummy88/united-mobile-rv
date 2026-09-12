/**
 * POST /api/forum/threads/:id/lock   { locked: true|false }
 * Moderator-only. Locking stops new replies without hiding the thread —
 * the technical content stays public and searchable (P7 knowledge-base goal).
 */
import { requireMod, json } from '../../../../_lib/authz.js';

export async function onRequestPost(context) {
  const { env, request, params } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured' }, 503);

  const session = await requireMod(request, env);
  if (!session) return json({ success: false, error: 'forbidden' }, 403);

  let body = {};
  try { body = await request.json(); } catch { /* default true */ }
  const locked = body.locked === false ? 0 : 1;

  const thread = await env.DB.prepare('SELECT id FROM threads WHERE id = ?').bind(params.id).first();
  if (!thread) return json({ success: false, error: 'not_found' }, 404);

  await env.DB.prepare('UPDATE threads SET locked = ? WHERE id = ?').bind(locked, params.id).run();
  await env.DB.prepare(
    `INSERT INTO moderation_log (id, thread_id, action, reason) VALUES (?, ?, ?, ?)`
  ).bind(crypto.randomUUID(), params.id, locked ? 'mod_lock' : 'mod_unlock', `by ${session.name}`).run();

  return json({ success: true, locked: !!locked });
}
