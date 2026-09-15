/**
 * Regression test for the data-authority fix (2026-09-15): /api/chat's
 * scripted pricing answers used to hardcode the same numbers already
 * living in DB.pricing (the table /api/status and the admin pricing
 * editor both use) -- two copies of the same facts, one silent-staleness
 * risk. Now reads live from DB.pricing, with a hardcoded fallback ONLY
 * if the DB is unreachable (chat must never break on a DB hiccup).
 *
 * This does NOT change any actual price -- same numbers either way --
 * it only changes where the number comes from. Confirms:
 *   1. A changed price in DB.pricing is reflected in the scripted reply
 *      (proves it's actually reading live, not just returning the same
 *      hardcoded string by coincidence).
 *   2. When DB.pricing is unreachable, the last-known-correct hardcoded
 *      text is still returned (graceful degradation, chat never breaks).
 *
 * Run: node tests/security/chat-pricing-source.test.js
 */
import { test, run, assert } from '../lib/tiny-test.js';
import { onRequestPost } from '../../functions/api/chat.js';

function makeRequest(text) {
  const headers = new Headers();
  return {
    headers,
    async json() {
      return { messages: [{ role: 'user', content: text }], 'cf-turnstile-response': 'fake-token' };
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

function makeDb(rows) {
  return {
    prepare(sql) {
      return {
        async all() {
          if (/SELECT key, amount FROM pricing/.test(sql)) {
            return { results: rows };
          }
          throw new Error(`unexpected query: ${sql}`);
        },
      };
    },
  };
}

test('trip-fee scripted answer reflects a live-changed DB.pricing value', async () => {
  stubTurnstileFetch();
  try {
    const env = {
      TURNSTILE_SECRET_KEY: 'test-secret',
      DB: makeDb([
        { key: 'trip_fee', amount: '$999' }, // deliberately different from the hardcoded fallback, to prove it's live
        { key: 'mileage', amount: '$1.50/mi' },
        { key: 'labor', amount: '~$150/hr' },
        { key: 'diagnostic', amount: '$175' },
      ]),
    };
    const res = await onRequestPost({ env, request: makeRequest('what is your trip fee') });
    const body = await res.json();
    assert.equal(body.mode, 'scripted');
    assert.ok(body.reply.includes('$999'), `expected the live DB value ($999) in the reply, got: ${body.reply}`);
  } finally {
    restoreFetch();
  }
});

test('winterize/trip-prep scripted answer reflects live DB.pricing', async () => {
  stubTurnstileFetch();
  try {
    const env = {
      TURNSTILE_SECRET_KEY: 'test-secret',
      DB: makeDb([
        { key: 'winterize', amount: '$888' },
        { key: 'trip_prep', amount: '$777' },
      ]),
    };
    const res = await onRequestPost({ env, request: makeRequest('do you winterize') });
    const body = await res.json();
    assert.ok(body.reply.includes('$888') && body.reply.includes('$777'), `expected live values, got: ${body.reply}`);
  } finally {
    restoreFetch();
  }
});

test('falls back to the known-correct hardcoded text when DB.pricing is unreachable (chat never breaks)', async () => {
  stubTurnstileFetch();
  try {
    const env = { TURNSTILE_SECRET_KEY: 'test-secret', DB: { prepare() { throw new Error('D1 unavailable'); } } };
    const res = await onRequestPost({ env, request: makeRequest('what is your trip fee') });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.mode, 'scripted');
    assert.ok(body.reply.includes('$75'), 'expected the hardcoded fallback figure when DB is down');
  } finally {
    restoreFetch();
  }
});

test('falls back cleanly when env.DB is entirely absent', async () => {
  stubTurnstileFetch();
  try {
    const env = { TURNSTILE_SECRET_KEY: 'test-secret' };
    const res = await onRequestPost({ env, request: makeRequest('winterize pricing please') });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(body.reply.includes('$175') && body.reply.includes('$225'));
  } finally {
    restoreFetch();
  }
});

test('non-pricing scripted answers (no DB dependency) are unaffected', async () => {
  stubTurnstileFetch();
  try {
    const env = { TURNSTILE_SECRET_KEY: 'test-secret' };
    const res = await onRequestPost({ env, request: makeRequest('do you have a shop') });
    const body = await res.json();
    assert.equal(body.mode, 'scripted');
    assert.ok(body.reply.includes('owner-operated'));
  } finally {
    restoreFetch();
  }
});

await run();
