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


# ---------------------------------------------------------------------------
# Opt-in auto-markup calculation (2026-09-14).
#
# Everything above this line is the original review-only engine: it never
# writes retail_price, by deliberate design (see module docstring). Matt
# explicitly asked to add a real markup-calculation + auto-price path on
# top of that -- this section is that path, kept strictly separate:
#
#   - `price()` above is UNCHANGED and still never touches retail_price.
#   - `calculate_markup_price()` below is a pure function a caller must
#     explicitly invoke; nothing above calls it automatically.
#   - sync.py only writes the result to D1 when the caller passes the new
#     --apply-live-pricing flag (see sync.py's own docstring for exactly
#     what that reverses and why it's a separate, explicit switch).
#
# Competitor/"market" price is accepted as a plain optional input, NOT
# fetched from any live API here. In particular this deliberately does
# NOT call Amazon's Product Advertising API: PA-API's operating agreement
# restricts that data to displaying prices next to your own Amazon
# affiliate links, not informing pricing on products you sell elsewhere
# (Square, this shop) -- using it that way risks the Associates account.
# If Matt wants a competitor price folded in, it should come from a
# source he's confirmed is fine to use this way (e.g. a manually
# maintained CSV, same pattern as supplier_feeds/*.csv), passed in here
# as `competitor_price` -- this function has no opinion on where it came
# from, it just won't go fetch one on its own.
# ---------------------------------------------------------------------------

DEFAULT_TARGET_MARKUP = float(os.getenv("UMRT_TARGET_MARKUP", "0.15"))


@dataclass(frozen=True)
class MarkupResult:
    product_id: str
    cost: Optional[float]
    map_price: Optional[float]
    competitor_price: Optional[float]
    calculated_price: Optional[float]   # None when cost is unknown -- never fabricated
    rule_applied: str                   # 'no_cost' | 'markup' | 'map_floor' | 'competitor_match'
    margin_at_calculated: Optional[float]


def calculate_markup_price(
    *,
    product_id: str,
    cost: Optional[float],
    map_price: Optional[float] = None,
    competitor_price: Optional[float] = None,
    target_markup: float = DEFAULT_TARGET_MARKUP,
    min_margin: float = MIN_MARGIN,
) -> MarkupResult:
    """
    cost + % markup, clamped up to MAP if the markup price would sit below
    it, optionally matched down to a competitor price if that price still
    clears min_margin (and still respects MAP as an absolute floor -- you
    cannot legally advertise below a vendor's MAP just to match a
    competitor). Returns None for calculated_price when cost is unknown;
    this never guesses a price from a cost it doesn't have.
    """
    if cost is None:
        return MarkupResult(product_id, cost, map_price, competitor_price, None, "no_cost", None)

    # target_markup is a % over COST; min_margin is a % over PRICE -- these
    # are different bases, so a "15% markup" and a "15% margin" are NOT the
    # same number (15% markup on $100 cost = $115, an ~13% margin -- below
    # a 15% margin floor). Take whichever price is higher so the result
    # always clears the existing min-margin bar used by price()'s SELL/
    # REVIEW signal; a markup healthy enough on its own leaves this unchanged.
    markup_price = cost * (1.0 + target_markup)
    margin_floor_price = cost / (1.0 - min_margin)
    rule = "markup" if markup_price >= margin_floor_price else "margin_floor"
    calculated = max(markup_price, margin_floor_price)

    if map_price is not None and calculated < map_price:
        calculated = map_price
        rule = "map_floor"

    if competitor_price is not None:
        absolute_floor = max(margin_floor_price, map_price) if map_price is not None else margin_floor_price
        if competitor_price >= absolute_floor and competitor_price < calculated:
            calculated = competitor_price
            rule = "competitor_match"

    margin_at_calculated = (calculated - cost) / calculated if calculated else None

    return MarkupResult(
        product_id=product_id,
        cost=cost,
        map_price=map_price,
        competitor_price=competitor_price,
        calculated_price=round(calculated, 2),
        rule_applied=rule,
        margin_at_calculated=margin_at_calculated,
    )
