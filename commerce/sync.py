"""
commerce/sync.py

Supplier feed(s) -> normalize -> validate -> pricing -> a REVIEWABLE SQL
file for D1. This does not write to Cloudflare D1 by itself unless you
explicitly pass --apply-local or --apply-remote (both just shell out to
the same `wrangler d1 execute` command already used for every migration
in db/migrations/ -- no new Cloudflare credentials, no new tooling).

Default (safest) usage -- just look at what WOULD change:

    python3 commerce/sync.py --supplier artek

That prints a summary and writes a generated .sql file under
db/generated/ for you to read before touching anything.

Test it against wrangler's local D1 replica (zero risk to production):

    python3 commerce/sync.py --supplier artek --apply-local

Only once you've reviewed that and you're confident, apply for real:

    python3 commerce/sync.py --supplier artek --apply-remote

SAFETY RULES BAKED IN:
  - Only ever UPDATEs rows for product_ids present in the feed. Never
    touches `active`, never touches unrelated products, never inserts a
    new product row (an unmatched product_id is skipped with a warning
    -- a genuinely new product still gets added to D1 by a human, same
    as the existing seed-data pattern in 004_shop_seed.sql).
  - Never writes to retail_price / price_source -- those stay Matt's
    manually curated, cited public numbers.
  - cost/cost_source/margin are only ever set from real feed data; an
    unmatched or cost-less row leaves those columns untouched (SQL
    COALESCE-free: we simply don't include a column in the UPDATE if we
    have no real value for it).
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from commerce.suppliers import ADAPTERS  # noqa: E402
from commerce.normalize import validate  # noqa: E402
from commerce.pricing import price  # noqa: E402

WRANGLER_D1_NAME = "umrt_forum"
GENERATED_DIR = ROOT / "db" / "generated"


def sql_str(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, (int, float)):
        return repr(float(value))
    escaped = str(value).replace("'", "''")
    return f"'{escaped}'"


def fetch_current_retail_prices(product_ids: list[str], products_json: Path | None) -> dict[str, float | None]:
    """
    Returns {product_id: retail_price}. Source is either a JSON file the
    caller supplies (offline testing -- see --products-json), or a live
    `wrangler d1 execute ... --json` read (requires wrangler auth, same
    as applying any migration in this repo already does).
    """
    if products_json:
        data = json.loads(products_json.read_text(encoding="utf-8"))
        rows = data if isinstance(data, list) else data.get("results", [])
        return {row["id"]: row.get("retail_price") for row in rows}

    if not product_ids:
        return {}
    placeholders = ", ".join(sql_str(pid) for pid in product_ids)
    cmd = [
        "wrangler", "d1", "execute", WRANGLER_D1_NAME, "--remote", "--json",
        "--command", f"SELECT id, retail_price FROM products WHERE id IN ({placeholders})",
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        print(f"  [sync] could not read current retail prices via wrangler ({exc}); "
              f"pass --products-json to run offline instead")
        return {}
    payload = json.loads(result.stdout)
    rows = payload[0]["results"] if payload and "results" in payload[0] else []
    return {row["id"]: row.get("retail_price") for row in rows}


def build_update_sql(product_id: str, priced) -> str:
    assignments = [
        f"map_price = {sql_str(priced.map_price)}",
        f"stock_status = {sql_str(priced.stock_status) if priced.stock_status else 'stock_status'}",
        f"price_status = {sql_str(priced.price_status)}",
        f"last_synced_at = {sql_str(priced.last_checked)}",
        "updated_at = datetime('now')",
    ]
    # Only touch cost/cost_source/margin when we actually have a real cost --
    # never overwrite a known cost with an unknown one.
    if priced.cost is not None:
        assignments.append(f"cost = {sql_str(priced.cost)}")
        assignments.append(f"cost_source = {sql_str(priced.cost_source)}")
    if priced.margin is not None:
        assignments.append(f"margin = {sql_str(priced.margin)}")

    return (
        f"UPDATE products SET {', '.join(assignments)} "
        f"WHERE id = {sql_str(product_id)} AND supplier_id = {sql_str(priced.supplier)};"
    )


def run(supplier_key: str, products_json: Path | None) -> Path:
    adapter_cls = ADAPTERS.get(supplier_key)
    if adapter_cls is None:
        raise SystemExit(f"No adapter registered for supplier '{supplier_key}'. "
                          f"Known: {', '.join(ADAPTERS) or '(none)'}")

    adapter = adapter_cls()
    records = validate(adapter.fetch())
    if not records:
        print(f"  [sync] no usable rows from '{supplier_key}' feed -- nothing to do")
        return None

    retail_prices = fetch_current_retail_prices([r.product_id for r in records], products_json)

    statements = []
    skipped = 0
    for record in records:
        retail_price = retail_prices.get(record.product_id)
        if record.product_id not in retail_prices:
            print(f"  [sync] '{record.product_id}' not found in D1 products (or price lookup failed) -- skipped")
            skipped += 1
            continue
        priced = price(record, retail_price, feed_source_label=f"{supplier_key} feed, synced")
        print(f"  [sync] {record.product_id} | cost={priced.cost} map={priced.map_price} "
              f"stock={priced.stock_status} -> {priced.price_status}")
        statements.append(build_update_sql(record.product_id, priced))

    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_path = GENERATED_DIR / f"{supplier_key}_sync_{ts}.sql"
    header = (
        f"-- Generated by commerce/sync.py -- supplier: {supplier_key}\n"
        f"-- {len(statements)} product(s) updated, {skipped} skipped (no D1 match).\n"
        f"-- Review before applying. Apply with:\n"
        f"--   wrangler d1 execute {WRANGLER_D1_NAME} --local --file={out_path.relative_to(ROOT)}   (test)\n"
        f"--   wrangler d1 execute {WRANGLER_D1_NAME} --remote --file={out_path.relative_to(ROOT)}  (production)\n\n"
    )
    out_path.write_text(header + "\n".join(statements) + "\n", encoding="utf-8")
    print(f"\n  [sync] wrote {out_path.relative_to(ROOT)} ({len(statements)} statement(s))")
    return out_path


def apply_sql(sql_path: Path, remote: bool) -> None:
    cmd = ["wrangler", "d1", "execute", WRANGLER_D1_NAME,
           "--remote" if remote else "--local", "--file", str(sql_path)]
    print(f"  [sync] running: {' '.join(cmd)}")
    subprocess.run(cmd, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync a supplier feed into a reviewable D1 SQL file.")
    parser.add_argument("--supplier", required=True, choices=list(ADAPTERS) or ["artek"])
    parser.add_argument("--products-json", type=Path, default=None,
                         help="Offline mode: a JSON export of [{id, retail_price}, ...] instead of a live wrangler read")
    parser.add_argument("--apply-local", action="store_true", help="Apply the generated SQL to wrangler's local D1 replica")
    parser.add_argument("--apply-remote", action="store_true", help="Apply the generated SQL to the real, remote D1 database")
    args = parser.parse_args()

    sql_path = run(args.supplier, args.products_json)
    if sql_path is None:
        return 0

    if args.apply_local:
        apply_sql(sql_path, remote=False)
    if args.apply_remote:
        apply_sql(sql_path, remote=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
