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
 * Matt LOCK 2026-09-20 product nav (shop / forum / book), Shop-first:
 *   Home return → https://unitedmobilerv.com/  (label Home, not MAIN HUB)
 *   1 Shop · 2 Book (book. wrap) · 3 Forum · 4 Software · 5 Docs
 *   Not Book-first. Do not add portal, status, or guide-library items.
 *
 * Matt LOCK 2026-09-20 Book chrome:
 *   Book → https://book.unitedmobilerv.com/ (embedded Square wrap)
 *   square.site is fallback / shop-card deep link only — not mesh Book.
 *
 * Live square.site bootstrap 2026-09-20 (do not invent beyond this):
 *   Site URL            https://united-mobile-rv-llc.square.site/
 *   Appointment id      11ee0a41ff32bdd39387ac1f6bbbd01e
 *                       (Book Appointment action squareAppointment)
 *   Merchant id         MLVM87VQ3KP9E
 *   Square page name    "Square Portal" (CF portal retired → Square)
 *   Official buyer/widget/{id}[.js] is unpublished: HTTP 404 + X-Frame-Options
 *   DENY. Do not iframe or script-load that path. Homepage appointment-request
 *   form is the working engine; square.site sends no X-Frame-Options.
 *
 * Matt LOCK 2026-09-16 convert stack (header + mobile bar, every surface):
 *   Call (616) 606-5277 → tel:+16166065277 (older clients; number is the call control)
 *   Text Now            → sms:+16166065277 (gold primary; compact label exact)
 *   Book                → book.unitedmobilerv.com (ghost/secondary; label exact Book)
 */

export const SQUARE_BOOK_URL = 'https://united-mobile-rv-llc.square.site/'; // Matt published booking engine (iframe on book.*)
export const BOOK_HOST_HREF = 'https://book.unitedmobilerv.com/';
export const BOOK_PUBLIC_HREF = BOOK_HOST_HREF;
/** Live Book Appointment action id from square.site bootstrap. Not invented. */
export const SQUARE_APPOINTMENT_ID = '11ee0a41ff32bdd39387ac1f6bbbd01e';
/** Live squareMerchantId from square.site bootstrap. Not invented. */
export const SQUARE_MERCHANT_ID = 'MLVM87VQ3KP9E';
// Square Online also exposes /s/appointments (GET 200) but the live
// appointments widget currently errors ("Something went wrong") while the
// homepage "Request an appointment" form works. Keep this constant for
// Matt to paste into services.book_url / SQUARE_BOOKING_URL once
// Appointments is published; do not use it as the default chrome target.
export const SQUARE_APPOINTMENTS_HREF = 'https://united-mobile-rv-llc.square.site/s/appointments';
export const TEXT_NOW_HREF = 'sms:+16166065277';
export const TEXT_NOW_LABEL = 'Text Now (616) 606-5277';
export const TEXT_NOW_COMPACT = 'Text Now';
export const CALL_HREF = 'tel:+16166065277';
export const CALL_LABEL = 'Call (616) 606-5277';
export const MAIN_HOME_HREF = 'https://unitedmobilerv.com/';
export const MAIN_HOME_LABEL = 'Home';

export function convertNavCta() {
  return `<div class="nav-cta">
      <a class="nav-phone" href="${CALL_HREF}">${CALL_LABEL}</a>
      <a class="btn btn-gold nav-text-now" href="${TEXT_NOW_HREF}">${TEXT_NOW_COMPACT}</a>
      <a class="btn btn-ghost" href="${BOOK_PUBLIC_HREF}">Book</a>
    </div>`;
}

export function convertMobileBar() {
  return `<div class="mobile-bar" aria-label="Quick actions">
  <a class="btn btn-ghost" href="${CALL_HREF}">${CALL_LABEL}</a>
  <a class="btn btn-gold" href="${TEXT_NOW_HREF}">${TEXT_NOW_COMPACT}</a>
  <a class="btn btn-ghost" href="${BOOK_PUBLIC_HREF}">Book</a>
</div>`;
}

export const MESH_LINKS = [
  { key: 'home', href: MAIN_HOME_HREF, label: MAIN_HOME_LABEL },
  { key: 'shop', href: 'https://shop.unitedmobilerv.com/', label: 'Shop' },
  { key: 'book', href: BOOK_PUBLIC_HREF, label: 'Book' },
  { key: 'forum', href: 'https://forum.unitedmobilerv.com/', label: 'Forum' },
  { key: 'software', href: 'https://software.unitedmobilerv.com/', label: 'Software' },
  { key: 'docs', href: 'https://docs.unitedmobilerv.com/', label: 'Docs' },
];

function currentAttr(item, current) {
  return current === item.key ? ' aria-current="page"' : '';
}

function meshAnchorOpen(item, current) {
  return `<a href="${item.href}"${currentAttr(item, current)}>`;
}

export function meshNavLis({ current, extraAfter = '' } = {}) {
  const items = MESH_LINKS.map(
    (item) => `<li>${meshAnchorOpen(item, current)}${item.label}</a></li>`
  );
  if (extraAfter) items.push(extraAfter);
  return items.join('\n      ');
}

export function meshFooterAnchors({ current } = {}) {
  const mesh = MESH_LINKS.map(
    (item) => `${meshAnchorOpen(item, current)}${item.label}</a>`
  ).join('\n      ');
  return `${mesh}\n      <a href="${TEXT_NOW_HREF}">${TEXT_NOW_COMPACT}</a>`;
}

export function islandHeader({ current, extraNavHtml = '' } = {}) {
  return `<header class="site-header">
  <div class="wrap nav-bar">
    <a class="brand" href="${MAIN_HOME_HREF}"><img class="brand-logo" src="/assets/brand/umrt-logo.webp" alt="United Mobile RV" width="40" height="40"><span class="brand-text">United Mobile <span>RV</span></span></a>
    <button class="nav-toggle" type="button" aria-label="Menu" aria-expanded="false">☰</button>
    <ul class="nav-links">
      ${meshNavLis({ current, extraAfter: extraNavHtml })}
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
      <p class="mb-0">Active MT · WY · ID · WA corridor. Case-by-case beyond.</p>
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
