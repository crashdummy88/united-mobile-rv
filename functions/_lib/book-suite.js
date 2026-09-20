/**
 * Booking suite HTML -- Square embed + Text Now, no replacement form.
 *
 * Served at:
 *   - book.unitedmobilerv.com/          (HOST_HOME_REWRITES in functions/index.js)
 *   - /book-service/ on every other host (functions/book-service/index.js)
 *
 * Unique job (page body, not chrome):
 *   1. Embed Square appointment booking on this page (no bounce-away hop).
 *      Land host stays book.* / the request host. Square still processes.
 *   2. UMRV substance: services honesty, corridor, credentials, how booking works.
 *   3. Text Now = sms:+16166065277 · Call = tel:+16166065277
 *   4. Shop parts handoff (https://shop.unitedmobilerv.com/) when an install
 *      needs gear -- not a catalog clone.
 *   5. Same Google SSO as shop/forum (/api/auth/google/login, /api/me, /api/logout).
 *
 * Square embed URL (Pages env, optional):
 *   SQUARE_EMBED_URL     https Square-land URL used as the iframe src
 *   SQUARE_BOOKING_URL   fallback if SQUARE_EMBED_URL is unset / not Square-land
 * Default iframe src is the working Square Online homepage
 * (https://united-mobile-rv-llc.square.site/) -- /s/appointments exists
 * (GET 200) but the live widget has errored; do not default there.
 * Paste a working Appointments share / widget URL into SQUARE_EMBED_URL
 * when Matt publishes one. Non-Square pastes are rejected.
 *
 * Shared ecosystem chrome (mesh-chrome) so book. matches forum/shop.
 * Do not rewrite MESH identity here. Canonical/og:url use the request host.
 * book. stays noindex until Matt says otherwise.
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
import { isSquareLandUrl } from './shop.js';

export const BOOK_HOST = 'book.unitedmobilerv.com';
export { SQUARE_BOOK_URL };
export const BOOK_PHONE_DISPLAY = '(616) 606-5277';
export const BOOK_PHONE_E164 = '+16166065277';
export const SHOP_PUBLIC_HREF = 'https://shop.unitedmobilerv.com/';
export const GOOGLE_LOGIN_HREF = '/api/auth/google/login';

export function isBookHost(hostname) {
  return hostname === BOOK_HOST;
}

/**
 * Iframe src for the on-page Square scheduler.
 * Preference: SQUARE_EMBED_URL → SQUARE_BOOKING_URL → Square Online homepage.
 * Only https Square-land URLs are accepted (same allowlist as shop cards).
 */
export function squareEmbedSrc(env) {
  const candidates = [
    env && env.SQUARE_EMBED_URL,
    env && env.SQUARE_BOOKING_URL,
  ];
  for (const value of candidates) {
    if (isSquareLandUrl(value)) return String(value).trim();
  }
  return SQUARE_BOOK_URL;
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

const GOOGLE_ICON = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>`;

const SUITE_CSS = `
  .book-suite .page-hero { padding: 64px 0 40px; }
  .book-cta-row { display:flex; flex-wrap:wrap; gap:14px; justify-content:center; margin-top:8px; }
  .book-cta-row .btn { min-width: 220px; }
  .book-expect { display:grid; grid-template-columns:repeat(3,1fr); gap:28px; margin-top:28px; }
  @media (max-width:800px) { .book-expect { grid-template-columns:1fr; } }
  .book-expect .step-num { color:#C9972C; font-size:12px; letter-spacing:.18em; text-transform:uppercase; font-weight:600; display:block; margin-bottom:10px; }
  .square-embed-slot { margin-top:28px; border:1px solid rgba(201,151,44,0.35); background:#111; }
  .square-embed-slot iframe,
  .square-embed-frame { display:block; width:100%; min-height:880px; height:min(92vh, 1080px); border:0; background:#fff; }
  .book-sso { margin-top:22px; padding:18px 20px; border:1px solid rgba(255,255,255,0.12); }
  .google-signin-btn{display:inline-flex;align-items:center;gap:10px;background:#fff;color:#3c4043;
    border:1px solid #dadce0;border-radius:8px;padding:10px 20px;font-family:Inter,Roboto,sans-serif;
    font-size:14px;font-weight:500;text-decoration:none;box-shadow:0 1px 2px rgba(0,0,0,.08);}
  .google-signin-btn:hover{background:#f8f9fa;color:#3c4043;}
  .google-signin-btn svg{flex-shrink:0;}
  .book-honesty { display:grid; grid-template-columns:repeat(2,1fr); gap:28px; margin-top:28px; }
  @media (max-width:800px) { .book-honesty { grid-template-columns:1fr; } }
`;

const SSO_SCRIPT = `
(function () {
  var bar = document.getElementById('book-sso');
  if (!bar) return;
  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }
  function signedIn(user) {
    bar.innerHTML = '<p class="mb-0">Signed in as <strong>' + esc(user.name) + '</strong> — same Google account as Shop.</p>'
      + '<p class="muted" style="margin-top:10px">Display only on this page. Square still processes the booking.</p>'
      + '<button class="btn btn-ghost" id="book-sso-logout" type="button" style="margin-top:12px">Sign out</button>';
    var btn = document.getElementById('book-sso-logout');
    if (btn) btn.addEventListener('click', function () {
      fetch('/api/logout', { method: 'POST' }).finally(function () { location.reload(); });
    });
  }
  fetch('/api/me').then(function (r) { return r.json(); }).then(function (data) {
    if (data && data.user) signedIn(data.user);
  }).catch(function () {});
})();
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

function suiteMain({ bookHost, embedSrc }) {
  const rateSheet = bookHost
    ? ''
    : `<p class="mt-8 muted">Full rate sheet: <a href="/pricing/">Pricing</a>.</p>`;
  const landNote = bookHost
    ? 'You stay on book.unitedmobilerv.com — that is the land host. Square processes the appointment on this page.'
    : 'You stay on this booking page. Square processes the appointment in the embed below.';
  return `<main id="main">
<section class="page-hero">
  <div class="wrap">
    <span class="micro">Booking</span>
    <h1>Book a mobile RV visit</h1>
    <p class="lead">Service booking only. The Square scheduler is on this page — no bounce-away hop. Text if you want the technician first. Every request is reviewed personally — trip fee and price confirmed before we roll.</p>
  </div>
</section>
<section class="band" style="padding-top:48px;padding-bottom:24px">
  <div class="wrap-narrow" style="text-align:center">
    <div class="book-cta-row">
      <a class="btn btn-gold" href="#square-booking" style="font-size:1.05em;padding:0 40px;">BOOK ONLINE</a>
      <a class="btn btn-ghost" href="${TEXT_NOW_HREF}">${TEXT_NOW_LABEL}</a>
    </div>
    <p class="muted" style="margin-top:20px">${landNote} Or <a href="${CALL_HREF}">${CALL_LABEL}</a> — same number, technician directly.</p>
  </div>
</section>
<section class="band" id="square-booking" style="padding-top:16px">
  <div class="wrap">
    <span class="micro">Square appointment booking</span>
    <h2>Book on this page</h2>
    <p>The official intake is Square. Finish the request in the scheduler below. This is not a second form and not a shop cart — booking still processes via Square.</p>
    <div class="square-embed-slot" data-square-embed="appointment" data-square-embed-src="${esc(embedSrc)}">
      <iframe class="square-embed-frame" title="Square appointment booking — United Mobile RV" src="${esc(embedSrc)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allow="payment"></iframe>
    </div>
    <p class="muted" style="margin-top:16px">If a browser blocks the framed scheduler, <a href="${TEXT_NOW_HREF}">${TEXT_NOW_LABEL}</a> and we take the request. Same Square intake when the frame loads.</p>
    <div class="book-sso" data-book-sso="shared-google">
      <span class="micro">Same Google login as Shop</span>
      <p>Shared United Mobile RV account — the same Google sign-in used on Shop and Forum. Sign-in is display-only here and is never linked to payment unless you separately complete a Square booking.</p>
      <div id="book-sso">
        <a class="google-signin-btn" href="${GOOGLE_LOGIN_HREF}">${GOOGLE_ICON}<span>Sign in with Google</span></a>
      </div>
    </div>
  </div>
</section>
<section class="band" style="padding-top:16px">
  <div class="wrap">
    <span class="micro">How booking works</span>
    <h2>Three steps. No surprise invoice.</h2>
    <div class="book-expect">
      <div>
        <span class="step-num">01</span>
        <h3>Book or text</h3>
        <p>Use BOOK ONLINE on this page (Square embed), or Text Now. Tell us the issue, City/ZIP, and the rig.</p>
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
<section class="band">
  <div class="wrap">
    <span class="micro">Services honesty</span>
    <h2>What we actually book</h2>
    <p>Diagnostic-first mobile RV repair at your campsite, driveway, or storage yard. One tech, pro tooling — thermal imaging, DVOM, combustible-gas leak detection, and manufacturer-aligned commissioning for Victron and Peplink when the job needs it.</p>
    <div class="book-honesty">
      <div>
        <h3>We take</h3>
        <p>Electrical and battery drain. Victron power systems. weBoost installs. Peplink bonding or failover. Starlink installs only. Plumbing, roof leaks, generators, LP safety, PPI, winterization, and trip-prep checks we can do correctly in the field.</p>
      </div>
      <div>
        <h3>We do not pretend</h3>
        <p>Shop-lift rebuilds, paint booths, and major frame work stay shop territory. We do not invent a total before diagnosis. We do not claim a shop street address — Text with City/ZIP.</p>
      </div>
    </div>
  </div>
</section>
<section class="band band-light">
  <div class="wrap">
    <span class="micro">Corridor</span>
    <h2>Active MT · WY · ID · WA</h2>
    <p>Active corridor: Montana · Wyoming · Idaho · Washington. Case-by-case beyond. Soft MT (Billings / Bozeman / Missoula): when routed through / next sequenced pass — not "based-here-now." Alpine–Jackson is a dense window when we are sequenced there.</p>
    <p class="muted mb-0">No fake map pins. Confirm City/ZIP when you book or text so the trip fee is quoted from the on-route base before we leave.</p>
  </div>
</section>
<section class="band">
  <div class="wrap">
    <span class="micro">Credentials — exact</span>
    <h2>What we are certified for</h2>
    <div class="grid-2 mt-8">
      <div class="service-card"><h3>Victron Professional Certified Installer</h3><p>Power systems designed and installed to that standard — not a hobby Victron badge.</p></div>
      <div class="service-card"><h3>weBoost Authorized Installer</h3><p>Cellular booster installs with clean coax, power, and placement. Needs usable outdoor signal.</p></div>
      <div class="service-card"><h3>Peplink Certified Associate</h3><p>Mobile router installs — bonding and/or failover when one carrier is not enough.</p></div>
      <div class="service-card"><h3>Starlink installs only</h3><p>Starlink installs (not a Starlink-certified installer). We mount, seal, route, and integrate power. No certified-partner title.</p></div>
    </div>
  </div>
</section>
<section class="band">
  <div class="wrap">
    <span class="micro">Shop parts — not this page</span>
    <h2>Need gear for an install?</h2>
    <p>This host is service booking only. When a Victron, weBoost, Peplink, or Starlink job needs hardware, parts live on Shop — we do not clone the catalog here.</p>
    <div class="btn-row" style="margin-top:20px">
      <a class="btn btn-ghost" href="${SHOP_PUBLIC_HREF}">Shop parts</a>
      <a class="btn btn-gold" href="${TEXT_NOW_HREF}">${TEXT_NOW_LABEL}</a>
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
${islandHeader()}
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
<script>${SSO_SCRIPT}</script>
</body>
</html>`;
}

export function renderBookSuite(request, env) {
  const url = new URL(request.url);
  const bookHost = isBookHost(url.hostname);
  const canonical = bookHost ? `${url.origin}/` : `${url.origin}/book-service/`;
  const title = 'Book a Mobile RV Repair Visit | United Mobile RV';
  const description = 'Book mobile RV repair at your campsite, driveway, or storage yard. Square booking stays on this page, or Text Now (616) 606-5277.';
  const embedSrc = squareEmbedSrc(env);
  const html = pageShell({
    title,
    description,
    canonical,
    bookHost,
    robotsMeta: bookHost ? 'noindex, follow' : '',
    mainHtml: suiteMain({ bookHost, embedSrc }),
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
    <p class="lead">Thanks — we will follow up shortly. Need something sooner? Text Now ${BOOK_PHONE_DISPLAY}.</p>
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
