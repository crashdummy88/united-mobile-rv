/**
 * Matt HARD LOCK 2026-09-20: chrome Book is STRAIGHT to Square.
 * Every platform / nav / footer / mesh Book href on shop / forum / book
 * islands must be https://united-mobile-rv-llc.square.site/
 * NEVER https://book.unitedmobilerv.com/
 *
 * Run: node tests/chrome/book-square-lock.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';
import {
  BOOK_PUBLIC_HREF,
  SQUARE_BOOK_URL,
  MESH_LINKS,
  islandHeader,
  islandFooter,
  islandMobileBar,
} from '../../functions/_lib/mesh-chrome.js';
import { renderBookSuite } from '../../functions/_lib/book-suite.js';

const SQUARE = 'https://united-mobile-rv-llc.square.site/';
const BOOK_HOST_RE = /book\.unitedmobilerv\.com/;
const BOOK_LABEL_RE = /^(Book|Book Now|Book a Service|BOOK ONLINE|Book Online|Book service)$/i;

const CHROME_FILES = [
  'functions/_lib/mesh-chrome.js',
  'js/site.js',
  'design/platform-bar.html',
  'index.html',
  'forum/index.html',
  'book-service/index.html',
  'book-service/thank-you/index.html',
];

function src(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

function labeledAnchors(html) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({
    attrs: m[1],
    href: (m[1].match(/href="([^"]*)"/) || [])[1] || '',
    label: m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
  }));
}

function chromeRegions(html) {
  return [
    ...(html.match(/<header[\s\S]*?<\/header>/g) || []),
    ...(html.match(/<footer[\s\S]*?<\/footer>/g) || []),
    ...(html.match(/<div class="mobile-bar"[^>]*>[\s\S]*?<\/div>/g) || []),
    ...(html.match(/umrt-platform-bar-inner">[\s\S]*?<\/div>/g) || []),
    ...(html.match(/<ul class="nav-links">[\s\S]*?<\/ul>/g) || []),
    ...(html.match(/<div class="nav-cta">[\s\S]*?<\/div>/g) || []),
  ];
}

function chromeBookAnchors(html) {
  return chromeRegions(html).flatMap((region) =>
    labeledAnchors(region).filter((a) =>
      BOOK_LABEL_RE.test(a.label) || /data-platform-link="book"/.test(a.attrs)
    )
  );
}

function assertChromeBookIsSquare(html, label) {
  const books = chromeBookAnchors(html);
  assert.ok(books.length > 0, `${label}: expected at least one chrome Book link`);
  for (const a of books) {
    assert.equal(a.href, SQUARE, `${label}: Book href must be Square (got ${a.href})`);
    assert.doesNotMatch(a.href, BOOK_HOST_RE, `${label}: Book href must not be book.*`);
    assert.equal(a.label, 'Book', `${label}: chrome Book label must stay Book`);
  }
  for (const region of chromeRegions(html)) {
    assert.doesNotMatch(region, /href="https:\/\/book\.unitedmobilerv\.com/, `${label}: chrome href must not be book.*`);
  }
}

test('BOOK_PUBLIC_HREF / SQUARE_BOOK_URL / MESH_LINKS.book are Square, not book.*', () => {
  assert.equal(BOOK_PUBLIC_HREF, SQUARE);
  assert.equal(SQUARE_BOOK_URL, SQUARE);
  assert.equal(BOOK_PUBLIC_HREF, SQUARE_BOOK_URL);
  const book = MESH_LINKS.find((l) => l.key === 'book');
  assert.ok(book, 'MESH_LINKS must include book');
  assert.equal(book.href, SQUARE);
  assert.equal(book.label, 'Book');
  assert.equal(book.external, true);
  assert.doesNotMatch(book.href, BOOK_HOST_RE);
  assert.deepEqual(MESH_LINKS.map((l) => l.label), ['Home', 'Shop', 'Book', 'Forum', 'Software', 'Docs']);
  assert.equal(MESH_LINKS.find((l) => l.key === 'home').href, 'https://unitedmobilerv.com/');
});

test('islandHeader / footer / mobile-bar Book href is Square, never book.*', () => {
  for (const current of ['shop', 'forum', 'book']) {
    const header = islandHeader({ current });
    const footer = islandFooter({ current });
    const mobile = islandMobileBar();
    assertChromeBookIsSquare(header, `islandHeader(${current})`);
    assertChromeBookIsSquare(footer, `islandFooter(${current})`);
    assertChromeBookIsSquare(mobile, `islandMobileBar(${current})`);
    for (const html of [header, footer, mobile]) {
      assert.doesNotMatch(html, BOOK_HOST_RE, `${current} chrome must not mention book.*`);
      assert.match(html, /united-mobile-rv-llc\.square\.site\//);
    }
  }
});

test('site.js stamper BOOK_PUBLIC + meshItems Book stay Square', () => {
  const js = src('js/site.js');
  assert.match(js, /var BOOK_PUBLIC = 'https:\/\/united-mobile-rv-llc\.square\.site\/'/);
  assert.match(js, /\['Book', BOOK_PUBLIC\]/);
  assert.match(js, /function umrtIsChromeBookLabel/);
  assert.match(js, /function umrtStampChromeBook/);
  assert.match(js, /umrtStampChromeBook\(chromeA\)/);
  assert.match(js, /umrtStampChromeBook\(leftoverBookA\)/);
  assert.match(js, /leftoverBook/);
  assert.match(js, /\.mobile-bar/);
  assert.doesNotMatch(js, /BOOK_PUBLIC = 'https:\/\/book\.unitedmobilerv\.com/);
  assert.doesNotMatch(js, /\['Book', 'https:\/\/book\.unitedmobilerv\.com/);
  assert.doesNotMatch(js, /BOOK_PUBLIC = 'https:\/\/unitedmobilerv\.com\/book-service/);
});

test('platform-bar + mothership strip Book href is Square, not book.*', () => {
  for (const file of ['design/platform-bar.html', 'index.html']) {
    const html = src(file);
    const bar = html.match(/umrt-platform-bar-inner">[\s\S]*?<\/div>/)[0];
    assertChromeBookIsSquare(bar, file);
    assert.match(bar, /data-platform-link="book"[^>]*href="https:\/\/united-mobile-rv-llc\.square\.site\/"|href="https:\/\/united-mobile-rv-llc\.square\.site\/"[^>]*data-platform-link="book"/);
    assert.doesNotMatch(bar, BOOK_HOST_RE, file);
  }
});

test('static shop/forum/book island HTML chrome Book href is Square', () => {
  for (const file of [
    'forum/index.html',
    'book-service/index.html',
    'book-service/thank-you/index.html',
  ]) {
    assertChromeBookIsSquare(src(file), file);
  }
});

test('rendered book-suite chrome Book href is Square even on book.* host', async () => {
  const res = renderBookSuite(new Request('https://book.unitedmobilerv.com/'));
  const html = await res.text();
  assertChromeBookIsSquare(html, 'renderBookSuite(book.unitedmobilerv.com)');
  const header = html.match(/<header[\s\S]*?<\/header>/)[0];
  const footer = html.match(/<footer[\s\S]*?<\/footer>/)[0];
  const mobile = html.match(/<div class="mobile-bar"[^>]*>[\s\S]*?<\/div>/)[0];
  for (const slice of [header, footer, mobile]) {
    assert.doesNotMatch(slice, /href="https:\/\/book\.unitedmobilerv\.com/, 'suite chrome href');
    assert.match(slice, /href="https:\/\/united-mobile-rv-llc\.square\.site\/"[^>]*>Book</);
  }
});

test('chrome source files never emit book.* as a Book href', () => {
  for (const file of CHROME_FILES) {
    const html = src(file);
    assert.doesNotMatch(html, /href=["']https:\/\/book\.unitedmobilerv\.com/, file);
    assert.doesNotMatch(html, /data-platform-link="book"[^>]*book\.unitedmobilerv\.com/, file);
    if (file === 'js/site.js') {
      assert.match(html, /BOOK_PUBLIC = 'https:\/\/united-mobile-rv-llc\.square\.site\/'/, file);
    } else if (file === 'functions/_lib/mesh-chrome.js') {
      assert.match(html, /SQUARE_BOOK_URL = 'https:\/\/united-mobile-rv-llc\.square\.site\/'/, file);
      assert.match(html, /BOOK_PUBLIC_HREF = SQUARE_BOOK_URL/, file);
      assert.match(html, /key: 'book', href: BOOK_PUBLIC_HREF/, file);
    } else {
      assert.match(html, /united-mobile-rv-llc\.square\.site/, file);
    }
  }
});

await run();
