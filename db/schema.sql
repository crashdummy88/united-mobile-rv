-- UMRT Forum — Cloudflare D1 schema
-- Apply with: wrangler d1 execute umrt_forum --remote --file=./db/schema.sql

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,             -- 'google' | 'github' | 'meta'
  provider_id TEXT NOT NULL,
  email TEXT,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  banned INTEGER NOT NULL DEFAULT 0,
  is_mod INTEGER NOT NULL DEFAULT 0,
  tou_accepted_at TEXT,
  tou_version TEXT,
  UNIQUE(provider, provider_id)
);

CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  author_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  pinned INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  ai_flagged INTEGER NOT NULL DEFAULT 0,
  ai_reason TEXT,
  image_keys TEXT
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES threads(id),
  author_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  hidden INTEGER NOT NULL DEFAULT 0,
  ai_flagged INTEGER NOT NULL DEFAULT 0,
  ai_reason TEXT,
  image_keys TEXT
);

CREATE TABLE IF NOT EXISTS moderation_log (
  id TEXT PRIMARY KEY,
  post_id TEXT,
  thread_id TEXT,
  author_id TEXT,
  action TEXT NOT NULL,         -- 'auto_hide' | 'mod_hide' | 'mod_unhide' | 'ban'
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posts_thread ON posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_threads_updated ON threads(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_modlog_created ON moderation_log(created_at DESC);

-- Shared status + pricing, read by united-mobile-rv, umrt-areas, umrt-go, umrt-quote
-- via /api/status. Single source of truth so satellite sites never go stale.

CREATE TABLE IF NOT EXISTS site_status (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  active_corridor TEXT NOT NULL DEFAULT 'Montana · Wyoming · Idaho · Washington',
  case_by_case TEXT NOT NULL DEFAULT 'MI / WI / SD · MN / ND / OR',
  current_location TEXT NOT NULL DEFAULT 'Alpine WY',
  status_note TEXT NOT NULL DEFAULT 'Now Cycling',
  hours TEXT NOT NULL DEFAULT 'Mon–Sat 8am–7pm',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT
);

INSERT OR IGNORE INTO site_status (id) VALUES (1);

CREATE TABLE IF NOT EXISTS pricing (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  amount TEXT NOT NULL,
  note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO pricing (key, label, amount, note, sort_order) VALUES
  ('trip_fee', 'Trip fee', '$75', 'Within 30 miles', 1),
  ('mileage', 'Mileage', '$1.50/mi', 'Each way beyond 30 miles', 2),
  ('labor', 'Labor', '~$150/hr', '1 hr minimum, 30-min increments after', 3),
  ('diagnostic', 'Diagnostic', '$175', 'Applied toward repair if you proceed', 4),
  ('winterize', 'Winterize', '$175', 'Separate line item', 5),
  ('trip_prep', 'Trip prep', '$225', 'Separate line item', 6);

CREATE TABLE IF NOT EXISTS media_usage (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  total_bytes INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO media_usage (id, total_bytes) VALUES (1, 0);
