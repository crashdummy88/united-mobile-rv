#!/usr/bin/env bash
# Cross-repo link health check for the UMRT property network.
#
# Two checks, run against a shallow clone of every public UMRT repo:
#
#   1. STATIC: greps each repo's tracked HTML for cross-property links that
#      use a legacy .pages.dev hostname where a real unitedmobilerv.com
#      custom domain now exists (see LEGACY_MAP below). This is exactly the
#      class of bug found across 9 repos on 2026-09-14 -- same link, stale
#      in every repo's shared "platform bar", nothing had ever caught it.
#      Catches it in source before it even deploys.
#
#   2. LIVE: does a real HTTPS request against every canonical cross-domain
#      URL in the map and fails if it doesn't resolve to a 200 (following
#      redirects) -- catches DNS/deploy/cert issues, not just stale hrefs.
#
# Exit code is non-zero if either check finds a problem, so this fails the
# GitHub Action step and shows up as a red X.

set -uo pipefail

# legacy_pages_dev_host -> canonical unitedmobilerv.com URL
declare -A LEGACY_MAP=(
  ["umrt-software.pages.dev/"]="https://software.unitedmobilerv.com/"
  ["united-mobile-rv.pages.dev/forum/"]="https://forum.unitedmobilerv.com/"
  ["united-mobile-rv.pages.dev/shop/"]="https://shop.unitedmobilerv.com/"
  ["umrt-portal.pages.dev/"]="https://portal.unitedmobilerv.com/"
  ["umrt-docs.pages.dev/"]="https://docs.unitedmobilerv.com/"
  ["umrt-status.pages.dev/"]="https://status.unitedmobilerv.com/"
)
# Trailing slash on every key is deliberate: "united-mobile-rv.pages.dev/forum"
# (no slash) would also match "/forum-live/" as a substring -- a real false
# positive hit during this script's own first dry run.

# Canonical URLs that must always resolve live, regardless of what's linked
# to them from where -- the actual property list.
LIVE_URLS=(
  "https://unitedmobilerv.com/"
  "https://shop.unitedmobilerv.com/"
  "https://forum.unitedmobilerv.com/"
  "https://portal.unitedmobilerv.com/"
  "https://docs.unitedmobilerv.com/"
  "https://status.unitedmobilerv.com/"
  "https://software.unitedmobilerv.com/"
)

REPOS_DIR="${1:-/tmp/umrt-repos}"
# Set to any non-empty value to skip Check 2. Needed in CI: Cloudflare's
# Bot Fight Mode (deliberately on for this zone) hard-403s every request
# from GitHub Actions' shared runner IPs, regardless of site health --
# confirmed 2026-09-14 by actually running this workflow and watching it
# fail on every URL while the same sites returned 200 everywhere else.
# That's the protection working correctly, not a bug -- so CI only runs
# the static check; run this script with SKIP_LIVE_CHECK unset locally
# (from a normal, non-datacenter IP) for the live check to mean anything.
SKIP_LIVE_CHECK="${SKIP_LIVE_CHECK:-}"
failures=0

echo "== Check 1: static grep for legacy .pages.dev cross-links in tracked HTML =="
if [ -d "$REPOS_DIR" ]; then
  for legacy_host in "${!LEGACY_MAP[@]}"; do
    canonical="${LEGACY_MAP[$legacy_host]}"
    matches=$(grep -rl --include="*.html" "https://${legacy_host}" "$REPOS_DIR" 2>/dev/null || true)
    if [ -n "$matches" ]; then
      echo "  [FAIL] found legacy link to '${legacy_host}' (should be ${canonical}) in:"
      echo "$matches" | sed 's/^/    /'
      failures=$((failures + 1))
    fi
  done
  if [ "$failures" -eq 0 ]; then
    echo "  [OK] no legacy .pages.dev cross-links found"
  fi
else
  echo "  [SKIP] $REPOS_DIR not found -- pass the clone directory as \$1"
fi

echo
if [ -n "$SKIP_LIVE_CHECK" ]; then
  echo "== Check 2: live HTTP check -- SKIPPED (SKIP_LIVE_CHECK set, e.g. running in CI where"
  echo "   Cloudflare Bot Fight Mode 403s every request from datacenter/runner IPs) =="
else
  echo "== Check 2: live HTTP check on every canonical property URL =="
  for url in "${LIVE_URLS[@]}"; do
    code=$(curl -s -o /dev/null -L --max-time 15 -w "%{http_code}" "$url" || echo "000")
    if [ "$code" = "200" ]; then
      echo "  [OK] $url -> $code"
    else
      echo "  [FAIL] $url -> $code"
      failures=$((failures + 1))
    fi
  done
fi

echo
if [ "$failures" -gt 0 ]; then
  echo "$failures problem(s) found."
  exit 1
fi
echo "All checks passed."
exit 0
