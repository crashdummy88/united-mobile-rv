/**
 * Shared ecosystem chrome for mothership islands (shop + forum + book suite).
 *
 * Absolute URLs on purpose: shop.unitedmobilerv.com lockdown
 * (SHOP_ALLOWED_PREFIXES in _middleware.js) 301s any relative
 * /forum/, /guide/, etc. back to /shop/. Do not add those paths
 * to the shop allowlist -- link off-host instead.
 * Do not add a guide-library item to MESH_LINKS. That library stays
 * on the WP apex, not in shop/forum/book product chrome.
 *
 * Matt LOCK 2026-09-20 product nav (shop / forum / book):
 *   Home return → https://unitedmobilerv.com/  (label Home, never MAIN HUB / Main Hub)
 *   Services → https://unitedmobilerv.com/service/  (after Home, before Shop)
 *   Every CF island (shop. / forum. / book.) stamps that same Home + Services door.
 *   Home · Services · Shop · Book (Square) · Forum · Software · Docs
 *   Cart after Shop on shop only. Not Book-first.
 *   Do not add portal, status, or guide-library items.
 *   Island header is logo-only — no "United Mobile RV" corner title.
 *   Use umrt-icon.webp (car + gear, no lettering). umrt-logo.webp still
 *   has UNITED MOBILE RV in the artwork and must not sit in this bar.
 *   Do not rewrite WordPress brand / theme chrome.
 *
 * Matt HARD LOCK 2026-09-20 chrome Book = STRAIGHT to Square:
 *   BOOK_PUBLIC_HREF / SQUARE_BOOK_URL / MESH_LINKS.book.href
 *     = https://united-mobile-rv-llc.square.site/
 *   NEVER https://book.unitedmobilerv.com/ in MESH_LINKS, islandHeader,
 *   islandFooter, islandMobileBar, platform-bar, or static HTML nav/footer.
 *   book.unitedmobilerv.com stays a host for the booking-suite product,
 *   not a chrome Book destination. Geo landing CTAs are out of scope.
 *
 * Matt LOCK 2026-09-16 convert stack (header + mobile bar, every surface):
 *   Call (616) 606-5277 → tel:+16166065277 (header label; number is the call control)
 *   Text Now            → sms:+16166065277 (header: gold button; compact label exact)
 *   Book                → Square appointment intake (header: ghost button; label exact Book)
 *   Mobile bar is a quiet text row, not pills (even spacing, padding tap targets):
 *     Call · Text Now · Book · Join the Free Forum
 *     Call is the short word; tel: stays +16166065277. Text Now is gold text only.
 *     Join the Free Forum → https://forum.unitedmobilerv.com/ after Book.
 */

export const SQUARE_BOOK_URL = 'https://united-mobile-rv-llc.square.site/';
export const BOOK_PUBLIC_HREF = SQUARE_BOOK_URL;
// Square Online also exposes /s/appointments (GET 200) but the live
// appointments widget currently errors ("Something went wrong") while the
// homepage "Request an appointment" form works. Keep this constant for
// Matt to paste into services.book_url / SQUARE_BOOKING_URL once
// Appointments is published; do not use it as the default card target.
export const SQUARE_APPOINTMENTS_HREF = 'https://united-mobile-rv-llc.square.site/s/appointments';
export const TEXT_NOW_HREF = 'sms:+16166065277';
export const TEXT_NOW_LABEL = 'Text Now (616) 606-5277';
export const TEXT_NOW_COMPACT = 'Text Now';
export const CALL_HREF = 'tel:+16166065277';
export const CALL_LABEL = 'Call (616) 606-5277';
export const MOBILE_CALL_LABEL = 'Call';
export const FORUM_JOIN_HREF = 'https://forum.unitedmobilerv.com/';
export const FORUM_JOIN_LABEL = 'Join the Free Forum';
export const MAIN_HOME_HREF = 'https://unitedmobilerv.com/';
export const MAIN_HOME_LABEL = 'Home';
export const MAIN_SERVICES_HREF = 'https://unitedmobilerv.com/service/';
export const MAIN_SERVICES_LABEL = 'Services';

export function convertNavCta() {
  return `<div class="nav-cta">
      <a class="nav-phone" href="${CALL_HREF}">${CALL_LABEL}</a>
      <a class="btn btn-gold nav-text-now" href="${TEXT_NOW_HREF}">${TEXT_NOW_COMPACT}</a>
      <a class="btn btn-ghost" href="${BOOK_PUBLIC_HREF}" target="_blank" rel="noopener">Book</a>
    </div>`;
}

export function convertMobileBar() {
  return `<div class="mobile-bar" aria-label="Quick actions">
  <a href="${CALL_HREF}" aria-label="${CALL_LABEL}">${MOBILE_CALL_LABEL}</a>
  <a class="mobile-text-now" href="${TEXT_NOW_HREF}">${TEXT_NOW_COMPACT}</a>
  <a href="${BOOK_PUBLIC_HREF}" target="_blank" rel="noopener">Book</a>
  <a href="${FORUM_JOIN_HREF}">${FORUM_JOIN_LABEL}</a>
</div>`;
}

export const MESH_LINKS = [
  { key: 'home', href: MAIN_HOME_HREF, label: MAIN_HOME_LABEL },
  { key: 'services', href: MAIN_SERVICES_HREF, label: MAIN_SERVICES_LABEL },
  { key: 'shop', href: 'https://shop.unitedmobilerv.com/', label: 'Shop' },
  { key: 'book', href: BOOK_PUBLIC_HREF, label: 'Book', external: true },
  { key: 'forum', href: FORUM_JOIN_HREF, label: 'Forum' },
  { key: 'software', href: 'https://software.unitedmobilerv.com/', label: 'Software' },
  { key: 'docs', href: 'https://docs.unitedmobilerv.com/', label: 'Docs' },
];

function currentAttr(item, current) {
  return current === item.key ? ' aria-current="page"' : '';
}

function meshAnchorOpen(item, current) {
  const extra = item.external ? ' target="_blank" rel="noopener"' : '';
  return `<a href="${item.href}"${currentAttr(item, current)}${extra}>`;
}

export function meshNavLis({ current, extraAfter = '', extraAfterKey = '', links = MESH_LINKS } = {}) {
  const items = [];
  for (const item of links) {
    items.push(`<li>${meshAnchorOpen(item, current)}${item.label}</a></li>`);
    if (extraAfter && extraAfterKey === item.key) items.push(extraAfter);
  }
  if (extraAfter && !extraAfterKey) items.push(extraAfter);
  return items.join('\n      ');
}

export function meshFooterAnchors({ current, links = MESH_LINKS } = {}) {
  const mesh = links.map(
    (item) => `${meshAnchorOpen(item, current)}${item.label}</a>`
  ).join('\n      ');
  return `${mesh}\n      <a href="${TEXT_NOW_HREF}">${TEXT_NOW_COMPACT}</a>`;
}

export function islandHeader({ current, extraNavHtml = '', extraAfterKey = '', links = MESH_LINKS } = {}) {
  return `<header class="site-header">
  <div class="wrap nav-bar">
    <a class="brand brand-mark" href="${MAIN_HOME_HREF}" aria-label="Home"><img class="brand-logo" src="/assets/brand/umrt-icon.webp" alt="" width="40" height="40"></a>
    <button class="nav-toggle" type="button" aria-label="Menu" aria-expanded="false">☰</button>
    <ul class="nav-links">
      ${meshNavLis({ current, extraAfter: extraNavHtml, extraAfterKey, links })}
    </ul>
    ${convertNavCta()}
  </div>
</header>`;
}

export function islandFooter({ current } = {}) {
  return `<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <div class="footer-brand">United Mobile RV LLC</div>
      <p class="mb-0">Active WA booking zone. Case-by-case beyond.</p>
      <p class="mt-6 mb-0"><a href="${CALL_HREF}">${CALL_LABEL}</a><br>
      <a href="mailto:unitedrvnetwork@gmail.com">unitedrvnetwork@gmail.com</a></p>
    </div>
    <div>
      <div class="micro">Network</div>
      ${meshFooterAnchors({ current })}
    </div>
  </div>
</footer>`;
}

export function islandMobileBar() {
  return convertMobileBar();
}

export function shopCartNavItem() {
  return `<li><a href="/shop/cart">Cart <span class="cart-badge-count" hidden></span></a></li>`;
}

export {
  CLARITY_PROJECT_ID,
  clarityHeadSnippet,
} from './clarity.js';

export {
  landJsonLdSnippet,
  landCrumbsNav,
  injectLandJsonLd,
  injectLandCrumbsNav,
  injectLandSchema,
  buildLandJsonLd,
  buildLandCrumbs,
  LAND_SITES,
} from './jsonld.js';

