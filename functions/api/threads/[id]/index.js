import { readSession, randomId } from '../../../_lib/session.js';
import { moderateText } from '../../../_lib/moderate.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestGet(context) {
  const { env, params } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured' }, 503);

  const thread = await env.DB.prepare(
    `SELECT t.id, t.title, t.body, t.category, t.created_at, t.pinned, u.display_name AS author, u.avatar_url AS author_avatar
     FROM threads t JOIN users u ON u.id = t.author_id
     WHERE t.id = ? AND t.hidden = 0`
  )
    .bind(params.id)
    .first();

  if (!thread) return json({ success: false, error: 'not_found' }, 404);

  const { results: posts } = await env.DB.prepare(
    `SELECT p.id, p.body, p.created_at, u.display_name AS author, u.avatar_url AS author_avatar
     FROM posts p JOIN users u ON u.id = p.author_id
     WHERE p.thread_id = ? AND p.hidden = 0
     ORDER BY p.created_at ASC`
  )
    .bind(params.id)
    .all();

  return json({ success: true, thread, posts });
}

export async function onRequestPost(context) {
  const { env, params, request } = context;
  if (!env.DB || !env.SESSION_SECRET) return json({ success: false, error: 'not_configured' }, 503);

  const session = await readSession(request, env.SESSION_SECRET);
  if (!session) return json({ success: false, error: 'auth_required' }, 401);

  const thread = await env.DB.prepare('SELECT id FROM threads WHERE id = ? AND hidden = 0')
    .bind(params.id)
    .first();
  if (!thread) return json({ success: false, error: 'not_found' }, 404);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'invalid_json' }, 400);
  }
  const text = (body.body || '').toString().trim().slice(0, 8000);
  if (!text) return json({ success: false, error: 'missing_body' }, 400);

  const mod = await moderateText(env.AI, text);
  const hidden = mod.severity === 'high' ? 1 : 0;

  const id = randomId();
  await env.DB.prepare(
    `INSERT INTO posts (id, thread_id, author_id, body, hidden, ai_flagged, ai_reason) VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, params.id, session.uid, text, hidden, mod.flagged ? 1 : 0, mod.reason)
    .run();

  if (!hidden) {
    await env.DB.prepare(`UPDATE threads SET updated_at = datetime('now') WHERE id = ?`)
      .bind(params.id)
      .run();
  }

  if (mod.flagged) {
    await env.DB.prepare(
      `INSERT INTO moderation_log (id, post_id, thread_id, author_id, action, reason) VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(randomId(), id, params.id, session.uid, hidden ? 'auto_hide' : 'flagged', mod.reason)
      .run();
  }

  if (hidden) {
    return json({ success: true, id, held_for_review: true, message: 'Your reply was held for moderator review.' });
  }
  return json({ success: true, id });
}
