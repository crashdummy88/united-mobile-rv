/**
 * Shared ecosystem chrome: one product, custom-domain destinations.
 * Guards:
 *   1) platform bar/footer list Portal, Software, Status, Docs, Forum, Shop, Book
 *   2) Book CTAs go to book.unitedmobilerv.com (not /book-service/ or /go/book)
 *   3) shop island has outbound platform links
 *   4) book. host stays a booking-only suite (no platform strip)
 *   5) leftover /go/book hops to the suite
 *   6) credential honesty: Victron / weBoost / Peplink exact; Starlink never Certified
 *
 * Run: node tests/security/platform-chrome.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';
import {
  BOOK_SUITE_URL,
  PORTAL_URL,
  SOFTWARE_URL,
  STATUS_URL,
  DOCS_URL,
  FORUM_URL,
  SHOP_URL,
  PREFER_TEXT_HREF,
  PREFER_TEXT_LABEL,
  platformBarHtml,
  platformFooterColHtml,
  shopFooterHtml,
} from '../../functions/_lib/platform-chrome.js';
import { onRequestGet as shopIndex } from '../../functions/shop/index.js';
import { onRequestGet as bookService } from '../../functions/book-service/index.js';
import { onRequestGet as hostHome } from '../../functions/index.js';

const REQUIRED_HREFS = [PORTAL_URL, SOFTWARE_URL, STATUS_URL, DOCS_URL, FORUM_URL, SHOP_URL, BOOK_SUITE_URL];

test('platform bar lists every hub + Prefer Text + Book suite', () => {
  const html = platformBarHtml('shop');
  for (const href of REQUIRED_HREFS) {
    assert.match(html, new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(html, /data-platform-link="shop"[^>]*aria-current="page"/);
  assert.match(html, new RegExp(PREFER_TEXT_HREF.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(html, /Prefer Text \(616\) 606-5277/);
  assert.doesNotMatch(html, /\/go\/book/);
  assert.doesNotMatch(html, /pages\.dev/);
  assert.doesNotMatch(html, /href="\/book-service\/"/);
});

test('platform footer column is custom-domain only', () => {
  const html = platformFooterColHtml();
  for (const href of REQUIRED_HREFS) {
    assert.match(html, new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.doesNotMatch(html, /\/go\/book/);
  assert.doesNotMatch(html, /pages\.dev/);
});

test('shop homepage chrome: platform strip, Book suite, Prefer Text, credentials', async () => {
  const res = await shopIndex({
    request: new Request('https://shop.unitedmobilerv.com/shop/'),
    env: { DB: null },
  });
  const html = await res.text();
  for (const href of REQUIRED_HREFS) {
    assert.match(html, new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `shop missing ${href}`);
  }
  assert.match(html, /umrt-platform-bar/);
  assert.match(html, new RegExp(PREFER_TEXT_LABEL.replace(/[()]/g, '\\$&')));
  assert.match(html, /Victron Professional Certified Installer/);
  assert.match(html, /weBoost Authorized Installer/);
  assert.match(html, /Peplink Certified Associate/);
  assert.match(html, /Starlink installs \(not a Starlink-certified installer\)/);
  assert.doesNotMatch(html, /Starlink Certified/);
  assert.doesNotMatch(html, /href="\/book-service\/"/);
  assert.doesNotMatch(html, /\/go\/book/);
  assert.doesNotMatch(html, /united-mobile-rv\.pages\.dev/);
});

test('mothership /book-service/ gets platform bar; book. host does not', async () => {
  const mothership = await bookService({
    request: new Request('https://united-mobile-rv.pages.dev/book-service/'),
    env: {},
  });
  const mothershipHtml = await mothership.text();
  assert.match(mothershipHtml, /umrt-platform-bar/);
  assert.match(mothershipHtml, /https:\/\/book\.unitedmobilerv\.com\//);
  assert.match(mothershipHtml, /Prefer Text \(616\) 606-5277/);

  const bookHost = await hostHome({
    request: new Request('https://book.unitedmobilerv.com/'),
    env: {},
    next: async () => { throw new Error('book host must not fall through'); },
  });
  const bookHtml = await bookHost.text();
  assert.doesNotMatch(bookHtml, /umrt-platform-bar/);
  assert.match(bookHtml, /BOOK ONLINE/);
  assert.match(bookHtml, /Victron Professional Certified Installer/);
  assert.doesNotMatch(bookHtml, /Starlink Certified/);
});

test('shared partial + /go/book leftover hop to the suite', () => {
  const partial = readFileSync(new URL('../../design/platform-bar.html', import.meta.url), 'utf8');
  assert.match(partial, /https:\/\/book\.unitedmobilerv\.com\//);
  assert.match(partial, /https:\/\/portal\.unitedmobilerv\.com\//);
  assert.match(partial, /https:\/\/status\.unitedmobilerv\.com\//);
  assert.match(partial, /https:\/\/docs\.unitedmobilerv\.com\//);
  assert.doesNotMatch(partial, /href=["'][^"']*\/go\/book/);
  assert.doesNotMatch(partial, /href=["'][^"']*pages\.dev/);

  const redirects = readFileSync(new URL('../../_redirects', import.meta.url), 'utf8');
  assert.match(redirects, /\/go\/book\s+https:\/\/book\.unitedmobilerv\.com\/\s+302/);
  assert.match(redirects, /\/go\/book\/\s+https:\/\/book\.unitedmobilerv\.com\/\s+302/);
  assert.doesNotMatch(redirects, /\/go\/book\s+https:\/\/united-mobile-rv-llc\.square\.site\//);

  const forumShare = readFileSync(new URL('../../forum/features.js', import.meta.url), 'utf8');
  assert.match(forumShare, /https:\/\/forum\.unitedmobilerv\.com\/forum\/t\//);
  assert.doesNotMatch(forumShare, /united-mobile-rv\.pages\.dev/);

  const goText = readFileSync(new URL('../../go/text/index.html', import.meta.url), 'utf8');
  assert.match(goText, /https:\/\/book\.unitedmobilerv\.com\//);
  assert.doesNotMatch(goText, /href=["'][^"']*\/go\/book/);

  const shopFooter = shopFooterHtml();
  assert.match(shopFooter, /https:\/\/forum\.unitedmobilerv\.com\//);
  assert.match(shopFooter, /https:\/\/software\.unitedmobilerv\.com\//);
  assert.match(shopFooter, /https:\/\/portal\.unitedmobilerv\.com\//);
  assert.match(shopFooter, /https:\/\/status\.unitedmobilerv\.com\//);
});

await run();
