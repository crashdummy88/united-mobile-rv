-- UMRT Shop -- backfill `sku` on the 32 product rows that had none, so
-- syncShopInventoryFromSquare (functions/_lib/square.js) has something to
-- match against. Was blocking 2026-09-14: "this sync will only touch ~6%
-- of the catalog until more SKUs are backfilled" -- see that file's own
-- comment on why matching is SKU-only and never fuzzy-by-name.
--
-- Paired with a one-time live write to Square's catalog (done in-session,
-- 2026-09-16, via the Square API -- not tracked here since catalog
-- objects aren't part of this repo): 34 real ITEM/ITEM_VARIATION objects
-- were created in Square, one per row below, each carrying this same SKU
-- and the row's current retail_price (or VARIABLE_PRICING for the 5
-- quote-only "configured" installs with no fixed price). Square's catalog
-- previously held only service/labor items (from 016_services.sql) --
-- zero overlap with this table -- so there was nothing for a sync to
-- match until this pair of writes (Square catalog + this SKU backfill).
--
-- SKU scheme: uppercased D1 product id (e.g. `victron-gxtouch50` ->
-- `VICTRON-GXTOUCH50`) -- an internal identifier shared between the two
-- systems now, not a claim to be the manufacturer's real part number.
-- The 2 rows that already had a real manufacturer SKU on file
-- (weboost-rv20-drivereach2 = RV20, weboost-drivex-rv = 471410) are left
-- untouched by the `AND sku IS NULL` guard and were reused as-is when
-- creating their Square catalog items.
--
-- Apply with:
--   wrangler d1 execute umrt_forum --remote --file=./db/migrations/018_backfill_product_skus.sql

UPDATE products SET sku = 'ARTEK-EPOCH-ECO-12V' WHERE id = 'artek-epoch-eco-12v' AND sku IS NULL;
UPDATE products SET sku = 'ARTEK-EPOCH-ELITE-V2' WHERE id = 'artek-epoch-elite-v2' AND sku IS NULL;
UPDATE products SET sku = 'ARTEK-EPOCH-V2T' WHERE id = 'artek-epoch-v2t' AND sku IS NULL;
UPDATE products SET sku = 'ARTEK-ALPHA2PRO-200' WHERE id = 'artek-alpha2pro-200' AND sku IS NULL;
UPDATE products SET sku = 'DOMETIC-FRESHJET-48V' WHERE id = 'dometic-freshjet-48v' AND sku IS NULL;
UPDATE products SET sku = 'DOMETIC-PENGUIN2' WHERE id = 'dometic-penguin2' AND sku IS NULL;
UPDATE products SET sku = 'DOMETIC-RTX2000' WHERE id = 'dometic-rtx2000' AND sku IS NULL;
UPDATE products SET sku = 'DOMETIC-RTX-WIRINGKIT' WHERE id = 'dometic-rtx-wiringkit' AND sku IS NULL;
UPDATE products SET sku = 'DOMETIC-RTX-INSTALLKIT' WHERE id = 'dometic-rtx-installkit' AND sku IS NULL;
UPDATE products SET sku = 'DOMETIC-SMARTSTART' WHERE id = 'dometic-smartstart' AND sku IS NULL;
UPDATE products SET sku = 'PEPLINK-MAXBR1PRO5G' WHERE id = 'peplink-maxbr1pro5g' AND sku IS NULL;
UPDATE products SET sku = 'RV20' WHERE id = 'weboost-rv20-drivereach2' AND sku IS NULL;
UPDATE products SET sku = '471410' WHERE id = 'weboost-drivex-rv' AND sku IS NULL;
UPDATE products SET sku = 'VICTRON-LYNX-DISTRIBUTOR' WHERE id = 'victron-lynx-distributor' AND sku IS NULL;
UPDATE products SET sku = 'VICTRON-GXTOUCH50' WHERE id = 'victron-gxtouch50' AND sku IS NULL;
UPDATE products SET sku = 'VICTRON-SMARTSOLAR-MPPT' WHERE id = 'victron-smartsolar-mppt' AND sku IS NULL;
UPDATE products SET sku = 'PRECISION-ARCO-ZEUS' WHERE id = 'precision-arco-zeus' AND sku IS NULL;
UPDATE products SET sku = 'PRECISION-RUUVITAG-CERBO' WHERE id = 'precision-ruuvitag-cerbo' AND sku IS NULL;
UPDATE products SET sku = 'PRECISION-STARLINK-MINI-FLATROOF' WHERE id = 'precision-starlink-mini-flatroof' AND sku IS NULL;
UPDATE products SET sku = 'PRECISION-24V-CONVERSION' WHERE id = 'precision-24v-conversion' AND sku IS NULL;
UPDATE products SET sku = 'PRECISION-WAKESPEED-WS500' WHERE id = 'precision-wakespeed-ws500' AND sku IS NULL;
UPDATE products SET sku = 'DOMETIC-DM2672' WHERE id = 'dometic-dm2672' AND sku IS NULL;
UPDATE products SET sku = 'DOMETIC-CFX5-25' WHERE id = 'dometic-cfx5-25' AND sku IS NULL;
UPDATE products SET sku = 'DOMETIC-CFX5-55IM' WHERE id = 'dometic-cfx5-55im' AND sku IS NULL;
UPDATE products SET sku = 'DOMETIC-CRX1080S' WHERE id = 'dometic-crx1080s' AND sku IS NULL;
UPDATE products SET sku = 'DOMETIC-CRX80U' WHERE id = 'dometic-crx80u' AND sku IS NULL;
UPDATE products SET sku = 'DOMETIC-COOLMATIC-CD30' WHERE id = 'dometic-coolmatic-cd30' AND sku IS NULL;
UPDATE products SET sku = 'DOMETIC-NRX130E' WHERE id = 'dometic-nrx130e' AND sku IS NULL;
UPDATE products SET sku = 'MAXXAIR-7500K' WHERE id = 'maxxair-7500k' AND sku IS NULL;
UPDATE products SET sku = 'ARTEK-JA440W-KIT' WHERE id = 'artek-ja440w-kit' AND sku IS NULL;
UPDATE products SET sku = 'ARTEK-FLEX-170W' WHERE id = 'artek-flex-170w' AND sku IS NULL;
UPDATE products SET sku = 'ARTEK-FLEX-210W' WHERE id = 'artek-flex-210w' AND sku IS NULL;
UPDATE products SET sku = 'RICHSOLAR-MEGA-100W' WHERE id = 'richsolar-mega-100w' AND sku IS NULL;
UPDATE products SET sku = 'RICHSOLAR-MEGA-150W' WHERE id = 'richsolar-mega-150w' AND sku IS NULL;
