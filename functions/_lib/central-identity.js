/**
 * Stage 2 of the auth-unification migration (2026-09-15) -- resolves a
 * request's CENTRAL identity (from the shared umrt-portal-db `users`
 * table, already bound here as PORTAL_DB) alongside the forum's own
 * existing session, WITHOUT changing how the forum itself authenticates
 * anyone. Log-only for this stage: the resolved identity is attached as
 * request headers passed to downstream routes via _middleware.js, but
 * no route reads them yet -- this proves the correlation mechanism
 * works under real traffic before anything depends on it (Stage 3).
 *
 * Correlation is by email: the forum's own session only carries a local
 * forum user id (session.js's stateless HMAC payload has no email), so
 * this looks up that forum user's email from `DB`, then looks for a
 * matching row in the central `PORTAL_DB.users` by email. A forum user
 * who has never also signed into the portal will have no match --
 * normal and expected, not an error.
 *
 * KNOWN INCOMPLETENESS this stage: central `users.is_mod`/`banned` have
 * NOT been backfilled from forum data yet (that's Stage 4), so a
 * resolved central identity's role reflects the CENTRAL row only, not
 * necessarily this person's real forum mod/ban status. Do not use this
 * for any real authorization decision until Stage 4 is done and this
 * comment is removed -- the existing functions/_lib/authz.js
 * requireSession()/requireMod() (which check the forum's OWN `users`
 * row directly) remain the real, authoritative checks through Stage 3.
 */
import { readSession } from './session.js';

export async function resolveCentralIdentity(request, env) {
  if (!env.SESSION_SECRET || !env.DB) return null;
  const session = await readSession(request, env.SESSION_SECRET);
  if (!session) return null;

  try {
    const forumUser = await env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(session.uid).first();
    if (!forumUser || !forumUser.email) return null;
    if (!env.PORTAL_DB) return null;

    const centralUser = await env.PORTAL_DB.prepare(
      'SELECT id, is_mod, banned FROM users WHERE email = ?'
    ).bind(forumUser.email).first();
    if (!centralUser) return null;

    return {
      id: centralUser.id,
      role: centralUser.banned ? 'banned' : centralUser.is_mod ? 'mod' : 'member',
    };
  } catch {
    // Identity resolution is diagnostic-only this stage -- never let it
    // break or slow down a real request.
    return null;
  }
}
