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

/** BUG-F2: Troubleshooting Index is a field-guide door, not a D1 pin-* thread. */
export const TROUBLESHOOTING_INDEX_HREF =
  'https://unitedmobilerv.com/guide/electrical-troubleshooting/';

/**
 * Honest home-page cards for the five Tech pins + the Troubleshooting Index.
 * CTAs invite real owners. No fake multi-user replies, no seed-* / pin-* ids.
 */
export const FORUM_HOME_PIN_CARDS = Object.freeze([
  {
    id: 'tech-winterize',
    href: '/forum/t/tech-winterize',
    title: 'Winterize',
    cta: 'Share how you actually put the water system to bed — blow-out, antifreeze, or both.',
    category: 'repair',
    kind: 'tech',
  },
  {
    id: 'tech-12v-battery',
    href: '/forum/t/tech-12v-battery',
    title: '12V / house battery',
    cta: 'Post chemistry, age, and a rest voltage if you have one. Real banks only.',
    category: 'power',
    kind: 'tech',
  },
  {
    id: 'tech-solar',
    href: '/forum/t/tech-solar',
    title: 'Solar',
    cta: 'What is the array doing this season — keeping up, or stuck in bulk all day?',
    category: 'power',
    kind: 'tech',
  },
  {
    id: 'tech-slides',
    href: '/forum/t/tech-slides',
    title: 'Slides',
    cta: 'Hydraulic or Schwintek? Describe the stall, reverse, or grind before anyone hits the switch again.',
    category: 'repair',
    kind: 'tech',
  },
  {
    id: 'tech-generator',
    href: '/forum/t/tech-generator',
    title: 'Generator',
    cta: 'Hours, fuel, and the actual symptom — hard start, no AC load, or service due.',
    category: 'power',
    kind: 'tech',
  },
  {
    id: 'troubleshooting-index',
    href: TROUBLESHOOTING_INDEX_HREF,
    title: 'Troubleshooting Index',
    cta: 'Start with the electrical troubleshooting field guide before you open a new thread.',
    category: 'repair',
    kind: 'guide',
    external: true,
  },
]);

export function forumHomePinCardsHtml() {
  const tech = FORUM_HOME_PIN_CARDS.filter((c) => c.kind === 'tech');
  const guide = FORUM_HOME_PIN_CARDS.find((c) => c.kind === 'guide');
  const card = (c) => {
    const extra = c.external ? ' target="_blank" rel="noopener"' : '';
    return (
      `<article class="tech-pin-card" data-pin-id="${c.id}">` +
      `<div class="tech-pin-kicker">${c.kind === 'guide' ? 'Field guide' : 'UMRV Tech pin'}</div>` +
      `<h3><a class="text-link" href="${c.href}"${extra}>${c.title}</a></h3>` +
      `<p>${c.cta}</p>` +
      `<a class="btn btn-ghost" href="${c.href}"${extra}>${c.kind === 'guide' ? 'Open the guide' : 'Join this thread'}</a>` +
      `</article>`
    );
  };
  return (
    `<section class="band" id="tech-pins">` +
    `<div class="wrap wrap-narrow">` +
    `<span class="micro">Pinned by UMRV Tech</span>` +
    `<h2>Five open questions for real owners.</h2>` +
    `<p>These threads are from the technician — honest questions, not canned checklists and not fake multi-user replies. If you have lived the problem, post what you actually did.</p>` +
    `<div class="tech-pin-grid">${tech.map(card).join('')}</div>` +
    (guide
      ? `<div class="tech-pin-index">${card(guide)}</div>`
      : '') +
    `</div></section>`
  );
}

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
