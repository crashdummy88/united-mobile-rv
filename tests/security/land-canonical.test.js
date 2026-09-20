/**
 * shop. / forum. / book. canonical + og:url rewrite.
 *
 *   1) Shared WP mirrors (e.g. /victron/) → https://unitedmobilerv.com/...
 *   2) Land-unique (shop catalog, forum UI, book suite) → self on that host
 *   3) Never leave united-mobile-rv.pages.dev as canonical on land hosts
 *   4) Unverified mothership-only paths self-canonical (do not invent WP)
 *   5) Shop/book lockdowns and X-Robots-Tag stay unchanged
 *
 * Run: node tests/security/land-canonical.test.js
 */
import { test, run, assert } from '../lib/tiny-test.js';
import { onRequest as middleware } from '../../functions/_middleware.js';
import {
  WP_ORIGIN,
  SHOP_HOST,
  FORUM_HOST,
  BOOK_HOST,
  PAGES_DEV_HOST,
  WP_PATH_REMAP,
  isLandHost,
  isLandUniquePath,
  wpPathFor,
  resolveLandCanonical,
  rewriteHtmlCanonicals,
} from '../../functions/_lib/canonical.js';

function makeRequest(url) {
  return new Request(url);
}

const env = { SESSION_SECRET: 'test-session-secret', DB: {}, PORTAL_DB: {} };

const PAGES_DEV_HTML = `<!DOCTYPE html><html><head>
<title>Victron</title>
<link rel="canonical" href="https://united-mobile-rv.pages.dev/victron/">
<meta property="og:url" content="https://united-mobile-rv.pages.dev/victron/">
</head><body></body></html>`;

function htmlNext(html, contentType) {
  return async () => new Response(html, {
    status: 200,
    headers: { 'Content-Type': contentType || 'text/html; charset=utf-8' },
  });
}

test('isLandHost is only shop / forum / book', () => {
  assert.equal(isLandHost(SHOP_HOST), true);
  assert.equal(isLandHost(FORUM_HOST), true);
  assert.equal(isLandHost(BOOK_HOST), true);
  assert.equal(isLandHost(PAGES_DEV_HOST), false);
  assert.equal(isLandHost('unitedmobilerv.com'), false);
  assert.equal(isLandHost('www.unitedmobilerv.com'), false);
});

test('land-unique paths: shop catalog, forum UI, book suite, land homes', () => {
  assert.equal(isLandUniquePath('/'), true);
  assert.equal(isLandUniquePath('/shop/'), true);
  assert.equal(isLandUniquePath('/shop/p/victron-smartsolar-mppt'), true);
  assert.equal(isLandUniquePath('/shop/cart'), true);
  assert.equal(isLandUniquePath('/forum/'), true);
  assert.equal(isLandUniquePath('/forum/t/abc'), true);
  assert.equal(isLandUniquePath('/forum/member/u1'), true);
  assert.equal(isLandUniquePath('/forum-live/'), true);
  assert.equal(isLandUniquePath('/book-service/'), true);
  assert.equal(isLandUniquePath('/book-service/thank-you/'), true);
  assert.equal(isLandUniquePath('/victron/'), false);
  assert.equal(isLandUniquePath('/guide/electrical-troubleshooting/'), false);
  assert.equal(isLandUniquePath('/pricing/'), false);
});

test('wpPathFor uses same-path WP pages and documented remaps only', () => {
  assert.equal(wpPathFor('/victron/'), '/victron/');
  assert.equal(wpPathFor('/guide/'), '/guide/');
  assert.equal(wpPathFor('/guide/electrical-troubleshooting/'), '/guide/electrical-troubleshooting/');
  assert.equal(wpPathFor('/guide/awning-fabric-replacement-guide/'), '/guide/awning-fabric-replacement-guide/');
  assert.equal(wpPathFor('/service/'), '/service/');
  assert.equal(wpPathFor('/mobile-rv-repair-spokane-wa/airway-heights/'), '/mobile-rv-repair-spokane-wa/airway-heights/');
  assert.equal(wpPathFor('/lithium-battery-buying-guide/'), '/guide/lithium-battery-buying-guide/');
  assert.equal(WP_PATH_REMAP['/lithium-battery-buying-guide/'], '/guide/lithium-battery-buying-guide/');
  assert.equal(wpPathFor('/book-service/'), null);
  assert.equal(wpPathFor('/'), null);
  assert.equal(wpPathFor('/terms-of-use/'), null);
  assert.equal(wpPathFor('/troubleshoot/no-power/'), null);
  assert.equal(wpPathFor('/guide/peplink-multi-wan-guide/'), null);
  assert.equal(wpPathFor('/guide/gear-we-recommend/'), null);
});

test('resolveLandCanonical: forum shared content → WP apex', () => {
  assert.equal(
    resolveLandCanonical('https://forum.unitedmobilerv.com/victron/'),
    `${WP_ORIGIN}/victron/`
  );
  assert.equal(
    resolveLandCanonical('https://forum.unitedmobilerv.com/guide/electrical-troubleshooting/'),
    `${WP_ORIGIN}/guide/electrical-troubleshooting/`
  );
  assert.equal(
    resolveLandCanonical('https://forum.unitedmobilerv.com/lithium-battery-buying-guide/'),
    `${WP_ORIGIN}/guide/lithium-battery-buying-guide/`
  );
});

test('resolveLandCanonical: land-unique stays on the request host', () => {
  assert.equal(
    resolveLandCanonical('https://forum.unitedmobilerv.com/'),
    'https://forum.unitedmobilerv.com/'
  );
  assert.equal(
    resolveLandCanonical('https://forum.unitedmobilerv.com/forum/'),
    'https://forum.unitedmobilerv.com/forum/'
  );
  assert.equal(
    resolveLandCanonical('https://forum.unitedmobilerv.com/forum/t/abc'),
    'https://forum.unitedmobilerv.com/forum/t/abc'
  );
  assert.equal(
    resolveLandCanonical('https://shop.unitedmobilerv.com/'),
    'https://shop.unitedmobilerv.com/'
  );
  assert.equal(
    resolveLandCanonical('https://shop.unitedmobilerv.com/shop/'),
    'https://shop.unitedmobilerv.com/shop/'
  );
  assert.equal(
    resolveLandCanonical('https://shop.unitedmobilerv.com/shop/?tab=services&utm=x'),
    'https://shop.unitedmobilerv.com/shop/?tab=services'
  );
  assert.equal(
    resolveLandCanonical('https://shop.unitedmobilerv.com/shop/p/kit-1'),
    'https://shop.unitedmobilerv.com/shop/p/kit-1'
  );
  assert.equal(
    resolveLandCanonical('https://shop.unitedmobilerv.com/shop/cart'),
    'https://shop.unitedmobilerv.com/shop/cart'
  );
  assert.equal(
    resolveLandCanonical('https://shop.unitedmobilerv.com/book-service/'),
    'https://shop.unitedmobilerv.com/book-service/'
  );
  assert.equal(
    resolveLandCanonical('https://book.unitedmobilerv.com/'),
    'https://book.unitedmobilerv.com/'
  );
  assert.equal(
    resolveLandCanonical('https://book.unitedmobilerv.com/book-service/thank-you/'),
    'https://book.unitedmobilerv.com/book-service/thank-you/'
  );
});

test('resolveLandCanonical: unsure paths self-canonical, never invent WP', () => {
  assert.equal(
    resolveLandCanonical('https://forum.unitedmobilerv.com/troubleshoot/no-power/'),
    'https://forum.unitedmobilerv.com/troubleshoot/no-power/'
  );
  assert.equal(
    resolveLandCanonical('https://forum.unitedmobilerv.com/guide/peplink-multi-wan-guide/'),
    'https://forum.unitedmobilerv.com/guide/peplink-multi-wan-guide/'
  );
  assert.equal(
    resolveLandCanonical('https://forum.unitedmobilerv.com/terms-of-use/'),
    'https://forum.unitedmobilerv.com/terms-of-use/'
  );
});

test('resolveLandCanonical: pages.dev / apex are not rewritten', () => {
  assert.equal(resolveLandCanonical('https://united-mobile-rv.pages.dev/victron/'), null);
  assert.equal(resolveLandCanonical('https://unitedmobilerv.com/victron/'), null);
});

test('rewriteHtmlCanonicals replaces canonical + og:url and inserts if missing', () => {
  const rewritten = rewriteHtmlCanonicals(PAGES_DEV_HTML, 'https://unitedmobilerv.com/victron/');
  assert.match(rewritten, /<link rel="canonical" href="https:\/\/unitedmobilerv\.com\/victron\/">/);
  assert.match(rewritten, /<meta property="og:url" content="https:\/\/unitedmobilerv\.com\/victron\/">/);
  assert.doesNotMatch(rewritten, /pages\.dev/);

  const noTags = rewriteHtmlCanonicals(
    '<!DOCTYPE html><html><head><title>x</title></head><body></body></html>',
    'https://forum.unitedmobilerv.com/forum/'
  );
  assert.match(noTags, /<link rel="canonical" href="https:\/\/forum\.unitedmobilerv\.com\/forum\/">\n<\/head>/);
  assert.doesNotMatch(noTags, /og:url/);

  const reversed = rewriteHtmlCanonicals(
    '<head><link href="https://united-mobile-rv.pages.dev/x/" rel="canonical"></head>',
    'https://unitedmobilerv.com/x/'
  );
  assert.match(reversed, /<link rel="canonical" href="https:\/\/unitedmobilerv\.com\/x\/">/);
  assert.doesNotMatch(reversed, /pages\.dev/);
});

test('middleware: forum /victron/ pages.dev HTML becomes WP canonical + og:url', async () => {
  const res = await middleware({
    request: makeRequest('https://forum.unitedmobilerv.com/victron/'),
    env,
    next: htmlNext(PAGES_DEV_HTML),
  });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<link rel="canonical" href="https:\/\/unitedmobilerv\.com\/victron\/">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/unitedmobilerv\.com\/victron\/">/);
  assert.doesNotMatch(html, /united-mobile-rv\.pages\.dev/);
  assert.equal(res.headers.get('X-Robots-Tag'), 'noindex, follow');
});

test('middleware: forum land home stays self-canonical', async () => {
  const res = await middleware({
    request: makeRequest('https://forum.unitedmobilerv.com/'),
    env,
    next: htmlNext(`<!DOCTYPE html><html><head>
<link rel="canonical" href="https://forum.unitedmobilerv.com/">
<meta property="og:url" content="https://forum.unitedmobilerv.com/">
</head><body></body></html>`),
  });
  const html = await res.text();
  assert.match(html, /<link rel="canonical" href="https:\/\/forum\.unitedmobilerv\.com\/">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/forum\.unitedmobilerv\.com\/">/);
  assert.doesNotMatch(html, /pages\.dev/);
  assert.doesNotMatch(html, /<link rel="canonical" href="https:\/\/unitedmobilerv\.com\/">/);
});

test('middleware: shop catalog self-canonical; X-Robots still index,follow', async () => {
  const res = await middleware({
    request: makeRequest('https://shop.unitedmobilerv.com/shop/?tab=services'),
    env,
    next: htmlNext(`<!DOCTYPE html><html><head>
<link rel="canonical" href="https://united-mobile-rv.pages.dev/shop/?tab=services">
</head><body></body></html>`),
  });
  const html = await res.text();
  assert.match(html, /<link rel="canonical" href="https:\/\/shop\.unitedmobilerv\.com\/shop\/\?tab=services">/);
  assert.doesNotMatch(html, /pages\.dev/);
  assert.equal(res.headers.get('X-Robots-Tag'), 'index, follow');
});

test('middleware: book suite self-canonical; X-Robots still noindex,follow', async () => {
  const res = await middleware({
    request: makeRequest('https://book.unitedmobilerv.com/'),
    env,
    next: htmlNext(`<!DOCTYPE html><html><head>
<link rel="canonical" href="https://united-mobile-rv.pages.dev/book-service/">
<meta property="og:url" content="https://united-mobile-rv.pages.dev/book-service/">
</head><body></body></html>`),
  });
  const html = await res.text();
  assert.match(html, /<link rel="canonical" href="https:\/\/book\.unitedmobilerv\.com\/">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/book\.unitedmobilerv\.com\/">/);
  assert.doesNotMatch(html, /pages\.dev/);
  assert.equal(res.headers.get('X-Robots-Tag'), 'noindex, follow');
});

test('middleware: pages.dev host is not rewritten', async () => {
  const res = await middleware({
    request: makeRequest('https://united-mobile-rv.pages.dev/victron/'),
    env,
    next: htmlNext(PAGES_DEV_HTML),
  });
  const html = await res.text();
  assert.match(html, /href="https:\/\/united-mobile-rv\.pages\.dev\/victron\/"/);
  assert.match(html, /content="https:\/\/united-mobile-rv\.pages\.dev\/victron\/"/);
});

test('middleware: shop/book lockdowns unchanged', async () => {
  const shop = await middleware({
    request: makeRequest('https://shop.unitedmobilerv.com/victron/'),
    env,
    next: htmlNext(PAGES_DEV_HTML),
  });
  assert.equal(shop.status, 301);
  assert.equal(shop.headers.get('Location'), 'https://shop.unitedmobilerv.com/shop/');

  const book = await middleware({
    request: makeRequest('https://book.unitedmobilerv.com/victron/'),
    env,
    next: htmlNext(PAGES_DEV_HTML),
  });
  assert.equal(book.status, 301);
  assert.equal(book.headers.get('Location'), 'https://book.unitedmobilerv.com/');
});

test('middleware: non-HTML is not rewritten', async () => {
  const res = await middleware({
    request: makeRequest('https://forum.unitedmobilerv.com/css/site.css'),
    env,
    next: async () => new Response('body{color:red}', {
      headers: { 'Content-Type': 'text/css' },
    }),
  });
  assert.equal(await res.text(), 'body{color:red}');
});

await run();
