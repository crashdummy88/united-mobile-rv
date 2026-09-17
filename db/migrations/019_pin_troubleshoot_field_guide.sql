-- BUG-F2: pinned Troubleshooting Index pointed at unitedmobilerv.com/troubleshoot/
-- which 404s on WP. Locked live destination is the Field Guide electrical page.
-- WP will 301 /troubleshoot/ → this same URL after Matt publishes.
-- Apply with:
--   wrangler d1 execute umrt_forum --remote --file=./db/migrations/019_pin_troubleshoot_field_guide.sql

UPDATE threads
SET body = 'Before opening a new thread, check the Field Guide — Electrical troubleshooting (https://unitedmobilerv.com/guide/electrical-troubleshooting/). If your symptom isn''t covered there, or you''ve already been through it and something''s still off, post the details here: rig, symptom, what you''ve already checked. If it turns out to need hands-on diagnosis, Book a Service (unitedmobilerv.com/book-service/) and we''ll get a trip fee + diagnostic quoted upfront.'
WHERE id = 'pin-troubleshoot-index';
