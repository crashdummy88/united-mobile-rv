-- UMRT Forum -- pinned index threads bridging the 13 orphaned silo pages
-- (/troubleshoot/, /rv-repair/, /tech/, and the 9-state /rv-repair-*/ tier)
-- found in the 2026-09-14 SEO audit (internal_all.csv + seo_analyzer.py).
--
-- Not a new taxonomy: reuses the 3 categories that already exist on
-- `threads.category` (repair, power, route -- confirmed live via
-- `SELECT DISTINCT category FROM threads`, no separate categories table).
-- author_id is Matt's real account (mattc2896@gmail.com, has `credentials`
-- set via 009_author_credentials.sql) -- same "use a real existing user"
-- pattern as 008_seed3_threads.sql, just targeted instead of "earliest".
--
-- Body text references pages as plain text, not markdown/HTML links --
-- functions/forum/t/[id].js renders thread.body through esc() + \n->br,
-- so raw HTML/markdown would show as literal text, not a real link.
--
-- FROZEN — these pin-* silo-bridge threads are seed spam on the public index.
-- Archived by 021_archive_seeds_tech_pins.sql. Do not re-apply to live D1.
--
-- Originally: NOT YET APPLIED. Apply with:
--   wrangler d1 execute umrt_forum --remote --file=./db/migrations/014_pinned_silo_bridge_threads.sql

INSERT INTO threads (id, title, body, category, author_id, pinned) VALUES
(
  'pin-troubleshoot-index',
  '📌 Troubleshooting Index — start here before you post',
  'Before opening a new thread, check whether your symptom is already covered on the Troubleshooting Hub (unitedmobilerv.com/troubleshoot/) -- it''s organized by symptom (won''t hold charge, no water pressure, AC not cooling, etc.) with the same diagnostic steps I''d walk through on a service call. If it''s not covered there, or you''ve already been through it and something''s still off, post the details here: rig, symptom, what you''ve already checked. If it turns out to need hands-on diagnosis, Book a Service (unitedmobilerv.com/book-service/) and we''ll get a trip fee + diagnostic quoted upfront.',
  'repair',
  (SELECT id FROM users WHERE email = 'mattc2896@gmail.com'),
  1
),
(
  'pin-repair-general',
  '📌 General RV Repair — what we fix, what we don''t',
  'Quick scope check before you post or book: we cover chassis/generator/plumbing/electrical/LP-gas diagnostic-first mobile repair -- full breakdown on unitedmobilerv.com/rv-repair/. We do NOT do bodywork, full interior remodels, or warranty-only manufacturer recalls (those go back to the dealer). If your issue fits, this thread''s a good place to ask "does this sound like X" before you book -- real pricing structure is on unitedmobilerv.com/pricing/ if you want the numbers first.',
  'repair',
  (SELECT id FROM users WHERE email = 'mattc2896@gmail.com'),
  1
),
(
  'pin-tech-electronics',
  '📌 RV Multiplex & Advanced Electronics megathread',
  'This one''s for the deeper electrical/electronics stuff -- multiplex wiring systems, Victron integration, inverter/charger configuration, CAN-bus weirdness. The full writeup with system-specific notes is at unitedmobilerv.com/tech/. If you''re troubleshooting something specific on your rig, post your system (brand/model) and what you''re seeing -- if it needs a meter on it in person, Full pricing and the diagnostic fee structure are at unitedmobilerv.com/pricing/.',
  'power',
  (SELECT id FROM users WHERE email = 'mattc2896@gmail.com'),
  1
),
(
  'pin-route-corridor-mtwyidwa',
  '📌 MT · WY · ID · WA corridor — local RV repair Q&A',
  'This is the active corridor -- Montana, Wyoming, Idaho, Washington -- where we''re on-site most often. Local threads for Billings, Bozeman, Missoula, West Yellowstone (MT), Jackson Hole (WY), Coeur d''Alene (ID), and Seattle/Spokane/Olympic Peninsula (WA) live under their own city pages if you want driving-distance-specific notes. Use this thread for corridor-wide questions -- typical response time, campground/storage-yard access, seasonal scheduling. Full coverage map: unitedmobilerv.com/service-areas/.',
  'route',
  (SELECT id FROM users WHERE email = 'mattc2896@gmail.com'),
  1
),
(
  'pin-route-mi-mn-wi',
  '📌 MI · MN · WI regional RV repair Q&A',
  'Case-by-case travel coverage for Michigan, Minnesota, and Wisconsin -- not the daily corridor, so scheduling depends on what else is on the route that trip. If you''re in Bay City/Royal Oak/Mackinaw City/St. Ignace/Manistique/Ironwood (MI), Minneapolis-St. Paul (MN), or Madison/Superior (WI), post here with rough timing and I''ll let you know what''s realistic. Full coverage map: unitedmobilerv.com/service-areas/.',
  'route',
  (SELECT id FROM users WHERE email = 'mattc2896@gmail.com'),
  1
),
(
  'pin-route-dakotas',
  '📌 The Dakotas — RV repair Q&A',
  'South Dakota (Rapid City, Sioux Falls, Custer) and North Dakota coverage is case-by-case, same as the rest of the secondary corridor. Post your location and timing here and I''ll confirm whether it lines up with an upcoming trip. Full coverage map: unitedmobilerv.com/service-areas/.',
  'route',
  (SELECT id FROM users WHERE email = 'mattc2896@gmail.com'),
  1
),
(
  'pin-route-oregon',
  '📌 Oregon — RV repair Q&A',
  'Oregon is outside the primary corridor, so it''s the most trip-dependent of all the regions we''ll cover -- post here with your general area and timeframe and I''ll tell you honestly whether it''s realistic. Full coverage map: unitedmobilerv.com/service-areas/.',
  'route',
  (SELECT id FROM users WHERE email = 'mattc2896@gmail.com'),
  1
);
