"""
commerce/demo_markup_dry_run.py

Demonstrates calculate_markup_price()'s three rule branches with
illustrative example numbers -- NOT real dealer costs (supplier_feeds/
is currently empty; no real Artek numbers exist yet). Writes nothing,
touches no database. Run with: python3 commerce/demo_markup_dry_run.py
"""

from __future__ import annotations

from commerce.pricing import calculate_markup_price

EXAMPLES = [
    # (label, product_id, cost, map_price, competitor_price, target_markup) -- all illustrative.
    # Note: with the DEFAULT 15% markup / 15% min-margin, markup ($115 on a
    # $100 cost) never actually clears the margin floor ($117.65) -- a 15%
    # markup over cost is only a ~13% margin over price, different bases.
    # So at the defaults, margin_floor or MAP wins essentially every time;
    # competitor-match only has room to matter once markup is set high
    # enough to clear the margin floor on its own (see the last 3 rows,
    # which pass a higher example markup to actually exercise that branch).
    ("Plain calc, default 15% markup/margin",        "demo-001", 100.00, None,   None,   None),
    ("Margin floor beats a low MAP",                 "demo-002", 100.00, 110.00, None,   None),
    ("MAP above margin floor -> MAP wins",            "demo-003", 100.00, 135.00, None,   None),
    ("Higher markup (30%) leaves room to match down", "demo-004", 100.00, None,   120.00, 0.30),
    ("Competitor too low -- below min margin",        "demo-005", 100.00, None,   105.00, 0.30),
    ("Competitor below MAP -- match rejected",        "demo-006", 100.00, 125.00, 120.00, 0.30),
]


def main() -> None:
    print(f"{'Scenario':<46} {'Cost':>7} {'MAP':>7} {'Comp':>7} {'Markup%':>8} {'Calculated':>11}  Rule")
    print("-" * 100)
    for label, product_id, cost, map_price, competitor, target_markup in EXAMPLES:
        kwargs = {"target_markup": target_markup} if target_markup is not None else {}
        result = calculate_markup_price(
            product_id=product_id,
            cost=cost,
            map_price=map_price,
            competitor_price=competitor,
            **kwargs,
        )
        markup_label = f"{(target_markup or 0.15) * 100:.0f}%"
        print(
            f"{label:<46} {cost:>7.2f} "
            f"{(f'{map_price:.2f}' if map_price is not None else '-'):>7} "
            f"{(f'{competitor:.2f}' if competitor is not None else '-'):>7} "
            f"{markup_label:>8} "
            f"{result.calculated_price:>11.2f}  {result.rule_applied}"
        )
    print()
    print("Nothing written -- this only exercises the calculation, no D1 access.")
    print("Real run against live cost data still requires supplier_feeds/artek.csv")
    print("to have real numbers in it (currently just a header row).")


if __name__ == "__main__":
    main()
