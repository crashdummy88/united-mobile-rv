/**
 * Moderation/welcome bot — stale-thread nudge sweep.
 *
 * Cloudflare Pages Functions have no native cron trigger, so this runs
 * opportunistically: called from /api/forum/online.js, which every visitor's
 * browser already polls every ~30-60s while the forum tab is open. A global
 * throttle (bot_sweep_state.last_nudge_sweep_at) caps it to once every
 * SWEEP_INTERVAL_MINUTES regardless of traffic, so it's cheap and safe.
 *
 * Also home to lightweight keyword-based auto-tagging used at thread
 * creation time (see functions/api/threads/index.js).
 */

const SWEEP_INTERVAL_MINUTES = 15;
const STALE_AFTER_HOURS = 48;

const NUDGE_LINES = [
  "Bumping this back up — anyone dealt with something like this before?",
  "This one's still open. If you've seen this issue, jump in — every bit helps.",
  "Quiet on this one so far. Still looking for input if anyone's run into it.",
];

/**
 * Runs the stale-thread nudge sweep if enough time has passed since the last
 * one. Safe to call on every request — it no-ops almost all the time.
 */
export async function maybeRunNudgeSweep(env, randomId) {
  if (!env.DB) return;
  try {
    const state = await env.DB.prepare(
      `SELECT last_nudge_sweep_at FROM bot_sweep_state WHERE id = 1`
    ).first();
    // Table may not exist yet on a DB that hasn't run migration 007 — bail quietly.
    if (state === null) return;

    if (state.last_nudge_sweep_at) {
      const minutesSince = (Date.now() - new Date(state.last_nudge_sweep_at + 'Z').getTime()) / 60000;
      if (minutesSince < SWEEP_INTERVAL_MINUTES) return;
    }

    // Claim the sweep slot immediately so concurrent requests don't double-run.
    await env.DB.prepare(
      `UPDATE bot_sweep_state SET last_nudge_sweep_at = datetime('now') WHERE id = 1`
    ).run();

    const bot = await env.DB.prepare(`SELECT id FROM users WHERE id = 'bot-umrt-team'`).first();
    if (!bot) return;

    // Unanswered = hidden/locked off, stale by updated_at, never nudged, and
    // nobody but the OP or the bot itself has posted a reply.
    const { results: candidates } = await env.DB.prepare(
      `SELECT t.id, t.title FROM threads t
       WHERE t.hidden = 0 AND t.locked = 0 AND t.nudged_at IS NULL
         AND t.updated_at < datetime('now', ?)
         AND NOT EXISTS (
           SELECT 1 FROM posts p
           WHERE p.thread_id = t.id AND p.hidden = 0
             AND p.author_id != t.author_id AND p.author_id != 'bot-umrt-team'
         )
       ORDER BY t.updated_at ASC
       LIMIT 3`
    ).bind(`-${STALE_AFTER_HOURS} hours`).all();

    for (const thread of candidates || []) {
      const line = NUDGE_LINES[Math.floor(Math.random() * NUDGE_LINES.length)];
      await env.DB.prepare(
        `INSERT INTO posts (id, thread_id, author_id, body, hidden, ai_flagged, ai_reason) VALUES (?, ?, ?, ?, 0, 0, NULL)`
      ).bind(randomId(), thread.id, bot.id, line).run();
      await env.DB.prepare(
        `UPDATE threads SET nudged_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      ).bind(thread.id).run();
    }
  } catch (e) {
    // Nudge sweep is a nice-to-have — never let it break the caller's request.
  }
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
