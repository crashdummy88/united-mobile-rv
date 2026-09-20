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
 *   Home return → https://unitedmobilerv.com/ (WordPress apex; not "MAIN HUB")
 *   1 Shop · 2 Book (Square) · 3 Forum · 4 Software · 5 Docs
 *   Not Book-first. Do not add portal, status, or guide-library items.
 *   Bidirectional: every CF land homepage stamps Home → WP apex.
 *   WP hub chrome (design/wp-hub-chrome.html) doors to each CF homepage.
 *   CF islands only: corner brand is the logo only.
 *   Matt HARD LOCK: NEVER hide the WP site title, header, or umrt-brand.
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
export const MAIN_HOME_LABEL = 'Home';

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

export const SHOP_LAND_HREF = 'https://shop.unitedmobilerv.com/';
export const BOOK_LAND_HREF = 'https://book.unitedmobilerv.com/';
export const FORUM_LAND_HREF = 'https://forum.unitedmobilerv.com/';
export const SOFTWARE_LAND_HREF = 'https://software.unitedmobilerv.com/';
export const DOCS_LAND_HREF = 'https://docs.unitedmobilerv.com/';

/** WP hub doors to CF land homepages. Book here is the book. land, not Square. */
export const WP_HUB_DOORS = [
  { key: 'home', href: MAIN_HOME_HREF, label: MAIN_HOME_LABEL },
  { key: 'shop', href: SHOP_LAND_HREF, label: 'Shop' },
  { key: 'book', href: BOOK_LAND_HREF, label: 'Book' },
  { key: 'forum', href: FORUM_LAND_HREF, label: 'Forum' },
  { key: 'software', href: SOFTWARE_LAND_HREF, label: 'Software' },
  { key: 'docs', href: DOCS_LAND_HREF, label: 'Docs' },
];

export const MESH_LINKS = [
  { key: 'home', href: MAIN_HOME_HREF, label: MAIN_HOME_LABEL },
  { key: 'shop', href: SHOP_LAND_HREF, label: 'Shop' },
  { key: 'book', href: BOOK_PUBLIC_HREF, label: 'Book', external: true },
  { key: 'forum', href: FORUM_LAND_HREF, label: 'Forum' },
  { key: 'software', href: SOFTWARE_LAND_HREF, label: 'Software' },
  { key: 'docs', href: DOCS_LAND_HREF, label: 'Docs' },
];

export function islandBrand() {
  return `<a class="brand" href="${MAIN_HOME_HREF}"><img class="brand-logo" src="/assets/brand/umrt-logo.webp" alt="United Mobile RV" width="40" height="40"></a>`;
}

function currentAttr(item, current) {
  return current === item.key ? ' aria-current="page"' : '';
}

function meshAnchorOpen(item, current) {
  const extra = item.external ? ' target="_blank" rel="noopener"' : '';
  return `<a href="${item.href}"${currentAttr(item, current)}${extra}>`;
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
    ${islandBrand()}
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
