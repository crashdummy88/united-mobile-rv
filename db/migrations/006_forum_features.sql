-- UMRT Forum — engagement features (upvotes, views, online tracking).
-- Apply with: wrangler d1 execute umrt_forum --remote --file=./db/migrations/006_forum_features.sql

CREATE TABLE IF NOT EXISTS post_votes (
  user_id TEXT NOT NULL REFERENCES users(id),
  post_id TEXT NOT NULL REFERENCES posts(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_post_votes_post ON post_votes(post_id);

CREATE TABLE IF NOT EXISTS thread_views (
  thread_id TEXT NOT NULL REFERENCES threads(id),
  viewed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_thread_views_thread ON thread_views(thread_id, viewed_at DESC);

CREATE TABLE IF NOT EXISTS online_sessions (
  user_id TEXT NOT NULL REFERENCES users(id),
  last_seen TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id)
);
CREATE INDEX IF NOT EXISTS idx_online_sessions_seen ON online_sessions(last_seen DESC);
