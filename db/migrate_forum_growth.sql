-- UMRT Forum growth / community features
-- Safe additive migration for existing D1 data.

ALTER TABLE threads ADD COLUMN solved INTEGER NOT NULL DEFAULT 0;
ALTER TABLE threads ADD COLUMN solved_at TEXT;
ALTER TABLE threads ADD COLUMN solved_by TEXT;
ALTER TABLE threads ADD COLUMN accepted_post_id TEXT;

CREATE INDEX IF NOT EXISTS idx_threads_solved_updated ON threads(solved, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_category_updated ON threads(category, updated_at DESC);

CREATE TABLE IF NOT EXISTS forum_reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  thread_id TEXT REFERENCES threads(id),
  post_id TEXT REFERENCES posts(id),
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  resolved_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_forum_reports_status_created ON forum_reports(status, created_at DESC);

CREATE TABLE IF NOT EXISTS thread_saves (
  user_id TEXT NOT NULL REFERENCES users(id),
  thread_id TEXT NOT NULL REFERENCES threads(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, thread_id)
);

CREATE INDEX IF NOT EXISTS idx_thread_saves_user ON thread_saves(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS forum_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  thread_id TEXT,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_forum_notifications_user ON forum_notifications(user_id, created_at DESC);
