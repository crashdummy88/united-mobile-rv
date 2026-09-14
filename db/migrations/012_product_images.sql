-- Product photography support (2026-09-14) -- the shop had zero image
-- infrastructure: no column on `products` at all, and none of the 71 files
-- in assets/ are product photos (all brand logos or job-site photos).
--
-- image_url: direct URL to the product photo. Starting with manufacturer-
-- hosted URLs (linked, not mirrored into assets/, so there's nothing to
-- re-host or keep in sync) -- Matt's own photos can replace these per-row
-- later without a schema change.
-- image_source: the manufacturer page the image was sourced from, for
-- attribution/traceability -- same discipline as price_source.
-- Deliberately nullable and NOT backfilled by this migration: same "never
-- fabricate" rule as retail_price/cost. A product with no image_url shows
-- a text-only card, same as a product with no retail_price shows "Contact
-- for pricing" -- never a placeholder image standing in as if it were real.

ALTER TABLE products ADD COLUMN image_url TEXT;
ALTER TABLE products ADD COLUMN image_source TEXT;
