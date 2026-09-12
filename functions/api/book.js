/**
 * Cloudflare Pages Function: POST /api/book
 * Proxies Book form to Web3Forms using Pages env PUBLIC_WEB3FORMS_KEY
 * (static HTML cannot read Pages env vars).
 * Soft-fails with phone fallback messaging — never log or return the key.
 */
import { verifyTurnstile } from '../_lib/turnstile.js';
import { checkRateLimit } from '../_lib/rate-limit.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// unitedmobilerv.com (WordPress) posts here cross-origin for the live
// /book-service form; this site's own /book-service page posts same-origin.
// Allow both explicitly rather than a wildcard, since this endpoint writes
// to the jobs DB and sends email.
const ALLOWED_ORIGINS = ['https://unitedmobilerv.com', 'https://united-mobile-rv.pages.dev'];

function corsHeaders(request) {
  const origin = request && request.headers.get('Origin');
  return ALLOWED_ORIGINS.includes(origin) ? { 'Access-Control-Allow-Origin': origin } : {};
}

function json(data, status = 200, request = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(request),
    },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const j = (data, status = 200) => json(data, status, request);
  const key = (env.PUBLIC_WEB3FORMS_KEY || env.WEB3FORMS_ACCESS_KEY || '').trim();
  if (!key || key === 'PUBLIC_WEB3FORMS_KEY' || key.includes('REPLACE')) {
    return j(
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
    return j({ success: false, error: 'invalid_form', message: 'Could not send. Please call (616) 606-5277.' }, 400);
  }

  // Honeypot: real visitors never fill this hidden field. Silent success so
  // bots don't learn they were caught.
  const honeypot = (form.get('website') || '').toString().trim();
  if (honeypot) {
    return j({ success: true });
  }

  const rl = await checkRateLimit(env, request, { max: 3, windowMinutes: 10, key: 'book' });
  if (rl.limited) {
    return j(
      { success: false, error: 'rate_limited', message: 'Too many requests. Please call (616) 606-5277.', retry_after: rl.retryAfter },
      429
    );
  }

  const tsToken = (form.get('cf-turnstile-response') || '').toString();
  const tsResult = await verifyTurnstile(tsToken, env, request.headers.get('CF-Connecting-IP'));
  if (!tsResult.ok) {
    return j({ success: false, error: 'captcha_failed', message: 'Verification failed. Please try again.' }, 403);
  }

  // Required fields, tolerant of two sources: this site's own form
  // (name/location/rig as single fields) and WP's /book-service form
  // (fullName/street+city+state+zip/rvYear+rvMake+rvModel separately,
  // flagged by the hidden form_source field). Rig is required for this
  // site's own form (Matt lock); WP submissions carry year/make/model
  // instead, which is optional metadata there, not a hard requirement.
  const isWpSource = (form.get('form_source') || '').toString().trim() === 'wp_book_service';
  const nameVal = (form.get('name') || form.get('fullName') || '').toString().trim();
  const phoneVal = (form.get('phone') || '').toString().trim();
  const emailVal = (form.get('email') || '').toString().trim();
  const issueVal = (form.get('issue') || '').toString().trim();
  let locationVal = (form.get('location') || '').toString().trim();
  if (!locationVal) {
    const street = (form.get('street') || '').toString().trim();
    const city = (form.get('city') || '').toString().trim();
    const state = (form.get('state') || '').toString().trim();
    const zip = (form.get('zip') || '').toString().trim();
    locationVal = [street, [city, state].filter(Boolean).join(', '), zip].filter(Boolean).join(' ').trim();
  }
  const rigVal = (form.get('rig') || '').toString().trim()
    || [form.get('rvYear'), form.get('rvMake'), form.get('rvModel')].filter(Boolean).join(' ').trim();

  const missing = [];
  if (!nameVal) missing.push('name');
  if (!phoneVal) missing.push('phone');
  if (!emailVal) missing.push('email');
  if (!issueVal) missing.push('issue');
  if (!locationVal) missing.push('location');
  if (!isWpSource && !rigVal) missing.push('rig');
  if (missing.length) {
    return j({ success: false, error: 'missing_field', message: 'Please fill all required fields.' }, 400);
  }

  const emailValue = (form.get('email') || '').toString().trim();
  if (emailValue && !EMAIL_RE.test(emailValue)) {
    return j({ success: false, error: 'invalid_email', message: 'Please enter a valid email address.' }, 400);
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
    return j(
      {
        success: false,
        error: 'network',
        message: 'Network error. Please call (616) 606-5277.',
      },
      200
    );
  }

  if (!web3formsOk) {
    return j(
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
      const street = (form.get('street') || '').toString().trim();
      const city = (form.get('city') || '').toString().trim();
      const state = (form.get('state') || '').toString().trim();
      const zip = (form.get('zip') || '').toString().trim();
      const rvYear = (form.get('rvYear') || '').toString().trim();
      const rvMake = (form.get('rvMake') || '').toString().trim();
      const rvModel = (form.get('rvModel') || '').toString().trim();
      const vin = (form.get('vin') || '').toString().trim();
      const preferredDate = (form.get('preferredDate') || '').toString().trim();
      const preferredTime = (form.get('preferredTime') || '').toString().trim();
      const id = crypto.randomUUID();

      await env.PORTAL_DB.prepare(
        `INSERT INTO jobs (id, full_name, phone, email, rv_year, rv_make, rv_model, vin, issue, street, city, state, zip, preferred_date, preferred_time, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id, nameVal, phoneVal, emailVal || null,
        rvYear || null, rvMake || null, rvModel || null, vin || null,
        issueVal, (street || locationVal) || null, city || null, state || null, zip || null,
        preferredDate || null, preferredTime || null,
        isWpSource ? 'wp_book_service' : 'united-mobile-rv-book'
      ).run();
    } catch (e) {
      // Swallow -- job tracking is a bonus, not a requirement for booking to work.
    }
  }

  return j({ success: true });
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      ...corsHeaders(context.request),
    },
  });
}
