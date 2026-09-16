/**
 * Shared UMRT ecosystem chrome — one product, many hosts.
 *
 * Book destination is the booking suite (book.unitedmobilerv.com),
 * which itself sends BOOK ONLINE to Square. Prefer Text is always
 * present. Custom domains only — never /go/book or *.pages.dev.
 *
 * Used by shop/forum/book-suite function pages. Static twin lives in
 * design/platform-bar.html + design/platform-bar.css.
 */

export const BOOK_SUITE_URL = 'https://book.unitedmobilerv.com/';
export const SQUARE_BOOK_URL = 'https://united-mobile-rv-llc.square.site/';
export const FORUM_URL = 'https://forum.unitedmobilerv.com/';
export const SHOP_URL = 'https://shop.unitedmobilerv.com/';
export const PORTAL_URL = 'https://portal.unitedmobilerv.com/';
export const SOFTWARE_URL = 'https://software.unitedmobilerv.com/';
export const STATUS_URL = 'https://status.unitedmobilerv.com/';
export const DOCS_URL = 'https://docs.unitedmobilerv.com/';
export const HUB_URL = 'https://unitedmobilerv.com/';

export const BOOK_PHONE_DISPLAY = '(616) 606-5277';
export const BOOK_PHONE_E164 = '+16166065277';
export const PREFER_TEXT_HREF = `sms:${BOOK_PHONE_E164}`;
export const PREFER_TEXT_LABEL = `Prefer Text ${BOOK_PHONE_DISPLAY}`;

/** @typedef {'hub'|'shop'|'forum'|'book'|'portal'|'software'|'status'|'docs'} PlatformId */

export const PLATFORM_LINKS = [
  { id: 'hub', href: HUB_URL, label: 'Hub' },
  { id: 'shop', href: SHOP_URL, label: 'Shop' },
  { id: 'forum', href: FORUM_URL, label: 'Forum' },
  { id: 'book', href: BOOK_SUITE_URL, label: 'Book' },
  { id: 'portal', href: PORTAL_URL, label: 'Portal' },
  { id: 'software', href: SOFTWARE_URL, label: 'Software' },
  { id: 'status', href: STATUS_URL, label: 'Status' },
  { id: 'docs', href: DOCS_URL, label: 'Docs' },
];

export function platformBarHtml(current) {
  const links = PLATFORM_LINKS.map((item) => {
    const on = current === item.id;
    return `<a href="${item.href}" data-platform-link="${item.id}"${on ? ' aria-current="page" class="is-current"' : ''}>${item.label}</a>`;
  }).join('\n    ');
  return `<div class="umrt-platform-bar" role="navigation" aria-label="UMRT properties">
  <div class="umrt-platform-bar-inner">
    ${links}
    <a class="umrt-platform-text" href="${PREFER_TEXT_HREF}">${PREFER_TEXT_LABEL}</a>
  </div>
</div>`;
}

export function platformFooterColHtml() {
  return `<div>
      <div class="micro">Platform</div>
      <a href="${PORTAL_URL}">Portal</a>
      <a href="${SOFTWARE_URL}">Software</a>
      <a href="${STATUS_URL}">Status</a>
      <a href="${DOCS_URL}">Docs</a>
      <a href="${FORUM_URL}">Forum</a>
      <a href="${SHOP_URL}">Shop</a>
      <a href="${BOOK_SUITE_URL}">Book</a>
    </div>`;
}

export function credentialLinesHtml() {
  return `<p class="muted mb-0" style="font-size:13px;line-height:1.7">
        Victron Professional Certified Installer<br>
        weBoost Authorized Installer<br>
        Peplink Certified Associate<br>
        Starlink installs (not a Starlink-certified installer)
      </p>`;
}

export function shopFooterHtml() {
  return `<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <div class="footer-brand">United Mobile RV LLC</div>
      <p class="mb-0">Active MT · WY · ID · WA corridor. Case-by-case beyond.</p>
      <p class="mt-6 mb-0"><a href="${PREFER_TEXT_HREF}">${PREFER_TEXT_LABEL}</a><br>
      <a href="mailto:unitedrvnetwork@gmail.com">unitedrvnetwork@gmail.com</a></p>
    </div>
    ${platformFooterColHtml()}
    <div>
      <div class="micro">Credentials</div>
      ${credentialLinesHtml()}
    </div>
  </div>
</footer>`;
}
