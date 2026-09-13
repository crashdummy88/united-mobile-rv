#!/usr/bin/env bash
# ============================================================================
# CUTOVER-DAY SCRIPT — DO NOT RUN UNTIL unitedmobilerv.com DNS ACTUALLY
# POINTS AT THIS CLOUDFLARE PAGES PROJECT.
#
# Running this before the DNS cutover tells Google (and every other crawler)
# that this content's canonical home is a domain currently serving different
# (WordPress) content — actively wrong, not just premature. Same reasoning
# already applied to holding off the sitemap.xml.js host rewrite.
#
# What it does:
#   1. Rewrites every occurrence of https://united-mobile-rv.pages.dev to
#      https://unitedmobilerv.com across all HTML files (canonical tags,
#      og:url, og:image, twitter:image — whatever's there).
#   2. Updates the `base` constant in functions/sitemap.xml.js the same way.
#   3. Prints a summary of files changed and a post-run checklist.
#
# What it deliberately does NOT do:
#   - Does not touch functions/_middleware.js indexing rules or robots.txt.
#     Flipping the site from noindex to indexed is a separate decision —
#     ask before touching indexing, per standing project rule.
#   - Does not touch the DNS/custom-domain setup itself. That's a Cloudflare
#     dashboard action and stays with Matt.
#   - Does not touch shop./forum. subdomain logic in functions/index.js.
#
# Usage:
#   ./scripts/cutover-domain-rewrite.sh          # dry run — shows a diff, changes nothing
#   ./scripts/cutover-domain-rewrite.sh --apply  # actually rewrites the files
#
# After running --apply:
#   - git diff --stat to sanity-check the file count matches expectations
#   - node -c on any .js files touched (functions/sitemap.xml.js)
#   - Spot check a few pages' canonical/OG tags render correctly
#   - Commit, then handle the indexing flip and DNS cutover as their own
#     separate, explicit steps — not part of this script.
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

OLD='https://united-mobile-rv.pages.dev'
NEW='https://unitedmobilerv.com'
MODE="${1:-}"

FILES=$(grep -rlF "$OLD" --include="*.html" --include="*.js" . \
  | grep -v -E '/(node_modules|\.git|\.wrangler|united-mobile-rv\.pages\.dev)/' || true)

COUNT=$(echo "$FILES" | grep -c . || true)

if [ "$COUNT" -eq 0 ]; then
  echo "No occurrences of $OLD found. Nothing to do (already switched, or run from the wrong directory)."
  exit 0
fi

echo "Found $OLD in $COUNT files."

if [ "$MODE" != "--apply" ]; then
  echo ""
  echo "DRY RUN — no files changed. Sample of what would be touched:"
  echo "$FILES" | head -10
  echo "$FILES" | wc -l | xargs echo "... total files:"
  echo ""
  echo "Re-run with --apply to actually rewrite them."
  exit 0
fi

echo "$FILES" | while IFS= read -r f; do
  [ -z "$f" ] && continue
  sed -i "s|$OLD|$NEW|g" "$f"
done

echo "Rewrote $COUNT files: $OLD -> $NEW"
echo ""
echo "Next steps (not automated by this script):"
echo "  1. node -c functions/sitemap.xml.js"
echo "  2. git diff --stat   (confirm file count looks right)"
echo "  3. Spot-check a few pages' <link rel=canonical> and og:url tags"
echo "  4. Decide + apply the indexing flip (functions/_middleware.js, robots.txt) separately"
echo "  5. Commit and push only after DNS is actually pointed at this project"
