-- UMRT Shop -- supplier sync columns (Artek CSV adapter, skeleton).
-- Additive only. Apply with:
--   wrangler d1 execute umrt_forum --local --file=./db/migrations/006_shop_supplier_sync.sql   (test first)
--   wrangler d1 execute umrt_forum --remote --file=./db/migrations/006_shop_supplier_sync.sql  (production)
--
-- Kept separate from retail_price/price_source (Matt's manually curated,
-- publicly-cited reference price -- commerce/sync.py never touches those)
-- and separate from `active` (the human publish flag -- sync never
-- flips it). price_status is the automated SELL/REVIEW/SUPPRESS signal
-- computed by commerce/pricing.py; a human still decides what to do
-- about a REVIEW or SUPPRESS result.

ALTER TABLE products ADD COLUMN map_price REAL;
ALTER TABLE products ADD COLUMN price_status TEXT; -- 'SELL' | 'REVIEW' | 'SUPPRESS' | NULL (never synced)
ALTER TABLE products ADD COLUMN last_synced_at TEXT;
