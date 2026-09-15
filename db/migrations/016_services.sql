-- UMRT Shop -- Services tab, 2026-09-15.
-- Additive only. Apply with:
--   wrangler d1 execute umrt_forum --remote --file=./db/migrations/016_services.sql
--
-- Deliberately SEPARATE from Square: Square is Matt's own internal POS/
-- invoicing tool (confirmed live 2026-09-15 -- its catalog is a private
-- labor-rate menu he bills against, not a customer-facing product list).
-- This table is site-owned content for the public Services tab, edited
-- here independently -- never synced from or to Square's catalog. The
-- ONLY connection to Square stays the existing, already-live one-way
-- write in _lib/square.js: booking a service still creates a DRAFT
-- order/invoice in Square for Matt's follow-up (createDraftEstimateFor-
-- Booking), same as it already did before this table existed. Nothing
-- here ever reads Square's catalog or writes/deletes anything in it.
--
-- Seed prices/descriptions below mirror Matt's real, current published
-- labor rates (the same numbers already live in his own Square account)
-- as an accurate starting point -- not placeholders -- but this list is
-- meant to be maintained independently going forward, same spirit as
-- the products table.
--
-- Deliberately excluded from this customer-facing list: "Labor - Per
-- Hour" ($150/hr), "Trip Fee" / "Trip Fee - Per Mile", and "Parts &
-- Materials" -- these are Matt's own internal billing line items (how
-- a job gets invoiced), not discrete services a customer picks from a
-- menu. The $150/hr rate and trip-fee policy are surfaced instead as
-- plain informational text on the Services tab itself.

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,           -- 'diagnostics' | 'seasonal' | 'power-solar' | 'electrical-repair' | 'systems-repair' | 'connectivity'
  price REAL,                       -- NULL when quote-only
  price_type TEXT NOT NULL DEFAULT 'quote', -- 'flat' | 'starting_at' | 'quote'
  price_note TEXT,                  -- short qualifier shown next to price, e.g. 'per visit'
  display_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_services_category ON services(category, active);

INSERT OR IGNORE INTO services (id, title, description, category, price, price_type, price_note, display_order) VALUES
  ('diagnostic-fee', 'Diagnostic Visit', 'Initial on-site diagnostic. If repair is authorized, additional labor billed at $150/hr.', 'diagnostics', 175, 'flat', 'per visit', 10),
  ('consultation', 'RV Systems Consultation', 'On-site system consultation and project planning. Includes assessment of existing equipment, load analysis, and written scope of work for proposed upgrades.', 'diagnostics', 175, 'flat', 'per visit', 20),

  ('ppi-travel-trailer', 'Pre-Purchase Inspection -- Travel Trailer', 'Full pre-purchase inspection for travel trailers. Electrical, plumbing, roof, seals, appliances, and chassis systems.', 'seasonal', 175, 'flat', NULL, 10),
  ('ppi-fifth-wheel-motorhome', 'Pre-Purchase Inspection -- 5th Wheel / Motorhome', 'Full pre-purchase inspection for 5th wheels and motorhomes. Electrical, plumbing, roof, seals, appliances, and chassis systems.', 'seasonal', 225, 'flat', NULL, 20),
  ('winterization-travel-trailer', 'Winterization -- Travel Trailer', 'Full winterization service for travel trailers. Blow-out and/or antifreeze method.', 'seasonal', 175, 'flat', NULL, 30),
  ('winterization-fifth-wheel-motorhome', 'Winterization -- 5th Wheel / Motorhome', 'Full winterization service for 5th wheels and motorhomes. Blow-out and/or antifreeze method.', 'seasonal', 225, 'flat', NULL, 40),

  ('solar-system-installation', 'Solar System Installation', 'Custom solar system design and installation. Pricing based on panel wattage, mounting, and system complexity.', 'power-solar', NULL, 'quote', NULL, 10),
  ('victron-system-build', 'Victron Energy System Build', 'Custom Victron Energy system design and installation. Includes inverter/charger, MPPT, battery monitor, and Cerbo GX integration.', 'power-solar', NULL, 'quote', NULL, 20),
  ('battery-system-installation', 'Battery System Installation', 'Lithium (LiFePO4) or AGM battery system installation. Includes wiring, fusing, and integration with existing or new charge sources.', 'power-solar', NULL, 'quote', NULL, 30),
  ('shore-power-inverter-setup', 'Shore Power & Inverter/Charger Setup', 'Shore power wiring, inverter/charger installation and configuration. Includes Victron system programming where applicable.', 'power-solar', NULL, 'quote', NULL, 40),

  ('dc-electrical-repair', 'DC Electrical Diagnosis & Repair', 'Diagnosis and repair of 12V/48V DC electrical systems. Billed at $150/hr after initial diagnostic fee.', 'electrical-repair', NULL, 'quote', NULL, 10),
  ('ac-electrical-repair', 'AC Electrical Diagnosis & Repair', 'Diagnosis and repair of 120V AC electrical systems. Billed at $150/hr after initial diagnostic fee.', 'electrical-repair', NULL, 'quote', NULL, 20),
  ('trailer-wiring-electrical', 'Trailer Wiring & Electrical', 'Trailer wiring diagnosis, repair, 4-pin and 7-pin connector service. Brake controller calibration and troubleshooting.', 'electrical-repair', NULL, 'quote', NULL, 30),

  ('appliance-diagnosis-repair', 'Appliance Diagnosis & Repair', 'Diagnosis and repair of RV appliances including refrigerators, water heaters, furnaces, and air conditioners.', 'systems-repair', NULL, 'quote', NULL, 10),
  ('roof-seal-repair', 'Roof & Seal Repair', 'Roof inspection, resealing, and repair. Includes lap sealant, dicor, and membrane repair as needed. Materials billed separately.', 'systems-repair', NULL, 'quote', NULL, 20),
  ('plumbing-repair', 'Plumbing Repair', 'Fresh water, grey, and black system diagnosis and repair. Includes line replacement, pump service, and fitting repair. Parts billed separately.', 'systems-repair', NULL, 'quote', NULL, 30),

  ('starlink-installation', 'Starlink Installation', 'Starlink dish mounting, cable routing, and network configuration for RV and van applications.', 'connectivity', NULL, 'quote', NULL, 10),
  ('cellular-booster-installation', 'Cellular Booster Installation', 'weBoost cellular booster installation including antenna mounting, cable routing, and signal optimization.', 'connectivity', NULL, 'quote', NULL, 20);
