/**
 * POST /api/forum/notifications/:id/read -- mark one of YOUR OWN notifications read.
 * Ownership is verified server-side; a notification id from the browser is never trusted.
 */
import { requireSession, json } from '../../../../_lib/authz.js';

export async function onRequestPost(context) {
  const { env, request, params } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured' }, 503);
  const session = await requireSession(request, env);
  if (!session) return json({ success: false, error: 'auth_required' }, 401);

  const notif = await env.DB.prepare('SELECT id FROM notifications WHERE id = ? AND user_id = ?')
    .bind(params.id, session.uid)
    .first();
  if (!notif) return json({ success: false, error: 'not_found' }, 404);

  await env.DB.prepare(`UPDATE notifications SET read_at = datetime('now') WHERE id = ?`).bind(params.id).run();
  return json({ success: true });
}
