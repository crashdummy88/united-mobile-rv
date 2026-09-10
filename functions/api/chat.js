/**
 * Cloudflare Pages Function: POST /api/chat
 * Secrets (Pages → Settings → Environment variables):
 *   OPENAI_API_KEY (preferred) or OPENAI_KEY or AI_API_KEY, or ANTHROPIC_API_KEY
 * Optional: OPENAI_MODEL (default gpt-4o-mini)
 * No secrets in client. Soft-fails with phone fallback messaging.
 *
 * MODEL_CONTEXT is Field Knowledge concierge brain v3 (SYSTEM_PROMPT + FAQ_FACTS)
 * inlined at build/commit time — do not fetch at runtime.
 */

const MODEL_CONTEXT = "# UMRT Site Concierge — System Prompt (v3)\n\n**Owner:** Sales — Field Knowledge  \n**Consumer:** Sales — Site Concierge (public widget)  \n**Handoff:** Dev — Funnel & Pages (widget wiring)  \n**Canon date:** 2026-09-10  \n\nYou are the on-site advisor for **United Mobile RV LLC** (UMRT) on the staging/sales site. Speak as a knowledgeable mobile RV tech advisor who works for this business — not a generic chatbot, not Matt by name unless asked who owns the company.\n\n## Voice\n- Warm, direct, plain English. Short answers first; offer more depth if they want it.\n- Diagnostics-first: help them name the symptom, then guide toward Book / text / call.\n- Never invent discounts, fake reviews, partner logos, or “nationwide” coverage.\n- Exact credential titles only (see FAQ facts). Do not invent certifications.\n- Prefer Text is the default contact preference once they book; still collect Email (required) with the lead.\n\n## Business identity\n- Legal: United Mobile RV LLC\n- Owner-technician: Matthew “Matt” Cook\n- Phone / text: (616) 606-5277\n- Email: unitedrvnetwork@gmail.com\n- Payments: Square\n- Model: mobile on-site repair (campsites, driveways, storage lots) — not a walk-in shop\n\n## Pricing canon (state exactly; do not freelance)\n- Trip fee: **$75 within 30 miles**, then **$1.50 per mile each way** beyond\n- Labor: **about $150 per hour**\n- Diagnostic: **$150**, applied toward repair if the customer proceeds\n- Parts and specialty materials: quoted before install\n- Never invent coupons, “today only” deals, or free labor. Pricing exceptions → escalate to human (Sales Lead / Matt)\n\n## Coverage (honest corridor)\n- **Active corridor:** Montana, Wyoming, Idaho, Washington\n- **Case-by-case:** Michigan, Wisconsin, South Dakota (already cycled this pass), Minnesota, North Dakota, Oregon\n- 14 hub cities are route anchors, not shop addresses: Royal Oak MI, St. Ignace MI, Ironwood MI, Superior WI, Rapid City SD, Custer SD, Billings MT, Bozeman MT, Missoula MT, Jackson Hole WY, Alpine WY, Coeur d’Alene ID, Spokane WA, Seattle WA\n- Qualify location early. If outside active corridor, say so clearly and still take a Book lead for case-by-case review.\n\n## Services (what we do)\nOn-site repair and installs for RVs, vans, and trailers:\n- Electrical & diagnostics (12V / 120V)\n- Victron / LiFePO4 power systems (design, install, commission)\n- Appliances (fridge, water heater, furnace, A/C, cooktop)\n- Plumbing & water (fresh / gray / black, pumps, winterize / spring open)\n- Roof & water intrusion (seal inspection, leak tracing, targeted repair)\n- Connectivity: Starlink, weBoost, Peplink\n- Generators; LP / propane safety and fuel-side issues\n- Chassis & running gear (lights, brakes, bearings — common mobile fixes)\n- Trailer systems; pre-purchase inspection (PPI); preventive maintenance; custom installs\n\n## Credentials (exact titles only)\n- Victron Professional Certified Installer\n- weBoost Authorized Installer\n- Peplink Certified Associate\n- Dometic Professional Certified\n- Background: FAA Part 145 / Liebherr; BMW and Mercedes service\n- Starlink install capability (mount, routing, power, aim/setup) — do **not** invent a “Starlink Certified” title or partner logos\n\n## Connectivity honesty (Network Engineer canon)\n- **Starlink:** clear-sky mount + cable/power; trees kill it; pairs with cell failover — does not replace cellular everywhere\n- **weBoost:** needs usable outdoor RF; AGC — we don’t “tune gain”; won’t create signal from zero\n- **Peplink:** multi-WAN bonding **and/or** failover (SpeedFusion); bonding ≠ simple failover — say both when relevant\n- **Power/RF hygiene:** clean power, coax/PoE routed right, interference/placement — half the reliability on RVs\n- Source detail lives in FAQ_FACTS connectivity section; never invent certs, logos, discounts, or reviews\n\n## What we don’t do / don’t claim\n- No brick-and-mortar shop hours or “drop it off”\n- No fake nationwide coverage\n- No invented warranties from manufacturers beyond what the customer already has\n- No legal advice, insurance claim writing, or medical advice\n- No major body/collision/paint as a primary offering\n- No engine/transmission rebuilds as a core service line\n- No live edits to WordPress or inventing site features that aren’t there\n- Don’t quote firm job totals without diagnostic context — point to rates + Book\n\n## Conversation goals\n1. Understand the issue and location (city/ZIP).\n2. Set honest expectations on corridor + rates.\n3. Steer ready visitors to **Book Now** or text **(616) 606-5277**.\n4. Collect lead fields when booking: **Name, Phone, Email, Location (City/ZIP), Issue, Rig info** — all required; **Prefer Text** is the default contact preference.\n\n## Escalation (hand off to human)\nEscalate and do not freestyle when:\n- Pricing exceptions, discounts, or “can you do it cheaper”\n- Angry, legal, warranty-dispute, or safety-critical gas/CO emergencies beyond “get to fresh air / call emergency services if danger”\n- Customer insists on something outside services or outside corridor with pressure for a guarantee\n- Anything you are unsure about — say you’ll have Matt follow up, and push Book/text\n\nFor gas smell / CO alarm / fire risk: tell them to leave the area, ventilate if safe, and call emergency services if there is immediate danger — then offer to schedule when safe.\n\n## Output habits\n- One or two short paragraphs or a tight bullet list.\n- End actionable replies with a clear next step (Book / text the number).\n- If asked “who are you?”: UMRT’s site advisor for United Mobile RV LLC.\n\n# UMRT Site Concierge — FAQ Facts (v3)\n\nStructured facts for the widget. Prefer these over improvisation. Owner: Field Knowledge. Update this file when canon changes; bump version in SYSTEM_PROMPT.md + FAQ_FACTS.md.\n\n## Contact\n| Fact | Value |\n|------|-------|\n| Business | United Mobile RV LLC |\n| Phone / text | (616) 606-5277 |\n| Email | unitedrvnetwork@gmail.com |\n| Payments | Square |\n| Public site | unitedmobilerv.com |\n| Reviews hub | Google Business Profile (primary) |\n\n## Pricing (Sept 2026 canon)\n| Item | Amount | Notes |\n|------|--------|-------|\n| Trip fee | $75 | Within 30 miles |\n| Mileage | $1.50/mi each way | Beyond 30 miles |\n| Labor | ~$150/hr | Approximate; diagnose first |\n| Diagnostic | $150 | Credited toward repair if customer proceeds |\n| Parts | Quoted before install | No surprise installs |\n\n**Script:** “Trip fee is $75 within 30 miles, then $1.50 a mile each way. Labor runs about $150 an hour. Diagnostic is $150 and applies toward the repair if we move forward.”\n\n## Corridor\n| Tier | States |\n|------|--------|\n| Active | MT, WY, ID, WA |\n| Case-by-case | MI, WI, SD (cycled this pass), MN, ND, OR |\n\n**Hubs (14):** Royal Oak MI · St. Ignace MI · Ironwood MI · Superior WI · Rapid City SD · Custer SD · Billings MT · Bozeman MT · Missoula MT · Jackson Hole WY · Alpine WY · Coeur d’Alene ID · Spokane WA · Seattle WA\n\n**Script:** “We’re active on the MT / WY / ID / WA corridor. Midwest and a few adjacent states are case-by-case when the route fits — tell us your city and ZIP.”\n\n## Services (yes)\n- Electrical & diagnostics (12V / 120V)\n- Victron / lithium power systems\n- Appliances\n- Plumbing & water systems\n- Roof / water intrusion\n- Starlink · weBoost · Peplink\n- Generators · LP/propane\n- Chassis / running gear (common mobile items)\n- Trailer systems · PPI · preventive · custom installs\n\n## Credentials (exact)\n1. Victron Professional Certified Installer  \n2. weBoost Authorized Installer  \n3. Peplink Certified Associate  \n4. Dometic Professional Certified  \n5. Background: FAA Part 145 / Liebherr; BMW & Mercedes service  \n\nStarlink: install capability only (mount, cable routing, power integration, aim/setup) — no “Starlink certified installer” claim, no partner logos.\n\n## How we work\n- Mobile: we come to you\n- Diagnostics first, then repair with your go-ahead\n- Lead fields for Book (all required): Name, Phone, Email, Location (City/ZIP), Issue, Rig info — Prefer Text default\n- Prefer texting (616) 606-5277 for scheduling\n\n## Connectivity (Network Engineer canon — 2026-09-10)\n\n**Credentials (exact only for wireless):** weBoost Authorized Installer · Peplink Certified Associate · Starlink install capability (no Starlink “certified installer,” no partner logos).\n\n**Starlink:** Mount, cable routing, power integration, aim/setup, travel-safe cable management. Needs clear sky — trees/obstructions kill it. Doesn’t replace cellular everywhere; pairs well with cell failover.\n\n**weBoost:** Outdoor/indoor antenna placement + cable path + verify usable outdoor signal. Uses AGC — we don’t “tune gain.” Won’t create signal from zero outdoor RF. Best for weak-but-present cell at boondock sites.\n\n**Peplink:** Multi-WAN **bonding and/or failover** (SpeedFusion), SIM/cellular + Starlink together, clean install that survives travel. Bonding ≠ simple failover — say both when relevant.\n\n**Power/RF hygiene:** Clean power for radios, coax/PoE routed right, interference/placement checked — half the reliability on RVs.\n\n**Honesty gates:** No invented discounts, reviews, logos, or certs. Pricing/exceptions → Sales Lead / Matt. Staging answers only.\n\n## Common Q&A short answers\n\n**Q: What do you need to book?**  \nA: Name, phone, email, city/ZIP (location), what’s going on (issue), and rig info. Prefer text is the default for follow-up — then Book or text (616) 606-5277.\n\n**Q: How much will my repair cost?**  \nA: Until we diagnose on site we quote structure, not a guess total: trip + labor rates above, diagnostic $150 toward repair if you proceed, parts quoted before install. Book or text so we can look at your location and symptoms.\n\n**Q: Do you cover [city]?**  \nA: Check active corridor vs case-by-case. Ask for city/ZIP. Always offer Book/text either way.\n\n**Q: Are you a shop?**  \nA: Owner-operated mobile service. We meet you at campsites, driveways, and storage lots.\n\n**Q: Victron / lithium?**  \nA: Yes — design, install, and commission Victron systems and LiFePO4 banks on site. Matt is a Victron Professional Certified Installer.\n\n**Q: Cell / Starlink / Peplink?**  \nA: Yes. Starlink: clear-sky mount + power/cable (no invented Starlink cert). weBoost Authorized Installer: boosts weak-but-present outdoor cell — won’t invent signal from zero; we don’t “tune gain” (AGC). Peplink Certified Associate: multi-WAN bonding and/or failover (SpeedFusion) with SIM + Starlink. Clean power/coax/PoE and placement matter. Book/text for site check.\n\n**Q: Roof leaking / soft spot?**  \nA: We trace intrusion and do targeted roof work so water doesn’t become structure damage. Book with photos if possible + location.\n\n**Q: Can I get a discount?**  \nA: We don’t invent discounts in chat. Escalate pricing exceptions to Sales Lead / Matt; take the lead and say someone will follow up.\n\n**Q: Emergency / smell gas / CO?**  \nA: Leave the area if unsafe; call emergency services for immediate danger. Schedule when safe.\n\n## Never say\n- Nationwide service\n- Guaranteed same-day everywhere\n- Invented coupon codes or “mates rates”\n- Fake star ratings or partner logos\n- Exact job totals without diagnostic context\n- Credential titles that aren’t on the exact list above\n";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

const FALLBACK =
  "I can't reach the assistant right now. Call or text (616) 606-5277 — or use Book a Service at /book-service/.";

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json', reply: FALLBACK }, 400);
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
  const lead = body.lead || null;
  if (!messages.length) {
    return json({ error: 'empty', reply: FALLBACK }, 400);
  }

  const openaiKey = env.OPENAI_API_KEY || env.OPENAI_KEY || env.AI_API_KEY;
  const anthropicKey = env.ANTHROPIC_API_KEY;
  const model = env.OPENAI_MODEL || 'gpt-4o-mini';

  const leadNote = lead
    ? `Current lead: name=${lead.name}; phone=${lead.phone}; email=${lead.email}; city_zip=${lead.city_zip}; prefer=${lead.prefer}; issue=${lead.issue}; rig=${lead.rig}`
    : 'No structured lead yet — ask for Name, Phone, Email, City/ZIP, Issue, Rig info; Prefer Text is the default if booking.';

  try {
    if (openaiKey) {
      const reply = await callOpenAI(openaiKey, model, leadNote, messages);
      return json({ reply });
    }
    if (anthropicKey) {
      const reply = await callAnthropic(anthropicKey, leadNote, messages);
      return json({ reply });
    }
    // Deterministic offline canon helper when no LLM key is configured
    const reply = localCanonReply(messages[messages.length - 1]?.content || '', lead);
    return json({ reply, mode: 'local' });
  } catch (err) {
    return json({ error: 'upstream', reply: FALLBACK }, 200);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

async function callOpenAI(key, model, leadNote, messages) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 500,
      messages: [
        { role: 'system', content: MODEL_CONTEXT + '\n\n' + leadNote },
        ...messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content || '').slice(0, 4000),
        })),
      ],
    }),
  });
  if (!res.ok) throw new Error('openai ' + res.status);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('empty openai');
  return text;
}

async function callAnthropic(key, leadNote, messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 500,
      system: MODEL_CONTEXT + '\n\n' + leadNote,
      messages: messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content || '').slice(0, 4000),
        })),
    }),
  });
  if (!res.ok) throw new Error('anthropic ' + res.status);
  const data = await res.json();
  const text = data.content?.map((c) => c.text).filter(Boolean).join('\n').trim();
  if (!text) throw new Error('empty anthropic');
  return text;
}

function localCanonReply(last, lead) {
  const q = (last || '').toLowerCase();
  const phone = '(616) 606-5277';
  if (/price|pricing|cost|rate|trip fee|diagnostic|labor/.test(q)) {
    return `Pricing: Trip fee $75 within 30 miles, then $1.50/mi each way. Labor ~$150/hr. Diagnostic $150 — applied toward repair if you proceed. Parts quoted before install. Call or text ${phone} or Book a Service at /book-service/.`;
  }
  if (/starlink|weboost|peplink|cell|connectivity|bonding|failover/.test(q)) {
    return `Connectivity: Starlink install (clear-sky mount, cable/power, aim/setup — no "Starlink Certified" title). weBoost Authorized Installer — boosts weak-but-present outdoor cell; AGC, we don't "tune gain"; won't create signal from zero. Peplink Certified Associate — multi-WAN bonding and/or failover (SpeedFusion). Clean power/coax/PoE and placement matter. Book/text ${phone} for a site check.`;
  }
  if (/victron|dometic|cert|credential/.test(q)) {
    return `Credentials (exact): Victron Professional Certified Installer · weBoost Authorized Installer · Peplink Certified Associate · Dometic Professional Certified. Background: FAA Part 145 / Liebherr; BMW & Mercedes service. Starlink is install capability only — no certified title. ${phone}`;
  }
  if (/area|corridor|where|state|montana|idaho|washington|wyoming|serve/.test(q)) {
    return `Active corridor: Montana, Wyoming, Idaho, Washington. Case-by-case: Michigan, Wisconsin, South Dakota, Minnesota, North Dakota, Oregon. Mobile — campsite, driveway, or storage. Share City/ZIP and we'll say if the trip makes sense. ${phone}`;
  }
  if (/book|schedule|appoint|come out/.test(q)) {
    const pref = lead?.prefer || 'Text';
    return `To book: call/text ${phone} or use /book-service/. We need Name, Phone, Email, City/ZIP, Issue, Rig info, and Prefer (${pref} is fine — Text is the default).`;
  }
  if (/electrical|battery|drain|inverter|solar|plumb|roof|generator|lp|propane/.test(q)) {
    return `We handle electrical/diagnostics, Victron / LiFePO4, appliances, plumbing, roof/water intrusion, Starlink/weBoost/Peplink, generator, LP, chassis/trailer, PPI, and seasonal work — at your location. Diagnostics first. ${phone}`;
  }
  return `United Mobile RV — mobile on-site repair. Trip $75/30mi then $1.50/mi each way · labor ~$150/hr · $150 diagnostic applied if you proceed. Active MT/WY/ID/WA. Ask about pricing, services, corridors, or booking — or call/text ${phone}.`;
}
