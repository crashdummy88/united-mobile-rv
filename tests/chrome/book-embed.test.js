/**
 * book. Square embed + substantial booking homepage.
 * Run: node tests/chrome/book-embed.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';
import {
  squareAppointmentsEmbedSrc,
  squareAppointmentsEmbedSrcWithIntent,
  SQUARE_EMBED_ENV,
  renderBookSuite,
} from '../../functions/_lib/book-suite.js';
import { BOOK_PUBLIC_HREF, SQUARE_BOOK_URL, MESH_LINKS } from '../../functions/_lib/mesh-chrome.js';

function src(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

const PASTED = 'https://squareup.com/appointments/buyer/widget/example-from-matt/LOC';

test('mesh Book href is book. wrap; square.site is not chrome Book', () => {
  assert.equal(BOOK_PUBLIC_HREF, 'https://book.unitedmobilerv.com/');
  assert.equal(MESH_LINKS.find((l) => l.key === 'book').href, BOOK_PUBLIC_HREF);
  assert.notEqual(BOOK_PUBLIC_HREF, SQUARE_BOOK_URL);
});

test('default embed src is Matt square.site URL; env override must be Square-land', () => {
  assert.equal(SQUARE_EMBED_ENV, 'SQUARE_APPOINTMENTS_EMBED_SRC');
  assert.equal(squareAppointmentsEmbedSrc(), SQUARE_BOOK_URL);
  assert.equal(squareAppointmentsEmbedSrc({}), SQUARE_BOOK_URL);
  assert.equal(squareAppointmentsEmbedSrc({ SQUARE_APPOINTMENTS_EMBED_SRC: '' }), SQUARE_BOOK_URL);
  assert.equal(squareAppointmentsEmbedSrc({ SQUARE_APPOINTMENTS_EMBED_SRC: 'not-a-url' }), SQUARE_BOOK_URL);
});

test('non-Square embed URL is ignored; square.site remains the engine', () => {
  assert.equal(squareAppointmentsEmbedSrc({
    SQUARE_APPOINTMENTS_EMBED_SRC: 'https://evil.example/widget/abc',
  }), SQUARE_BOOK_URL);
  assert.equal(squareAppointmentsEmbedSrc({
    SQUARE_APPOINTMENTS_EMBED_SRC: 'https://book.unitedmobilerv.com/',
  }), SQUARE_BOOK_URL);
});

test('Matt-pasted Square-land https URL is used as-is', () => {
  assert.equal(squareAppointmentsEmbedSrc({
    SQUARE_APPOINTMENTS_EMBED_SRC: PASTED,
  }), PASTED);
});

test('request intent query is appended to embed src without inventing SKUs', () => {
  const req = new Request('https://book.unitedmobilerv.com/?service=generator-maintenance&utm_source=umrt_shop');
  const href = squareAppointmentsEmbedSrcWithIntent({
    SQUARE_APPOINTMENTS_EMBED_SRC: PASTED,
  }, req);
  const u = new URL(href);
  assert.equal(u.searchParams.get('service'), 'generator-maintenance');
  assert.equal(u.searchParams.get('utm_source'), 'umrt_shop');
  const fallback = squareAppointmentsEmbedSrcWithIntent({}, req);
  assert.match(fallback, /united-mobile-rv-llc\.square\.site/);
  assert.match(fallback, /service=generator-maintenance/);
});

test('book homepage iframes Square and ships full UMRV sections', async () => {
  const bare = await renderBookSuite(new Request('https://book.unitedmobilerv.com/'), {});
  const html = await bare.text();
  assert.match(html, /data-square-embed="square-site"/);
  assert.match(html, /<iframe class="square-appointments-frame"/);
  assert.match(html, /united-mobile-rv-llc\.square\.site/);
  assert.match(html, /Request a service call/);
  assert.match(html, /What we fix/);
  assert.match(html, /Quoted upfront/);
  assert.match(html, /Montana · Wyoming · Idaho · Washington/);
  assert.match(html, /Victron Professional Certified Installer/);
  assert.match(html, /sms:\+16166065277/);
  assert.match(html, /tel:\+16166065277/);
  assert.match(html, /Text Now \(616\) 606-5277/);
  assert.doesNotMatch(html, /data-square-embed="pending"/);
  assert.doesNotMatch(html, /SQUARE_APPOINTMENTS_EMBED_SRC/);
  assert.doesNotMatch(html, /Same convert pattern/);
  assert.doesNotMatch(html, /Do not invent widget/);
  assert.doesNotMatch(html, /squareup\.com\/appointments\/buyer\/widget\/[A-Za-z0-9_-]{6,}/);

  const live = await renderBookSuite(new Request('https://book.unitedmobilerv.com/?service=generator-maintenance'), {
    SQUARE_APPOINTMENTS_EMBED_SRC: PASTED,
  });
  const overlay = await live.text();
  assert.match(overlay, /data-square-embed="live"/);
  assert.match(overlay, /squareup\.com\/appointments\/buyer\/widget\/example-from-matt\/LOC/);
  assert.match(overlay, /service=generator-maintenance/);
});

test('book-suite source does not hardcode a Square widget or location ID', () => {
  const body = src('functions/_lib/book-suite.js');
  assert.match(body, /SQUARE_BOOK_URL/);
  assert.match(body, /isSquareLandUrl/);
  assert.doesNotMatch(body, /squareup\.com\/appointments\/buyer\/widget\/[A-Za-z0-9]{8,}/);
  assert.doesNotMatch(body, /11ee0a41ff32bdd39387ac1f6bbbd01e/);
  assert.doesNotMatch(body, /SQUARE_LOCATION_ID\s*=\s*['"][^'"]+['"]/);
});

await run();
