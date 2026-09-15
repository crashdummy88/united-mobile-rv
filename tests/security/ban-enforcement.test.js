/**
 * Regression test for the P1 fix (2026-09-15): functions/api/upload.js and
 * functions/api/forum/vote.js used readSession() directly instead of
 * requireSession() (functions/_lib/authz.js), skipping the users.banned
 * re-check every other authenticated write route performs. A banned
 * member's still-valid 30-day session cookie could keep uploading images
 * and voting.
 *
 * This exercises the REAL handler exports and the REAL session-signing
 * code (functions/_lib/session.js, functions/_lib/authz.js) -- not a
 * reimplementation of the logic -- with a mock D1 in place of the network
 * call. Run: node tests/security/ban-enforcement.test.js
 */
import { test, run, assert } from '../lib/tiny-test.js';
import { makeMockD1, makeMockR2, makeRequest } from '../lib/mock-d1.js';
import { createSessionCookie } from '../../functions/_lib/session.js';
import { onRequestPost as uploadHandler } from '../../functions/api/upload.js';
import { onRequestPost as voteHandler } from '../../functions/api/forum/vote.js';

const SECRET = 'test-session-secret';

async function cookieFor(uid) {
  const setCookie = await createSessionCookie({ uid, name: 'Test User' }, SECRET);
  // createSessionCookie returns a full Set-Cookie header; pull just "name=value"
  return setCookie.split(';')[0];
}

test('upload: unauthenticated (no cookie) -> 401 auth_required', async () => {
  const state = { users: [] };
  const env = { DB: makeMockD1(state), MEDIA: makeMockR2(), SESSION_SECRET: SECRET };
  const request = makeRequest({});
  const res = await uploadHandler({ env, request });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error, 'auth_required');
});

test('upload: active, non-banned user -> passes auth (reaches file validation)', async () => {
  const state = { users: [{ id: 'u1', banned: 0 }] };
  const env = { DB: makeMockD1(state), MEDIA: makeMockR2(), SESSION_SECRET: SECRET };
  const request = makeRequest({ cookie: await cookieFor('u1'), formData: new Map() }); // no "image" field
  const res = await uploadHandler({ env, request });
  const body = await res.json();
  // Auth passed (not 401); fails later for missing_file, which is the point --
  // we only assert this got PAST the auth check, not that upload fully succeeds.
  assert.notEqual(res.status, 401);
  assert.equal(body.error, 'missing_file');
});

test('upload: banned user with an otherwise-valid session -> 401 auth_required (THE FIX)', async () => {
  const state = { users: [{ id: 'u2', banned: 1 }] };
  const env = { DB: makeMockD1(state), MEDIA: makeMockR2(), SESSION_SECRET: SECRET };
  const request = makeRequest({ cookie: await cookieFor('u2'), formData: new Map() });
  const res = await uploadHandler({ env, request });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error, 'auth_required');
});

test('upload: session for a user no longer in the DB -> 401 (banned-check query returns nothing)', async () => {
  const state = { users: [] }; // user row deleted/never existed
  const env = { DB: makeMockD1(state), MEDIA: makeMockR2(), SESSION_SECRET: SECRET };
  const request = makeRequest({ cookie: await cookieFor('ghost'), formData: new Map() });
  const res = await uploadHandler({ env, request });
  assert.equal(res.status, 401);
});

test('vote: unauthenticated (no cookie) -> 401 auth_required', async () => {
  const state = { users: [], posts: [{ id: 'p1', hidden: 0 }] };
  const env = { DB: makeMockD1(state) };
  const request = makeRequest({});
  request.json = async () => ({ postId: 'p1' });
  const res = await voteHandler({ env, request });
  assert.equal(res.status, 401);
});

test('vote: active, non-banned user -> vote succeeds', async () => {
  const state = { users: [{ id: 'u1', banned: 0 }], posts: [{ id: 'p1', hidden: 0 }] };
  const env = { DB: makeMockD1(state), SESSION_SECRET: SECRET };
  const request = makeRequest({ cookie: await cookieFor('u1') });
  request.json = async () => ({ postId: 'p1' });
  const res = await voteHandler({ env, request });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.voted, true);
});

test('vote: banned user with an otherwise-valid session -> 401 auth_required (THE FIX)', async () => {
  const state = { users: [{ id: 'u2', banned: 1 }], posts: [{ id: 'p1', hidden: 0 }] };
  const env = { DB: makeMockD1(state), SESSION_SECRET: SECRET };
  const request = makeRequest({ cookie: await cookieFor('u2') });
  request.json = async () => ({ postId: 'p1' });
  const res = await voteHandler({ env, request });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.success, false);
  assert.equal(body.error, 'auth_required');
});

test('vote: mod/admin user is not banned -> behaves like any other active user (no special bypass needed here)', async () => {
  const state = { users: [{ id: 'mod1', banned: 0, is_mod: 1 }], posts: [{ id: 'p1', hidden: 0 }] };
  const env = { DB: makeMockD1(state), SESSION_SECRET: SECRET };
  const request = makeRequest({ cookie: await cookieFor('mod1') });
  request.json = async () => ({ postId: 'p1' });
  const res = await voteHandler({ env, request });
  assert.equal(res.status, 200);
});

await run();
