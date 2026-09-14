-- UMRT Shop -- Phase 3: draft Square Order+Invoice per quote request,
-- mirroring the pattern already shipped for bookings (jobs.square_* in
-- PORTAL_DB, see functions/_lib/square.js and functions/api/book.js).
-- Additive only. Apply with:
--   wrangler d1 execute umrt_forum --remote --file=./db/migrations/007_shop_quote_square.sql
--
-- These stay NULL until SQUARE_ACCESS_TOKEN/SQUARE_LOCATION_ID are set and
-- a quote is actually submitted -- see _lib/square.js for why this is
-- draft-only and never auto-publishes/charges.

ALTER TABLE quote_requests ADD COLUMN square_order_id TEXT;
ALTER TABLE quote_requests ADD COLUMN square_invoice_id TEXT;
ALTER TABLE quote_requests ADD COLUMN square_invoice_url TEXT;
ALTER TABLE quote_requests ADD COLUMN square_invoice_status TEXT;
