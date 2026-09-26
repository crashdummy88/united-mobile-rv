/**
 * Matt SEO lock 2026-09-20: shop./forum./book. customer lands index
 * by default (including `/`). Utility paths stay noindex. pages.dev
 * stays on the allowlist (homepage noindex).
 *
 * Run: node tests/security/robots-index-hosts.test.js
 */
import { test, run, assert } from '../lib/tiny-test.js';
import { onRequest as middleware } from '../../functions/_middleware.js';

const env = { SESSION_SECRET: 'test-session-secret', DB: {}, PORTAL_DB: {} };

function nextOk() {
  return async () => new Response('ok', { status: 200 });
}

async function robotsTag(host, path) {
  const res = await middleware({
    request: new Request(`https://${host}${path}`),
    env,
    next: nextOk(),
  });
  const all = [...res.headers.entries()].filter(([k]) => k.toLowerCase() === 'x-robots-tag');
  assert.equal(all.length, 1, `${host}${path} must send exactly one X-Robots-Tag`);
  return res.headers.get('X-Robots-Tag');
}

test('shop host / is index, follow', async () => {
  assert.equal(await robotsTag('shop.unitedmobilerv.com', '/'), 'index, follow');
});

test('shop host /shop/cart is noindex, follow', async () => {
  assert.equal(await robotsTag('shop.unitedmobilerv.com', '/shop/cart'), 'noindex, follow');
});

test('forum host / is index, follow', async () => {
  assert.equal(await robotsTag('forum.unitedmobilerv.com', '/'), 'index, follow');
});

test('book host / is index, follow', async () => {
  assert.equal(await robotsTag('book.unitedmobilerv.com', '/'), 'index, follow');
});

test('pages.dev / stays noindex, follow', async () => {
  assert.equal(await robotsTag('united-mobile-rv.pages.dev', '/'), 'noindex, follow');
});

test('pages.dev catalog paths stay on the allowlist', async () => {
  assert.equal(await robotsTag('united-mobile-rv.pages.dev', '/shop/'), 'index, follow');
  assert.equal(await robotsTag('united-mobile-rv.pages.dev', '/forum/'), 'index, follow');
  assert.equal(await robotsTag('united-mobile-rv.pages.dev', '/shop/cart'), 'noindex, follow');
});

test('shop and forum thank-you is noindex; book and apex stay index', async () => {
  assert.equal(await robotsTag('shop.unitedmobilerv.com', '/book-service/thank-you/'), 'noindex, follow');
  assert.equal(await robotsTag('shop.unitedmobilerv.com', '/book-service/thank-you'), 'noindex, follow');
  assert.equal(await robotsTag('forum.unitedmobilerv.com', '/book-service/thank-you/'), 'noindex, follow');
  assert.equal(await robotsTag('book.unitedmobilerv.com', '/book-service/thank-you/'), 'index, follow');
  assert.equal(await robotsTag('unitedmobilerv.com', '/book-service/thank-you/'), 'index, follow');
});

test('shop and forum homes stay index (hub rewrite is unchanged)', async () => {
  assert.equal(await robotsTag('shop.unitedmobilerv.com', '/shop/'), 'index, follow');
  assert.equal(await robotsTag('forum.unitedmobilerv.com', '/forum/'), 'index, follow');
});

test('custom lands still noindex utility prefixes', async () => {
  assert.equal(await robotsTag('shop.unitedmobilerv.com', '/api/shop/'), 'noindex, follow');
  assert.equal(await robotsTag('forum.unitedmobilerv.com', '/forum/mod/'), 'noindex, follow');
  assert.equal(await robotsTag('forum.unitedmobilerv.com', '/api/'), 'noindex, follow');
});

test('staging host stays noindex even on catalog paths', async () => {
  assert.equal(await robotsTag('staging.unitedmobilerv.com', '/'), 'noindex, follow');
  assert.equal(await robotsTag('staging.unitedmobilerv.com', '/shop/'), 'noindex, follow');
});

test('shop lockdown path gates are unchanged', async () => {
  const res = await middleware({
    request: new Request('https://shop.unitedmobilerv.com/pricing/'),
    env,
    next: nextOk(),
  });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('Location'), 'https://shop.unitedmobilerv.com/shop/');
});

test('book lockdown path gates are unchanged', async () => {
  const res = await middleware({
    request: new Request('https://book.unitedmobilerv.com/pricing/'),
    env,
    next: nextOk(),
  });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('Location'), 'https://book.unitedmobilerv.com/');
});

await run();
