"""
commerce/suppliers/base.py

Shared shape every supplier adapter normalizes into, plus the minimal
adapter interface. No adapter here talks to a real network API unless
that API has actually been confirmed to exist (see artek.py's docstring
for why Artek is a CSV adapter, not an API client).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional


@dataclass(frozen=True)
class NormalizedProduct:
    """
    One supplier's view of one product, normalized to a common shape.
    Every field is Optional except the identity fields -- an adapter
    should never invent a value it doesn't actually have. Unknown stays
    None, all the way through pricing and into D1.
    """

    # Identity -- product_id ties this row to an EXISTING, human-reviewed
    # D1 products.id. Sync never creates a new product from a supplier
    # feed on its own; a genuinely new product still gets added to D1 by
    # a person (matching the existing seed-data pattern), same as today.
    product_id: str
    supplier: str          # matches D1 suppliers.id, e.g. 'artek'
    supplier_sku: Optional[str] = None

    # Descriptive (used only to help a human cross-check the match --
    # never overwrites the product's curated D1 title/description)
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None

    # Commercial -- the whole reason this pipeline exists
    cost: Optional[float] = None
    map_price: Optional[float] = None
    inventory_status: Optional[str] = None   # supplier's own word for it, e.g. 'in_stock', 'backorder'
    availability: Optional[str] = None       # free-text note, e.g. lead time

    # Logistics / reference
    supplier_url: Optional[str] = None
    weight_lbs: Optional[float] = None
    shipping_class: Optional[str] = None
    images: list[str] = field(default_factory=list)
    specifications: dict[str, str] = field(default_factory=dict)

    last_checked: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(timespec="seconds")
    )


class SupplierAdapter:
    """
    Minimal adapter interface. A real API-backed adapter and a CSV-backed
    adapter both just need to produce a list of NormalizedProduct -- how
    they get there is entirely up to them.
    """

    supplier_id: str = "unknown"

    def fetch(self) -> list[NormalizedProduct]:
        raise NotImplementedError
