/**
 * UMRT Forum Content Bot — scheduled Worker (Cron Trigger).
 *
 * Scope (forum growth 021): ONE AI-labeled first reply on the five UMRV
 * Tech pins only. Does not create threads. Does not impersonate owners.
 * Does not reply anywhere else (no seed/pin spam, no drive-by auto-replies).
 *
 * Pins are created by db/migrations/021_archive_seeds_tech_pins.sql and
 * authored as UMRV Tech. This Worker may add a single helpful first reply
 * under the existing "UMRT Team" bot account, clearly labeled AI-assisted.
 */

import {
  BOT_UMRT_TEAM_ID,
  TECH_PIN_IDS,
  isTechPinId,
} from '../../functions/_lib/forum-growth.js';

const PIN_REPLY_PROMPT = `You are a senior RV/trailer diagnostic technician posting ONE first reply on a staff-authored Tech pin in a public community forum.

Write 4-7 sentences of general, well-known RV guidance that helps real owners answer the pin with useful details (what to measure, what to mention, what not to force). Be specific where you can but do not invent this particular rig's history, part numbers you are not sure of, or a personal "I did this on my coach" story.

Do not pretend to be a second owner. Do not sign the post. Do not use a greeting like "Hi". If the pin is not a technical RV question, respond with exactly: SKIP`;

async function randomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env) {
    // Manual trigger for testing: POST with header X-Content-Bot-Key matching env.CONTENT_BOT_KEY.
    if (request.method === 'POST' && env.CONTENT_BOT_KEY && request.headers.get('X-Content-Bot-Key') === env.CONTENT_BOT_KEY) {
      const result = await runOnce(env);
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(
      'UMRT Forum Content Bot — pin first-reply only (tech-* pins). Not a public endpoint.',
      { status: 200 }
    );
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runOnce(env));
  },
};

export async function runOnce(env) {
  if (!env.DB || !env.AI) return { ok: false, error: 'missing_bindings' };
  // Hard freeze: the old seed-thread generator cannot be re-enabled by env.
  if (env.CONTENT_BOT_CREATE_THREADS === '1') {
    return { ok: false, error: 'seed_generator_frozen' };
  }

  const bot = await env.DB.prepare(`SELECT id FROM users WHERE id = ?`).bind(BOT_UMRT_TEAM_ID).first();
  if (!bot) return { ok: false, error: 'bot_user_missing' };

  const placeholders = TECH_PIN_IDS.map(() => '?').join(', ');
  const { results: pins } = await env.DB.prepare(
    `SELECT t.id, t.title, t.body FROM threads t
     WHERE t.id IN (${placeholders})
       AND t.hidden = 0
       AND NOT EXISTS (
         SELECT 1 FROM posts p
         WHERE p.thread_id = t.id
           AND p.author_id = ?
           AND p.hidden = 0
       )
     ORDER BY t.id ASC`
  )
    .bind(...TECH_PIN_IDS, BOT_UMRT_TEAM_ID)
    .all();

  const needed = (pins || []).filter((t) => isTechPinId(t.id));
  if (!needed.length) {
    return { ok: true, skipped: 'all_pins_have_first_reply_or_missing', replied: [] };
  }

  const replied = [];
  const errors = [];

  for (const pin of needed) {
    if (!isTechPinId(pin.id)) continue;

    let draft;
    try {
      const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {
        messages: [
          { role: 'system', content: PIN_REPLY_PROMPT },
          { role: 'user', content: `${pin.title}\n\n${pin.body}`.slice(0, 4000) },
        ],
        max_tokens: 350,
        temperature: 0.4,
      });
      draft = (result?.response || '').trim();
    } catch (e) {
      console.error('content-bot AI failure:', e);
      errors.push({ id: pin.id, error: 'ai_failed' });
      continue;
    }
    if (!draft || draft.toUpperCase().startsWith('SKIP')) {
      errors.push({ id: pin.id, error: 'empty_or_skip' });
      continue;
    }

    const body =
      `🤖 Automated first-pass from the UMRT assistant (not a tech, not a full diagnosis):\n\n` +
      draft.slice(0, 2000) +
      `\n\nWant eyes and a meter on it? Text/call (616) 606-5277.`;

    const id = await randomId();
    await env.DB.prepare(
      `INSERT INTO posts (id, thread_id, author_id, body, hidden, ai_flagged, ai_reason) VALUES (?, ?, ?, ?, 0, 0, NULL)`
    ).bind(id, pin.id, bot.id, body).run();
    await env.DB.prepare(
      `UPDATE threads SET updated_at = datetime('now') WHERE id = ?`
    ).bind(pin.id).run();

    replied.push({ id: pin.id, post_id: id });
  }

  return { ok: true, replied, errors };
}
