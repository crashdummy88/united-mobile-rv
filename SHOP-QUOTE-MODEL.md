# UMRT Shop — quote model (not click-pay-ship)

The shop is a **systems quote desk**, not an Amazon-style checkout.

```
1. Customer configures / gathers SKUs and REQUESTS INFO (quote lead)
2. Matt follows up and arranges payment via Square invoice or payment link
   (not shop auto-checkout — Square is the money loop, and it is underused today)
3. After Square payment, Matt orders the shipment from the supplier
4. Upsell install (Square appointment) + VRM (Victron remote monitoring)
```

`/shop/cart` is a **quote list**. `/api/shop/quote` writes a lead. Nothing on `shop.unitedmobilerv.com` charges a card, reserves stock, or ships.

**Square is the payment and booking rail.** After a request, Matt sends a Square invoice or payment link. Install upsell books at the live Square appointment intake: https://united-mobile-rv-llc.square.site/ — do not invent Square catalog IDs, item prices, or a shop-side charge.

Listed `retail_price` values are **cited public reference prices** only. They are not live supplier grid numbers and not a Square charge.

## Square money loop (do not underuse this)

The shop never auto-charges. After a quote/request:

1. Matt sends a **Square invoice** or **Square payment link** for the agreed hardware (and any deposit).
2. After that payment clears, Matt orders the shipment from the supplier.
3. Install upsell is a **Square appointment** at https://united-mobile-rv-llc.square.site/ (same Book CTA already in chrome).
4. VRM / remote config is an add-on on that same conversation — not a shop checkout SKU.

Do not build a shop-side Stripe/Square charge, and do not invent Square catalog IDs or prices to "complete" the loop. Copy on the storefront should read: **Request a quote → we’ll follow up with Square payment.**

## Pricing standard (every source)

All price checks are **manual**. Same rule for Amazon, Artek, Dometic, Victron, Peplink, and weBoost.

**Never** invent a price. **Never** scrape a locked / login grid into the catalog. **Never** treat a public cite, a street midpoint, or a "starting at" figure as dealer cost. An unknown number stays `NULL` and the storefront stays honest (`Contact for pricing` / `Availability Unverified`).

### Checklist (file one row per SKU)

| Field | What to write |
|---|---|
| SKU | Manufacturer part number if you have it; Amazon ASIN if Amazon is the buy path; otherwise the UMRV catalog id (`sku_kind` says which) |
| Supplier | Who you will actually order from (`artek`, `amazon`, …) |
| Date checked | ISO date you looked |
| Source URL/ref | Dealer grid name, invoice, or public URL you used — not a guessed link |
| UMRV list price | The number you will show / quote **after** the check. Leave blank until then. |
| Notes | Capacity/amperage picked, MAP, freight, "starting price — pick a real model", etc. |

Empty D1 table `price_checks` (migration `021_shop_quote_tags.sql`) is the log. Do not seed dollar amounts into it.

### Pull / search command (no auto-prices)

```bash
npm run price-check -- <sku|brand>
# same thing without npm:
node scripts/price-check.js <sku|brand>
```

Prints this checklist plus **search hints** for that SKU or brand. It does **not** fill in a price.

### How to add a SKU

1. Confirm manufacturer, model, and a real identifier (`sku` + `sku_kind`).
2. Set `brand_slug` (see tags below) and `supplier_id` only if Matt has a real buy path.
3. Run `npm run price-check -- <id>` and complete the checklist by hand.
4. Write `retail_price` + `price_source` **only** after that check. Leave `cost` / `margin` NULL until wholesale is known.
5. Keep `active = 0` until you are willing to quote it. Publish with `active = 1`.
6. Do not create a product from a feed, a scrape, or a guessed Amazon hit.

### Amazon vs manufacturer SKUs

| `sku_kind` | Meaning | Example |
|---|---|---|
| `manufacturer` | The brand's real part number | weBoost `RV20`, `471410` |
| `amazon` | Amazon ASIN / listing id when Amazon is the buy path | *(none seeded — do not invent an ASIN)* |
| `internal` | UMRV catalog id (uppercased D1 `products.id` from migration 018) | `VICTRON-GXTOUCH50` |

Internal SKUs are **not** manufacturer part numbers. Do not send an internal SKU to a supplier and assume it matches. If you later get the real Victron / Artek / Dometic part number, put it in `sku` and set `sku_kind = manufacturer` (or `amazon` for an ASIN). Keep the D1 `id` stable.

Amazon is a **buy path**, not a brand on the part. A Victron unit bought on Amazon is `brand_slug=victron`, `supplier_id=amazon`, `sku_kind=amazon`. Do not use Amazon PA-API to price Square or this shop.

## Artek — locked grid, no CSV

Artek told Matt they have **no CSV**. Pricing is a **locked supply/demand grid** on their side.

1. Log into the Artek account (human, not a scraper).
2. Look up the **real** model (not a "starting at" family row).
3. Run `npm run price-check -- artek` (or the specific SKU).
4. Copy the grid number onto **Matt's side** (`retail_price` / `cost` / a `price_checks` row) by hand.
5. Leave `Availability Unverified` until you also confirm stock. A supplier link only changes the chip to **Confirm at quote** — it does not invent stock.

`commerce/suppliers/artek.py` is a leftover optional transcribe-to-CSV path if Matt ever types his own numbers into a **gitignored** local file. It is **not** the Artek workflow. Do not invent `artek.csv`. Do not scrape `/account`.

## Brand / supplier tags

| Tag | Role | In D1 today |
|---|---|---|
| `brand_slug` | Filterable product-line / manufacturer | Backfilled from `manufacturer` |
| `supplier_id` | Who we buy from | `artek` on Artek-sourced rows only |
| `sku_kind` | Manufacturer vs Amazon vs internal | `manufacturer` on two weBoost SKUs; `internal` elsewhere |

Matt's six line sources (also `suppliers` rows): **Amazon, Artek, Dometic, Victron, Peplink, weBoost**.

Filter:

- Shop: `/shop/?brand=victron` (and `?supplier=artek`)
- API: `/api/shop/products?brand=victron&supplier=artek`

Victron-on-Artek is `brand_slug=victron` + `supplier_id=artek`. That is correct.

## Inventory vs the six sources

| Source | Published (`active=1`) | Unpublished reference | Real supplier link | Prices |
|---|---|---|---|---|
| **Artek** (buy path) | 13 rows (Artek / Epoch / Rich Solar / Victron / Maxxair) | — | `supplier_id=artek` | Public cites from 2026-09-12, **not** the locked grid. `cost` NULL. |
| **Amazon** | 0 | 0 | none | none — no ASINs seeded |
| **Dometic** | 0 | 13 | none | Street / public cites only; no fulfillment account |
| **Victron** (brand) | 3 (via Artek) | 1 precision conversion | via Artek | Starting / converted public cites — pick a real model on the Artek grid |
| **Peplink** | 0 | 1 MAX BR1 Pro 5G | none | One reseller cite; no Peplink account |
| **weBoost** | 0 | 2 (real mfr SKUs `RV20`, `471410`) | none | weboost.com public cites; no weBoost account |

Other brands on the Artek buy path: Epoch (3), Rich Solar (2), Maxxair (1). Precision Stack (Wakespeed, ARCO, Ruuvi, Starlink Mini, 24V conversion): unpublished, **no prices**.

## Gaps Matt must price by hand

### Artek grid (do these first)

Every `supplier_id=artek` row still needs a current grid check. Public `price_source` cites are **not** dealer numbers.

**Must pick a real model** (seed is a family / starting price):

- `artek-epoch-eco-12v` — Eco Series, capacity varies
- `artek-epoch-elite-v2` — Elite V2, capacity varies
- `artek-epoch-v2t` — V2-T, capacity varies
- `victron-smartsolar-mppt` — SmartSolar MPPT, amperage varies
- `victron-gxtouch50` — GX Touch 50 starting cite

**Cited public figure, still re-check the grid** (and replace GBP-converted Lynx):

- `artek-alpha2pro-200`
- `artek-flex-210w`, `artek-flex-170w`, `artek-ja440w-kit`
- `richsolar-mega-100w`, `richsolar-mega-150w`
- `victron-lynx-distributor` (seed used a GBP conversion)
- `maxxair-7500k`

### Not Artek — do not invent from the Artek grid

- **Amazon:** no SKUs. Add only with a real ASIN + `sku_kind=amazon` after a manual check.
- **Dometic (13):** unpublished until a real buy path exists. Street midpoints stay unpublished.
- **Peplink MAX BR1 Pro 5G:** unpublished; dealer price unknown.
- **weBoost Drive Reach RV II / Drive X RV:** unpublished; public weBoost cites only.
- **Precision Stack (5):** no `retail_price` on purpose.

## Availability chips

| State | Chip | When |
|---|---|---|
| `unverified` + `supplier_id` set | **Confirm at quote** | Known buy path; stock still not polled |
| `unverified` + no supplier | **Availability Unverified** | Truly unknown — stays honest |
| `in_stock` / `special_order` / `discontinued` | those labels | Only after a real check |

Do not flip `stock_status` to `in_stock` because a supplier row exists.

## Apply the tagging migration

```bash
wrangler d1 execute umrt_forum --local --file=./db/migrations/021_shop_quote_tags.sql
wrangler d1 execute umrt_forum --remote --file=./db/migrations/021_shop_quote_tags.sql
```

Staging-safe: additive columns, empty `price_checks`, no price writes, unpublished rows stay unpublished.
