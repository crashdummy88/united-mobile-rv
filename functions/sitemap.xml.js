/**
 * GET /sitemap.xml — dynamically generated so it always reflects reality.
 * /forum/, /forum-live/ and every /guide/ page are always listed (see functions/_middleware.js
 * and robots.txt for the noindex-everywhere-else policy). Individual forum
 * threads now have real server-rendered URLs (functions/forum/t/[id].js),
 * so every public, non-hidden thread gets its own <url> entry here too --
 * this is the P7 knowledge-engine piece: solved threads become permanent,
 * crawlable technical resources instead of dead ends behind client-side JS.
 */
import { GUIDE_URLS } from './_lib/guide-urls.js';

function xmlEscape(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function onRequestGet(context) {
  const { env } = context;
  const base = 'https://united-mobile-rv.pages.dev';

  let indexLastmod = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${base}/forum/`, changefreq: 'hourly', priority: '0.9' },
    { loc: `${base}/forum-live/`, changefreq: 'hourly', priority: '0.7' },
  ];
  // /guide/ is indexable (functions/_middleware.js INDEXABLE_PREFIXES) but
  // static, so its URL list is generated at commit time by
  // scripts/gen-guide-urls.mjs rather than discovered here.
  for (const g of GUIDE_URLS) {
    urls.push({
      loc: `${base}${g.path}`,
      lastmod: g.lastmod || undefined,
      changefreq: 'monthly',
      priority: g.path === '/guide/' ? '0.8' : '0.6',
    });
  }

  if (env.DB) {
    try {
      const row = await env.DB.prepare(`SELECT MAX(updated_at) AS t FROM threads WHERE hidden = 0`).first();
      if (row && row.t) indexLastmod = String(row.t).slice(0, 10);
    } catch {
      // fall back to today's date if D1 isn't reachable
    }

    try {
      const { results } = await env.DB.prepare(
        `SELECT id, updated_at, solved_at FROM threads WHERE hidden = 0 ORDER BY updated_at DESC LIMIT 1000`
      ).all();
      for (const t of results || []) {
        urls.push({
          loc: `${base}/forum/t/${encodeURIComponent(t.id)}`,
          lastmod: String(t.updated_at || indexLastmod).slice(0, 10),
          changefreq: 'weekly',
          priority: t.solved_at ? '0.8' : '0.6',
        });
      }
    } catch {
      // sitemap still works with just the two index pages if this query fails
    }
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url>\n    <loc>${xmlEscape(u.loc)}</loc>\n    <lastmod>${u.lastmod || indexLastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
      )
      .join('\n') +
    `\n</urlset>\n`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
    },
  });
}
