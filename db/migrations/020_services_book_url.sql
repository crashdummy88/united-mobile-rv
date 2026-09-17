-- UMRT Shop -- per-service Square book URL, 2026-09-17.
-- Additive only. Apply with:
--   wrangler d1 execute umrt_forum --remote --file=./db/migrations/020_services_book_url.sql
-- Staging first (same D1 bind as other shop migrations). Production only
-- after the staging Pages preview looks right on /shop/?tab=services.
--
-- Why this column exists:
--   Shop service cards used to hard-wire every "Book this service" CTA to
--   https://united-mobile-rv-llc.square.site/ (homepage root). Square
--   catalog / appointment item IDs are Matt's to own -- this repo must
--   NOT invent them. An optional book_url lets each SKU deep-link when
--   Matt pastes a real Square URL, and stays NULL (helper default) until
--   then.
--
-- What the shop does when book_url is NULL:
--   functions/_lib/shop.js serviceBookHref() sends the card to
--   https://united-mobile-rv-llc.square.site/ (working Square Online
--   "Request an appointment" form -- verified 2026-09-17) and appends
--   service=<id>&service_name=<title>&utm_* so the landing URL itself
--   carries which SKU was clicked. /s/appointments exists (GET 200) but
--   the live widget currently errors; do not default cards there. Paste
--   a working Appointments share link into book_url when Matt publishes
--   one.
--
-- Optional Pages env override (no code change needed):
--   SQUARE_BOOKING_URL = a Square-land https URL (appointments start,
--   Square Online page, or Payment Link). Used as the default base for
--   any service that still has a NULL book_url.
--
-- How Matt adds a per-SKU Square link:
--   1. Square Dashboard → Appointments (or Square Online → the service).
--   2. Open that service and copy its customer booking / share link.
--      Acceptable hosts (https only):
--        - united-mobile-rv-llc.square.site/...  (Online page, item, or /s/appointments once published)
--        - app.squareup.com/appointments/book/...
--        - square.link/u/...  (Payment Link / booking link)
--        - squareupscheduling.com/...
--      Do NOT paste a WordPress, portal, or book.unitedmobilerv.com URL
--      -- the helper will reject it and keep the Square default.
--   3. Paste into this table, e.g.
--        UPDATE services
--        SET book_url = 'https://app.squareup.com/appointments/book/...',
--            updated_at = datetime('now')
--        WHERE id = 'winterization-travel-trailer';
--      or add a follow-up additive migration that UPDATEs one id.
--   4. Redeploy is not required for the D1 write; the next /shop/?tab=services
--      render (5 min cache) picks it up. Header "Book" stays on the Square
--      homepage -- only the service-card CTA reads book_url.
--
-- Generator Maintenance: no verified per-item Square catalog ID exists in
-- this repo (a 2024 WP backup appointments/book/.../start URL is now 404;
-- live /s/appointments widget errors). Seed the working Square homepage
-- intake + intent query so that SKU is not a bare untagged homepage dump.

ALTER TABLE services ADD COLUMN book_url TEXT;

UPDATE services
SET book_url = 'https://united-mobile-rv-llc.square.site/?service=generator-maintenance&service_name=Generator%20Maintenance&utm_source=umrt_shop&utm_medium=service_card&utm_campaign=book_this_service&utm_content=generator-maintenance',
    updated_at = datetime('now')
WHERE id = 'generator-maintenance';
