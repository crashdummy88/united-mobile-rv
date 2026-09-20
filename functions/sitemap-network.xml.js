/**
 * GET /sitemap-network.xml -- a cross-property <sitemapindex>, added
 * 2026-09-15. UMRT's public footprint spans 10 separate repos/Cloudflare
 * Pages projects (see the "Architecture principle" note in project
 * memory), each with its own independent sitemap.xml -- there was never
 * a single place that listed them all together.
 *
 * Only properties that are BOTH publicly crawlable (robots.txt: Allow /)
 * AND already serve a real sitemap.xml are listed here. Deliberately
 * excluded, not missing by oversight:
 *   - portal.unitedmobilerv.com, umrt-pay.pages.dev, umrt-quote.pages.dev
 *     -- all three ship `Disallow: /` in their own robots.txt on purpose
 *     (login-gated customer dashboard, a payment page, and a tool with a
 *     fully-blocked robots.txt respectively). Listing a sitemap for a
 *     robots.txt-blocked property would contradict that property's own
 *     declared policy, not fix a gap.
 *
 * Known open issue (not fixed here, flagged for a real decision): go.
 * and areas. both declare `Allow: /` + a real Sitemap: in robots.txt,
 * but their _headers file unconditionally sends X-Robots-Tag: noindex --
 * a real contradiction between the two signals. Left as-is pending a
 * decision on which one reflects the actual intent.
 *
 * Mothership customer lands use shop./forum. custom hosts (never
 * united-mobile-rv.pages.dev). book. has no sitemap.xml (middleware
 * 301s it to /), so it is not listed.
 *
 * This file is static/hand-maintained, same reasoning as _lib/static-
 * pages.js -- add a line here when a new property gets a real sitemap.
 */
const NETWORK_SITEMAPS = [
  'https://shop.unitedmobilerv.com/sitemap.xml',
  'https://forum.unitedmobilerv.com/sitemap.xml',
  'https://docs.unitedmobilerv.com/sitemap.xml',
  'https://software.unitedmobilerv.com/sitemap.xml',
  'https://status.unitedmobilerv.com/sitemap.xml',
  'https://umrt-go.pages.dev/sitemap.xml',
  'https://umrt-areas.pages.dev/sitemap.xml',
];

export async function onRequestGet() {
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    NETWORK_SITEMAPS.map((loc) => `  <sitemap>\n    <loc>${loc}</loc>\n  </sitemap>`).join('\n') +
    `\n</sitemapindex>\n`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
