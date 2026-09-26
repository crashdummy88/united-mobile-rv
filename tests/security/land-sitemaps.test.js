/**
 * Shop and forum sitemaps list only URLs that belong on that host.
 * Apex keeps the mothership inventory, including /book-service/thank-you/.
 *
 * Run: node tests/security/land-sitemaps.test.js
 */
import { test, run, assert } from '../lib/tiny-test.js';
import { onRequestGet as sitemap } from '../../functions/sitemap.xml.js';

function db({ products = [], threads = [], threadMax = '2026-09-01', queries } = {}) {
  return {
    prepare(sql) {
      if (queries) queries.push(sql);
      const stmt = {
        bind() {
          return stmt;
        },
        async first() {
          if (/FROM products/.test(sql)) return null;
          if (/MAX\(updated_at\)/.test(sql)) return { t: threadMax };
          return null;
        },
        async all() {
          if (/FROM products/.test(sql)) return { results: products };
          if (/FROM threads/.test(sql)) return { results: threads };
          return { results: [] };
        },
      };
      return stmt;
    },
  };
}

function locs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

async function fetchSitemap(host, env) {
  const res = await sitemap({
    request: new Request(`https://${host}/sitemap.xml`),
    env,
  });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('Content-Type') || '', /application\/xml/);
  const xml = await res.text();
  return { xml, urls: locs(xml) };
}

test('shop sitemap is the hub plus active product pages', async () => {
  const queries = [];
  const { xml, urls } = await fetchSitemap('shop.unitedmobilerv.com', {
    DB: db({
      queries,
      products: [
        { id: 'victron-smartsolar-mppt', updated_at: '2026-09-20 12:00:00' },
        { id: 'lynx-distributor', updated_at: '2026-09-20 12:00:00' },
      ],
    }),
  });
  assert.ok(queries.some((sql) => /FROM products WHERE active = 1/.test(sql)));
  assert.deepEqual(urls, [
    'https://shop.unitedmobilerv.com/shop/',
    'https://shop.unitedmobilerv.com/shop/p/victron-smartsolar-mppt',
    'https://shop.unitedmobilerv.com/shop/p/lynx-distributor',
  ]);
  assert.match(xml, /<lastmod>2026-09-20<\/lastmod>/);
  assert.doesNotMatch(xml, /thank-you/);
  assert.doesNotMatch(xml, /\/forum\//);
  assert.doesNotMatch(xml, /\/guide\//);
  assert.doesNotMatch(xml, /<loc>https:\/\/shop\.unitedmobilerv\.com\/<\/loc>/);
});

test('shop sitemap drops products the query did not return and still lists the hub', async () => {
  const { urls } = await fetchSitemap('shop.unitedmobilerv.com', { DB: db({ products: [] }) });
  assert.deepEqual(urls, ['https://shop.unitedmobilerv.com/shop/']);
});

test('shop sitemap lists the hub when D1 is missing', async () => {
  const { urls } = await fetchSitemap('shop.unitedmobilerv.com', {});
  assert.deepEqual(urls, ['https://shop.unitedmobilerv.com/shop/']);
});

test('forum sitemap is forum hubs plus public threads only', async () => {
  const { xml, urls } = await fetchSitemap('forum.unitedmobilerv.com', {
    DB: db({
      threads: [
        { id: 'solved-one', updated_at: '2026-09-02', solved_at: '2026-09-02' },
        { id: 'open one', updated_at: '2026-09-03', solved_at: null },
      ],
      products: [{ id: 'should-not-appear' }],
    }),
  });
  assert.deepEqual(urls, [
    'https://forum.unitedmobilerv.com/forum/',
    'https://forum.unitedmobilerv.com/forum-live/',
    'https://forum.unitedmobilerv.com/forum/t/solved-one',
    'https://forum.unitedmobilerv.com/forum/t/open%20one',
  ]);
  assert.match(xml, /<loc>https:\/\/forum\.unitedmobilerv\.com\/forum\/t\/solved-one<\/loc>[\s\S]*<priority>0\.8<\/priority>/);
  assert.match(xml, /<loc>https:\/\/forum\.unitedmobilerv\.com\/forum\/t\/open%20one<\/loc>[\s\S]*<priority>0\.6<\/priority>/);
  assert.doesNotMatch(xml, /thank-you/);
  assert.doesNotMatch(xml, /book-service/);
  assert.doesNotMatch(xml, /\/shop\//);
  assert.doesNotMatch(xml, /\/victron\//);
  assert.doesNotMatch(xml, /should-not-appear/);
  assert.doesNotMatch(xml, /<loc>https:\/\/forum\.unitedmobilerv\.com\/<\/loc>/);
});

test('apex sitemap keeps the mothership inventory, including thank-you', async () => {
  const { urls } = await fetchSitemap('unitedmobilerv.com', {
    DB: db({ threads: [{ id: 'thread-a', updated_at: '2026-09-04', solved_at: null }] }),
  });
  assert.ok(urls.includes('https://unitedmobilerv.com/'));
  assert.ok(urls.includes('https://unitedmobilerv.com/book-service/thank-you/'));
  assert.ok(urls.includes('https://unitedmobilerv.com/privacy-policy/'));
  assert.ok(urls.includes('https://unitedmobilerv.com/forum/'));
  assert.ok(urls.includes('https://unitedmobilerv.com/forum/t/thread-a'));
  assert.equal(urls.some((u) => u.includes('/shop/p/')), false);
});

await run();
