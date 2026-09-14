-- UMRT Shop -- Peplink + weBoost reference rows, real cited public pricing.
-- Additive only. Apply with:
--   wrangler d1 execute umrt_forum --remote --file=./db/migrations/013_shop_seed_peplink_weboost.sql
--
-- Same pattern as the Dometic rows in 004_shop_seed.sql: retail_price +
-- price_source are real and verified (checked live 2026-09-14), cost/margin
-- are NULL (no wholesale/dealer cost confirmed for either brand), and rows
-- ship active=0 -- unpublished until Matt confirms an actual fulfillment
-- account with Peplink or weBoost (neither is confirmed yet, same open
-- question as Dometic).
--
-- Peplink itself doesn't publish direct retail pricing (dealer/reseller
-- network model, confirmed by checking peplink.com's own product page --
-- no price shown, only ordering codes) -- so only the one model with a
-- clean, citable reseller price is included here rather than guessing at
-- reseller markups for the rest of the lineup.

INSERT OR IGNORE INTO products (id, sku, manufacturer, model, title, description, category, product_type, retail_price, price_source, supplier_id, stock_status, installation_required, active) VALUES
  ('peplink-maxbr1pro5g', NULL, 'Peplink', 'MAX BR1 Pro 5G', 'Peplink MAX BR1 Pro 5G Cellular Router', '5G/LTE cellular router with dual SIM and WiFi 6, for mobile multi-carrier connectivity.', 'rv-connectivity', 'individual', 999.00, 'price-drop-confirmed via rvmobileinternet.com (Mobile Internet Resource Center), verified 2026-09-14', NULL, 'unverified', 1, 0),
  ('weboost-rv20-drivereach2', 'RV20', 'weBoost', 'Drive Reach RV II (RV20)', 'weBoost Drive Reach RV II Cell Signal Booster', 'Vehicle cell signal booster kit for RVs, up to 32x signal boost, all US carriers.', 'rv-connectivity', 'individual', 549.99, 'weboost.com official price, verified 2026-09-14', NULL, 'unverified', 0, 0),
  ('weboost-drivex-rv', '471410', 'weBoost', 'Drive X RV', 'weBoost Drive X RV Cell Signal Booster', 'Compact vehicle cell signal booster kit for RVs, all US carriers.', 'rv-connectivity', 'individual', 449.99, 'weboost.com official price, verified 2026-09-14', NULL, 'unverified', 0, 0);
