import { readSession, randomId } from '../../../_lib/session.js';
import { moderateText } from '../../../_lib/moderate.js';
import { notifyForumActivity } from '../../../_lib/notify.js';
import { verifyTurnstile } from '../../../_lib/turnstile.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestGet(context) {
  const { env, params } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured' }, 503);

  const thread = await env.DB.prepare(
    `SELECT t.id, t.title, t.body, t.category, t.created_at, t.pinned, t.image_keys,
      t.solved_at, t.solved_by, t.accepted_reply_id, t.locked, u.id AS author_id, u.display_name AS author, u.avatar_url AS author_avatar
     FROM threads t JOIN users u ON u.id = t.author_id
     WHERE t.id = ? AND t.hidden = 0`
  )
    .bind(params.id)
    .first();

  if (!thread) return json({ success: false, error: 'not_found' }, 404);

  const { results: posts } = await env.DB.prepare(
    `SELECT p.id, p.body, p.created_at, p.image_keys, u.display_name AS author, u.avatar_url AS author_avatar
     FROM posts p JOIN users u ON u.id = p.author_id
     WHERE p.thread_id = ? AND p.hidden = 0
     ORDER BY p.created_at ASC`
  )
    .bind(params.id)
    .all();

  return json({ success: true, thread, posts });
}

export async function onRequestPost(context) {
  const { env, params, request } = context;
  if (!env.DB || !env.SESSION_SECRET) return json({ success: false, error: 'not_configured' }, 503);

  const session = await readSession(request, env.SESSION_SECRET);
  if (!session) return json({ success: false, error: 'auth_required' }, 401);

  const thread = await env.DB.prepare('SELECT id, locked FROM threads WHERE id = ? AND hidden = 0')
    .bind(params.id)
    .first();
  if (!thread) return json({ success: false, error: 'not_found' }, 404);

  if (thread.locked) {
    const modRow = await env.DB.prepare('SELECT is_mod FROM users WHERE id = ?').bind(session.uid).first();
    if (!modRow || !modRow.is_mod) return json({ success: false, error: 'thread_locked', message: 'This thread is locked — no new replies.' }, 403);
  }

  const recent = await env.DB.prepare(
    `SELECT created_at FROM posts WHERE author_id = ? ORDER BY created_at DESC LIMIT 1`
  ).bind(session.uid).first();
  if (recent) {
    const seconds = (Date.now() - new Date(recent.created_at + 'Z').getTime()) / 1000;
    if (seconds < 10) return json({ success: false, error: 'rate_limited', message: 'Please wait a moment before replying again.' }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'invalid_json' }, 400);
  }

  const ts = await verifyTurnstile(body.turnstileToken, env, request.headers.get('CF-Connecting-IP'));
  if (!ts.ok) return json({ success: false, error: 'turnstile_failed', message: 'Security check failed — please try again.' }, 403);

  const text = (body.body || '').toString().trim().slice(0, 8000);
  const rawImageKeys = Array.isArray(body.imageKeys) ? body.imageKeys : [];
  const imageKeys = rawImageKeys
    .map((k) => (k || '').toString().trim().slice(0, 200))
    .filter((k) => k.startsWith('forum/'))
    .slice(0, 4);
  const imageKeysJson = imageKeys.length ? JSON.stringify(imageKeys) : null;
  if (!text) return json({ success: false, error: 'missing_body' }, 400);

  const mod = await moderateText(env.AI, text);
  const hidden = mod.severity === 'high' ? 1 : 0;

  const id = randomId();
  await env.DB.prepare(
    `INSERT INTO posts (id, thread_id, author_id, body, hidden, ai_flagged, ai_reason, image_keys) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, params.id, session.uid, text, hidden, mod.flagged ? 1 : 0, mod.reason, imageKeysJson)
    .run();

  if (!hidden) {
    await env.DB.prepare(`UPDATE threads SET updated_at = datetime('now') WHERE id = ?`)
      .bind(params.id)
      .run();

    const threadRow = await env.DB.prepare('SELECT title, author_id FROM threads WHERE id = ?').bind(params.id).first();
    context.waitUntil(notifyForumActivity(env, {
      subject: `New forum reply: ${threadRow ? threadRow.title : params.id}`,
      message: `New reply from ${session.name || 'a member'}:\n\n${text}\n\nhttps://united-mobile-rv.pages.dev/forum/t/${params.id}`,
    }));

    // Notify the thread author and anyone else who has posted in this thread
    // (skipping whoever just replied). Best-effort -- never blocks the reply.
    try {
      const notifyIds = new Set();
      if (threadRow && threadRow.author_id && threadRow.author_id !== session.uid) notifyIds.add(threadRow.author_id);
      const { results: participants } = await env.DB.prepare(
        `SELECT DISTINCT author_id FROM posts WHERE thread_id = ? AND author_id != ?`
      ).bind(params.id, session.uid).all();
      for (const row of participants || []) {
        if (row.author_id !== (threadRow && threadRow.author_id)) notifyIds.add(row.author_id);
      }
      for (const uid of notifyIds) {
        const type = threadRow && uid === threadRow.author_id ? 'thread_reply' : 'participated_reply';
        await env.DB.prepare(
          `INSERT INTO notifications (id, user_id, type, thread_id, post_id) VALUES (?, ?, ?, ?, ?)`
        ).bind(randomId(), uid, type, params.id, id).run();
      }
    } catch (e) {
      // Notifications are a nice-to-have -- never let them break a reply post.
    }
  }

  if (mod.flagged) {
    await env.DB.prepare(
      `INSERT INTO moderation_log (id, post_id, thread_id, author_id, action, reason) VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(randomId(), id, params.id, session.uid, hidden ? 'auto_hide' : 'flagged', mod.reason)
      .run();
  }

  if (hidden) {
    return json({ success: true, id, held_for_review: true, message: 'Your reply was held for moderator review.' });
  }
  return json({ success: true, id });
}
