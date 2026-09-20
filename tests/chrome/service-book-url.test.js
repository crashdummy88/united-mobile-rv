/**
 * Shop Services "Book this service" hrefs: Square-land only, optional
 * book_url, appointments default + intent query. HEAD /shop/?tab=services.
 * Run: node tests/chrome/service-book-url.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';
import {
  serviceBookHref,
  isSquareLandUrl,
} from '../../functions/_lib/shop.js';
import {
  BOOK_PUBLIC_HREF,
  SQUARE_BOOK_URL,
  SQUARE_APPOINTMENTS_HREF,
} from '../../functions/_lib/mesh-chrome.js';
import { onRequestGet, onRequestHead } from '../../functions/shop/index.js';

function src(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

const GEN = {
  id: 'generator-maintenance',
  title: 'Generator Maintenance',
};

test('chrome Book lock is book. wrap; Square stays card deep-link fallback', () => {
  assert.equal(BOOK_PUBLIC_HREF, 'https://book.unitedmobilerv.com/');
  assert.equal(SQUARE_BOOK_URL, 'https://united-mobile-rv-llc.square.site/');
  assert.notEqual(BOOK_PUBLIC_HREF, SQUARE_BOOK_URL);
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
  assert.equal(`${u.origin}/`, SQUARE_BOOK_URL);
  assert.notEqual(href, SQUARE_BOOK_URL);
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

test('shop listing uses serviceBookHref for cards; chrome Book still BOOK_PUBLIC_HREF', () => {
  const listing = src('functions/shop/index.js');
  assert.match(listing, /serviceBookHref\(s, env\)/);
  assert.match(listing, /Book this service/);
  assert.match(listing, /SELECT id, title, description, category, price, price_type, price_note, book_url/);
  assert.match(listing, /export function onRequestHead/);
  assert.doesNotMatch(listing, /href="\$\{BOOK_PUBLIC_HREF\}"[^>]*>Book this service/);
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

test('GET /shop/?tab=services renders Generator CTA with intent query, not bare homepage', async () => {
  const rows = [
    {
      id: 'generator-maintenance',
      title: 'Generator Maintenance',
      description: 'On-site oil change',
      category: 'power-solar',
      price: 150,
      price_type: 'starting_at',
      price_note: null,
      book_url: 'https://united-mobile-rv-llc.square.site/?service=generator-maintenance&utm_source=umrt_shop&utm_medium=service_card&utm_campaign=book_this_service&utm_content=generator-maintenance',
    },
    {
      id: 'diagnostic-fee',
      title: 'Diagnostic Visit',
      description: 'Initial on-site diagnostic',
      category: 'diagnostics',
      price: 175,
      price_type: 'flat',
      price_note: 'per visit',
      book_url: null,
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
  const res = await onRequestGet({
    env,
    request: new Request('https://shop.unitedmobilerv.com/shop/?tab=services'),
  });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Generator Maintenance/);
  assert.match(html, /Starting at \$150/);
  assert.match(html, /href="https:\/\/united-mobile-rv-llc\.square\.site\/\?service=generator-maintenance/);
  assert.match(html, /href="https:\/\/united-mobile-rv-llc\.square\.site\/\?service=diagnostic-fee/);
  assert.match(html, /Book this service/);
  assert.match(html, /href="https:\/\/unitedmobilerv\.com\/guide\/generator-troubleshooting\/"/);
  assert.match(html, />Guide</);
  assert.doesNotMatch(html, /Related guides/i);
  assert.doesNotMatch(html, /Field guides/i);
  assert.doesNotMatch(html, /WP Field Guides/i);
  assert.doesNotMatch(html, /href="\/guide\//);
  const cardHrefs = [...html.matchAll(/shop-service-card[\s\S]*?href="([^"]+)"[^>]*>Book this service/g)].map((m) => m[1]);
  assert.equal(cardHrefs.length, 2);
  for (const href of cardHrefs) {
    assert.match(href, /united-mobile-rv-llc\.square\.site\/\?service=/);
    assert.doesNotMatch(href, /book\.unitedmobilerv\.com/);
    assert.notEqual(href, 'https://united-mobile-rv-llc.square.site/');
  }
  // Header chrome Book stays on the book. wrap (no query)
  assert.match(html, /btn btn-ghost" href="https:\/\/book\.unitedmobilerv\.com\/">Book</);
});

await run();
