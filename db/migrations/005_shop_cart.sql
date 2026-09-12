-- UMRT Shop -- cart skeleton (Phase 1 continues to mean "quote request",
-- not a live charge). Additive only.
-- Apply with: wrangler d1 execute umrt_forum --remote --file=./db/migrations/005_shop_cart.sql
--
-- A quote_requests row now represents one submitted cart (one or many
-- products). quote_requests.product_id is kept for backward compatibility
-- with existing rows / the single-product quote form, and is set to the
-- cart's first item for a multi-item submission. The real line items for
-- a cart-based submission live in quote_request_items.

CREATE TABLE IF NOT EXISTS quote_request_items (
  quote_request_id TEXT NOT NULL REFERENCES quote_requests(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (quote_request_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_quote_request_items_request ON quote_request_items(quote_request_id);
CREATE INDEX IF NOT EXISTS idx_quote_request_items_product ON quote_request_items(product_id);
