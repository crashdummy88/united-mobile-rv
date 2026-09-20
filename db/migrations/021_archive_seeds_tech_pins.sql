-- UMRT Forum — archive seed/pin spam + real UMRV Tech pins.
-- Additive / reversible. Do NOT apply to production D1 without Matt.
-- Staging / PR first. Apply with:
--   wrangler d1 execute umrt_forum --remote --file=./db/migrations/021_archive_seeds_tech_pins.sql
--
-- What this does:
--   1. Soft-archives every public thread whose id matches seed-*, seed3-*,
--      or pin-* (the SQL seed files + 008 + 014 silo-bridge pins). Also
--      archives leftover umrt-forum-content-bot diagnostic-guide threads
--      (hex ids, author bot-umrt-team). Prefer archive over DELETE so a
--      mod can recover: SET hidden=0, pinned=0, locked=0 WHERE id = ?.
--   2. Creates the UMRV Tech staff account (system user, same pattern as
--      bot-umrt-team) if it is missing.
--   3. Inserts five real sticky Tech pins (ids tech-*, not seed-* / pin-*).
--      Honest open questions. No fake multi-user replies.
--
-- Public index already hides hidden=1 rows. Pages Functions also filter
-- seed-/pin- ids in application SQL (functions/_lib/forum-growth.js) so a
-- preview deploy cleans the index even before this file is applied.
--
-- After apply, the umrt-forum-content-bot Worker may post ONE AI-labeled
-- first reply on each tech-* pin only. It cannot create new threads.

-- 1) Archive seed / pin / leftover bot-generator threads.
UPDATE threads
SET hidden = 1,
    pinned = 0,
    locked = 1
WHERE id LIKE 'seed-%'
   OR id LIKE 'seed3-%'
   OR id LIKE 'pin-%'
   OR (author_id = 'bot-umrt-team' AND id NOT LIKE 'tech-%');

INSERT INTO moderation_log (id, action, reason)
VALUES (
  'archive-seed-pin-spam-021',
  'archive',
  'Soft-archived seed-* / seed3-* / pin-* and leftover content-bot threads. Recover: UPDATE threads SET hidden=0, locked=0 WHERE id = ?'
);

-- 2) Staff voice for the real Tech pins (not the AI bot account).
INSERT OR IGNORE INTO users (id, provider, provider_id, email, display_name, avatar_url, is_mod)
VALUES (
  'staff-umrv-tech',
  'system',
  'umrv-tech',
  NULL,
  'UMRV Tech',
  '/assets/brand/umrt-logo.webp',
  1
);

UPDATE users
SET credentials = 'United Mobile RV · Mobile RV technician',
    display_name = 'UMRV Tech',
    is_mod = 1
WHERE id = 'staff-umrv-tech';

-- 3) Five real sticky pins. INSERT OR IGNORE so a re-apply is safe.
INSERT OR IGNORE INTO threads (id, title, body, category, author_id, pinned, hidden, locked) VALUES
(
  'tech-winterize',
  '📌 Winterize — how are you putting the water system to bed this year?',
  'UMRV Tech here. Honest question, not a canned checklist.

When you winterize, are you blow-out only, RV antifreeze, or both? The step people tell us they always second-guess is the water-heater bypass, the low-point drains, the ice maker, or a washer sitting in the coach.

What did you actually do last season, and what still makes you nervous? Year / make / model and whether the rig sits plugged-in or dry-stored helps the next owner more than a generic "do this" list.

If you want hands-on, text or call (616) 606-5277 — but this thread is for real owner notes, not a sales pitch.',
  'repair',
  'staff-umrv-tech',
  1,
  0,
  0
),
(
  'tech-12v-battery',
  '📌 12V / house battery — what is actually dropping out on your rig?',
  'UMRV Tech here. Lights dimming, panels resetting, or a bank that will not hold overnight?

What chemistry are you on (flooded, AGM, LiFePO4), roughly how old is the bank, and how does it get charged — alternator / DC-DC, shore, solar, or a mix? A rest voltage and one reading under a known load (furnace or water pump) is more useful than "it seems low."

Post what you are seeing. We will not invent a second owner in this thread — real rigs only.',
  'power',
  'staff-umrv-tech',
  1,
  0,
  0
),
(
  'tech-solar',
  '📌 Solar — is the array keeping up this season, or stuck in bulk all day?',
  'UMRV Tech here. Solar owners: is production matching what you planned, or are you watching bulk all day and never a full charge?

Panel watts, controller type (PWM vs MPPT, Victron or otherwise), and whether you are fighting shade or a winter sun angle tells us more than a generic sizing chart. Roof-mount vs portable matters too.

What is your array actually doing this month? Year / make / model if you have it.',
  'power',
  'staff-umrv-tech',
  1,
  0,
  0
),
(
  'tech-slides',
  '📌 Slides — stall, reverse halfway, or a new grind?',
  'UMRV Tech here. Slide owners — hydraulic or Schwintek / electric? One slide or more than one?

A stall or reverse halfway is usually alignment, a binding seal, low fluid (hydraulic), or a dirty rack — not automatically a dead motor. Do not keep hitting the switch on a bind; that is how a cheap alignment turns into a motor or ram.

What are you seeing, and when was the last time the seals / topper got cleaned and the mechanism got a real lube? Rig year / floorplan if you know it.',
  'repair',
  'staff-umrv-tech',
  1,
  0,
  0
),
(
  'tech-generator',
  '📌 Generator — hard start after sitting, will not carry the AC, or hours are due?',
  'UMRV Tech here. Generator crowd: hard start after storage, dies when the roof AC kicks on, or you know the hours are overdue?

Brand and size, approximate hours, and how long since oil / filter is the useful version of "it will not start." On gas units that sat, stale fuel / carb is the usual winter story; oil and air filter are the first honest check before anyone talks stator or controller.

What is yours doing? No canned multi-user replies here — real hours and real symptoms help.',
  'power',
  'staff-umrv-tech',
  1,
  0,
  0
);
