import { requireSession } from '../../_lib/authz.js';
import { checkRateLimit } from '../../_lib/rate-limit.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured' }, 503);

  // requireSession() (not readSession()) -- re-checks users.banned on every
  // call, same as every other authenticated write route. Fixed 2026-09-15:
  // this previously used readSession() directly, which skipped the ban
  // re-check, letting a banned member keep voting on an old session cookie
  // for up to 30 days.
  const session = await requireSession(request, env);
  if (!session) return json({ success: false, error: 'auth_required' }, 401);

  // Added 2026-09-15: votes had no throttle at all -- a real gap for
  // rapid ranking manipulation. Generous enough for normal browsing/
  // upvoting, tight enough to block bot-like spamming.
  const rl = await checkRateLimit(env, request, { max: 30, windowMinutes: 5, key: 'forum-vote' });
  if (rl.limited) {
    return json({ success: false, error: 'rate_limited', message: 'Too many votes -- please slow down.', retry_after: rl.retryAfter }, 429);
  }

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
