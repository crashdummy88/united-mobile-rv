/**
 * Regression test for the P1 fix (2026-09-15): functions/api/chat.js
 * returned the raw Workers-AI error message to the client whenever the
 * request carried `x-debug: 1` -- a header any unauthenticated caller can
 * set themselves, making it a real internal-error-disclosure path rather
 * than a real debug gate.
 *
 * Exercises the REAL onRequestPost handler with env.AI.run() forced to
 * throw an error containing a sensitive-looking string, and asserts that
 * string never appears in the client-facing response body, with or
 * without the x-debug header, and that the response is always the
 * generic fallback shape.
 *
 * Stubs global fetch only for the Turnstile siteverify call (so no real
 * network request is made); rate limiting is a clean no-op when env.DB is
 * absent (see functions/_lib/rate-limit.js).
 *
 * Run: node tests/security/chat-debug-leak.test.js
 */
import { test, run, assert } from '../lib/tiny-test.js';
import { onRequestPost } from '../../functions/api/chat.js';

const SENSITIVE_STRING = 'internal-detail: db_conn=postgres://real-secret-looking-string';

function makeRequest({ debugHeader } = {}) {
  const headers = new Headers();
  if (debugHeader) headers.set('x-debug', debugHeader);
  return {
    headers,
    async json() {
      return {
        messages: [{ role: 'user', content: 'hello, my slide-out is stuck' }],
        'cf-turnstile-response': 'fake-token',
      };
    },
  };
}

function makeEnv() {
  return {
    // No env.DB -> checkRateLimit() no-ops (fails open by design).
    TURNSTILE_SECRET_KEY: 'test-secret',
    AI: {
      async run() {
        throw new Error(SENSITIVE_STRING);
      },
    },
  };
}

let realFetch;
function stubTurnstileFetch() {
  realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes('challenges.cloudflare.com')) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    throw new Error(`unexpected fetch in test: ${url}`);
  };
}
function restoreFetch() {
  globalThis.fetch = realFetch;
}

test('x-debug: 1 no longer leaks the internal error message (THE FIX)', async () => {
  stubTurnstileFetch();
  try {
    const res = await onRequestPost({ request: makeRequest({ debugHeader: '1' }), env: makeEnv() });
    const text = await res.text();
    assert.equal(text.includes(SENSITIVE_STRING), false, `response leaked internal error text: ${text}`);
    assert.equal(text.includes('detail'), false, 'response body still contains a "detail" field');
    const body = JSON.parse(text);
    assert.equal(body.error, 'upstream');
    assert.equal(body.mode, 'fallback');
    assert.equal(res.status, 200);
  } finally {
    restoreFetch();
  }
});

test('without x-debug header: same safe generic error (unchanged behavior)', async () => {
  stubTurnstileFetch();
  try {
    const res = await onRequestPost({ request: makeRequest({}), env: makeEnv() });
    const text = await res.text();
    assert.equal(text.includes(SENSITIVE_STRING), false);
    const body = JSON.parse(text);
    assert.equal(body.error, 'upstream');
    assert.equal(body.mode, 'fallback');
  } finally {
    restoreFetch();
  }
});

test('arbitrary/malicious x-debug values still get the same safe generic error', async () => {
  stubTurnstileFetch();
  try {
    const res = await onRequestPost({
      request: makeRequest({ debugHeader: 'true; drop secrets' }),
      env: makeEnv(),
    });
    const text = await res.text();
    assert.equal(text.includes(SENSITIVE_STRING), false);
  } finally {
    restoreFetch();
  }
});

test('successful AI call is unaffected by the fix (legitimate behavior preserved)', async () => {
  stubTurnstileFetch();
  try {
    const env = makeEnv();
    env.AI = { async run() { return { response: 'Sounds like a slide-out motor issue -- want to book a diagnostic?' }; } };
    const res = await onRequestPost({ request: makeRequest({}), env });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.mode, 'workers-ai');
    assert.equal(typeof body.reply, 'string');
    assert.equal(body.reply.length > 0, true);
  } finally {
    restoreFetch();
  }
});

await run();
