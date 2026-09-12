/**
 * POST /api/forum/threads/:id/solve
 * Body: { replyId?: string }  -- optional accepted-answer post id
 * Only the thread's original author or a moderator can mark it solved.
 * Never trust ownership/mod status from the browser -- always re-check server-side.
 */
import { requireSession, json } from '../../../../_lib/authz.js';

export async function onRequestPost(context) {
  const { env, request, params } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured' }, 503);

  const session = await requireSession(request, env);
  if (!session) return json({ success: false, error: 'auth_required' }, 401);

  const thread = await env.DB.prepare('SELECT id, author_id FROM threads WHERE id = ? AND hidden = 0')
    .bind(params.id)
    .first();
  if (!thread) return json({ success: false, error: 'not_found' }, 404);

  const me = await env.DB.prepare('SELECT is_mod, banned FROM users WHERE id = ?').bind(session.uid).first();
  const isMod = !!(me && !me.banned && me.is_mod);
  const isAuthor = thread.author_id === session.uid;
  if (!isMod && !isAuthor) return json({ success: false, error: 'forbidden' }, 403);

  let body = {};
  try { body = await request.json(); } catch { /* solve with no body is fine */ }
  let acceptedReplyId = null;
  if (body && body.replyId) {
    const reply = await env.DB.prepare('SELECT id FROM posts WHERE id = ? AND thread_id = ? AND hidden = 0')
      .bind(String(body.replyId).slice(0, 100), params.id)
      .first();
    if (reply) acceptedReplyId = reply.id;
  }

  await env.DB.prepare(
    `UPDATE threads SET solved_at = datetime('now'), solved_by = ?, reopened_at = NULL, reopened_by = ?,
       accepted_reply_id = COALESCE(?, accepted_reply_id) WHERE id = ?`
  )
    .bind(session.uid, null, acceptedReplyId, params.id)
    .run();

  // Notify the thread author their question was marked solved (skip if they solved it themselves).
  if (thread.author_id !== session.uid) {
    await env.DB.prepare(
      `INSERT INTO notifications (id, user_id, type, thread_id) VALUES (?, ?, 'thread_solved', ?)`
    ).bind(crypto.randomUUID(), thread.author_id, params.id).run();
  }

  return json({ success: true });
}
