/**
 * Regression tests for auth-unification Stage 3 (2026-09-15):
 * functions/_lib/session.js's dual-format readSession(), the new
 * central-session lifecycle (create/read/destroy), functions/api/logout.js's
 * three-cookie clear, and functions/api/auth/[provider]/callback.js's
 * upsertCentralUser().
 *
 * The core promise under test: an EXISTING forum user's pre-Stage-3
 * (legacy, stateless-HMAC) cookie must keep authenticating exactly as
 * before -- nobody gets silently signed out by this deploy -- while a
 * NEW central, DB-backed session (Domain=.unitedmobilerv.com) works
 * end-to-end and fails closed on any tampering or staleness.
 *
 * Run: node tests/security/session-stage3.test.js
 */
import { test, run, assert } from '../lib/tiny-test.js';
import {
  createSessionCookie,
  createCentralSessionCookie,
  readSession,
  clearSessionCookie,
  clearCentralSessionCookie,
  destroyCentralSessionIfAny,
} from '../../functions/_lib/session.js';
import { onRequestPost as logout } from '../../functions/api/logout.js';
import { upsertCentralUser } from '../../functions/api/auth/[provider]/callback.js';

const SECRET = 'test-session-secret';
// Deliberately a DIFFERENT value from SECRET above -- production sets these
// to two distinct secrets (this app's own SESSION_SECRET for the legacy
// format vs. the cross-app-shared CENTRAL_SESSION_SECRET for Stage 3
// central sessions), and a test that reused one value for both would miss
// a real prod bug where they get mixed up.
const CENTRAL_SECRET = 'test-central-session-secret';

// --- Mock D1 helpers ------------------------------------------------------

function makePortalDb({ sessions = [], users = [] } = {}) {
  return {
    _sessions: sessions,
    _users: users,
    prepare(sql) {
      let args = [];
      const self = this;
      return {
        bind(...a) { args = a; return this; },
        async run() {
          if (/INSERT INTO sessions/.test(sql)) {
            const [id, user_id, expires_at] = args;
            self._sessions.push({ id, user_id, expires_at });
          } else if (/DELETE FROM sessions WHERE id = \?/.test(sql)) {
            self._sessions = self._sessions.filter((s) => s.id !== args[0]);
          } else if (/INSERT INTO users/.test(sql)) {
            const [id, email, name, picture, provider, provider_sub] = args;
            self._users.push({ id, email, name, picture, provider, provider_sub });
          } else if (/UPDATE users SET name/.test(sql)) {
            const [name, picture, id] = args;
            const u = self._users.find((u) => u.id === id);
            if (u) { u.name = name; u.picture = picture; }
          } else {
            throw new Error(`mock PORTAL_DB.run: unhandled query: ${sql}`);
          }
          return { success: true };
        },
        async first() {
          if (/SELECT user_id, expires_at FROM sessions WHERE id = \?/.test(sql)) {
            const row = self._sessions.find((s) => s.id === args[0]);
            return row ? { user_id: row.user_id, expires_at: row.expires_at } : undefined;
          }
          if (/SELECT id FROM users WHERE provider = \? AND provider_sub = \?/.test(sql)) {
            const u = self._users.find((u) => u.provider === args[0] && u.provider_sub === args[1]);
            return u ? { id: u.id } : undefined;
          }
          if (/SELECT id FROM users WHERE email = \?/.test(sql)) {
            const u = self._users.find((u) => u.email === args[0]);
            return u ? { id: u.id } : undefined;
          }
          throw new Error(`mock PORTAL_DB.first: unhandled query: ${sql}`);
        },
      };
    },
  };
}

function makeForumDb({ users = [] } = {}) {
  return {
    _users: users,
    prepare(sql) {
      let args = [];
      const self = this;
      return {
        bind(...a) { args = a; return this; },
        async first() {
          if (/SELECT id, display_name, avatar_url FROM users WHERE central_user_id = \?/.test(sql)) {
            const u = self._users.find((u) => u.central_user_id === args[0]);
            return u ? { id: u.id, display_name: u.display_name, avatar_url: u.avatar_url } : undefined;
          }
          throw new Error(`mock DB.first: unhandled query: ${sql}`);
        },
        async run() {
          if (/UPDATE users SET central_user_id = \? WHERE id = \?/.test(sql)) {
            const [central_user_id, id] = args;
            const u = self._users.find((u) => u.id === id);
            if (u) u.central_user_id = central_user_id;
            else self._users.push({ id, central_user_id });
          } else {
            throw new Error(`mock DB.run: unhandled query: ${sql}`);
          }
          return { success: true };
        },
      };
    },
  };
}

function makeRequest(cookieValue) {
  const headers = new Headers();
  if (cookieValue) headers.set('Cookie', `umrt_session=${cookieValue}`);
  return { headers };
}

// --- readSession(): legacy format still works ------------------------------

test('readSession: pre-Stage-3 legacy cookie still authenticates (backward compatibility promise)', async () => {
  const legacyCookie = await createSessionCookie({ uid: 'forum-user-1', name: 'Legacy User' }, SECRET);
  const cookieValue = legacyCookie.split('umrt_session=')[1].split(';')[0];
  const env = { SESSION_SECRET: SECRET, DB: makeForumDb(), PORTAL_DB: makePortalDb() };
  const session = await readSession(makeRequest(cookieValue), env);
  assert.equal(session.uid, 'forum-user-1');
  assert.equal(session.name, 'Legacy User');
});

test('readSession: legacy cookie with a wrong secret fails closed', async () => {
  const legacyCookie = await createSessionCookie({ uid: 'forum-user-1' }, 'a-different-secret');
  const cookieValue = legacyCookie.split('umrt_session=')[1].split(';')[0];
  const env = { SESSION_SECRET: SECRET, DB: makeForumDb(), PORTAL_DB: makePortalDb() };
  const session = await readSession(makeRequest(cookieValue), env);
  assert.equal(session, null);
});

test('readSession: no cookie at all -> null', async () => {
  const env = { SESSION_SECRET: SECRET, DB: makeForumDb(), PORTAL_DB: makePortalDb() };
  const session = await readSession(makeRequest(null), env);
  assert.equal(session, null);
});

// --- readSession(): new central format works --------------------------------

test('readSession: new central (Stage 3) cookie authenticates via PORTAL_DB.sessions + forum users.central_user_id', async () => {
  const portalDb = makePortalDb();
  const forumDb = makeForumDb({ users: [{ id: 'forum-user-2', central_user_id: 'central-7', display_name: 'Central User', avatar_url: 'a.png' }] });
  const env = { SESSION_SECRET: SECRET, CENTRAL_SESSION_SECRET: CENTRAL_SECRET, DB: forumDb, PORTAL_DB: portalDb };

  const cookie = await createCentralSessionCookie('central-7', env);
  assert.match(cookie, /Domain=\.unitedmobilerv\.com/, 'central session cookie must be scoped to the whole domain tree');
  const cookieValue = cookie.split('umrt_session=')[1].split(';')[0];

  const session = await readSession(makeRequest(cookieValue), env);
  assert.deepEqual(session, { uid: 'forum-user-2', name: 'Central User', avatar: 'a.png' });
});

test('readSession: central session row exists but no linked forum user -> null (fails closed rather than guessing)', async () => {
  const portalDb = makePortalDb();
  const forumDb = makeForumDb({ users: [] }); // no forum user links to this central id
  const env = { SESSION_SECRET: SECRET, CENTRAL_SESSION_SECRET: CENTRAL_SECRET, DB: forumDb, PORTAL_DB: portalDb };
  const cookie = await createCentralSessionCookie('central-orphan', env);
  const cookieValue = cookie.split('umrt_session=')[1].split(';')[0];
  const session = await readSession(makeRequest(cookieValue), env);
  assert.equal(session, null);
});

test('readSession: tampered central session signature fails closed', async () => {
  const portalDb = makePortalDb();
  const forumDb = makeForumDb({ users: [{ id: 'f', central_user_id: 'c', display_name: 'X', avatar_url: null }] });
  const env = { SESSION_SECRET: SECRET, CENTRAL_SESSION_SECRET: CENTRAL_SECRET, DB: forumDb, PORTAL_DB: portalDb };
  const cookie = await createCentralSessionCookie('c', env);
  const [rawId] = cookie.split('umrt_session=')[1].split(';')[0].split('.');
  const tampered = `${rawId}.tamperedSignatureXXXXXXXXXXXXXXXXXXX`;
  const session = await readSession(makeRequest(tampered), env);
  assert.equal(session, null);
});

test('readSession: a central session cookie only verifies against the SAME CENTRAL_SESSION_SECRET it was signed with (models a forum/portal secret mismatch)', async () => {
  const portalDb = makePortalDb();
  const forumDb = makeForumDb({ users: [{ id: 'f', central_user_id: 'c', display_name: 'X', avatar_url: null }] });
  const issuingEnv = { CENTRAL_SESSION_SECRET: 'shared-secret-v1', PORTAL_DB: portalDb };
  const cookie = await createCentralSessionCookie('c', issuingEnv);
  const cookieValue = cookie.split('umrt_session=')[1].split(';')[0];

  const mismatchedEnv = { SESSION_SECRET: SECRET, CENTRAL_SESSION_SECRET: 'a-DIFFERENT-secret', DB: forumDb, PORTAL_DB: portalDb };
  const session = await readSession(makeRequest(cookieValue), mismatchedEnv);
  assert.equal(session, null, 'must fail closed rather than trust a session signed with a different secret');

  const matchedEnv = { SESSION_SECRET: SECRET, CENTRAL_SESSION_SECRET: 'shared-secret-v1', DB: forumDb, PORTAL_DB: portalDb };
  const okSession = await readSession(makeRequest(cookieValue), matchedEnv);
  assert.equal(okSession.uid, 'f', 'sanity check: the same secret does successfully verify it');
});

test('readSession: expired central session fails closed and deletes the row', async () => {
  const portalDb = makePortalDb();
  const forumDb = makeForumDb({ users: [{ id: 'f', central_user_id: 'c', display_name: 'X', avatar_url: null }] });
  const env = { SESSION_SECRET: SECRET, CENTRAL_SESSION_SECRET: CENTRAL_SECRET, DB: forumDb, PORTAL_DB: portalDb };
  const cookie = await createCentralSessionCookie('c', env);
  const cookieValue = cookie.split('umrt_session=')[1].split(';')[0];
  // Backdate the row's expiry.
  portalDb._sessions[0].expires_at = new Date(Date.now() - 1000).toISOString();

  const session = await readSession(makeRequest(cookieValue), env);
  assert.equal(session, null);
  assert.equal(portalDb._sessions.length, 0, 'expired session row should be cleaned up');
});

test('readSession: malformed central-shaped token (non-UUID id) routes to legacy path and fails closed there', async () => {
  const env = { SESSION_SECRET: SECRET, DB: makeForumDb(), PORTAL_DB: makePortalDb() };
  const session = await readSession(makeRequest('not-a-uuid.somesig'), env);
  assert.equal(session, null);
});

test('readSession: unconfigured PORTAL_DB/SESSION_SECRET on the central path does not throw, just skips to legacy', async () => {
  const legacyCookie = await createSessionCookie({ uid: 'still-works' }, SECRET);
  const cookieValue = legacyCookie.split('umrt_session=')[1].split(';')[0];
  const env = { SESSION_SECRET: SECRET, DB: makeForumDb(), PORTAL_DB: undefined };
  const session = await readSession(makeRequest(cookieValue), env);
  assert.equal(session.uid, 'still-works');
});

// --- Cookie clearing: Domain attributes must match what was actually set ---

test('clearSessionCookie / clearCentralSessionCookie: Domain attributes exactly mirror their create-side counterparts', async () => {
  const legacy = await createSessionCookie({ uid: 'x' }, SECRET);
  const central = await createCentralSessionCookie('c', { SESSION_SECRET: SECRET, CENTRAL_SESSION_SECRET: CENTRAL_SECRET, PORTAL_DB: makePortalDb() });
  assert.equal(/Domain=/.test(legacy), false, 'legacy cookie is host-only, no Domain attribute');
  assert.equal(/Domain=/.test(clearSessionCookie()), false, 'legacy clear must also be host-only to actually match and clear it');
  assert.match(central, /Domain=\.unitedmobilerv\.com/);
  assert.match(clearCentralSessionCookie(), /Domain=\.unitedmobilerv\.com/);
});

// --- destroyCentralSessionIfAny -------------------------------------------

test('destroyCentralSessionIfAny: deletes the row for a new-format cookie', async () => {
  const portalDb = makePortalDb();
  const env = { SESSION_SECRET: SECRET, CENTRAL_SESSION_SECRET: CENTRAL_SECRET, PORTAL_DB: portalDb };
  const cookie = await createCentralSessionCookie('c', env);
  const cookieValue = cookie.split('umrt_session=')[1].split(';')[0];
  assert.equal(portalDb._sessions.length, 1);
  await destroyCentralSessionIfAny(makeRequest(cookieValue), env);
  assert.equal(portalDb._sessions.length, 0);
});

test('destroyCentralSessionIfAny: no-ops harmlessly for a legacy cookie (nothing to delete, never throws)', async () => {
  const legacyCookie = await createSessionCookie({ uid: 'x' }, SECRET);
  const cookieValue = legacyCookie.split('umrt_session=')[1].split(';')[0];
  const portalDb = makePortalDb();
  const env = { SESSION_SECRET: SECRET, CENTRAL_SESSION_SECRET: CENTRAL_SECRET, PORTAL_DB: portalDb };
  await destroyCentralSessionIfAny(makeRequest(cookieValue), env);
  assert.equal(portalDb._sessions.length, 0);
});

// --- logout.js: all three cookie families cleared, central row destroyed ---

test('logout: clears legacy, central, and SSO cookies (three Set-Cookie headers) and deletes the central session row', async () => {
  const portalDb = makePortalDb();
  const env = { SESSION_SECRET: SECRET, CENTRAL_SESSION_SECRET: CENTRAL_SECRET, PORTAL_DB: portalDb };
  const cookie = await createCentralSessionCookie('c', env);
  const cookieValue = cookie.split('umrt_session=')[1].split(';')[0];
  assert.equal(portalDb._sessions.length, 1);

  const request = makeRequest(cookieValue);
  const res = await logout({ request, env });
  assert.equal(res.status, 200);

  const setCookies = [...res.headers.entries()].filter(([k]) => k.toLowerCase() === 'set-cookie').map(([, v]) => v);
  // Headers combines same-name entries with ", " when iterated as .entries() in
  // some runtimes -- so also check via getSetCookie() when available, falling
  // back to a substring check that tolerates either representation.
  const combined = res.headers.getSetCookie ? res.headers.getSetCookie() : setCookies;
  const joined = combined.join(' || ');
  assert.match(joined, /umrt_session=;.*Max-Age=0/, 'legacy session cookie must be cleared');
  assert.match(joined, /umrt_session=;.*Domain=\.unitedmobilerv\.com/, 'central session cookie must be cleared');
  assert.match(joined, /umrt_sso=;.*Domain=\.unitedmobilerv\.com/, 'SSO cookie must be cleared too');

  assert.equal(portalDb._sessions.length, 0, 'logout must delete the central session row, not just clear the cookie');
});

test('logout: still succeeds (and does not throw) for a visitor with no session cookie at all', async () => {
  const env = { SESSION_SECRET: SECRET, PORTAL_DB: makePortalDb() };
  const res = await logout({ request: makeRequest(null), env });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
});

// --- upsertCentralUser (OAuth callback, Stage 3) ---------------------------

test('upsertCentralUser: creates a new central user and links central_user_id back onto the forum user row', async () => {
  const portalDb = makePortalDb();
  const forumDb = makeForumDb({ users: [{ id: 'forum-9' }] });
  const mapped = { provider_id: 'google-sub-123', email: 'new@example.com', display_name: 'New Guy', avatar_url: 'n.png' };

  const centralId = await upsertCentralUser(portalDb, forumDb, 'forum-9', 'google', mapped);

  assert.equal(portalDb._users.length, 1);
  assert.equal(portalDb._users[0].provider_sub, 'google-sub-123');
  assert.equal(forumDb._users.find((u) => u.id === 'forum-9').central_user_id, centralId);
});

test('upsertCentralUser: an existing (provider, provider_sub) match is reused, not duplicated', async () => {
  const portalDb = makePortalDb({ users: [{ id: 'central-existing', provider: 'google', provider_sub: 'google-sub-123', email: 'old@example.com' }] });
  const forumDb = makeForumDb({ users: [{ id: 'forum-10' }] });
  const mapped = { provider_id: 'google-sub-123', email: 'old@example.com', display_name: 'Updated Name', avatar_url: 'u.png' };

  const centralId = await upsertCentralUser(portalDb, forumDb, 'forum-10', 'google', mapped);

  assert.equal(centralId, 'central-existing');
  assert.equal(portalDb._users.length, 1, 'must not create a duplicate central row for an existing provider match');
  assert.equal(portalDb._users[0].name, 'Updated Name', 'profile fields should refresh on re-login');
});

test('upsertCentralUser: falls back to matching by email when no provider match exists (e.g. a portal-only user signing into the forum for the first time)', async () => {
  const portalDb = makePortalDb({ users: [{ id: 'central-portal-user', provider: null, provider_sub: null, email: 'shared@example.com' }] });
  const forumDb = makeForumDb({ users: [{ id: 'forum-11' }] });
  const mapped = { provider_id: 'google-sub-999', email: 'shared@example.com', display_name: 'Shared Person', avatar_url: null };

  const centralId = await upsertCentralUser(portalDb, forumDb, 'forum-11', 'google', mapped);

  assert.equal(centralId, 'central-portal-user');
  assert.equal(portalDb._users.length, 1, 'must correlate to the existing portal user by email rather than creating a second one');
});

await run();
