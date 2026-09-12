/**
 * POST /api/shop/quote
 * Phase 1 checkout: no live payment. Captures a real quote request into D1
 * and emails Matt (same Web3Forms pattern as /api/book and /api/chat-lead).
 * Nothing here charges a card or promises live stock.
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
  const productId = clean(body.product_id, 100);

  if (!name || (!email && !phone)) {
    return json({ success: false, error: 'missing_fields', message: 'Name and at least a phone or email are required.' }, 400);
  }

  let product = null;
  if (productId) {
    product = await env.DB.prepare('SELECT id, title, retail_price FROM products WHERE id = ? AND active = 1').bind(productId).first();
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO quote_requests (id, product_id, name, email, phone, location, rv_year, rv_make, rv_model, service_option, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, product ? product.id : null, name, email, phone, location, rvYear, rvMake, rvModel, serviceOption, notes).run();

  const key = (env.PUBLIC_WEB3FORMS_KEY || env.WEB3FORMS_ACCESS_KEY || '').trim();
  if (key && !key.includes('REPLACE')) {
    try {
      const form = new FormData();
      form.append('access_key', key);
      form.append('subject', `UMRT Shop quote request: ${product ? product.title : 'general inquiry'}`);
      form.append('name', name);
      form.append('email', email);
      form.append('phone', phone);
      form.append('location', location);
      form.append('rig', [rvYear, rvMake, rvModel].filter(Boolean).join(' '));
      form.append('service_option', serviceOption);
      form.append('message',
        `New shop quote request.\n\nProduct: ${product ? product.title + ' (reference price $' + product.retail_price + ')' : 'general / no specific product'}\nService option: ${serviceOption}\nNotes: ${notes || '(none)'}\n\nThis is a QUOTE REQUEST, not a paid order -- no payment has been collected.`
      );
      form.append('source', 'UMRT Shop');
      context.waitUntil(fetch('https://api.web3forms.com/submit', { method: 'POST', body: form }));
    } catch { /* email is best-effort; the D1 row is the real record */ }
  }

  return json({ success: true, id, message: 'Got it -- Matt will follow up with a real quote, not an automatic charge.' });
}
