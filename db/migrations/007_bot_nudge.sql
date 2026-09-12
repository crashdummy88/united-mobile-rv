-- Moderation/welcome bot: stale-thread nudge sweep.
-- Additive only. Apply with:
--   wrangler d1 execute umrt_forum --remote --file=./db/migrations/007_bot_nudge.sql

ALTER TABLE threads ADD COLUMN nudged_at TEXT;

-- Global throttle so the sweep (triggered opportunistically by forum traffic,
-- since Cloudflare Pages Functions have no native cron) runs at most every
-- few minutes regardless of how many visitors are polling /api/forum/online.
CREATE TABLE IF NOT EXISTS bot_sweep_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_nudge_sweep_at TEXT
);
INSERT OR IGNORE INTO bot_sweep_state (id, last_nudge_sweep_at) VALUES (1, NULL);
