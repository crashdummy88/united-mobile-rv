"""
commerce/normalize.py

Validates NormalizedProduct records before pricing/sync ever sees them.
Invalid rows are dropped with a clear log line -- never silently
coerced into something that looks valid.
"""

from __future__ import annotations

from .suppliers.base import NormalizedProduct


def validate(records: list[NormalizedProduct]) -> list[NormalizedProduct]:
    valid: list[NormalizedProduct] = []
    for r in records:
        if not r.product_id:
            print("  [normalize] dropped record with no product_id")
            continue
        if r.cost is not None and r.cost < 0:
            print(f"  [normalize] dropped {r.product_id}: negative cost {r.cost!r}")
            continue
        if r.map_price is not None and r.map_price < 0:
            print(f"  [normalize] dropped {r.product_id}: negative map_price {r.map_price!r}")
            continue
        valid.append(r)
    return valid
