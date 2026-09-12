from __future__ import annotations

import csv
import os
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "catalog.csv"
FEED_ROOT = ROOT / "supplier_feeds"
MIN_MARGIN = float(os.getenv("UMRT_MIN_MARGIN", "0.15"))


@dataclass(frozen=True)
class SupplierItem:
    supplier: str
    sku: str
    cost: float
    map_price: float | None
    title: str
    inventory_status: str
    supplier_url: str


def money(value: str | float | int | None) -> float | None:
    if value is None or str(value).strip() == "":
        return None
    cleaned = str(value).strip().replace(",", "")
    for token in ("USD", "usd", "$", "£", "€"):
        cleaned = cleaned.replace(token, "")
    cleaned = cleaned.strip()
    return float(cleaned) if cleaned else None


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def supplier_feed_paths() -> Iterable[Path]:
    if not FEED_ROOT.exists():
        return []
    return sorted(FEED_ROOT.glob("*.csv"))


def load_supplier_feeds() -> dict[tuple[str, str], SupplierItem]:
    items: dict[tuple[str, str], SupplierItem] = {}
    for path in supplier_feed_paths():
        supplier_name = path.stem.lower()
        for row in read_csv(path):
            sku = (row.get("sku") or row.get("supplier_sku") or "").strip()
            if not sku:
                continue
            cost = money(row.get("cost"))
            if cost is None:
                continue
            map_price = money(row.get("map_price"))
            item = SupplierItem(
                supplier=supplier_name,
                sku=sku,
                cost=cost,
                map_price=map_price,
                title=(row.get("title") or "").strip(),
                inventory_status=(row.get("inventory_status") or "unknown").strip().lower(),
                supplier_url=(row.get("supplier_url") or "").strip(),
            )
            items[(supplier_name, sku)] = item
    return items


def choose_price(cost: float, map_price: float | None) -> float:
    floor = cost / (1.0 - MIN_MARGIN)
    if map_price is not None:
        return max(floor, map_price)
    return floor


def status_for(cost: float, price: float, inventory_status: str) -> str:
    if inventory_status not in {"in_stock", "available"}:
        return "SUPPRESS"
    margin = (price - cost) / price if price else 0.0
    return "SELL" if margin >= MIN_MARGIN else "REVIEW"


def write_catalog(rows: list[dict[str, str]]) -> None:
    if not rows:
        return
    fieldnames = list(rows[0].keys())
    fd, temp_name = tempfile.mkstemp(prefix=".catalog.", suffix=".csv", dir=CATALOG.parent)
    try:
        with os.fdopen(fd, "w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames, lineterminator="\n")
            writer.writeheader()
            writer.writerows(rows)
        os.replace(temp_name, CATALOG)
    except Exception:
        try:
            os.unlink(temp_name)
        except FileNotFoundError:
            pass
        raise


def main() -> int:
    rows = read_csv(CATALOG) if CATALOG.exists() else []
    feeds = load_supplier_feeds()
    if not rows:
        print("catalog.csv is empty; no products to synchronize.")
        return 0

    checked_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    changed = False

    for row in rows:
        supplier = (row.get("supplier") or "").strip().lower()
        supplier_sku = (row.get("supplier_sku") or row.get("sku") or "").strip()
        item = feeds.get((supplier, supplier_sku))
        if item is None:
            continue

        old_price = money(row.get("price"))
        new_price = choose_price(item.cost, item.map_price)
        new_status = status_for(item.cost, new_price, item.inventory_status)
        margin = (new_price - item.cost) / new_price if new_price else 0.0

        updates = {
            "cost": f"{item.cost:.2f}",
            "map_price": f"{item.map_price:.2f}" if item.map_price is not None else "",
            "price": f"{new_price:.2f}",
            "inventory_status": item.inventory_status,
            "supplier_url": item.supplier_url,
            "last_checked": checked_at,
            "gross_profit": f"{new_price - item.cost:.2f}",
            "gross_margin_percent": f"{margin * 100:.2f}",
            "price_status": new_status,
        }
        if item.title and not row.get("title"):
            updates["title"] = item.title

        for key, value in updates.items():
            if row.get(key, "") != value:
                row[key] = value
                changed = True

        if old_price is not None and abs(old_price - new_price) >= 0.005:
            print(f"PRICE | {row.get('brand', '')} | {supplier_sku} | ${old_price:.2f} -> ${new_price:.2f}")
        print(f"CHECK | {supplier} | {supplier_sku} | {item.inventory_status} | {new_status} | margin {margin * 100:.2f}%")

    if changed:
        write_catalog(rows)
        print("catalog.csv updated")
    else:
        print("No catalog changes; catalog.csv left untouched.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
