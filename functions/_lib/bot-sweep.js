/**
 * Forum helpers that used to include a stale-thread nudge sweep.
 *
 * Nudges are frozen: they were bot auto-replies outside the five UMRV Tech
 * pins. maybeRunNudgeSweep stays exported so /api/forum/online.js does not
 * break; it is a no-op. Auto-tagging at thread create is unchanged.
 */

/**
 * Frozen no-op. Content-bot first-reply on tech-* is the only bot post path.
 */
export async function maybeRunNudgeSweep() {
  return;
}

// Keyword -> category map for auto-tagging when a thread is left in the
// default "general" category but its content clearly belongs elsewhere.
// Conservative on purpose: only overrides "general", never a category the
// member actively picked.
const CATEGORY_KEYWORDS = [
  { category: 'repair', words: [
    'leak', 'leaking', 'broken', 'won\'t start', 'wont start', 'not working', 'fault', 'faulty',
    'brake', 'brakes', 'axle', 'bearing', 'furnace', 'water heater', 'fridge', 'refrigerator',
    'a/c', 'air conditioner', 'roof', 'seal', 'plumbing', 'pump', 'winterize', 'winterizing',
    'diagnos', 'repair', 'fix', 'replace', 'wiring', 'short circuit', 'blown fuse',
  ]},
  { category: 'power', words: [
    'victron', 'lifepo4', 'lithium', 'solar', 'inverter', 'battery bank', 'battery', 'shore power',
    'generator', 'propane', 'lp gas', 'off-grid', 'off grid', 'charge controller', 'amp hour', 'fuse block',
  ]},
  { category: 'connectivity', words: [
    'starlink', 'weboost', 'peplink', 'wifi', 'wi-fi', 'cell signal', 'cellular', 'hotspot',
    'router', 'booster', 'internet', 'sim card', 'bonding', 'failover',
  ]},
  { category: 'route', words: [
    'campground', 'route', 'corridor', 'towing route', 'boondock', 'boondocking', 'service area',
    'coverage area', 'travel plan', 'itinerary',
  ]},
];

/**
 * Suggests a category from title+body text. Returns null if no category
 * scores clearly (2+ keyword hits, and a clear leader over runner-up).
 */
export function autoTagCategory(title, body) {
  const text = `${title} ${body}`.toLowerCase();
  const scores = CATEGORY_KEYWORDS.map(({ category, words }) => ({
    category,
    score: words.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0),
  })).sort((a, b) => b.score - a.score);

  if (!scores.length) return null;
  const [top, runnerUp] = scores;
  if (top.score >= 2 && top.score > (runnerUp?.score || 0)) return top.category;
  return null;
}
