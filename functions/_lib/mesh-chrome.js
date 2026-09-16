/**
 * Shared ecosystem chrome for mothership islands (shop + forum + book suite).
 *
 * Absolute URLs on purpose: shop.unitedmobilerv.com lockdown
 * (SHOP_ALLOWED_PREFIXES in _middleware.js) 301s any relative
 * /forum/, /guide/, etc. back to /shop/. Do not add those paths
 * to the shop allowlist -- link off-host instead.
 *
 * Public Book CTAs in header/footer/mobile-bar go to Square
 * appointment intake. Prefer Text (tel:) is the primary convert.
 */

export const SQUARE_BOOK_URL = 'https://united-mobile-rv-llc.square.site/';
export const BOOK_PUBLIC_HREF = SQUARE_BOOK_URL;
export const PREFER_TEXT_HREF = 'tel:+16166065277';
export const PREFER_TEXT_LABEL = 'Prefer Text (616) 606-5277';
export const MAIN_HOME_HREF = 'https://unitedmobilerv.com/';

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
  return `${mesh}\n      <a href="${PREFER_TEXT_HREF}">Prefer Text</a>\n      <a href="${BOOK_PUBLIC_HREF}" target="_blank" rel="noopener">Book</a>`;
}

export function islandHeader({ current, extraNavHtml = '' } = {}) {
  return `<header class="site-header">
  <div class="wrap nav-bar">
    <a class="brand" href="${MAIN_HOME_HREF}"><img class="brand-logo" src="/assets/brand/umrt-logo.webp" alt="United Mobile RV" width="40" height="40"><span class="brand-text">United Mobile <span>RV</span></span></a>
    <button class="nav-toggle" type="button" aria-label="Menu" aria-expanded="false">☰</button>
    <ul class="nav-links">
      ${meshNavLis({ current, extraAfter: extraNavHtml })}
    </ul>
    <div class="nav-cta">
      <a class="btn btn-gold" href="${PREFER_TEXT_HREF}">${PREFER_TEXT_LABEL}</a>
      <a class="btn btn-ghost" href="${BOOK_PUBLIC_HREF}" target="_blank" rel="noopener">Book</a>
    </div>
  </div>
</header>`;
}

export function islandFooter({ current } = {}) {
  return `<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <div class="footer-brand">United Mobile RV LLC</div>
      <p class="mb-0">Active MT · WY · ID · WA corridor. Case-by-case beyond.</p>
      <p class="mt-6 mb-0"><a href="${PREFER_TEXT_HREF}">${PREFER_TEXT_LABEL}</a><br>
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
  return `<div class="mobile-bar" aria-label="Quick actions">
  <a class="btn btn-gold" href="${PREFER_TEXT_HREF}">${PREFER_TEXT_LABEL}</a>
  <a class="btn btn-ghost" href="${BOOK_PUBLIC_HREF}" target="_blank" rel="noopener">Book</a>
</div>`;
}

export function shopCartNavItem() {
  return `<li><a href="/shop/cart">Cart <span class="cart-badge-count" hidden></span></a></li>`;
}
