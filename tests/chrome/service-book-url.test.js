/**
 * Square-land allowlist + shop parts catalog: no Services sale tab,
 * optional productSquareHref when a real Square item URL exists.
 * Run: node tests/chrome/service-book-url.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';
import {
  serviceBookHref,
  isSquareLandUrl,
  productSquareHref,
} from '../../functions/_lib/shop.js';
import {
  BOOK_PUBLIC_HREF,
  SQUARE_BOOK_URL,
  SQUARE_APPOINTMENTS_HREF,
} from '../../functions/_lib/mesh-chrome.js';
import { onRequestGet, onRequestHead } from '../../functions/shop/index.js';
import { onRequestGet as productPage } from '../../functions/shop/p/[id].js';

function src(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

const GEN = {
  id: 'generator-maintenance',
  title: 'Generator Maintenance',
};

test('chrome Book lock stays Square homepage root (not appointments, not book.)', () => {
  assert.equal(BOOK_PUBLIC_HREF, 'https://united-mobile-rv-llc.square.site/');
  assert.equal(SQUARE_BOOK_URL, BOOK_PUBLIC_HREF);
  assert.equal(SQUARE_APPOINTMENTS_HREF, 'https://united-mobile-rv-llc.square.site/s/appointments');
  assert.notEqual(SQUARE_APPOINTMENTS_HREF, BOOK_PUBLIC_HREF);
});

test('isSquareLandUrl accepts Square hosts and rejects off-ecosystem pastes', () => {
  assert.equal(isSquareLandUrl('https://united-mobile-rv-llc.square.site/s/appointments'), true);
  assert.equal(isSquareLandUrl('https://app.squareup.com/appointments/book/abc/LOC/start'), true);
  assert.equal(isSquareLandUrl('https://square.link/u/STB7z2B6'), true);
  assert.equal(isSquareLandUrl('https://book.unitedmobilerv.com/'), false);
  assert.equal(isSquareLandUrl('https://portal.unitedmobilerv.com/book/'), false);
  assert.equal(isSquareLandUrl('/book-service/'), false);
  assert.equal(isSquareLandUrl('javascript:alert(1)'), false);
  assert.equal(isSquareLandUrl('http://united-mobile-rv-llc.square.site/'), false);
});

test('NULL book_url defaults to Square homepage with service + UTM intent', () => {
  const href = serviceBookHref(GEN);
  const u = new URL(href);
  assert.equal(`${u.origin}/`, BOOK_PUBLIC_HREF);
  assert.notEqual(href, BOOK_PUBLIC_HREF);
  assert.equal(u.searchParams.get('service'), 'generator-maintenance');
  assert.equal(u.searchParams.get('service_name'), 'Generator Maintenance');
  assert.equal(u.searchParams.get('utm_source'), 'umrt_shop');
  assert.equal(u.searchParams.get('utm_medium'), 'service_card');
  assert.equal(u.searchParams.get('utm_campaign'), 'book_this_service');
  assert.equal(u.searchParams.get('utm_content'), 'generator-maintenance');
  assert.doesNotMatch(href, /\/s\/appointments/);
  assert.doesNotMatch(href, /book\.unitedmobilerv\.com/);
  assert.doesNotMatch(href, /book-service/);
});

test('explicit Square book_url is used as-is (no invented catalog id)', () => {
  const pasted = 'https://square.link/u/STB7z2B6';
  assert.equal(serviceBookHref({ ...GEN, book_url: pasted }), pasted);
});

test('non-Square book_url is ignored; Pages env SQUARE_BOOKING_URL wins as base', () => {
  const fallback = serviceBookHref({ ...GEN, book_url: 'https://evil.example/phish' });
  assert.match(fallback, /^https:\/\/united-mobile-rv-llc\.square\.site\/\?/);
  assert.match(fallback, /service=generator-maintenance/);

  const envBase = SQUARE_APPOINTMENTS_HREF;
  const href = serviceBookHref(GEN, { SQUARE_BOOKING_URL: envBase });
  assert.match(href, /\/s\/appointments\?/);
  assert.match(href, /service=generator-maintenance/);
});

test('shop listing is parts-only; chrome Book still BOOK_PUBLIC_HREF', () => {
  const listing = src('functions/shop/index.js');
  assert.match(listing, /productSquareHref/);
  assert.match(listing, /View on Square/);
  assert.match(listing, /export function onRequestHead/);
  assert.doesNotMatch(listing, /serviceBookHref/);
  assert.doesNotMatch(listing, /Book this service/);
  assert.doesNotMatch(listing, /FROM services/);
  assert.doesNotMatch(listing, /shop-tab-row/);
  assert.doesNotMatch(listing, /href="\$\{base\}\/shop\/\?tab=services"/);
});

test('migration 020 adds book_url and seeds Generator Maintenance with intent query', () => {
  const sql = src('db/migrations/020_services_book_url.sql');
  assert.match(sql, /ALTER TABLE services ADD COLUMN book_url TEXT/);
  assert.match(sql, /WHERE id = 'generator-maintenance'/);
  assert.match(sql, /united-mobile-rv-llc\.square\.site\/\?service=generator-maintenance/);
  assert.doesNotMatch(sql, /xnqilu00qqy558/);
  assert.match(sql, /How Matt adds a per-SKU Square link/);
});

test('HEAD /shop/?tab=services returns 200 with empty body', async () => {
  const res = onRequestHead();
  assert.equal(res.status, 200);
  assert.equal(await res.text(), '');
  assert.match(res.headers.get('Content-Type'), /text\/html/);
});

test('productSquareHref uses a real Square item URL and rejects off-ecosystem pastes', () => {
  const pasted = 'https://united-mobile-rv-llc.square.site/product/victron-gx-touch-50/123';
  assert.equal(productSquareHref({ square_item_url: pasted }), pasted);
  assert.equal(productSquareHref({ square_item_url: 'https://square.link/u/STB7z2B6' }), 'https://square.link/u/STB7z2B6');
  assert.equal(productSquareHref({ square_item_url: 'https://evil.example/phish' }), '');
  assert.equal(productSquareHref({ square_item_url: null }), '');
  assert.equal(productSquareHref({ square_catalog_object_id: 'CATALOG_ONLY' }), '');
  assert.equal(productSquareHref({}), '');
});

test('GET /shop/ and leftover ?tab=services render parts catalog, not service cards', async () => {
  const rows = [
    {
      id: 'victron-gxtouch50',
      manufacturer: 'Victron Energy',
      title: 'Victron GX Touch 50 System Monitor',
      category: 'rv-power-protection',
      retail_price: 220.15,
      product_type: 'individual',
      stock_status: 'unverified',
      image_url: null,
      square_item_url: 'https://united-mobile-rv-llc.square.site/product/victron-gx-touch-50/abc',
    },
    {
      id: 'artek-epoch-eco-12v',
      manufacturer: 'Epoch',
      title: 'Epoch 12V Eco Series LiFePO4 Battery',
      category: 'rv-batteries',
      retail_price: 325,
      product_type: 'individual',
      stock_status: 'unverified',
      image_url: null,
      square_item_url: null,
    },
  ];
  const env = {
    DB: {
      prepare() {
        return {
          async all() { return { results: rows }; },
        };
      },
    },
  };

  for (const href of [
    'https://shop.unitedmobilerv.com/shop/',
    'https://shop.unitedmobilerv.com/shop/?tab=services',
    'https://shop.unitedmobilerv.com/',
  ]) {
    const res = await onRequestGet({
      env,
      request: new Request(href),
    });
    assert.equal(res.status, 200, href);
    const html = await res.text();
    assert.match(html, /Specify the system/);
    assert.match(html, /Victron GX Touch 50/);
    assert.match(html, /Epoch 12V Eco Series/);
    assert.match(html, /shop-add-btn/);
    assert.match(html, /href="https:\/\/united-mobile-rv-llc\.square\.site\/product\/victron-gx-touch-50\/abc"[^>]*>View on Square</);
    assert.equal((html.match(/View on Square/g) || []).length, 1, href);
    assert.doesNotMatch(html, /shop-tab-row/);
    assert.doesNotMatch(html, /shop-tab/);
    assert.doesNotMatch(html, /shop-service-card/);
    assert.doesNotMatch(html, /Book this service/);
    assert.doesNotMatch(html, /Generator Maintenance/);
    assert.doesNotMatch(html, /square\.site\/\?service=/);
    assert.doesNotMatch(html, /System work rates/);
    assert.match(html, /<link rel="canonical" href="https:\/\/shop\.unitedmobilerv\.com\/shop\/">/);
    assert.match(html, /btn btn-ghost" href="https:\/\/united-mobile-rv-llc\.square\.site\/" target="_blank" rel="noopener">Book</);
    assert.match(html, /href="https:\/\/unitedmobilerv\.com\/service\/"/);
  }
});

test('product page exposes View on Square only when a real Square item URL exists', async () => {
  const withUrl = {
    id: 'victron-gxtouch50',
    sku: 'VICTRON-GXTOUCH50',
    manufacturer: 'Victron Energy',
    model: 'GX Touch 50',
    title: 'Victron GX Touch 50 System Monitor',
    description: 'Touchscreen system monitor.',
    category: 'rv-power-protection',
    product_type: 'individual',
    retail_price: 220.15,
    price_source: 'artek.energy',
    stock_status: 'unverified',
    installation_required: 0,
    compatibility: null,
    image_url: null,
    square_item_url: 'https://united-mobile-rv-llc.square.site/product/victron-gx-touch-50/abc',
  };
  const envFor = (product) => ({
    DB: {
      prepare() {
        return {
          bind() { return this; },
          async first() { return product; },
          async all() { return { results: [] }; },
        };
      },
    },
  });

  const withLink = await productPage({
    env: envFor(withUrl),
    params: { id: withUrl.id },
    request: new Request('https://shop.unitedmobilerv.com/shop/p/victron-gxtouch50'),
  });
  const withHtml = await withLink.text();
  assert.equal(withLink.status, 200);
  assert.match(withHtml, /Add to Cart/);
  assert.match(withHtml, /Request a quote/);
  assert.match(withHtml, /Payment is arranged through Square after we confirm/);
  assert.match(withHtml, /href="https:\/\/united-mobile-rv-llc\.square\.site\/product\/victron-gx-touch-50\/abc"[^>]*>View on Square</);
  assert.match(withHtml, /btn btn-ghost" href="https:\/\/united-mobile-rv-llc\.square\.site\/" target="_blank" rel="noopener">Book</);

  const noLink = await productPage({
    env: envFor({ ...withUrl, square_item_url: null }),
    params: { id: withUrl.id },
    request: new Request('https://shop.unitedmobilerv.com/shop/p/victron-gxtouch50'),
  });
  const noHtml = await noLink.text();
  assert.equal(noLink.status, 200);
  assert.match(noHtml, /Add to Cart/);
  assert.doesNotMatch(noHtml, /View on Square/);
  assert.doesNotMatch(noHtml, /square\.site\/product\//);
});

await run();
