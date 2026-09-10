import { readSession } from '../../_lib/session.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function requireMod(request, env) {
  const session = await readSession(request, env.SESSION_SECRET);
  if (!session) return null;
  const user = await env.DB.prepare('SELECT is_mod FROM users WHERE id = ?').bind(session.uid).first();
  if (!user || !user.is_mod) return null;
  return session;
}

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.DB || !env.SESSION_SECRET) return json({ success: false, error: 'not_configured' }, 503);
  const session = await requireMod(request, env);
  if (!session) return json({ success: false, error: 'forbidden' }, 403);

  const { results: threads } = await env.DB.prepare(
    `SELECT t.id, 'thread' AS kind, t.title AS preview, t.ai_reason, t.created_at, u.display_name AS author
     FROM threads t JOIN users u ON u.id = t.author_id WHERE t.hidden = 1 ORDER BY t.created_at DESC LIMIT 50`
  ).all();
  const { results: posts } = await env.DB.prepare(
    `SELECT p.id, 'post' AS kind, p.body AS preview, p.ai_reason, p.created_at, p.thread_id, u.display_name AS author
     FROM posts p JOIN users u ON u.id = p.author_id WHERE p.hidden = 1 ORDER BY p.created_at DESC LIMIT 50`
  ).all();

  return json({ success: true, items: [...threads, ...posts] });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.DB || !env.SESSION_SECRET) return json({ success: false, error: 'not_configured' }, 503);
  const session = await requireMod(request, env);
  if (!session) return json({ success: false, error: 'forbidden' }, 403);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'invalid_json' }, 400);
  }
  const { kind, id, action } = body; // kind: 'thread'|'post', action: 'approve'|'remove'
  if (!kind || !id || !['approve', 'remove'].includes(action)) {
    return json({ success: false, error: 'missing_fields' }, 400);
  }

  const table = kind === 'thread' ? 'threads' : 'posts';
  if (action === 'approve') {
    await env.DB.prepare(`UPDATE ${table} SET hidden = 0 WHERE id = ?`).bind(id).run();
  } else {
    await env.DB.prepare(`UPDATE ${table} SET hidden = 1 WHERE id = ?`).bind(id).run();
  }
  await env.DB.prepare(
    `INSERT INTO moderation_log (id, ${kind === 'thread' ? 'thread_id' : 'post_id'}, action, reason) VALUES (?, ?, ?, ?)`
  )
    .bind(crypto.randomUUID(), id, `mod_${action}`, `by ${session.name}`)
    .run();

  return json({ success: true });
}
