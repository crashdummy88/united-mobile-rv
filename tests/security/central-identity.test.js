/**
 * Regression tests for auth-unification Stage 2 (2026-09-15):
 * functions/_lib/central-identity.js and the middleware changes that use
 * it. Log-only stage -- these tests confirm (1) identity resolution is
 * correct when a central match exists and safely returns null otherwise,
 * (2) client-supplied X-User-Id/X-User-Role headers are ALWAYS stripped
 * from the incoming request regardless of resolution outcome (the header-
 * spoofing defense), and (3) the pre-existing shop-lockdown and
 * X-Robots-Tag behavior in _middleware.js is completely unaffected by
 * this change.
 *
 * Run: node tests/security/central-identity.test.js
 */
import { test, run, assert } from '../lib/tiny-test.js';
import { createSessionCookie } from '../../functions/_lib/session.js';
import { resolveCentralIdentity } from '../../functions/_lib/central-identity.js';
import { onRequest as middleware } from '../../functions/_middleware.js';

const SECRET = 'test-session-secret';

function makeMockDbAndPortalDb({ forumUsers, centralUsers }) {
  const DB = {
    prepare(sql) {
      let args = [];
      return {
        bind(...a) { args = a; return this; },
        async first() {
          if (/SELECT email FROM users WHERE id = \?/.test(sql)) {
            const u = forumUsers.find((u) => u.id === args[0]);
            return u ? { email: u.email } : undefined;
          }
          throw new Error(`mock DB: unhandled query: ${sql}`);
        },
      };
    },
  };
  const PORTAL_DB = {
    prepare(sql) {
      let args = [];
      return {
        bind(...a) { args = a; return this; },
        async first() {
          if (/SELECT id, is_mod, banned FROM users WHERE email = \?/.test(sql)) {
            const u = centralUsers.find((u) => u.email === args[0]);
            return u ? { id: u.id, is_mod: u.is_mod ? 1 : 0, banned: u.banned ? 1 : 0 } : undefined;
          }
          throw new Error(`mock PORTAL_DB: unhandled query: ${sql}`);
        },
      };
    },
  };
  return { DB, PORTAL_DB };
}

async function cookieFor(uid) {
  return (await createSessionCookie({ uid }, SECRET)).split(';')[0];
}

function makeRequest(url, { cookie, extraHeaders } = {}) {
  const headers = new Headers(extraHeaders || {});
  if (cookie) headers.set('Cookie', cookie);
  return new Request(url, { headers });
}

test('resolveCentralIdentity: no session -> null', async () => {
  const { DB, PORTAL_DB } = makeMockDbAndPortalDb({ forumUsers: [], centralUsers: [] });
  const env = { SESSION_SECRET: SECRET, DB, PORTAL_DB };
  const identity = await resolveCentralIdentity(makeRequest('https://forum.unitedmobilerv.com/'), env);
  assert.equal(identity, null);
});

test('resolveCentralIdentity: forum session but no matching central row -> null (expected, not backfilled yet)', async () => {
  const { DB, PORTAL_DB } = makeMockDbAndPortalDb({
    forumUsers: [{ id: 'f1', email: 'forumonly@example.com' }],
    centralUsers: [],
  });
  const env = { SESSION_SECRET: SECRET, DB, PORTAL_DB };
  const request = makeRequest('https://forum.unitedmobilerv.com/', { cookie: await cookieFor('f1') });
  const identity = await resolveCentralIdentity(request, env);
  assert.equal(identity, null);
});

test('resolveCentralIdentity: matching central row -> resolves id + role correctly', async () => {
  const { DB, PORTAL_DB } = makeMockDbAndPortalDb({
    forumUsers: [{ id: 'f2', email: 'both@example.com' }],
    centralUsers: [{ id: 'central-42', email: 'both@example.com', is_mod: 1, banned: 0 }],
  });
  const env = { SESSION_SECRET: SECRET, DB, PORTAL_DB };
  const request = makeRequest('https://forum.unitedmobilerv.com/', { cookie: await cookieFor('f2') });
  const identity = await resolveCentralIdentity(request, env);
  assert.deepEqual(identity, { id: 'central-42', role: 'mod' });
});

test('resolveCentralIdentity: banned takes priority over mod in role computation', async () => {
  const { DB, PORTAL_DB } = makeMockDbAndPortalDb({
    forumUsers: [{ id: 'f3', email: 'banned-mod@example.com' }],
    centralUsers: [{ id: 'central-99', email: 'banned-mod@example.com', is_mod: 1, banned: 1 }],
  });
  const env = { SESSION_SECRET: SECRET, DB, PORTAL_DB };
  const request = makeRequest('https://forum.unitedmobilerv.com/', { cookie: await cookieFor('f3') });
  const identity = await resolveCentralIdentity(request, env);
  assert.equal(identity.role, 'banned');
});

test('resolveCentralIdentity: never throws, fails closed to null on DB error', async () => {
  const env = {
    SESSION_SECRET: SECRET,
    DB: { prepare() { throw new Error('D1 unavailable'); } },
    PORTAL_DB: {},
  };
  const request = makeRequest('https://forum.unitedmobilerv.com/', { cookie: await cookieFor('f4') });
  const identity = await resolveCentralIdentity(request, env);
  assert.equal(identity, null);
});

// --- Middleware-level tests: header stripping + existing behavior intact ---

function makeNextCapture() {
  const calls = [];
  const next = async (req) => {
    calls.push(req);
    return new Response('ok', { status: 200 });
  };
  return { next, calls };
}

test('middleware: a client-supplied X-User-Id/X-User-Role is ALWAYS stripped, even with no session (THE SECURITY FIX)', async () => {
  const { DB, PORTAL_DB } = makeMockDbAndPortalDb({ forumUsers: [], centralUsers: [] });
  const env = { SESSION_SECRET: SECRET, DB, PORTAL_DB };
  const { next, calls } = makeNextCapture();
  const request = makeRequest('https://forum.unitedmobilerv.com/forum/', {
    extraHeaders: { 'X-User-Id': 'attacker-supplied', 'X-User-Role': 'admin' },
  });
  await middleware({ request, env, next });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers.get('X-User-Id'), null, 'attacker-supplied X-User-Id must never reach downstream code');
  assert.equal(calls[0].headers.get('X-User-Role'), null, 'attacker-supplied X-User-Role must never reach downstream code');
});

test('middleware: a resolved central identity IS attached for downstream code to eventually use (Stage 3)', async () => {
  const { DB, PORTAL_DB } = makeMockDbAndPortalDb({
    forumUsers: [{ id: 'f5', email: 'real@example.com' }],
    centralUsers: [{ id: 'central-5', email: 'real@example.com', is_mod: 0, banned: 0 }],
  });
  const env = { SESSION_SECRET: SECRET, DB, PORTAL_DB };
  const { next, calls } = makeNextCapture();
  const request = makeRequest('https://forum.unitedmobilerv.com/forum/', { cookie: await cookieFor('f5') });
  await middleware({ request, env, next });
  assert.equal(calls[0].headers.get('X-User-Id'), 'central-5');
  assert.equal(calls[0].headers.get('X-User-Role'), 'member');
});

test('middleware: shop-host lockdown redirect (pre-existing behavior) still works, unaffected by Stage 2', async () => {
  const env = { SESSION_SECRET: SECRET, DB: {}, PORTAL_DB: {} };
  const { next } = makeNextCapture();
  const request = makeRequest('https://shop.unitedmobilerv.com/pricing/');
  const res = await middleware({ request, env, next });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('Location'), 'https://shop.unitedmobilerv.com/shop/');
});

test('middleware: identity resolution is skipped for static assets (avoids doubling D1 reads on every CSS/JS/image request)', async () => {
  const { DB, PORTAL_DB } = makeMockDbAndPortalDb({
    forumUsers: [{ id: 'f6', email: 'static-test@example.com' }],
    centralUsers: [{ id: 'central-6', email: 'static-test@example.com', is_mod: 0, banned: 0 }],
  });
  // If resolution ran, these mocks would resolve a real identity -- so a
  // passing test here proves the skip, not just an absence of a session.
  const env = { SESSION_SECRET: SECRET, DB, PORTAL_DB };
  const { next, calls } = makeNextCapture();
  const cookie = await cookieFor('f6');
  for (const path of ['/css/site.css', '/js/site.js', '/assets/brand/logo.webp', '/fonts/inter.woff2', '/favicon.png']) {
    const request = makeRequest(`https://forum.unitedmobilerv.com${path}`, { cookie });
    await middleware({ request, env, next });
  }
  assert.equal(calls.length, 5);
  for (const call of calls) {
    assert.equal(call.headers.get('X-User-Id'), null, `expected no identity resolution for a static asset path`);
  }
});

test('middleware: X-Robots-Tag indexing behavior (pre-existing) still works, unaffected by Stage 2', async () => {
  const { DB, PORTAL_DB } = makeMockDbAndPortalDb({ forumUsers: [], centralUsers: [] });
  const env = { SESSION_SECRET: SECRET, DB, PORTAL_DB };
  const { next } = makeNextCapture();
  const request = makeRequest('https://forum.unitedmobilerv.com/forum/');
  const res = await middleware({ request, env, next });
  assert.equal(res.headers.get('X-Robots-Tag'), 'index, follow');

  const request2 = makeRequest('https://united-mobile-rv.pages.dev/some-random-path/');
  const res2 = await middleware({ request: request2, env, next });
  assert.equal(res2.headers.get('X-Robots-Tag'), 'noindex, follow');
});

await run();
