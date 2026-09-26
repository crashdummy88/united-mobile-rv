import { SQUARE_BOOK_URL } from './_lib/mesh-chrome.js';
import { resolveCentralIdentity } from './_lib/central-identity.js';
import { injectClarityOnce } from './_lib/clarity.js';
import {
  isLandHost,
  isHtmlContentType,
  resolveLandCanonical,
  rewriteHtmlCanonicals,
} from './_lib/canonical.js';
import { injectLandSchema } from './_lib/jsonld.js';

/**
 * Sets X-Robots-Tag exactly once per response, path-aware.
 * Replaces the old _headers-based approach: Cloudflare Pages merges
 * X-Robots-Tag across every matching _headers block instead of letting a
 * more specific path win, so a blanket "noindex" on /* and an "index" on
 * /forum/* both got sent at once — and per Google's docs, duplicate
 * X-Robots-Tag headers are combined as a union, so noindex always won
 * regardless of the other value. This middleware builds a single clean
 * header on every response instead.
 */
// /guide/ added 2026-09-14: the 20-category guide reorg is done and per
// the business doc this content is meant to be indexed, but it was left
// off this list -- confirmed via live curl that it was still noindex.
// /shop/ added 2026-09-16: the real product catalog at shop.unitedmobilerv.com/shop/
// was still noindex,follow like the cart/checkout utility paths around it, but
// it's genuine public commercial content -- same category as /forum/ and
// /guide/ above, not a utility page. Confirmed with Matt before flipping it.
// This allowlist is now only for pages.dev / preview / unknown hosts.
const INDEXABLE_PREFIXES = ['/forum/', '/forum-live/', '/guide/', '/shop/'];

// Apex cutover prep, 2026-09-15: this project's own robots.txt has said
// since 2026-09-10 that "mothership pages.dev is noindex... live convert
// lives on unitedmobilerv.com" -- the intent to index everything once the
// real domain points here was already decided, just never implemented as
// actual host-aware logic until now. Once unitedmobilerv.com/www resolve
// here, INDEXABLE_PREFIXES above (a narrow allowlist, correct for the raw
// pages.dev host) no longer applies -- on the apex hosts we index
// everything BY DEFAULT and explicitly carve out the few paths that
// aren't real content, the reverse of the allowlist model.
const APEX_HOSTS = ['unitedmobilerv.com', 'www.unitedmobilerv.com'];

// Matt SEO lock 2026-09-20: shop./forum. are the live customer lands.
// Their homepages (`/`) rewrite to /shop/ and /forum/ (functions/index.js)
// but the request path stays `/`, so the old INDEXABLE_PREFIXES allowlist
// never matched and sent noindex on the lands themselves. These hosts
// now index-by-default like apex. pages.dev stays on the allowlist
// (soft-launch / non-canonical). book.unitedmobilerv.com is not a land:
// every path 301s to Square before a page is served.
const CUSTOM_LAND_HOSTS = [
  'shop.unitedmobilerv.com',
  'forum.unitedmobilerv.com',
];

// Shared utility carve-outs for index-by-default hosts (apex + customer
// lands) and as a safety net on the pages.dev allowlist branch. Cart is
// a utility page, never real content -- adding '/shop/' to INDEXABLE
// on 2026-09-16 briefly made /shop/cart index,follow too.
const UTILITY_NOINDEX_PREFIXES = ['/api/', '/shop/cart', '/forum/mod/'];

function isStagingHost(hostname) {
  return hostname === 'staging.unitedmobilerv.com' || hostname.startsWith('staging.');
}

function pathHasPrefix(path, prefix) {
  if (prefix.endsWith('/')) {
    return path === prefix.slice(0, -1) || path.startsWith(prefix);
  }
  return path === prefix || path.startsWith(`${prefix}/`);
}

function isUtilityNoindex(path) {
  return UTILITY_NOINDEX_PREFIXES.some((p) => pathHasPrefix(path, p));
}

function isIndexable(hostname, path) {
  if (isStagingHost(hostname)) return false;
  if (APEX_HOSTS.includes(hostname) || CUSTOM_LAND_HOSTS.includes(hostname)) {
    return !isUtilityNoindex(path);
  }
  return INDEXABLE_PREFIXES.some((p) => pathHasPrefix(path, p)) && !isUtilityNoindex(path);
}

// Files Google fetches as *resources*, not pages -- a noindex X-Robots-Tag
// on these makes Google Search Console refuse to process them at all
// ("Sitemap could not be read"), even though the XML/text body is fine.
const ROBOTS_HEADER_EXEMPT = ['/sitemap.xml', '/robots.txt'];

// shop.unitedmobilerv.com should only ever serve the shop -- not the whole
// site. Cloudflare Pages serves one project's entire output to every custom
// domain attached to it, so without this gate every page on the site was
// reachable at shop.unitedmobilerv.com/<any-path> (found 2026-09-13).
// Everything the shop actually needs is listed explicitly; anything else on
// this host redirects to /shop/ instead of exposing the full site here.
// '/' is deliberately left off this list -- it already gets redirected to
// /shop/ by the HOST_HOME_REDIRECTS logic below/in functions/index.js, so
// it just falls through to that unchanged.
const SHOP_HOST = 'shop.unitedmobilerv.com';
const SHOP_ALLOWED_EXACT = ['/', '/favicon.png', '/robots.txt', '/sitemap.xml'];
// /book-service/ added 2026-09-15: the shop's own hero copy already links
// to it ("Tell us the problem" -> Matt specs it for you) as a deliberate
// browse-to-conversion path, same as the header's Book button -- it was
// being caught by this same lockdown and silently bouncing back to /shop/,
// which is a bug, not the "don't let people wander off" behavior this
// gate exists for.
const SHOP_ALLOWED_PREFIXES = ['/shop/', '/api/shop/', '/book-service/', '/api/book', '/css/', '/js/', '/assets/', '/fonts/'];

function isShopAllowed(path) {
  if (SHOP_ALLOWED_EXACT.includes(path)) return true;
  return SHOP_ALLOWED_PREFIXES.some((p) => path === p.slice(0, -1) || path.startsWith(p));
}

// book.unitedmobilerv.com does not serve a page. Booking is Square.
// Pages Functions ignore _redirects, and this middleware runs on every
// request, so the 301 has to live here. Every path, including /, assets,
// /api/book, and /book-service/thank-you/, goes to the Square site root.
const BOOK_HOST = 'book.unitedmobilerv.com';

// Auth-unification stage 2 (2026-09-15) -- see functions/_lib/central-identity.js
// for the full explanation. LOG-ONLY this stage: resolves a central identity
// (when one exists) and attaches it as X-User-Id/X-User-Role on the request
// passed downstream, but NO route reads those headers yet -- existing auth
// (functions/_lib/authz.js) remains the sole real authorization check through
// Stage 3. The only behavior change live right now is defensive: any
// client-supplied X-User-Id/X-User-Role on the INCOMING request is always
// stripped, whether or not identity resolution finds anything -- this closes
// the header-spoofing hole before anything downstream is ever built to trust
// these headers, rather than as an afterthought once something does.
export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);

  const strippedHeaders = new Headers(context.request.headers);
  strippedHeaders.delete('X-User-Id');
  strippedHeaders.delete('X-User-Role');
  let request = new Request(context.request, { headers: strippedHeaders });

  if (requestUrl.hostname === SHOP_HOST && !isShopAllowed(requestUrl.pathname)) {
    return Response.redirect(new URL('/shop/', requestUrl), 301);
  }

  if (requestUrl.hostname === BOOK_HOST) {
    return Response.redirect(SQUARE_BOOK_URL, 301);
  }

  // Skip identity resolution (2 D1 reads) for static assets -- this
  // middleware runs on every request including CSS/JS/images, and a
  // logged-in user's page load pulls many of those. Flagged in security
  // review as real, avoidable D1 read volume on the free plan; header
  // stripping above still always runs regardless (that's free).
  const isStaticAsset = /^\/(css|js|assets|fonts)\//.test(requestUrl.pathname) || /\.[a-z0-9]{2,5}$/i.test(requestUrl.pathname);
  const identity = isStaticAsset ? null : await resolveCentralIdentity(request, context.env);
  if (identity) {
    const enrichedHeaders = new Headers(request.headers);
    enrichedHeaders.set('X-User-Id', identity.id);
    enrichedHeaders.set('X-User-Role', identity.role);
    request = new Request(request, { headers: enrichedHeaders });
  }

  const response = await context.next(request);
  const path = new URL(context.request.url).pathname;

  if (ROBOTS_HEADER_EXEMPT.includes(path)) {
    return response;
  }

  const indexable = isIndexable(requestUrl.hostname, path);

  const headers = new Headers(response.headers);
  headers.delete('X-Robots-Tag');
  headers.set('X-Robots-Tag', indexable ? 'index, follow' : 'noindex, follow');

  const contentType = headers.get('Content-Type') || '';
  if (!isHtmlContentType(contentType)) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  // Site-wide Clarity: inject before </head> once. Island templates
  // already include the snippet; this covers static HTML that does not.
  // On shop/forum/book, also rewrite canonical + og:url (host-aware):
  // land-unique stays on this host; shared WP mirrors point at apex;
  // never leave united-mobile-rv.pages.dev as the canonical.
  // Then stamp BreadcrumbList (+ WebSite/Organization on land homes)
  // once, before Clarity, so the loader stays last in <head>.
  headers.delete('Content-Length');
  let html = await response.text();
  if (isLandHost(requestUrl.hostname)) {
    const canonical = resolveLandCanonical(requestUrl);
    html = rewriteHtmlCanonicals(html, canonical);
    html = injectLandSchema(html, requestUrl);
  }
  return new Response(injectClarityOnce(html), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
