-- UMRT Shop -- quote-model tagging (brand_slug, sku_kind, line suppliers).
-- Additive only. Apply with:
--   wrangler d1 execute umrt_forum --local --file=./db/migrations/021_shop_quote_tags.sql
--   wrangler d1 execute umrt_forum --remote --file=./db/migrations/021_shop_quote_tags.sql
--
-- Does NOT invent or change retail_price / cost / margin / active.
-- brand_slug is the filterable product-line tag (Amazon, Artek, Dometic,
-- Victron, Peplink, weBoost, plus other manufacturers already in seed).
-- supplier_id stays "who we actually buy from" -- only Artek is confirmed.
-- sku_kind tells Amazon SKUs apart from manufacturer part numbers and
-- internal UMRV catalog IDs (see SHOP-QUOTE-MODEL.md).

ALTER TABLE products ADD COLUMN brand_slug TEXT;
ALTER TABLE products ADD COLUMN sku_kind TEXT; -- 'internal' | 'manufacturer' | 'amazon'

CREATE INDEX IF NOT EXISTS idx_products_brand_slug ON products(brand_slug, active);
CREATE INDEX IF NOT EXISTS idx_products_sku_kind ON products(sku_kind);

-- Manual price-check log. Empty on purpose -- rows are filed by Matt after
-- a real lookup. Never seed dollar amounts here.
CREATE TABLE IF NOT EXISTS price_checks (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  sku TEXT NOT NULL,
  supplier_id TEXT,
  checked_at TEXT NOT NULL,
  source_ref TEXT,
  umrv_list_price REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_price_checks_sku ON price_checks(sku, checked_at DESC);

INSERT OR IGNORE INTO suppliers (id, name, api_capability, catalog_capability, fulfillment_capability, priority, active, notes) VALUES
  ('amazon', 'Amazon', 'none', 'manual', 'manual', 5, 1, 'Marketplace buy-path. No SKUs seeded. No PA-API. Manual price-check only -- record ASIN as sku_kind=amazon when a real listing is added.'),
  ('dometic', 'Dometic', 'none', 'manual', 'manual', 4, 0, 'Brand line. No UMRT fulfillment account confirmed. Do not set products.supplier_id=dometic until Matt has a real buy path.'),
  ('victron', 'Victron Energy', 'none', 'manual', 'manual', 6, 1, 'Manufacturer line. Current shop Victron SKUs are sourced via Artek (supplier_id=artek). Victron-direct account is not confirmed.'),
  ('peplink', 'Peplink', 'none', 'manual', 'manual', 3, 0, 'Brand line. No UMRT fulfillment account confirmed. Unpublished reference rows only.'),
  ('weboost', 'weBoost', 'none', 'manual', 'manual', 3, 0, 'Brand line. No UMRT fulfillment account confirmed. Unpublished reference rows only. Two rows already carry real manufacturer SKUs (RV20, 471410).');

UPDATE suppliers
   SET notes = 'Matt has a real Artek account. Artek has NO CSV and no confirmed dealer API -- pricing is a locked supply/demand grid. Check the grid by hand, then update UMRV list price. Never scrape /account, never invent a feed, never fabricate a price.',
       catalog_capability = 'manual',
       api_capability = 'none',
       fulfillment_capability = 'manual'
 WHERE id = 'artek';

-- Brand slugs from manufacturer. Victron Energy / Victron collapse to victron.
UPDATE products SET brand_slug = 'artek' WHERE manufacturer = 'Artek' AND (brand_slug IS NULL OR brand_slug = '');
UPDATE products SET brand_slug = 'epoch' WHERE manufacturer = 'Epoch' AND (brand_slug IS NULL OR brand_slug = '');
UPDATE products SET brand_slug = 'rich-solar' WHERE manufacturer = 'Rich Solar' AND (brand_slug IS NULL OR brand_slug = '');
UPDATE products SET brand_slug = 'victron' WHERE manufacturer IN ('Victron Energy', 'Victron') AND (brand_slug IS NULL OR brand_slug = '');
UPDATE products SET brand_slug = 'maxxair' WHERE manufacturer = 'Maxxair' AND (brand_slug IS NULL OR brand_slug = '');
UPDATE products SET brand_slug = 'dometic' WHERE manufacturer = 'Dometic' AND (brand_slug IS NULL OR brand_slug = '');
UPDATE products SET brand_slug = 'peplink' WHERE manufacturer = 'Peplink' AND (brand_slug IS NULL OR brand_slug = '');
UPDATE products SET brand_slug = 'weboost' WHERE manufacturer = 'weBoost' AND (brand_slug IS NULL OR brand_slug = '');
UPDATE products SET brand_slug = 'wakespeed' WHERE manufacturer = 'Wakespeed' AND (brand_slug IS NULL OR brand_slug = '');
UPDATE products SET brand_slug = 'arco' WHERE manufacturer = 'ARCO' AND (brand_slug IS NULL OR brand_slug = '');
UPDATE products SET brand_slug = 'ruuvi' WHERE manufacturer = 'Ruuvi' AND (brand_slug IS NULL OR brand_slug = '');
UPDATE products SET brand_slug = 'starlink' WHERE manufacturer = 'Starlink' AND (brand_slug IS NULL OR brand_slug = '');

-- Real manufacturer part numbers already on file (018 left these alone).
UPDATE products SET sku_kind = 'manufacturer'
 WHERE id IN ('weboost-rv20-drivereach2', 'weboost-drivex-rv')
   AND (sku_kind IS NULL OR sku_kind = '');

-- Everything else with a SKU is the internal UMRV catalog id from 018,
-- not a claim to be the manufacturer's real part number.
UPDATE products SET sku_kind = 'internal'
 WHERE sku IS NOT NULL
   AND sku != ''
   AND (sku_kind IS NULL OR sku_kind = '');
