/**
 * GET /api/forum/leaderboard
 * "Top contributors this month" -- real counts only (threads + replies in
 * the last 30 days), no invented points/badges/reputation. Excludes the
 * bot account so it never crowds out real members.
 */
import { json } from '../../_lib/authz.js';

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured', contributors: [] }, 503);

  // Wrapped as a derived table rather than HAVING (with no GROUP BY, since
  // thread_count/reply_count are correlated subqueries, not aggregates)
  // so the (thread_count + reply_count) > 0 filter is unambiguous SQL.
  const { results } = await env.DB.prepare(
    `SELECT * FROM (
       SELECT u.id, u.display_name, u.avatar_url,
         (SELECT COUNT(*) FROM threads t WHERE t.author_id = u.id AND t.hidden = 0 AND t.created_at >= datetime('now','-30 days')) AS thread_count,
         (SELECT COUNT(*) FROM posts p WHERE p.author_id = u.id AND p.hidden = 0 AND p.created_at >= datetime('now','-30 days')) AS reply_count
       FROM users u
       WHERE u.banned = 0 AND u.id != 'bot-umrt-team'
     )
     WHERE (thread_count + reply_count) > 0
     ORDER BY (thread_count + reply_count) DESC
     LIMIT 5`
  ).all();

  return json({
    success: true,
    contributors: (results || []).map((r) => ({
      id: r.id,
      display_name: r.display_name,
      avatar_url: r.avatar_url,
      thread_count: r.thread_count,
      reply_count: r.reply_count,
      total: r.thread_count + r.reply_count,
    })),
  });
}
