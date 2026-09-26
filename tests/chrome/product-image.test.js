/**
 * SmartSolar MPPT photo path must be single-encoded. %2520 404s.
 * Run: node tests/chrome/product-image.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';
import { productImageSrc } from '../../functions/_lib/product-image.js';

const FIXED = 'https://www.victronenergy.com/upload/products/SmartSolar%20MPPT%20100-50%20%28top%29.png';
const DOUBLED = 'https://www.victronenergy.com/upload/products/SmartSolar%2520MPPT%2520100-50%2520%2528top%2529.png';

function src(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

test('double-encoded SmartSolar path collapses to the file that exists', () => {
  assert.equal(productImageSrc(DOUBLED), FIXED);
  assert.equal(productImageSrc(FIXED), FIXED);
  assert.equal(productImageSrc('https://www.victronenergy.com/upload/products/Lynx%20distributor.png'), 'https://www.victronenergy.com/upload/products/Lynx%20distributor.png');
  assert.equal(productImageSrc(''), '');
  assert.equal(productImageSrc(null), '');
});

test('migration rewrites only the double-encoded SmartSolar row', () => {
  const sql = src('db/migrations/024_fix_double_encoded_product_image.sql');
  assert.match(sql, /SET image_url = 'https:\/\/www\.victronenergy\.com\/upload\/products\/SmartSolar%20MPPT%20100-50%20%28top%29\.png'/);
  assert.match(sql, /WHERE id = 'victron-smartsolar-mppt'/);
  assert.match(sql, /AND image_url LIKE '%2520%'/);
  const setLine = sql.split('\n').find((line) => line.startsWith('SET image_url'));
  assert.ok(setLine && !setLine.includes('%2520'));
});

test('shop card, product page, and product API emit the decoded photo src', () => {
  const listing = src('functions/shop/index.js');
  const product = src('functions/shop/p/[id].js');
  const api = src('functions/api/shop/products/[id]/index.js');
  for (const file of [listing, product, api]) {
    assert.match(file, /productImageSrc/);
  }
  assert.doesNotMatch(listing, /%2520/);
  assert.doesNotMatch(product, /%2520/);
  assert.doesNotMatch(api, /%2520/);
});

await run();
