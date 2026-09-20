/**
 * WP-depth body copy for shop / forum / book, rendered in existing
 * Pages dark/gold components (service-card, grid-2, band, micro).
 *
 * Source of truth: live unitedmobilerv.com pages pulled 2026-09-20
 * (electrical 1495, tech 1477, book-service 1434, wireless, generator,
 * plumbing, home). Facts only — adapted into CF markup, not WP inline CSS.
 *
 * Do not put this library in MESH_LINKS. Do not replace Square Book CTAs.
 */

import { BOOK_PUBLIC_HREF, CALL_HREF, CALL_LABEL, TEXT_NOW_HREF, TEXT_NOW_LABEL } from './mesh-chrome.js';

function card(title, body) {
  return `<article class="service-card"><h3>${title}</h3><p>${body}</p></article>`;
}

/** Who shows up — ported from WP /tech/ (id 1477). */
export function techVoiceSection() {
  return `<section class="band">
  <div class="wrap">
    <span class="micro">Who shows up</span>
    <h2>The owner is the technician</h2>
    <p>When you call United Mobile RV, you get Matt — owner and lead technician. Not a dispatcher, not a subcontractor, and not a rotating crew. He diagnoses the problem and does the work. One tech, full accountability, every job.</p>
    <p>Most mobile RV techs come from one background. Matt has four, and none of them are “handyman RV.” Independent-shop BMW and Mercedes diagnostics to dealership-caliber standards (Xentry and ISTA). Control4 smart-home integration — power, networking, and control systems that have to talk to each other. Two school years teaching automotive technology, including running a full class solo when the lead instructor needed emergency surgery. Then landing-gear maintenance at Liebherr Aerospace on contracts that included U.S. government work. Landing gear does not get a second attempt. That standard is what shows up at the campsite.</p>
    <div class="grid-2">
      ${card('Dealership-caliber diagnostics', 'Factory-level BMW and Mercedes procedure. European platforms do not forgive guesswork — the same discipline applies to coach electrical and multiplex faults.')}
      ${card('Systems integration', 'Control4 programming and server-rack builds. Designing electrical and network systems to work together, not just power on.')}
      ${card('Aerospace-grade precision', 'Liebherr Aerospace landing-gear maintenance. Zero tolerance for a wrong diagnosis, applied to every RV repair since.')}
      ${card('Manufacturer credentials', 'Victron Professional Certified Installer (MPPT, MultiPlus). Dometic Professional Certified. Peplink Certified Associate. weBoost Authorized Installer. NPS Generator Certified Technician.')}
    </div>
    <p class="muted">Beyond RV-industry certs: FCC Radio Operator License and wildland-fire / FEMA-level emergency-response training. 13 five-star Google reviews from owners repaired at their location.</p>
  </div>
</section>`;
}

/** Diagnostic method — WP /electrical/. */
export function diagnosticProcessSection() {
  return `<section class="band">
  <div class="wrap">
    <span class="micro">How we work</span>
    <h2>Diagnosis first. Parts last.</h2>
    <p>A flickering light, a battery that drains overnight, or a converter that runs constantly is rarely a simple swap. Throwing parts at it without a diagnosis wastes money and time. Every visit starts with an operational test — we run the system and watch what it actually does before assuming anything.</p>
    <p>Thermal imaging finds hot spots, overloaded circuits, and failing connections that are invisible on a visual walk-through — especially intermittent faults that only appear under load. Professional DVOM work measures voltage drop, resistance, current draw, and continuity at the source, along the circuit, and at the load — not just at the most convenient access point. Gas-pressure testing confirms what the burner assembly is working with. We do not replace parts from symptoms alone. If a system is beyond economical repair, we say so, with replacement cost and what the swap involves.</p>
    <div class="grid-2">
      ${card('Shore power faults', 'Miswired pedestals, reverse polarity, open grounds, and failed transfer switches can damage coach gear silently. Incoming power is verified before it reaches appliances and converters.')}
      ${card('Battery drain and parasitic draw', 'Methodical isolation to the circuit or component still pulling power when everything should be off. This is technique, not guesswork.')}
      ${card('Converter and charger failures', 'Output voltage, charge stages, and internal fusing tested so you know repair versus replace before money is spent.')}
      ${card('Wiring and intermittent faults', 'Corroded connections, undersized wire, bad splices, damaged insulation — traced to the fault location and repaired properly, not patched over.')}
    </div>
  </div>
</section>`;
}

/** Service lines with WP-depth explanation — electrical, power, appliances, connectivity, plumbing, generator. */
export function serviceLinesSection() {
  return `<section class="band">
  <div class="wrap">
    <span class="micro">Service lines</span>
    <h2>What we actually fix on site</h2>
    <p>Diagnostic-first mobile repair for RVs, vans, trailers, and skoolies. We come to the campsite, driveway, or storage yard. Shop-lift rebuilds, paint booths, and major frame work stay shop territory. On everything else we can do correctly in the field, we stay until the system holds.</p>
    <div class="grid-2">
      ${card('Electrical and appliance repair', 'Advanced electrical diagnostics plus full appliance work at your location. RV appliances run LP and 120V AC or DC and switch automatically — more components, more failure points, and more ways a guess goes wrong.')}
      ${card('Victron power systems', 'Victron Professional Certified Installer. LiFePO4 banks, MPPT controllers, MultiPlus / Quattro inverter-chargers — sized to actual usage, programmed, balanced, commissioned, and documented. VRM remote monitoring is set up as part of every Victron install.')}
      ${card('LiFePO4, solar, and inverter/charger', 'Higher usable capacity and less weight than AGM only when BMS integration and charge parameters match the whole system. MPPT extracts more from the array than PWM in variable light. A MultiPlus/Quattro blends shore and inverter power; input current limits are set so you do not trip a weak pedestal.')}
      ${card('Refrigerators, furnaces, A/C, water heaters', 'Dometic and Norcold cooling units, control boards, burners, igniters, thermistors, and ventilation that shortens cooling-unit life. Suburban and Atwood furnaces: sail switch, igniter, LP pressure, limit switch, control board. Dometic and Coleman/Mach rooftop A/C: capacitors under power, coils, thermostat, compressor. Water heaters: thermocouple, element, anode, DSI ignition — gas and electric sides tested independently.')}
      ${card('Starlink, weBoost, Peplink', 'Most serious travelers run cellular and Starlink. Cell for low-latency near towers; Starlink where towers disappear. weBoost Authorized Installer — usable outdoor RF required; AGC, not “tuned gain.” Peplink Certified Associate — multi-WAN bonding and/or failover (SpeedFusion). Mounts sealed, coax routed, DC fused. Starlink installs only — we do not claim a Starlink-certified installer title.')}
      ${card('Plumbing and water systems', 'Potable supply, sanitary drainage, and venting. Failures look like low pressure or sewer smell until you pressure-test. Pumps, PEX and fittings after freeze or vibration, dump valves, dry P-traps, tank vents, winterization and water-heater bypass.')}
      ${card('Generator service', 'Onan QG/QD/Marquis (gas and LP), Generac, Kohler, NPS (Yamaha-based inverter gens), and common portables. No-start diagnosis, carburetor service, load testing, annual maintenance. Sitting kills generators faster than hours.')}
      ${card('LP gas, chassis, trailer, PPI, seasonal', 'Regulator and leak checks, appliance feed verification. Chassis electrical and running-gear support on Ford, GM, Sprinter, and Freightliner platforms. Hitch, brake controller, and trailer lighting. Structured pre-purchase inspection. Winterization, de-winterization, storage prep, trip safety checks.')}
    </div>
  </div>
</section>`;
}

/** Symptom-first troubleshooting value — WP / mothership troubleshoot hub facts. */
export function troubleshootingSection() {
  return `<section class="band">
  <div class="wrap">
    <span class="micro">Troubleshooting</span>
    <h2>Symptom first. Capture evidence before you book.</h2>
    <p>Forum guesses often replace a healthy converter, pump, regulator, or antenna and leave the real fault untouched. Work power, fuel, RF, freeze, and safety gates first. These pages frame the diagnosis so fewer miles and parts get wasted. They are not a substitute for DVOM and thermal metering on a live coach.</p>
    <div class="grid-2">
      ${card('No power / dead coach', 'Shore pedestal and adapter, coach breakers, converter output, house-bank state, and inverter transfer — in that order. Sustained pedestal voltage under about 108V AC can damage appliances silently.')}
      ${card('House battery not charging', 'Converter, disconnect, solar controller, and BMS checks before you condemn the bank. A sulfated lead-acid pack can look full at rest and collapse under a small load.')}
      ${card('No water / pump issues', 'Output pressure, downstream leaks, check valves, city-water regulator, and freeze breaks. Constant cycling is usually a leak or a failed check valve, not “a bad pump.”')}
      ${card('Roof leak / soft deck', 'Seams, lap sealant, vents, and moisture mapping. A soft deck is structural — stop DIY and get it traced before the next rain.')}
      ${card('Generator will not start', 'Fuel, spark, air, and control-side checks before a roll. Annual oil, filter, and load testing prevent the “it sat all winter” no-start.')}
      ${card('Starlink / weBoost / Peplink', 'Sky view, power, cable, and dual-WAN priority for Starlink. Outdoor RF, AGC, and antenna isolation for weBoost — a booster will not invent coverage from zero. Peplink Health Check flaps and SpeedFusion mode before swapping SIMs.')}
      ${card('Inverter / shore-power faults', 'Transfer, overload, EMS, and inlet checks before condemning the inverter. Adapters do not invent amperage; a hot dogbone is a fire risk.')}
      ${card('Winterize fail / fridge on propane', 'Stop the water, map ruptures, then repair versus sectional replace. Fridge and LP: never bypass safety devices. Smell of gas or scorch marks — stop and text.')}
    </div>
    <p>When you text, send one message: city or ZIP (trip quoted before we roll), rig type, the symptom in plain language, what you already tried, and photos of panels, apps, mounts, or labels. Fault codes and safe voltage snapshots help.</p>
  </div>
</section>`;
}

/** Published rates — same numbers as WP book-service / pricing. */
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

/** Quote-first shop language — professional, not live checkout. */
export function quoteFirstSection({ variant = 'shop' } = {}) {
  const lead = variant === 'cart'
    ? 'This cart is a quote worksheet, not a live checkout. Nothing is charged here. Request one combined quote covering every line above. We follow up with confirmed pricing, availability, shipping or install options, and how to arrange payment.'
    : variant === 'product'
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
      ${card('Hardware + on-site installation', 'We quote the equipment and send the technician to install it at your location. Trip fee quoted before we roll.')}
      ${card('Full system design + installation', 'We design the system around the rig — daily watt-hours, bank size, inverter, protection — then install and commission it.')}
    </div>
    <p class="muted">Prefer to talk it through first? <a href="${CALL_HREF}">${CALL_LABEL}</a> or <a href="${TEXT_NOW_HREF}">${TEXT_NOW_LABEL}</a>.</p>
  </div>
</section>`;
}

export function shopPartsIntroHtml() {
  return `<span class="eyebrow"><span class="dot"></span>RV systems shop</span>
    <h1>Specify the system. Then request a quote.</h1>
    <p class="lead">A light that flickers, a bank that dies overnight, or a converter that never finishes a charge is not a catalog problem. Describe what the rig needs to do. We specify equipment that actually works together — Victron, lithium, solar, protection, climate, connectivity — then handle sourcing, configuration, and installation if you want it.</p>
    <p>Listed prices are published reference figures, not a live checkout and not a fabricated number. Availability is confirmed as part of the quote. Submit the request and we follow up with pricing, lead time, and how to arrange payment.</p>
    <p class="muted" style="margin-top:14px">Not sure which SKU? <a class="text-link" href="${BOOK_PUBLIC_HREF}" target="_blank" rel="noopener">Book a consultation</a> and skip guessing at part numbers — we spec it from the symptom.</p>`;
}

export function shopServicesIntroHtml() {
  return `<span class="eyebrow"><span class="dot"></span>Mobile service rates</span>
    <h1>Published rates. Book the visit from the list.</h1>
    <p class="lead">Diagnostics, installs, winterization, and repair — these are the current service rates we invoice against. Pick a line, book it, and we confirm scope and schedule with you directly. Labor is $150/hr after the initial diagnostic. A trip fee applies beyond 30 miles ($1.50/mi each way), confirmed before we leave.</p>
    <p>Every visit is diagnostic-first. Thermal imaging and DVOM work happen before parts get swapped. You authorize the fix after the diagnosis. Parts and materials are billed separately.</p>
    <p class="muted" style="margin-top:14px">Shopping for hardware instead? <a class="text-link" href="/shop/">See parts</a>.</p>`;
}

export function shopEmptyHtml(activeTab) {
  const noun = activeTab === 'services' ? 'Service lines' : 'Catalog items';
  return `<section class="band"><div class="wrap">
    <p>${noun} are being loaded. In the meantime, book a consultation or text the technician with the symptom, city or ZIP, and rig.</p>
    <div class="btn-row">
      <a class="btn btn-gold" href="${BOOK_PUBLIC_HREF}" target="_blank" rel="noopener">Book a consultation</a>
      <a class="btn btn-ghost" href="${TEXT_NOW_HREF}">${TEXT_NOW_LABEL}</a>
    </div>
  </div></section>`;
}

/** Forum body blocks — same facts, community context. */
export function forumSubstanceHtml() {
  return `${techVoiceSection()}
${diagnosticProcessSection()}
${troubleshootingSection()}
<section class="band">
  <div class="wrap">
    <span class="micro">Community rules</span>
    <h2>How this forum is run</h2>
    <div class="faq-item"><h3>Be useful</h3><p>Answer the way you would want an answer. Do not put someone down for not knowing a system — everyone started somewhere.</p></div>
    <div class="faq-item"><h3>No spam or unrelated promotion</h3><p>Selling something or dropping links unrelated to the question holds the post for review and can get it removed.</p></div>
    <div class="faq-item"><h3>Stay on topic</h3><p>Repair, off-grid power, connectivity, route and service areas, or general RV and van talk. Political and unrelated content is not for this forum.</p></div>
    <div class="faq-item"><h3>Posts are screened</h3><p>New threads and replies are checked for spam, scams, and abuse before they go live. Most posts clear quickly. Flagged ones wait for a human moderator.</p></div>
    <div class="faq-item"><h3>Not a substitute for on-site diagnosis</h3><p>Advice here — including from us — is offered in good faith. It is not a replacement for an in-person look at the rig before you act on anything electrical, gas, or structural. Smell of LP, live 120V you cannot isolate, or a soft roof deck: stop and text.</p></div>
  </div>
</section>`;
}

export function bookHeroHtml() {
  return `<section class="page-hero">
  <div class="wrap">
    <span class="micro">Mobile RV, van, and trailer repair</span>
    <h1>Request a service call</h1>
    <p class="lead">Tell us what is going on and where you are. Every request is reviewed personally, with an upfront price before we show up. You reach the technician directly — not a dispatch queue.</p>
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
        <p>Submit the Square request or text the technician. Include the issue, city or ZIP, and the rig year / make / model. Photos and fault codes help.</p>
      </div>
      <div>
        <span class="step-num">02</span>
        <h3>We confirm scope</h3>
        <p>Trip fee quoted upfront. Diagnostic-first — we do not guess a total before we see the system. Matt reviews every request personally.</p>
      </div>
      <div>
        <span class="step-num">03</span>
        <h3>You authorize the fix</h3>
        <p>After the diagnosis you authorize the repair. Parts and materials are billed separately. No surprise invoice for work you did not approve.</p>
      </div>
    </div>
  </div>
</section>`;
}
