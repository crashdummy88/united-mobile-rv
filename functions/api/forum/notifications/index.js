/**
 * GET /api/forum/notifications
 * A member's own notifications only. Rows are inserted by real events:
 * a reply to your thread or a thread you posted in (functions/api/threads/[id]/index.js),
 * or your thread being marked solved (functions/api/forum/threads/[id]/solve.js).
 * Nothing here is generated speculatively.
 */
import { requireSession, json } from '../../../_lib/authz.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured', notifications: [] }, 503);
  const session = await requireSession(request, env);
  if (!session) return json({ success: false, error: 'auth_required' }, 401);

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10) || 30, 100);

  const { results } = await env.DB.prepare(
    `SELECT n.id, n.type, n.thread_id, n.post_id, n.read_at, n.created_at, t.title AS thread_title
     FROM notifications n LEFT JOIN threads t ON t.id = n.thread_id
     WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT ?`
  ).bind(session.uid, limit).all();

  const unread = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL`
  ).bind(session.uid).first();

  return json({ success: true, notifications: results, unread_count: (unread && unread.n) || 0 });
}
