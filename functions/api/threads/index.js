import { readSession, randomId } from '../../_lib/session.js';
import { moderateText } from '../../_lib/moderate.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured', threads: [] }, 503);

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10) || 30, 100);

  const { results } = await env.DB.prepare(
    `SELECT t.id, t.title, t.category, t.created_at, t.updated_at, t.pinned, u.display_name AS author, u.avatar_url AS author_avatar,
      (SELECT COUNT(*) FROM posts p WHERE p.thread_id = t.id AND p.hidden = 0) AS reply_count
     FROM threads t JOIN users u ON u.id = t.author_id
     WHERE t.hidden = 0
     ORDER BY t.pinned DESC, t.updated_at DESC
     LIMIT ?`
  )
    .bind(limit)
    .all();

  return json({ success: true, threads: results });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured' }, 503);
  if (!env.SESSION_SECRET) return json({ success: false, error: 'not_configured' }, 503);

  const session = await readSession(request, env.SESSION_SECRET);
  if (!session) return json({ success: false, error: 'auth_required' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'invalid_json' }, 400);
  }

  const title = (body.title || '').toString().trim().slice(0, 200);
  const text = (body.body || '').toString().trim().slice(0, 8000);
  const category = (body.category || 'general').toString().trim().slice(0, 40) || 'general';

  if (!title || !text) return json({ success: false, error: 'missing_fields' }, 400);

  const mod = await moderateText(env.AI, `${title}\n\n${text}`);
  const hidden = mod.severity === 'high' ? 1 : 0;

  const id = randomId();
  await env.DB.prepare(
    `INSERT INTO threads (id, title, body, category, author_id, hidden, ai_flagged, ai_reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, title, text, category, session.uid, hidden, mod.flagged ? 1 : 0, mod.reason)
    .run();

  if (mod.flagged) {
    await env.DB.prepare(
      `INSERT INTO moderation_log (id, thread_id, author_id, action, reason) VALUES (?, ?, ?, ?, ?)`
    )
      .bind(randomId(), id, session.uid, hidden ? 'auto_hide' : 'flagged', mod.reason)
      .run();
  }

  if (hidden) {
    return json({
      success: true,
      id,
      held_for_review: true,
      message: 'Your post was held for moderator review.',
    });
  }
  return json({ success: true, id });
}
