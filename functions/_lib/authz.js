/**
 * Small shared auth helpers for the P1-P7 forum API additions
 * (functions/api/forum/**). Reuses the existing session cookie —
 * no new auth mechanism, no new secrets.
 */
import { readSession } from './session.js';

export async function requireSession(request, env) {
  if (!env.SESSION_SECRET) return null;
  return readSession(request, env.SESSION_SECRET);
}

export async function requireMod(request, env) {
  const session = await requireSession(request, env);
  if (!session || !env.DB) return null;
  const user = await env.DB.prepare('SELECT is_mod, banned FROM users WHERE id = ?').bind(session.uid).first();
  if (!user || user.banned || !user.is_mod) return null;
  return session;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
