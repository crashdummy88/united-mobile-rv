/**
 * book.unitedmobilerv.com is a booking-suite host, not a second
 * mothership. Guards:
 *   1) '/' renders the suite (Square embed wrap + Text Now), never the marketing
 *      homepage title "Mobile RV Repair at Your Location"
 *   2) mothership paths 301 to '/' (suite root)
 *   3) canonical/og:url use the request host, not pages.dev
 *   4) X-Robots-Tag stays noindex,follow
 *
 * Run: node tests/security/book-host.test.js
 */
import { test, run, assert } from '../lib/tiny-test.js';
import { onRequest as middleware } from '../../functions/_middleware.js';
import { onRequestGet as hostHome } from '../../functions/index.js';
import { onRequestGet as bookService } from '../../functions/book-service/index.js';
import { onRequestGet as bookThankYou } from '../../functions/book-service/thank-you.js';
import { SQUARE_BOOK_URL, BOOK_PHONE_DISPLAY } from '../../functions/_lib/book-suite.js';

function makeRequest(url, extraHeaders) {
  return new Request(url, { headers: extraHeaders || {} });
}

function makeNextCapture() {
  const calls = [];
  const next = async (req) => {
    calls.push(req);
    return new Response('<html><title>Mobile RV Repair at Your Location | United Mobile RV</title></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  };
  return { next, calls };
}

const env = { SESSION_SECRET: 'test-session-secret', DB: {}, PORTAL_DB: {} };

test('middleware: book host /pricing/ 301s to suite root /', async () => {
  const { next } = makeNextCapture();
  const res = await middleware({
    request: makeRequest('https://book.unitedmobilerv.com/pricing/'),
    env,
    next,
  });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('Location'), 'https://book.unitedmobilerv.com/');
});

test('middleware: book host /wireless/ and /guide/ 301 to /', async () => {
  const { next } = makeNextCapture();
  for (const path of ['/wireless/', '/guide/', '/services/', '/sitemap.xml', '/book-service/', '/book-service']) {
    const res = await middleware({
      request: makeRequest(`https://book.unitedmobilerv.com${path}`),
      env,
      next,
    });
    assert.equal(res.status, 301, `${path} should 301`);
    assert.equal(res.headers.get('Location'), 'https://book.unitedmobilerv.com/', `${path} should land on /`);
  }
});

test('middleware: book host allows suite home, thank-you, assets, /api/book', async () => {
  const { next, calls } = makeNextCapture();
  const allowed = ['/', '/favicon.png', '/robots.txt', '/book-service/thank-you/', '/api/book', '/css/site.css', '/js/site.js', '/assets/brand/umrt-logo.webp', '/fonts/inter-400.woff2'];
  for (const path of allowed) {
    const res = await middleware({
      request: makeRequest(`https://book.unitedmobilerv.com${path}`),
      env,
      next,
    });
    assert.equal(res.status, 200, `${path} should pass through, got ${res.status}`);
  }
  assert.equal(calls.length, allowed.length);
});

test('middleware: shop lockdown still 301s /pricing/ to /shop/ (unaffected)', async () => {
  const { next } = makeNextCapture();
  const res = await middleware({
    request: makeRequest('https://shop.unitedmobilerv.com/pricing/'),
    env,
    next,
  });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('Location'), 'https://shop.unitedmobilerv.com/shop/');
});

test('middleware: book host X-Robots-Tag is noindex, follow', async () => {
  const { next } = makeNextCapture();
  const res = await middleware({
    request: makeRequest('https://book.unitedmobilerv.com/'),
    env,
    next,
  });
  assert.equal(res.headers.get('X-Robots-Tag'), 'noindex, follow');
});

test('host home: book. / renders booking suite, not marketing homepage', async () => {
  const next = async () => {
    throw new Error('book host must not fall through to the static homepage');
  };
  const res = await hostHome({
    request: makeRequest('https://book.unitedmobilerv.com/'),
    env,
    next,
  });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<title>Book a Mobile RV Repair Visit \| United Mobile RV<\/title>/);
  assert.doesNotMatch(html, /Mobile RV Repair at Your Location/);
  assert.match(html, /data-square-embed="square-site"/);
  assert.match(html, /<iframe class="square-appointments-frame"/);
  assert.doesNotMatch(html, /BOOK ONLINE/);
  assert.match(html, new RegExp(SQUARE_BOOK_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(html, /Open Square in a new tab/);
  assert.match(html, /Request a service call/);
  assert.match(html, /Quoted upfront/);
  assert.match(html, /Montana · Wyoming · Idaho · Washington/);
  assert.match(html, /Straight answers/);
  assert.match(html, new RegExp(`Text Now ${BOOK_PHONE_DISPLAY.replace(/[()]/g, '\\$&')}`));
  assert.match(html, /data-book-suite="book-host"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/book\.unitedmobilerv\.com\/">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/book\.unitedmobilerv\.com\/">/);
  assert.match(html, /<meta name="robots" content="noindex, follow">/);
  assert.doesNotMatch(html, /href="\/pricing\/"/);
  assert.doesNotMatch(html, /href="\/guide\/"/);
  assert.doesNotMatch(html, /unitedmobilerv\.com\/guide\//);
  assert.doesNotMatch(html, /Field guides/i);
  assert.doesNotMatch(html, />Guides</);
  assert.doesNotMatch(html, /href="\/wireless\/"/);
  assert.match(html, /Victron Professional Certified Installer/);
  assert.match(html, /weBoost Authorized Installer/);
  assert.match(html, /Peplink Certified Associate/);
  assert.match(html, /Starlink installs \(not a Starlink-certified installer\)/);
  assert.doesNotMatch(html, /Starlink Certified/);
  assert.match(html, /MT · WY · ID · WA/);
  assert.doesNotMatch(html, /Electrical troubleshooting/);
  assert.doesNotMatch(html, /What we fix/);
  assert.doesNotMatch(html, /city-hub/);
  assert.doesNotMatch(html, /Winterization/);
  assert.doesNotMatch(html, /unitedmobilerv\.com\/victron\//);
  assert.match(html, /https:\/\/forum\.unitedmobilerv\.com\//);
  assert.match(html, /https:\/\/shop\.unitedmobilerv\.com\//);
  assert.match(html, /https:\/\/software\.unitedmobilerv\.com\//);
  assert.match(html, /https:\/\/book\.unitedmobilerv\.com\//);
  assert.match(html, /sms:\+16166065277/);
  assert.match(html, /tel:\+16166065277/);
  assert.match(html, /nav-phone[^>]+tel:\+16166065277/);
  assert.match(html, />Home</);
  assert.doesNotMatch(html, />MAIN HUB</);
  assert.match(html, /href="https:\/\/unitedmobilerv\.com\/"/);
  assert.doesNotMatch(html, /http:\/\/unitedmobilerv\.com/);
  assert.match(html, /Payment is processed securely by Square/);
  assert.doesNotMatch(html, /opens Square in a new tab/);
  assert.doesNotMatch(html, /leaves this site for Square/);
  assert.doesNotMatch(html, /Same convert pattern/);
  assert.doesNotMatch(html, /Prefer Text/);
  assert.doesNotMatch(html, /Text \/ Call/);
});

test('host home: pages.dev / still falls through (no book rewrite)', async () => {
  let fellThrough = false;
  const next = async () => {
    fellThrough = true;
    return new Response('homepage', { status: 200 });
  };
  const res = await hostHome({
    request: makeRequest('https://united-mobile-rv.pages.dev/'),
    env,
    next,
  });
  assert.equal(fellThrough, true);
  assert.equal(await res.text(), 'homepage');
});

test('/book-service/ on mothership keeps reasonable nav + request-host canonical', async () => {
  const res = await bookService({
    request: makeRequest('https://united-mobile-rv.pages.dev/book-service/'),
    env,
  });
  const html = await res.text();
  assert.match(html, /data-book-suite="mothership"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/united-mobile-rv\.pages\.dev\/book-service\/">/);
  assert.match(html, /href="\/pricing\/"/);
  assert.match(html, /data-square-embed="square-site"/);
  assert.match(html, new RegExp(SQUARE_BOOK_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(html, /Mobile RV Repair at Your Location/);
  assert.match(html, /https:\/\/forum\.unitedmobilerv\.com\//);
  assert.match(html, /Text Now \(616\) 606-5277/);
  assert.match(html, /sms:\+16166065277/);
  assert.match(html, />Home</);
  assert.doesNotMatch(html, />MAIN HUB</);
  assert.match(html, /href="https:\/\/unitedmobilerv\.com\/"/);
  assert.doesNotMatch(html, /unitedmobilerv\.com\/guide\//);
  assert.doesNotMatch(html, /Field guides/i);
  assert.doesNotMatch(html, />Guides</);
  assert.doesNotMatch(html, /Prefer Text/);
});

test('thank-you on book host uses book. canonical and mesh nav (no mothership mega-nav)', async () => {
  const res = await bookThankYou({
    request: makeRequest('https://book.unitedmobilerv.com/book-service/thank-you/'),
    env,
  });
  const html = await res.text();
  assert.match(html, /<link rel="canonical" href="https:\/\/book\.unitedmobilerv\.com\/book-service\/thank-you\/">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/book\.unitedmobilerv\.com\/book-service\/thank-you\/">/);
  assert.doesNotMatch(html, /united-mobile-rv\.pages\.dev/);
  assert.doesNotMatch(html, /href="\/pricing\/"/);
  assert.match(html, /href="\/"/);
  assert.match(html, /href="https:\/\/unitedmobilerv\.com\/"/);
  assert.match(html, />Home</);
  assert.doesNotMatch(html, />MAIN HUB</);
  assert.doesNotMatch(html, /http:\/\/unitedmobilerv\.com/);
  assert.doesNotMatch(html, /unitedmobilerv\.com\/guide\//);
  assert.doesNotMatch(html, /Field guides/i);
  assert.doesNotMatch(html, />Guides</);
  assert.match(html, /https:\/\/forum\.unitedmobilerv\.com\//);
  assert.match(html, /book\.unitedmobilerv\.com/);
  assert.match(html, /Text Now \(616\) 606-5277/);
  assert.match(html, /sms:\+16166065277/);
  assert.doesNotMatch(html, /Prefer Text/);
});

await run();
