/**
 * AI auto-moderation via Cloudflare Workers AI (same free Llama binding
 * already used by /api/chat — no extra cost, no external API key).
 * Returns { flagged, severity, reason }. severity 'high' = auto-hide.
 */

const MOD_PROMPT = `You are a moderation classifier for a mobile RV repair company's public forum. Classify the user message below.

Flag content that is: spam/scam/phishing, harassment or hate speech, explicit sexual content, illegal activity solicitation, or malicious links.
Do NOT flag: normal complaints, frustration, profanity used casually, off-topic-but-harmless chat, or legitimate RV/technical questions.

Respond with ONLY compact JSON, no other text: {"flagged": true|false, "severity": "none"|"low"|"high", "reason": "short reason or empty string"}`;

export async function moderateText(ai, text) {
  if (!ai) {
    return { flagged: false, severity: 'none', reason: '' };
  }
  try {
    const result = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: MOD_PROMPT },
        { role: 'user', content: text.slice(0, 4000) },
      ],
      max_tokens: 120,
      temperature: 0,
    });
    const raw = (result?.response || '').trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { flagged: false, severity: 'none', reason: '' };
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      flagged: !!parsed.flagged,
      severity: parsed.severity || (parsed.flagged ? 'low' : 'none'),
      reason: (parsed.reason || '').slice(0, 200),
    };
  } catch {
    // Fail open — never block a legit post because the classifier hiccuped.
    return { flagged: false, severity: 'none', reason: '' };
  }
}
