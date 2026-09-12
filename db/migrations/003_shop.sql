-- UMRT Shop — Phase 1 (catalog + quote-request checkout, no live payment yet).
-- Additive only. Apply with:
--   wrangler d1 execute umrt_forum --remote --file=./db/migrations/003_shop.sql
--
-- cost / margin fields are intentionally nullable and left NULL at seed time:
-- the retail_price values shipped with this migration are Artek's own public
-- prices (verified against artek.energy), not UMRT's wholesale cost, which
-- has not been provided yet. Margin math should never run against a guessed
-- cost -- it's correctly "unknown" until the real number exists.

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  api_capability TEXT NOT NULL DEFAULT 'none',      -- 'none' | 'manual' | 'api'
  catalog_capability TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'feed' | 'api'
  fulfillment_capability TEXT NOT NULL DEFAULT 'manual',
  priority INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT,
  manufacturer TEXT NOT NULL,
  model TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,          -- problem-based: 'rv-batteries' | 'rv-solar' | 'rv-power-protection' | 'rv-connectivity' | ...
  product_type TEXT NOT NULL DEFAULT 'individual', -- 'individual' | 'kit' | 'configured' | 'package'
  retail_price REAL,               -- reference/display price; verified source noted in price_source
  price_source TEXT,               -- e.g. 'artek.energy public price, verified 2026-09-12'
  cost REAL,                       -- UMRT's actual wholesale cost -- NULL until Matt provides it
  cost_source TEXT,
  margin REAL,                     -- computed only when cost is present; never fabricated
  supplier_id TEXT REFERENCES suppliers(id),
  supplier_sku TEXT,
  stock_status TEXT NOT NULL DEFAULT 'unverified', -- 'unverified' | 'in_stock' | 'special_order' | 'discontinued'
  weight_lbs REAL,
  shipping_class TEXT,
  compatibility TEXT,               -- free text for now (compatible batteries/MPPTs/etc.)
  installation_required INTEGER NOT NULL DEFAULT 0,
  image_key TEXT,
  active INTEGER NOT NULL DEFAULT 0, -- inactive (not shown) until a human reviews/publishes it
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category, active);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);

-- A kit/package's component list -- lets Type-2 kits reference real products
-- instead of duplicating specs, and lets a kit's price roll up from parts.
CREATE TABLE IF NOT EXISTS product_components (
  kit_id TEXT NOT NULL REFERENCES products(id),
  component_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  required INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (kit_id, component_id)
);

-- Quote requests -- Phase 1 checkout is "request a quote", not a live charge.
-- Matt invoices through Square himself once he confirms real cost/availability.
CREATE TABLE IF NOT EXISTS quote_requests (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  location TEXT,
  rv_year TEXT,
  rv_make TEXT,
  rv_model TEXT,
  service_option TEXT,   -- 'hardware_only' | 'hardware_plus_config' | 'hardware_plus_install' | 'full_design_install'
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- 'new' | 'quoted' | 'won' | 'lost'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status, created_at DESC);

INSERT OR IGNORE INTO suppliers (id, name, api_capability, catalog_capability, fulfillment_capability, priority, active, notes) VALUES
  ('artek', 'Artek Energy', 'none', 'manual', 'manual', 10, 1, 'Public wholesale-facing catalog at artek.energy. No API access confirmed yet -- prices sourced manually from their public site.');
