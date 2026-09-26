/**
 * Shop and book HTML are Pages Functions. public/_headers is not applied
 * to Function responses, so those hosts were missing the headers forum's
 * static files already send. Middleware fills that gap.
 *
 * The CSP added here is frame-ancestors only. Forum's full CSP does not
 * allow https://www.clarity.ms, which shop, book, and the cart load.
 *
 * Run: node tests/security/response-security-headers.test.js
 */
import { test, run, assert } from '../lib/tiny-test.js';
import { onRequest as middleware } from '../../functions/_middleware.js';
import { clarityHeadSnippet } from '../../functions/_lib/clarity.js';

const env = { SESSION_SECRET: 'test-session-secret', DB: {}, PORTAL_DB: {} };

function htmlNext(html, extraHeaders) {
  return async () => new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      ...extraHeaders,
    },
  });
}

const SHOP_HTML = `<!DOCTYPE html><html><head><title>Shop</title>${clarityHeadSnippet()}</head><body><script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script></body></html>`;

test('shop function HTML gets forum framing headers and not the script CSP', async () => {
  const res = await middleware({
    request: new Request('https://shop.unitedmobilerv.com/shop/'),
    env,
    next: htmlNext(SHOP_HTML),
  });
  assert.equal(res.headers.get('Strict-Transport-Security'), 'max-age=31536000; includeSubDomains; preload');
  assert.equal(res.headers.get('X-Frame-Options'), 'DENY');
  assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(res.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
  assert.equal(res.headers.get('Content-Security-Policy'), "frame-ancestors 'none'");
  assert.equal(res.headers.get('Cache-Control'), 'public, max-age=300');
  const html = await res.text();
  assert.match(html, /www\.clarity\.ms\/tag/);
  assert.match(html, /challenges\.cloudflare\.com\/turnstile/);
});

test('book suite host / gets the same headers', async () => {
  const res = await middleware({
    request: new Request('https://book.unitedmobilerv.com/'),
    env,
    next: htmlNext('<!DOCTYPE html><html><head><title>Book</title></head><body></body></html>'),
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('X-Frame-Options'), 'DENY');
  assert.equal(res.headers.get('Content-Security-Policy'), "frame-ancestors 'none'");
  assert.match(await res.text(), /clarity\.ms\/tag/);
});

test('cart function HTML is not given a script-src CSP', async () => {
  const res = await middleware({
    request: new Request('https://shop.unitedmobilerv.com/shop/cart'),
    env,
    next: htmlNext(SHOP_HTML, { 'Cache-Control': 'no-store' }),
  });
  const csp = res.headers.get('Content-Security-Policy');
  assert.equal(csp, "frame-ancestors 'none'");
  assert.doesNotMatch(csp, /script-src/);
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
});

test('existing static CSP from _headers is left unchanged', async () => {
  const forumCsp = "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; frame-ancestors 'none'";
  const res = await middleware({
    request: new Request('https://forum.unitedmobilerv.com/forum/'),
    env,
    next: htmlNext('<!DOCTYPE html><html><head><title>Forum</title></head><body></body></html>', {
      'Content-Security-Policy': forumCsp,
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    }),
  });
  assert.equal(res.headers.get('Content-Security-Policy'), forumCsp);
  assert.equal(res.headers.get('X-Frame-Options'), 'DENY');
});

test('shop lockdown redirect also sends the headers', async () => {
  const res = await middleware({
    request: new Request('https://shop.unitedmobilerv.com/wrangler.toml'),
    env,
    next: async () => new Response('name = "should-not-run"', { status: 200 }),
  });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('Location'), 'https://shop.unitedmobilerv.com/shop/');
  assert.equal(res.headers.get('X-Frame-Options'), 'DENY');
  assert.equal(res.headers.get('Strict-Transport-Security'), 'max-age=31536000; includeSubDomains; preload');
});

await run();
