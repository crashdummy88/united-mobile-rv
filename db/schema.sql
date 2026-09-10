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
  ai_reason TEXT
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES threads(id),
  author_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  hidden INTEGER NOT NULL DEFAULT 0,
  ai_flagged INTEGER NOT NULL DEFAULT 0,
  ai_reason TEXT
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
