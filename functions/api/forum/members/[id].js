/**
 * GET /api/forum/members/:id
 * Public member profile -- real data only. No invented points, badges,
 * reputation, or follower counts; those need real infrastructure first.
 */
import { json } from '../../../_lib/authz.js';
import { publicThreadSql } from '../../../_lib/forum-growth.js';

export async function onRequestGet(context) {
  const { env, params } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured' }, 503);

  const user = await env.DB.prepare(
    `SELECT id, display_name, avatar_url, created_at FROM users WHERE id = ? AND banned = 0`
  ).bind(params.id).first();
  if (!user) return json({ success: false, error: 'not_found' }, 404);

  const threadCount = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM threads t WHERE t.author_id = ? AND ${publicThreadSql('t')}`
  ).bind(params.id).first();
  const replyCount = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM posts p JOIN threads t ON t.id = p.thread_id
     WHERE p.author_id = ? AND p.hidden = 0 AND ${publicThreadSql('t')}`
  ).bind(params.id).first();
  const solvedCount = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM threads t WHERE t.author_id = ? AND ${publicThreadSql('t')} AND t.solved_at IS NOT NULL`
  ).bind(params.id).first();

  const { results: recentThreads } = await env.DB.prepare(
    `SELECT id, title, category, created_at, updated_at, solved_at FROM threads t
     WHERE t.author_id = ? AND ${publicThreadSql('t')} ORDER BY t.created_at DESC LIMIT 10`
  ).bind(params.id).all();

  return json({
    success: true,
    member: {
      id: user.id,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      joined: user.created_at,
      thread_count: (threadCount && threadCount.n) || 0,
      reply_count: (replyCount && replyCount.n) || 0,
      solved_count: (solvedCount && solvedCount.n) || 0,
      recent_threads: recentThreads,
    },
  });
}
