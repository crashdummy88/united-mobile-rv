import { json } from '../../_lib/authz.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured', threads: [] }, 503);

  const url = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '5', 10) || 5, 1), 20);

  const { results } = await env.DB.prepare(
    `SELECT t.id, t.title, t.category, t.solved_at,
       (SELECT COUNT(*) FROM posts p WHERE p.thread_id = t.id AND p.hidden = 0) AS reply_count,
       (SELECT COUNT(*) FROM post_votes v JOIN posts p ON p.id = v.post_id WHERE p.thread_id = t.id) AS vote_count,
       (SELECT COUNT(*) FROM thread_views tv WHERE tv.thread_id = t.id AND tv.viewed_at >= datetime('now','-3 days')) AS recent_views
     FROM threads t
     WHERE t.hidden = 0 AND t.updated_at >= datetime('now','-7 days')
     ORDER BY (reply_count * 2 + COALESCE(vote_count, 0) + COALESCE(recent_views, 0)) DESC, t.updated_at DESC
     LIMIT ?`
  ).bind(limit).all();

  return json({ success: true, threads: results || [] });
}
