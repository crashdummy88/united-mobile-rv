/**
 * Cloudflare zone traffic + D1 engagement, as a single reusable module --
 * built 2026-09-15 so this data is a real API instead of hand-run GraphQL
 * queries each time someone wants a traffic snapshot.
 *
 * Traffic half is dormant until CF_ANALYTICS_TOKEN + CF_ZONE_ID are set
 * (same safe-by-default pattern as _lib/square.js): a Cloudflare API
 * token scoped to Zone > Analytics > Read on unitedmobilerv.com only --
 * NOT wrangler's own OAuth login, which is account-wide and the wrong
 * credential to put in a Worker secret. Create it at
 * dash.cloudflare.com/profile/api-tokens -> Create Token -> "Read
 * analytics and logs" template, scoped to this one zone, then:
 *   wrangler pages secret put CF_ANALYTICS_TOKEN --project-name=united-mobile-rv
 *   wrangler pages secret put CF_ZONE_ID --project-name=united-mobile-rv
 * (CF_ZONE_ID isn't secret, but keeping it alongside the token means one
 * project can point at a different zone without a code change.)
 *
 * The D1 half needs no token -- it uses the existing DB binding, same as
 * every other function in this repo.
 */

function isTrafficConfigured(env) {
  return !!(env.CF_ANALYTICS_TOKEN && env.CF_ZONE_ID);
}

/**
 * Zone-level traffic for the last N days (default 7): requests, bytes
 * served, bytes served from cache, unique IPs. Same GraphQL dataset and
 * shape as the Cloudflare dashboard's own "Traffic" export CSVs --
 * cross-checked against real exports on 2026-09-14/15, matched exactly.
 */
export async function getZoneTraffic(env, days = 7) {
  if (!isTrafficConfigured(env)) return { configured: false };

  const until = new Date();
  const since = new Date(until.getTime() - days * 24 * 3600 * 1000);
  const fmt = (d) => d.toISOString().slice(0, 10);

  const query = `
    query {
      viewer {
        zones(filter: { zoneTag: "${env.CF_ZONE_ID}" }) {
          httpRequests1dGroups(
            limit: ${days + 1}
            filter: { date_geq: "${fmt(since)}", date_leq: "${fmt(until)}" }
            orderBy: [date_ASC]
          ) {
            dimensions { date }
            sum { requests pageViews bytes cachedBytes threats }
            uniq { uniques }
          }
        }
      }
    }`;

  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.CF_ANALYTICS_TOKEN}`,
    },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (!res.ok || data.errors?.length) {
    throw new Error(`Cloudflare Analytics request failed: ${data.errors?.[0]?.message || res.statusText}`);
  }

  const rows = data.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];
  return {
    configured: true,
    days: rows.map((r) => ({
      date: r.dimensions.date,
      requests: r.sum.requests,
      pageViews: r.sum.pageViews,
      bytes: r.sum.bytes,
      cachedBytes: r.sum.cachedBytes,
      threats: r.sum.threats,
      uniques: r.uniq.uniques,
    })),
  };
}

/**
 * Real engagement numbers from D1 -- forum/shop/portal. No token needed,
 * just the existing DB (umrt_forum) and PORTAL_DB bindings.
 */
export async function getEngagement(env) {
  const out = { forum: null, shop: null, portal: null };

  if (env.DB) {
    const forum = await env.DB.prepare(
      `SELECT COUNT(*) AS threads, SUM(pinned) AS pinned, MAX(updated_at) AS last_activity FROM threads WHERE hidden = 0`
    ).first();
    const users = await env.DB.prepare(`SELECT COUNT(*) AS n FROM users`).first();
    const shop = await env.DB.prepare(
      `SELECT (SELECT COUNT(*) FROM products WHERE active=1) AS active_products, (SELECT COUNT(*) FROM quote_requests) AS quote_requests`
    ).first();
    out.forum = { threads: forum.threads, pinned: forum.pinned, users: users.n, last_activity: forum.last_activity };
    out.shop = shop;
  }

  if (env.PORTAL_DB) {
    const portal = await env.PORTAL_DB.prepare(
      `SELECT (SELECT COUNT(*) FROM jobs) AS jobs, (SELECT COUNT(*) FROM users) AS users`
    ).first();
    out.portal = portal;
  }

  return out;
}
