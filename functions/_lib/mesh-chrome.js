/**
 * Shared ecosystem chrome for mothership islands (shop + forum + book suite).
 *
 * Absolute URLs on purpose: shop.unitedmobilerv.com lockdown
 * (SHOP_ALLOWED_PREFIXES in _middleware.js) 301s any relative
 * /forum/, /guide/, etc. back to /shop/. Do not add those paths
 * to the shop allowlist -- link off-host instead.
 *
 * Matt LOCK 2026-09-16 convert stack (header + mobile bar, every surface):
 *   Call (616) 606-5277 → tel:+16166065277 (older clients; number is the call control)
 *   Text Now            → sms:+16166065277 (gold primary; compact label exact)
 *   Book                → Square appointment intake (ghost/secondary; label exact Book)
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
export const MAIN_HOME_HREF = 'https://unitedmobilerv.com/';

export function convertNavCta() {
  return `<div class="nav-cta">
      <a class="nav-phone" href="${CALL_HREF}">${CALL_LABEL}</a>
      <a class="btn btn-gold nav-text-now" href="${TEXT_NOW_HREF}">${TEXT_NOW_COMPACT}</a>
      <a class="btn btn-ghost" href="${BOOK_PUBLIC_HREF}" target="_blank" rel="noopener">Book</a>
    </div>`;
}

export function convertMobileBar() {
  return `<div class="mobile-bar" aria-label="Quick actions">
  <a class="btn btn-ghost" href="${CALL_HREF}">${CALL_LABEL}</a>
  <a class="btn btn-gold" href="${TEXT_NOW_HREF}">${TEXT_NOW_COMPACT}</a>
  <a class="btn btn-ghost" href="${BOOK_PUBLIC_HREF}" target="_blank" rel="noopener">Book</a>
</div>`;
}

export const MESH_LINKS = [
  { key: 'home', href: MAIN_HOME_HREF, label: 'Main' },
  { key: 'forum', href: 'https://forum.unitedmobilerv.com/', label: 'Forum' },
  { key: 'software', href: 'https://software.unitedmobilerv.com/', label: 'Software' },
  { key: 'status', href: 'https://status.unitedmobilerv.com/', label: 'Status' },
  { key: 'portal', href: 'https://portal.unitedmobilerv.com/', label: 'Portal' },
  { key: 'shop', href: 'https://shop.unitedmobilerv.com/', label: 'Shop' },
  { key: 'docs', href: 'https://docs.unitedmobilerv.com/', label: 'Docs' },
];

function currentAttr(item, current) {
  return current === item.key ? ' aria-current="page"' : '';
}

export function meshNavLis({ current, extraAfter = '' } = {}) {
  const items = MESH_LINKS.map(
    (item) => `<li><a href="${item.href}"${currentAttr(item, current)}>${item.label}</a></li>`
  );
  if (extraAfter) items.push(extraAfter);
  return items.join('\n      ');
}

export function meshFooterAnchors({ current } = {}) {
  const mesh = MESH_LINKS.map(
    (item) => `<a href="${item.href}"${currentAttr(item, current)}>${item.label}</a>`
  ).join('\n      ');
  return `${mesh}\n      <a href="${TEXT_NOW_HREF}">${TEXT_NOW_COMPACT}</a>\n      <a href="${BOOK_PUBLIC_HREF}" target="_blank" rel="noopener">Book</a>`;
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
