/**
 * Booking suite HTML -- Square + Text Now shell, no replacement form.
 *
 * Served at:
 *   - book.unitedmobilerv.com/          (HOST_HOME_REWRITES in functions/index.js)
 *   - /book-service/ on every other host (functions/book-service/index.js)
 *
 * Shared ecosystem chrome (mesh-chrome) so book. matches forum/shop.
 * Canonical/og:url use the request host. book. stays noindex until Matt
 * says otherwise. Text Now is sms:+16166065277; number is tel:; Book → Square.
 */

import {
  islandHeader,
  islandMobileBar,
  meshFooterAnchors,
  TEXT_NOW_HREF,
  TEXT_NOW_LABEL,
  CALL_HREF,
  CALL_LABEL,
  SQUARE_BOOK_URL,
  MAIN_HOME_HREF,
  MAIN_HOME_LABEL,
} from './mesh-chrome.js';
import {
  bookExpectSection,
  bookHeroHtml,
  diagnosticProcessSection,
  publishedRatesSection,
  serviceLinesSection,
  techVoiceSection,
  troubleshootingSection,
} from './island-substance.js';

export const BOOK_HOST = 'book.unitedmobilerv.com';
export { SQUARE_BOOK_URL };
export const BOOK_PHONE_DISPLAY = '(616) 606-5277';
export const BOOK_PHONE_E164 = '+16166065277';

export function isBookHost(hostname) {
  return hostname === BOOK_HOST;
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

const SUITE_CSS = `
  .book-suite .page-hero { padding: 64px 0 40px; }
  .book-cta-row { display:flex; flex-wrap:wrap; gap:14px; justify-content:center; margin-top:8px; }
  .book-cta-row .btn { min-width: 220px; }
  .book-expect { display:grid; grid-template-columns:repeat(3,1fr); gap:28px; margin-top:28px; }
  @media (max-width:800px) { .book-expect { grid-template-columns:1fr; } }
  .book-expect .step-num { color:#C9972C; font-size:12px; letter-spacing:.18em; text-transform:uppercase; font-weight:600; display:block; margin-bottom:10px; }
`;

function suiteFooter({ bookHost }) {
  const apexNote = bookHost
    ? `<p class="mt-6 mb-0 muted">Return to <a href="${MAIN_HOME_HREF}">${MAIN_HOME_LABEL}</a></p>`
    : '';
  return `<div class="wrap footer-grid">
    <div>
      <div class="footer-brand">United Mobile RV LLC</div>
      <p class="mb-0">Active MT · WY · ID · WA corridor. Case-by-case beyond.</p>
      <p class="mt-6 mb-0"><a href="${CALL_HREF}">${CALL_LABEL}</a><br>
      <a href="mailto:unitedrvnetwork@gmail.com">unitedrvnetwork@gmail.com</a></p>
      ${apexNote}
    </div>
    <div>
      <div class="micro">Network</div>
      ${meshFooterAnchors()}
    </div>
    <div>
      <div class="micro">Credentials</div>
      <p class="muted mb-0" style="font-size:13px;line-height:1.7">
        Victron Professional Certified Installer<br>
        weBoost Authorized Installer<br>
        Peplink Certified Associate<br>
        Starlink installs (not a Starlink-certified installer)
      </p>
    </div>
  </div>`;
}

function suiteMain({ bookHost }) {
  return `<main id="main">
${bookHeroHtml()}
${bookExpectSection()}
${techVoiceSection()}
${diagnosticProcessSection()}
${serviceLinesSection()}
${troubleshootingSection()}
${publishedRatesSection({ includeRateSheetLink: !bookHost })}
</main>`;
}

function pageShell({ title, description, canonical, bookHost, robotsMeta, mainHtml, extraFooter = '' }) {
  const robots = robotsMeta ? `<meta name="robots" content="${esc(robotsMeta)}">\n` : '';
  return `<!DOCTYPE html>
<html lang="en" data-book-suite="${bookHost ? 'book-host' : 'mothership'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
${robots}<meta name="theme-color" content="#1A1A1A">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(canonical)}">
<link rel="stylesheet" href="/css/site.css?v=20260916viz">
<style>${SUITE_CSS}</style>
</head>
<body class="book-suite">
<a class="skip-link" href="#main">Skip to content</a>
${islandHeader({ current: 'book' })}
${mainHtml}
<footer class="site-footer">
  ${suiteFooter({ bookHost })}
  ${extraFooter}
  <div class="wrap">
    <p class="footer-note"><span class="footer-quiet">United Mobile RV LLC — diagnostic-first mobile RV repair.</span> Official UMRT and Victron Professional Certified Installer marks shown where authorized.</p>
  </div>
</footer>
${islandMobileBar()}
<script src="/js/site.js?v=20260918mesh" defer></script>
</body>
</html>`;
}

export function renderBookSuite(request) {
  const url = new URL(request.url);
  const bookHost = isBookHost(url.hostname);
  const canonical = bookHost ? `${url.origin}/` : `${url.origin}/book-service/`;
  const title = 'Book a Mobile RV Repair Visit | United Mobile RV';
  const description = 'Request a mobile RV repair visit at your campsite, driveway, or storage yard. Every request is reviewed personally. Book on Square or text (616) 606-5277.';
  const html = pageShell({
    title,
    description,
    canonical,
    bookHost,
    robotsMeta: bookHost ? 'noindex, follow' : '',
    mainHtml: suiteMain({ bookHost }),
    extraFooter: `<div class="wrap footer-proof" aria-label="Real job photos">
    <div class="footer-brand-row">
      <img class="footer-logo" src="/assets/brand/umrt-logo.webp" width="40" height="40" alt="United Mobile RV">
      <span class="footer-proof-cap">Real jobs · real rigs</span>
    </div>
    <div class="footer-proof-strip">
      <img src="/assets/photos/jobs/img_3280-1200.webp" width="160" height="120" loading="lazy" decoding="async" alt="Brinkley fifth-wheel driveway electrical bay service">
      <img src="/assets/photos/jobs/img_3286-1200.webp" width="160" height="120" loading="lazy" decoding="async" alt="Completed Victron MultiPlus lithium power install">
      <img src="/assets/photos/jobs/img_3018-1200.webp" width="160" height="120" loading="lazy" decoding="async" alt="Tiffin Allegro Open Road driveway service">
      <img src="/assets/photos/jobs/img_2937-1200.webp" width="160" height="120" loading="lazy" decoding="async" alt="Fluke diagnostics in open RV electrical bay">
    </div>
  </div>`,
  });
  return htmlResponse(html);
}

export function renderBookThankYou(request) {
  const url = new URL(request.url);
  const bookHost = isBookHost(url.hostname);
  const canonical = `${url.origin}/book-service/thank-you/`;
  const backHref = bookHost ? '/' : '/book-service/';
  const apexReturn = `<a class="btn btn-ghost" href="${MAIN_HOME_HREF}">${MAIN_HOME_LABEL}</a>`;
  const title = 'Thank you | United Mobile RV';
  const description = 'Booking request received.';
  const mainHtml = `<main id="main">
<section class="page-hero">
  <div class="wrap">
    <span class="micro">Book</span>
    <h1>Request received</h1>
    <p class="lead">Thank you. We will follow up shortly. For something more urgent, text ${BOOK_PHONE_DISPLAY} — you reach the technician directly.</p>
  </div>
</section>
<section class="band"><div class="wrap"><div class="btn-row">
  <a class="btn btn-gold" href="${TEXT_NOW_HREF}">${TEXT_NOW_LABEL}</a>
  <a class="btn btn-ghost" href="${esc(backHref)}">Back to booking</a>
  ${apexReturn}
</div></div></section>
</main>`;
  const html = pageShell({
    title,
    description,
    canonical,
    bookHost,
    robotsMeta: bookHost ? 'noindex, follow' : '',
    mainHtml,
  });
  return htmlResponse(html);
}

function htmlResponse(html) {
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
