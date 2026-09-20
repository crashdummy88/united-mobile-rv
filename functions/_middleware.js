import { resolveCentralIdentity } from './_lib/central-identity.js';
import { injectClarityOnce } from './_lib/clarity.js';

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
const INDEXABLE_PREFIXES = ['/forum/', '/forum-live/', '/guide/', '/shop/'];

// Apex cutover prep, 2026-09-15: this project's own robots.txt has said
// since 2026-09-10 that "mothership pages.dev is noindex... live convert
// lives on unitedmobilerv.com" -- the intent to index everything once the
// real domain points here was already decided, just never implemented as
// actual host-aware logic until now. Once unitedmobilerv.com/www resolve
// here, INDEXABLE_PREFIXES above (a narrow allowlist, correct for the raw
// pages.dev/shop./forum. hosts) no longer applies -- on the apex hosts we
// index everything BY DEFAULT and explicitly carve out the few paths that
// aren't real content, the reverse of the allowlist model.
const APEX_HOSTS = ['unitedmobilerv.com', 'www.unitedmobilerv.com'];
const APEX_NOINDEX_PREFIXES = ['/api/', '/shop/cart', '/forum/mod/'];

// Carve-out for the non-apex (shop./forum./staging.) INDEXABLE_PREFIXES
// branch below, same idea as APEX_NOINDEX_PREFIXES above but scoped to
// that branch: adding the whole '/shop/' prefix to INDEXABLE_PREFIXES on
// 2026-09-16 (to index the real catalog) briefly made /shop/cart index,follow
// too -- caught live via curl right after deploy. Cart is a utility page,
// never real content, same as it's excluded on the apex hosts above.
const NON_APEX_NOINDEX_PREFIXES = ['/shop/cart'];

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

// book.unitedmobilerv.com is the booking-suite product, not a second copy
// of the mothership. Same Pages-project problem as shop (2026-09-13):
// without this gate every marketing URL was reachable here, and '/' was
// serving the full homepage because HOST_HOME_REWRITES had no book entry.
// Suite URL is '/' -- /book-service/ 301s here so the address bar does not
// become book.unitedmobilerv.com/book-service/. /sitemap.xml is NOT
// allowed (that is the full mothership sitemap). /book-service/thank-you/
// stays -- it is a booking page, not a marketing page.
const BOOK_HOST = 'book.unitedmobilerv.com';
const BOOK_SUITE_HOME = '/';
const BOOK_ALLOWED_EXACT = ['/', '/favicon.png', '/robots.txt'];
const BOOK_ALLOWED_PREFIXES = [
  '/book-service/thank-you/',
  '/api/book',
  '/css/',
  '/js/',
  '/assets/',
  '/fonts/',
];

function isBookAllowed(path) {
  if (BOOK_ALLOWED_EXACT.includes(path)) return true;
  return BOOK_ALLOWED_PREFIXES.some((p) => path === p.slice(0, -1) || path.startsWith(p));
}

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

  if (requestUrl.hostname === BOOK_HOST && !isBookAllowed(requestUrl.pathname)) {
    return Response.redirect(new URL(BOOK_SUITE_HOME, requestUrl), 301);
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

  const indexable = APEX_HOSTS.includes(requestUrl.hostname)
    ? !APEX_NOINDEX_PREFIXES.some((p) => path === p || path.startsWith(p))
    : INDEXABLE_PREFIXES.some((p) => path === p.slice(0, -1) || path.startsWith(p))
      && !NON_APEX_NOINDEX_PREFIXES.some((p) => path === p || path.startsWith(p));

  const headers = new Headers(response.headers);
  headers.delete('X-Robots-Tag');
  headers.set('X-Robots-Tag', indexable ? 'index, follow' : 'noindex, follow');

  const contentType = headers.get('Content-Type') || '';
  if (!contentType.includes('text/html')) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  // Site-wide Clarity: inject before </head> once. Island templates
  // already include the snippet; this covers static HTML that does not.
  headers.delete('Content-Length');
  const html = await response.text();
  return new Response(injectClarityOnce(html), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
