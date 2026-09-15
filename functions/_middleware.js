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
const INDEXABLE_PREFIXES = ['/forum/', '/forum-live/', '/guide/'];

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

export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  if (requestUrl.hostname === SHOP_HOST && !isShopAllowed(requestUrl.pathname)) {
    return Response.redirect(new URL('/shop/', requestUrl), 301);
  }

  const response = await context.next();
  const path = new URL(context.request.url).pathname;

  if (ROBOTS_HEADER_EXEMPT.includes(path)) {
    return response;
  }

  const indexable = APEX_HOSTS.includes(requestUrl.hostname)
    ? !APEX_NOINDEX_PREFIXES.some((p) => path === p || path.startsWith(p))
    : INDEXABLE_PREFIXES.some((p) => path === p.slice(0, -1) || path.startsWith(p));

  const headers = new Headers(response.headers);
  headers.delete('X-Robots-Tag');
  headers.set('X-Robots-Tag', indexable ? 'index, follow' : 'noindex, follow');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
