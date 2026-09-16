/**
 * Booking suite HTML -- Square + Prefer Text shell, no replacement form.
 *
 * Served at:
 *   - book.unitedmobilerv.com/          (HOST_HOME_REWRITES in functions/index.js)
 *   - /book-service/ on every other host (functions/book-service/index.js)
 *
 * On book. the page is a dedicated booking product: no mothership mega-nav,
 * canonical/og:url use the request host, noindex until Matt says otherwise.
 * On other hosts the same intake stays, with the normal site chrome.
 */

import { platformBarHtml, platformFooterColHtml } from './platform-chrome.js';

export const BOOK_HOST = 'book.unitedmobilerv.com';
export const SQUARE_BOOK_URL = 'https://united-mobile-rv-llc.square.site/';
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
  .book-host-nav .nav-links, .book-host-nav .nav-toggle { display:none; }
  .book-host-nav .nav-bar { justify-content:space-between; }
`;

function mothershipNav() {
  return `<button class="nav-toggle" type="button" aria-label="Menu" aria-expanded="false">☰</button>
    <ul class="nav-links">
      <li><a href="/">Home</a></li>
      <li><a href="/service/">Services</a></li>
      <li><a href="/pricing/">Pricing</a></li>
      <li><a href="/guide/">Guides</a></li>
      <li><a href="/service-areas/">Areas</a></li>
      <li><a href="/about/">About</a></li>
      <li><a href="https://shop.unitedmobilerv.com/">Shop</a></li>
      <li><a href="https://portal.unitedmobilerv.com/">Portal</a></li>
    </ul>
    <div class="nav-cta">
      <a class="nav-phone" href="sms:${BOOK_PHONE_E164}">Prefer Text ${BOOK_PHONE_DISPLAY}</a>
      <a class="btn btn-gold" href="${esc(SQUARE_BOOK_URL)}" target="_blank" rel="noopener">BOOK ONLINE</a>
    </div>`;
}

function bookHostNav() {
  return `<div class="nav-cta">
      <a class="nav-phone" href="sms:${BOOK_PHONE_E164}">Prefer Text ${BOOK_PHONE_DISPLAY}</a>
      <a class="btn btn-gold" href="${esc(SQUARE_BOOK_URL)}" target="_blank" rel="noopener">BOOK ONLINE</a>
    </div>`;
}

function mothershipFooter() {
  return `<div class="wrap footer-grid">
    <div>
      <div class="footer-brand">United Mobile RV LLC</div>
      <p class="mb-0">Active MT · WY · ID · WA corridor. Case-by-case beyond.</p>
      <p class="mt-6 mb-0"><a href="sms:${BOOK_PHONE_E164}">Prefer Text ${BOOK_PHONE_DISPLAY}</a><br>
      <a href="mailto:unitedrvnetwork@gmail.com">unitedrvnetwork@gmail.com</a></p>
    </div>
    <div>
      <div class="micro">Navigate</div>
      <a href="/service/">Services</a>
      <a href="/pricing/">Pricing</a>
      <a href="https://book.unitedmobilerv.com/">Book</a>
      <a href="/guide/">Guides</a>
      <a href="/service-areas/">Service Areas</a>
      <a href="/about/">About</a>
      <a href="/faq/">FAQ</a>
      <a href="/privacy-policy/">Privacy</a>
      <a href="/terms-of-use/">Terms of Use</a>
    </div>
    ${platformFooterColHtml()}
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

function bookHostFooter() {
  return `<div class="wrap footer-grid">
    <div>
      <div class="footer-brand">United Mobile RV LLC</div>
      <p class="mb-0">Active MT · WY · ID · WA corridor. Case-by-case beyond.</p>
      <p class="mt-6 mb-0"><a href="sms:${BOOK_PHONE_E164}">Prefer Text ${BOOK_PHONE_DISPLAY}</a><br>
      <a href="mailto:unitedrvnetwork@gmail.com">unitedrvnetwork@gmail.com</a></p>
      <p class="mt-6 mb-0 muted">Full site: <a href="https://unitedmobilerv.com/">unitedmobilerv.com</a></p>
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
  const rateSheet = bookHost
    ? ''
    : `<p class="mt-8 muted">Full rate sheet: <a href="/pricing/">Pricing</a>.</p>`;
  return `<main id="main">
<section class="page-hero">
  <div class="wrap">
    <span class="micro">Booking</span>
    <h1>Book a mobile RV visit</h1>
    <p class="lead">Square is the official booking intake. Prefer Text if you want the technician first. Every request is reviewed personally — trip fee and price confirmed before we roll.</p>
  </div>
</section>
<section class="band" style="padding-top:48px;padding-bottom:32px">
  <div class="wrap-narrow" style="text-align:center">
    <div class="book-cta-row">
      <a class="btn btn-gold" href="${esc(SQUARE_BOOK_URL)}" target="_blank" rel="noopener" style="font-size:1.05em;padding:0 40px;">BOOK ONLINE</a>
      <a class="btn btn-ghost" href="sms:${BOOK_PHONE_E164}">Prefer Text ${BOOK_PHONE_DISPLAY}</a>
    </div>
    <p class="muted" style="margin-top:20px">Or <a href="tel:${BOOK_PHONE_E164}">call ${BOOK_PHONE_DISPLAY}</a> — same number, technician directly.</p>
  </div>
</section>
<section class="band" style="padding-top:16px">
  <div class="wrap">
    <span class="micro">What to expect</span>
    <h2>Three steps. No surprise invoice.</h2>
    <div class="book-expect">
      <div>
        <span class="step-num">01</span>
        <h3>Book or text</h3>
        <p>Use BOOK ONLINE (Square) or Prefer Text. Tell us the issue, City/ZIP, and the rig.</p>
      </div>
      <div>
        <span class="step-num">02</span>
        <h3>We confirm scope</h3>
        <p>Trip fee quoted upfront. Diagnostic-first — we do not guess a total before we see the system.</p>
      </div>
      <div>
        <span class="step-num">03</span>
        <h3>Price before work</h3>
        <p>You authorize the fix after the diagnosis. Parts and materials billed separately.</p>
      </div>
    </div>
  </div>
</section>
<section class="band band-light">
  <div class="wrap">
    <span class="micro">Published rates</span>
    <h2>Pricing snapshot</h2>
    <p>Same figures as the public rate sheet. Confirmed with you before we arrive.</p>
    <div class="grid-3 mt-8">
      <div class="price-card">
        <span class="micro">Labor rate</span>
        <div class="amount">$150</div>
        <div class="unit">Per hour</div>
        <p>1 hour minimum · billed in 30-minute increments after the first hour · parts and materials billed separately.</p>
      </div>
      <div class="price-card">
        <span class="micro">Trip / service call</span>
        <div class="amount">$75</div>
        <div class="unit">Within 30 miles</div>
        <p>Beyond 30 miles: $75 + $1.50/mi each way. Trip fee quoted upfront when you book or text.</p>
      </div>
      <div class="price-card">
        <span class="micro">Diagnostic</span>
        <div class="amount">$175</div>
        <div class="unit">Applied if you proceed</div>
        <p>Full system scan / DVOM / thermal imaging where applicable. Applied toward repair if you authorize the fix.</p>
      </div>
    </div>
    <div class="grid-2 mt-8">
      <div class="price-card">
        <h3>Winterization</h3>
        <div class="amount">$175</div>
        <div class="unit">Fixed price</div>
        <p>Labor included · materials extra. Separate line item — not by coach class.</p>
      </div>
      <div class="price-card">
        <h3>Trip prep &amp; safety check</h3>
        <div class="amount">$225</div>
        <div class="unit">Fixed price</div>
        <p>Labor included · materials extra. Brakes, lights, tires, hitch, LP check.</p>
      </div>
    </div>
    ${rateSheet}
  </div>
</section>
</main>`;
}

function pageShell({ title, description, canonical, bookHost, robotsMeta, mainHtml, homeHref, extraFooter = '' }) {
  const headerClass = bookHost ? 'site-header book-host-nav' : 'site-header';
  const nav = bookHost ? bookHostNav() : mothershipNav();
  const footerInner = bookHost ? bookHostFooter() : mothershipFooter();
  const siteJs = bookHost ? '' : `<script src="/js/site.js?v=20260912b" defer></script>`;
  const mobileBookHref = SQUARE_BOOK_URL;
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
<link rel="stylesheet" href="/css/site.css?v=20260916book">
<style>${SUITE_CSS}</style>
</head>
<body class="book-suite">
<a class="skip-link" href="#main">Skip to content</a>
${bookHost ? '' : platformBarHtml('book')}
<header class="${headerClass}">
  <div class="wrap nav-bar">
    <a class="brand" href="${esc(homeHref)}"><img class="brand-logo" src="/assets/brand/umrt-logo.webp" alt="United Mobile RV" width="36" height="36"><span class="brand-text">United Mobile <span>RV</span></span></a>
    ${nav}
  </div>
</header>
${mainHtml}
<footer class="site-footer">
  ${footerInner}
  ${extraFooter}
  <div class="wrap">
    <p class="footer-note"><span class="footer-quiet">United Mobile RV LLC — diagnostic-first mobile RV repair.</span> Official UMRT and Victron Professional Certified Installer marks shown where authorized.</p>
  </div>
</footer>
<div class="mobile-bar" aria-label="Quick actions">
  <a class="btn btn-ghost" href="sms:${BOOK_PHONE_E164}">Prefer Text</a>
  <a class="btn btn-gold" href="${esc(mobileBookHref)}" target="_blank" rel="noopener">BOOK ONLINE</a>
</div>
${siteJs}
</body>
</html>`;
}

export function renderBookSuite(request) {
  const url = new URL(request.url);
  const bookHost = isBookHost(url.hostname);
  const canonical = bookHost ? `${url.origin}/` : `${url.origin}/book-service/`;
  const homeHref = 'https://unitedmobilerv.com/';
  const title = 'Book a Mobile RV Repair Visit | United Mobile RV';
  const description = 'Book mobile RV repair at your campsite, driveway, or storage yard. BOOK ONLINE on Square, or Prefer Text (616) 606-5277.';
  const html = pageShell({
    title,
    description,
    canonical,
    bookHost,
    robotsMeta: bookHost ? 'noindex, follow' : '',
    mainHtml: suiteMain({ bookHost }),
    homeHref,
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
  const title = 'Thank you | United Mobile RV';
  const description = 'Booking request received.';
  const mainHtml = `<main id="main">
<section class="page-hero">
  <div class="wrap">
    <span class="micro">Book</span>
    <h1>Request received</h1>
    <p class="lead">Thanks — we will follow up shortly. Need something sooner? Prefer Text ${BOOK_PHONE_DISPLAY}.</p>
  </div>
</section>
<section class="band"><div class="wrap"><div class="btn-row">
  <a class="btn btn-gold" href="sms:${BOOK_PHONE_E164}">Prefer Text ${BOOK_PHONE_DISPLAY}</a>
  <a class="btn btn-ghost" href="${esc(backHref)}">Back to booking</a>
</div></div></section>
</main>`;
  const html = pageShell({
    title,
    description,
    canonical,
    bookHost,
    robotsMeta: bookHost ? 'noindex, follow' : '',
    mainHtml,
    homeHref: 'https://unitedmobilerv.com/',
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
