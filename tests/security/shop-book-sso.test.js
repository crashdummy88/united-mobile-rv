/**
 * Shared Google SSO on shop + book -- existing /api/auth + umrt_sso.
 * No third auth stack. Open-redirect lock on OAuth next.
 * Run: node tests/security/shop-book-sso.test.js
 */
import { test, run, assert } from '../lib/tiny-test.js';
import { onRequest as middleware } from '../../functions/_middleware.js';
import {
  sanitizeAuthNext,
  defaultAuthNext,
  googleLoginHref,
  FORUM_GOOGLE_LOGIN,
} from '../../functions/_lib/auth-return.js';
import { onRequestGet as login } from '../../functions/api/auth/[provider]/login.js';

function makeRequest(url) {
  return new Request(url);
}

function makeNextCapture() {
  const calls = [];
  const next = async (req) => {
    calls.push(req);
    return new Response('ok', { status: 200 });
  };
  return { next, calls };
}

const env = { SESSION_SECRET: 'test-session-secret', DB: {}, PORTAL_DB: {} };

test('shop host allows existing auth endpoints (does not invent a third login)', async () => {
  const { next, calls } = makeNextCapture();
  for (const path of ['/api/me', '/api/logout', '/api/auth/google/login', '/api/auth/google/callback']) {
    const res = await middleware({
      request: makeRequest(`https://shop.unitedmobilerv.com${path}`),
      env,
      next,
    });
    assert.equal(res.status, 200, `${path} should pass shop lockdown`);
  }
  assert.equal(calls.length, 4);
});

test('book host allows the same Google SSO endpoints', async () => {
  const { next } = makeNextCapture();
  for (const path of ['/api/me', '/api/logout', '/api/auth/google/login']) {
    const res = await middleware({
      request: makeRequest(`https://book.unitedmobilerv.com${path}`),
      env,
      next,
    });
    assert.equal(res.status, 200, `${path} should pass book lockdown`);
  }
});

test('OAuth next allowlist: shop/book/forum only', () => {
  const shopReq = { url: 'https://shop.unitedmobilerv.com/api/auth/google/login' };
  assert.equal(sanitizeAuthNext('/shop/cart', shopReq), '/shop/cart');
  assert.equal(sanitizeAuthNext('/shop/p/artek-alpha2pro-200', shopReq), '/shop/p/artek-alpha2pro-200');
  assert.equal(sanitizeAuthNext('https://book.unitedmobilerv.com/', shopReq), 'https://book.unitedmobilerv.com/');
  assert.equal(sanitizeAuthNext('https://shop.unitedmobilerv.com/shop/', shopReq), 'https://shop.unitedmobilerv.com/shop/');
  assert.equal(sanitizeAuthNext('https://evil.example/phish', shopReq), '/shop/');
  assert.equal(sanitizeAuthNext('javascript:alert(1)', shopReq), '/shop/');
  assert.equal(sanitizeAuthNext('//evil.example', shopReq), '/shop/');
  assert.equal(sanitizeAuthNext('https://unitedmobilerv.com/wp-admin', shopReq), '/shop/');
  assert.equal(defaultAuthNext({ url: 'https://book.unitedmobilerv.com/' }), '/');
  assert.equal(defaultAuthNext({ url: 'https://forum.unitedmobilerv.com/' }), '/forum/');
  assert.equal(googleLoginHref('https://shop.unitedmobilerv.com/shop/cart'), `${FORUM_GOOGLE_LOGIN}?next=${encodeURIComponent('https://shop.unitedmobilerv.com/shop/cart')}`);
});

test('Google login start still uses existing oauth.js -- sets next cookie', async () => {
  const res = await login({
    params: { provider: 'google' },
    request: makeRequest('https://forum.unitedmobilerv.com/api/auth/google/login?next=https://shop.unitedmobilerv.com/shop/cart'),
    env: { GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com' },
  });
  assert.equal(res.status, 302);
  const loc = res.headers.get('Location');
  assert.match(loc, /accounts\.google\.com/);
  const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const joined = cookies.join('; ') || String(res.headers.get('Set-Cookie') || '');
  assert.match(joined, /umrt_oauth_state=/);
  assert.match(joined, /umrt_oauth_next=/);
  assert.match(joined, /shop\.unitedmobilerv\.com/);
});

await run();
