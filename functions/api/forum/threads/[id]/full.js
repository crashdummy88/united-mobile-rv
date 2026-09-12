import { json } from '../../../_lib/authz.js';

export async function onRequestGet(context) {
  const { env, params } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured' }, 503);

  const thread = await env.DB.prepare(
    `SELECT t.id, t.title, t.body, t.category, t.created_at, t.pinned, t.image_keys,
      t.solved_at, t.solved_by, t.accepted_reply_id, t.locked,
      u.id AS author_id, u.display_name AS author, u.avatar_url AS author_avatar
     FROM threads t JOIN users u ON u.id = t.author_id
     WHERE t.id = ? AND t.hidden = 0`
  ).bind(params.id).first();

  if (!thread) return json({ success: false, error: 'not_found' }, 404);

  const { results: posts } = await env.DB.prepare(
    `SELECT p.id, p.body, p.created_at, p.image_keys,
      u.id AS author_id, u.display_name AS author, u.avatar_url AS author_avatar,
      (SELECT COUNT(*) FROM post_votes v WHERE v.post_id = p.id) AS vote_count
     FROM posts p JOIN users u ON u.id = p.author_id
     WHERE p.thread_id = ? AND p.hidden = 0
     ORDER BY p.created_at ASC`
  ).bind(params.id).all();

  return json({
    success: true,
    thread,
    posts: (posts || []).map(p => ({ ...p, vote_count: p.vote_count || 0 })),
  });
}
