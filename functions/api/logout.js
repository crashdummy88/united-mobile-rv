import { clearSessionCookie, clearCentralSessionCookie, destroyCentralSessionIfAny } from '../_lib/session.js';
import { clearSsoCookie } from '../_lib/sso.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  // Best-effort: if this is a new-format (Stage 3) session, delete its
  // row from PORTAL_DB.sessions too, not just the cookie.
  await destroyCentralSessionIfAny(request, env);

  // Fixed 2026-09-15 alongside Stage 3: this used to send only ONE
  // Set-Cookie (the host-only legacy shape), which (a) never cleared a
  // new-format Domain-wide cookie correctly -- a clearing cookie must
  // match the original's Domain attribute exactly or it silently no-ops
  // -- and (b) never touched the separate umrt_sso cookie at all, the
  // same bug already fixed in the portal (see umrt-portal PR #13).
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
  headers.append('Set-Cookie', clearSessionCookie());
  headers.append('Set-Cookie', clearCentralSessionCookie());
  headers.append('Set-Cookie', clearSsoCookie());
  return new Response(JSON.stringify({ success: true }), { status: 200, headers });
}
