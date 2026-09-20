/**
 * Shop + forum + book mesh chrome: absolute ecosystem links, Book → book.
 * Convert stack: Text Now sms: + tel: number + book. wrap Book.
 * Run: node tests/chrome/mesh-nav.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';
import {
  BOOK_PUBLIC_HREF,
  SQUARE_BOOK_URL,
  MESH_LINKS,
  TEXT_NOW_HREF,
  TEXT_NOW_LABEL,
  TEXT_NOW_COMPACT,
  CALL_HREF,
  CALL_LABEL,
  MAIN_HOME_HREF,
  MAIN_HOME_LABEL,
  islandHeader,
  islandFooter,
  islandMobileBar,
} from '../../functions/_lib/mesh-chrome.js';

const NUMBERED_NAV = ['Shop', 'Book', 'Forum', 'Software', 'Docs'];
const PRODUCT_NAV = ['Home', ...NUMBERED_NAV];
const FORBIDDEN = /Portal|Status|Field guides|WP Field Guides|MAIN HUB/;
const BOOK_HOST = 'https://book.unitedmobilerv.com/';
const SQUARE = 'https://united-mobile-rv-llc.square.site/';

function productLabels(html) {
  const chunk = html.match(/<ul class="nav-links">([\s\S]*?)<\/ul>/)
    || html.match(/umrt-platform-bar-inner">([\s\S]*?)<\/div>/)
    || html.match(/<div class="micro">Network<\/div>([\s\S]*?)(?:<\/div>|<div class="micro">)/);
  const src = chunk ? chunk[1] : html;
  return [...src.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)]
    .map((m) => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    .filter((label) => PRODUCT_NAV.includes(label));
}

function src(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

test('public Book CTA is book. wrap, not raw square.site hop', () => {
  assert.equal(BOOK_PUBLIC_HREF, BOOK_HOST);
  assert.equal(SQUARE_BOOK_URL, SQUARE);
  assert.notEqual(BOOK_PUBLIC_HREF, SQUARE_BOOK_URL);
  assert.match(BOOK_PUBLIC_HREF, /book\.unitedmobilerv\.com/);
  assert.doesNotMatch(BOOK_PUBLIC_HREF, /square\.site/);
  assert.doesNotMatch(BOOK_PUBLIC_HREF, /book-service/);
  assert.doesNotMatch(BOOK_PUBLIC_HREF, /\/go\/book/);
  assert.doesNotMatch(BOOK_PUBLIC_HREF, /pages\.dev/);
});

test('Text Now is sms:+16166065277; number is tel:+16166065277', () => {
  assert.equal(TEXT_NOW_HREF, 'sms:+16166065277');
  assert.equal(TEXT_NOW_LABEL, 'Text Now (616) 606-5277');
  assert.equal(TEXT_NOW_COMPACT, 'Text Now');
  assert.equal(CALL_HREF, 'tel:+16166065277');
  assert.equal(CALL_LABEL, 'Call (616) 606-5277');
  assert.equal(MAIN_HOME_HREF, 'https://unitedmobilerv.com/');
  assert.equal(MAIN_HOME_LABEL, 'Home');
  assert.notEqual(MAIN_HOME_LABEL, 'MAIN HUB');
});

test('MESH_LINKS is Home + Shop · Book · Forum · Software · Docs (no Portal/Status/Guides)', () => {
  const labels = MESH_LINKS.map((l) => l.label);
  assert.deepEqual(labels, PRODUCT_NAV);
  assert.deepEqual(labels.filter((l) => l !== 'Home'), NUMBERED_NAV);
  assert.ok(labels.indexOf('Shop') < labels.indexOf('Book'), 'Shop-first, not Book-first');
  assert.equal(labels[0], 'Home');
  assert.equal(labels[1], 'Shop');
  assert.equal(MESH_LINKS.find((l) => l.key === 'book').href, BOOK_HOST);
  assert.equal(MESH_LINKS.find((l) => l.key === 'home').href, 'https://unitedmobilerv.com/');
  assert.ok(!MESH_LINKS.some((l) => /guide|portal|status/i.test(l.label) || /guide|portal|status/i.test(l.key)));
  const header = islandHeader({ current: 'shop' });
  const footer = islandFooter({ current: 'shop' });
  const mobile = islandMobileBar();
  assert.deepEqual(productLabels(header), PRODUCT_NAV);
  assert.deepEqual(productLabels(footer), PRODUCT_NAV);
  for (const html of [header, footer]) {
    assert.match(html, /https:\/\/unitedmobilerv\.com\//);
    assert.match(html, /https:\/\/shop\.unitedmobilerv\.com\//);
    assert.match(html, /https:\/\/book\.unitedmobilerv\.com\//);
    assert.match(html, /https:\/\/forum\.unitedmobilerv\.com\//);
    assert.match(html, /https:\/\/software\.unitedmobilerv\.com\//);
    assert.match(html, /https:\/\/docs\.unitedmobilerv\.com\//);
    assert.doesNotMatch(html, /status\.unitedmobilerv\.com/);
    assert.doesNotMatch(html, /portal\.unitedmobilerv\.com/);
    assert.doesNotMatch(html, FORBIDDEN);
    assert.doesNotMatch(html, /unitedmobilerv\.com\/guide\//);
    assert.doesNotMatch(html, />Guides</);
    assert.doesNotMatch(html, />MAIN HUB</);
  }
  for (const html of [header, footer, mobile]) {
    assert.match(html, /book\.unitedmobilerv\.com/);
    assert.doesNotMatch(html, /Prefer Text/);
    assert.doesNotMatch(html, /href="\/book-service\//);
    assert.doesNotMatch(html, /pages\.dev/);
    assert.doesNotMatch(html, /Text \/ Call/);
    assert.doesNotMatch(html, /staging site/i);
  }
  assert.match(header, /nav-phone[^>]+tel:\+16166065277/);
  assert.match(header, /Call \(616\) 606-5277/);
  assert.match(header, /nav-text-now[^>]+sms:\+16166065277/);
  assert.match(header, />Text Now</);
  assert.match(header, /btn btn-ghost[^>]+book\.unitedmobilerv\.com/);
  assert.match(mobile, /Call \(616\) 606-5277/);
  assert.match(mobile, /tel:\+16166065277/);
  assert.match(mobile, /btn btn-gold[^>]+sms:\+16166065277/);
  assert.match(mobile, />Text Now</);
  assert.doesNotMatch(mobile, /Text Now \(616\) 606-5277/);
  assert.match(footer, /tel:\+16166065277/);
  assert.match(footer, /sms:\+16166065277/);
  assert.doesNotMatch(header, /Prefer Text/);
  assert.doesNotMatch(mobile, /Prefer Text/);
});

test('shop + forum templates include mesh-chrome (or static mesh + book. Book)', () => {
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
    assert.doesNotMatch(html, /Prefer Text/, file);
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
    assert.doesNotMatch(html, /Prefer Text/, file);
  }
  const forum = src('forum/index.html');
  assert.deepEqual(productLabels(forum.match(/<ul class="nav-links">[\s\S]*?<\/ul>/)[0]), PRODUCT_NAV);
  assert.match(forum, /https:\/\/forum\.unitedmobilerv\.com\//);
  assert.match(forum, /https:\/\/software\.unitedmobilerv\.com\//);
  assert.match(forum, /https:\/\/shop\.unitedmobilerv\.com\//);
  assert.match(forum, /https:\/\/docs\.unitedmobilerv\.com\//);
  assert.match(forum, />Home</);
  assert.match(forum, /href="https:\/\/unitedmobilerv\.com\/"[^>]*>Home</);
  assert.doesNotMatch(forum, />MAIN HUB</);
  assert.doesNotMatch(forum, /status\.unitedmobilerv\.com/);
  assert.doesNotMatch(forum, /portal\.unitedmobilerv\.com/);
  assert.doesNotMatch(forum, FORBIDDEN);
  assert.doesNotMatch(forum, /unitedmobilerv\.com\/guide\//);
  assert.doesNotMatch(forum, /Field guides/i);
  assert.doesNotMatch(forum, />Guides</);
  assert.doesNotMatch(forum, /WP Field Guides/i);
  assert.match(forum, /book\.unitedmobilerv\.com/);
  assert.doesNotMatch(forum, /united-mobile-rv-llc\.square\.site/);
  assert.match(forum, /sms:\+16166065277/);
  assert.match(forum, /tel:\+16166065277/);
  assert.match(forum, /Text Now/);
  assert.match(forum, /Call \(616\) 606-5277/);
  assert.doesNotMatch(forum, /Prefer Text/);
  assert.doesNotMatch(forum, /class="(?:btn[^"]*|nav-phone)"[^>]*href="\/book-service\//);
  assert.doesNotMatch(forum, /Text \/ Call/);
  assert.doesNotMatch(forum, /href="https:\/\/united-mobile-rv\.pages\.dev/);
});

test('shop lockdown allowlist is unchanged (no /forum/ or /design/ added)', () => {
  const mw = src('functions/_middleware.js');
  assert.match(mw, /const SHOP_ALLOWED_PREFIXES = \['\/shop\/', '\/api\/shop\/', '\/book-service\/', '\/api\/book', '\/css\/', '\/js\/', '\/assets\/', '\/fonts\/'\]/);
});

test('site.js stamps Call + gold Text Now + book. Book on every nav/mobile bar', () => {
  const js = src('js/site.js');
  assert.match(js, /https:\/\/book\.unitedmobilerv\.com\//);
  assert.match(js, /sms:\+16166065277/);
  assert.match(js, /tel:\+16166065277/);
  assert.match(js, /Call \(616\) 606-5277/);
  assert.match(js, /MAIN_HOME_LABEL = 'Home'/);
  assert.doesNotMatch(js, /MAIN_HOME_LABEL = 'MAIN HUB'/);
  assert.match(js, /https:\/\/unitedmobilerv\.com\//);
  assert.doesNotMatch(js, /\['Main', 'https:\/\/unitedmobilerv\.com\/'\]/);
  assert.match(js, /navCtaHtml/);
  assert.match(js, /mobileBarHtml/);
  assert.match(js, /umrt-platform-bar/);
  assert.doesNotMatch(js, /\['Field guides'/);
  assert.doesNotMatch(js, /\['Guides'/);
  assert.doesNotMatch(js, /https:\/\/unitedmobilerv\.com\/guide\//);
  assert.doesNotMatch(js, /\['Status', 'https:\/\/status\.unitedmobilerv\.com\/'\]/);
  assert.doesNotMatch(js, /\['Portal', 'https:\/\/portal\.unitedmobilerv\.com\/'\]/);
  assert.match(js, /\['Shop', 'https:\/\/shop\.unitedmobilerv\.com\/'\]/);
  assert.match(js, /\['Book', BOOK_PUBLIC\]/);
  assert.match(js, /\['Forum', 'https:\/\/forum\.unitedmobilerv\.com\/'\]/);
  assert.match(js, /\['Software', 'https:\/\/software\.unitedmobilerv\.com\/'\]/);
  assert.match(js, /\['Docs', 'https:\/\/docs\.unitedmobilerv\.com\/'\]/);
  assert.match(js, /BOOK_PUBLIC = 'https:\/\/book\.unitedmobilerv\.com\//);
  assert.doesNotMatch(js, /BOOK_PUBLIC = 'https:\/\/united-mobile-rv-llc\.square\.site\//);
  assert.doesNotMatch(js, /PREFER_TEXT_HREF = 'tel:/);
  assert.doesNotMatch(js, /pages\.dev/);
  assert.match(js, /umrtSquareBookHref/);
});

test('mothership home + platform-bar convert stack: Text Now sms + tel + book.', () => {
  for (const file of ['index.html', 'design/platform-bar.html']) {
    const html = src(file);
    const bar = html.match(/umrt-platform-bar-inner">[\s\S]*?<\/div>/)[0];
    assert.deepEqual(productLabels(bar), PRODUCT_NAV, file);
    assert.match(html, /book\.unitedmobilerv\.com/, file);
    assert.match(html, /sms:\+16166065277/, file);
    assert.match(html, /tel:\+16166065277/, file);
    assert.match(html, /Call \(616\) 606-5277/, file);
    assert.match(html, />Home</, file);
    assert.doesNotMatch(html, />MAIN HUB</, file);
    assert.doesNotMatch(html, /status\.unitedmobilerv\.com/, file);
    assert.doesNotMatch(html, /portal\.unitedmobilerv\.com/, file);
    assert.doesNotMatch(html, FORBIDDEN, file);
    assert.doesNotMatch(html, /Prefer Text/, file);
    assert.match(html, /href="https:\/\/book\.unitedmobilerv\.com\/"[^>]*data-platform-link="book"/, file);
  }
});

test('shop/forum/book Text Now anchors use sms:, not tel:', () => {
  const files = [
    'forum/index.html',
    'functions/_lib/mesh-chrome.js',
    'functions/_lib/book-suite.js',
    'js/site.js',
    'book-service/index.html',
    'book-service/thank-you/index.html',
  ];
  for (const file of files) {
    const html = src(file);
    assert.doesNotMatch(html, />Field guides</i, file);
    assert.doesNotMatch(html, />Guides</, file);
  }
  const textNowTel = /<a\b[^>]*href="tel:[^"]*"[^>]*>\s*TEXT\s*NOW/i;
  const textNowThenTel = /TEXT\s*NOW[\s\S]{0,80}href="tel:/i;
  for (const file of files) {
    const html = src(file);
    assert.match(html, /sms:\+16166065277/, file);
    assert.doesNotMatch(html, textNowTel, file);
    assert.doesNotMatch(html, textNowThenTel, file);
  }
});

await run();
