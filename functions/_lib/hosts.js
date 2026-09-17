/**
 * Host-aware public origin for SEO tags.
 *
 * Staging (Architect lock):
 *   Hosts: staging.unitedmobilerv.com, united-mobile-rv-staging.pages.dev
 *   Public origin: https://staging.unitedmobilerv.com
 *   Never emit united-mobile-rv.pages.dev as canonical / og:url on staging.
 *
 * Book chrome is Square (https://united-mobile-rv-llc.square.site/) and
 * is owned by mesh-chrome / site.js — this module does not retarget Book.
 */

export const STAGING_PUBLIC_ORIGIN = 'https://staging.unitedmobilerv.com';
export const STAGING_HOSTS = [
  'staging.unitedmobilerv.com',
  'united-mobile-rv-staging.pages.dev',
];
export const FORUM_HOST = 'forum.unitedmobilerv.com';
export const FORUM_PUBLIC_ORIGIN = 'https://forum.unitedmobilerv.com';

export function isStagingHost(hostname) {
  return STAGING_HOSTS.includes(String(hostname || '').toLowerCase());
}

export function isForumHost(hostname) {
  return String(hostname || '').toLowerCase() === FORUM_HOST;
}

/**
 * BUG-X1: mothership / staging / pages.dev must not 200 the forum.
 * forum.unitedmobilerv.com keeps serving /forum/* (same Pages project).
 * /forum and /forum/ land on the forum host root; deeper HTML paths are
 * preserved so /forum/t/:id still hits the thread Function there.
 */
export function mothershipForumRedirectLocation(hostname, pathname) {
  if (isForumHost(hostname)) return null;
  const path = String(pathname || '');
  if (path.startsWith('/api/')) return null;
  if (path === '/go/forum' || path === '/go/forum/' || path.startsWith('/go/forum/')) return null;
  if (path === '/forum-live' || path === '/forum-live/' || path.startsWith('/forum-live/')) {
    return `${FORUM_PUBLIC_ORIGIN}/`;
  }
  if (path === '/forum' || path === '/forum/') {
    return `${FORUM_PUBLIC_ORIGIN}/`;
  }
  if (path.startsWith('/forum/')) {
    if (/\.[a-zA-Z0-9]{2,5}$/.test(path)) return null;
    return `${FORUM_PUBLIC_ORIGIN}${path}`;
  }
  return null;
}

export function publicOrigin(hostname) {
  const host = String(hostname || '').toLowerCase();
  if (isStagingHost(host)) return STAGING_PUBLIC_ORIGIN;
  if (!host) return STAGING_PUBLIC_ORIGIN;
  return `https://${host}`;
}

export function publicCanonicalUrl(requestOrUrl, pathname) {
  const url = typeof requestOrUrl === 'string'
    ? new URL(requestOrUrl)
    : new URL(requestOrUrl.url || requestOrUrl);
  const path = pathname != null ? pathname : url.pathname;
  return `${publicOrigin(url.hostname)}${path}`;
}

/**
 * Rewrite static/SSR canonical + og:url onto the staging custom domain.
 * Path-aware. Never emits united-mobile-rv.pages.dev (prod or staging).
 */
export function rewriteStagingSeoHtml(html, pathname) {
  const dest = `${STAGING_PUBLIC_ORIGIN}${pathname || '/'}`;
  let out = String(html || '');
  if (/<link\b[^>]*\brel=["']canonical["']/i.test(out)) {
    out = out.replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, `<link rel="canonical" href="${dest}">`);
  } else if (/<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, `<link rel="canonical" href="${dest}">\n</head>`);
  }
  if (/<meta\b[^>]*\bproperty=["']og:url["']/i.test(out)) {
    out = out.replace(/<meta\b[^>]*\bproperty=["']og:url["'][^>]*>/gi, `<meta property="og:url" content="${dest}">`);
  } else if (/<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, `<meta property="og:url" content="${dest}">\n</head>`);
  }
  return out;
}
