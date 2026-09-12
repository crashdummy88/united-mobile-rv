/**
 * POST /api/forum/threads/:id/reopen
 * Only the thread's original author or a moderator can reopen a solved thread.
 */
import { requireSession, json } from '../../../../_lib/authz.js';

export async function onRequestPost(context) {
  const { env, request, params } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured' }, 503);

  const session = await requireSession(request, env);
  if (!session) return json({ success: false, error: 'auth_required' }, 401);

  const thread = await env.DB.prepare('SELECT id, author_id, solved_at FROM threads WHERE id = ? AND hidden = 0')
    .bind(params.id)
    .first();
  if (!thread) return json({ success: false, error: 'not_found' }, 404);
  if (!thread.solved_at) return json({ success: false, error: 'not_solved' }, 400);

  const me = await env.DB.prepare('SELECT is_mod, banned FROM users WHERE id = ?').bind(session.uid).first();
  const isMod = !!(me && !me.banned && me.is_mod);
  const isAuthor = thread.author_id === session.uid;
  if (!isMod && !isAuthor) return json({ success: false, error: 'forbidden' }, 403);

  await env.DB.prepare(
    `UPDATE threads SET solved_at = NULL, solved_by = NULL, accepted_reply_id = NULL,
       reopened_at = datetime('now'), reopened_by = ? WHERE id = ?`
  )
    .bind(session.uid, params.id)
    .run();

  return json({ success: true });
}
