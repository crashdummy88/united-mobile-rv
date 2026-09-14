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
      'Square-Version': '2025-01-23',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = (data && data.errors && data.errors[0] && data.errors[0].detail) || res.statusText;
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
  const data = await squareRequest(env, '/v2/invoices', {
    idempotency_key: idempotencyKey,
    invoice: {
      location_id: env.SQUARE_LOCATION_ID,
      order_id: orderId,
      title: `UMRT service request -- ${booking.fullName || booking.name || ''}`.trim(),
      description: booking.issue,
      delivery_method: 'EMAIL',
      // No accepted_payment_methods / payment_requests here on purpose --
      // an unpublished draft doesn't need them yet, and Matt sets the real
      // price + terms when he reviews it in the Square dashboard.
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
    if (typeof product.retail_price === 'number' && product.retail_price > 0) {
      item.base_price_money = { amount: Math.round(product.retail_price * 100), currency: 'USD' };
    }
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
