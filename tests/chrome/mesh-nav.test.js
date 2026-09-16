/**
 * Shop + forum mesh chrome: absolute ecosystem links, Book → book host.
 * Run: node tests/chrome/mesh-nav.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';
import {
  BOOK_PUBLIC_HREF,
  MESH_LINKS,
  islandHeader,
  islandFooter,
} from '../../functions/_lib/mesh-chrome.js';

const REQUIRED = ['Forum', 'Software', 'Status', 'Portal', 'Shop', 'Docs'];
const BOOK_HOST = 'https://book.unitedmobilerv.com/';

function src(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

test('public Book CTA is the live book suite, not Square or /book-service/', () => {
  assert.equal(BOOK_PUBLIC_HREF, BOOK_HOST);
  assert.doesNotMatch(BOOK_PUBLIC_HREF, /square\.site/);
  assert.doesNotMatch(BOOK_PUBLIC_HREF, /book-service/);
  assert.doesNotMatch(BOOK_PUBLIC_HREF, /\/go\/book/);
});

test('mesh helper lists Forum/Software/Status/Portal/Shop/Docs as absolute hosts', () => {
  const labels = MESH_LINKS.map((l) => l.label);
  for (const name of REQUIRED) assert.ok(labels.includes(name), `missing ${name}`);
  const header = islandHeader({ current: 'shop' });
  const footer = islandFooter({ current: 'shop' });
  for (const html of [header, footer]) {
    assert.match(html, /https:\/\/forum\.unitedmobilerv\.com\//);
    assert.match(html, /https:\/\/software\.unitedmobilerv\.com\//);
    assert.match(html, /https:\/\/status\.unitedmobilerv\.com\//);
    assert.match(html, /https:\/\/portal\.unitedmobilerv\.com\//);
    assert.match(html, /https:\/\/shop\.unitedmobilerv\.com\//);
    assert.match(html, /https:\/\/docs\.unitedmobilerv\.com\//);
    assert.match(html, new RegExp(BOOK_HOST.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(html, /href="\/book-service\//);
    assert.doesNotMatch(html, /square\.site/);
  }
});

test('shop + forum templates include mesh hosts and book. Book CTAs', () => {
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
  }
  const forumFiles = [
    'forum/index.html',
    'functions/forum/t/[id].js',
    'functions/forum/member/[id].js',
  ];
  for (const file of forumFiles) {
    const html = src(file);
    assert.match(html, /forum\.unitedmobilerv\.com/, file);
    assert.match(html, /software\.unitedmobilerv\.com/, file);
    assert.match(html, /status\.unitedmobilerv\.com/, file);
    assert.match(html, /portal\.unitedmobilerv\.com/, file);
    assert.match(html, /shop\.unitedmobilerv\.com/, file);
    assert.match(html, /docs\.unitedmobilerv\.com/, file);
    assert.match(html, /book\.unitedmobilerv\.com/, file);
    assert.doesNotMatch(html, /class="(?:btn[^"]*|nav-phone)"[^>]*href="\/book-service\//, file);
  }
});

test('shop lockdown allowlist is unchanged (no /forum/ or /design/ added)', () => {
  const mw = src('functions/_middleware.js');
  assert.match(mw, /const SHOP_ALLOWED_PREFIXES = \['\/shop\/', '\/api\/shop\/', '\/book-service\/', '\/api\/book', '\/css\/', '\/js\/', '\/assets\/', '\/fonts\/'\]/);
});

test('site.js rewrites chrome Book labels to book host, not BOOK ONLINE', () => {
  const js = src('js/site.js');
  assert.match(js, /https:\/\/book\.unitedmobilerv\.com\//);
  assert.match(js, /\^\(Book\|Book Now\|Book a Service\)\$/);
});

await run();
