import { readSession } from '../_lib/session.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.DB || !env.SESSION_SECRET) return json({ success: false, error: 'not_configured' }, 503);

  const session = await readSession(request, env.SESSION_SECRET);
  if (!session) return json({ success: false, error: 'auth_required' }, 401);

  const user = await env.DB.prepare(
    `SELECT id, display_name, avatar_url, provider, created_at, is_mod, banned FROM users WHERE id = ?`
  ).bind(session.uid).first();
  if (!user || user.banned) return json({ success: false, error: 'forbidden' }, 403);

  const threads = await env.DB.prepare(`SELECT COUNT(*) AS n FROM threads WHERE author_id = ? AND hidden = 0`).bind(user.id).first();
  const replies = await env.DB.prepare(`SELECT COUNT(*) AS n FROM posts WHERE author_id = ? AND hidden = 0`).bind(user.id).first();
  const solved = await env.DB.prepare(`SELECT COUNT(*) AS n FROM threads WHERE author_id = ? AND hidden = 0 AND solved = 1`).bind(user.id).first();
  const saved = await env.DB.prepare(`SELECT COUNT(*) AS n FROM thread_saves WHERE user_id = ?`).bind(user.id).first();

  return json({
    success: true,
    user: {
      id: user.id,
      name: user.display_name,
      avatar: user.avatar_url,
      provider: user.provider,
      joined_at: user.created_at,
      is_mod: !!user.is_mod,
    },
    stats: {
      threads: threads?.n || 0,
      replies: replies?.n || 0,
      solved: solved?.n || 0,
      saved: saved?.n || 0,
    },
  });
}
