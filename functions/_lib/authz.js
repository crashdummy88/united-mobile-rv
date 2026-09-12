/**
 * Small shared auth helpers for the P1-P7 forum API additions
 * (functions/api/forum/**). Reuses the existing session cookie —
 * no new auth mechanism, no new secrets.
 */
import { readSession } from './session.js';

// Validates the session cookie AND re-checks the banned flag on every
// request -- a ban is meaningless if someone's existing 30-day session
// cookie keeps working regardless. This is the one thing "Cloudflare
// mostly handles for us" does NOT cover: app-level abuse enforcement.
export async function requireSession(request, env) {
  if (!env.SESSION_SECRET) return null;
  const session = await readSession(request, env.SESSION_SECRET);
  if (!session) return null;
  if (env.DB) {
    const user = await env.DB.prepare('SELECT banned FROM users WHERE id = ?').bind(session.uid).first();
    if (!user || user.banned) return null;
  }
  return session;
}

export async function requireMod(request, env) {
  const session = await requireSession(request, env); // already re-checks banned
  if (!session || !env.DB) return null;
  const user = await env.DB.prepare('SELECT is_mod FROM users WHERE id = ?').bind(session.uid).first();
  if (!user || !user.is_mod) return null;
  return session;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
