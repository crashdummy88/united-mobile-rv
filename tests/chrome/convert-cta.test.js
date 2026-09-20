/**
 * Canon convert pair on forum + shop + index header/mobile-bar.
 * Call tel: + gold Text Now sms: + Book → book.unitedmobilerv.com.
 * Run: node tests/chrome/convert-cta.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';
import { islandHeader, islandMobileBar } from '../../functions/_lib/mesh-chrome.js';

function src(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

function chromeSlices(html) {
  const nav = html.match(/<div class="nav-cta">[\s\S]*?<\/div>/) || [];
  const bar = html.match(/<div class="mobile-bar"[\s\S]*?<\/div>/) || [];
  return `${nav[0] || ''}\n${bar[0] || ''}`;
}

function assertConvertChrome(html, file) {
  const chrome = chromeSlices(html);
  assert.ok(chrome.includes('nav-cta'), `${file}: missing nav-cta`);
  assert.ok(chrome.includes('mobile-bar'), `${file}: missing mobile-bar`);
  assert.match(chrome, /Call \(616\) 606-5277/, file);
  assert.match(chrome, /tel:\+16166065277/, file);
  assert.match(chrome, />Text Now</, file);
  assert.match(chrome, /sms:\+16166065277/, file);
  assert.match(chrome, /btn btn-gold[^>]*sms:\+16166065277|>Text Now</, file);
  assert.match(chrome, />Book</, file);
  assert.match(chrome, /book\.unitedmobilerv\.com/, file);
  assert.doesNotMatch(chrome, /Prefer Text/, file);
  assert.doesNotMatch(chrome, /BOOK ONLINE/, file);
  assert.doesNotMatch(chrome, /Book Online/, file);
  assert.doesNotMatch(chrome, /Book a Service/, file);
  assert.doesNotMatch(chrome, /Book Now/, file);
  assert.doesNotMatch(chrome, /Text \/ Call/, file);
  assert.doesNotMatch(chrome, /Call \/ Text/, file);
}

test('index header + mobile bar: Call / Text Now / Book', () => {
  assertConvertChrome(src('index.html'), 'index.html');
});

test('forum header + mobile bar: Call / Text Now / Book', () => {
  assertConvertChrome(src('forum/index.html'), 'forum/index.html');
});

test('shop island chrome: Call / Text Now / Book', () => {
  assertConvertChrome(islandHeader({ current: 'shop' }) + islandMobileBar(), 'shop mesh-chrome');
  const shop = src('functions/shop/index.js');
  assert.match(shop, /islandHeader/);
  assert.match(shop, /islandMobileBar/);
  assert.doesNotMatch(shop, /Prefer Text/);
});

test('site.js rewires in-page /book-service/ Book CTAs to book. wrap (keeps labels)', () => {
  const js = src('js/site.js');
  assert.match(js, /umrtSquareBookHref/);
  assert.match(js, /umrtHrefIsSuiteBook/);
  assert.match(js, /data-book-service/);
  assert.match(js, /book\.unitedmobilerv\.com/);
  assert.doesNotMatch(js, /addBubble\('bot'[\s\S]*href="\/book-service\/"/);
});

test('related guides tag body with shop service ids for Square intent', () => {
  const tagged = {
    'guide/generator-troubleshooting/index.html': 'generator-maintenance',
    'guide/generator-manufacturer-guide/index.html': 'generator-maintenance',
    'troubleshoot/generator-wont-start/index.html': 'generator-maintenance',
    'generator/index.html': 'generator-maintenance',
    'guide/winterization-guide/index.html': 'winterization-travel-trailer',
    'troubleshoot/winterize-fail-freeze-damage/index.html': 'winterization-travel-trailer',
    'guide/ppi-guide/index.html': 'ppi-travel-trailer',
    'ppi/index.html': 'ppi-travel-trailer',
    'guide/starlink-rv-guide/index.html': 'starlink-installation',
    'guide/weboost-install-guide/index.html': 'cellular-booster-installation',
    'guide/solar-sizing-installation-guide/index.html': 'solar-system-installation',
    'victron/index.html': 'victron-system-build',
  };
  for (const [file, id] of Object.entries(tagged)) {
    const html = src(file);
    assert.match(html, new RegExp(`data-book-service="${id}"`), file);
    assert.match(html, /<body[^>]*data-book-service=/, file);
  }
  const wpSnippet = src('content-snippets/quick-booking-cta-box.html');
  assert.match(wpSnippet, /united-mobile-rv-llc\.square\.site/);
  assert.doesNotMatch(wpSnippet, /unitedmobilerv\.com\/book-service/);
});

await run();
