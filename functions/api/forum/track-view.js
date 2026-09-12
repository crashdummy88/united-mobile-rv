import { checkRateLimit } from '../../_lib/rate-limit.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ success: false, error: 'invalid_json' }, 400); }
  const threadId = (body.threadId || '').toString().trim().slice(0, 100);
  if (!threadId) return json({ success: false, error: 'missing_thread_id' }, 400);
  const thread = await env.DB.prepare('SELECT id FROM threads WHERE id = ? AND hidden = 0').bind(threadId).first();
  if (!thread) return json({ success: false, error: 'not_found' }, 404);

  // Per-thread, per-IP rate limit to stop scripted view-count inflation.
  // Silent success on limit -- never tip off an attacker, never block a
  // real visitor from actually viewing the thread.
  const rl = await checkRateLimit(env, request, { max: 1, windowMinutes: 10, key: `track-view:${threadId}` });
  if (rl.limited) return json({ success: true });

  await env.DB.prepare('INSERT INTO thread_views (thread_id) VALUES (?)').bind(threadId).run();
  return json({ success: true });
}
