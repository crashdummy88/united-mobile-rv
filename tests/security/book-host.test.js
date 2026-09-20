/**
 * book.unitedmobilerv.com is a booking-suite host, not a second
 * mothership. Guards:
 *   1) '/' renders the suite (Square + Text Now), never the marketing
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
import {
  SQUARE_BOOK_URL,
  BOOK_PHONE_DISPLAY,
  squareEmbedSrc,
  SHOP_PUBLIC_HREF,
  GOOGLE_LOGIN_HREF,
} from '../../functions/_lib/book-suite.js';
import { postLoginPath } from '../../functions/_lib/sso.js';
import { SQUARE_APPOINTMENTS_HREF } from '../../functions/_lib/mesh-chrome.js';

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

test('middleware: book host allows suite home, thank-you, assets, /api/book, shared Google SSO', async () => {
  const { next, calls } = makeNextCapture();
  const allowed = [
    '/', '/favicon.png', '/robots.txt', '/book-service/thank-you/', '/api/book',
    '/api/auth/google/login', '/api/auth/google/callback', '/api/me', '/api/logout',
    '/css/site.css', '/js/site.js', '/assets/brand/umrt-logo.webp', '/fonts/inter-400.woff2',
  ];
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

test('middleware: shop host allows shared Google SSO paths (not a catalog hop)', async () => {
  const { next, calls } = makeNextCapture();
  for (const path of ['/api/auth/google/login', '/api/auth/google/callback', '/api/me', '/api/logout']) {
    const res = await middleware({
      request: makeRequest(`https://shop.unitedmobilerv.com${path}`),
      env,
      next,
    });
    assert.equal(res.status, 200, `shop ${path} should pass through, got ${res.status}`);
  }
  assert.equal(calls.length, 4);
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
  assert.match(html, /BOOK ONLINE/);
  assert.match(html, /href="#square-booking"/);
  assert.match(html, /<iframe class="square-embed-frame"/);
  assert.match(html, /data-square-embed="appointment"/);
  assert.match(html, new RegExp(`src="${SQUARE_BOOK_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
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
  assert.match(html, /Starlink installs only/);
  assert.doesNotMatch(html, /Starlink Certified/);
  assert.match(html, /Services honesty/);
  assert.match(html, /Active MT · WY · ID · WA/);
  assert.match(html, /How booking works/);
  assert.match(html, /You stay on book\.unitedmobilerv\.com/);
  assert.match(html, /Square processes/);
  assert.match(html, /service booking only/i);
  assert.match(html, /href="https:\/\/shop\.unitedmobilerv\.com\/"/);
  assert.match(html, />Shop parts</);
  assert.doesNotMatch(html, /Add to Cart/);
  assert.doesNotMatch(html, /shop-card/);
  assert.match(html, /data-book-sso="shared-google"/);
  assert.match(html, /href="\/api\/auth\/google\/login"/);
  assert.match(html, />Sign in with Google</);
  assert.match(html, /https:\/\/forum\.unitedmobilerv\.com\//);
  assert.match(html, /https:\/\/shop\.unitedmobilerv\.com\//);
  assert.match(html, /https:\/\/software\.unitedmobilerv\.com\//);
  assert.match(html, /sms:\+16166065277/);
  assert.match(html, /tel:\+16166065277/);
  assert.match(html, /nav-phone[^>]+tel:\+16166065277/);
  assert.match(html, />MAIN HUB</);
  assert.match(html, /href="https:\/\/unitedmobilerv\.com\/"/);
  assert.doesNotMatch(html, /http:\/\/unitedmobilerv\.com/);
  assert.doesNotMatch(html, /opens Square in a new tab/);
  assert.doesNotMatch(html, /leaves this site for Square/);
  assert.doesNotMatch(html, /Prefer Text/);
  assert.doesNotMatch(html, /Text \/ Call/);
  assert.doesNotMatch(html, /status\.unitedmobilerv\.com/);
  assert.doesNotMatch(html, /portal\.unitedmobilerv\.com/);
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
  assert.match(html, /BOOK ONLINE/);
  assert.match(html, /<iframe class="square-embed-frame"/);
  assert.match(html, new RegExp(SQUARE_BOOK_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(html, /href="https:\/\/shop\.unitedmobilerv\.com\/"/);
  assert.match(html, /href="\/api\/auth\/google\/login"/);
  assert.doesNotMatch(html, /Mobile RV Repair at Your Location/);
  assert.match(html, /https:\/\/forum\.unitedmobilerv\.com\//);
  assert.match(html, /Text Now \(616\) 606-5277/);
  assert.match(html, /sms:\+16166065277/);
  assert.match(html, />MAIN HUB</);
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
  assert.match(html, />MAIN HUB</);
  assert.doesNotMatch(html, /http:\/\/unitedmobilerv\.com/);
  assert.doesNotMatch(html, /unitedmobilerv\.com\/guide\//);
  assert.doesNotMatch(html, /Field guides/i);
  assert.doesNotMatch(html, />Guides</);
  assert.match(html, /https:\/\/forum\.unitedmobilerv\.com\//);
  assert.match(html, /united-mobile-rv-llc\.square\.site/);
  assert.match(html, /Text Now \(616\) 606-5277/);
  assert.match(html, /sms:\+16166065277/);
  assert.doesNotMatch(html, /Prefer Text/);
});

test('squareEmbedSrc: default homepage, env override, reject non-Square', () => {
  assert.equal(squareEmbedSrc(), SQUARE_BOOK_URL);
  assert.equal(squareEmbedSrc({}), SQUARE_BOOK_URL);
  assert.equal(squareEmbedSrc({ SQUARE_EMBED_URL: SQUARE_APPOINTMENTS_HREF }), SQUARE_APPOINTMENTS_HREF);
  assert.equal(squareEmbedSrc({ SQUARE_BOOKING_URL: SQUARE_APPOINTMENTS_HREF }), SQUARE_APPOINTMENTS_HREF);
  assert.equal(
    squareEmbedSrc({
      SQUARE_EMBED_URL: SQUARE_APPOINTMENTS_HREF,
      SQUARE_BOOKING_URL: SQUARE_BOOK_URL,
    }),
    SQUARE_APPOINTMENTS_HREF,
  );
  assert.equal(squareEmbedSrc({ SQUARE_EMBED_URL: 'https://evil.example/phish' }), SQUARE_BOOK_URL);
  assert.equal(squareEmbedSrc({ SQUARE_BOOKING_URL: 'https://book.unitedmobilerv.com/' }), SQUARE_BOOK_URL);
  assert.equal(SHOP_PUBLIC_HREF, 'https://shop.unitedmobilerv.com/');
  assert.equal(GOOGLE_LOGIN_HREF, '/api/auth/google/login');
});

test('host home: SQUARE_EMBED_URL wins as iframe src on book.', async () => {
  const next = async () => {
    throw new Error('book host must not fall through to the static homepage');
  };
  const res = await hostHome({
    request: makeRequest('https://book.unitedmobilerv.com/'),
    env: { ...env, SQUARE_EMBED_URL: SQUARE_APPOINTMENTS_HREF },
    next,
  });
  const html = await res.text();
  assert.match(html, /data-square-embed-src="https:\/\/united-mobile-rv-llc\.square\.site\/s\/appointments"/);
  assert.match(html, /src="https:\/\/united-mobile-rv-llc\.square\.site\/s\/appointments"/);
});

test('postLoginPath: book. and shop. stay on host; forum default', () => {
  assert.equal(postLoginPath('book.unitedmobilerv.com'), '/');
  assert.equal(postLoginPath('shop.unitedmobilerv.com'), '/shop/');
  assert.equal(postLoginPath('forum.unitedmobilerv.com'), '/forum/');
  assert.equal(postLoginPath('united-mobile-rv.pages.dev'), '/forum/');
});

await run();
