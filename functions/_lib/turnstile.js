/**
 * Cloudflare Turnstile server-side verification.
 * Requires Pages env var TURNSTILE_SECRET_KEY.
 */
export async function verifyTurnstile(token, env, ip) {
  if (!env.TURNSTILE_SECRET_KEY) return { ok: false, error: 'not_configured' };
  if (!token) return { ok: false, error: 'missing_token' };

  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET_KEY);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const data = await res.json();
    return { ok: !!data.success, error: data.success ? null : (data['error-codes'] || []).join(',') };
  } catch {
    return { ok: false, error: 'verify_request_failed' };
  }
}
