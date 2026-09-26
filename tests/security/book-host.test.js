/**
 * book.unitedmobilerv.com does not serve a page. Every path 301s to
 * Square. Shop lockdown and mothership /book-service/ stay as they were.
 *
 * Run: node tests/security/book-host.test.js
 */
import { test, run, assert } from '../lib/tiny-test.js';
import { onRequest as middleware } from '../../functions/_middleware.js';
import { onRequestGet as hostHome, onRequestHead as hostHead } from '../../functions/index.js';
import { onRequestGet as bookService } from '../../functions/book-service/index.js';
import { SQUARE_BOOK_URL } from '../../functions/_lib/book-suite.js';

const SQUARE = 'https://united-mobile-rv-llc.square.site/';

function makeRequest(url, extraHeaders) {
  return new Request(url, { headers: extraHeaders || {} });
}

function makeNextCapture() {
  const calls = [];
  const next = async (req) => {
    calls.push(req);
    return new Response('<html><title>Mobile RV Repair at Your Location | United Mobile RV</title></html>', {
      status: 200,
    });
  };
  return { next, calls };
}

const env = { SESSION_SECRET: 'test-session-secret', DB: {}, PORTAL_DB: {} };

test('middleware: book host / and deep paths 301 to Square', async () => {
  const { next, calls } = makeNextCapture();
  const paths = ['/', '/pricing/', '/wireless/', '/guide/', '/services/', '/sitemap.xml', '/book-service/', '/book-service', '/book-service/thank-you/', '/api/book', '/robots.txt', '/css/site.css'];
  for (const path of paths) {
    const res = await middleware({
      request: makeRequest(`https://book.unitedmobilerv.com${path}`),
      env,
      next,
    });
    assert.equal(res.status, 301, `${path} should 301`);
    assert.equal(res.headers.get('Location'), SQUARE, `${path} should land on Square`);
  }
  assert.equal(calls.length, 0);
  assert.equal(SQUARE_BOOK_URL, SQUARE);
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

test('host home: book. / GET and HEAD 301 to Square, not the homepage', async () => {
  const next = async () => {
    throw new Error('book host must not fall through to the static homepage');
  };
  const getRes = await hostHome({
    request: makeRequest('https://book.unitedmobilerv.com/'),
    env,
    next,
  });
  assert.equal(getRes.status, 301);
  assert.equal(getRes.headers.get('Location'), SQUARE);
  const headRes = await hostHead({
    request: makeRequest('https://book.unitedmobilerv.com/'),
    env,
    next,
  });
  assert.equal(headRes.status, 301);
  assert.equal(headRes.headers.get('Location'), SQUARE);
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
  assert.match(html, /Book on Square/);
  assert.match(html, new RegExp(SQUARE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(html, /<iframe/i);
  assert.doesNotMatch(html, /Mobile RV Repair at Your Location/);
  assert.match(html, /https:\/\/forum\.unitedmobilerv\.com\//);
  assert.match(html, /Text Now \(616\) 606-5277/);
  assert.match(html, /sms:\+16166065277/);
  assert.match(html, />Home</);
  assert.match(html, /href="https:\/\/unitedmobilerv\.com\/"/);
  assert.doesNotMatch(html, /unitedmobilerv\.com\/guide\//);
  assert.doesNotMatch(html, /Field guides/i);
  assert.doesNotMatch(html, />Guides</);
  assert.doesNotMatch(html, /Prefer Text/);
});

await run();
