/**
 * Shop unique job: configure / request quote -- not cart checkout.
 * After-quote path is Square invoice + book. install handoff.
 * Artek prices stay TBD. Mesh chrome is not rewritten here.
 * Run: node tests/chrome/shop-quote-form.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';
import { onRequestGet as shopHome } from '../../functions/shop/index.js';
import { onRequestGet as shopCart } from '../../functions/shop/cart.js';
import { onRequestGet as shopProduct } from '../../functions/shop/p/[id].js';
import { formatPrice, priceNote, isArtekQuoteOnly, hasPrice } from '../../functions/_lib/shop.js';
import { QUOTE_SUCCESS_MESSAGE, BOOK_INSTALL_HREF } from '../../functions/_lib/quote-form.js';
import { onRequestPost as quotePost } from '../../functions/api/shop/quote.js';

function src(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

const ARTEK = {
  id: 'artek-alpha2pro-200',
  manufacturer: 'Artek',
  title: 'ALPHA 2 PRO 12V 200Ah LiFePO4 Battery',
  category: 'rv-batteries',
  product_type: 'individual',
  retail_price: 1199.99,
  price_source: 'should-not-display',
  stock_status: 'unverified',
  image_url: null,
};

const VICTRON = {
  id: 'victron-gxtouch50',
  manufacturer: 'Victron Energy',
  title: 'Victron GX Touch 50 System Monitor',
  category: 'rv-power-protection',
  product_type: 'individual',
  retail_price: 220.15,
  price_source: 'cited',
  stock_status: 'unverified',
  image_url: null,
};

function mockDb(products) {
  return {
    prepare(sql) {
      return {
        bind() { return this; },
        async all() { return { results: products }; },
        async first() {
          if (/FROM products WHERE id = \?/.test(sql)) return products[0] || null;
          return null;
        },
        async run() { return { success: true }; },
      };
    },
  };
}

test('Artek never shows an invented live price', () => {
  assert.equal(isArtekQuoteOnly(ARTEK), true);
  assert.equal(hasPrice(ARTEK), false);
  assert.equal(formatPrice(ARTEK), 'Price TBD -- request a quote');
  assert.match(priceNote(ARTEK), /do not publish or invent/);
  assert.equal(isArtekQuoteOnly({ id: 'artek-epoch-eco-12v', manufacturer: 'Epoch' }), true);
  assert.equal(isArtekQuoteOnly(VICTRON), false);
  assert.equal(formatPrice(VICTRON), '$220.15');
});

test('shop listing CTAs are request quote / add to quote -- not cart checkout', async () => {
  const res = await shopHome({
    env: { DB: mockDb([ARTEK, VICTRON]) },
    request: new Request('https://shop.unitedmobilerv.com/shop/'),
  });
  const html = await res.text();
  assert.match(html, /Configure the system\. Request a quote/);
  assert.match(html, /Request quote/);
  assert.match(html, /Add to quote/);
  assert.match(html, /Price TBD -- request a quote/);
  assert.match(html, /Square invoice/);
  assert.match(html, /book\.unitedmobilerv\.com/);
  assert.match(html, /Schedule installation/);
  assert.match(html, /Amazon · Artek · Dometic · Victron · Peplink · weBoost/);
  assert.match(html, /id="configure"/);
  assert.match(html, /quote-form\.js/);
  assert.doesNotMatch(html, /Add to Cart/);
  assert.doesNotMatch(html, />Your Cart</);
  assert.doesNotMatch(html, /click-pay-ship and checkout/);
  assert.doesNotMatch(html, /artek\.csv/i);
});

test('product page quote form is Square-invoice, not shop checkout', async () => {
  const res = await shopProduct({
    env: { DB: mockDb([ARTEK]) },
    params: { id: ARTEK.id },
    request: new Request('https://shop.unitedmobilerv.com/shop/p/artek-alpha2pro-200'),
  });
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /Request quote/);
  assert.match(html, /Add to quote/);
  assert.match(html, /Price TBD -- request a quote/);
  assert.match(html, /Square invoice/);
  assert.match(html, /book\.unitedmobilerv\.com/);
  assert.match(html, /Sign in with Google|same Google sign-in/i);
  assert.match(html, /forum\.unitedmobilerv\.com\/api\/auth\/google\/login/);
  assert.doesNotMatch(html, /Add to Cart/);
  assert.doesNotMatch(html, /This isn't a live checkout yet/);
});

test('quote list page is not a checkout cart', async () => {
  const html = await (await shopCart({
    request: new Request('https://shop.unitedmobilerv.com/shop/cart'),
  })).text();
  assert.match(html, /Your quote request/);
  assert.match(html, /Square invoice/);
  assert.match(html, /Request quote/);
  assert.match(html, /data-variant="cart"/);
  assert.doesNotMatch(html, /<h1>Your Cart<\/h1>/);
  assert.doesNotMatch(html, /Add to Cart/);
});

test('quote API success names Square invoice, not shop checkout', async () => {
  assert.match(QUOTE_SUCCESS_MESSAGE, /Square invoice/);
  assert.match(QUOTE_SUCCESS_MESSAGE, /not a shop checkout/);
  assert.equal(BOOK_INSTALL_HREF, 'https://book.unitedmobilerv.com/');

  const inserts = [];
  const env = {
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            if (/INSERT INTO quote_requests /.test(sql)) inserts.push(args);
            return this;
          },
          async first() { return null; },
          async run() { return { success: true }; },
        };
      },
    },
  };
  const res = await quotePost({
    env,
    request: new Request('https://shop.unitedmobilerv.com/api/shop/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.9' },
      body: JSON.stringify({
        name: 'Test Buyer',
        email: 'buyer@example.com',
        intent: 'quote',
        system_goal: 'house_power',
        notes: 'Need 3kWh',
      }),
    }),
    waitUntil() {},
  });
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.message, QUOTE_SUCCESS_MESSAGE);
  assert.equal(inserts.length, 1);
  assert.match(String(inserts[0][inserts[0].length - 1]), /request quote/);
});

test('shared quote form is the shop unique substance (not mesh chrome)', () => {
  const form = src('functions/_lib/quote-form.js');
  const returns = src('functions/_lib/auth-return.js');
  const chrome = src('functions/_lib/mesh-chrome.js');
  assert.match(form, /Request a quote/);
  assert.match(form, /Request info/);
  assert.match(form, /Square invoice/);
  assert.match(form, /BOOK_INSTALL_HREF/);
  assert.match(form, /Schedule installation/);
  assert.match(returns, /book\.unitedmobilerv\.com/);
  assert.doesNotMatch(form, />BOOK ONLINE</);
  assert.doesNotMatch(chrome, /Schedule installation/);
  assert.doesNotMatch(chrome, />Request quote</);
  assert.match(chrome, /united-mobile-rv-llc\.square\.site/);
});

await run();
