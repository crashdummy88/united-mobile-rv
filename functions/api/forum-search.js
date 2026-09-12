function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=30',
    },
  });
}

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured', threads: [] }, 503);

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim().slice(0, 120);
  const category = (url.searchParams.get('category') || '').trim().slice(0, 40);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '30', 10) || 30, 1), 50);

  if (!q && !category) return json({ success: true, threads: [] });

  const pattern = `%${q.replace(/[%_]/g, '')}%`;
  let sql = `SELECT t.id, t.title, t.body, t.category, t.created_at, t.updated_at, t.pinned, t.solved,
    t.image_keys, u.display_name AS author, u.avatar_url AS author_avatar,
    (SELECT COUNT(*) FROM posts p WHERE p.thread_id = t.id AND p.hidden = 0) AS reply_count
    FROM threads t JOIN users u ON u.id = t.author_id
    WHERE t.hidden = 0`;
  const args = [];

  if (q) {
    sql += ` AND (LOWER(t.title) LIKE LOWER(?) OR LOWER(t.body) LIKE LOWER(?) OR LOWER(t.category) LIKE LOWER(?))`;
    args.push(pattern, pattern, pattern);
  }
  if (category && category !== 'all') {
    sql += ` AND t.category = ?`;
    args.push(category);
  }

  sql += ` ORDER BY t.solved DESC, t.pinned DESC, t.updated_at DESC LIMIT ?`;
  args.push(limit);

  const { results } = await env.DB.prepare(sql).bind(...args).all();
  return json({ success: true, threads: results, query: q, category: category || 'all' });
}
