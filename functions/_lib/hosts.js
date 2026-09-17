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

export function isStagingHost(hostname) {
  return STAGING_HOSTS.includes(String(hostname || '').toLowerCase());
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
