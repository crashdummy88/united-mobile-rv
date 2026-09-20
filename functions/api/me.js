import { readSession } from '../_lib/session.js';
import { readSsoCookie } from '../_lib/sso.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  if (env.SESSION_SECRET) {
    const session = await readSession(request, env); // Stage 3: readSession() now takes env, not just the secret
    if (session) {
      return json({ user: { name: session.name, avatar: session.avatar, provider: session.provider || 'google', email: session.email || null } });
    }
  }

  // Fallback: no forum session yet, but recognized via the shared
  // cross-subdomain SSO cookie (e.g. logged in on portal/docs first).
  // Display-only -- does NOT grant forum posting/mod rights, which still
  // require a real forum account and session (see _lib/authz.js).
  if (env.SSO_SHARED_SECRET) {
    const identity = await readSsoCookie(request, env.SSO_SHARED_SECRET);
    if (identity) {
      return json({ user: { name: identity.name, avatar: identity.avatar, provider: identity.provider, email: identity.email || null, ssoOnly: true } });
    }
  }

  return json({ user: null });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
