-- UMRT Forum — P1-P7 additive migration.
-- Adds solved/reopened/lock workflow, reports, saves, and notifications.
-- Nothing here removes or renames an existing column/table.
-- Apply with:
--   wrangler d1 execute umrt_forum --remote --file=./db/migrations/002_p1_p7.sql
-- Safe to run once against the existing production DB. Re-running will fail
-- on the ALTER TABLE lines (SQLite has no "ADD COLUMN IF NOT EXISTS") — that
-- failure is harmless/expected on a second run; the CREATE TABLE/INDEX lines
-- below are already idempotent.

ALTER TABLE threads ADD COLUMN solved_at TEXT;
ALTER TABLE threads ADD COLUMN solved_by TEXT;
ALTER TABLE threads ADD COLUMN reopened_at TEXT;
ALTER TABLE threads ADD COLUMN reopened_by TEXT;
ALTER TABLE threads ADD COLUMN accepted_reply_id TEXT;
ALTER TABLE threads ADD COLUMN locked INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  thread_id TEXT REFERENCES threads(id),
  post_id TEXT REFERENCES posts(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',   -- 'open' | 'resolved' | 'dismissed'
  moderator_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS saves (
  user_id TEXT NOT NULL REFERENCES users(id),
  thread_id TEXT NOT NULL REFERENCES threads(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, thread_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,   -- 'thread_reply' | 'participated_reply' | 'thread_solved' | 'moderation'
  thread_id TEXT REFERENCES threads(id),
  post_id TEXT REFERENCES posts(id),
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saves_thread ON saves(thread_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_solved ON threads(solved_at);
