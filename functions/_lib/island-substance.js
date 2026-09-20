/**
 * Unique body copy per island. Shared chrome only — do not reuse a
 * section across shop / book / forum.
 *
 *   shop  = quote, parts, systems specification
 *   book  = Square appointment + Text + booking logistics
 *   forum = community Q&A
 *
 * WP remains the fact source. Facts are adapted into existing Pages
 * components (service-card, grid-2, band, micro, price-card).
 */

import { BOOK_PUBLIC_HREF, CALL_HREF, CALL_LABEL, TEXT_NOW_HREF, TEXT_NOW_LABEL } from './mesh-chrome.js';

function card(title, body) {
  return `<article class="service-card"><h3>${title}</h3><p>${body}</p></article>`;
}

/* -------------------------------------------------------------------------- */
/* SHOP — quote / parts / systems only                                        */
/* -------------------------------------------------------------------------- */

export function shopPartsIntroHtml() {
  return `<span class="eyebrow"><span class="dot"></span>RV systems shop</span>
    <h1>Specify the system. Then request a quote.</h1>
    <p class="lead">Describe what the rig needs to do. We specify equipment that actually works together — Victron, lithium, solar, protection, climate, connectivity — then source, configure, and install it if you want that in the quote.</p>
    <p>Listed prices are published reference figures, not a live checkout and not a fabricated number. Availability is confirmed as part of the quote. Submit the request and we follow up with pricing, lead time, and how to arrange payment.</p>
    <p class="muted" style="margin-top:14px">Not sure which SKU? Request a quote with daily watt-hours, pedestal amps, and the job the system has to do — we spec the stack from that, not from a part number.</p>`;
}

export function shopServicesIntroHtml() {
  return `<span class="eyebrow"><span class="dot"></span>System work rates</span>
    <h1>Published rates for system work.</h1>
    <p class="lead">Install, commission, and seasonal system lines we quote against. Pick a line when you already know the work. Hardware you want specified still lives on Parts — this tab is the labor and install SKUs, not a parts checkout.</p>
    <p>Each card is a published reference rate. Confirming a line still goes through a quote or a scheduled visit; nothing is charged from this list automatically.</p>
    <p class="muted" style="margin-top:14px">Need equipment specified first? <a class="text-link" href="/shop/">See parts</a>.</p>`;
}

export function shopEmptyHtml(activeTab) {
  const noun = activeTab === 'services' ? 'System-work lines' : 'Catalog items';
  return `<section class="band"><div class="wrap">
    <p>${noun} are being loaded. Request a quote with the system the rig needs, or text the technician with daily usage, pedestal amps, and the equipment you already have.</p>
    <div class="btn-row">
      <a class="btn btn-gold" href="${TEXT_NOW_HREF}">${TEXT_NOW_LABEL}</a>
      <a class="btn btn-ghost" href="${CALL_HREF}">${CALL_LABEL}</a>
    </div>
  </div></section>`;
}

/** Quote-first model — shop listing and product pages. Cart stays a short worksheet. */
export function quoteFirstSection({ variant = 'shop' } = {}) {
  const lead = variant === 'product'
    ? 'Listed prices are published reference figures — cited, not invented, and not a live checkout. Submit the quote request with the service tier you want. We follow up with availability, a real number, and how to arrange payment. No automatic charge.'
    : 'This is not a parts store checkout. Tell us what the rig needs to do. We specify equipment that works together, then source, configure, and install it if you want us to. Every listing is a published reference price. Request a quote and we follow up directly.';
  return `<section class="band">
  <div class="wrap">
    <span class="micro">Quote first</span>
    <h2>Request a quote. Arrange payment after we confirm.</h2>
    <p>${lead}</p>
    <div class="grid-2">
      ${card('Hardware only', 'We quote the equipment and ship it to you. You handle the install.')}
      ${card('Hardware + remote configuration', 'We quote the equipment and walk the setup with you remotely — VictronConnect, VRM, or booster commissioning as applicable.')}
      ${card('Hardware + on-site installation', 'We quote the equipment and include on-site install in the same quote. Travel is priced as its own line before anyone rolls.')}
      ${card('Full system design + installation', 'We design the system around the rig — daily watt-hours, bank size, inverter, protection — then install and commission it.')}
    </div>
    <p class="muted">Prefer to talk the spec through first? <a href="${CALL_HREF}">${CALL_LABEL}</a> or <a href="${TEXT_NOW_HREF}">${TEXT_NOW_LABEL}</a>.</p>
  </div>
</section>`;
}

/** How we spec a stack — shop only. Not a repair-visit or forum post. */
export function shopSystemsSection() {
  return `<section class="band">
  <div class="wrap">
    <span class="micro">Systems we specify</span>
    <h2>Equipment that works as one stack.</h2>
    <p>A catalog page does not know your daily watt-hours, roof real estate, or pedestal. We spec the stack so the inverter, bank, solar, and protection match each other — then we quote that bill of materials. You can take hardware only, or add remote config or on-site install as a line on the same quote.</p>
    <div class="grid-2">
      ${card('Victron power', 'MultiPlus and Quattro inverter-chargers, MPPT controllers, GX monitoring, and Lynx distribution. Sized to continuous and surge loads, not a brochure wattage. VRM is part of a Victron quote when you want remote visibility.')}
      ${card('LiFePO4 banks', 'Usable capacity and weight only pay off when BMS, charge voltage, and temperature limits match the inverter-charger. We will not quote a drop-in bank against a converter that still thinks it is charging AGM.')}
      ${card('Solar and MPPT', 'Array watts, roof layout, and controller current have to close. MPPT extracts more than PWM in variable light. We quote modules, mounts, and the controller as a set so you do not buy an orphan panel.')}
      ${card('Protection and shore', 'Breakers, fusing, transfer, EMS, and inlet hardware sized to the pedestal you actually plug into. Adapters do not invent amperage. A hot dogbone is a fire risk — we will not spec one as a workaround.')}
      ${card('Climate and refrigeration', 'Rooftop A/C, heat-pump, and compressor-fridge SKUs quoted against roof openings, running watts, and the inverter that has to start them. Cooling-unit replacements are specified, not guessed from a model year.')}
      ${card('Connectivity kits', 'Starlink mount and fuse kit, weBoost antenna and cable runs, Peplink multi-WAN. Cell for low-latency near towers; Starlink where towers disappear. weBoost needs usable outdoor RF — a booster is not “tuned gain.”')}
    </div>
  </div>
</section>`;
}

/** What we need to write a real quote — shop only. */
export function shopQuoteNeedsSection() {
  return `<section class="band">
  <div class="wrap">
    <span class="micro">What we need</span>
    <h2>A spec starts with usage, not a SKU.</h2>
    <p>The faster we can size the stack, the faster the quote comes back. Send this with the request — or put it in the notes field on a product or cart quote.</p>
    <div class="grid-2">
      ${card('Daily watt-hours', 'What you run overnight and on a travel day. Ah at 12V, or a list of loads with hours, is enough. “I want lithium” is not a spec.')}
      ${card('Pedestal and shore', '30A or 50A, and whether you also dry-camp. Input-current limits on a MultiPlus are set from this, not from a default.')}
      ${card('What is already on the rig', 'Inverter, converter, controller, bank chemistry, and solar watts if any. Photos of the bay, the GX, and labels beat a guess at the model.')}
      ${card('Roof and install path', 'Available roof, existing penetrations, and whether you want hardware shipped or installed. Remote config is a separate tier from a site visit.')}
    </div>
    <p>Reference prices on the cards are cited from supplier lists on file. The confirmed quote can move with stock, freight, and the tier you pick. Payment is arranged after we confirm — this shop does not charge a card at submit.</p>
  </div>
</section>`;
}

/* -------------------------------------------------------------------------- */
/* BOOK — Square + Text + booking logistics only                              */
/* -------------------------------------------------------------------------- */

export function bookHeroHtml() {
  return `<section class="page-hero">
  <div class="wrap">
    <span class="micro">Mobile RV, van, and trailer repair</span>
    <h1>Request a service call</h1>
    <p class="lead">Tell us what is going on and where you are. Every request is reviewed personally, with an upfront trip price before we show up. You reach the technician directly — not a dispatch queue.</p>
  </div>
</section>
<section class="band" style="padding-top:48px;padding-bottom:32px">
  <div class="wrap-narrow" style="text-align:center">
    <div class="book-cta-row">
      <a class="btn btn-gold" href="${BOOK_PUBLIC_HREF}" target="_blank" rel="noopener" style="font-size:1.05em;padding:0 40px;">Book on Square</a>
      <a class="btn btn-ghost" href="${TEXT_NOW_HREF}">${TEXT_NOW_LABEL}</a>
    </div>
    <p class="muted" style="margin-top:20px">Booking continues on Square in a new tab — that is the official intake. Prefer to talk first? <a href="${CALL_HREF}">${CALL_LABEL}</a>.</p>
    <p class="muted">Already had the appointment time confirmed by text or call? Pay the $225 service deposit through Square when we send the link.</p>
  </div>
</section>`;
}

export function bookExpectSection() {
  return `<section class="band" style="padding-top:16px">
  <div class="wrap">
    <span class="micro">What to expect</span>
    <h2>Three steps. Price before work.</h2>
    <div class="book-expect">
      <div>
        <span class="step-num">01</span>
        <h3>Book or text</h3>
        <p>Submit the Square request or text the technician. Include the issue, city or ZIP, and the rig year / make / model. Photos and fault codes help us schedule the right window.</p>
      </div>
      <div>
        <span class="step-num">02</span>
        <h3>We confirm the appointment</h3>
        <p>Trip fee quoted upfront. We do not guess a repair total before we see the system. Matt reviews every request personally and texts the arrival window.</p>
      </div>
      <div>
        <span class="step-num">03</span>
        <h3>You authorize the fix</h3>
        <p>After the on-site diagnosis you authorize the repair. Parts and materials are billed separately. No surprise invoice for work you did not approve.</p>
      </div>
    </div>
  </div>
</section>`;
}

/** Who rolls to the site — book only. */
export function bookWhoArrivesSection() {
  return `<section class="band">
  <div class="wrap">
    <span class="micro">Who shows up</span>
    <h2>The owner is the technician</h2>
    <p>When the appointment is confirmed, Matt arrives — owner and lead technician. Not a dispatcher, not a subcontractor, and not a rotating crew. He diagnoses the problem and does the work. One tech, full accountability, every job.</p>
    <p>Independent-shop BMW and Mercedes diagnostics to dealership-caliber standards (Xentry and ISTA). Control4 integration. Two school years teaching automotive technology. Landing-gear maintenance at Liebherr Aerospace on contracts that included U.S. government work. Landing gear does not get a second attempt. That standard is what rolls to the campsite, driveway, or storage yard.</p>
    <div class="grid-2">
      ${card('One person on the ticket', 'The name on the Square request is the person who texts the window and who knocks. You are not handed to a second crew.')}
      ${card('Credentials on the visit', 'Victron Professional Certified Installer. Dometic Professional Certified. Peplink Certified Associate. weBoost Authorized Installer. NPS Generator Certified Technician.')}
      ${card('Where we roll', 'Active MT · WY · ID · WA corridor. Case-by-case beyond. Trip is quoted from your city or ZIP before we leave — not after we arrive.')}
      ${card('Access we need', 'A working path to the bay, roof, or appliance, and a place to park the service vehicle. Note dogs, locked storage, and park gate codes on the request.')}
    </div>
  </div>
</section>`;
}

/** What the booked visit looks like — book only. */
export function bookVisitSection() {
  return `<section class="band">
  <div class="wrap">
    <span class="micro">On the visit</span>
    <h2>Diagnosis on site. Authorization before the repair.</h2>
    <p>The appointment starts with an operational test — we run the system and watch what it actually does. Thermal imaging finds hot spots and failing connections that a visual walk-through misses. DVOM work measures voltage drop, resistance, and current at the source, along the circuit, and at the load. We do not replace parts from the Square notes alone.</p>
    <div class="grid-2">
      ${card('Trip fee first', 'Quoted when you book or text. $75 within 30 miles, then $75 + $1.50/mi each way. Confirmed before we roll so the drive is never a surprise.')}
      ${card('Diagnostic on the clock', '$175 full-system scan where it applies — DVOM and thermal included. Applied toward the repair if you authorize the fix on site.')}
      ${card('Labor after you say go', '$150/hr, 1 hour minimum, 30-minute increments after that. Parts and materials are a separate line. You approve before we open a second system.')}
      ${card('If it is not economical', 'We say so, with replacement cost and what the swap involves, before we start a repair you will not want.')}
    </div>
  </div>
</section>`;
}

export function publishedRatesSection({ includeRateSheetLink = false } = {}) {
  const rateSheet = includeRateSheetLink
    ? `<p class="mt-8 muted">Full rate sheet: <a href="/pricing/">Pricing</a>.</p>`
    : '';
  return `<section class="band band-light">
  <div class="wrap">
    <span class="micro">Published rates</span>
    <h2>Pricing snapshot</h2>
    <p>Same figures as the public rate sheet. Confirmed with you before we arrive. Labor does not include parts or materials.</p>
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
</section>`;
}

/** Booking-form logistics — book only. */
export function bookRequestSection() {
  return `<section class="band">
  <div class="wrap">
    <span class="micro">On the request</span>
    <h2>What to put on Square or in the text.</h2>
    <p>The intake is how we schedule and quote the trip — not a public thread and not a parts quote. One message is enough.</p>
    <div class="grid-2">
      ${card('City or ZIP', 'Trip is quoted from this before we roll. A campground name plus the nearest town works if you do not have a street address yet.')}
      ${card('Window and access', 'Dates you can be on site, gate codes, dogs, and whether the rig is in storage. A missed gate code burns the trip fee.')}
      ${card('Rig and the fault', 'Year / make / model and the symptom in plain language. Fault codes and a photo of the panel or app beat a long story.')}
      ${card('Deposit when confirmed', 'Once the time is locked by text or call, the $225 service deposit is paid on the Square link we send. That holds the window.')}
    </div>
    <p class="muted">Appointments are not taken in the forum and are not a shop cart. <a href="${BOOK_PUBLIC_HREF}" target="_blank" rel="noopener">Book on Square</a> or <a href="${TEXT_NOW_HREF}">${TEXT_NOW_LABEL}</a>.</p>
  </div>
</section>`;
}

/* -------------------------------------------------------------------------- */
/* FORUM — community Q&A only                                                 */
/* -------------------------------------------------------------------------- */

export function forumHowToAskSection() {
  return `<section class="band">
  <div class="wrap wrap-narrow">
    <span class="micro">How to ask</span>
    <h2>Write the thread the way you would want to answer it.</h2>
    <p>This board is owner-to-owner and technician-to-owner Q&amp;A. It is not a checkout and it is not an appointment desk. Sign in with Google to post. New threads and replies are screened for spam and scams before they appear.</p>
    <div class="grid-2">
      ${card('Title the symptom', '“2019 Allegro — converter fan never stops” gets a better answer than “electrical help??”. Year, brand, and the thing that failed belong in the title.')}
      ${card('Say what you already tried', 'Swaps, resets, and settings changes. Duplicate advice wastes everyone’s time. If you have not tried anything yet, say that too.')}
      ${card('Stay in the right topic', 'Repair &amp; Diagnostics for a failed system. Off-Grid &amp; Power for bank / solar / inverter builds. Connectivity for Starlink, weBoost, Peplink. Route for corridor talk. Updates for shop notes.')}
      ${card('One problem per thread', 'A dead house bank and a roof leak are two threads. Mixing them buries the answer and the next owner cannot find it.')}
    </div>
  </div>
</section>`;
}

export function forumEvidenceSection() {
  return `<section class="band">
  <div class="wrap wrap-narrow">
    <span class="micro">Evidence in the post</span>
    <h2>Give the thread something to work from.</h2>
    <p>Guessing in the replies usually costs someone a good converter, pump, or antenna. Put the evidence in the first post so answers can be specific. Photos belong on the thread — up to four per post, JPG/PNG/WEBP/GIF, 5&nbsp;MB each.</p>
    <div class="grid-2">
      ${card('Repair threads', 'When it started, what changed, any fault code, and a photo of the panel or the component label. “It just died” is a start; a code and a model stamp is an answerable question.')}
      ${card('Power threads', 'Bank chemistry, inverter or converter model, solar controller, and roughly what you run overnight. A GX screenshot or a label photo beats “I have lithium.”')}
      ${card('Connectivity threads', 'Dish vs booster vs router, sky view, and whether the failure is no-lock, slow, or failover flapping. App screenshots help more than a brand name.')}
      ${card('Route threads', 'Where you are headed and when. This topic is corridor talk among owners — it is not how a visit is scheduled.')}
    </div>
    <p>Advice here is offered in good faith by other members and by the technician when he replies. It is not a substitute for standing in front of the rig. Smell of LP, live 120V you cannot isolate, or a soft roof deck: stop the thread and text (616) 606-5277.</p>
  </div>
</section>`;
}

export function forumRulesSection() {
  return `<section class="band">
  <div class="wrap wrap-narrow">
    <span class="micro">Community rules</span>
    <h2>How this forum is run</h2>
    <div class="faq-item"><h3>Be useful</h3><p>Answer the way you would want an answer. Do not put someone down for not knowing a system — everyone started somewhere.</p></div>
    <div class="faq-item"><h3>No spam or unrelated promotion</h3><p>Selling something or dropping links unrelated to the question holds the post for review and can get it removed.</p></div>
    <div class="faq-item"><h3>Stay on topic</h3><p>Repair, off-grid power, connectivity, route and service areas, or general RV and van talk. Political and unrelated content is not for this forum.</p></div>
    <div class="faq-item"><h3>Posts are screened</h3><p>New threads and replies are checked for spam, scams, and abuse before they go live. Most posts clear quickly. Flagged ones wait for a human moderator.</p></div>
    <div class="faq-item"><h3>Not an appointment desk</h3><p>Do not treat a thread as a work order. If you need someone on site, use Book or text. If you need a parts stack specified, use Shop. This page is for questions and answers.</p></div>
  </div>
</section>`;
}

export function forumSubstanceHtml() {
  return `${forumHowToAskSection()}
${forumEvidenceSection()}
${forumRulesSection()}`;
}
