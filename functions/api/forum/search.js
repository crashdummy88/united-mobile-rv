/**
 * GET /api/forum/search?q=...&limit=&offset=
 * Real server-side search over D1 — titles, bodies, and categories.
 * Multi-word queries AND their tokens (BUG-F3). Pins sort first among
 * matches so Tech pins and recent threads are both findable. Parameterized,
 * bounded, paginated. Never returns hidden / archived seed-pin spam.
 */
import { json } from '../../_lib/authz.js';
import { publicThreadSql } from '../../_lib/forum-growth.js';
import { buildForumSearchWhere, forumSearchTokens, normalizeForumQuery } from '../../_lib/forum-search.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured', results: [] }, 503);

  const url = new URL(request.url);
  const q = normalizeForumQuery(url.searchParams.get('q'));
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 1), 50);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

  if (!q) return json({ success: true, results: [], query: q, tokens: [] });
  const tokens = forumSearchTokens(q);
  if (!tokens.length) return json({ success: false, error: 'query_too_short', results: [] }, 400);

  const { sql: whereSql, binds } = buildForumSearchWhere(tokens);

  const { results } = await env.DB.prepare(
    `SELECT t.id, t.title, t.category, t.created_at, t.updated_at, t.solved_at, t.pinned, u.display_name AS author,
       (SELECT COUNT(*) FROM posts p WHERE p.thread_id = t.id AND p.hidden = 0) AS reply_count,
       substr(t.body, 1, 220) AS snippet
     FROM threads t JOIN users u ON u.id = t.author_id
     WHERE ${publicThreadSql('t')}
       AND ${whereSql}
     ORDER BY t.pinned DESC, t.updated_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(...binds, limit, offset)
    .all();

  return json({ success: true, query: q, tokens, results, next_offset: results.length === limit ? offset + limit : null });
}
