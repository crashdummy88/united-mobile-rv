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
 * Square still processes the booking; this page wraps it so customers
 * stay on book.unitedmobilerv.com. Embed src comes from Pages env
 * SQUARE_APPOINTMENTS_EMBED_SRC (Matt paste). No invented Square IDs.
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
  MAIN_HOME_HREF,
  MAIN_HOME_LABEL,
} from './mesh-chrome.js';
import { isSquareLandUrl } from './shop.js';

export const BOOK_HOST = 'book.unitedmobilerv.com';
export { SQUARE_BOOK_URL, BOOK_PUBLIC_HREF };
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
 * Official Square Appointments iframe/widget URL from Pages env only.
 * Rejects anything that is not a Square-land https URL. Never invents
 * widget, location, or appointment-unit IDs.
 */
export function squareAppointmentsEmbedSrc(env) {
  const raw = env && env[SQUARE_EMBED_ENV];
  if (!isSquareLandUrl(raw)) return '';
  return String(raw).trim();
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
  .book-suite .page-hero { padding: 64px 0 40px; }
  .book-cta-row { display:flex; flex-wrap:wrap; gap:14px; justify-content:flex-start; margin-top:8px; }
  .book-cta-row .btn { min-width: 220px; }
  .book-hybrid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.15fr); gap:36px; align-items:start; }
  @media (max-width:900px) { .book-hybrid { grid-template-columns:1fr; } }
  .square-appointments-frame { width:100%; min-height:720px; border:1px solid rgba(201,151,44,0.35); border-radius:12px; background:#111; }
  .square-embed-placeholder { border:1px dashed rgba(201,151,44,0.45); border-radius:12px; padding:28px; background:rgba(201,151,44,0.06); }
  .square-embed-placeholder code { color:#E8B84B; font-size:13px; }
  .square-embed-note { margin-top:12px; }
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
  if (src) {
    return `<div class="square-embed-wrap" data-square-embed="live">
      <iframe class="square-appointments-frame" src="${esc(src)}" title="Book an appointment with United Mobile RV" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
      <p class="muted square-embed-note">Square processes this booking. You stay on book.unitedmobilerv.com.</p>
    </div>`;
  }
  return `<div class="square-embed-placeholder" data-square-embed="pending">
    <span class="micro">Square Appointments</span>
    <h3>Embed not configured yet</h3>
    <p>Square still processes the booking. This page is the wrap so customers do not have to hop to square.site alone.</p>
    <p>Matt: in Square Dashboard open Appointments → booking site / embed, copy the official iframe or widget <strong>https URL</strong>, then set Cloudflare Pages env <code>${SQUARE_EMBED_ENV}</code> to that URL. Accepts squareup.com, square.site, squareupscheduling.com, or square.link only. Do not invent widget or location IDs.</p>
    <p class="muted">Until that env is set, Text Now or use the Square fallback.</p>
    <div class="book-cta-row">${squareFallbackLink()}</div>
  </div>`;
}

function suiteMain({ bookHost, env, request }) {
  const rateSheet = bookHost
    ? ''
    : `<p class="mt-8 muted">Full rate sheet: <a href="/pricing/">Pricing</a>.</p>`;
  const apex = MAIN_HOME_HREF.replace(/\/$/, '');
  return `<main id="main">
<section class="page-hero">
  <div class="wrap">
    <span class="micro">Booking</span>
    <h1>Book a mobile RV visit</h1>
    <p class="lead">Square processes the booking on this page — you stay on book.unitedmobilerv.com. Text or call if you want the technician first. Every request is reviewed personally — trip fee and price confirmed before we roll.</p>
  </div>
</section>
<section class="band book-hybrid-band" style="padding-top:24px;padding-bottom:32px">
  <div class="wrap book-hybrid">
    <div class="book-hybrid-copy">
      <span class="micro">Talk to the tech</span>
      <h2>Text Now or call — same number</h2>
      <p>Same convert pattern as the mesh. Text Now is <a href="${TEXT_NOW_HREF}">sms:+16166065277</a>. Call is <a href="${CALL_HREF}">tel:+16166065277</a>.</p>
      <div class="book-cta-row">
        <a class="btn btn-ghost" href="${CALL_HREF}">${CALL_LABEL}</a>
        <a class="btn btn-gold" href="${TEXT_NOW_HREF}">${TEXT_NOW_LABEL}</a>
      </div>
      <p class="muted" style="margin-top:20px">Active corridor MT · WY · ID · WA. Case-by-case beyond. Diagnostic-first — we do not guess a total before we see the system.</p>
    </div>
    <div class="book-hybrid-embed" id="square-booking">
      ${embedPanel({ env, request })}
    </div>
  </div>
</section>
<section class="band" style="padding-top:16px">
  <div class="wrap">
    <span class="micro">Services</span>
    <h2>What we fix — at your location</h2>
    <p>No shop drop-off. Root-cause diagnosis before parts. Electrical, power, connectivity, appliances, plumbing, and roof work on site.</p>
    <div class="grid-3 mt-8">
      <article class="offer-card">
        <span class="micro offer-num">01 / Diagnostics</span>
        <h3>Electrical troubleshooting</h3>
        <p>Dead outlets, dying batteries, electrical gremlins — we find why before we replace parts. Thermal camera and meter work included when it helps.</p>
        <a class="text-link" href="${apex}/electrical/">Electrical</a>
      </article>
      <article class="offer-card">
        <span class="micro offer-num">02 / Power</span>
        <h3>Victron power &amp; energy</h3>
        <p>House batteries, solar charging, and inverter power that work together. Victron Professional Certified Installer.</p>
        <a class="text-link" href="${apex}/victron/">Victron</a>
      </article>
      <article class="offer-card">
        <span class="micro offer-num">03 / Connectivity</span>
        <h3>Starlink · weBoost · Peplink</h3>
        <p>Clean mounts, proper routing, full power integration. Starlink installs (not a Starlink-certified installer).</p>
        <a class="text-link" href="${apex}/wireless/">Wireless</a>
      </article>
    </div>
    <div class="grid-3 mt-8">
      <article class="service-card"><h3>Appliances</h3><p>Refrigerators, furnaces, A/C, water heaters. Dometic, Norcold, Suburban, Atwood. We test before we replace.</p></article>
      <article class="service-card"><h3>Plumbing</h3><p>Water pumps, tanks, fittings, fresh/grey/black troubleshooting at your location.</p></article>
      <article class="service-card"><h3>Roof &amp; water intrusion</h3><p>Find the leak, fix the membrane, check vents and soft spots — moisture hunting with a thermal camera when needed.</p></article>
    </div>
  </div>
</section>
<section class="band band-light">
  <div class="wrap grid-2">
    <div>
      <span class="micro">Corridor</span>
      <h2>MT · WY · ID · WA</h2>
      <p>Active corridors across Montana, Wyoming, Idaho, and Washington — plus case-by-case travel beyond. Mobile by design. We come to the campsite, driveway, or storage yard.</p>
    </div>
    <div>
      <span class="micro">Credentials</span>
      <h2>Certified where it counts</h2>
      <p>Victron Professional Certified Installer. weBoost Authorized Installer. Peplink Certified Associate. Dometic Professional Certified. Starlink installs only — not a Starlink-certified title.</p>
    </div>
  </div>
</section>
<section class="band" style="padding-top:48px">
  <div class="wrap">
    <span class="micro">What to expect</span>
    <h2>Three steps. No surprise invoice.</h2>
    <div class="book-expect">
      <div>
        <span class="step-num">01</span>
        <h3>Book or text</h3>
        <p>Use the Square panel on this page, or Text Now. Tell us the issue, City/ZIP, and the rig.</p>
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
<script src="/js/site.js?v=20260920book" defer></script>
</body>
</html>`;
}

export function renderBookSuite(request, env) {
  const url = new URL(request.url);
  const bookHost = isBookHost(url.hostname);
  const canonical = bookHost ? `${url.origin}/` : `${url.origin}/book-service/`;
  const title = 'Book a Mobile RV Repair Visit | United Mobile RV';
  const description = 'Book mobile RV repair at your campsite, driveway, or storage yard. Square booking on book.unitedmobilerv.com, or Text Now (616) 606-5277.';
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
