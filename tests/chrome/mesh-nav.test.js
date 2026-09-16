/**
 * Shop + forum + book mesh chrome: absolute ecosystem links, Book → Square.
 * Run: node tests/chrome/mesh-nav.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';
import {
  BOOK_PUBLIC_HREF,
  SQUARE_BOOK_URL,
  MESH_LINKS,
  PREFER_TEXT_HREF,
  PREFER_TEXT_LABEL,
  islandHeader,
  islandFooter,
  islandMobileBar,
} from '../../functions/_lib/mesh-chrome.js';

const REQUIRED = ['Main', 'Forum', 'Software', 'Status', 'Portal', 'Shop', 'Docs'];
const SQUARE = 'https://united-mobile-rv-llc.square.site/';

function src(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

test('public Book CTA is Square appointment intake, not book. or /book-service/', () => {
  assert.equal(BOOK_PUBLIC_HREF, SQUARE);
  assert.equal(SQUARE_BOOK_URL, SQUARE);
  assert.match(BOOK_PUBLIC_HREF, /square\.site/);
  assert.doesNotMatch(BOOK_PUBLIC_HREF, /book\.unitedmobilerv\.com/);
  assert.doesNotMatch(BOOK_PUBLIC_HREF, /book-service/);
  assert.doesNotMatch(BOOK_PUBLIC_HREF, /\/go\/book/);
  assert.doesNotMatch(BOOK_PUBLIC_HREF, /pages\.dev/);
});

test('Prefer Text stays tel:+16166065277 (HARD convert)', () => {
  assert.equal(PREFER_TEXT_HREF, 'tel:+16166065277');
  assert.match(PREFER_TEXT_LABEL, /Prefer Text \(616\) 606-5277/);
});

test('mesh helper lists Main/Forum/Software/Status/Portal/Shop/Docs as absolute hosts', () => {
  const labels = MESH_LINKS.map((l) => l.label);
  for (const name of REQUIRED) assert.ok(labels.includes(name), `missing ${name}`);
  const header = islandHeader({ current: 'shop' });
  const footer = islandFooter({ current: 'shop' });
  const mobile = islandMobileBar();
  for (const html of [header, footer]) {
    assert.match(html, /https:\/\/unitedmobilerv\.com\//);
    assert.match(html, /https:\/\/forum\.unitedmobilerv\.com\//);
    assert.match(html, /https:\/\/software\.unitedmobilerv\.com\//);
    assert.match(html, /https:\/\/status\.unitedmobilerv\.com\//);
    assert.match(html, /https:\/\/portal\.unitedmobilerv\.com\//);
    assert.match(html, /https:\/\/shop\.unitedmobilerv\.com\//);
    assert.match(html, /https:\/\/docs\.unitedmobilerv\.com\//);
  }
  for (const html of [header, footer, mobile]) {
    assert.match(html, /united-mobile-rv-llc\.square\.site/);
    assert.match(html, /tel:\+16166065277/);
    assert.match(html, /Prefer Text/);
    assert.doesNotMatch(html, /href="\/book-service\//);
    assert.doesNotMatch(html, /pages\.dev/);
    assert.doesNotMatch(html, /Text \/ Call/);
    assert.doesNotMatch(html, /staging site/i);
  }
  assert.match(header, /btn btn-gold[^>]+tel:\+16166065277/);
  assert.match(header, /btn btn-ghost[^>]+united-mobile-rv-llc\.square\.site/);
  assert.match(mobile, /btn btn-gold[^>]+tel:\+16166065277/);
});

test('shop + forum templates include mesh-chrome (or static mesh + Square)', () => {
  const shopFiles = [
    'functions/shop/index.js',
    'functions/shop/p/[id].js',
    'functions/shop/cart.js',
  ];
  for (const file of shopFiles) {
    const html = src(file);
    assert.match(html, /mesh-chrome\.js/, file);
    assert.match(html, /islandHeader/, file);
    assert.match(html, /islandFooter/, file);
    assert.doesNotMatch(html, /pages\.dev/, file);
  }
  const forumSsr = [
    'functions/forum/t/[id].js',
    'functions/forum/member/[id].js',
  ];
  for (const file of forumSsr) {
    const html = src(file);
    assert.match(html, /mesh-chrome\.js/, file);
    assert.match(html, /islandHeader/, file);
    assert.match(html, /islandFooter/, file);
    assert.doesNotMatch(html, /Text \/ Call/, file);
  }
  const forum = src('forum/index.html');
  assert.match(forum, /https:\/\/forum\.unitedmobilerv\.com\//);
  assert.match(forum, /https:\/\/software\.unitedmobilerv\.com\//);
  assert.match(forum, /https:\/\/status\.unitedmobilerv\.com\//);
  assert.match(forum, /https:\/\/portal\.unitedmobilerv\.com\//);
  assert.match(forum, /https:\/\/shop\.unitedmobilerv\.com\//);
  assert.match(forum, /https:\/\/docs\.unitedmobilerv\.com\//);
  assert.match(forum, /united-mobile-rv-llc\.square\.site/);
  assert.match(forum, /Prefer Text \(616\) 606-5277/);
  assert.doesNotMatch(forum, /class="(?:btn[^"]*|nav-phone)"[^>]*href="\/book-service\//);
  assert.doesNotMatch(forum, /Text \/ Call/);
  assert.doesNotMatch(forum, /href="https:\/\/united-mobile-rv\.pages\.dev/);
});

test('shop lockdown allowlist is unchanged (no /forum/ or /design/ added)', () => {
  const mw = src('functions/_middleware.js');
  assert.match(mw, /const SHOP_ALLOWED_PREFIXES = \['\/shop\/', '\/api\/shop\/', '\/book-service\/', '\/api\/book', '\/css\/', '\/js\/', '\/assets\/', '\/fonts\/'\]/);
});

test('site.js rewrites chrome Book labels to Square, not BOOK ONLINE', () => {
  const js = src('js/site.js');
  assert.match(js, /https:\/\/united-mobile-rv-llc\.square\.site\//);
  assert.match(js, /\^\(Book\|Book Now\|Book a Service\)\$/);
  assert.match(js, /umrt-platform-bar/);
  assert.doesNotMatch(js, /BOOK_PUBLIC = 'https:\/\/book\.unitedmobilerv\.com\//);
  assert.doesNotMatch(js, /pages\.dev/);
});

test('mothership home + platform-bar Book chrome hits Square', () => {
  for (const file of ['index.html', 'design/platform-bar.html']) {
    const html = src(file);
    assert.match(html, /united-mobile-rv-llc\.square\.site/, file);
    assert.match(html, /Prefer Text/, file);
    assert.doesNotMatch(html, /data-platform-link="book"[^>]*book\.unitedmobilerv\.com/, file);
    assert.doesNotMatch(html, /class="btn btn-ghost"[^>]*book\.unitedmobilerv\.com/, file);
  }
});

await run();
