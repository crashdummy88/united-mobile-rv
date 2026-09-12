import { readSession } from '../../_lib/session.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured' }, 503);

  const session = await readSession(request, env.SESSION_SECRET);
  if (!session) return json({ success: false, error: 'auth_required' }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ success: false, error: 'invalid_json' }, 400); }

  const postId = (body.postId || '').toString().trim().slice(0, 100);
  if (!postId) return json({ success: false, error: 'missing_post_id' }, 400);

  const post = await env.DB.prepare('SELECT id FROM posts WHERE id = ? AND hidden = 0').bind(postId).first();
  if (!post) return json({ success: false, error: 'not_found' }, 404);

  const existing = await env.DB.prepare('SELECT user_id FROM post_votes WHERE user_id = ? AND post_id = ?').bind(session.uid, postId).first();

  if (existing) {
    await env.DB.prepare('DELETE FROM post_votes WHERE user_id = ? AND post_id = ?').bind(session.uid, postId).run();
    return json({ success: true, voted: false });
  }

  await env.DB.prepare('INSERT INTO post_votes (user_id, post_id) VALUES (?, ?)').bind(session.uid, postId).run();
  return json({ success: true, voted: true });
}
