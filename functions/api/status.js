/**
 * GET /api/status — public, read-only, CORS-open.
 * Single source of truth for site_status + pricing, fetched live by
 * united-mobile-rv, umrt-areas, umrt-go, and umrt-quote — so a status/price
 * change made once shows up everywhere, instead of hand-editing every repo.
 */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured' }, 503);

  const status = await env.DB.prepare('SELECT * FROM site_status WHERE id = 1').first();
  const { results: pricing } = await env.DB.prepare(
    'SELECT key, label, amount, note FROM pricing ORDER BY sort_order ASC'
  ).all();

  return json({ success: true, status, pricing });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
  });
}
