/**
 * Shop listing + cart/checkout chrome: brand-token CSS, no light-band
 * checkout, no radio overflow, no pages.dev customer URLs.
 * Run: node tests/chrome/shop-ui.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';

function src(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

const shopPages = [
  'functions/shop/index.js',
  'functions/shop/p/[id].js',
  'functions/shop/cart.js',
];

test('shop pages load shared /css/shop.css after site.css (no per-page style dump)', () => {
  for (const file of shopPages) {
    const html = src(file);
    assert.match(html, /href="\/css\/site\.css"/, file);
    assert.match(html, /href="\/css\/shop\.css"/, file);
    assert.doesNotMatch(html, /<style>/, file);
    assert.doesNotMatch(html, /pages\.dev/, file);
  }
});

test('cart quote form stays on the dark theme (no band-gray light wash)', () => {
  const cart = src('functions/shop/cart.js');
  assert.doesNotMatch(cart, /band-gray/);
  assert.match(cart, /shop-checkout-panel/);
  assert.match(cart, /shop-checkout-band/);
  assert.match(cart, /shop-cart-band/);
  assert.match(cart, /Call or text \(616\) 606-5277/);
  assert.match(cart, /service-tier-text/);
});

test('cart is a short quote worksheet — no educational essay blocks', () => {
  const cart = src('functions/shop/cart.js');
  assert.doesNotMatch(cart, /island-substance\.js/);
  assert.doesNotMatch(cart, /quoteFirstSection/);
  assert.doesNotMatch(cart, /shopQuoteNeedsSection/);
  assert.doesNotMatch(cart, /Quote first/);
  assert.doesNotMatch(cart, /What we need/);
  assert.doesNotMatch(cart, /Daily watt-hours/);
  assert.doesNotMatch(cart, /Pedestal and shore/);
  assert.doesNotMatch(cart, /Systems we specify/);
  assert.match(cart, /quote worksheet, not live checkout/);
  assert.match(cart, /we arrange payment after we confirm/);
  const itemsIdx = cart.indexOf('id="cart-items"');
  const formIdx = cart.indexOf('id="quote-form"');
  assert.ok(itemsIdx > 0 && formIdx > itemsIdx, 'quote form must follow cart line items');
  const between = cart.slice(itemsIdx, formIdx);
  assert.doesNotMatch(between, /quoteFirstSection|shopQuoteNeedsSection|class="band"/);
});

test('listing uses full wrap + shop-service-card (not cramped wrap-narrow / .service-card clash)', () => {
  const listing = src('functions/shop/index.js');
  assert.match(listing, /shop-category-band"><div class="wrap">/);
  assert.match(listing, /shop-filter-band/);
  assert.match(listing, /shop-service-card/);
  assert.match(listing, /serviceBookHref\(s, env\)/);
  assert.match(listing, /Book this service/);
  assert.match(listing, /relatedGuidesMarkup\(relatedGuidesForService/);
  assert.doesNotMatch(listing, /FIELD_GUIDES_HREF/);
  assert.doesNotMatch(listing, /Field guides/i);
  assert.doesNotMatch(listing, /class="shop-card service-card"/);
  assert.doesNotMatch(listing, /shop-category-band"><div class="wrap wrap-narrow">/);
});

test('shop.css uses site tokens and pins radio inputs so they cannot go full-width', () => {
  const css = src('css/shop.css');
  assert.match(css, /var\(--gold\)/);
  assert.match(css, /var\(--black\)/);
  assert.match(css, /var\(--rule\)/);
  assert.doesNotMatch(css, /#E8B84B/);
  assert.match(css, /label\.service-tier input\[type="radio"\]/);
  assert.match(css, /input\[type="radio"\]/);
  assert.match(css, /max-width:\s*18px/);
  assert.match(css, /flex:\s*0 0 18px/);
  assert.match(css, /minmax\(min\(100%, 300px\), 1fr\)/);
  assert.match(css, /overflow-x:\s*clip/);
  assert.match(css, /\.nav-links \{ gap: 14px/);
  assert.match(css, /\.shop-checkout-panel/);
  assert.match(css, /grid-template-columns:\s*56px minmax\(0, 1fr\)/);
  assert.match(css, /\.shop-card-imgwrap \{[\s\S]*background:\s*var\(--white\)/);
  assert.match(css, /\.service-tier:has\(input:checked\)/);
  assert.match(css, /inset 4px 0 0 var\(--gold\)/);
  assert.match(css, /\.qf-label \{[\s\S]*color:\s*rgba\(255, 255, 255, 0\.82\)/);
});

test('shop lockdown still allows /css/ so shop.css is reachable on shop host', () => {
  const mw = src('functions/_middleware.js');
  assert.match(mw, /const SHOP_ALLOWED_PREFIXES = \['\/shop\/', '\/api\/shop\/', '\/book-service\/', '\/api\/book', '\/css\/', '\/js\/', '\/assets\/', '\/fonts\/'\]/);
});

test('product quote form shares the same checkout panel + convert fallback', () => {
  const product = src('functions/shop/p/[id].js');
  assert.match(product, /shop-checkout-panel/);
  assert.match(product, /\(616\) 606-5277/);
  assert.match(product, /BOOK_PUBLIC_HREF|islandHeader|islandMobileBar/);
  assert.doesNotMatch(product, /relatedGuidesMarkup/);
  assert.doesNotMatch(product, /relatedGuidesForProduct/);
  assert.doesNotMatch(product, /field-guides\.js/);
});

await run();
