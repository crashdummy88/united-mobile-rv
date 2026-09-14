-- Phase 3 (2026-09-14): "Precision Stack" upsell tier -- a new shop category
-- for premium off-grid/high-end coach builds, per the product pipeline notes.
--
-- Deliberately inactive (active = 0) with cost/retail_price left NULL --
-- same "never fabricated" discipline as every other product in this table
-- (see 003_shop.sql's own column comments and commerce/pricing.py). These
-- need Matt to confirm real specs/SKUs/wholesale cost before going live;
-- this migration only seeds the catalog structure and public specs, not
-- pricing. Flip `active` to 1 per-row once verified.

INSERT INTO products (id, sku, manufacturer, model, title, description, category, product_type, stock_status, active)
VALUES
  ('precision-wakespeed-ws500', NULL, 'Wakespeed', 'WS500',
   'Wakespeed WS500 Alternator Regulator',
   'Secondary alternator regulator for 3-5kW bulk DC charging via engine idle, native CAN bus integration with Victron systems. Needs real wholesale cost + install-labor pricing from Matt before publishing.',
   'rv-precision-stack', 'individual', 'unverified', 0),

  ('precision-arco-zeus', NULL, 'ARCO', 'Zeus',
   'ARCO Zeus Alternator Regulator',
   'Alternative secondary alternator regulator for high-output engine-idle DC charging, CAN bus to Victron. Needs real wholesale cost + install-labor pricing from Matt before publishing.',
   'rv-precision-stack', 'individual', 'unverified', 0),

  ('precision-24v-conversion', NULL, 'Victron', 'MultiPlus-II / Quattro',
   '24V/48V House Architecture Conversion',
   'Labor/design package converting a 12V house system to 24V or 48V (MultiPlus-II or Quattro based) to cut wire gauge and line loss on heavy continuous loads. Needs a clear "when this makes sense" writeup (most stock 12V DC loads -- furnace board, water pump, slide motors -- don''t survive the jump without buck-converter subsystems) before this is marketed, plus real pricing.',
   'rv-precision-stack', 'configured', 'unverified', 0),

  ('precision-ruuvitag-cerbo', NULL, 'Ruuvi', 'RuuviTag',
   'RuuviTag Wireless Sensors -> Cerbo GX',
   'Low-cost, low-labor wireless temperature/humidity sensors integrated into a Victron Cerbo GX for wet-bay/fridge/rooftop monitoring. High attach-rate add-on. Needs real per-unit + labor pricing from Matt before publishing.',
   'rv-precision-stack', 'kit', 'unverified', 0),

  ('precision-starlink-mini-flatroof', NULL, 'Starlink', 'Mini',
   'Starlink Mini Flat-Roof DC Integration Kit',
   'Permanent flat-roof mount + DC power integration for Starlink Mini, in-demand and already requested by name by customers. Needs a real mounting-hardware sourcing decision (vendor-bought vs. UMRT-template laser-cut) and pricing before publishing.',
   'rv-precision-stack', 'kit', 'unverified', 0);
