/**
 * GET /sitemap.xml — dynamically generated so it always reflects reality.
 * Today only /forum/ and /forum-live/ are indexable (see functions/_middleware.js
 * and robots.txt), so those are the only entries. Once individual forum threads
 * get their own server-rendered URLs, add a <url> per thread here, pulled from
 * the same D1 query pattern as /api/forum-stats.
 */
function xmlEscape(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function onRequestGet(context) {
  const { env } = context;
  const base = 'https://united-mobile-rv.pages.dev';

  let lastmod = new Date().toISOString().slice(0, 10);
  if (env.DB) {
    try {
      const row = await env.DB.prepare(
        `SELECT MAX(updated_at) AS t FROM threads WHERE hidden = 0`
      ).first();
      if (row && row.t) lastmod = String(row.t).slice(0, 10);
    } catch {
      // fall back to today's date if D1 isn't reachable
    }
  }

  const urls = [
    { loc: `${base}/forum/`, changefreq: 'hourly', priority: '0.9' },
    { loc: `${base}/forum-live/`, changefreq: 'hourly', priority: '0.7' },
  ];

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url>\n    <loc>${xmlEscape(u.loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
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
