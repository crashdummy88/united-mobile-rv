/**
 * POST /api/admin/sync-square-invoices — triggers one pass of
 * syncJobInvoiceStatuses() (functions/_lib/square.js), feeding real Square
 * invoice status (paid/canceled/etc.) back into the portal's `jobs` table.
 *
 * Same two-caller, two-auth-path pattern as sync-square-inventory.js:
 *   1. A signed-in mod (session cookie + is_mod).
 *   2. The scheduled trigger, authenticated with X-Sync-Secret matching
 *      SYNC_ADMIN_SECRET (same secret, shared with the inventory sync --
 *      both are internal cron-only endpoints, no reason to split it).
 *
 * Reads from PORTAL_DB (jobs), not DB (forum) -- different database than
 * sync-square-inventory.js, which is why this needs env.DB for the mod
 * check but env.PORTAL_DB for the actual sync.
 */
import { readSession } from '../../_lib/session.js';
import { syncJobInvoiceStatuses } from '../../_lib/square.js';

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

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.PORTAL_DB) return json({ success: false, error: 'not_configured' }, 503);
  if (!(await isAuthorized(request, env))) return json({ success: false, error: 'forbidden' }, 403);

  const result = await syncJobInvoiceStatuses(env);
  return json({ success: true, result });
}
