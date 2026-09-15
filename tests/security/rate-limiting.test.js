/**
 * Regression test for the rate-limiting pass (2026-09-15): three
 * authenticated write routes had NO throttle at all -- functions/api/
 * upload.js, functions/api/forum/vote.js, and functions/api/forum/
 * threads/[id]/report.js. All three now call the existing, already-
 * proven checkRateLimit() (functions/_lib/rate-limit.js) -- no new
 * rate-limiting infrastructure was built, this just applies what
 * /api/book, /api/chat, /api/chat-lead, and /api/shop/quote already use.
 *
 * Each test drives the real handler past its limit and confirms the
 * (max+1)th request in the window gets 429 rate_limited, while the first
 * `max` requests succeed (or fail for an unrelated, expected reason --
 * e.g. upload's "missing_file", since these tests don't construct a real
 * image upload, only enough to get past auth and the rate-limit check).
 *
 * Run: node tests/security/rate-limiting.test.js
 */
import { test, run, assert } from '../lib/tiny-test.js';
import { makeMockD1, makeMockR2, makeRequest } from '../lib/mock-d1.js';
import { createSessionCookie } from '../../functions/_lib/session.js';
import { onRequestPost as uploadHandler } from '../../functions/api/upload.js';
import { onRequestPost as voteHandler } from '../../functions/api/forum/vote.js';
import { onRequestPost as reportHandler } from '../../functions/api/forum/threads/[id]/report.js';

const SECRET = 'test-session-secret';
const IP = '203.0.113.7'; // TEST-NET-3, RFC 5737 -- not a real address

async function cookieFor(uid) {
  const setCookie = await createSessionCookie({ uid, name: 'Test User' }, SECRET);
  return setCookie.split(';')[0];
}

function withIp(request) {
  request.headers.set('CF-Connecting-IP', IP);
  return request;
}

test('upload: 11th request within the window is rate_limited (max=10/10min)', async () => {
  const state = { users: [{ id: 'u1', banned: 0 }] };
  const env = { DB: makeMockD1(state), MEDIA: makeMockR2(), SESSION_SECRET: SECRET };
  const cookie = await cookieFor('u1');

  let lastStatus;
  for (let i = 1; i <= 11; i++) {
    const request = withIp(makeRequest({ cookie, formData: new Map() }));
    const res = await uploadHandler({ env, request });
    lastStatus = res.status;
    if (i <= 10) {
      // Each of the first 10 gets past the rate limiter; they then fail on
      // missing_file (400) since no real image is attached -- that's fine,
      // this test only cares whether the RATE LIMIT itself fired.
      assert.notEqual(res.status, 429, `request ${i} should not be rate-limited yet`);
    }
  }
  assert.equal(lastStatus, 429, 'the 11th request should be rate-limited');
});

test('vote: 31st request within the window is rate_limited (max=30/5min)', async () => {
  const state = { users: [{ id: 'u2', banned: 0 }], posts: [{ id: 'p1', hidden: 0 }] };
  const env = { DB: makeMockD1(state), SESSION_SECRET: SECRET };
  const cookie = await cookieFor('u2');

  let lastStatus, lastBody;
  for (let i = 1; i <= 31; i++) {
    const request = withIp(makeRequest({ cookie }));
    request.json = async () => ({ postId: 'p1' });
    const res = await voteHandler({ env, request });
    lastStatus = res.status;
    lastBody = await res.json();
  }
  assert.equal(lastStatus, 429);
  assert.equal(lastBody.error, 'rate_limited');
});

test('report: 11th request within the window is rate_limited (max=10/10min)', async () => {
  const state = {
    users: [{ id: 'u3', banned: 0 }],
    threads: [
      { id: 't1' }, { id: 't2' }, { id: 't3' }, { id: 't4' }, { id: 't5' },
      { id: 't6' }, { id: 't7' }, { id: 't8' }, { id: 't9' }, { id: 't10' }, { id: 't11' },
    ],
  };
  const env = { DB: makeMockD1(state), SESSION_SECRET: SECRET };
  const cookie = await cookieFor('u3');

  let lastStatus;
  for (let i = 1; i <= 11; i++) {
    // A different thread each time so the "one open report per thread"
    // dedupe logic doesn't mask the rate limiter's own behavior.
    const request = withIp(makeRequest({ cookie }));
    request.json = async () => ({ reason: 'spam' });
    const res = await reportHandler({ env, request, params: { id: `t${i}` } });
    lastStatus = res.status;
  }
  assert.equal(lastStatus, 429);
});

test('rate limits are per-IP, not global -- a different IP is unaffected', async () => {
  const state = { users: [{ id: 'u4', banned: 0 }], posts: [{ id: 'p1', hidden: 0 }] };
  const env = { DB: makeMockD1(state), SESSION_SECRET: SECRET };
  const cookie = await cookieFor('u4');

  // Exhaust the limit from one IP.
  for (let i = 1; i <= 30; i++) {
    const request = makeRequest({ cookie });
    request.headers.set('CF-Connecting-IP', '198.51.100.1');
    request.json = async () => ({ postId: 'p1' });
    await voteHandler({ env, request });
  }
  // A different IP should still get through.
  const freshRequest = makeRequest({ cookie });
  freshRequest.headers.set('CF-Connecting-IP', '198.51.100.2');
  freshRequest.json = async () => ({ postId: 'p1' });
  const res = await voteHandler({ env, request: freshRequest });
  assert.notEqual(res.status, 429);
});

await run();
