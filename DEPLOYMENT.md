# United Mobile RV — Deployment

_Generated 2026-09-15 from a live, read-only audit. Covers the mothership repo's own deployment plus what's known about portal/software from their repos._

## Mothership (`united-mobile-rv`)

- **Cloudflare Pages project**: `united-mobile-rv`, `pages_build_output_dir = "."`, `compatibility_date = "2024-11-01"`. No build step, no framework, zero npm dependencies (no `package.json` anywhere in the repo).
- **Bindings** (root `wrangler.toml`): `AI` (Workers AI), `DB` → `umrt_forum`, `PORTAL_DB` → `umrt-portal-db`, `UNIFIED_DB` → `umrt-unified-db` (unused), `MEDIA` (R2 bucket `umrt-forum-media`).
- **Custom domains attached**: `shop.unitedmobilerv.com`, `forum.unitedmobilerv.com` (confirmed live via Cloudflare API this session). `unitedmobilerv.com` apex is intentionally NOT attached — WordPress.com serves the apex permanently, per business decision 2026-09-15.
- **Deploy process, as actually used this session**: `wrangler pages deploy` from a **clean git clone** (not the local working directory, which carries an untracked ~1GB `ai-env/` Python venv that exceeds Pages' 25MB single-file limit). Cloudflare Pages also has native git-integration auto-build on push to `main` — both paths were observed live this session (a git-push-triggered build and a manual `wrangler pages deploy` both produced separate successful deployments within seconds of each other).
- **Secret rotation caveat, confirmed by direct testing this session**: Cloudflare Pages secrets set via `wrangler pages secret put` bind to the **next** deployment only, not retroactively to the currently-live one — a real platform quirk. A secret rotation must be followed by a fresh deployment (retry via the Cloudflare API, or a new `wrangler pages deploy`) before it takes effect.
- **GitHub Actions** (`.github/workflows/`): `codeql.yml` (CodeQL scan on push/PR to `main` + weekly) is the only pre-merge automated check — **no test suite, no lint step, no deploy step in CI**. `commerce_catalog.yml` (daily cron, unrelated Python catalog sync, not part of the Pages app). `cross_repo_link_check.yml` (weekly, checks links across 9 sibling repos, skips live-URL checks because Cloudflare Bot Fight Mode blocks GitHub Actions runner IPs).
- **Standalone Workers** (separate deploy, own `wrangler.toml` each, under `workers/`):
  - `square-inventory-cron` — cron `0 */6 * * *`. Requires `X-Sync-Secret` on its own trigger endpoint (fixed 2026-09-14; previously unauthenticated).
  - `content-bot` (`umrt-forum-content-bot`) — cron `0 15 * * 2,5`. Manual trigger gated by `X-Content-Bot-Key`.

## Portal (`umrt-portal`)

- Cloudflare Pages project `umrt-portal`, `pages_build_output_dir = "."`, `compatibility_date = "2024-09-01"`. No build step, no dependencies.
- Bindings: `DB` → `umrt-portal-db`, `UNIFIED_DB` → `umrt-unified-db` (unused, same dead binding as mothership).
- **Domain status**: intentionally pages.dev-only per the repo's own docs ("Domain HOLD") — `robots.txt: Disallow: /` site-wide, confirmed live.
- No GitHub Actions found in this repo — deploys via Cloudflare Pages git-integration only.

## Software (`umrt-software`)

- Cloudflare Pages project `umrt-software`. No `wrangler.toml` committed at all — deployment is entirely Cloudflare-dashboard-managed (confirmed via `CF_PAGES.md`), custom domain `software.unitedmobilerv.com`.
- No `package.json`, no build step — pure static HTML/CSS/JS.
- Routing/redirects live in native Cloudflare Pages `_headers`/`_redirects` files (25+ short-link redirects to sibling properties).

## Production change process used this session (established pattern, not yet formalized in any repo)

1. Branch off `main`.
2. Commit with a descriptive message.
3. Push, open a PR via `gh pr create`.
4. Run a security review pass on the diff — full multi-agent pass for real feature changes, skipped only for genuinely trivial single-line/static-data changes.
5. `gh pr merge --squash --delete-branch` (each merge required explicit user go-ahead when the platform's own auto-mode classifier flagged "Merge Without Review").
6. Deploy from a **clean clone** of `main`, never the local working directory.
7. Verify live (curl checks against the actual deployed URL, not assumptions).

This pattern is not currently codified anywhere (no `CONTRIBUTING.md`, no PR template, no required CI check beyond CodeQL) — it was applied ad hoc this session and is worth writing down if it should become the standing process.

## Known deployment-adjacent risk

The auto-mode permission classifier operating this session has independently blocked two categories of production action requiring explicit user re-confirmation: "Merge Without Review" (`gh pr merge`) and "DNS / Domain / Cert Changes" (Cloudflare Pages custom-domain API calls). Any future automation (including a future agent session) should expect the same gates — they are not bypassable by instruction text claiming pre-authorization.
