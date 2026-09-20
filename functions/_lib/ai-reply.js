/**
 * AI-drafted first-pass technical reply helper.
 *
 * Thread-create auto-replies are frozen. umrt-forum-content-bot posts the
 * only remaining AI reply, and only as a first reply on tech-* pins.
 * This helper stays for tests / a future explicit staff trigger — do not
 * wire it back to POST /api/threads.
 */
const DRAFT_PROMPT = `You are a helpful, technically knowledgeable assistant for a mobile RV and trailer repair company's public forum. A visitor just posted a question below.

Write a short (3-6 sentences), genuinely useful first-pass troubleshooting reply: general, well-known RV/off-grid diagnostic steps only (electrical, plumbing, appliance, chassis, connectivity, solar). Be specific where you can (fault codes, common causes, what to check first) but stay general-knowledge — never invent specifics about this particular rig you don't know.
If the question is not a technical RV/trailer question (e.g. just a greeting, off-topic chat, or too vague to help with), respond with exactly: SKIP
Do not sign the message, do not use a greeting like "Hi", just give the guidance directly.`;

export async function draftAiReply(ai, title, text) {
  if (!ai) return null;
  try {
    const result = await ai.run('@cf/meta/llama-3.1-8b-instruct-fast', {
      messages: [
        { role: 'system', content: DRAFT_PROMPT },
        { role: 'user', content: `${title}\n\n${text}`.slice(0, 4000) },
      ],
      max_tokens: 300,
      temperature: 0.4,
    });
    const raw = (result?.response || '').trim();
    if (!raw || raw.toUpperCase().startsWith('SKIP')) return null;
    return raw.slice(0, 2000);
  } catch {
    return null;
  }
}
