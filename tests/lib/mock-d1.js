/**
 * A tiny in-memory stand-in for Cloudflare D1's .prepare().bind().first()/
 * .run()/.all() interface -- just enough surface for the specific queries
 * the routes under test actually issue, matched by query text. Not a
 * general SQL engine; extend `queries` in the calling test if a new query
 * shape is needed.
 */
export function makeMockD1(state) {
  state.rate_limit_log = state.rate_limit_log || [];
  function prepare(sql) {
    let boundArgs = [];
    const stmt = {
      bind(...args) {
        boundArgs = args;
        return stmt;
      },
      async first() {
        if (/SELECT COUNT\(\*\) AS n FROM rate_limit_log/.test(sql)) {
          const [ip, key] = boundArgs;
          // Real query filters by a `datetime('now', ?)` window; this mock
          // doesn't parse the window clause, it just counts every logged
          // hit for (ip, key) -- tests control the count directly by how
          // many times they call the handler, which is enough to exercise
          // the max/limited behavior without reimplementing SQLite's date
          // math.
          const n = state.rate_limit_log.filter((r) => r.ip === ip && r.endpoint === key).length;
          return { n };
        }
        if (/SELECT banned FROM users WHERE id = \?/.test(sql)) {
          const u = state.users.find((u) => u.id === boundArgs[0]);
          return u ? { banned: u.banned ? 1 : 0 } : undefined;
        }
        if (/SELECT is_mod FROM users WHERE id = \?/.test(sql)) {
          const u = state.users.find((u) => u.id === boundArgs[0]);
          return u ? { is_mod: u.is_mod ? 1 : 0 } : undefined;
        }
        if (/SELECT id FROM posts WHERE id = \? AND hidden = 0/.test(sql)) {
          const p = (state.posts || []).find((p) => p.id === boundArgs[0] && !p.hidden);
          return p ? { id: p.id } : undefined;
        }
        if (/SELECT user_id FROM post_votes WHERE user_id = \? AND post_id = \?/.test(sql)) {
          const v = (state.post_votes || []).find(
            (v) => v.user_id === boundArgs[0] && v.post_id === boundArgs[1]
          );
          return v ? { user_id: v.user_id } : undefined;
        }
        if (/SELECT total_bytes FROM media_usage WHERE id = 1/.test(sql)) {
          return state.media_usage ? { total_bytes: state.media_usage.total_bytes } : undefined;
        }
        if (/SELECT id FROM threads WHERE id = \?/.test(sql)) {
          const t = (state.threads || []).find((t) => t.id === boundArgs[0]);
          return t ? { id: t.id } : undefined;
        }
        if (/SELECT id FROM posts WHERE id = \? AND thread_id = \?/.test(sql)) {
          const p = (state.posts || []).find((p) => p.id === boundArgs[0] && p.thread_id === boundArgs[1]);
          return p ? { id: p.id } : undefined;
        }
        if (/SELECT id FROM reports WHERE reporter_id = \?/.test(sql)) {
          const r = (state.reports || []).find(
            (r) => r.reporter_id === boundArgs[0] && r.thread_id === boundArgs[1] && r.status === 'open'
          );
          return r ? { id: r.id } : undefined;
        }
        throw new Error(`mock D1: unhandled .first() query: ${sql}`);
      },
      async run() {
        if (/INSERT INTO rate_limit_log/.test(sql)) {
          const [ip, endpoint] = boundArgs;
          state.rate_limit_log.push({ ip, endpoint });
          return { success: true };
        }
        if (/DELETE FROM rate_limit_log/.test(sql)) {
          return { success: true }; // opportunistic cleanup -- no-op is fine in tests
        }
        if (/INSERT INTO post_votes/.test(sql)) {
          state.post_votes = state.post_votes || [];
          state.post_votes.push({ user_id: boundArgs[0], post_id: boundArgs[1] });
          return { success: true };
        }
        if (/DELETE FROM post_votes/.test(sql)) {
          state.post_votes = (state.post_votes || []).filter(
            (v) => !(v.user_id === boundArgs[0] && v.post_id === boundArgs[1])
          );
          return { success: true };
        }
        if (/UPDATE media_usage SET total_bytes/.test(sql)) {
          state.media_usage = state.media_usage || { total_bytes: 0 };
          state.media_usage.total_bytes += boundArgs[0];
          return { success: true };
        }
        if (/INSERT INTO reports/.test(sql)) {
          const [id, reporter_id, thread_id, post_id, reason] = boundArgs;
          state.reports = state.reports || [];
          state.reports.push({ id, reporter_id, thread_id, post_id, reason, status: 'open' });
          return { success: true };
        }
        throw new Error(`mock D1: unhandled .run() query: ${sql}`);
      },
      async all() {
        throw new Error(`mock D1: unhandled .all() query: ${sql}`);
      },
    };
    return stmt;
  }
  return { prepare };
}

/** Tiny mock R2 bucket -- just enough for upload.js's env.MEDIA.put(). */
export function makeMockR2() {
  const stored = new Map();
  return {
    async put(key, stream, opts) {
      stored.set(key, { opts });
      return { key };
    },
    _stored: stored,
  };
}

/** A minimal fetch-compatible Request stand-in (Node 22 has global Headers/Request). */
export function makeRequest({ cookie, formData } = {}) {
  const headers = new Headers();
  if (cookie) headers.set('Cookie', cookie);
  return {
    headers,
    async formData() {
      if (!formData) throw new Error('no formData configured on mock request');
      return formData;
    },
  };
}
