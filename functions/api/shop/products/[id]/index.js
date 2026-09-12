/**
 * GET /api/shop/products/:id
 * Single published product, plus any real components if it's a kit.
 */
import { json } from '../../../../_lib/authz.js';

export async function onRequestGet(context) {
  const { env, params } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured' }, 503);

  const product = await env.DB.prepare(
    `SELECT id, sku, manufacturer, model, title, description, category, product_type,
       retail_price, price_source, stock_status, installation_required, compatibility, image_key
     FROM products WHERE id = ? AND active = 1`
  ).bind(params.id).first();
  if (!product) return json({ success: false, error: 'not_found' }, 404);

  let components = [];
  if (product.product_type === 'kit') {
    const { results } = await env.DB.prepare(
      `SELECT p.id, p.title, p.manufacturer, p.retail_price, pc.quantity, pc.required
       FROM product_components pc JOIN products p ON p.id = pc.component_id
       WHERE pc.kit_id = ? AND p.active = 1`
    ).bind(params.id).all();
    components = results || [];
  }

  return json({ success: true, product, components });
}
