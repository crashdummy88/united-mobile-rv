-- UMRT Shop -- Services tab, generator maintenance SKU, 2026-09-17.
-- Additive only. Apply with:
--   wrangler d1 execute umrt_forum --remote --file=./db/migrations/019_generator_maintenance_service.sql
--
-- Site-owned public Services tab content (see 016_services.sql). Deliberately
-- SEPARATE from Square: do not create, update, or sync this row in Square's
-- catalog. Booking still uses the existing one-way draft-invoice write.
--
-- Matt's decision 2026-09-17: add customer-facing Generator maintenance,
-- priced starting at $150. Category is power-solar (off-grid power stack
-- for Quartzsite / boondock customers) rather than systems-repair (house
-- appliances, roof, plumbing). display_order 50 sits after the existing
-- power-solar install SKUs (10-40).

INSERT OR IGNORE INTO services (id, title, description, category, price, price_type, price_note, display_order) VALUES
  ('generator-maintenance', 'Generator Maintenance', 'On-site oil change, filter service, and operational checks for built-in and portable RV generators. Parts billed separately.', 'power-solar', 150, 'starting_at', NULL, 50);
