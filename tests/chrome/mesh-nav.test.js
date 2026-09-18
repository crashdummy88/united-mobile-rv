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
  MAIN_HUB_LABEL,
  islandHeader,
  islandFooter,
  islandMobileBar,
} from '../../functions/_lib/mesh-chrome.js';

const REQUIRED = ['Main Hub', 'Forum', 'Software', 'Status', 'Portal', 'Shop', 'Docs'];
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

test('Text Now is sms:+16166065277; number is tel:+16166065277', () => {
  assert.equal(TEXT_NOW_HREF, 'sms:+16166065277');
  assert.equal(TEXT_NOW_LABEL, 'Text Now (616) 606-5277');
  assert.equal(TEXT_NOW_COMPACT, 'Text Now');
  assert.equal(CALL_HREF, 'tel:+16166065277');
  assert.equal(CALL_LABEL, 'Call (616) 606-5277');
});

test('mesh helper lists Main Hub/Forum/Software/Status/Portal/Shop/Docs as absolute hosts', () => {
  const labels = MESH_LINKS.map((l) => l.label);
  for (const name of REQUIRED) assert.ok(labels.includes(name), `missing ${name}`);
  assert.equal(MAIN_HUB_LABEL, 'Main Hub');
  assert.ok(!labels.includes('Main'), 'bare Main label should be Main Hub');
  assert.ok(!labels.includes('Guides'), 'Guides stay on WP apex, not MESH');
  assert.ok(!labels.includes('Field Guides'), 'Field Guides stay on WP apex, not MESH');
  const header = islandHeader({ current: 'shop' });
  const footer = islandFooter({ current: 'shop' });
  const mobile = islandMobileBar();
  for (const html of [header, footer]) {
    assert.match(html, />Main Hub</);
    assert.doesNotMatch(html, />Main</);
    assert.doesNotMatch(html, /unitedmobilerv\.com\/guide\//);
    assert.doesNotMatch(html, />Guides</);
    assert.doesNotMatch(html, /Field Guides/i);
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
  assert.match(forum, />Main Hub</);
  assert.doesNotMatch(forum, />Main</);
  assert.doesNotMatch(forum, /unitedmobilerv\.com\/guide\//);
  assert.doesNotMatch(forum, />Guides</);
  assert.match(forum, /https:\/\/forum\.unitedmobilerv\.com\//);
  assert.match(forum, /https:\/\/software\.unitedmobilerv\.com\//);
  assert.match(forum, /https:\/\/status\.unitedmobilerv\.com\//);
  assert.match(forum, /https:\/\/portal\.unitedmobilerv\.com\//);
  assert.match(forum, /https:\/\/shop\.unitedmobilerv\.com\//);
  assert.match(forum, /https:\/\/docs\.unitedmobilerv\.com\//);
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

test('nav labels stay one line so Main Hub does not stack', () => {
  const css = src('css/site.css');
  assert.match(css, /\.nav-links a \{[\s\S]*white-space:\s*nowrap/);
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
  assert.match(js, /navCtaHtml/);
  assert.match(js, /mobileBarHtml/);
  assert.match(js, /umrt-platform-bar/);
  assert.match(js, /\['Main Hub', 'https:\/\/unitedmobilerv\.com\/'\]/);
  assert.doesNotMatch(js, /\['Guides'/);
  assert.doesNotMatch(js, /unitedmobilerv\.com\/guide\//);
  assert.doesNotMatch(js, /textContent = 'Main';/);
  assert.doesNotMatch(js, /BOOK_PUBLIC = 'https:\/\/book\.unitedmobilerv\.com\//);
  assert.doesNotMatch(js, /PREFER_TEXT_HREF = 'tel:/);
  assert.doesNotMatch(js, /pages\.dev/);
});

test('mothership home + platform-bar convert stack: Text Now sms + tel + Square', () => {
  for (const file of ['index.html', 'design/platform-bar.html']) {
    const html = src(file);
    assert.match(html, /united-mobile-rv-llc\.square\.site/, file);
    assert.match(html, /sms:\+16166065277/, file);
    assert.match(html, /tel:\+16166065277/, file);
    assert.match(html, /Call \(616\) 606-5277/, file);
    assert.doesNotMatch(html, /Prefer Text/, file);
    assert.doesNotMatch(html, /data-platform-link="book"[^>]*book\.unitedmobilerv\.com/, file);
    assert.doesNotMatch(html, /class="btn btn-ghost"[^>]*book\.unitedmobilerv\.com/, file);
    assert.match(html, /data-platform-link="hub">Main Hub</, file);
  }
});

await run();
