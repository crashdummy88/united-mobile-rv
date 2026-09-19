/**
 * Staging hosts must emit staging.unitedmobilerv.com as canonical + og:url
 * (path-aware). Never united-mobile-rv.pages.dev. Book chrome stays Square.
 * Run: node tests/chrome/staging-canonical.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';
import {
  isStagingHost,
  publicCanonicalUrl,
  rewriteStagingSeoHtml,
  STAGING_PUBLIC_ORIGIN,
} from '../../functions/_lib/hosts.js';
import { onRequest as middleware } from '../../functions/_middleware.js';
import { renderBookSuite } from '../../functions/_lib/book-suite.js';
import { BOOK_PUBLIC_HREF, SQUARE_BOOK_URL } from '../../functions/_lib/mesh-chrome.js';

function src(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

function makeRequest(url) {
  return new Request(url);
}

const env = { SESSION_SECRET: 'test-session-secret', DB: {}, PORTAL_DB: {} };

function staticHomeHtml() {
  return `<!DOCTYPE html><html><head>
<link rel="canonical" href="https://united-mobile-rv.pages.dev/">
<meta property="og:url" content="https://united-mobile-rv.pages.dev/">
</head><body><a href="https://united-mobile-rv-llc.square.site/">Book</a></body></html>`;
}

test('staging host set includes custom domain and staging pages.dev', () => {
  assert.equal(isStagingHost('staging.unitedmobilerv.com'), true);
  assert.equal(isStagingHost('united-mobile-rv-staging.pages.dev'), true);
  assert.equal(isStagingHost('united-mobile-rv.pages.dev'), false);
  assert.equal(isStagingHost('shop.unitedmobilerv.com'), false);
  assert.equal(isStagingHost('book.unitedmobilerv.com'), false);
});

test('publicCanonicalUrl rebases staging pages.dev onto staging custom domain', () => {
  assert.equal(
    publicCanonicalUrl('https://united-mobile-rv-staging.pages.dev/guide/ppi-guide/'),
    `${STAGING_PUBLIC_ORIGIN}/guide/ppi-guide/`
  );
  assert.equal(
    publicCanonicalUrl('https://staging.unitedmobilerv.com/'),
    `${STAGING_PUBLIC_ORIGIN}/`
  );
  assert.equal(
    publicCanonicalUrl('https://united-mobile-rv.pages.dev/book-service/'),
    'https://united-mobile-rv.pages.dev/book-service/'
  );
});

test('rewriteStagingSeoHtml replaces pages.dev canonical + og:url, keeps Square Book', () => {
  const out = rewriteStagingSeoHtml(staticHomeHtml(), '/');
  assert.match(out, /<link rel="canonical" href="https:\/\/staging\.unitedmobilerv\.com\/">/);
  assert.match(out, /<meta property="og:url" content="https:\/\/staging\.unitedmobilerv\.com\/">/);
  assert.doesNotMatch(out, /united-mobile-rv\.pages\.dev/);
  assert.match(out, /united-mobile-rv-llc\.square\.site/);
});

test('rewriteStagingSeoHtml is path-aware', () => {
  const html = `<head>
<link rel="canonical" href="https://united-mobile-rv.pages.dev/pricing/">
<meta property="og:url" content="https://united-mobile-rv.pages.dev/pricing/">
</head>`;
  const out = rewriteStagingSeoHtml(html, '/pricing/');
  assert.match(out, /href="https:\/\/staging\.unitedmobilerv\.com\/pricing\/"/);
  assert.match(out, /content="https:\/\/staging\.unitedmobilerv\.com\/pricing\/"/);
});

test('middleware: staging custom domain rewrites homepage canonical/og', async () => {
  const next = async () => new Response(staticHomeHtml(), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
  const res = await middleware({
    request: makeRequest('https://staging.unitedmobilerv.com/'),
    env,
    next,
  });
  const html = await res.text();
  assert.match(html, /<link rel="canonical" href="https:\/\/staging\.unitedmobilerv\.com\/">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/staging\.unitedmobilerv\.com\/">/);
  assert.doesNotMatch(html, /united-mobile-rv\.pages\.dev/);
  assert.match(html, /united-mobile-rv-llc\.square\.site/);
});

test('middleware: staging pages.dev also emits staging custom-domain canonical', async () => {
  const next = async () => new Response(staticHomeHtml(), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
  const res = await middleware({
    request: makeRequest('https://united-mobile-rv-staging.pages.dev/service/'),
    env,
    next,
  });
  const html = await res.text();
  assert.match(html, /<link rel="canonical" href="https:\/\/staging\.unitedmobilerv\.com\/service\/">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/staging\.unitedmobilerv\.com\/service\/">/);
  assert.doesNotMatch(html, /united-mobile-rv\.pages\.dev/);
});

test('middleware: prod pages.dev does not rebase onto staging', async () => {
  const next = async () => new Response(staticHomeHtml(), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
  const res = await middleware({
    request: makeRequest('https://united-mobile-rv.pages.dev/'),
    env,
    next,
  });
  const html = await res.text();
  assert.match(html, /united-mobile-rv\.pages\.dev/);
  assert.doesNotMatch(html, /staging\.unitedmobilerv\.com/);
});

test('book suite on staging uses staging canonical; Book chrome stays Square', async () => {
  const res = await renderBookSuite(makeRequest('https://united-mobile-rv-staging.pages.dev/book-service/'));
  const html = await res.text();
  assert.match(html, /<link rel="canonical" href="https:\/\/staging\.unitedmobilerv\.com\/book-service\/">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/staging\.unitedmobilerv\.com\/book-service\/">/);
  assert.doesNotMatch(html, /united-mobile-rv\.pages\.dev/);
  assert.match(html, /united-mobile-rv-llc\.square\.site/);
  assert.match(html, /BOOK ONLINE/);
});

test('Book public CTA remains Square appointment intake', () => {
  assert.equal(BOOK_PUBLIC_HREF, SQUARE_BOOK_URL);
  assert.match(BOOK_PUBLIC_HREF, /square\.site/);
  const mesh = src('functions/_lib/mesh-chrome.js');
  const site = src('js/site.js');
  assert.match(mesh, /BOOK_PUBLIC_HREF = SQUARE_BOOK_URL/);
  assert.match(site, /BOOK_PUBLIC = 'https:\/\/united-mobile-rv-llc\.square\.site\/'/);
  assert.doesNotMatch(site, /BOOK_PUBLIC = 'https:\/\/book\.unitedmobilerv\.com\//);
});

test('mothership footer has custom-domain network links and Square Book', () => {
  const html = src('index.html');
  assert.match(html, /https:\/\/unitedmobilerv\.com\//);
  assert.match(html, /https:\/\/shop\.unitedmobilerv\.com\//);
  assert.match(html, /https:\/\/forum\.unitedmobilerv\.com\//);
  assert.match(html, /https:\/\/portal\.unitedmobilerv\.com\//);
  assert.match(html, /https:\/\/status\.unitedmobilerv\.com\//);
  assert.match(html, /https:\/\/docs\.unitedmobilerv\.com\//);
  assert.match(html, /https:\/\/software\.unitedmobilerv\.com\//);
  assert.match(html, /tel:\+16166065277/);
  assert.match(html, /\(616\) 606-5277/);
  assert.match(html, /united-mobile-rv-llc\.square\.site/);
  assert.doesNotMatch(html, /<a[^>]+href="https:\/\/united-mobile-rv\.pages\.dev/);
  assert.doesNotMatch(html, /class="btn btn-ghost"[^>]*book\.unitedmobilerv\.com/);
});

await run();
