/**
 * Shared robots.txt body for shop / forum / book (same Pages project).
 *
 * Matt/ADMIN lock 2026-09-20:
 *   - User-agent: * Allow: /
 *   - Named AI crawlers each Allow: / (NOT /forum/ only — a more-specific
 *     record overrides *, so a forum-only allowlist blocks shop/book/guides)
 *   - Sitemap: live custom hosts only, NEVER united-mobile-rv.pages.dev
 *   - Indexing is separate: X-Robots-Tag / meta robots stay in
 *     functions/_middleware.js and may still noindex some paths
 *
 * Book host does not serve /sitemap.xml (middleware 301s it to /), so
 * book.unitedmobilerv.com gets no Sitemap line.
 */

export const AI_CRAWLERS = [
  'GPTBot',
  'ClaudeBot',
  'Google-Extended',
  'PerplexityBot',
  'Applebot-Extended',
  'Amazonbot',
  'Bytespider',
];

export const SHOP_SITEMAP = 'https://shop.unitedmobilerv.com/sitemap.xml';
export const FORUM_SITEMAP = 'https://forum.unitedmobilerv.com/sitemap.xml';

export const SHOP_HOST = 'shop.unitedmobilerv.com';
export const FORUM_HOST = 'forum.unitedmobilerv.com';
export const BOOK_HOST = 'book.unitedmobilerv.com';

export function sitemapsForHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  if (host === SHOP_HOST) return [SHOP_SITEMAP];
  if (host === FORUM_HOST) return [FORUM_SITEMAP];
  if (host === BOOK_HOST) return [];
  // preview / pages.dev / unknown: advertise live customer lands only
  return [SHOP_SITEMAP, FORUM_SITEMAP];
}

export function renderRobotsTxt(hostname) {
  const lines = [
    'User-agent: *',
    'Allow: /',
    '',
    '# Crawl allowance is open on every customer land. Indexing is separate:',
    '# X-Robots-Tag / meta robots (functions/_middleware.js) may still noindex.',
    '# Sitemap lines use live custom hosts only — never *.pages.dev.',
    '',
  ];

  for (const ua of AI_CRAWLERS) {
    lines.push(`User-agent: ${ua}`, 'Allow: /', '');
  }

  for (const loc of sitemapsForHost(hostname)) {
    lines.push(`Sitemap: ${loc}`);
  }

  return lines.join('\n').replace(/\n+$/, '') + '\n';
}
