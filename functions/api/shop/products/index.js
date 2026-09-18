/**
 * GET /api/shop/products?category=rv-batteries&brand=victron&supplier=artek
 * Public, published products only (active = 1). Never returns cost/margin.
 * brand / supplier are filterable tags for the quote-first dropship line.
 */
import { json } from '../../../_lib/authz.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured', products: [] }, 503);

  const url = new URL(request.url);
  const category = (url.searchParams.get('category') || '').trim().slice(0, 60);
  const brand = (url.searchParams.get('brand') || '').trim().slice(0, 40);
  const supplier = (url.searchParams.get('supplier') || '').trim().slice(0, 40);

  const args = [];
  const where = ['active = 1'];

  function applyFilters(sqlBase) {
    let sql = sqlBase;
    if (category) {
      sql += ` AND category = ?`;
      args.push(category);
    }
    if (brand) {
      sql += ` AND (brand_slug = ? OR lower(manufacturer) LIKE ?)`;
      args.push(brand, `%${brand}%`);
    }
    if (supplier) {
      sql += ` AND supplier_id = ?`;
      args.push(supplier);
    }
    sql += ` ORDER BY category, manufacturer, title`;
    return sql;
  }

  try {
    const sql = applyFilters(`SELECT id, sku, sku_kind, manufacturer, model, title, description, category, product_type,
      retail_price, price_source, stock_status, installation_required, image_key, image_url,
      supplier_id, brand_slug
    FROM products WHERE ` + where.join(' AND '));
    const { results } = await env.DB.prepare(sql).bind(...args).all();
    return json({ success: true, products: results });
  } catch (err) {
    const msg = String((err && err.message) || err);
    if (!/no such column:\s*(brand_slug|sku_kind)/i.test(msg)) throw err;
    args.length = 0;
    let sql = `SELECT id, sku, manufacturer, model, title, description, category, product_type,
      retail_price, price_source, stock_status, installation_required, image_key, image_url, supplier_id
    FROM products WHERE active = 1`;
    if (category) {
      sql += ` AND category = ?`;
      args.push(category);
    }
    if (brand) {
      sql += ` AND lower(manufacturer) LIKE ?`;
      args.push(`%${brand}%`);
    }
    if (supplier) {
      sql += ` AND supplier_id = ?`;
      args.push(supplier);
    }
    sql += ` ORDER BY category, manufacturer, title`;
    const { results } = await env.DB.prepare(sql).bind(...args).all();
    return json({ success: true, products: results });
  }
}
