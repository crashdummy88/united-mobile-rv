/**
 * Signed session cookie helpers.
 *
 * Stage 3 of the auth-unification migration (2026-09-15): this now
 * issues CENTRAL, DB-backed sessions -- stored in the shared
 * PORTAL_DB.sessions table, the same mechanism the portal itself
 * already uses -- with a Domain=.unitedmobilerv.com cookie, so a
 * session is valid across every *.unitedmobilerv.com subdomain, not
 * just whichever one you happened to sign in on.
 *
 * Central sessions are signed with env.CENTRAL_SESSION_SECRET, a NEW
 * secret (added 2026-09-15) set to the SAME value on both this project
 * and umrt-portal's Cloudflare Pages project -- deliberately NOT this
 * project's own SESSION_SECRET (kept for the legacy format only) or
 * SSO_SHARED_SECRET (that one's documented contract is display-only,
 * never real auth). Without a shared secret, a session either app issues
 * could never be verified by the other, which defeats the point of this
 * stage -- see umrt-portal's _lib/auth.js for the mirrored logic there.
 *
 * BACKWARD COMPATIBLE ON PURPOSE: readSession() tries the new DB-backed
 * format first, and falls back to the OLD stateless-HMAC verification
 * (no DB lookup, host-only cookie, no Domain attribute) if that fails.
 * An existing forum user's pre-Stage-3 cookie keeps working exactly as
 * before until it naturally expires (30 days) or they log in again --
 * nobody gets silently signed out by this deploy. Every new login gets
 * the new format from here on. The legacy verification path (and this
 * whole fallback) can be deleted once enough time has passed that no
 * old-format cookies remain (30+ days after this ships).
 *
 * Session payload for callers: { uid, name, avatar, provider } -- same
 * shape either way, so every existing caller (authz.js, me.js, etc.)
 * keeps working unchanged regardless of which format resolved it.
 */

const COOKIE_NAME = 'umrt_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * True only for a real *.unitedmobilerv.com subdomain (forum., portal.,
 * shop., docs., ...) -- false for the bare apex (unitedmobilerv.com,
 * WordPress, a different trust boundary entirely) and false for any
 * *.pages.dev host. This matters for two reasons, found in security
 * review (2026-09-15): (1) a browser silently DROPS a Set-Cookie whose
 * Domain attribute doesn't domain-match the responding host -- a
 * Domain=.unitedmobilerv.com cookie sent from a *.pages.dev origin never
 * actually gets stored, so issuing it unconditionally there would have
 * silently broken login on any property not yet on its custom domain
 * (this shipped safely here only because forum's custom domain is
 * already live -- the portal side of this migration was not so lucky,
 * see umrt-portal's _lib/auth.js). (2) Domain=.unitedmobilerv.com also
 * covers the bare apex itself, i.e. the WordPress marketing site -- a
 * separate, less-trusted piece of infrastructure that should never see
 * a real session token. Scoping the cookie to only fire on an actual
 * *.unitedmobilerv.com subdomain request keeps both failure modes closed.
 */
function isRealSubdomainHost(hostname) {
  return /\.unitedmobilerv\.com$/i.test(hostname || '');
}

function b64url(bytes) {
  let bin = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export function randomId() {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------
// New: central, DB-backed session (Stage 3)
// ---------------------------------------------------------------------

/**
 * Creates a session row in the shared PORTAL_DB.sessions table and
 * returns a Set-Cookie value referencing it. Domain-wide
 * (Domain=.unitedmobilerv.com, valid across every *.unitedmobilerv.com
 * subdomain) ONLY when `request` shows we're actually being served from
 * a real *.unitedmobilerv.com host; host-only otherwise (e.g. still on
 * *.pages.dev) -- see isRealSubdomainHost() above for why this can't be
 * unconditional. `centralUserId` is a row id in PORTAL_DB.users (NOT
 * this forum's own local user id). `request` is optional for backward
 * compatibility with existing callers/tests, but its absence means
 * "assume not a real subdomain" (host-only) -- always pass it in real code.
 */
export async function createCentralSessionCookie(centralUserId, env, request) {
  const rawId = randomId();
  const expiresAt = new Date(Date.now() + MAX_AGE_SECONDS * 1000).toISOString();
  await env.PORTAL_DB.prepare(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`
  ).bind(rawId, centralUserId, expiresAt).run();

  const key = await hmacKey(env.CENTRAL_SESSION_SECRET);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawId));
  const token = `${rawId}.${b64url(sig)}`;
  const hostname = request ? new URL(request.url).hostname : '';
  const domainPart = isRealSubdomainHost(hostname) ? ' Domain=.unitedmobilerv.com;' : '';
  return `${COOKIE_NAME}=${token};${domainPart} Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`;
}

async function readCentralSession(request, env) {
  if (!env.PORTAL_DB || !env.CENTRAL_SESSION_SECRET) return null;
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  const [rawId, sigB64] = match[1].split('.');
  if (!rawId || !sigB64) return null;
  // New-format tokens are `<uuid>.<sig>`; a legacy stateless token's first
  // part is base64url of a JSON payload, which never matches this exact
  // UUID shape -- distinguishes the two formats before touching the DB.
  if (!UUID_RE.test(rawId)) return null;

  try {
    const key = await hmacKey(env.CENTRAL_SESSION_SECRET);
    const valid = await crypto.subtle.verify('HMAC', key, b64urlToBytes(sigB64), new TextEncoder().encode(rawId));
    if (!valid) return null;

    const row = await env.PORTAL_DB.prepare(
      'SELECT user_id, expires_at FROM sessions WHERE id = ?'
    ).bind(rawId).first();
    if (!row) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await env.PORTAL_DB.prepare('DELETE FROM sessions WHERE id = ?').bind(rawId).run().catch(() => {});
      return null;
    }
    return { centralUserId: row.user_id };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------
// Legacy: stateless HMAC session (kept only for backward compatibility
// with cookies issued before Stage 3 -- see file header)
// ---------------------------------------------------------------------

export async function createSessionCookie(payload, secret) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS };
  const json = JSON.stringify(body);
  const payloadB64 = b64url(new TextEncoder().encode(json));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  const sigB64 = b64url(sig);
  const token = `${payloadB64}.${sigB64}`;
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`;
}

async function readLegacySession(request, secret) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  const [payloadB64, sigB64] = match[1].split('.');
  if (!payloadB64 || !sigB64) return null;

  try {
    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      b64urlToBytes(sigB64),
      new TextEncoder().encode(payloadB64)
    );
    if (!valid) return null;

    const json = new TextDecoder().decode(b64urlToBytes(payloadB64));
    const payload = JSON.parse(json);
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------
// Combined entry point -- every existing caller uses this unchanged
// ---------------------------------------------------------------------

/**
 * Resolves the current session regardless of which format issued it.
 * Signature changed in Stage 3: takes `env` (was `secret`) since central
 * lookups need PORTAL_DB and this forum's own DB, not just the secret.
 */
export async function readSession(request, env) {
  const central = await readCentralSession(request, env);
  if (central) {
    if (!env.DB) return null;
    const forumUser = await env.DB.prepare(
      'SELECT id, display_name, avatar_url, email FROM users WHERE central_user_id = ?'
    ).bind(central.centralUserId).first();
    // A central session with no linked local forum user shouldn't happen
    // for a session created by this forum's own login flow (Stage 3
    // links them atomically) -- fail closed rather than guess.
    if (!forumUser) return null;
    return { uid: forumUser.id, name: forumUser.display_name, avatar: forumUser.avatar_url, email: forumUser.email || null };
  }
  return readLegacySession(request, env.SESSION_SECRET);
}

/**
 * Clears BOTH possible cookie shapes -- the new Domain-wide one AND the
 * legacy host-only one (no Domain attribute at all). A browser only
 * ever actually holds one of the two for a given user, but a clearing
 * Set-Cookie must match the ORIGINAL cookie's Domain attribute exactly
 * or it silently fails to clear it (the same rule that governs the
 * umrt_sso cookie -- see _lib/sso.js and the portal's equivalent
 * logout fix). Sending both covers a user on either format without
 * needing to know in advance which one they have.
 */
export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function clearCentralSessionCookie() {
  return `${COOKIE_NAME}=; Domain=.unitedmobilerv.com; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

/** Best-effort: deletes the central session row too, if this cookie is one. */
export async function destroyCentralSessionIfAny(request, env) {
  if (!env.PORTAL_DB) return;
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return;
  const [rawId] = match[1].split('.');
  if (!rawId || !UUID_RE.test(rawId)) return;
  try {
    await env.PORTAL_DB.prepare('DELETE FROM sessions WHERE id = ?').bind(rawId).run();
  } catch {
    // best-effort -- logout must never fail because of this
  }
}
