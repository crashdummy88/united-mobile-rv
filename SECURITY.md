# United Mobile RV — Security

_Generated 2026-09-15 from a live, read-only audit (mothership + portal + software repos, direct code read). No fixes applied yet — findings only, pending prioritization. Re-verify after any change to the files cited below._

## Summary

No P0 (critical/exploitable-today) findings across any of the three repos. Auth in both live apps (mothership, portal) derives identity exclusively from server-validated sessions — no route in either repo trusts a client-supplied user ID for authorization. SQL is 100% parameterized everywhere checked; no injection surface found. No secret values are committed anywhere. Real P1/P2 findings below.

## Authentication (both apps use Google OAuth; each has its own independent, self-rolled implementation — not shared)

**Mothership** (`functions/_lib/session.js`, `_lib/oauth.js`, `_lib/sso.js`):
- Google OAuth only (GitHub/Meta scaffolding explicitly removed from the code).
- Session: HMAC-SHA256-signed cookie (`umrt_session`), `HttpOnly; Secure; SameSite=Lax; Max-Age=2592000` (30 days).
- Cross-subdomain display cookie `umrt_sso` (`Domain=.unitedmobilerv.com`), signed with a **different** secret (`SSO_SHARED_SECRET`) than the session cookie — deliberately display-only, never grants posting/mod rights (`functions/api/me.js`).

**Portal** (`functions/_lib/auth.js`):
- Google + Facebook OAuth. Session: random 192-bit ID (`crypto.getRandomValues`), stored **unsigned** in D1 (`sessions.id`), cookie value is `HMAC-SHA256(rawId, SESSION_SECRET)` appended to the raw ID — so a D1 dump alone can't forge new tokens (still needs `SESSION_SECRET`). `HttpOnly; Secure; SameSite=Lax`, 14-day expiry.
- Logout deletes the D1 session row server-side (real invalidation, not just cookie-clearing).
- **P2 — dead, weaker duplicate auth stack**: `functions/_lib/session.ts`, `cookies.ts`, `crypto.ts`, `google.ts`, `types.ts` exist in the repo, imported by nothing (verified via grep), added in the initial commit and never wired in. Uses unsigned session cookies and a different `users` schema (`google_sub`/`facebook_id` columns) than the live/applied schema (`provider`/`provider_sub`). No runtime risk today — but a future "cleanup" that wires this in would silently downgrade session security and break against the real DB. **Recommend deleting these five files.**
- **P2 — stale duplicate schema file**: `schema/d1.sql` disagrees with the actually-applied `migrations/*.sql` on the `users` table shape. Would break OAuth login if anyone ever applied it thinking it was current. **Recommend deleting or reconciling.**

## Authorization

**Mothership**: mod status is `users.is_mod = 1`, admin routes accept either a mod session or `X-Sync-Secret` header match. `requireSession()`/`requireMod()` (`_lib/authz.js`) re-check `users.banned` on every call — correct, since a 30-day cookie must not keep working after a ban.

- **P1 — inconsistent ban re-check**: `functions/api/upload.js` and `functions/api/forum/vote.js` call `readSession()` directly instead of `requireSession()`, skipping the banned-user re-check every other write path performs. A banned member's still-valid cookie can keep uploading images to R2 and voting for up to 30 days. (`functions/api/forum/online.js` has the same pattern but is presence-only, low impact.) **Fix: swap `readSession()` → `requireSession()` in these two files.**

**Portal**: admin status is computed per-request from `isAdminUser(user, env)` — an email allow-list (`ADMIN_EMAILS` secret, falls back to a hardcoded default `mattc2896@gmail.com` if unset). No `role` column in D1; not persisted. Every `/api/admin/**` route independently checks session + admin status (copy-pasted pattern, but consistently applied — no gap found across `jobs`, `vendors` GET/PATCH routes).

## Confirmed P1 findings

1. **Stored XSS via unvalidated `website` field** (portal, `functions/api/vendors/index.js`): `POST /api/vendors` accepts `body.website` with no URL-scheme validation. Once an admin approves the vendor (`PATCH /api/admin/vendors/:id`), the raw value renders as a clickable `<a href>` on the public `/directory/` page (`esc()` HTML-escapes but doesn't block a `javascript:` scheme). **Fix: reject/strip any `website` value that doesn't start with `http://` or `https://`, either at insert or render time.**
2. **Inconsistent ban re-check** — see Authorization above (`upload.js`, `forum/vote.js`).
3. **Client-settable debug header leaks internal errors** (mothership, `functions/api/chat.js:135-136`): any unauthenticated caller sending `x-debug: 1` gets raw Workers-AI `err.message` in the response. Low severity (no secrets/PII in these errors, confirmed), but a real, trivially-exploitable info-disclosure path. **Fix: remove the client-controlled debug flag, or require an admin secret to enable it.**

## P2 findings

- **No CSRF token anywhere** (both apps) — relies solely on `SameSite=Lax` cookies + JSON-only POST bodies + no permissive CORS on cookie-authenticated routes. Reasonable baseline, not defense-in-depth.
- **No rate limiting** on several mothership forum write endpoints: `/api/forum/vote`, `/api/forum/save`, `/api/forum/report`, `/api/forum/solve`/`reopen` (session-required only). Portal has **no rate limiting anywhere** — OAuth start/callback, logout, `POST /api/vendors` are all unthrottled.
- **`UNIFIED_DB` D1 binding is declared but completely unused** (mothership `wrangler.toml` and portal `wrangler.toml` both bind it; no code references it in either repo). Dead surface, not a risk today, but worth knowing it exists before assuming it holds anything live.
- **Software repo's `SECURITY.md` is an unfilled GitHub template placeholder** — no real vulnerability-reporting process documented for that property.
- **Latent XSS pattern in software repo's `catalog.js`** (`shared/js/catalog.js`): unescaped `innerHTML` interpolation of catalog entries. Not currently exploitable (same-repo static JSON, no external write path) — becomes real if that catalog is ever fed from an external/lower-trust source.

## Confirmed clean (checked, not assumed)

- **SQL injection**: not found anywhere across all three repos. All D1 queries use `.prepare().bind()`; the few string-built SQL fragments interpolate only hardcoded/enum-constrained identifiers, never raw user input.
- **Client-supplied user ID trust**: never found. Every authorization check in both live apps derives identity solely from the server-validated session.
- **Secret exposure**: no secret values committed anywhere in any of the three repos (confirmed via targeted grep + `.gitignore` review). `wrangler.toml` files contain only D1 `database_id`s (not secrets) and binding names.
- **Webhook signature verification**: N/A — no webhook receivers exist in the mothership or portal (Square integration is outbound-only).
- **CORS**: no wildcard CORS on any cookie-authenticated route. Exactly two mothership endpoints (`/api/status`, `/api/forum-stats`) use `Access-Control-Allow-Origin: *`, and both are intentionally public, read-only, non-sensitive.
- **Error leakage**: no route returns raw stack traces; portal's catch blocks return generic error codes uniformly. (Exception: the mothership `x-debug` header above.)

## Square integration — safe-by-default, confirmed

`functions/_lib/square.js` (mothership) no-ops entirely unless both `SQUARE_ACCESS_TOKEN` and `SQUARE_LOCATION_ID` are set. Every write is draft-only (creates an unpublished Order/Invoice; never calls Square's publish endpoint — Matt reviews and publishes manually). Inventory sync reads from Square and writes to D1 only, never back to Square's catalog.

## Secret inventory (names only, per the user's own rule — never values)

`SESSION_SECRET`, `SSO_SHARED_SECRET` (mothership), `SESSION_SECRET` (portal, separate value/repo), `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (both repos, separate OAuth clients), `FACEBOOK_APP_ID`/`FACEBOOK_APP_SECRET` (portal), `TURNSTILE_SECRET_KEY`, `PUBLIC_WEB3FORMS_KEY`/`WEB3FORMS_ACCESS_KEY`, `SYNC_ADMIN_SECRET`, `SQUARE_ACCESS_TOKEN`/`SQUARE_LOCATION_ID`/`SQUARE_ENVIRONMENT`, `CF_ANALYTICS_TOKEN`/`CF_ZONE_ID`, `CONTENT_BOT_KEY`, `ADMIN_EMAILS` (portal).
