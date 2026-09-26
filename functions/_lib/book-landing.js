/**
 * Customer booking page for book.unitedmobilerv.com only.
 * Shop, forum, and /book-service/ on other hosts do not use this module.
 *
 * Do not load /js/site.js on this page. That script restamps every chrome
 * "Book" link to Square and strips a Guides item. This page is the booking
 * page, so the nav Book item stays here.
 */

import {
  CALL_HREF,
  TEXT_NOW_HREF,
  MAIN_HOME_HREF,
  MAIN_HOME_LABEL,
  MAIN_SERVICES_HREF,
  MAIN_SERVICES_LABEL,
  FORUM_JOIN_HREF,
} from './mesh-chrome.js';
import {
  SQUARE_BOOKING_EMBED_HTML,
  SQUARE_BOOKING_PAGE_URL,
} from './square-booking-embed.js';

export const BOOK_LANDING_ORIGIN = 'https://book.unitedmobilerv.com/';
export const GUIDES_HREF = 'https://unitedmobilerv.com/guide/';
export const REMOTE_HELP_HREF = 'https://unitedmobilerv.com/remote/';

export const BOOK_LANDING_NAV = [
  { key: 'home', href: MAIN_HOME_HREF, label: MAIN_HOME_LABEL },
  { key: 'services', href: MAIN_SERVICES_HREF, label: MAIN_SERVICES_LABEL },
  { key: 'guides', href: GUIDES_HREF, label: 'Guides' },
  { key: 'shop', href: 'https://shop.unitedmobilerv.com/', label: 'Shop' },
  { key: 'book', href: BOOK_LANDING_ORIGIN, label: 'Book' },
  { key: 'forum', href: FORUM_JOIN_HREF, label: 'Forum' },
  { key: 'software', href: 'https://software.unitedmobilerv.com/', label: 'Software' },
  { key: 'docs', href: 'https://docs.unitedmobilerv.com/', label: 'Docs' },
];

/* The frame opens on the appointment-request block (#HjeiGL). Square
   keeps a 72px site header pinned above that anchor at both 1280 and
   390. Shift the frame up by 76px and clip it so the visible area is
   the form, not that header or the homepage hero. Heights match the
   form block: about 636px on desktop, about 708px at 390. */
export const BOOK_LANDING_CSS = `
  .book-landing { background: #0C0C0C; }
  .book-landing h1 { color: #fff; }
  .book-landing .book-intro { padding: 28px 0 4px; }
  .book-landing .book-intro h1 {
    font-size: clamp(1.75rem, 3vw, 2.5rem);
    margin-bottom: 12px;
  }
  .book-landing .book-intro p { color: #D6D6D6; max-width: 68ch; }
  .book-landing .book-fallback-row { margin: 4px 0 8px; }
  .book-landing .book-fallback { border-radius: 8px; }
  .book-landing .book-fallback:hover { background: #E0B04A; color: #1A1A1A; }
  .book-frame-wrap {
    width: min(100% - 32px, 1200px);
    height: 640px;
    margin: 12px auto 56px;
    background: #1A1A1A;
    border: 1px solid rgba(224, 176, 74, 0.28);
    border-radius: 12px;
    overflow: hidden;
  }
  .book-frame {
    display: block;
    width: 100%;
    height: calc(640px + 76px);
    margin-top: -76px;
    border: 0;
    background: #0C0C0C;
  }
  @media (max-width: 1280px) {
    .book-landing .nav-links { gap: 16px; }
  }
  @media (max-width: 480px) {
    .book-frame-wrap {
      width: calc(100% - 16px);
      height: 720px;
      border-radius: 10px;
    }
    .book-frame { height: calc(720px + 76px); }
  }
`;

export function bookLandingMainHtml() {
  return `<main id="main">
<section class="book-intro">
  <div class="wrap">
    <h1>Book mobile RV repair</h1>
    <p>On-site booking is Washington only. Outside Washington, remote help is at <a href="${REMOTE_HELP_HREF}">unitedmobilerv.com/remote/</a>. <a href="${CALL_HREF}">Call</a> or <a href="${TEXT_NOW_HREF}">text</a> (616) 606-5277.</p>
    <p class="book-fallback-row"><a class="btn btn-gold book-fallback" href="${SQUARE_BOOKING_PAGE_URL}" target="_blank" rel="noopener">Open booking in a new tab</a></p>
  </div>
</section>
<div class="book-frame-wrap">
<!-- Square booking embed: functions/_lib/square-booking-embed.js -->
${SQUARE_BOOKING_EMBED_HTML}
</div>
</main>`;
}

export const BOOK_LANDING_NAV_JS = `(function(){var header=document.querySelector('.site-header');var toggle=document.querySelector('.nav-toggle');if(!toggle||!header)return;toggle.addEventListener('click',function(){var open=header.classList.toggle('is-open');toggle.setAttribute('aria-expanded',open?'true':'false');});})();`;
