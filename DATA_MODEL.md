# United Mobile RV — Data Model

_Generated 2026-09-15 from a live, read-only audit. Covers all D1 databases reachable from the mothership and portal repos, plus every place business-critical values (pricing, service names) are duplicated outside those databases._

## D1 databases

| Binding | database_name | Owner repo | Status |
|---|---|---|---|
| `DB` | `umrt_forum` | mothership | Live, 38 files read/write it |
| `PORTAL_DB` | `umrt-portal-db` | portal (schema owned there) | Live — mothership writes `jobs`, reads `users` for a "Verified Customer" badge and analytics counts |
| `UNIFIED_DB` | `umrt-unified-db` | neither (bound in both repos' `wrangler.toml`) | **Unused** — no code in either repo references it; the toml comment describes an intended future `wp_posts`/`wp_users`/`square_transactions`/`sync_log` schema, but no sync Worker exists to populate it |

## `umrt_forum` (binding `DB`) — full table inventory

| Table | Key columns | Notes |
|---|---|---|
| `users` | id, provider, provider_id, email, display_name, avatar_url, banned, is_mod, tou_accepted_at/tou_version, credentials | `UNIQUE(provider, provider_id)` |
| `threads` | id, title, body, category, author_id, pinned, hidden, ai_flagged/ai_reason, image_keys, solved_at/solved_by, reopened_at/reopened_by, accepted_reply_id, locked, nudged_at | |
| `posts` | id, thread_id, author_id, body, hidden, ai_flagged/ai_reason, image_keys | |
| `moderation_log` | id, post_id, thread_id, author_id, action, reason | |
| `reports`, `saves`, `notifications` | — | |
| `post_votes`, `thread_views`, `online_sessions` | — | |
| `site_status` | singleton (id=1): active_corridor, case_by_case, current_location, status_note, hours, updated_by | |
| `pricing` | key (PK), label, amount, note, sort_order | Seeded: `trip_fee` $75, `mileage` $1.50/mi, `labor` ~$150/hr, `diagnostic` $175, `winterize` $175, `trip_prep` $225 |
| `media_usage` | singleton (id=1): total_bytes | Enforces a 9.5GB soft cap against R2's 10GB free tier |
| `bot_sweep_state` | singleton | Throttles the content-bot nudge sweep |
| `suppliers`, `products`, `product_components` | — | `products` gained `map_price`/`price_status`/`last_synced_at`, `image_url`/`image_source`, `square_catalog_object_id`/`square_stock_synced_at`, `square_item_url` across later migrations |
| `quote_requests`, `quote_request_items` | — | `quote_requests` gained `square_order_id`/`square_invoice_id`/`square_invoice_url`/`square_invoice_status` |
| `rate_limit_log` | id, ip, endpoint, created_at | |
| `services` | id, title, description, category, price, price_type, price_note, display_order, active | Added 2026-09-15 (migration 016). **By its own migration comment, deliberately never synced with `pricing`** — see Data Consistency below |

## `umrt-portal-db` (binding `PORTAL_DB`) — schema owned by the `umrt-portal` repo

Inferred here only from what the mothership's `functions/api/book.js` writes and `functions/forum/member/[id].js`/`_lib/analytics.js` read — the portal repo's own migrations are the real source of truth.

| Table | Key columns |
|---|---|
| `users` | id, email, name, picture, provider, provider_sub |
| `sessions` | id (unsigned raw session ID), user_id, expires_at |
| `jobs` | id, full_name, phone, email, rv_year/rv_make/rv_model, vin, issue, street/city/state/zip, preferred_date/preferred_time, status (`requested\|scheduled\|in_progress\|completed\|cancelled`), source, notes, final_amount_cents, payment_method (`square\|cash\|check\|other`), paid_at, admin_notes, square_order_id/square_invoice_id/square_invoice_url/square_invoice_status |
| `vendors` | id, user_id, business_name, category (`tech\|vendor`), trade_focus, description, contact_email, contact_phone, website, service_area, status (`pending\|approved\|rejected`), subscription_status (`pending_payment\|active\|expired`), subscription_expires_at, admin_notes |

**PII inventory**: `users.email/name/picture`, `jobs.full_name/phone/email/street/city/state/zip/vin`, `vendors.contact_email/contact_phone`. No live Square charge flow exists yet for either `jobs.final_amount_cents` or `vendors.subscription_status` — both are flipped by hand by an admin today.

## Data authority — the actual "where does each piece of data live" answer

| Data | Should live | Actually lives | Verdict |
|---|---|---|---|
| Business name | WordPress/config | WordPress **+** hardcoded in 161 mothership static HTML files **+** portal (5 files) **+** software (dozens of files) | **Violated** — duplicated everywhere |
| Service descriptions | WordPress | WordPress + `DB.services` (mothership, added 2026-09-15) + software catalog | **Violated** |
| SEO/location content | WordPress | WordPress only (178 pages) — mothership's own 292-page sitemap mirrors the same content structure but is currently noindex except `/forum/`, `/guide/` | Consistent in principle, duplicated in practice (two full copies of the same city/guide content exist, one live/indexed, one not) |
| **Pricing** | One centralized config/API | **`DB.pricing`** (mothership) + **`DB.services`** (mothership, separate table, never synced with `pricing` per its own migration comment) + hardcoded in `functions/api/chat.js` (twice) + `functions/shop/index.js` + 161 static HTML files + portal's `book/index.html` + `directory/index.html`+`apply.html` ($40/yr, duplicated even within the same file pair) | **Violated — this is the "two truths" problem named explicitly** |
| Booking | Cloudflare | Cloudflare (`POST /api/book`, mothership) | Consistent |
| Customers | Cloudflare/D1 | `PORTAL_DB.jobs`/`users` | Consistent |
| Forum users/posts | D1 | `DB` (`umrt_forum`) | Consistent |
| Authentication | Cloudflare | Cloudflare — but mothership and portal each run their **own independent** Google OAuth + session implementation, not shared | Consistent in principle (both are Cloudflare-side), but not unified — a user must log in separately to the forum and the portal |
| Application code | GitHub | GitHub (3 separate repos: mothership, portal, software, plus 7 more satellite repos) | Consistent |
| Secrets | Cloudflare secrets | Confirmed — no secret values committed anywhere across all three audited repos | Consistent |
| Deployment | Cloudflare | Cloudflare Pages git-integration / manual `wrangler pages deploy`, plus 2 standalone Workers on cron | Consistent |

## The $150 vs $175 "diagnostic" discrepancy — resolved

This is real, but not a simple typo/contradiction of the same number. It's a **naming collision between two different line items that both get called "diagnostic"**, both internally correct on their own terms:

- **`pricing/index.html:107`** and **`pricing/price-list/index.html:66`** (WordPress): *"Electrical diagnostics — from $150"* — a **starting price** for the variable "electrical diagnostics" **repair labor category**.
- **`pricing/price-list/index.html:59`**, ten lines above the above on the **same page** (WordPress): *"Diagnostic ... $175 · applied toward repair if you authorize the fix"* — the flat **upfront diagnostic-visit fee**, matching `DB.pricing.diagnostic = $175` and `DB.services` `diagnostic-fee` row exactly.

Every other `$150` sighting across all three repos (160+ mothership static files checked) is unambiguously the **hourly labor rate** ("~$150/hr"), consistently paired with "$175 diagnostic" right next to it — so the labor-rate number itself isn't the problem. The actual bug is that WordPress's own `/pricing/price-list/` page presents "Diagnostic $175" and "Electrical diagnostics — from $150" close together under near-identical wording, which reads as a contradiction to a customer even though it isn't one by definition.

**Recommended fix** (content-only, on WordPress, not touched by this audit): rename one of the two line items so they're unambiguous — e.g. "Diagnostic Visit — $175" vs. "Electrical Repair Labor — from $150/hr" — and keep both anchored to the same `DB.pricing`/`DB.services` values so a future rate change doesn't need a manual hunt across pages.

## Migration hygiene

Mothership migrations (`db/migrations/002` through `016`) are additive-only throughout — no `DROP TABLE`, no destructive rewrites found in any migration file. `services` (016) was deliberately kept **separate** from `pricing` rather than merged, per its own header comment, because the two tables serve different display models (flat/starting/quote price types vs. a flat label+amount). This was a reasoned choice, not an oversight — but it's the direct mechanical cause of the duplication problem above, and should be the first thing addressed once a single pricing-authority design is agreed.

Portal migrations (`0001` through `0005`) are also additive-only. The one migration-hygiene risk in the whole audit is `schema/d1.sql` (portal) — a **stale, hand-written duplicate** of the schema that disagrees with what's actually applied (see `SECURITY.md`).
