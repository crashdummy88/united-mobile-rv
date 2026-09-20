/**
 * Forum search query helpers (BUG-F3).
 *
 * Live search was a single LIKE '%<raw q>%' over title/body/category, so
 * "Victron inverter" missed real threads that mention both terms without
 * that exact adjacent phrase. Tokenize and AND the terms (SQLite LIKE is
 * case-insensitive for ASCII). Pins sort first among matches.
 */

export const FORUM_SEARCH_MAX_Q = 120;
export const FORUM_SEARCH_MIN_TOKEN = 2;
export const FORUM_SEARCH_MAX_TOKENS = 8;

export function normalizeForumQuery(q) {
  return String(q || '').trim().slice(0, FORUM_SEARCH_MAX_Q);
}

export function escapeLikeToken(token) {
  return String(token).replace(/[%_\\]/g, (c) => '\\' + c);
}

/**
 * Split a member query into search tokens.
 * - Quoted queries ("Victron inverter") stay one phrase.
 * - Otherwise split on whitespace / punctuation so brand+product works.
 * - Tokens shorter than 2 chars are dropped (same floor as the API).
 */
export function forumSearchTokens(q) {
  const normalized = normalizeForumQuery(q);
  if (!normalized) return [];

  const quoted = normalized.match(/^["“](.+)["”]$/);
  if (quoted) {
    const phrase = quoted[1].trim();
    return phrase.length >= FORUM_SEARCH_MIN_TOKEN ? [phrase] : [];
  }

  const tokens = normalized
    .split(/[\s\u00A0,|+/\\]+/)
    .map((t) => t.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, ''))
    .filter((t) => t.length >= FORUM_SEARCH_MIN_TOKEN);

  const seen = new Set();
  const unique = [];
  for (const t of tokens) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(t);
    if (unique.length >= FORUM_SEARCH_MAX_TOKENS) break;
  }

  if (unique.length) return unique;
  return normalized.length >= FORUM_SEARCH_MIN_TOKEN ? [normalized] : [];
}

export function buildForumSearchWhere(tokens) {
  const list = Array.isArray(tokens) ? tokens : [];
  const clauses = list.map(
    () => "(t.title LIKE ? ESCAPE '\\' OR t.body LIKE ? ESCAPE '\\' OR t.category LIKE ? ESCAPE '\\')"
  );
  const binds = [];
  for (const t of list) {
    const like = `%${escapeLikeToken(t)}%`;
    binds.push(like, like, like);
  }
  return { sql: clauses.join(' AND '), binds };
}

/** In-memory AND matcher that mirrors the SQL WHERE (for tests). */
export function threadMatchesForumSearch(thread, q) {
  const tokens = forumSearchTokens(q);
  if (!tokens.length) return false;
  const hay = `${thread.title || ''} ${thread.body || ''} ${thread.category || ''}`.toLowerCase();
  return tokens.every((t) => hay.includes(t.toLowerCase()));
}
