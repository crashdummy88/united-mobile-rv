/**
 * Quote-first shop helpers + manual price-check stub.
 * Run: node tests/shop/quote-model.test.js
 */
import { execFileSync } from 'node:child_process';
import { test, run, assert } from '../lib/tiny-test.js';
import { onRequestGet as shopListing } from '../../functions/shop/index.js';
import { onRequestGet as shopProduct } from '../../functions/shop/p/[id].js';
import {
  brandSlug,
  productBrandSlug,
  hasSupplierLink,
  stockStatusMeta,
  formatPrice,
  skuKindLabel,
  LINE_BRAND_ORDER,
  QUOTE_MODEL_ONE_LINER,
  QUOTE_FORM_INTRO,
} from '../../functions/_lib/shop.js';

test('line brands are the six sources, in lock order', () => {
  assert.deepEqual(LINE_BRAND_ORDER, ['amazon', 'artek', 'dometic', 'victron', 'peplink', 'weboost']);
});

test('brandSlug collapses Victron Energy / weBoost / Rich Solar', () => {
  assert.equal(brandSlug('Victron Energy'), 'victron');
  assert.equal(brandSlug('Victron'), 'victron');
  assert.equal(brandSlug('weBoost'), 'weboost');
  assert.equal(brandSlug('Rich Solar'), 'rich-solar');
  assert.equal(brandSlug('Artek'), 'artek');
  assert.equal(productBrandSlug({ brand_slug: 'victron', manufacturer: 'Epoch' }), 'victron');
  assert.equal(productBrandSlug({ manufacturer: 'Peplink' }), 'peplink');
});

test('Availability Unverified stays honest without a supplier link', () => {
  const unknown = stockStatusMeta({ stock_status: 'unverified' });
  assert.equal(unknown.label, 'Availability Unverified');
  assert.equal(unknown.cls, 'muted');
  assert.match(unknown.note, /will not guess/i);

  const linked = stockStatusMeta({ stock_status: 'unverified', supplier_id: 'artek' });
  assert.equal(linked.label, 'Confirm at quote');
  assert.equal(linked.cls, 'warn');
  assert.doesNotMatch(linked.label, /Unverified/);
  assert.ok(hasSupplierLink({ supplier_id: 'artek' }));
  assert.ok(!hasSupplierLink({ supplier_id: '' }));
});

test('never fabricates a display price', () => {
  assert.equal(formatPrice({ retail_price: null }), 'Contact for pricing');
  assert.equal(formatPrice({}), 'Contact for pricing');
  assert.equal(formatPrice({ retail_price: 65.45 }), '$65.45');
});

test('sku_kind labels distinguish Amazon vs manufacturer vs internal', () => {
  assert.equal(skuKindLabel({ sku_kind: 'manufacturer' }), 'Manufacturer SKU');
  assert.equal(skuKindLabel({ sku_kind: 'amazon' }), 'Amazon SKU');
  assert.equal(skuKindLabel({ sku_kind: 'internal' }), 'UMRV catalog SKU');
  assert.equal(skuKindLabel({}), '');
});

test('shared copy states quote → payment → ship, not auto-checkout', () => {
  assert.match(QUOTE_MODEL_ONE_LINER, /Request a quote/i);
  assert.match(QUOTE_MODEL_ONE_LINER, /Square payment/i);
  assert.match(QUOTE_FORM_INTRO, /not a checkout/i);
  assert.match(QUOTE_FORM_INTRO, /Square invoice or payment link/i);
  assert.match(QUOTE_FORM_INTRO, /orders the shipment/i);
  assert.doesNotMatch(QUOTE_FORM_INTRO, /Buy now/i);
});

test('price-check CLI prints the standard and no invented dollar prices', () => {
  const out = execFileSync(process.execPath, ['scripts/price-check.js', 'artek'], {
    encoding: 'utf8',
    cwd: new URL('../..', import.meta.url),
  });
  assert.match(out, /SKU:/);
  assert.match(out, /Supplier:/);
  assert.match(out, /Date checked:/);
  assert.match(out, /Source URL\/ref:/);
  assert.match(out, /UMRV list price:/);
  assert.match(out, /Notes:/);
  assert.match(out, /NO CSV/);
  assert.match(out, /artek-alpha2pro-200/);
  assert.match(out, /victron-smartsolar-mppt/);
  assert.match(out, /identity only, no prices/i);
  assert.doesNotMatch(out, /\$\d/);
  assert.doesNotMatch(out, /1199/);
  assert.match(out, /Do not scrape/);
});

function mockDb(rows) {
  return {
    prepare() {
      return {
        bind() { return this; },
        async all() { return { results: rows }; },
        async first() { return rows[0] || null; },
      };
    },
  };
}

const SEED_ROWS = [
  {
    id: 'victron-smartsolar-mppt', sku: 'VICTRON-SMARTSOLAR-MPPT', sku_kind: 'internal',
    manufacturer: 'Victron Energy', title: 'Victron SmartSolar MPPT Charge Controller',
    description: 'MPPT', category: 'rv-power-protection', product_type: 'individual',
    retail_price: 65.45, price_source: 'artek.energy public price', stock_status: 'unverified',
    installation_required: 1, image_url: null, supplier_id: 'artek', brand_slug: 'victron',
  },
  {
    id: 'dometic-rtx2000', sku: 'DOMETIC-RTX2000', sku_kind: 'internal',
    manufacturer: 'Dometic', title: 'Dometic RTX 2000 Head Unit (12V DC)',
    description: 'AC', category: 'rv-climate', product_type: 'individual',
    retail_price: 2399.99, price_source: 'street price', stock_status: 'unverified',
    installation_required: 1, image_url: null, supplier_id: null, brand_slug: 'dometic',
  },
];

test('listing filters by brand and quiets Availability Unverified when supplier-linked', async () => {
  const all = await shopListing({
    env: { DB: mockDb(SEED_ROWS) },
    request: new Request('https://shop.unitedmobilerv.com/shop/'),
  });
  const allHtml = await all.text();
  assert.match(allHtml, /Confirm at quote/);
  assert.match(allHtml, /Availability Unverified/);
  assert.match(allHtml, /Add to quote/);
  assert.match(allHtml, /brand=victron/);
  assert.match(allHtml, /Request a quote|Square payment/);
  assert.doesNotMatch(allHtml, /Buy now/i);

  const victron = await shopListing({
    env: { DB: mockDb(SEED_ROWS) },
    request: new Request('https://shop.unitedmobilerv.com/shop/?brand=victron'),
  });
  const victronHtml = await victron.text();
  assert.match(victronHtml, /SmartSolar/);
  assert.doesNotMatch(victronHtml, /RTX 2000/);
  assert.match(victronHtml, /Confirm at quote/);
  assert.doesNotMatch(victronHtml, /Availability Unverified/);
});

test('product page shows sourced-via + request info when supplier-linked', async () => {
  const res = await shopProduct({
    env: { DB: mockDb([SEED_ROWS[0]]) },
    params: { id: 'victron-smartsolar-mppt' },
    request: new Request('https://shop.unitedmobilerv.com/shop/p/victron-smartsolar-mppt'),
  });
  const html = await res.text();
  assert.match(html, /Confirm at quote/);
  assert.match(html, /Sourced via Artek Energy/);
  assert.match(html, /UMRV catalog SKU: VICTRON-SMARTSOLAR-MPPT/);
  assert.match(html, /Request info/);
  assert.match(html, /arrange payment/i);
  assert.doesNotMatch(html, /Add to Cart/);
  assert.doesNotMatch(html, /Field guides/i);
});

test('price-check amazon lists no invented SKUs', () => {
  const out = execFileSync(process.execPath, ['scripts/price-check.js', 'amazon'], {
    encoding: 'utf8',
    cwd: new URL('../..', import.meta.url),
  });
  assert.match(out, /Do not invent SKUs or prices/);
  assert.doesNotMatch(out, /B0[A-Z0-9]{8}/);
});

await run();
