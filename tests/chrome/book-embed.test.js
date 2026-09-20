/**
 * book. Square Appointments embed: env-only src, no invented IDs.
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

test('missing env yields empty embed src (no invented Square ID)', () => {
  assert.equal(SQUARE_EMBED_ENV, 'SQUARE_APPOINTMENTS_EMBED_SRC');
  assert.equal(squareAppointmentsEmbedSrc(), '');
  assert.equal(squareAppointmentsEmbedSrc({}), '');
  assert.equal(squareAppointmentsEmbedSrc({ SQUARE_APPOINTMENTS_EMBED_SRC: '' }), '');
  assert.equal(squareAppointmentsEmbedSrc({ SQUARE_APPOINTMENTS_EMBED_SRC: 'not-a-url' }), '');
});

test('non-Square embed URL is ignored', () => {
  assert.equal(squareAppointmentsEmbedSrc({
    SQUARE_APPOINTMENTS_EMBED_SRC: 'https://evil.example/widget/abc',
  }), '');
  assert.equal(squareAppointmentsEmbedSrc({
    SQUARE_APPOINTMENTS_EMBED_SRC: 'https://book.unitedmobilerv.com/',
  }), '');
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
  assert.equal(squareAppointmentsEmbedSrcWithIntent({}, req), '');
});

test('book homepage placeholders when env is missing; iframes when Matt pasted', async () => {
  const bare = await renderBookSuite(new Request('https://book.unitedmobilerv.com/'), {});
  const pending = await bare.text();
  assert.match(pending, /data-square-embed="pending"/);
  assert.match(pending, /SQUARE_APPOINTMENTS_EMBED_SRC/);
  assert.match(pending, /Do not invent widget or location IDs/);
  assert.match(pending, /Open Square booking/);
  assert.match(pending, /sms:\+16166065277/);
  assert.match(pending, /tel:\+16166065277/);
  assert.doesNotMatch(pending, /<iframe class="square-appointments-frame"/);
  assert.doesNotMatch(pending, /squareup\.com\/appointments\/buyer\/widget\/[A-Za-z0-9_-]{6,}/);

  const live = await renderBookSuite(new Request('https://book.unitedmobilerv.com/?service=generator-maintenance'), {
    SQUARE_APPOINTMENTS_EMBED_SRC: PASTED,
  });
  const html = await live.text();
  assert.match(html, /data-square-embed="live"/);
  assert.match(html, /<iframe class="square-appointments-frame"/);
  assert.match(html, /squareup\.com\/appointments\/buyer\/widget\/example-from-matt\/LOC/);
  assert.match(html, /service=generator-maintenance/);
  assert.doesNotMatch(html, /data-square-embed="pending"/);
});

test('book-suite source does not hardcode a Square widget or location ID', () => {
  const body = src('functions/_lib/book-suite.js');
  assert.match(body, /SQUARE_APPOINTMENTS_EMBED_SRC/);
  assert.match(body, /isSquareLandUrl/);
  assert.doesNotMatch(body, /squareup\.com\/appointments\/buyer\/widget\/[A-Za-z0-9]{8,}/);
  assert.doesNotMatch(body, /SQUARE_LOCATION_ID\s*=\s*['"][^'"]+['"]/);
});

await run();
