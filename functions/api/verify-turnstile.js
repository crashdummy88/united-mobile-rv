import { verifyTurnstile } from '../_lib/turnstile.js';

// Lets the WordPress-hosted book-service form (a different origin) verify a
// Turnstile token server-side before submitting the lead to Web3Forms.
const ALLOWED_ORIGIN = 'https://unitedmobilerv.com';

function withCors(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store',
    },
  });
}

export async function onRequestOptions() {
  return withCors({}, 204);
}

export async function onRequestPost(context) {
  const { env, request } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return withCors({ success: false, error: 'invalid_json' }, 400);
  }
  const result = await verifyTurnstile(body.token, env, request.headers.get('CF-Connecting-IP'));
  return withCors({ success: result.ok }, 200);
}
