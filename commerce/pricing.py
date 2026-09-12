"""
commerce/pricing.py

Margin/status engine for the D1 sync path. Deliberately does NOT touch
retail_price -- that's Matt's manually curated, publicly-cited reference
price (see products.price_source). This engine only tells him whether
the CURRENT retail_price still clears a healthy margin over real cost,
using the same rule already proven in commerce/monitor.py's CSV pipeline:

    floor = cost / (1 - MIN_MARGIN)
    ok_to_sell = retail_price >= floor (or >= map_price, whichever is higher)

Auto-adjusting retail_price from this signal is a deliberate non-goal
here; that's a bigger decision (it's Matt's public price) left for a
later, explicit step if he wants it.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

from .suppliers.base import NormalizedProduct

MIN_MARGIN = float(os.getenv("UMRT_MIN_MARGIN", "0.15"))

UNAVAILABLE_STATUSES = {"discontinued", "out_of_stock", "unavailable", "backorder"}
AVAILABLE_STATUSES = {"in_stock", "available"}


@dataclass(frozen=True)
class PricedProduct:
    product_id: str
    supplier: str
    supplier_sku: Optional[str]
    cost: Optional[float]
    cost_source: Optional[str]
    map_price: Optional[float]
    margin: Optional[float]           # computed only when cost AND retail_price are known
    stock_status: Optional[str]       # passthrough of the supplier's inventory_status, unmodified
    price_status: str                 # 'SELL' | 'REVIEW' | 'SUPPRESS'
    last_checked: str


def price(record: NormalizedProduct, current_retail_price: Optional[float], feed_source_label: str) -> PricedProduct:
    cost = record.cost
    map_price = record.map_price
    inv = (record.inventory_status or "").strip().lower()

    if inv in UNAVAILABLE_STATUSES:
        status = "SUPPRESS"
    elif cost is None or current_retail_price is None:
        # Never fabricate a margin from a number we don't have.
        status = "REVIEW"
    else:
        floor = cost / (1.0 - MIN_MARGIN)
        required = max(floor, map_price) if map_price is not None else floor
        status = "SELL" if current_retail_price >= required else "REVIEW"

    margin = None
    if cost is not None and current_retail_price:
        margin = (current_retail_price - cost) / current_retail_price

    return PricedProduct(
        product_id=record.product_id,
        supplier=record.supplier,
        supplier_sku=record.supplier_sku,
        cost=cost,
        cost_source=(feed_source_label if cost is not None else None),
        map_price=map_price,
        margin=margin,
        stock_status=record.inventory_status,
        price_status=status,
        last_checked=record.last_checked,
    )
