/**
 * GET /api/forum/search?q=...&limit=&cursor=
 * Real server-side search over D1 — titles, bodies, and categories.
 * Parameterized, bounded, paginated. Never returns hidden content.
 */
import { json } from '../../_lib/authz.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured', results: [] }, 503);

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim().slice(0, 120);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 1), 50);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

  if (!q) return json({ success: true, results: [], query: q });
  if (q.length < 2) return json({ success: false, error: 'query_too_short', results: [] }, 400);

  const like = `%${q.replace(/[%_]/g, (c) => '\\' + c)}%`;

  const { results } = await env.DB.prepare(
    `SELECT t.id, t.title, t.category, t.created_at, t.updated_at, t.solved_at, u.display_name AS author,
       (SELECT COUNT(*) FROM posts p WHERE p.thread_id = t.id AND p.hidden = 0) AS reply_count,
       substr(t.body, 1, 220) AS snippet
     FROM threads t JOIN users u ON u.id = t.author_id
     WHERE t.hidden = 0
       AND (t.title LIKE ? ESCAPE '\\' OR t.body LIKE ? ESCAPE '\\' OR t.category LIKE ? ESCAPE '\\')
     ORDER BY t.updated_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(like, like, like, limit, offset)
    .all();

  return json({ success: true, query: q, results, next_offset: results.length === limit ? offset + limit : null });
}
