/**
 * BreadcrumbList + light WebSite/Organization JSON-LD for shop / forum / book.
 *
 * Product pie (Matt 2026-09-20):
 *   United Mobile RV (https://unitedmobilerv.com/) → Land → optional section → page
 *   shop home:  Home → Shop
 *   /shop/:     Home → Shop → Systems Shop (or current title)
 *   forum home: Home → Forum
 *   book home:  Home → Book
 *
 * Land homes also emit WebSite (name per land) + Organization pointing at
 * the WP apex. Crumb names are plain UTF-8 (no &#8217; leftovers).
 *
 * Implemented once here; island SSR and _middleware.js reuse it.
 * Does not change chrome Book (Square) or #189 canonical rules.
 */

import {
  isLandHost,
  normalizeWpPath,
  resolveLandCanonical,
  SHOP_HOST,
  FORUM_HOST,
  BOOK_HOST,
  WP_ORIGIN,
} from './canonical.js';

export const HOME_CRUMB = { name: 'Home', item: `${WP_ORIGIN}/` };
export const ORG_ID = `${WP_ORIGIN}/#organization`;
export const ORG_NAME = 'United Mobile RV LLC';

export const LAND_SITES = {
  [SHOP_HOST]: {
    key: 'shop',
    name: 'Shop',
    siteName: 'United Mobile RV Shop',
    home: `https://${SHOP_HOST}/`,
  },
  [FORUM_HOST]: {
    key: 'forum',
    name: 'Forum',
    siteName: 'United Mobile RV Forum',
    home: `https://${FORUM_HOST}/`,
  },
  [BOOK_HOST]: {
    key: 'book',
    name: 'Book',
    siteName: 'United Mobile RV Book',
    home: `https://${BOOK_HOST}/`,
  },
};

export function toUrl(urlOrRequest) {
  if (urlOrRequest instanceof URL) return urlOrRequest;
  if (typeof Request !== 'undefined' && urlOrRequest instanceof Request) {
    return new URL(urlOrRequest.url);
  }
  if (urlOrRequest && typeof urlOrRequest.url === 'string') {
    return new URL(urlOrRequest.url);
  }
  return new URL(String(urlOrRequest));
}

export function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&amp;/g, '&');
}

function stripTags(value) {
  return decodeHtmlEntities(String(value || '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

export function pageTitleFromHtml(html) {
  if (typeof html !== 'string') return '';
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  let raw = title ? title[1] : '';
  if (!raw) {
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    raw = h1 ? h1[1] : '';
  }
  let name = stripTags(raw);
  name = name.replace(/^\s*\[Solved\]\s*/i, '');
  name = name.replace(/\s*[|\u2013\u2014–—-]\s*United Mobile RV.*$/i, '');
  return name.trim();
}

function humanizeSegment(segment) {
  const cleaned = decodeURIComponent(String(segment || '').replace(/-/g, ' ')).trim();
  if (!cleaned) return '';
  return cleaned.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function isLandHomePath(hostname, pathname) {
  const land = LAND_SITES[String(hostname || '').toLowerCase()];
  if (!land) return false;
  const path = normalizeWpPath(pathname);
  if (path === '/') return true;
  if (land.key === 'forum' && (path === '/forum/' || path === '/forum-live/')) return true;
  return false;
}

function landCanonical(url) {
  return resolveLandCanonical(url) || `https://${url.hostname}${url.pathname}`;
}

/**
 * Trail for a shop/forum/book URL. First crumb is always Home on the apex.
 */
export function buildLandCrumbs(urlOrRequest, { pageName, html } = {}) {
  const url = toUrl(urlOrRequest);
  const host = String(url.hostname || '').toLowerCase();
  const land = LAND_SITES[host];
  if (!land) return [];

  const path = normalizeWpPath(url.pathname);
  const title = String(pageName || pageTitleFromHtml(html) || '').trim();
  const crumbs = [
    { ...HOME_CRUMB },
    { name: land.name, item: land.home },
  ];

  if (isLandHomePath(host, path)) return crumbs;

  if (land.key === 'shop') {
    if (path === '/shop/') {
      crumbs.push({ name: title || 'Systems Shop', item: landCanonical(url) });
      return crumbs;
    }
    if (path.startsWith('/shop/p/') || path.startsWith('/shop/cart')) {
      crumbs.push({ name: 'Systems Shop', item: `${land.home}shop/` });
      crumbs.push({ name: title || (path.startsWith('/shop/cart') ? 'Cart' : 'Product'), item: landCanonical(url) });
      return crumbs;
    }
  }

  if (land.key === 'forum') {
    if (path.startsWith('/forum/t/')) {
      crumbs.push({ name: title || 'Thread', item: landCanonical(url) });
      return crumbs;
    }
    if (path.startsWith('/forum/member/')) {
      crumbs.push({ name: title || 'Member', item: landCanonical(url) });
      return crumbs;
    }
  }

  if (land.key === 'book' && path.startsWith('/book-service/thank-you')) {
    crumbs.push({ name: title || 'Thank you', item: landCanonical(url) });
    return crumbs;
  }

  const fallback = title || humanizeSegment(path.replace(/\/$/, '').split('/').pop());
  if (fallback && fallback !== land.name) {
    crumbs.push({ name: fallback, item: landCanonical(url) });
  }
  return crumbs;
}

function organizationNode() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: ORG_NAME,
    url: `${WP_ORIGIN}/`,
  };
}

function websiteNode(land) {
  return {
    '@type': 'WebSite',
    name: land.siteName,
    url: land.home,
    publisher: { '@id': ORG_ID },
  };
}

function breadcrumbNode(crumbs) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  };
}

export function buildLandJsonLd(urlOrRequest, opts = {}) {
  const url = toUrl(urlOrRequest);
  const host = String(url.hostname || '').toLowerCase();
  const land = LAND_SITES[host];
  if (!land) return null;

  const crumbs = buildLandCrumbs(url, opts);
  if (!crumbs.length) return null;

  if (isLandHomePath(host, url.pathname)) {
    return {
      '@context': 'https://schema.org',
      '@graph': [organizationNode(), websiteNode(land), breadcrumbNode(crumbs)],
    };
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [breadcrumbNode(crumbs)],
  };
}

export function stringifyJsonLd(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function landJsonLdSnippet(urlOrRequest, opts = {}) {
  const data = buildLandJsonLd(urlOrRequest, opts);
  if (!data) return '';
  return `<script type="application/ld+json">${stringifyJsonLd(data)}</script>`;
}

function escHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/**
 * Subtle visible trail. Lives between header and main on purpose:
 * site.js stamps chrome / in-main "Book" labels to Square and must
 * not rewrite the Book *land* crumb (book.unitedmobilerv.com).
 */
export function landCrumbsNav(urlOrRequest, opts = {}) {
  const crumbs = buildLandCrumbs(urlOrRequest, opts);
  if (crumbs.length < 2) return '';
  const items = crumbs.map((crumb, i) => {
    const last = i === crumbs.length - 1;
    if (last) {
      return `<li aria-current="page">${escHtml(crumb.name)}</li>`;
    }
    return `<li><a href="${escHtml(crumb.item)}">${escHtml(crumb.name)}</a></li>`;
  }).join('');
  return `<nav class="land-crumbs" aria-label="Breadcrumb" data-land-crumbs><div class="wrap"><ol>${items}</ol></div></nav>`;
}

export function htmlHasBreadcrumbList(html) {
  return typeof html === 'string' && /"@type"\s*:\s*"BreadcrumbList"/.test(html);
}

export function htmlHasLandCrumbsNav(html) {
  return typeof html === 'string' && /data-land-crumbs/.test(html);
}

export function injectLandJsonLd(html, urlOrRequest) {
  if (typeof html !== 'string' || htmlHasBreadcrumbList(html)) return html;
  const url = toUrl(urlOrRequest);
  if (!isLandHost(url.hostname)) return html;
  const snippet = landJsonLdSnippet(url, { html });
  if (!snippet) return html;
  const close = html.match(/<\/head>/i);
  if (!close) return html;
  return `${html.slice(0, close.index)}${snippet}\n${html.slice(close.index)}`;
}

export function injectLandCrumbsNav(html, urlOrRequest) {
  if (typeof html !== 'string' || htmlHasLandCrumbsNav(html)) return html;
  const url = toUrl(urlOrRequest);
  if (!isLandHost(url.hostname)) return html;
  const nav = landCrumbsNav(url, { html });
  if (!nav) return html;
  const header = html.match(/<\/header>/i);
  if (header) {
    const end = header.index + header[0].length;
    return `${html.slice(0, end)}\n${nav}${html.slice(end)}`;
  }
  const main = html.match(/<main\b[^>]*>/i);
  if (main) {
    return `${html.slice(0, main.index)}${nav}\n${html.slice(main.index)}`;
  }
  return html;
}

export function injectLandSchema(html, urlOrRequest) {
  return injectLandCrumbsNav(injectLandJsonLd(html, urlOrRequest), urlOrRequest);
}
