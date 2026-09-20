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
 * stay on book.unitedmobilerv.com.
 *
 * Live square.site check (2026-09-20):
 *   - Homepage https://united-mobile-rv-llc.square.site/ is the working
 *     appointments engine (appointment-request form). No official
 *     Square Appointments embed snippet / buyer-widget script is published.
 *   - Homepage response has no X-Frame-Options and no CSP frame-ancestors.
 *   - /s/appointments exists but is not the default engine (homepage form
 *     is what Matt published as the booking URL).
 *   - Do not invent widget, location, or appointment-unit IDs. Optional
 *     Pages env SQUARE_APPOINTMENTS_EMBED_SRC is accepted only when it
 *     is Square-land https (Matt paste of a real embed later).
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
  return `<div class="square-embed-wrap" data-square-embed="${overridden ? 'live' : 'square-site'}">
      <iframe class="square-appointments-frame" src="${esc(src)}" title="Request an appointment with United Mobile RV" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
      <p class="muted square-embed-note">Secure checkout is processed by Square. Prefer a person first? Text Now or call — same number.</p>
      <p class="muted">${squareFallbackLink('Open Square in a new tab')}</p>
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
    <span class="eyebrow">Now booking — MT · WY · ID · WA corridor</span>
    <span class="micro">Mobile RV, van &amp; trailer repair</span>
    <h1>Request a service call</h1>
    <p class="lead">Tell us what is going on and where the rig sits. Matt reviews every request personally and confirms trip fee and price before he rolls. No shop drop-off. No tow bill.</p>
  </div>
</section>
<section class="trust-strip" aria-label="Trust">
  <div class="wrap trust-row">
    <a class="trust-chip" href="https://www.google.com/maps/place/United+Mobile+RV+LLC/data=!4m2!3m1!1s0x0:0xb040c24e93fec214" target="_blank" rel="noopener"><strong>13 Google ★5.0</strong> reviews</a>
    <span class="trust-chip"><strong>Victron Professional</strong> Certified Installer</span>
    <span class="trust-chip"><strong>Thermal imaging</strong> diagnostics</span>
    <span class="trust-chip"><strong>Starlink installs</strong> · Peplink · weBoost</span>
  </div>
</section>
<section class="band band-tight" aria-label="Credentials">
  <div class="wrap">
    <span class="micro">Credentials</span>
    <div class="cred-logos cred-logos-scrubbed">
      <a class="cred-pill" href="${apex}/victron/"><img src="/assets/brand/victron-certified-installer.webp" alt="Victron Professional Certified Installer" height="40" width="160" loading="lazy" decoding="async"></a>
      <a class="cred-pill" href="${apex}/wireless/"><img src="/assets/brand/peplink-certified-associate.webp" alt="Peplink Certified Associate" height="40" width="160" loading="lazy" decoding="async"></a>
      <a class="cred-text" href="${apex}/wireless/">weBoost Authorized Installer</a>
      <a class="cred-text" href="${apex}/service/">Dometic Professional Certified</a>
    </div>
    <p class="muted mt-6">Starlink installs (not a Starlink-certified installer). Former FAA-authorized aircraft repair · 11+ years mechanical.</p>
  </div>
</section>
<section class="band book-hybrid-band" style="padding-top:24px;padding-bottom:40px">
  <div class="wrap book-hybrid">
    <div class="book-hybrid-copy">
      <span class="micro">Book on this page</span>
      <h2>Square booking, or Text Now</h2>
      <p>Use the Square panel to request the visit. Prefer to reach the technician first? Text Now or call — you will reach Matt directly.</p>
      <div class="book-cta-row">
        <a class="btn btn-ghost" href="${CALL_HREF}">${CALL_LABEL}</a>
        <a class="btn btn-gold" href="${TEXT_NOW_HREF}">${TEXT_NOW_LABEL}</a>
      </div>
      <p class="muted" style="margin-top:20px">Text Now uses <a href="${TEXT_NOW_HREF}">sms:+16166065277</a>. Call uses <a href="${CALL_HREF}">tel:+16166065277</a>.</p>
      <h3 style="margin-top:28px">Have this ready</h3>
      <ul class="book-ready-list">
        <li>City / ZIP and where the rig sits (campsite, driveway, storage yard)</li>
        <li>Year, make, and model</li>
        <li>The symptom — when it started, any codes, what already failed</li>
        <li>Preferred window if you have one (this is a request until Matt confirms)</li>
      </ul>
    </div>
    <div class="book-hybrid-embed" id="square-booking">
      ${embedPanel({ env, request })}
    </div>
  </div>
</section>
<section class="band band-tight photo-band" aria-label="Real driveway jobs">
  <div class="wrap">
    <span class="micro">On site</span>
    <h2>Real jobs. Real rigs.</h2>
    <p class="lead">Driveway work on real coaches — we come to you.</p>
    <div class="photo-grid">
      <figure class="photo-card photo-card-wide">
        <img src="/assets/photos/jobs/img_3286-1200.webp" alt="Finished RV power install — inverter, battery distribution, and house battery strapped in place." loading="lazy" width="1600" height="1200">
        <figcaption class="photo-cap">Power install finished at the coach</figcaption>
      </figure>
      <figure class="photo-card">
        <img src="/assets/photos/jobs/img_3018-1200.webp" alt="Tiffin Allegro Open Road motorhome on a residential driveway with tools beside an open service bay." loading="lazy" width="1600" height="1200">
        <figcaption class="photo-cap">Motorhome — on-site service</figcaption>
      </figure>
      <figure class="photo-card">
        <img src="/assets/photos/jobs/img_2937-1200.webp" alt="Open RV electrical bay with fuse blocks and a meter during diagnostics." loading="lazy" width="1600" height="1200">
        <figcaption class="photo-cap">Testing house power before parts fly</figcaption>
      </figure>
    </div>
  </div>
</section>
<section class="band">
  <div class="wrap">
    <span class="micro">Services</span>
    <h2>What we fix — at your location</h2>
    <p class="lead">No shop drop-off. Root-cause diagnosis before parts. Electrical, power, connectivity, appliances, plumbing, roof, generator, propane, and seasonal work on site.</p>
    <div class="grid-3 mt-8">
      <article class="offer-card">
        <span class="micro offer-num">01 / Diagnostics</span>
        <h3>Electrical troubleshooting</h3>
        <p>Shore power faults, battery drain, parasitic draw, converter failures, and wiring issues. Thermal imaging and DVOM testing — we find why before we replace parts.</p>
        <a class="text-link" href="${apex}/electrical/">Electrical</a>
      </article>
      <article class="offer-card">
        <span class="micro offer-num">02 / Power</span>
        <h3>Victron power &amp; energy</h3>
        <p>LiFePO4, MPPT solar, inverter/chargers, and full system balancing. Victron Professional Certified Installer — clean, labeled, documented installs.</p>
        <a class="text-link" href="${apex}/victron/">Victron</a>
      </article>
      <article class="offer-card">
        <span class="micro offer-num">03 / Connectivity</span>
        <h3>Starlink · weBoost · Peplink</h3>
        <p>Clean exterior mounts, proper coax routing, full power integration. Peplink Certified Associate and weBoost Authorized Installer. Starlink installs (not a Starlink-certified installer).</p>
        <a class="text-link" href="${apex}/wireless/">Wireless</a>
      </article>
    </div>
    <div class="grid-3 mt-8">
      <article class="service-card"><h3>Appliances</h3><p>Refrigerators, furnaces, A/C, water heaters. Dometic, Norcold, Suburban, Atwood. We test before we replace.</p></article>
      <article class="service-card"><h3>Plumbing &amp; water</h3><p>Water pumps, tanks, fittings, fresh/grey/black troubleshooting at your location.</p></article>
      <article class="service-card"><h3>Roof &amp; water intrusion</h3><p>Leak tracing, EPDM/TPO, vents, and moisture hunting with a thermal camera when needed.</p></article>
      <article class="service-card"><h3>Generator service</h3><p>Onan and common RV generators — diagnosis, oil service, and repair where the coach sits.</p></article>
      <article class="service-card"><h3>LP gas systems</h3><p>Pressure checks, regulators, and propane appliance safety troubleshooting.</p></article>
      <article class="service-card"><h3>PPI &amp; seasonal</h3><p>Pre-purchase inspections, winterization ($175), trip-prep &amp; safety check ($225). Labor included; materials extra.</p></article>
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
        <p>Book in the Square panel or Text Now with City/ZIP, the rig, and the symptom. This is a request until Matt confirms the window.</p>
      </div>
      <div>
        <span class="step-num">02</span>
        <h3>We confirm scope</h3>
        <p>Trip fee quoted before we roll. Diagnostic-first — we do not guess a total before we see the system.</p>
      </div>
      <div>
        <span class="step-num">03</span>
        <h3>Test, then price the fix</h3>
        <p>You authorize the repair after the diagnosis. $175 diagnostic applies toward the work if you proceed. Parts billed separately.</p>
      </div>
    </div>
  </div>
</section>
<section class="band band-light">
  <div class="wrap grid-2">
    <div>
      <span class="micro">Corridor</span>
      <h2>Montana · Wyoming · Idaho · Washington</h2>
      <p>Active scheduled corridor through MT · WY · ID · WA. We come to the campsite, driveway, or storage yard. Minnesota, Wisconsin, the Dakotas, Oregon, and Michigan are served case-by-case as the route allows.</p>
    </div>
    <div>
      <span class="micro">Reviews</span>
      <h2><span class="stars">★★★★★</span><br>13 five-star Google reviews</h2>
      <p>Real owners. Real repairs at their location. Also listed on Yelp. We do not invent testimonials.</p>
    </div>
  </div>
  <div class="wrap" style="margin-top:36px">
    <span class="micro">Local coverage</span>
    <h2>Find your city</h2>
    <div class="city-hub">
      <div class="city-hub-state">
        <h3>Montana</h3>
        <ul>
          <li><a href="${apex}/mobile-rv-repair-billings-mt/">Billings</a></li>
          <li><a href="${apex}/mobile-rv-repair-bozeman-mt/">Bozeman</a></li>
          <li><a href="${apex}/mobile-rv-repair-missoula-mt/">Missoula</a></li>
          <li><a href="${apex}/mobile-rv-repair-west-yellowstone-mt/">West Yellowstone</a></li>
        </ul>
      </div>
      <div class="city-hub-state">
        <h3>Wyoming &amp; Idaho</h3>
        <ul>
          <li><a href="${apex}/mobile-rv-repair-jackson-hole-wy/">Jackson Hole, WY</a></li>
          <li><a href="${apex}/mobile-rv-repair-coeur-dalene-id/">Coeur d'Alene, ID</a></li>
        </ul>
      </div>
      <div class="city-hub-state">
        <h3>Washington</h3>
        <ul>
          <li><a href="${apex}/mobile-rv-repair-seattle-wa/">Seattle</a></li>
          <li><a href="${apex}/mobile-rv-repair-spokane-wa/">Spokane</a></li>
          <li><a href="${apex}/mobile-rv-repair-olympic-peninsula-wa/">Olympic Peninsula</a></li>
        </ul>
      </div>
    </div>
  </div>
</section>
<section class="band">
  <div class="wrap grid-2">
    <div>
      <span class="micro">Proof</span>
      <p class="north-star">We don't guess. We find the real problem.</p>
    </div>
    <div>
      <p>UMRT was founded after years maintaining precision aerospace equipment at Liebherr and working dealership service bays on BMW and Mercedes platforms. A former FAA-authorized aircraft repair tech leads every job. That same careful testing goes into every RV repair.</p>
      <ul class="proof-list">
        <li><span class="lab">Experience</span> 11+ years mechanical</li>
        <li><span class="lab">Aerospace</span> Former FAA-authorized aircraft repair · Liebherr</li>
        <li><span class="lab">Auto</span> BMW / Mercedes dealership background</li>
        <li><span class="lab">Certs</span> Victron Professional Certified Installer · weBoost Authorized · Peplink Certified Associate · Dometic Professional — Starlink installs only (not a certified title)</li>
      </ul>
    </div>
  </div>
</section>
<section class="band band-light">
  <div class="wrap">
    <span class="micro">Published rates</span>
    <h2>Transparent pricing. No surprises.</h2>
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
<section class="band">
  <div class="wrap wrap-narrow">
    <span class="micro">FAQ</span>
    <h2>Straight answers</h2>
    <div class="faq-item"><h3>What does a service call cost?</h3><p>$75 within 30 miles, then $1.50 per mile each way. Labor is about $150/hr. Diagnostic is $175 and applied toward repair if you proceed.</p></div>
    <div class="faq-item"><h3>Do you have a shop I drop off at?</h3><p>No. We come to your campsite, driveway, or storage yard.</p></div>
    <div class="faq-item"><h3>Who will be on site?</h3><p>Owner-technician on site.</p></div>
    <div class="faq-item"><h3>What credentials do you hold?</h3><p>Victron Professional Certified Installer · weBoost Authorized Installer · Peplink Certified Associate · Dometic Professional Certified. Starlink installs (not a Starlink-certified installer).</p></div>
    <div class="faq-item"><h3>Where do you serve?</h3><p>Active corridors in Montana, Wyoming, Idaho, and Washington — other states case-by-case.</p></div>
    <div class="faq-item"><h3>How do I book?</h3><p>Use the Square panel on this page, or Text Now / Call (616) 606-5277.</p></div>
  </div>
</section>
<section class="band" style="border-top:1px solid var(--rule)">
  <div class="wrap">
    <span class="micro">Ready</span>
    <h2>Get mobile RV repair</h2>
    <p class="lead">Tell us what is wrong. We quote the trip and diagnostic before we roll.</p>
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
<script src="/js/site.js?v=20260920book" defer></script>
</body>
</html>`;
}

export function renderBookSuite(request, env) {
  const url = new URL(request.url);
  const bookHost = isBookHost(url.hostname);
  const canonical = bookHost ? `${url.origin}/` : `${url.origin}/book-service/`;
  const title = 'Book a Mobile RV Repair Visit | United Mobile RV';
  const description = 'Request a mobile RV service call at your campsite, driveway, or storage yard. Text Now (616) 606-5277, or book on this page. Active MT · WY · ID · WA corridor.';
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
