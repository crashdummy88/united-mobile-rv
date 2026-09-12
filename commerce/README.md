# UMRT Commerce Catalog

This directory contains the first production foundation for the United Mobile RV drop-ship catalog.

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
