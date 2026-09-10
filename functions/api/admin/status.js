/**
 * GET/POST /api/admin/status — mod-only. Updates the shared status row.
 */
import { readSession } from '../../_lib/session.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function requireMod(request, env) {
  const session = await readSession(request, env.SESSION_SECRET);
  if (!session) return null;
  const user = await env.DB.prepare('SELECT is_mod FROM users WHERE id = ?').bind(session.uid).first();
  return user && user.is_mod ? session : null;
}

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.DB || !env.SESSION_SECRET) return json({ success: false, error: 'not_configured' }, 503);
  const session = await requireMod(request, env);
  if (!session) return json({ success: false, error: 'forbidden' }, 403);

  const status = await env.DB.prepare('SELECT * FROM site_status WHERE id = 1').first();
  const { results: pricing } = await env.DB.prepare('SELECT * FROM pricing ORDER BY sort_order ASC').all();
  return json({ success: true, status, pricing });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.DB || !env.SESSION_SECRET) return json({ success: false, error: 'not_configured' }, 503);
  const session = await requireMod(request, env);
  if (!session) return json({ success: false, error: 'forbidden' }, 403);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'invalid_json' }, 400);
  }

  if (body.status) {
    const s = body.status;
    await env.DB.prepare(
      `UPDATE site_status SET active_corridor = ?, case_by_case = ?, current_location = ?, status_note = ?, hours = ?, updated_at = datetime('now'), updated_by = ? WHERE id = 1`
    )
      .bind(
        s.active_corridor || '',
        s.case_by_case || '',
        s.current_location || '',
        s.status_note || '',
        s.hours || '',
        session.name
      )
      .run();
  }

  if (Array.isArray(body.pricing)) {
    for (const p of body.pricing) {
      if (!p.key) continue;
      await env.DB.prepare(
        `UPDATE pricing SET label = ?, amount = ?, note = ?, updated_at = datetime('now') WHERE key = ?`
      )
        .bind(p.label || '', p.amount || '', p.note || '', p.key)
        .run();
    }
  }

  return json({ success: true });
}
