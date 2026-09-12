import { readSession, randomId } from '../_lib/session.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function getUser(request, env) {
  if (!env.DB || !env.SESSION_SECRET) return null;
  const session = await readSession(request, env.SESSION_SECRET);
  if (!session) return null;
  const user = await env.DB.prepare('SELECT id, display_name, is_mod, banned FROM users WHERE id = ?').bind(session.uid).first();
  if (!user || user.banned) return null;
  return user;
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const user = await getUser(request, env);
  if (!user) return json({ success: false, error: 'auth_required' }, 401);

  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  if (action === 'saved') {
    const { results } = await env.DB.prepare(
      `SELECT t.id, t.title, t.category, t.updated_at, t.solved
       FROM thread_saves s JOIN threads t ON t.id = s.thread_id
       WHERE s.user_id = ? AND t.hidden = 0 ORDER BY s.created_at DESC LIMIT 100`
    ).bind(user.id).all();
    return json({ success: true, threads: results });
  }
  if (action === 'notifications') {
    const { results } = await env.DB.prepare(
      `SELECT id, thread_id, type, message, read_at, created_at
       FROM forum_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
    ).bind(user.id).all();
    return json({ success: true, notifications: results });
  }
  return json({ success: false, error: 'unknown_action' }, 400);
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const user = await getUser(request, env);
  if (!user) return json({ success: false, error: 'auth_required' }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ success: false, error: 'invalid_json' }, 400); }
  const action = (body.action || '').toString();
  const threadId = (body.threadId || '').toString();
  const postId = (body.postId || '').toString();

  if (action === 'save' || action === 'unsave') {
    if (!threadId) return json({ success: false, error: 'missing_thread' }, 400);
    const thread = await env.DB.prepare('SELECT id FROM threads WHERE id = ? AND hidden = 0').bind(threadId).first();
    if (!thread) return json({ success: false, error: 'not_found' }, 404);
    if (action === 'save') {
      await env.DB.prepare('INSERT OR IGNORE INTO thread_saves (user_id, thread_id) VALUES (?, ?)').bind(user.id, threadId).run();
    } else {
      await env.DB.prepare('DELETE FROM thread_saves WHERE user_id = ? AND thread_id = ?').bind(user.id, threadId).run();
    }
    return json({ success: true, saved: action === 'save' });
  }

  if (action === 'report') {
    if (!threadId && !postId) return json({ success: false, error: 'missing_target' }, 400);
    const reason = (body.reason || '').toString().trim().slice(0, 80);
    const details = (body.details || '').toString().trim().slice(0, 1000);
    if (!reason) return json({ success: false, error: 'missing_reason' }, 400);
    await env.DB.prepare(
      `INSERT INTO forum_reports (id, reporter_id, thread_id, post_id, reason, details) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(randomId(), user.id, threadId || null, postId || null, reason, details || null).run();
    return json({ success: true });
  }

  if (action === 'solve' || action === 'unsolve') {
    if (!threadId) return json({ success: false, error: 'missing_thread' }, 400);
    const thread = await env.DB.prepare('SELECT id, author_id FROM threads WHERE id = ? AND hidden = 0').bind(threadId).first();
    if (!thread) return json({ success: false, error: 'not_found' }, 404);
    if (!user.is_mod && thread.author_id !== user.id) return json({ success: false, error: 'forbidden' }, 403);
    if (action === 'solve') {
      await env.DB.prepare(`UPDATE threads SET solved = 1, solved_at = datetime('now'), solved_by = ?, updated_at = datetime('now') WHERE id = ?`).bind(user.id, threadId).run();
    } else {
      await env.DB.prepare(`UPDATE threads SET solved = 0, solved_at = NULL, solved_by = NULL, accepted_post_id = NULL, updated_at = datetime('now') WHERE id = ?`).bind(threadId).run();
    }
    await env.DB.prepare(`INSERT INTO moderation_log (id, thread_id, author_id, action, reason) VALUES (?, ?, ?, ?, ?)`).bind(randomId(), threadId, user.id, action === 'solve' ? 'solve' : 'unsolve', action === 'solve' ? 'Thread marked solved' : 'Thread reopened').run();
    return json({ success: true, solved: action === 'solve' });
  }

  if (action === 'mark_read') {
    const notificationId = (body.notificationId || '').toString();
    if (!notificationId) return json({ success: false, error: 'missing_notification' }, 400);
    await env.DB.prepare(`UPDATE forum_notifications SET read_at = datetime('now') WHERE id = ? AND user_id = ?`).bind(notificationId, user.id).run();
    return json({ success: true });
  }

  return json({ success: false, error: 'unknown_action' }, 400);
}
