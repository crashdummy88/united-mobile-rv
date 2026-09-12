/**
 * POST /api/shop/quote
 * Phase 1 checkout: no live payment. Captures a real quote request into D1
 * and emails Matt (same Web3Forms pattern as /api/book and /api/chat-lead).
 * Nothing here charges a card or promises live stock.
 *
 * Accepts either:
 *  - a single product:      { product_id, ... }
 *  - a cart of products:    { items: [{ product_id, quantity }, ...], ... }
 * A cart submission is still one quote_requests row; its line items are
 * recorded in quote_request_items.
 */
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
function clean(v, max = 300) {
  return String(v || '').trim().slice(0, max);
}

const MAX_CART_ITEMS = 25;

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured' }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ success: false, error: 'invalid_json' }, 400); }

  const name = clean(body.name, 120);
  const email = clean(body.email, 160);
  const phone = clean(body.phone, 40);
  const location = clean(body.location, 160);
  const rvYear = clean(body.rv_year, 10);
  const rvMake = clean(body.rv_make, 60);
  const rvModel = clean(body.rv_model, 60);
  const serviceOption = ['hardware_only', 'hardware_plus_config', 'hardware_plus_install', 'full_design_install'].includes(body.service_option)
    ? body.service_option : 'hardware_only';
  const notes = clean(body.notes, 1500);

  if (!name || (!email && !phone)) {
    return json({ success: false, error: 'missing_fields', message: 'Name and at least a phone or email are required.' }, 400);
  }

  // Normalize input into a cart line list, whether this came from the
  // single-product quote form or the multi-item cart.
  let requestedItems = [];
  if (Array.isArray(body.items) && body.items.length) {
    requestedItems = body.items
      .slice(0, MAX_CART_ITEMS)
      .map((entry) => ({
        product_id: clean(entry && entry.product_id, 100),
        quantity: Math.max(1, parseInt(entry && entry.quantity, 10) || 1),
      }))
      .filter((entry) => entry.product_id);
  } else {
    const singleId = clean(body.product_id, 100);
    if (singleId) requestedItems = [{ product_id: singleId, quantity: 1 }];
  }

  // Look up each item against real, active products -- never trust a
  // client-supplied title/price. Unknown/inactive product ids are dropped
  // rather than failing the whole submission (a stale cart shouldn't block
  // someone from asking for help).
  const items = [];
  if (requestedItems.length) {
    for (const entry of requestedItems) {
      const product = await env.DB.prepare(
        'SELECT id, title, manufacturer, retail_price FROM products WHERE id = ? AND active = 1'
      ).bind(entry.product_id).first();
      if (product) items.push({ product, quantity: entry.quantity });
    }
  }

  const id = crypto.randomUUID();
  const primaryProductId = items.length ? items[0].product.id : null;

  await env.DB.prepare(
    `INSERT INTO quote_requests (id, product_id, name, email, phone, location, rv_year, rv_make, rv_model, service_option, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, primaryProductId, name, email, phone, location, rvYear, rvMake, rvModel, serviceOption, notes).run();

  for (const { product, quantity } of items) {
    await env.DB.prepare(
      `INSERT OR REPLACE INTO quote_request_items (quote_request_id, product_id, quantity) VALUES (?, ?, ?)`
    ).bind(id, product.id, quantity).run();
  }

  const key = (env.PUBLIC_WEB3FORMS_KEY || env.WEB3FORMS_ACCESS_KEY || '').trim();
  if (key && !key.includes('REPLACE')) {
    try {
      const itemsSummary = items.length
        ? items.map((i) => `${i.quantity}x ${i.product.manufacturer} ${i.product.title} (ref $${i.product.retail_price})`).join('\n')
        : 'general / no specific product';
      const form = new FormData();
      form.append('access_key', key);
      form.append('subject', `UMRT Shop quote request${items.length > 1 ? ` (${items.length} items)` : ''}`);
      form.append('name', name);
      form.append('email', email);
      form.append('phone', phone);
      form.append('location', location);
      form.append('rig', [rvYear, rvMake, rvModel].filter(Boolean).join(' '));
      form.append('service_option', serviceOption);
      form.append('message',
        `New shop quote request.\n\nItems:\n${itemsSummary}\n\nService option: ${serviceOption}\nNotes: ${notes || '(none)'}\n\nThis is a QUOTE REQUEST, not a paid order -- no payment has been collected.`
      );
      form.append('source', 'UMRT Shop');
      context.waitUntil(fetch('https://api.web3forms.com/submit', { method: 'POST', body: form }));
    } catch { /* email is best-effort; the D1 row is the real record */ }
  }

  return json({ success: true, id, item_count: items.length, message: 'Got it -- Matt will follow up with a real quote, not an automatic charge.' });
}
