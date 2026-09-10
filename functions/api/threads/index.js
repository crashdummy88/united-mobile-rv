import { readSession, randomId } from '../../_lib/session.js';
import { moderateText } from '../../_lib/moderate.js';
import { draftAiReply } from '../../_lib/ai-reply.js';
import { notifyForumActivity } from '../../_lib/notify.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured', threads: [] }, 503);

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10) || 30, 100);

  const { results } = await env.DB.prepare(
    `SELECT t.id, t.title, t.category, t.created_at, t.updated_at, t.pinned, u.display_name AS author, u.avatar_url AS author_avatar,
      (SELECT COUNT(*) FROM posts p WHERE p.thread_id = t.id AND p.hidden = 0) AS reply_count
     FROM threads t JOIN users u ON u.id = t.author_id
     WHERE t.hidden = 0
     ORDER BY t.pinned DESC, t.updated_at DESC
     LIMIT ?`
  )
    .bind(limit)
    .all();

  return json({ success: true, threads: results });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured' }, 503);
  if (!env.SESSION_SECRET) return json({ success: false, error: 'not_configured' }, 503);

  const session = await readSession(request, env.SESSION_SECRET);
  if (!session) return json({ success: false, error: 'auth_required' }, 401);

  const recent = await env.DB.prepare(
    `SELECT created_at FROM threads WHERE author_id = ? ORDER BY created_at DESC LIMIT 1`
  ).bind(session.uid).first();
  if (recent) {
    const seconds = (Date.now() - new Date(recent.created_at + 'Z').getTime()) / 1000;
    if (seconds < 20) return json({ success: false, error: 'rate_limited', message: 'Please wait a moment before posting again.' }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'invalid_json' }, 400);
  }

  const title = (body.title || '').toString().trim().slice(0, 200);
  const text = (body.body || '').toString().trim().slice(0, 8000);
  const category = (body.category || 'general').toString().trim().slice(0, 40) || 'general';

  if (!title || !text) return json({ success: false, error: 'missing_fields' }, 400);

  const mod = await moderateText(env.AI, `${title}\n\n${text}`);
  const hidden = mod.severity === 'high' ? 1 : 0;

  const id = randomId();
  await env.DB.prepare(
    `INSERT INTO threads (id, title, body, category, author_id, hidden, ai_flagged, ai_reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, title, text, category, session.uid, hidden, mod.flagged ? 1 : 0, mod.reason)
    .run();

  if (mod.flagged) {
    await env.DB.prepare(
      `INSERT INTO moderation_log (id, thread_id, author_id, action, reason) VALUES (?, ?, ?, ?, ?)`
    )
      .bind(randomId(), id, session.uid, hidden ? 'auto_hide' : 'flagged', mod.reason)
      .run();
  }

  // Auto-welcome: if this is the author's first-ever (visible) thread, have the
  // UMRT Team bot account drop a friendly first reply so new members don't post into silence.
  if (!hidden) {
    try {
      const countRow = await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM threads WHERE author_id = ? AND hidden = 0`
      ).bind(session.uid).first();
      if (countRow && countRow.n === 1) {
        const bot = await env.DB.prepare(`SELECT id FROM users WHERE id = 'bot-umrt-team'`).first();
        if (bot) {
          const firstName = (session.name || 'there').toString().split(' ')[0];
          const catWelcome = {
            general: "Glad to have you here — feel free to poke around the other categories too.",
            repair: "Diagnostics and repair questions are exactly what this place is for — hope you get it sorted.",
            power: "Off-grid and power setups come up a lot here — good place to compare notes.",
            connectivity: "Connectivity questions are common here too — Starlink, boosters, all of it.",
            route: "Good to have another voice on route and service-area talk.",
          };
          const line = catWelcome[category] || catWelcome.general;
          const welcomeBody = `Welcome to the forum, ${firstName}! ${line} If you don't hear back right away, hang tight — someone (often Matt) will chime in.`;
          await env.DB.prepare(
            `INSERT INTO posts (id, thread_id, author_id, body, hidden, ai_flagged, ai_reason) VALUES (?, ?, ?, ?, 0, 0, NULL)`
          ).bind(randomId(), id, bot.id, welcomeBody).run();
          await env.DB.prepare(`UPDATE threads SET updated_at = datetime('now') WHERE id = ?`).bind(id).run();
        }
      }
    } catch (e) {
      // Welcome bot is a nice-to-have — never let it break thread creation.
    }

    // AI first-pass technical draft: only for non-general technical categories,
    // clearly labeled as an automated draft, never posing as Matt.
    try {
      if (category !== 'general') {
        const draft = await draftAiReply(env.AI, title, text);
        if (draft) {
          const bot = await env.DB.prepare(`SELECT id FROM users WHERE id = 'bot-umrt-team'`).first();
          if (bot) {
            const draftBody = `🤖 Automated first-pass from the UMRT assistant (not Matt, not a full diagnosis):\n\n${draft}\n\nWant eyes and a meter on it? Text/call (616) 606-5277.`;
            await env.DB.prepare(
              `INSERT INTO posts (id, thread_id, author_id, body, hidden, ai_flagged, ai_reason) VALUES (?, ?, ?, ?, 0, 0, NULL)`
            ).bind(randomId(), id, bot.id, draftBody).run();
            await env.DB.prepare(`UPDATE threads SET updated_at = datetime('now') WHERE id = ?`).bind(id).run();
          }
        }
      }
    } catch (e) {
      // AI draft reply is a nice-to-have — never let it break thread creation.
    }

    // Email alert to Matt — fire and forget.
    context.waitUntil(notifyForumActivity(env, {
      subject: `New forum thread: ${title}`,
      message: `New thread posted in "${category}" by ${session.name || 'a member'}:\n\n${title}\n\n${text}\n\nhttps://united-mobile-rv.pages.dev/forum/ (open the thread from the list)`,
    }));
  }

  if (hidden) {
    return json({
      success: true,
      id,
      held_for_review: true,
      message: 'Your post was held for moderator review.',
    });
  }
  return json({ success: true, id });
}
