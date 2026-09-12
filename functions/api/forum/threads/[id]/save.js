/**
 * POST   /api/forum/threads/:id/save   -- bookmark a thread
 * DELETE /api/forum/threads/:id/save   -- remove the bookmark
 * Authenticated members only. Duplicate saves are a no-op (PRIMARY KEY dedupes).
 */
import { requireSession, json } from '../../../../_lib/authz.js';

export async function onRequestPost(context) {
  const { env, request, params } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured' }, 503);
  const session = await requireSession(request, env);
  if (!session) return json({ success: false, error: 'auth_required' }, 401);

  const thread = await env.DB.prepare('SELECT id FROM threads WHERE id = ? AND hidden = 0').bind(params.id).first();
  if (!thread) return json({ success: false, error: 'not_found' }, 404);

  await env.DB.prepare('INSERT OR IGNORE INTO saves (user_id, thread_id) VALUES (?, ?)')
    .bind(session.uid, params.id)
    .run();

  return json({ success: true, saved: true });
}

export async function onRequestDelete(context) {
  const { env, request, params } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured' }, 503);
  const session = await requireSession(request, env);
  if (!session) return json({ success: false, error: 'auth_required' }, 401);

  await env.DB.prepare('DELETE FROM saves WHERE user_id = ? AND thread_id = ?')
    .bind(session.uid, params.id)
    .run();

  return json({ success: true, saved: false });
}
