/**
 * GET /api/admin/analytics — real traffic + engagement numbers as JSON,
 * for anything that needs them (the ops dashboard, a future cron refresh,
 * a quick check) instead of hand-run GraphQL/D1 queries each time.
 *
 * Auth: same pattern as /api/admin/sync-square-inventory.js -- mod
 * session, or X-Sync-Secret matching SYNC_ADMIN_SECRET (already set).
 * Reused deliberately rather than minting a new secret for this too.
 */
import { readSession } from '../../_lib/session.js';
import { getZoneTraffic, getEngagement } from '../../_lib/analytics.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function isAuthorized(request, env) {
  const secret = request.headers.get('X-Sync-Secret') || '';
  if (env.SYNC_ADMIN_SECRET && secret === env.SYNC_ADMIN_SECRET) return true;

  const session = await readSession(request, env.SESSION_SECRET);
  if (!session) return false;
  const user = await env.DB.prepare('SELECT is_mod FROM users WHERE id = ?').bind(session.uid).first();
  return !!(user && user.is_mod);
}

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.DB) return json({ success: false, error: 'not_configured' }, 503);
  if (!(await isAuthorized(request, env))) return json({ success: false, error: 'forbidden' }, 403);

  try {
    const [traffic, engagement] = await Promise.all([
      getZoneTraffic(env),
      getEngagement(env),
    ]);
    return json({ success: true, generated_at: new Date().toISOString(), traffic, engagement });
  } catch (err) {
    return json({ success: false, error: String(err && err.message || err) }, 500);
  }
}
