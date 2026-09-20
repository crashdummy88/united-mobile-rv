/**
 * Shop + forum + book mesh chrome: absolute ecosystem links, Book → Square.
 * Convert stack: Text Now sms: + tel: number + Square Book.
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
  MAIN_SERVICES_HREF,
  MAIN_SERVICES_LABEL,
  islandHeader,
  islandFooter,
  islandMobileBar,
  shopCartNavItem,
} from '../../functions/_lib/mesh-chrome.js';

const NUMBERED_NAV = ['Services', 'Shop', 'Book', 'Forum', 'Software', 'Docs'];
const PRODUCT_NAV = ['Home', ...NUMBERED_NAV];
const FORBIDDEN = /Portal|Status|Field guides|WP Field Guides/;
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

test('public Book CTA is Square appointment intake, not book. or /book-service/', () => {
  assert.equal(BOOK_PUBLIC_HREF, SQUARE);
  assert.equal(SQUARE_BOOK_URL, SQUARE);
  assert.match(BOOK_PUBLIC_HREF, /square\.site/);
  assert.doesNotMatch(BOOK_PUBLIC_HREF, /book\.unitedmobilerv\.com/);
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
});

test('MESH_LINKS is Home · Services · Shop · Book · Forum · Software · Docs (no Portal/Status/Guides)', () => {
  const labels = MESH_LINKS.map((l) => l.label);
  assert.deepEqual(labels, PRODUCT_NAV);
  assert.deepEqual(labels.filter((l) => l !== 'Home'), NUMBERED_NAV);
  assert.ok(labels.indexOf('Shop') < labels.indexOf('Book'), 'Shop-first, not Book-first');
  assert.equal(labels[0], 'Home');
  assert.equal(labels[1], 'Services');
  assert.equal(labels[2], 'Shop');
  assert.equal(MESH_LINKS.find((l) => l.key === 'book').href, SQUARE);
  assert.equal(MESH_LINKS.find((l) => l.key === 'home').href, 'https://unitedmobilerv.com/');
  assert.equal(MESH_LINKS.find((l) => l.key === 'services').href, 'https://unitedmobilerv.com/service/');
  assert.equal(MAIN_SERVICES_HREF, 'https://unitedmobilerv.com/service/');
  assert.equal(MAIN_SERVICES_LABEL, 'Services');
  assert.ok(!MESH_LINKS.some((l) => /guide|portal|status/i.test(l.label) || /guide|portal|status/i.test(l.key)));
  const header = islandHeader({ current: 'shop' });
  const footer = islandFooter({ current: 'shop' });
  const mobile = islandMobileBar();
  assert.doesNotMatch(header, /brand-text/);
  assert.doesNotMatch(header, />United Mobile/);
  assert.match(header, /umrt-icon\.webp/);
  assert.doesNotMatch(header, /umrt-logo\.webp/);
  assert.match(header, /brand-mark/);
  assert.deepEqual(productLabels(header), PRODUCT_NAV);
  assert.deepEqual(productLabels(footer), PRODUCT_NAV);
  for (const html of [header, footer]) {
    assert.match(html, /https:\/\/unitedmobilerv\.com\//);
    assert.match(html, /https:\/\/unitedmobilerv\.com\/service\//);
    assert.match(html, /https:\/\/shop\.unitedmobilerv\.com\//);
    assert.match(html, /united-mobile-rv-llc\.square\.site/);
    assert.match(html, /https:\/\/forum\.unitedmobilerv\.com\//);
    assert.match(html, /https:\/\/software\.unitedmobilerv\.com\//);
    assert.match(html, /https:\/\/docs\.unitedmobilerv\.com\//);
    assert.doesNotMatch(html, /status\.unitedmobilerv\.com/);
    assert.doesNotMatch(html, /portal\.unitedmobilerv\.com/);
    assert.doesNotMatch(html, FORBIDDEN);
    assert.doesNotMatch(html, /unitedmobilerv\.com\/guide\//);
    assert.doesNotMatch(html, />Guides</);
  }
  for (const html of [header, footer, mobile]) {
    assert.match(html, /united-mobile-rv-llc\.square\.site/);
    assert.doesNotMatch(html, /href="https:\/\/book\.unitedmobilerv\.com/);
    assert.doesNotMatch(html, /Prefer Text/);
    assert.doesNotMatch(html, /href="\/book-service\//);
    assert.doesNotMatch(html, /pages\.dev/);
    assert.doesNotMatch(html, /Text \/ Call/);
    assert.doesNotMatch(html, /staging site/i);
  }
  const headerBooks = [...header.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)]
    .filter((m) => /^Book$/i.test(m[2].replace(/<[^>]+>/g, '').trim()));
  assert.ok(headerBooks.length >= 2, 'nav Book + CTA Book');
  for (const m of headerBooks) {
    assert.match(m[1], /href="https:\/\/united-mobile-rv-llc\.square\.site\/"/);
    assert.doesNotMatch(m[1], /book\.unitedmobilerv\.com/);
  }
  assert.match(header, /nav-phone[^>]+tel:\+16166065277/);
  assert.match(header, /Call \(616\) 606-5277/);
  assert.match(header, /nav-text-now[^>]+sms:\+16166065277/);
  assert.match(header, />Text Now</);
  assert.match(header, /btn btn-ghost[^>]+united-mobile-rv-llc\.square\.site/);
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
  const forumChrome = [
    forum.match(/<header[\s\S]*?<\/header>/)[0],
    forum.match(/<footer[\s\S]*?<\/footer>/)[0],
    forum.match(/<ul class="nav-links">[\s\S]*?<\/ul>/)[0],
    forum.match(/<div class="mobile-bar"[\s\S]*?<\/div>/)[0],
  ].join('\n');
  assert.deepEqual(productLabels(forum.match(/<ul class="nav-links">[\s\S]*?<\/ul>/)[0]), PRODUCT_NAV);
  assert.match(forum, /https:\/\/forum\.unitedmobilerv\.com\//);
  assert.match(forum, /https:\/\/software\.unitedmobilerv\.com\//);
  assert.match(forum, /https:\/\/shop\.unitedmobilerv\.com\//);
  assert.match(forum, /https:\/\/docs\.unitedmobilerv\.com\//);
  assert.match(forum, />Home</);
  assert.match(forum, /href="https:\/\/unitedmobilerv\.com\/"[^>]*>Home</);
  assert.match(forum, /href="https:\/\/unitedmobilerv\.com\/service\/"[^>]*>Services</);
  assert.doesNotMatch(forum, /brand-text/);
  assert.match(forum.match(/<header[\s\S]*?<\/header>/)[0], /umrt-icon\.webp/);
  assert.doesNotMatch(forum.match(/<header[\s\S]*?<\/header>/)[0], /umrt-logo\.webp/);
  assert.doesNotMatch(forum, />MAIN HUB</);
  assert.doesNotMatch(forum, />Main Hub</);
  assert.doesNotMatch(forum, /status\.unitedmobilerv\.com/);
  assert.doesNotMatch(forum, /portal\.unitedmobilerv\.com/);
  assert.doesNotMatch(forum, FORBIDDEN);
  // Mesh chrome stays guide-free. BUG-F2 is a body card, not a nav item.
  assert.doesNotMatch(forumChrome, /unitedmobilerv\.com\/guide\//);
  assert.match(forum, /href="https:\/\/unitedmobilerv\.com\/guide\/electrical-troubleshooting\/"/);
  assert.doesNotMatch(forum, /href="https:\/\/unitedmobilerv\.com\/guide\/"/);
  assert.doesNotMatch(forum, /Field guides/i);
  assert.doesNotMatch(forum, />Guides</);
  assert.doesNotMatch(forum, /WP Field Guides/i);
  assert.match(forum, /united-mobile-rv-llc\.square\.site/);
  assert.match(forum, /sms:\+16166065277/);
  assert.match(forum, /tel:\+16166065277/);
  assert.match(forum, /Text Now/);
  assert.match(forum, /Call \(616\) 606-5277/);
  assert.doesNotMatch(forum, /Prefer Text/);
  assert.doesNotMatch(forum, /class="(?:btn[^"]*|nav-phone)"[^>]*href="\/book-service\//);
  assert.doesNotMatch(forum, /Text \/ Call/);
  assert.doesNotMatch(forum, /href="https:\/\/united-mobile-rv\.pages\.dev/);
});

test('island chrome stamps Home → unitedmobilerv.com, never MAIN HUB', () => {
  assert.equal(MAIN_HOME_LABEL, 'Home');
  assert.equal(MAIN_HOME_HREF, 'https://unitedmobilerv.com/');
  const header = islandHeader({ current: 'shop' });
  assert.match(header, /href="https:\/\/unitedmobilerv\.com\/"[^>]*>Home</);
  assert.doesNotMatch(header, /MAIN HUB/);
  assert.doesNotMatch(header, /Main Hub/);
  assert.doesNotMatch(header, /main-hub/i);
  for (const file of [
    'forum/index.html',
    'book-service/index.html',
    'book-service/thank-you/index.html',
    'js/site.js',
    'functions/_lib/mesh-chrome.js',
  ]) {
    const html = src(file);
    assert.doesNotMatch(html, />MAIN HUB</, file);
    assert.doesNotMatch(html, />Main Hub</, file);
    assert.doesNotMatch(html, />MAIN-HUB</, file);
    assert.match(html, /https:\/\/unitedmobilerv\.com\//, file);
  }
  const js = src('js/site.js');
  assert.match(js, /function umrtIsHubAlias/);
  assert.match(js, /textContent = MAIN_HOME_LABEL/);
  assert.match(js, /\['Home', MAIN_HOME_HREF\]|MAIN_HOME_LABEL, MAIN_HOME_HREF/);
});

test('shop/forum/book chrome has no sticky United Mobile RV brand-text', () => {
  const header = islandHeader({ current: 'forum' });
  assert.match(header, /brand-mark/);
  assert.doesNotMatch(header, /brand-text/);
  assert.doesNotMatch(header, /United Mobile/);
  assert.match(header, /umrt-icon\.webp/);
  assert.doesNotMatch(header, /umrt-logo\.webp/);
  const surfaces = [
    'forum/index.html',
    'forum/mod/index.html',
    'forum/mod/status.html',
    'book-service/index.html',
    'book-service/thank-you/index.html',
    'functions/_lib/mesh-chrome.js',
  ];
  for (const file of surfaces) {
    const html = src(file);
    assert.doesNotMatch(html, /class="brand-text"/, file);
    assert.doesNotMatch(html, /United Mobile <span>RV/, file);
    const bar = html.includes('<header')
      ? html.match(/<header[\s\S]*?<\/header>/)[0]
      : islandHeader({ current: 'shop' });
    assert.doesNotMatch(bar, /brand-text/, file);
    assert.doesNotMatch(bar, />United Mobile/, file);
    assert.doesNotMatch(bar, /alt="United Mobile RV"/, file);
    assert.match(bar, /umrt-icon\.webp/, file);
    assert.doesNotMatch(bar, /umrt-logo\.webp/, file);
    assert.match(bar, /brand-mark/, file);
  }
  const css = src('css/site.css');
  assert.match(css, /body\.island-chrome \.site-header \.brand-text/);
  assert.match(css, /body\.book-suite \.site-header \.brand-text/);
  const js = src('js/site.js');
  assert.match(js, /umrtStripIslandBrandText/);
  assert.match(js, /islandPath/);
  assert.match(js, /umrt-icon\.webp/);
  const mothership = src('index.html').match(/<header[\s\S]*?<\/header>/)[0];
  assert.match(mothership, /brand-text/);
  assert.match(mothership, /United Mobile/);
  assert.match(mothership, /href="\/service\/">Services</);
});

test('shop lockdown allowlist is unchanged (no /forum/ or /design/ added)', () => {
  const mw = src('functions/_middleware.js');
  assert.match(mw, /const SHOP_ALLOWED_PREFIXES = \['\/shop\/', '\/api\/shop\/', '\/book-service\/', '\/api\/book', '\/css\/', '\/js\/', '\/assets\/', '\/fonts\/'\]/);
});

test('site.js stamps Call + gold Text Now + Square Book on every nav/mobile bar', () => {
  const js = src('js/site.js');
  assert.match(js, /https:\/\/united-mobile-rv-llc\.square\.site\//);
  assert.match(js, /sms:\+16166065277/);
  assert.match(js, /tel:\+16166065277/);
  assert.match(js, /Call \(616\) 606-5277/);
  assert.match(js, /MAIN_HOME_LABEL = 'Home'/);
  assert.doesNotMatch(js, /MAIN_HOME_LABEL = 'MAIN HUB'/);
  assert.match(js, /umrtIsHubAlias/);
  assert.match(js, /main\(\[\\s_-\]\*hub\)\?/);
  assert.match(js, /if \(islandSurface\)/);
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
  assert.match(js, /MAIN_SERVICES_HREF = 'https:\/\/unitedmobilerv\.com\/service\/'/);
  assert.match(js, /MAIN_SERVICES_LABEL = 'Services'/);
  assert.match(js, /\['Shop', 'https:\/\/shop\.unitedmobilerv\.com\/'\]/);
  assert.match(js, /\['Book', BOOK_PUBLIC\]/);
  assert.match(js, /MAIN_SERVICES_LABEL, MAIN_SERVICES_HREF/);
  assert.match(js, /function umrtIsChromeBookLabel/);
  assert.match(js, /function umrtStampChromeBook/);
  assert.match(js, /umrtStampChromeBook\(leftoverBookA\)/);
  assert.match(js, /leftoverServices/);
  assert.match(js, /data-platform-link'\) === 'service'/);
  assert.match(js, /\['Forum', 'https:\/\/forum\.unitedmobilerv\.com\/'\]/);
  assert.match(js, /\['Software', 'https:\/\/software\.unitedmobilerv\.com\/'\]/);
  assert.match(js, /\['Docs', 'https:\/\/docs\.unitedmobilerv\.com\/'\]/);
  assert.doesNotMatch(js, /BOOK_PUBLIC = 'https:\/\/book\.unitedmobilerv\.com\//);
  assert.doesNotMatch(js, /\['Book', 'https:\/\/book\.unitedmobilerv\.com/);
  assert.doesNotMatch(js, /PREFER_TEXT_HREF = 'tel:/);
  assert.doesNotMatch(js, /pages\.dev/);
  assert.match(js, /umrtSquareBookHref/);
  assert.match(js, /umrtStripIslandBrandText/);
});

test('mothership home + platform-bar convert stack: Text Now sms + tel + Square', () => {
  for (const file of ['index.html', 'design/platform-bar.html']) {
    const html = src(file);
    const bar = html.match(/umrt-platform-bar-inner">[\s\S]*?<\/div>/)[0];
    assert.deepEqual(productLabels(bar), PRODUCT_NAV, file);
    assert.match(html, /united-mobile-rv-llc\.square\.site/, file);
    assert.match(html, /sms:\+16166065277/, file);
    assert.match(html, /tel:\+16166065277/, file);
    assert.match(html, /Call \(616\) 606-5277/, file);
    assert.match(html, />Home</, file);
    assert.doesNotMatch(html, />MAIN HUB</, file);
    assert.doesNotMatch(html, />Main Hub</, file);
    assert.doesNotMatch(html, /status\.unitedmobilerv\.com/, file);
    assert.doesNotMatch(html, /portal\.unitedmobilerv\.com/, file);
    assert.doesNotMatch(html, FORBIDDEN, file);
    assert.doesNotMatch(html, /Prefer Text/, file);
    assert.doesNotMatch(html, /data-platform-link="book"[^>]*book\.unitedmobilerv\.com/, file);
    assert.doesNotMatch(html, /class="btn btn-ghost"[^>]*book\.unitedmobilerv\.com/, file);
    assert.match(bar, /href="https:\/\/united-mobile-rv-llc\.square\.site\/"[^>]*>Book</, file);
    assert.doesNotMatch(bar, /href="https:\/\/book\.unitedmobilerv\.com/, file);
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

test('every shop/forum/book chrome file says Home, never MAIN HUB / Main Hub, no Portal/Status', () => {
  const files = [
    'functions/_lib/mesh-chrome.js',
    'functions/_lib/book-suite.js',
    'js/site.js',
    'forum/index.html',
    'book-service/index.html',
    'book-service/thank-you/index.html',
    'index.html',
    'design/platform-bar.html',
    'functions/shop/index.js',
    'functions/shop/p/[id].js',
    'functions/shop/cart.js',
    'functions/forum/t/[id].js',
    'functions/forum/member/[id].js',
  ];
  const visibleHub = />\s*MAIN[\s_-]*HUB\s*</i;
  const visibleMainHub = />\s*Main Hub\s*</;
  for (const file of files) {
    const html = src(file);
    assert.doesNotMatch(html, visibleHub, file);
    assert.doesNotMatch(html, visibleMainHub, file);
    if (file !== 'js/site.js') {
      assert.doesNotMatch(html, /status\.unitedmobilerv\.com/, file);
      assert.doesNotMatch(html, /portal\.unitedmobilerv\.com/, file);
    }
    if (/\.html$/.test(file) || file.includes('mesh-chrome') || file === 'js/site.js') {
      assert.match(html, /https:\/\/unitedmobilerv\.com\//, file);
    }
    if (file.includes('book-suite')) {
      assert.match(html, /MAIN_HOME_HREF/, file);
      assert.match(html, /MAIN_HOME_LABEL/, file);
    }
  }
  assert.equal(MAIN_HOME_LABEL, 'Home');
  assert.equal(MAIN_HOME_HREF, 'https://unitedmobilerv.com/');
  assert.match(src('forum/index.html'), /site\.js\?v=20260920chatoff/);
  assert.match(src('functions/shop/index.js'), /site\.js\?v=20260920chatoff/);
  assert.match(src('functions/_lib/book-suite.js'), /site\.js\?v=20260920chatoff/);
});

test('shop Cart sits after Shop, after Services', () => {
  const header = islandHeader({
    current: 'shop',
    extraNavHtml: shopCartNavItem(),
    extraAfterKey: 'shop',
  });
  const labels = [...header.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)]
    .map((m) => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    .filter((label) => ['Home', 'Services', 'Shop', 'Cart', 'Book'].includes(label.split(' ')[0]));
  assert.ok(labels.indexOf('Services') < labels.indexOf('Shop'));
  assert.ok(labels.indexOf('Shop') < labels.findIndex((l) => /^Cart/.test(l)));
  assert.ok(labels.findIndex((l) => /^Cart/.test(l)) < labels.indexOf('Book'));
  assert.match(header, /href="https:\/\/unitedmobilerv\.com\/service\/"[^>]*>Services</);
});

await run();
