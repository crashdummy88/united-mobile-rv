import { readSession } from '../_lib/session.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.SESSION_SECRET) return json({ user: null });
  const session = await readSession(request, env.SESSION_SECRET);
  if (!session) return json({ user: null });

  let isMod = false;
  let banned = false;
  if (env.DB && session.uid) {
    const row = await env.DB.prepare('SELECT is_mod, banned FROM users WHERE id = ?').bind(session.uid).first();
    isMod = !!row?.is_mod;
    banned = !!row?.banned;
  }

  if (banned) return json({ user: null });
  return json({ user: { id: session.uid, name: session.name, avatar: session.avatar, provider: session.provider, is_mod: isMod } });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
