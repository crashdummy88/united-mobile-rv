/**
 * GET / -- this project's root also serves a full duplicate marketing
 * homepage (the original whole-site build, kept behind the ugly .pages.dev
 * URL up to now). Once a real subdomain points here, showing that homepage
 * instead of the section people actually came for reads as a second,
 * competing website. Redirect the homepage to the right section per
 * hostname; any host not listed here (including *.pages.dev) falls
 * through to the normal static homepage untouched.
 */
const HOST_HOME_REDIRECTS = {
  'shop.unitedmobilerv.com': '/shop/',
  'forum.unitedmobilerv.com': '/forum/',
};

export async function onRequestGet(context) {
  const host = new URL(context.request.url).hostname;
  const target = HOST_HOME_REDIRECTS[host];
  if (target) {
    // 301 (permanent): this is the real, permanent home for this hostname --
    // not a temporary experiment -- so search engines consolidate ranking
    // signal onto the target path instead of treating the two as separate,
    // competing URLs.
    return Response.redirect(new URL(target, context.request.url), 301);
  }
  return context.next();
}
