# UMRT Commerce Catalog

Shop model (read this first): **[SHOP-QUOTE-MODEL.md](../SHOP-QUOTE-MODEL.md)**.

The storefront is quote-first: request info → Square invoice / payment link → Matt orders the shipment → upsell install (Square appointment) / VRM. This directory is **not** an auto-pricer and **not** click-pay-ship.

**Artek has no CSV.** Pricing is a locked supply/demand grid. Check it by hand (`npm run price-check -- artek`). Do not scrape `/account`. Do not invent `supplier_feeds/artek.csv`. The CSV adapter below is only if Matt later transcribes his own numbers into a gitignored local file.

All six line sources (Amazon, Artek, Dometic, Victron, Peplink, weBoost) use the same manual price-check standard. No adapter invents a price.

## Data flow

`catalog.csv` is the master sellable catalog. Supplier feeds live under `supplier_feeds/` and are normalized by `commerce/monitor.py`.

Each supplier feed uses:

- `supplier_sku`
- `cost`
- `map_price`
- `title`
- `inventory_status`
- `supplier_url`

The monitor calculates a sell price from acquisition cost and MAP while enforcing the configured minimum gross margin. Products that are not available are marked `SUPPRESS` rather than being presented as available.

The nightly GitHub Actions workflow runs the synchronization and commits `catalog.csv` only when a real catalog change occurs.

## Margin rule

The default minimum gross margin is 15%. It can be changed in GitHub Actions with `UMRT_MIN_MARGIN`.

The pricing engine uses the greater of:

- the price required to meet the minimum margin; or
- the supplier's MAP price when supplied.

This foundation deliberately keeps supplier acquisition separate from storefront publishing. Real supplier API/feed adapters should be added only after the supplier's authorized machine-readable source and terms are verified.

## D1 supplier-sync path (commerce/sync.py)

`commerce/monitor.py` (above) is a standalone CSV-in/CSV-out pipeline —
it never touches the live storefront database. `commerce/sync.py` is a
separate, newer pipeline that bridges a supplier feed into the actual
Cloudflare D1 `products` table the storefront (`/api/shop/*`, `/shop/*`)
reads from, so the same table is the one source of truth instead of two
disconnected systems.

Flow: `commerce/suppliers/<supplier>.py` adapter `.fetch()` → normalized
`NormalizedProduct` records → `commerce/normalize.py` drops anything with
no `product_id` or a negative cost/MAP → `commerce/pricing.py` computes
`price_status` (`SELL` / `REVIEW` / `SUPPRESS`) against the product's
*current* `retail_price` already in D1 → a plain, human-readable SQL file
is written to `db/generated/` (gitignored) for review. Nothing is applied
to D1 unless you explicitly ask for it.

Rules baked into every adapter and into `sync.py` itself:

- Never invents a supplier API — an adapter only talks to a source that
  has actually been confirmed to exist. Artek told Matt they have no
  CSV and no dealer API; `commerce/suppliers/artek.py` stays a local
  transcribe-to-CSV reader (optional, gitignored feed) and is **not**
  the pricing workflow. Official path: manual grid check + `npm run price-check`.
- Never fabricates cost, inventory, or margin — an unknown value stays
  `NULL`/`None` all the way through; it never becomes a guess.
- Never writes `retail_price`, `price_source`, or `active` — those stay
  Matt's manually curated, cited numbers and publish decision.
- Never creates a new D1 product row — a feed row only updates an
  *existing* `products.id`; an unmatched `product_id` is skipped and
  logged, exactly like today's human-curated seed-data pattern.
- Real wholesale cost/MAP numbers never reach the public GitHub repo —
  the real `supplier_feeds/<name>.csv` files are gitignored; only blank
  `*.example.csv` templates are tracked.

### Running it

```bash
# 1. Apply the additive migration (adds map_price / price_status / last_synced_at)
wrangler d1 execute umrt_forum --local --file=./db/migrations/006_shop_supplier_sync.sql
wrangler d1 execute umrt_forum --remote --file=./db/migrations/006_shop_supplier_sync.sql

# 2. OPTIONAL only — if you transcribed your own grid notes into a
#    gitignored local CSV. Artek does not provide this file. Prefer:
#      npm run price-check -- artek
#    and write retail_price / cost by hand after the grid check.
# cp supplier_feeds/artek.example.csv supplier_feeds/artek.csv

# 3. Dry run -- writes a reviewable SQL file, changes nothing
python3 commerce/sync.py --supplier artek

# 4. Read db/generated/artek_sync_*.sql, then test against local D1
python3 commerce/sync.py --supplier artek --apply-local
wrangler d1 execute umrt_forum --local --command "SELECT id, cost, map_price, price_status FROM products WHERE supplier_id='artek'"

# 5. Only once you're confident, apply to production
python3 commerce/sync.py --supplier artek --apply-remote
```

Offline/CI testing without a live `wrangler` D1 read: pass
`--products-json path/to/products.json`, a JSON array of
`{"id": ..., "retail_price": ...}` objects, instead of step 1's live read.
