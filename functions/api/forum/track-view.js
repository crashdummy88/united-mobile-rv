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
  await env.DB.prepare('INSERT INTO thread_views (thread_id) VALUES (?)').bind(threadId).run();
  return json({ success: true });
}
