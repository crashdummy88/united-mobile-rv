-- Booking zone is Washington only. Montana, Wyoming, and Idaho are
-- inactive for booking. Apply manually (migrations are not auto-run):
--   wrangler d1 execute umrt_forum --remote --file=./db/migrations/023_wa_only_booking_zone.sql
--
-- Only rewrites the previous default so a hand-edited status is left alone.

UPDATE site_status
SET active_corridor = 'WA only',
    updated_at = datetime('now')
WHERE id = 1
  AND active_corridor = 'Montana · Wyoming · Idaho · Washington';
