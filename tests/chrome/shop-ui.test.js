/**
 * Shop listing + cart/checkout chrome: brand-token CSS, no light-band
 * checkout, no radio overflow, no pages.dev customer URLs.
 * Run: node tests/chrome/shop-ui.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';
import { stockStatusMeta } from '../../functions/_lib/shop.js';
import { onRequestGet as shopListing } from '../../functions/shop/index.js';
import { onRequestGet as shopProduct } from '../../functions/shop/p/[id].js';

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

test('listing uses full wrap + shop-service-card (not cramped wrap-narrow / .service-card clash)', () => {
  const listing = src('functions/shop/index.js');
  assert.match(listing, /shop-category-band"><div class="wrap">/);
  assert.match(listing, /shop-filter-band/);
  assert.match(listing, /shop-service-card/);
  assert.match(listing, /serviceBookHref\(s, env\)/);
  assert.match(listing, /Book this service/);
  assert.match(listing, /relatedGuidesMarkup\(relatedGuidesForService/);
  assert.match(listing, /FIELD_GUIDES_HREF/);
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
  assert.match(product, /relatedGuidesMarkup\(relatedGuidesForProduct/);
});

test('unverified stock chip is Confirm on quote, not Availability Unverified', () => {
  const unverified = stockStatusMeta({ stock_status: 'unverified' });
  assert.equal(unverified.label, 'Confirm on quote');
  assert.equal(unverified.cls, 'muted');
  assert.equal(
    unverified.note,
    'Availability not yet confirmed with the supplier for this order -- confirmed as part of your quote.',
  );
  assert.doesNotMatch(unverified.label, /Availability Unverified/);
  assert.doesNotMatch(unverified.label, /In Stock/);

  const special = stockStatusMeta({ stock_status: 'special_order' });
  assert.equal(special.label, 'Special Order');
  assert.match(special.note, /confirmed as part of your quote/);

  const inStock = stockStatusMeta({ stock_status: 'in_stock' });
  assert.equal(inStock.label, 'In Stock');

  const shop = src('functions/_lib/shop.js');
  assert.match(shop, /label: 'Confirm on quote'/);
  assert.doesNotMatch(shop, /Availability Unverified/);
});

test('shop grid + product page render Confirm on quote for unverified stock', async () => {
  const product = {
    id: 'victron-smartsolar-mppt',
    sku: null,
    manufacturer: 'Victron Energy',
    model: 'SmartSolar MPPT',
    title: 'Victron SmartSolar MPPT Charge Controller',
    description: 'Solar charge controller.',
    category: 'rv-power-protection',
    product_type: 'individual',
    retail_price: 65.45,
    price_source: 'artek.energy',
    stock_status: 'unverified',
    installation_required: 1,
    compatibility: null,
    image_url: null,
  };
  const env = {
    DB: {
      prepare() {
        return {
          bind() { return this; },
          async first() { return product; },
          async all() { return { results: [product] }; },
        };
      },
    },
  };

  const grid = await shopListing({
    env,
    request: new Request('https://shop.unitedmobilerv.com/shop/'),
  });
  assert.equal(grid.status, 200);
  const gridHtml = await grid.text();
  assert.match(gridHtml, /shop-stock-chip is-muted">Confirm on quote</);
  assert.doesNotMatch(gridHtml, /Availability Unverified/);
  assert.doesNotMatch(gridHtml, /shop-stock-chip is-ok">In Stock</);

  const page = await shopProduct({
    env,
    params: { id: product.id },
    request: new Request('https://shop.unitedmobilerv.com/shop/p/victron-smartsolar-mppt'),
  });
  assert.equal(page.status, 200);
  const pageHtml = await page.text();
  assert.match(pageHtml, /shop-stock-chip is-muted">Confirm on quote</);
  assert.match(pageHtml, /Availability not yet confirmed with the supplier for this order -- confirmed as part of your quote\./);
  assert.doesNotMatch(pageHtml, /Availability Unverified/);
});

await run();
