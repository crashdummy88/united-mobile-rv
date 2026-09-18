"""
commerce/suppliers/artek.py

Artek Energy adapter.

ARTEK WORKFLOW (2026-09, from Matt / Artek):
Artek has NO CSV. Pricing is a locked supply/demand grid. The official
path is: log in, read the grid, run `npm run price-check -- artek` (or
the SKU), then type the number onto Matt's side. Do not scrape
/account. Do not invent a feed. Do not auto-fill retail_price.

This module is only an optional reader for a *local, gitignored*
transcribe file if Matt later types his own notes into
supplier_feeds/artek.csv. It is not an Artek client. Public Shopify /
MCP catalog surfaces are retail, not dealer cost, and are not used
here. If Artek later documents a real dealer API, replace fetch() --
do not guess an endpoint.

CSV columns (see supplier_feeds/artek.example.csv for a template):
  product_id       REQUIRED. Must match an existing D1 products.id.
                   Sync will NOT create a new product for an unknown
                   product_id -- it logs a warning and skips the row.
  supplier_sku     Artek's own SKU/part number, if there is one.
  cost             Matt's real dealer/wholesale cost. Leave blank if
                   not yet known -- never guess.
  map_price        Artek's MAP price, if they publish one for this item.
  inventory_status Artek's own status word, e.g. in_stock / backorder /
                   discontinued. Leave blank if not confirmed.
  availability     Free-text note (lead time, special-order terms, etc).
  supplier_url     Link to the product on artek.energy, if useful.
  weight_lbs       Shipping weight, if known.
  shipping_class   Freight class / oversize flag, if relevant.
  images           Pipe-separated ( | ) list of image URLs, if any.
  specifications   Free-text spec notes (kept as a single string; not
                   parsed into structured fields yet).
"""

from __future__ import annotations

import csv
from pathlib import Path

from .base import NormalizedProduct, SupplierAdapter

DEFAULT_FEED_PATH = Path(__file__).resolve().parent.parent.parent / "supplier_feeds" / "artek.csv"


def _float_or_none(value: str | None) -> float | None:
    if value is None:
        return None
    text = value.strip().replace(",", "").replace("$", "")
    return float(text) if text else None


class ArtekAdapter(SupplierAdapter):
    supplier_id = "artek"

    def __init__(self, feed_path: Path | str | None = None):
        self.feed_path = Path(feed_path) if feed_path else DEFAULT_FEED_PATH

    def fetch(self) -> list[NormalizedProduct]:
        if not self.feed_path.exists():
            print(f"  [artek] no feed file at {self.feed_path}; nothing to sync")
            return []

        products: list[NormalizedProduct] = []
        with self.feed_path.open("r", newline="", encoding="utf-8-sig") as handle:
            for row_num, row in enumerate(csv.DictReader(handle), start=2):  # header is row 1
                product_id = (row.get("product_id") or "").strip()
                if not product_id:
                    print(f"  [artek] row {row_num}: missing product_id -- skipped, not guessed")
                    continue

                images_raw = (row.get("images") or "").strip()
                images = [u.strip() for u in images_raw.split("|") if u.strip()] if images_raw else []

                specs_raw = (row.get("specifications") or "").strip()
                specifications = {"notes": specs_raw} if specs_raw else {}

                products.append(NormalizedProduct(
                    product_id=product_id,
                    supplier=self.supplier_id,
                    supplier_sku=(row.get("supplier_sku") or "").strip() or None,
                    cost=_float_or_none(row.get("cost")),
                    map_price=_float_or_none(row.get("map_price")),
                    inventory_status=(row.get("inventory_status") or "").strip() or None,
                    availability=(row.get("availability") or "").strip() or None,
                    supplier_url=(row.get("supplier_url") or "").strip() or None,
                    weight_lbs=_float_or_none(row.get("weight_lbs")),
                    shipping_class=(row.get("shipping_class") or "").strip() or None,
                    images=images,
                    specifications=specifications,
                ))
        return products
