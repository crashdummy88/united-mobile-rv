/**
 * Shop / forum / book BreadcrumbList + light WebSite/Organization.
 * Product pie: Home (unitedmobilerv.com) → Land → optional section → page.
 * Run: node tests/chrome/land-jsonld.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';
import { onRequest as middleware } from '../../functions/_middleware.js';
import { onRequestGet as shopIndex } from '../../functions/shop/index.js';
import { renderBookSuite, renderBookThankYou } from '../../functions/_lib/book-suite.js';
import {
  buildLandCrumbs,
  buildLandJsonLd,
  pageTitleFromHtml,
  decodeHtmlEntities,
  landJsonLdSnippet,
  injectLandSchema,
  htmlHasBreadcrumbList,
} from '../../functions/_lib/jsonld.js';
import { islandHeader, BOOK_PUBLIC_HREF } from '../../functions/_lib/mesh-chrome.js';

const env = { SESSION_SECRET: 'test-session-secret', DB: {}, PORTAL_DB: {} };

function src(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

function ldBlocks(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1]));
}

function graphNodes(html) {
  return ldBlocks(html).flatMap((block) => block['@graph'] || [block]);
}

function crumbPairs(html) {
  const list = graphNodes(html).find((n) => n['@type'] === 'BreadcrumbList');
  assert.ok(list, 'expected BreadcrumbList');
  return list.itemListElement.map((item) => [item.name, item.item]);
}

function htmlNext(html) {
  return async () => new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

async function landHtml(url, html) {
  const res = await middleware({
    request: new Request(url),
    env,
    next: htmlNext(html),
  });
  return res.text();
}

test('crumb names decode HTML entities to plain UTF-8', () => {
  assert.equal(decodeHtmlEntities('RV Owner&#8217;s Field Guide'), 'RV Owner\u2019s Field Guide');
  assert.equal(decodeHtmlEntities('A &amp; B'), 'A & B');
  assert.equal(
    pageTitleFromHtml('<title>Victron Fault Code &#038; Diagnostics | United Mobile RV</title>'),
    'Victron Fault Code & Diagnostics'
  );
});

test('land homes: Home → Land + WebSite + Organization', () => {
  const cases = [
    ['https://shop.unitedmobilerv.com/', 'Shop', 'United Mobile RV Shop', 'https://shop.unitedmobilerv.com/'],
    ['https://forum.unitedmobilerv.com/', 'Forum', 'United Mobile RV Forum', 'https://forum.unitedmobilerv.com/'],
    ['https://book.unitedmobilerv.com/', 'Book', 'United Mobile RV Book', 'https://book.unitedmobilerv.com/'],
  ];
  for (const [url, land, siteName, landUrl] of cases) {
    const crumbs = buildLandCrumbs(url);
    assert.deepEqual(crumbs, [
      { name: 'Home', item: 'https://unitedmobilerv.com/' },
      { name: land, item: landUrl },
    ], url);
    const ld = buildLandJsonLd(url);
    const types = ld['@graph'].map((n) => n['@type']);
    assert.deepEqual(types, ['Organization', 'WebSite', 'BreadcrumbList'], url);
    const org = ld['@graph'].find((n) => n['@type'] === 'Organization');
    assert.equal(org.url, 'https://unitedmobilerv.com/');
    assert.equal(org.name, 'United Mobile RV LLC');
    const site = ld['@graph'].find((n) => n['@type'] === 'WebSite');
    assert.equal(site.name, siteName);
    assert.equal(site.url, landUrl);
    assert.equal(site.publisher['@id'], 'https://unitedmobilerv.com/#organization');
    assert.doesNotMatch(JSON.stringify(ld), /pages\.dev/);
  }
});

test('shop /shop/ adds Systems Shop under Shop (leftover services tab is still Systems Shop)', () => {
  assert.deepEqual(
    buildLandCrumbs('https://shop.unitedmobilerv.com/shop/').map((c) => c.name),
    ['Home', 'Shop', 'Systems Shop']
  );
  assert.deepEqual(
    buildLandCrumbs('https://shop.unitedmobilerv.com/shop/?tab=services').map((c) => c.name),
    ['Home', 'Shop', 'Systems Shop']
  );
  assert.deepEqual(
    buildLandCrumbs('https://shop.unitedmobilerv.com/shop/p/kit-1', { pageName: 'Victron kit' }).map((c) => [c.name, c.item]),
    [
      ['Home', 'https://unitedmobilerv.com/'],
      ['Shop', 'https://shop.unitedmobilerv.com/'],
      ['Systems Shop', 'https://shop.unitedmobilerv.com/shop/'],
      ['Victron kit', 'https://shop.unitedmobilerv.com/shop/p/kit-1'],
    ]
  );
});

test('forum /forum/ stays Home → Forum; threads add the page', () => {
  assert.deepEqual(
    buildLandCrumbs('https://forum.unitedmobilerv.com/forum/').map((c) => c.name),
    ['Home', 'Forum']
  );
  assert.deepEqual(
    buildLandCrumbs('https://forum.unitedmobilerv.com/forum/t/abc', { pageName: "Owner's inverter" }).map((c) => c.name),
    ['Home', 'Forum', "Owner's inverter"]
  );
});

test('non-land hosts emit nothing (pages.dev / apex stay #189-only)', () => {
  assert.equal(landJsonLdSnippet('https://united-mobile-rv.pages.dev/'), '');
  assert.equal(landJsonLdSnippet('https://unitedmobilerv.com/'), '');
  assert.equal(buildLandJsonLd('https://united-mobile-rv.pages.dev/shop/'), null);
});

test('shop land home + /shop/ render BreadcrumbList', async () => {
  for (const [url, names] of [
    ['https://shop.unitedmobilerv.com/', ['Home', 'Shop']],
    ['https://shop.unitedmobilerv.com/shop/', ['Home', 'Shop', 'Systems Shop']],
  ]) {
    const rendered = await shopIndex({
      env: {},
      request: new Request(url),
    });
    const html = await rendered.text();
    assert.ok(htmlHasBreadcrumbList(html), url);
    assert.deepEqual(crumbPairs(html).map((p) => p[0]), names, url);
    assert.match(html, /data-land-crumbs/);
    assert.match(html, /yl6ovtkj2p/);
    assert.doesNotMatch(html, /pages\.dev/);
    if (url.endsWith('.com/')) {
      const types = graphNodes(html).map((n) => n['@type']);
      assert.ok(types.includes('WebSite'));
      assert.ok(types.includes('Organization'));
    }
  }
});

test('book land home renders Home → Book + WebSite; chrome Book stays Square', async () => {
  const res = renderBookSuite(new Request('https://book.unitedmobilerv.com/'));
  const html = await res.text();
  assert.deepEqual(crumbPairs(html), [
    ['Home', 'https://unitedmobilerv.com/'],
    ['Book', 'https://book.unitedmobilerv.com/'],
  ]);
  const types = graphNodes(html).map((n) => n['@type']);
  assert.ok(types.includes('WebSite'));
  assert.ok(types.includes('Organization'));
  const header = html.match(/<header[\s\S]*?<\/header>/)[0];
  const nav = html.match(/<ul class="nav-links">[\s\S]*?<\/ul>/)[0];
  const crumbs = html.match(/data-land-crumbs[\s\S]*?<\/nav>/)[0];
  assert.match(header, /united-mobile-rv-llc\.square\.site/);
  assert.match(nav, /href="https:\/\/united-mobile-rv-llc\.square\.site\/"[^>]*>Book</);
  assert.doesNotMatch(header, /href="https:\/\/book\.unitedmobilerv\.com/);
  assert.match(crumbs, /aria-current="page">Book</);
  assert.doesNotMatch(crumbs, /href="https:\/\/book\.unitedmobilerv\.com/);
  assert.equal(BOOK_PUBLIC_HREF, 'https://united-mobile-rv-llc.square.site/');
  assert.match(islandHeader({ current: 'book' }), /united-mobile-rv-llc\.square\.site/);
});

test('book thank-you adds a page crumb; mothership suite has no land schema', async () => {
  const thanks = await (renderBookThankYou(new Request('https://book.unitedmobilerv.com/book-service/thank-you/'))).text();
  assert.deepEqual(crumbPairs(thanks).map((p) => p[0]), ['Home', 'Book', 'Thank you']);
  const mothership = await (renderBookSuite(new Request('https://unitedmobilerv.com/book-service/'))).text();
  assert.ok(!htmlHasBreadcrumbList(mothership));
  assert.doesNotMatch(mothership, /data-land-crumbs/);
});

test('static forum homepage already has Home → Forum JSON-LD + Clarity', () => {
  const html = src('forum/index.html');
  const head = html.match(/<head>[\s\S]*?<\/head>/)[0];
  assert.deepEqual(crumbPairs(html), [
    ['Home', 'https://unitedmobilerv.com/'],
    ['Forum', 'https://forum.unitedmobilerv.com/'],
  ]);
  assert.match(head, /yl6ovtkj2p/);
  assert.equal((head.match(/yl6ovtkj2p/g) || []).length, 1);
  assert.match(html, /data-land-crumbs/);
  const header = html.match(/<header[\s\S]*?<\/header>/)[0];
  assert.match(header, /href="https:\/\/united-mobile-rv-llc\.square\.site\/"[^>]*>Book</);
  assert.match(header, /href="https:\/\/unitedmobilerv\.com\/services\/"/);
});

test('middleware injects BreadcrumbList on bare land HTML and does not duplicate', async () => {
  const bare = '<!DOCTYPE html><html><head><title>Community Forum | United Mobile RV</title></head><body><header></header><main></main></body></html>';
  const shop = await landHtml('https://shop.unitedmobilerv.com/', bare.replace('Community Forum', 'RV Systems Shop'));
  const forum = await landHtml('https://forum.unitedmobilerv.com/', bare);
  const book = await landHtml('https://book.unitedmobilerv.com/', bare.replace('Community Forum', 'Book a visit'));
  assert.deepEqual(crumbPairs(shop).map((p) => p[0]), ['Home', 'Shop']);
  assert.deepEqual(crumbPairs(forum).map((p) => p[0]), ['Home', 'Forum']);
  assert.deepEqual(crumbPairs(book).map((p) => p[0]), ['Home', 'Book']);
  assert.match(shop, /yl6ovtkj2p/);
  assert.equal((shop.match(/application\/ld\+json/g) || []).length, 1);

  const again = injectLandSchema(forum, 'https://forum.unitedmobilerv.com/');
  assert.equal((again.match(/application\/ld\+json/g) || []).length, 1);
  assert.equal((again.match(/data-land-crumbs/g) || []).length, 1);
});

test('middleware keeps #189 canonicals and does not invent pages.dev crumbs', async () => {
  const html = await landHtml(
    'https://forum.unitedmobilerv.com/victron/',
    `<!DOCTYPE html><html><head>
<title>Victron Energy Power Systems | United Mobile RV</title>
<link rel="canonical" href="https://united-mobile-rv.pages.dev/victron/">
<meta property="og:url" content="https://united-mobile-rv.pages.dev/victron/">
</head><body><header></header></body></html>`
  );
  assert.match(html, /<link rel="canonical" href="https:\/\/unitedmobilerv\.com\/victron\/">/);
  assert.doesNotMatch(html, /united-mobile-rv\.pages\.dev/);
  const crumbs = crumbPairs(html);
  assert.equal(crumbs[0][1], 'https://unitedmobilerv.com/');
  assert.equal(crumbs[crumbs.length - 1][1], 'https://unitedmobilerv.com/victron/');
  assert.doesNotMatch(JSON.stringify(crumbs), /pages\.dev/);
});

test('pages.dev host is not given land JSON-LD', async () => {
  const html = await landHtml(
    'https://united-mobile-rv.pages.dev/shop/',
    '<!DOCTYPE html><html><head><title>Shop</title></head><body></body></html>'
  );
  assert.ok(!htmlHasBreadcrumbList(html));
});

await run();
