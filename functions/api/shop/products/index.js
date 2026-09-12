/**
 * GET /api/shop/products?category=rv-batteries
 * Public, published products only (active = 1). Never returns cost/margin.
 */
import { json } from '../../../_lib/authz.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured', products: [] }, 503);

  const url = new URL(request.url);
  const category = (url.searchParams.get('category') || '').trim().slice(0, 60);

  let sql = `SELECT id, sku, manufacturer, model, title, description, category, product_type,
      retail_price, price_source, stock_status, installation_required, image_key
    FROM products WHERE active = 1`;
  const args = [];
  if (category) {
    sql += ` AND category = ?`;
    args.push(category);
  }
  sql += ` ORDER BY category, manufacturer, title`;

  const { results } = await env.DB.prepare(sql).bind(...args).all();
  return json({ success: true, products: results });
}
