# United Mobile RV — Architecture

_Generated 2026-09-15 from a live, read-only audit of the actual deployed system (three repos, direct code read — not the plan, not memory). Re-verify before trusting after further changes._

## System map

```
Google / Facebook / Search
        │
        ▼
unitedmobilerv.com  ─────────────────  WordPress.com (Atomic, "Hever" classic theme)
        │                              Marketing/SEO authority: 178 indexed pages
        │                              (city pages, guides, pricing, service copy)
        │  "Book / Call / Portal / Community" hand-off links
        ▼
Cloudflare DNS + Edge (unitedmobilerv.com zone, nameservers hasslo/marjory.ns.cloudflare.com)
        │
        ├── united-mobile-rv.pages.dev ──── "Mothership" (this repo)
        │         ├── shop.unitedmobilerv.com   (locked to /shop/, /book-service/, assets)
        │         └── forum.unitedmobilerv.com  (NOT locked — see SECURITY.md P2)
        │
        ├── portal.unitedmobilerv.com ────  umrt-portal (separate repo, separate D1)
        ├── docs.unitedmobilerv.com
        ├── software.unitedmobilerv.com ──  umrt-software (static, no backend)
        ├── status.unitedmobilerv.com
        └── umrt-pay / umrt-go / umrt-quote / umrt-areas (pages.dev only, no custom domain)
```

Full live property inventory (indexing status, sitemap coverage, cross-link health) is maintained separately as a visual artifact — see the "UMRT Property Map" published 2026-09-15. Machine-readable cross-property sitemap: `/sitemap-network.xml`.

## Repo → deployment map

| Repo | Deploys to | Type | Build |
|---|---|---|---|
| `united-mobile-rv` (this repo) | `united-mobile-rv.pages.dev` + `shop.`/`forum.` custom domains | Cloudflare Pages Functions, plain JS | none — zero npm deps, no `package.json` |
| `umrt-portal` | `portal.unitedmobilerv.com` (custom domain on HOLD per repo docs — still pages.dev only) | Cloudflare Pages Functions, plain JS | none |
| `umrt-software` | `software.unitedmobilerv.com` | Static HTML/CSS/JS only — no backend | none |
| (WordPress) | `unitedmobilerv.com` | WordPress.com Atomic, "Hever" classic child theme | n/a — no Site Editor templates/global-styles reachable via API (confirmed) |

Two **standalone Cloudflare Workers** exist outside the Pages projects (their own `wrangler.toml`, own deploy):
- `workers/square-inventory-cron` — cron `0 */6 * * *`, POSTs to the mothership's `/api/admin/sync-square-inventory` with `X-Sync-Secret`.
- `workers/content-bot` (`umrt-forum-content-bot`) — cron `0 15 * * 2,5` (Tue/Fri). **Pin first-reply only**: may post one AI-labeled reply on each `tech-*` UMRV Tech pin if that pin has no bot reply yet. Does **not** create threads. Seed generator is frozen (`functions/_lib/forum-growth.js` + migration 021). Same `AI`+`DB` bindings into `umrt_forum`.

## Mothership route inventory

All routes are file-routed under `functions/` per Cloudflare Pages Functions convention (`[x]` = param segment, `[[x]]` = catch-all).

**Pages (server-rendered)**: `/`, `/feed.xml`, `/sitemap.xml`, `/sitemap-network.xml`, `/r2/<key>` (public read-only proxy into R2, `forum/`-prefixed keys only), `/forum/t/:id`, `/forum/member/:id`, `/shop/`, `/shop/p/:id`, `/shop/cart`.

**API — public read**: `/api/status`, `/api/forum-stats`, `/api/threads[/:id]`, `/api/forum/leaderboard`, `/api/forum/members/:id`, `/api/forum/search`, `/api/forum/trending`, `/api/forum/online` (GET), `/api/shop/products[/:id]`, `/api/me`.

**API — public write** (rate-limited + Turnstile, no session required): `/api/book`, `/api/chat`, `/api/chat-lead`, `/api/shop/quote`, `/api/verify-turnstile`, `/api/forum/track-view`.

**API — session-authenticated** (forum members): `POST /api/threads`, `POST /api/threads/:id` (reply), `/api/forum/threads/:id/save|report|solve|reopen`, `/api/upload`, `/api/forum/vote`, `/api/forum/online`, `/api/forum/notifications[/:id/read]`.

**API — mod-only**: `/api/forum/threads/:id/lock`, `/api/mod/queue`.

**API — admin** (`X-Sync-Secret` header OR mod session): `/api/admin/status`, `/api/admin/sync-square-inventory`, `/api/admin/analytics`.

**Auth**: `/api/auth/:provider/login`, `/api/auth/:provider/callback` (Google only — GitHub/Meta scaffolding removed), `/api/logout`.

See `DATA_MODEL.md` for what each route reads/writes and `SECURITY.md` for auth requirements per route.

## Portal route inventory

| Route | Method | Auth |
|---|---|---|
| `/api/auth/google/start`, `/api/auth/facebook/start` | GET | none |
| `/api/auth/callback/google`, `/api/auth/facebook/callback` | GET | OAuth state cookie |
| `/api/auth/logout` | GET/POST | session (soft) |
| `/api/auth/me` | GET | session, else SSO-cookie display fallback |
| `/api/jobs/mine` | GET | session |
| `/api/vendors` | GET | none; POST | session |
| `/api/vendors/mine` | GET | session |
| `/api/admin/jobs[/:id]` | GET/PATCH | session + `isAdminUser` |
| `/api/admin/vendors[/:id]` | GET/PATCH | session + `isAdminUser` |

No route in `umrt-portal` creates `jobs` rows — they're written by the mothership's `POST /api/book`, which the portal only reads back.

## Software repo

Purely static — no `functions/` logic beyond two dead 404 stubs for a decommissioned `/qgps` route. No database, no auth, no API. A link directory for vendor firmware/software/docs across 20 brand pages, driven by one static `catalog/index.json` (64 entries).

## Data authority (per the business's own priority — see DATA_MODEL.md for full detail and current violations)

| Data | Intended authority | Actually enforced today? |
|---|---|---|
| Business name, service descriptions, location/SEO content | WordPress | Partially — also hardcoded in 161 mothership static HTML files and several portal/software pages |
| Pricing | One centralized source | **No** — `DB.pricing` + `DB.services` (two separate D1 tables, never synced) + hardcoded in `chat.js`, `shop/index.js`, 161 static pages, portal's `book/index.html`, software catalog |
| Booking | Cloudflare (mothership `/api/book`) | Yes |
| Customers/jobs | Cloudflare D1 (`PORTAL_DB.jobs`) | Yes |
| Forum users/posts | Cloudflare D1 (`DB` / `umrt_forum`) | Yes |
| Authentication | Cloudflare (Google OAuth, self-rolled signed cookies) | Yes — mothership and portal each run their own, independent implementation (not shared) |
| Application code | GitHub | Yes |
| Secrets | Cloudflare secrets (Pages dashboard / `wrangler secret put`) | Yes — confirmed no secret values committed anywhere across all three repos |
| Deployment | Cloudflare (Pages git-integration or manual `wrangler pages deploy`) | Yes |
