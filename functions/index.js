/**
 * GET / -- this project's root also serves a full duplicate marketing
 * homepage (the original whole-site build, kept behind the ugly .pages.dev
 * URL up to now). Once a real subdomain points here, showing that homepage
 * instead of the section people actually came for reads as a second,
 * competing website. Serve the right section per hostname; any host not
 * listed here (including *.pages.dev) falls through to the normal static
 * homepage untouched.
 *
 * Internal rewrite, NOT a redirect (changed 2026-09-14): a subdomain
 * literally named "shop" bouncing to shop.unitedmobilerv.com/shop/ (or
 * forum -> forum.unitedmobilerv.com/forum/) is a confusing, redundant URL
 * -- the visitor's address bar shouldn't grow a second copy of the
 * subdomain name. These hostnames now render their target content
 * directly at '/' with no visible redirect. SEO-wise this is a non-issue:
 * there was never a second, separately-rankable page at the bare '/' to
 * consolidate away from -- it's the same one URL either way, just
 * without a hop.
 */
import { SQUARE_BOOK_URL } from './_lib/mesh-chrome.js';
import { onRequestGet as shopIndex, onRequestHead as shopHead } from './shop/index.js';

const HOST_HOME_REWRITES = {
  'shop.unitedmobilerv.com': '/shop/',
  'forum.unitedmobilerv.com': '/forum/',
};

export async function onRequestHead(context) {
  const host = new URL(context.request.url).hostname;
  if (host === 'book.unitedmobilerv.com') return Response.redirect(SQUARE_BOOK_URL, 301);
  if (host === 'shop.unitedmobilerv.com') return shopHead(context);
  return context.next();
}

export async function onRequestGet(context) {
  const host = new URL(context.request.url).hostname;
  if (host === 'book.unitedmobilerv.com') {
    return Response.redirect(SQUARE_BOOK_URL, 301);
  }

  const target = HOST_HOME_REWRITES[host];
  if (!target) return context.next();

  if (host === 'shop.unitedmobilerv.com') {
    // /shop/ is a Pages Function (functions/shop/index.js), not a static
    // file -- call its handler directly with the same env/request rather
    // than trying to re-route, so it renders identically to visiting
    // /shop/ (same DB query, same category filter handling).
    return shopIndex(context);
  }

  // /forum/ is a static asset directory (forum/index.html) -- fetch it
  // through the Pages static-asset binding with a rewritten URL so the
  // content comes back at the '/' the visitor actually requested.
  const rewrittenRequest = new Request(new URL(target, context.request.url), context.request);
  return context.env.ASSETS.fetch(rewrittenRequest);
}
