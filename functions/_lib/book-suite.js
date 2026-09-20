/**
 * Booking suite HTML -- Square embed wrap + Text Now shell.
 *
 * Served at:
 *   - book.unitedmobilerv.com/          (HOST_HOME_REWRITES in functions/index.js)
 *   - /book-service/ on every other host (functions/book-service/index.js)
 *
 * Shared ecosystem chrome (mesh-chrome) so book. matches forum/shop.
 * Canonical/og:url use the request host. book. stays noindex until Matt
 * says otherwise. Text Now is sms:+16166065277; number is tel:.
 * Unique job: book a visit (Square embed + Text Now + booking confidence).
 * Do not clone the shop catalog or docs/guide library onto this page.
 * Square still processes the booking; this page wraps it so customers
 * stay on book.unitedmobilerv.com.
 *
 * Live square.site check (2026-09-20) — do not invent beyond bootstrap:
 *   - Engine: https://united-mobile-rv-llc.square.site/ (appointment-request).
 *     Response has no X-Frame-Options / CSP frame-ancestors — iframe it.
 *   - Book Appointment action id 11ee0a41ff32bdd39387ac1f6bbbd01e and
 *     merchant MLVM87VQ3KP9E are documented on the wrap. Official
 *     buyer/widget/{id}[.js] is unpublished (404 + X-Frame DENY) — do not
 *     script-load or iframe that path.
 *   - Square's page name is "Square Portal" (comment only; not customer H1).
 *   - If the homepage iframe is blocked at runtime, show in-page fallback
 *     (Text Now + Square Online hop). Optional Pages env
 *     SQUARE_APPOINTMENTS_EMBED_SRC is accepted only when Square-land https.
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
  BOOK_PUBLIC_HREF,
  SQUARE_APPOINTMENT_ID,
  SQUARE_MERCHANT_ID,
  MAIN_HOME_HREF,
  MAIN_HOME_LABEL,
} from './mesh-chrome.js';
import { isSquareLandUrl } from './shop.js';

export const BOOK_HOST = 'book.unitedmobilerv.com';
export { SQUARE_BOOK_URL, BOOK_PUBLIC_HREF, SQUARE_APPOINTMENT_ID, SQUARE_MERCHANT_ID };
export const BOOK_PHONE_DISPLAY = '(616) 606-5277';
export const BOOK_PHONE_E164 = '+16166065277';
export const SQUARE_EMBED_ENV = 'SQUARE_APPOINTMENTS_EMBED_SRC';

export function isBookHost(hostname) {
  return hostname === BOOK_HOST;
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/**
 * Square embed src. Preference:
 *   1. Pages env SQUARE_APPOINTMENTS_EMBED_SRC when it is Square-land https
 *   2. Matt's published Square Online URL (SQUARE_BOOK_URL)
 * Never invents widget, location, or appointment-unit IDs. A non-Square
 * env paste is ignored and the known square.site homepage is used instead.
 */
export function squareAppointmentsEmbedSrc(env) {
  const raw = env && env[SQUARE_EMBED_ENV];
  if (isSquareLandUrl(raw)) return String(raw).trim();
  return SQUARE_BOOK_URL;
}

const INTENT_KEYS = ['service', 'service_name', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];

export function squareAppointmentsEmbedSrcWithIntent(env, request) {
  const base = squareAppointmentsEmbedSrc(env);
  if (!base) return '';
  if (!request) return base;
  try {
    const u = new URL(base);
    const incoming = new URL(request.url);
    for (const key of INTENT_KEYS) {
      const v = incoming.searchParams.get(key);
      if (v && !u.searchParams.has(key)) u.searchParams.set(key, v);
    }
    return u.toString();
  } catch {
    return base;
  }
}

const SUITE_CSS = `
  .book-suite .page-hero { padding: 72px 0 36px; }
  .book-cta-row { display:flex; flex-wrap:wrap; gap:14px; justify-content:flex-start; margin-top:8px; }
  .book-cta-row .btn { min-width: 220px; }
  .book-hybrid { display:grid; grid-template-columns:minmax(0,0.95fr) minmax(0,1.15fr); gap:40px; align-items:start; }
  @media (max-width:960px) { .book-hybrid { grid-template-columns:1fr; } }
  .square-appointments-frame { width:100%; min-height:780px; border:1px solid rgba(201,151,44,0.35); border-radius:12px; background:#111; }
  .square-embed-wrap { position:sticky; top:84px; }
  .square-embed-wrap[data-square-embed="frame-blocked"] .square-appointments-frame { display:none; }
  .square-embed-fallback { margin-top:8px; padding:22px; border:1px solid rgba(201,151,44,0.35); border-radius:12px; background:#161616; }
  .square-embed-note { margin-top:12px; }
  .book-ready-list { margin:18px 0 0; padding-left:20px; color:rgba(255,255,255,0.78); }
  .book-ready-list li { margin:0 0 8px; }
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
      ${meshFooterAnchors({ current: 'book' })}
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

function squareFallbackLink(label = 'Open Square booking') {
  return `<a class="btn btn-ghost" href="${esc(SQUARE_BOOK_URL)}" target="_blank" rel="noopener">${esc(label)}</a>`;
}

function embedPanel({ env, request }) {
  const src = squareAppointmentsEmbedSrcWithIntent(env, request);
  const overridden = isSquareLandUrl(env && env[SQUARE_EMBED_ENV]);
  return `<div class="square-embed-wrap" data-square-embed="${overridden ? 'live' : 'square-site'}" data-square-appointment-id="${esc(SQUARE_APPOINTMENT_ID)}" data-square-merchant-id="${esc(SQUARE_MERCHANT_ID)}">
      <iframe class="square-appointments-frame" src="${esc(src)}" title="Request an appointment with United Mobile RV" loading="eager" referrerpolicy="no-referrer-when-downgrade"></iframe>
      <div class="square-embed-fallback" data-square-fallback hidden>
        <p>The Square panel could not be displayed here. Continue the same service request on Square Online, or Text Now to reach Matt directly.</p>
        <div class="book-cta-row">
          <a class="btn btn-gold" href="${esc(SQUARE_BOOK_URL)}" target="_blank" rel="noopener">Continue on Square</a>
          <a class="btn btn-ghost" href="${TEXT_NOW_HREF}">${TEXT_NOW_LABEL}</a>
        </div>
      </div>
      <p class="muted square-embed-note">Payment is processed securely by Square. To reach the technician first, Text Now or call — same number.</p>
      <p class="muted">${squareFallbackLink('Open Square in a new tab')}</p>
    </div>`;
}

function suiteMain({ bookHost, env, request }) {
  const mothershipRates = bookHost
    ? ''
    : `<p class="muted mt-8">Published rates live on the main site: <a href="/pricing/">Pricing</a>.</p>`;
  return `<main id="main">
<section class="page-hero">
  <div class="wrap">
    <span class="eyebrow">Now booking — MT · WY · ID · WA corridor</span>
    <span class="micro">Mobile RV, van &amp; trailer repair</span>
    <h1>Request a service call</h1>
    <p class="lead">Tell us what is going on and where you are located. Matt reviews every request personally and confirms the trip fee and diagnostic before he arrives. Service is at your campsite, driveway, or storage yard — no shop drop-off.</p>
  </div>
</section>
<section class="trust-strip" aria-label="Trust">
  <div class="wrap trust-row">
    <a class="trust-chip" href="https://www.google.com/maps/place/United+Mobile+RV+LLC/data=!4m2!3m1!1s0x0:0xb040c24e93fec214" target="_blank" rel="noopener"><strong>13 Google ★5.0</strong> reviews</a>
    <span class="trust-chip"><strong>Victron Professional</strong> Certified Installer</span>
    <span class="trust-chip"><strong>weBoost</strong> Authorized Installer</span>
    <span class="trust-chip"><strong>Peplink</strong> Certified Associate</span>
  </div>
</section>
<section class="band book-hybrid-band" style="padding-top:24px;padding-bottom:40px">
  <div class="wrap book-hybrid">
    <div class="book-hybrid-copy">
      <span class="micro">Book on this page</span>
      <h2>Request the visit</h2>
      <p>Submit a service request in the Square panel. Rather call or text? You will reach Matt directly.</p>
      <div class="book-cta-row">
        <a class="btn btn-ghost" href="${CALL_HREF}">${CALL_LABEL}</a>
        <a class="btn btn-gold" href="${TEXT_NOW_HREF}">${TEXT_NOW_LABEL}</a>
      </div>
      <h3 style="margin-top:28px">What to include</h3>
      <ul class="book-ready-list">
        <li>City or ZIP, and where the coach is located (campsite, driveway, or storage yard)</li>
        <li>Year, make, and model</li>
        <li>The symptom — when it started, any codes, and what has already been tried</li>
        <li>A preferred window, if you have one. This is a request until Matt confirms the appointment.</li>
      </ul>
    </div>
    <div class="book-hybrid-embed" id="square-booking">
      ${embedPanel({ env, request })}
    </div>
  </div>
</section>
<section class="band" style="padding-top:16px">
  <div class="wrap">
    <span class="micro">What to expect</span>
    <h2>Quoted upfront. Then we come to you.</h2>
    <div class="book-expect">
      <div>
        <span class="step-num">01</span>
        <h3>Request the visit</h3>
        <p>Use the Square panel or Text Now. Include city or ZIP, the coach, and the symptom. This is a request until Matt confirms the appointment.</p>
      </div>
      <div>
        <span class="step-num">02</span>
        <h3>We confirm scope</h3>
        <p>The trip fee is quoted before travel. Diagnosis comes first — we do not quote a repair total before we inspect the system.</p>
      </div>
      <div>
        <span class="step-num">03</span>
        <h3>Test, then price the fix</h3>
        <p>You authorize the repair after the diagnosis. The $175 diagnostic applies toward the work if you proceed. Parts are billed separately.</p>
      </div>
    </div>
    ${mothershipRates}
  </div>
</section>
<section class="band band-light">
  <div class="wrap grid-2">
    <div>
      <span class="micro">Corridor</span>
      <h2>Montana · Wyoming · Idaho · Washington</h2>
      <p>Active scheduled corridor through MT · WY · ID · WA. We come to the campsite, driveway, or storage yard. Other states are served case-by-case as the route allows.</p>
    </div>
    <div>
      <span class="micro">On site</span>
      <h2>Owner-technician on every visit</h2>
      <p>Victron Professional Certified Installer · weBoost Authorized Installer · Peplink Certified Associate. Starlink installs (not a Starlink-certified installer).</p>
    </div>
  </div>
</section>
<section class="band">
  <div class="wrap wrap-narrow">
    <span class="micro">Before you book</span>
    <h2>Straight answers</h2>
    <div class="faq-item"><h3>How do I book?</h3><p>Use the Square panel on this page, or Text Now or call (616) 606-5277.</p></div>
    <div class="faq-item"><h3>Is the time confirmed when I submit?</h3><p>No. This is a request until Matt confirms the appointment and the trip fee.</p></div>
    <div class="faq-item"><h3>Do you have a shop I drop off at?</h3><p>No. We come to your campsite, driveway, or storage yard.</p></div>
    <div class="faq-item"><h3>Who will be on site?</h3><p>The owner-technician is on site for every visit.</p></div>
  </div>
</section>
<section class="band" style="border-top:1px solid var(--rule)">
  <div class="wrap">
    <span class="micro">Ready</span>
    <h2>Schedule the visit</h2>
    <p class="lead">Submit the Square request or Text Now. We confirm the trip fee and diagnostic before travel.</p>
    <div class="book-cta-row">
      <a class="btn btn-ghost" href="${CALL_HREF}">${CALL_LABEL}</a>
      <a class="btn btn-gold" href="${TEXT_NOW_HREF}">${TEXT_NOW_LABEL}</a>
      <a class="btn btn-ghost" href="#square-booking">Book on this page</a>
    </div>
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
<script src="/js/site.js?v=20260920appt" defer></script>
</body>
</html>`;
}

export function renderBookSuite(request, env) {
  const url = new URL(request.url);
  const bookHost = isBookHost(url.hostname);
  const canonical = bookHost ? `${url.origin}/` : `${url.origin}/book-service/`;
  const title = 'Book a Mobile RV Repair Visit | United Mobile RV';
  const description = 'Request a mobile RV service call at your campsite, driveway, or storage yard. Text Now (616) 606-5277, or use the Square panel on this page. Active MT · WY · ID · WA corridor.';
  const html = pageShell({
    title,
    description,
    canonical,
    bookHost,
    robotsMeta: bookHost ? 'noindex, follow' : '',
    mainHtml: suiteMain({ bookHost, env: env || {}, request }),
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
    <p class="lead">We received your request and will follow up shortly. For something sooner, Text Now ${BOOK_PHONE_DISPLAY}.</p>
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
