import { readSession } from '../../_lib/session.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured', online: 0 }, 503);
  const row = await env.DB.prepare(`SELECT COUNT(*) AS count FROM online_sessions WHERE last_seen >= datetime('now','-5 minutes')`).first();
  return json({ success: true, online: row?.count || 0 });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured' }, 503);
  const session = await readSession(request, env.SESSION_SECRET);
  if (!session) return json({ success: false, error: 'auth_required' }, 401);
  await env.DB.prepare(`INSERT INTO online_sessions (user_id, last_seen) VALUES (?, datetime('now')) ON CONFLICT(user_id) DO UPDATE SET last_seen = datetime('now')`).bind(session.uid).run();
  return json({ success: true });
}
