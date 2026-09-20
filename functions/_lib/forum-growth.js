/**
 * Forum growth controls — archive seed/pin spam, freeze the generator,
 * and keep the AI bot scoped to one first-reply on real UMRV Tech pins.
 *
 * Seed spam lives in D1 under ids `seed-*`, `seed3-*`, and `pin-*` (plus a
 * couple of leftover content-bot hex-id threads). Public listings hide those
 * in application SQL so a Pages preview can clean the index before Matt
 * applies migration 021 to production D1. 021 persists the archive
 * (hidden + unpinned + locked) and inserts the five Tech pins.
 */

export const BOT_UMRT_TEAM_ID = 'bot-umrt-team';
export const STAFF_UMRV_TECH_ID = 'staff-umrv-tech';

/** Real sticky Tech pins — not seed-* / pin-*. Authored by UMRV Tech. */
export const TECH_PIN_IDS = Object.freeze([
  'tech-winterize',
  'tech-12v-battery',
  'tech-solar',
  'tech-slides',
  'tech-generator',
]);

export function isTechPinId(id) {
  return TECH_PIN_IDS.includes(String(id || ''));
}

/** Matches the live seed / silo-bridge spam prefixes (including seed3-*). */
export function isSeedOrPinSpamId(id) {
  const s = String(id || '');
  return s.startsWith('seed-') || s.startsWith('seed3-') || s.startsWith('pin-');
}

/** Leftover umrt-forum-content-bot diagnostic-guide threads (random hex ids). */
export function isLeftoverBotSeedThread(thread) {
  return !!(thread && thread.author_id === BOT_UMRT_TEAM_ID && !isTechPinId(thread.id));
}

export function isPubliclyListedThread(thread) {
  if (!thread || Number(thread.hidden) === 1) return false;
  if (isSeedOrPinSpamId(thread.id)) return false;
  if (isLeftoverBotSeedThread(thread)) return false;
  return true;
}

/**
 * SQL AND-clause for public thread visibility.
 * Safe static fragment — no user input.
 */
export function publicThreadSql(alias = 't') {
  const a = alias;
  return (
    `${a}.hidden = 0` +
    ` AND ${a}.id NOT LIKE 'seed-%'` +
    ` AND ${a}.id NOT LIKE 'seed3-%'` +
    ` AND ${a}.id NOT LIKE 'pin-%'` +
    ` AND ${a}.author_id != '${BOT_UMRT_TEAM_ID}'`
  );
}
