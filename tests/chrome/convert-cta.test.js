/**
 * Canon convert pair on forum + shop + index header/mobile-bar.
 * Call tel: + gold Text Now sms: + Book → Square.
 * Mobile bar is a quiet text row: Call · Text Now · Book · Join the Free Forum.
 * Run: node tests/chrome/convert-cta.test.js
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
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

function assertForumJoinOnMobileBar(html, file) {
  const bar = (html.match(/<div class="mobile-bar"[\s\S]*?<\/div>/) || [])[0] || '';
  assert.ok(bar, `${file}: missing mobile-bar`);
  const labels = [...bar.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)]
    .map((m) => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  assert.deepEqual(
    labels,
    ['Call', 'Text Now', 'Book', 'Join the Free Forum'],
    `${file}: mobile bar order`,
  );
  assert.match(bar, /href="tel:\+16166065277" aria-label="Call \(616\) 606-5277">Call</, file);
  assert.match(bar, /class="mobile-text-now" href="sms:\+16166065277">Text Now</, file);
  assert.match(
    bar,
    /href="https:\/\/united-mobile-rv-llc\.square\.site\/" target="_blank" rel="noopener">Book</,
    file,
  );
  assert.match(
    bar,
    /href="https:\/\/forum\.unitedmobilerv\.com\/">Join the Free Forum</,
    file,
  );
  assert.doesNotMatch(bar, /btn-gold|btn-ghost|class="btn/, `${file}: mobile bar is text, not pills`);
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
  assert.match(chrome, /united-mobile-rv-llc\.square\.site/, file);
  const bookHrefs = [...chrome.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)]
    .filter((m) => /^Book$/i.test(m[2].replace(/<[^>]+>/g, '').trim()))
    .map((m) => (m[1].match(/href="([^"]*)"/) || [])[1]);
  assert.ok(bookHrefs.length > 0, `${file}: missing Book href`);
  for (const href of bookHrefs) {
    assert.equal(href, 'https://united-mobile-rv-llc.square.site/', `${file}: Book href must be Square`);
    assert.doesNotMatch(href, /book\.unitedmobilerv\.com/, `${file}: Book href must not be book.*`);
  }
  assert.doesNotMatch(chrome, /href="https:\/\/book\.unitedmobilerv\.com/, file);
  assert.doesNotMatch(chrome, /Prefer Text/, file);
  assert.doesNotMatch(chrome, /BOOK ONLINE/, file);
  assert.doesNotMatch(chrome, /Book Online/, file);
  assert.doesNotMatch(chrome, /Book a Service/, file);
  assert.doesNotMatch(chrome, /Book Now/, file);
  assert.doesNotMatch(chrome, /Text \/ Call/, file);
  assert.doesNotMatch(chrome, /Call \/ Text/, file);
  assertForumJoinOnMobileBar(html, file);
}

test('index header + mobile bar: Call / Text Now / Book / Join the Free Forum', () => {
  assertConvertChrome(src('index.html'), 'index.html');
});

test('forum header + mobile bar: Call / Text Now / Book / Join the Free Forum', () => {
  assertConvertChrome(src('forum/index.html'), 'forum/index.html');
});

test('book suite static mobile bar: Call / Text Now / Book / Join the Free Forum', () => {
  assertForumJoinOnMobileBar(src('book-service/index.html'), 'book-service/index.html');
  assertForumJoinOnMobileBar(src('book-service/thank-you/index.html'), 'book-service/thank-you/index.html');
});

test('every static mobile-bar includes Join the Free Forum after Book', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const htmlFiles = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === '.git' || name === 'wp-backup') continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.html')) htmlFiles.push(p);
    }
  })(root);
  let seen = 0;
  for (const file of htmlFiles) {
    const html = readFileSync(file, 'utf8');
    if (!html.includes('class="mobile-bar"')) continue;
    seen += 1;
    assertForumJoinOnMobileBar(html, file);
  }
  assert.ok(seen >= 3, 'expected static mobile bars on shop/forum/book surfaces');
});

test('mobile bar CSS is a quiet evenly spaced text row', () => {
  const css = src('css/site.css');
  const block = css.match(/\/\* Sticky mobile bar[\s\S]*?body \{ padding-bottom: calc\(48px \+ env\(safe-area-inset-bottom\)\); \}\n\}/);
  assert.ok(block, 'missing sticky mobile bar CSS');
  assert.match(block[0], /justify-content:\s*space-evenly/);
  assert.match(block[0], /padding-block:\s*14px/);
  assert.match(block[0], /line-height:\s*16px/);
  assert.match(block[0], /\.mobile-text-now/);
  assert.match(block[0], /box-shadow:\s*none/);
  assert.doesNotMatch(block[0], /min-height:\s*44px/);
  assert.doesNotMatch(block[0], /background:\s*var\(--gold\)/);
});

test('shop island chrome: Call / Text Now / Book / Join the Free Forum', () => {
  assertConvertChrome(islandHeader({ current: 'shop' }) + islandMobileBar(), 'shop mesh-chrome');
  const shop = src('functions/shop/index.js');
  assert.match(shop, /islandHeader/);
  assert.match(shop, /islandMobileBar/);
  assert.doesNotMatch(shop, /Prefer Text/);
});

test('site.js rewires in-page /book-service/ Book CTAs to Square (keeps labels)', () => {
  const js = src('js/site.js');
  assert.match(js, /umrtSquareBookHref/);
  assert.match(js, /umrtHrefIsSuiteBook/);
  assert.match(js, /data-book-service/);
  assert.match(js, /united-mobile-rv-llc\.square\.site/);
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
