/**
 * Host-aware canonical + og:url for shop. / forum. / book.
 *
 * Rules (Matt 2026-09-20):
 *   1) Land-unique product UI stays self-canonical on the request host
 *      (shop catalog/cart, forum community, book suite). Never WP, never
 *      *.pages.dev.
 *   2) Shared / thin-mirror marketing HTML on those hosts points at the
 *      live WordPress apex URL when a real WP path is known (same path,
 *      or a documented remap). Do not invent WP slugs.
 *   3) If WP does not have the page, self-canonical on the land host.
 *
 * WP same-path allowlist is STATIC_PAGES minus land-unique paths and
 * minus unverified leftovers. Verified 2026-09-20 via wpcom pages.list
 * on unitedmobilerv.com (184 published pages).
 */

import { STATIC_PAGES } from './static-pages.js';

export const WP_ORIGIN = 'https://unitedmobilerv.com';
export const PAGES_DEV_HOST = 'united-mobile-rv.pages.dev';

export const SHOP_HOST = 'shop.unitedmobilerv.com';
export const FORUM_HOST = 'forum.unitedmobilerv.com';
export const BOOK_HOST = 'book.unitedmobilerv.com';

export const LAND_HOSTS = [SHOP_HOST, FORUM_HOST, BOOK_HOST];

/** Land-unique even though WP also publishes a /book-service/ page. */
const LAND_UNIQUE_EXACT = new Set([
  '/',
  '/book-service/',
  '/book-service/thank-you/',
]);

/**
 * STATIC_PAGES leftovers that are not published WP pages (2026-09-20
 * pages.list). Self-canonical rather than invent a 404 WP URL.
 */
const UNVERIFIED_WP_PATHS = new Set([
  '/terms-of-use/',
]);

/**
 * Mothership path → published WP path when the slugs differ.
 * /lithium-battery-buying-guide/ is a top-level mothership file; WP
 * publishes it under the /guide/ hub (page 2606).
 */
export const WP_PATH_REMAP = {
  '/lithium-battery-buying-guide/': '/guide/lithium-battery-buying-guide/',
};

const WP_SAME_PATHS = new Set(
  STATIC_PAGES
    .map((p) => p.loc)
    .filter((loc) => !LAND_UNIQUE_EXACT.has(loc)
      && !UNVERIFIED_WP_PATHS.has(loc)
      && !WP_PATH_REMAP[loc])
);

export function isLandHost(hostname) {
  return LAND_HOSTS.includes(String(hostname || '').toLowerCase());
}

export function normalizeWpPath(pathname) {
  let path = String(pathname || '/');
  try { path = decodeURIComponent(path); } catch { /* keep raw */ }
  if (!path.startsWith('/')) path = `/${path}`;
  path = path.replace(/\/index\.html$/i, '/');
  if (path !== '/' && !path.endsWith('/')) {
    const last = path.split('/').pop() || '';
    if (!/\.[a-z0-9]{2,8}$/i.test(last)) path += '/';
  }
  return path;
}

export function isLandUniquePath(pathname) {
  const path = normalizeWpPath(pathname);
  if (LAND_UNIQUE_EXACT.has(path)) return true;
  if (path === '/shop/' || path.startsWith('/shop/')) return true;
  if (path === '/forum/' || path.startsWith('/forum/')) return true;
  if (path === '/forum-live/' || path.startsWith('/forum-live/')) return true;
  return false;
}

export function wpPathFor(pathname) {
  const path = normalizeWpPath(pathname);
  if (isLandUniquePath(path)) return null;
  if (WP_PATH_REMAP[path]) return WP_PATH_REMAP[path];
  if (WP_SAME_PATHS.has(path)) return path;
  return null;
}

function selfHref(hostname, url) {
  const path = url.pathname === '/' ? '/' : url.pathname.replace(/\/index\.html$/i, '/') || '/';
  // Shop sale catalog is parts-only. Leftover services-tab query
  // bookmarks self-canonical to the parts listing, not a second catalog.
  return `https://${hostname}${path}`;
}

/**
 * Canonical href for a shop/forum/book request. Returns null on any
 * other host so middleware leaves pages.dev / apex HTML alone.
 */
export function resolveLandCanonical(urlOrString) {
  const url = typeof urlOrString === 'string' ? new URL(urlOrString) : urlOrString;
  const host = String(url.hostname || '').toLowerCase();
  if (!isLandHost(host)) return null;

  if (isLandUniquePath(url.pathname)) {
    return selfHref(host, url);
  }

  const wpPath = wpPathFor(url.pathname);
  if (wpPath) return `${WP_ORIGIN}${wpPath}`;

  return selfHref(host, url);
}

function escAttr(value) {
  return String(value || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

const CANONICAL_TAG_RE = /<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i;
const OG_URL_TAG_RE = /<meta\b[^>]*\bproperty\s*=\s*["']og:url["'][^>]*>/i;

/**
 * Rewrite (or insert) rel=canonical. Update og:url only when already
 * present — do not invent an og:url tag.
 */
export function rewriteHtmlCanonicals(html, canonicalHref) {
  if (typeof html !== 'string' || !canonicalHref) return html;
  const href = escAttr(canonicalHref);
  let out = html;

  if (CANONICAL_TAG_RE.test(out)) {
    out = out.replace(CANONICAL_TAG_RE, `<link rel="canonical" href="${href}">`);
  } else {
    const close = out.match(/<\/head>/i);
    if (close) {
      out = `${out.slice(0, close.index)}<link rel="canonical" href="${href}">\n${out.slice(close.index)}`;
    }
  }

  if (OG_URL_TAG_RE.test(out)) {
    out = out.replace(OG_URL_TAG_RE, `<meta property="og:url" content="${href}">`);
  }

  return out;
}

export function isHtmlContentType(contentType) {
  return /text\/html/i.test(String(contentType || ''));
}
