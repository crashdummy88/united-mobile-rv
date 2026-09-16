/**
 * Canon convert pair on forum + shop + index header/mobile-bar.
 * Call tel: + gold Text Now sms: + Book → Square.
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
  assert.match(chrome, /united-mobile-rv-llc\.square\.site/, file);
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

await run();
