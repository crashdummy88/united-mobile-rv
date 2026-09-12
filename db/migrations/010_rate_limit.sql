-- Rate limiting for public write/AI endpoints (chat, chat-lead, book, shop
-- quote, forum track-view). Additive only -- does not touch any existing
-- table. Safe to re-run (IF NOT EXISTS throughout).

CREATE TABLE IF NOT EXISTS rate_limit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup
  ON rate_limit_log (ip, endpoint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_created
  ON rate_limit_log (created_at);
