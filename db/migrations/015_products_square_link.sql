-- UMRT Shop -- links each D1 product row to its Square Catalog object,
-- so a future inventory sync can match/upsert instead of guessing by name.
-- Additive only, both columns nullable (every existing row stays valid).
--
-- NOT YET APPLIED. Apply with:
--   wrangler d1 execute umrt_forum --remote --file=./db/migrations/015_products_square_link.sql

ALTER TABLE products ADD COLUMN square_catalog_object_id TEXT;
ALTER TABLE products ADD COLUMN square_stock_synced_at TEXT;
