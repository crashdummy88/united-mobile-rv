/**
 * Square Orders + Invoices integration -- Phase 2, 2026-09-14.
 *
 * SAFE-BY-DEFAULT, matching the pattern already used by commerce/pricing.py's
 * --apply-live-pricing flag and the shop-gating middleware in this repo:
 * every function here is a no-op unless env.SQUARE_ACCESS_TOKEN AND
 * env.SQUARE_LOCATION_ID are both set. Nothing in this file is wired to run
 * automatically against Matt's live Square account without those secrets
 * being deliberately added first (`wrangler pages secret put`).
 *
 * IMPORTANT -- confirmed 2026-09-14: the Square MCP connector available to
 * Claude in this session is bound to UMRT's real, LIVE production Square
 * account (merchant UNITED MOBILE RV LLC, MLVM87VQ3KP9E) -- there is no
 * separate sandbox reachable through it. This file was written and reviewed
 * without ever calling a live create/write method against that account.
 * Before SQUARE_ACCESS_TOKEN is set for the first time, get either:
 *   (a) real Square SANDBOX credentials from the Square Developer Dashboard
 *       (developer.squareup.com -> Sandbox tab) to test safely first, or
 *   (b) real production credentials, if Matt explicitly wants to skip
 *       sandbox testing -- in which case test with a single real booking
 *       and manually delete the resulting draft invoice from the Square
 *       dashboard before trusting it further.
 * Either way: SQUARE_ENVIRONMENT controls which Square API host is used.
 *
 * DRAFT ONLY: this deliberately never calls Square's "publish invoice"
 * endpoint. A created invoice sits as an unpublished draft in Square --
 * nothing is sent to the customer and nothing is charged -- until Matt
 * reviews it and publishes it himself from the Square dashboard, exactly
 * like the "estimate" Matt currently types by hand.
 */

const SQUARE_HOSTS = {
  production: 'https://connect.squareup.com',
  sandbox: 'https://connect.squareupsandbox.com',
};

function squareHost(env) {
  return SQUARE_HOSTS[env.SQUARE_ENVIRONMENT] || SQUARE_HOSTS.production;
}

function isConfigured(env) {
  return !!(env.SQUARE_ACCESS_TOKEN && env.SQUARE_LOCATION_ID);
}

async function squareRequest(env, path, body) {
  const res = await fetch(`${squareHost(env)}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
      'Square-Version': '2026-08-19',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Surface the FULL errors array (category + code + detail per Square's
    // error model), not just the first detail string -- a bare "Resource
    // not found" with nothing else was hiding the actual category/code
    // (e.g. AUTHENTICATION_ERROR vs NOT_FOUND) needed to diagnose failures.
    const errors = (data && data.errors) || [];
    const detail = errors.length
      ? errors.map((e) => `${e.category || '?'}/${e.code || '?'}: ${e.detail || '(no detail)'}`).join('; ')
      : res.statusText;
    throw new Error(`Square ${path} failed (${res.status}): ${detail}`);
  }
  return data;
}

/**
 * Builds and creates a Square Order for a booking -- one ad-hoc line item
 * (no catalog reference needed), no price set. Per UMRT's own pricing
 * rules the diagnostic fee is always standalone and quoted after diagnosis,
 * so this deliberately does NOT invent a dollar amount; Matt fills in the
 * real price when he reviews the draft invoice in Square.
 */
export async function createDraftOrder(env, booking) {
  if (!isConfigured(env)) return { skipped: true, reason: 'not_configured' };

  const idempotencyKey = `book-order-${booking.id}`;
  const rig = [booking.rvYear, booking.rvMake, booking.rvModel].filter(Boolean).join(' ') || booking.rig || '';
  const noteParts = [rig && `Rig: ${rig}`, booking.location && `Location: ${booking.location}`].filter(Boolean);

  const data = await squareRequest(env, '/v2/orders', {
    idempotency_key: idempotencyKey,
    order: {
      location_id: env.SQUARE_LOCATION_ID,
      reference_id: booking.id,
      line_items: [
        {
          name: `Diagnostic / service request -- ${booking.issue}`.slice(0, 512),
          quantity: '1',
          // Square requires base_price_money on any ad-hoc (non-catalog)
          // line item -- confirmed live 2026-09-16, order creation was
          // failing 400 MISSING_REQUIRED_PARAMETER without it. $0 here is
          // a placeholder, not a real quote: the line item's own name/note
          // already say "diagnostic / service request", and Matt sets the
          // actual price when he reviews the draft in the Square dashboard,
          // same as before this fix.
          base_price_money: { amount: 0, currency: 'USD' },
          note: noteParts.join(' | ').slice(0, 500) || undefined,
        },
      ],
    },
  });
  return { skipped: false, orderId: data.order && data.order.id };
}

/**
 * Creates a DRAFT invoice against that order. Never calls publish --
 * see the file-level note above. customer_id is intentionally omitted
 * (Square requires a Customer object, not just a name/email, to attach one;
 * wiring that up is a reasonable follow-on once this is confirmed working,
 * not assumed here to avoid silently creating Square Customer records too).
 */
export async function createDraftInvoice(env, orderId, booking) {
  if (!isConfigured(env) || !orderId) return { skipped: true, reason: 'not_configured_or_no_order' };

  const idempotencyKey = `book-invoice-${booking.id}`;
  // Square requires payment_requests + accepted_payment_methods on invoice
  // creation even for an unpublished draft -- confirmed live 2026-09-16
  // (400 MISSING_REQUIRED_PARAMETER on both without them). due_date is
  // itself required on a BALANCE request; 14 days out is a placeholder,
  // same spirit as the $0 line item -- Matt sets the real due date, price,
  // and accepted methods when he reviews and publishes from the dashboard.
  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const data = await squareRequest(env, '/v2/invoices', {
    idempotency_key: idempotencyKey,
    invoice: {
      location_id: env.SQUARE_LOCATION_ID,
      order_id: orderId,
      title: `UMRT service request -- ${booking.fullName || booking.name || ''}`.trim(),
      description: booking.issue,
      delivery_method: 'EMAIL',
      payment_requests: [
        { request_type: 'BALANCE', due_date: dueDate, tipping_enabled: false },
      ],
      accepted_payment_methods: {
        card: true,
        square_gift_card: false,
        bank_account: false,
        buy_now_pay_later: false,
        cash_app_pay: true,
      },
    },
  });
  const invoice = data.invoice || {};
  return {
    skipped: false,
    invoiceId: invoice.id,
    invoiceUrl: invoice.public_url,
    status: invoice.status, // Square returns 'DRAFT' here -- never touched again by this code
  };
}

/**
 * Builds and creates a Square Order for a shop quote request -- Phase 3,
 * 2026-09-14. One line item per cart product, using the site's own
 * verified reference retail_price (already validated server-side in
 * quote.js against the products table -- never client-supplied) as a
 * STARTING price on the draft, not a final one: every note says so, and
 * (same rule as bookings) nothing here ever calls Square's publish
 * endpoint. Matt confirms/adjusts real pricing before sending anything.
 * A product with no retail_price on file gets no price on its line item,
 * same as the booking flow's unpriced diagnostic line.
 */
export async function createDraftOrderForQuote(env, quote, items) {
  if (!isConfigured(env)) return { skipped: true, reason: 'not_configured' };
  if (!items || !items.length) return { skipped: true, reason: 'no_items' };

  const idempotencyKey = `quote-order-${quote.id}`;

  const lineItems = items.map(({ product, quantity }) => {
    const item = {
      name: `${product.manufacturer} ${product.title}`.trim().slice(0, 512),
      quantity: String(quantity || 1),
      note: 'Reference price only -- confirm before publishing'.slice(0, 500),
    };
    // base_price_money is required by Square on every ad-hoc line item, not
    // just priced ones -- confirmed live 2026-09-16 (see createDraftOrder's
    // note above). $0 for an unpriced product is a placeholder Matt
    // overwrites before publishing, same as the "Reference price only" note
    // already says.
    item.base_price_money =
      typeof product.retail_price === 'number' && product.retail_price > 0
        ? { amount: Math.round(product.retail_price * 100), currency: 'USD' }
        : { amount: 0, currency: 'USD' };
    return item;
  });

  const data = await squareRequest(env, '/v2/orders', {
    idempotency_key: idempotencyKey,
    order: {
      location_id: env.SQUARE_LOCATION_ID,
      reference_id: quote.id,
      line_items: lineItems,
    },
  });
  return { skipped: false, orderId: data.order && data.order.id };
}

/**
 * Convenience wrapper for quote.js: best-effort, never throws. Returns
 * { attempted, orderId, invoiceId, invoiceUrl, status, error }.
 */
export async function createDraftEstimateForQuote(env, quote, items) {
  if (!isConfigured(env)) return { attempted: false };
  try {
    const order = await createDraftOrderForQuote(env, quote, items);
    if (order.skipped) return { attempted: false };
    const rig = [quote.rvYear, quote.rvMake, quote.rvModel].filter(Boolean).join(' ');
    const invoice = await createDraftInvoice(env, order.orderId, {
      fullName: quote.name,
      issue: [rig && `Rig: ${rig}`, quote.location && `Location: ${quote.location}`, quote.notes]
        .filter(Boolean).join(' | ') || 'Shop quote request',
    });
    return {
      attempted: true,
      orderId: order.orderId,
      invoiceId: invoice.invoiceId,
      invoiceUrl: invoice.invoiceUrl,
      status: invoice.status,
    };
  } catch (err) {
    // Best-effort by design -- a Square hiccup must never block the
    // customer's quote confirmation (same principle as createDraftEstimateForBooking).
    return { attempted: true, error: String(err && err.message || err) };
  }
}

/**
 * Convenience wrapper for book.js: best-effort, never throws. Returns
 * { attempted, orderId, invoiceId, invoiceUrl, status, error }.
 */
export async function createDraftEstimateForBooking(env, booking) {
  if (!isConfigured(env)) {
    return { attempted: false };
  }
  try {
    const order = await createDraftOrder(env, booking);
    if (order.skipped) return { attempted: false };
    const invoice = await createDraftInvoice(env, order.orderId, booking);
    return {
      attempted: true,
      orderId: order.orderId,
      invoiceId: invoice.invoiceId,
      invoiceUrl: invoice.invoiceUrl,
      status: invoice.status,
    };
  } catch (err) {
    // Best-effort by design -- a Square hiccup must never block the
    // customer's booking confirmation (same principle as the existing
    // PORTAL_DB write in book.js).
    return { attempted: true, error: String(err && err.message || err) };
  }
}

/**
 * Inventory sync -- SKELETON, 2026-09-14, not wired to any cron/endpoint yet.
 *
 * Direction is READ from Square, WRITE to D1 -- never the reverse. Square's
 * catalog/inventory are the source of truth Matt manages from the Square
 * dashboard/POS; this only pulls stock/price reference data into `products`
 * so /shop/ pages (functions/api/shop/*.js, which already SELECT straight
 * from `products`) can reflect it. Nothing here ever calls a Square catalog
 * or inventory WRITE endpoint -- catalog is Matt's, not the website's, to
 * change. Requires ITEMS_READ + INVENTORY_READ scopes on the access token.
 *
 * Same no-op-until-configured gate as every other function in this file,
 * and the same raw-fetch pattern (squareRequest) -- no SDK dependency. This
 * repo has no package.json/npm build step at all; introducing the official
 * Square Node SDK would mean adding one from scratch, which is a bigger,
 * separate decision than writing this function.
 *
 * Needs migration 015 (products.square_catalog_object_id) applied first so
 * matched items can be upserted by ID instead of by name.
 */
export async function searchSquareCatalogItems(env, cursor) {
  if (!isConfigured(env)) return { skipped: true, reason: 'not_configured' };
  const data = await squareRequest(env, '/v2/catalog/search', {
    object_types: ['ITEM', 'ITEM_VARIATION'],
    include_related_objects: false,
    cursor: cursor || undefined,
    limit: 100,
  });
  return { skipped: false, objects: data.objects || [], cursor: data.cursor || null };
}

export async function getSquareInventoryCounts(env, catalogObjectIds) {
  if (!isConfigured(env)) return { skipped: true, reason: 'not_configured' };
  if (!catalogObjectIds || !catalogObjectIds.length) return { skipped: false, counts: [] };
  const data = await squareRequest(env, '/v2/inventory/counts/batch-retrieve', {
    catalog_object_ids: catalogObjectIds,
    location_ids: [env.SQUARE_LOCATION_ID],
  });
  return { skipped: false, counts: data.counts || [] };
}

/**
 * Orchestrates a single pull-and-upsert pass.
 *
 * Match key is SKU, as specified -- but checked live against real data
 * first (2026-09-14): only 2 of 34 products in `products` currently have
 * a non-null `sku`. That's not a bug in this function, it's the actual
 * state of the catalog -- most rows were hand-seeded from supplier feeds
 * (commerce/sync.py) or cited public pricing (004/011/013_*.sql) without
 * a SKU on file. Practical effect: this sync will only touch ~6% of the
 * catalog until more SKUs are backfilled. A Square variation with no
 * matching D1 SKU is SKIPPED and counted, never fuzzy-matched by name and
 * never used to auto-create a new product -- a wrong SKU match would
 * silently overwrite the wrong item's price, which is worse than no sync.
 *
 * Updates retail_price + stock_status (there's no numeric stock_count
 * column -- see products schema; Square's quantity is mapped to the
 * existing 'in_stock' / 'special_order' enum, documented inline below).
 * price_source is overwritten too, on purpose: leaving the old hand-
 * verified citation in place while silently changing the price next to
 * it would make the provenance field actively misleading.
 */
export async function syncShopInventoryFromSquare(env, db) {
  if (!isConfigured(env)) return { attempted: false };
  try {
    let cursor;
    const allItems = [];
    do {
      const page = await searchSquareCatalogItems(env, cursor);
      allItems.push(...page.objects);
      cursor = page.cursor;
    } while (cursor);

    const variations = allItems.filter((o) => o.type === 'ITEM_VARIATION');
    const variationIds = variations.map((o) => o.id);
    const { counts } = await getSquareInventoryCounts(env, variationIds);

    const countByObjectId = new Map();
    for (const c of counts) {
      if (c.state === 'IN_STOCK') countByObjectId.set(c.catalog_object_id, Number(c.quantity) || 0);
    }

    const now = new Date().toISOString();
    let matched = 0;
    let updated = 0;
    let skippedNoSku = 0;
    let skippedNoMatch = 0;

    for (const v of variations) {
      const data = v.item_variation_data || {};
      const sku = (data.sku || '').trim();
      if (!sku) { skippedNoSku++; continue; }

      const existing = await db
        .prepare('SELECT id FROM products WHERE sku = ? LIMIT 1')
        .bind(sku)
        .first();
      if (!existing) { skippedNoMatch++; continue; }
      matched++;

      const qty = countByObjectId.has(v.id) ? countByObjectId.get(v.id) : null;
      // No numeric stock_count column exists (see products schema) -- map
      // Square's quantity onto the existing enum. qty > 0 -> in_stock;
      // qty === 0 -> special_order (still orderable, not assumed dead);
      // no IN_STOCK count returned at all -> leave stock_status untouched
      // rather than guess.
      const stockStatus = qty === null ? null : (qty > 0 ? 'in_stock' : 'special_order');

      const priceMoney = data.price_money;
      const retailPrice = priceMoney && typeof priceMoney.amount === 'number'
        ? priceMoney.amount / 100
        : null;

      const sets = ['square_catalog_object_id = ?', 'square_stock_synced_at = ?', 'updated_at = ?'];
      const binds = [v.id, now, now];
      if (stockStatus !== null) { sets.push('stock_status = ?'); binds.push(stockStatus); }
      if (retailPrice !== null) {
        sets.push('retail_price = ?', 'price_source = ?');
        binds.push(retailPrice, `Square catalog sync, ${now}`);
      }
      binds.push(existing.id);

      await db.prepare(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
      updated++;
    }

    return {
      attempted: true,
      itemsSeen: allItems.length,
      variationsSeen: variations.length,
      matched,
      updated,
      skippedNoSku,
      skippedNoMatch,
    };
  } catch (err) {
    return { attempted: true, error: String(err && err.message || err) };
  }
}
