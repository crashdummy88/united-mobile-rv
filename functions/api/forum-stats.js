/**
 * GET /api/forum-stats — public, read-only. Real counts only, no fabricated
 * numbers: member count, thread count, reply count, and last-activity time.
 */
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=30',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured' }, 503);

  const members = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM users WHERE provider != 'system'`
  ).first();
  const threads = await env.DB.prepare(`SELECT COUNT(*) AS n FROM threads WHERE hidden = 0`).first();
  const posts = await env.DB.prepare(`SELECT COUNT(*) AS n FROM posts WHERE hidden = 0`).first();
  const lastActivity = await env.DB.prepare(
    `SELECT MAX(updated_at) AS t FROM threads WHERE hidden = 0`
  ).first();

  return json({
    success: true,
    members: members ? members.n : 0,
    threads: threads ? threads.n : 0,
    replies: posts ? posts.n : 0,
    last_activity: lastActivity ? lastActivity.t : null,
  });
}
