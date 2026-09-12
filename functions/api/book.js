/**
 * Cloudflare Pages Function: POST /api/book
 * Proxies Book form to Web3Forms using Pages env PUBLIC_WEB3FORMS_KEY
 * (static HTML cannot read Pages env vars).
 * Soft-fails with phone fallback messaging — never log or return the key.
 */
import { verifyTurnstile } from '../_lib/turnstile.js';
import { checkRateLimit } from '../_lib/rate-limit.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const key = (env.PUBLIC_WEB3FORMS_KEY || env.WEB3FORMS_ACCESS_KEY || '').trim();
  if (!key || key === 'PUBLIC_WEB3FORMS_KEY' || key.includes('REPLACE')) {
    return json(
      {
        success: false,
        error: 'not_configured',
        message: 'Online form is not configured yet. Call or text (616) 606-5277 to book.',
      },
      503
    );
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ success: false, error: 'invalid_form', message: 'Could not send. Please call (616) 606-5277.' }, 400);
  }

  // Honeypot: real visitors never fill this hidden field. Silent success so
  // bots don't learn they were caught.
  const honeypot = (form.get('website') || '').toString().trim();
  if (honeypot) {
    return json({ success: true });
  }

  const rl = await checkRateLimit(env, request, { max: 3, windowMinutes: 10, key: 'book' });
  if (rl.limited) {
    return json(
      { success: false, error: 'rate_limited', message: 'Too many requests. Please call (616) 606-5277.', retry_after: rl.retryAfter },
      429
    );
  }

  const tsToken = (form.get('cf-turnstile-response') || '').toString();
  const tsResult = await verifyTurnstile(tsToken, env, request.headers.get('CF-Connecting-IP'));
  if (!tsResult.ok) {
    return json({ success: false, error: 'captcha_failed', message: 'Verification failed. Please try again.' }, 403);
  }

  // Required Book fields (Matt lock)
  const required = ['name', 'phone', 'email', 'location', 'issue', 'rig'];
  for (const field of required) {
    const v = (form.get(field) || '').toString().trim();
    if (!v) {
      return json({ success: false, error: 'missing_field', message: 'Please fill all required fields.' }, 400);
    }
  }

  const emailValue = (form.get('email') || '').toString().trim();
  if (emailValue && !EMAIL_RE.test(emailValue)) {
    return json({ success: false, error: 'invalid_email', message: 'Please enter a valid email address.' }, 400);
  }

  const out = new FormData();
  for (const [k, v] of form.entries()) {
    if (k === 'access_key' || k === 'cf-turnstile-response' || k === 'website') continue;
    out.append(k, v);
  }
  out.append('access_key', key);
  if (!out.get('subject')) {
    out.append('subject', 'UMRT Book a Service request');
  }

  let web3formsOk = false;
  try {
    const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: out });
    const data = await res.json().catch(() => ({}));
    web3formsOk = !!(data && data.success);
  } catch {
    return json(
      {
        success: false,
        error: 'network',
        message: 'Network error. Please call (616) 606-5277.',
      },
      200
    );
  }

  if (!web3formsOk) {
    return json(
      {
        success: false,
        error: 'upstream',
        message: 'Could not send. Please call (616) 606-5277.',
      },
      200
    );
  }

  // Best-effort job record for the portal's Track page. Accepts either this
  // site's own field names or the WP /book-service form's names. Never lets
  // a DB hiccup block the customer's request -- the email above already sent.
  if (env.PORTAL_DB) {
    try {
      const g = (k1, k2) => (form.get(k1) || form.get(k2) || '').toString().trim();
      const fullName = g('name', 'fullName');
      const phone = g('phone', 'phone');
      const jobEmail = g('email', 'email');
      const issue = g('issue', 'issue');
      const location = g('location', 'street');
      const city = g('city', 'city');
      const state = g('state', 'state');
      const zip = g('zip', 'zip');
      const rig = g('rig', '');
      const rvYear = g('rvYear', '');
      const rvMake = g('rvMake', '');
      const rvModel = g('rvModel', '');
      const vin = g('vin', '');
      const preferredDate = g('preferredDate', '');
      const preferredTime = g('preferredTime', '');
      const id = crypto.randomUUID();

      await env.PORTAL_DB.prepare(
        `INSERT INTO jobs (id, full_name, phone, email, rv_year, rv_make, rv_model, vin, issue, street, city, state, zip, preferred_date, preferred_time, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id, fullName, phone, jobEmail || null,
        rvYear || null, rvMake || null, rvModel || null, vin || null,
        issue, location || null, city || null, state || null, zip || null,
        preferredDate || null, preferredTime || null,
        rig ? 'united-mobile-rv-book' : 'wp_book_service'
      ).run();
    } catch (e) {
      // Swallow -- job tracking is a bonus, not a requirement for booking to work.
    }
  }

  return json({ success: true });
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
