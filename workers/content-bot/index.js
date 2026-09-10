/**
 * UMRT Forum Content Bot — scheduled Worker (Cron Trigger).
 * Generates one deep-dive diagnostic guide thread per run, posted honestly
 * under the existing "UMRT Team" bot account and clearly labeled as
 * AI-assisted so nothing is ever presented as a real customer post or as
 * Matt's own words. Runs against the same D1 database as the forum site.
 */

const TOPICS = [
  'Isolating a high-resistance ground loop in a 24V multi-inverter setup',
  'Dometic RV AC throwing an E1/E2 fault code — how to narrow it down',
  'Diagnosing a slow-draining house battery bank with no obvious parasitic load',
  'Troubleshooting a Truma or Suburban water heater that won’t ignite',
  'Freightliner/Sprinter chassis warning lights after aftermarket electrical work',
  'Solar charge controller showing bulk/absorption but batteries never reach 100%',
  'RV roof seal failure signs before they become a leak',
  'Diagnosing intermittent 12V circuit dropouts (loose ground vs. corroded connector)',
  'Peplink/cellular booster showing signal but no data throughput',
  'Winterizing a water system so the low-point drains actually work',
  'Axle bearing noise vs. brake noise — how to tell them apart before towing',
  'Propane appliance won’t stay lit — thermocouple vs. regulator vs. air in the line',
];

const GUIDE_PROMPT = `You are a senior RV/trailer diagnostic technician writing an educational forum post for a mobile RV repair company's public community forum.

Write a genuinely useful diagnostic guide (350-500 words) on the topic given. Structure it with:
- A one-sentence summary of the symptom/problem
- The likely causes, most common first
- A step-by-step check-in-this-order troubleshooting approach a rig owner could actually follow
- One clear line on when to stop DIY and call a certified mobile tech

Be specific and technically accurate. Do not invent brand-specific part numbers you're not sure of. Do not claim personal experience or say "I" did a repair — write it as general technical guidance. Do not sign the post.`;

async function randomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env) {
    // Manual trigger for testing: POST with header X-Content-Bot-Key matching env.CONTENT_BOT_KEY.
    if (request.method === 'POST' && env.CONTENT_BOT_KEY && request.headers.get('X-Content-Bot-Key') === env.CONTENT_BOT_KEY) {
      const result = await runOnce(env);
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('UMRT Forum Content Bot — scheduled Worker, not a public endpoint.', { status: 200 });
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runOnce(env));
  },
};

async function runOnce(env) {
  if (!env.DB || !env.AI) return { ok: false, error: 'missing_bindings' };

  const bot = await env.DB.prepare(`SELECT id FROM users WHERE id = 'bot-umrt-team'`).first();
  if (!bot) return { ok: false, error: 'bot_user_missing' };

  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];

  let guide;
  try {
    const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: GUIDE_PROMPT },
        { role: 'user', content: `Topic: ${topic}` },
      ],
      max_tokens: 700,
      temperature: 0.5,
    });
    guide = (result?.response || '').trim();
  } catch (e) {
    return { ok: false, error: 'ai_failed', detail: String(e) };
  }
  if (!guide) return { ok: false, error: 'empty_guide' };

  const category = /power|solar|battery|inverter|ground/i.test(topic)
    ? 'power'
    : /connectiv|peplink|cellular|signal/i.test(topic)
    ? 'connectivity'
    : /route|corridor/i.test(topic)
    ? 'route'
    : 'repair';

  const title = topic.length > 120 ? topic.slice(0, 117) + '...' : topic;
  const body =
    `🤖 This is an AI-assisted diagnostic guide from the UMRT Team bot — general technical education, not a substitute for hands-on diagnosis of your specific rig.\n\n` +
    guide +
    `\n\nQuestions about your specific setup? Text/call (616) 606-5277 or start a thread below.`;

  const id = await randomId();
  await env.DB.prepare(
    `INSERT INTO threads (id, title, body, category, author_id, hidden, ai_flagged, ai_reason) VALUES (?, ?, ?, ?, ?, 0, 0, NULL)`
  ).bind(id, title, body, category, bot.id).run();

  return { ok: true, id, title, category };
}
