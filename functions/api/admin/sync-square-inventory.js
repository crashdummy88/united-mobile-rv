/**
 * POST /api/admin/sync-square-inventory — triggers one pull-and-upsert pass
 * of syncShopInventoryFromSquare() (functions/_lib/square.js).
 *
 * Two callers, two auth paths:
 *   1. A signed-in mod (session cookie + is_mod, same requireMod() pattern
 *      as functions/api/admin/status.js) -- for manually running a sync.
 *   2. The scheduled trigger (see note below) -- no session/cookie exists
 *      for a machine call, so it authenticates with a shared secret header
 *      instead: `X-Sync-Secret: <SYNC_ADMIN_SECRET>`. Scoped to only this
 *      one endpoint, set via `wrangler pages secret put SYNC_ADMIN_SECRET`
 *      -- never hardcoded, never logged.
 *
 * NOTE ON SCHEDULING: Cloudflare Pages Functions have no `scheduled()`
 * handler / Cron Trigger support -- that's a Workers-only feature (its
 * `[triggers]` config expects a `main` entrypoint exporting
 * `{ fetch, scheduled }`, which this Pages project's file-routed
 * `functions/` directory doesn't have). Confirmed against Cloudflare's own
 * docs before writing this, rather than adding a `[triggers]` block to
 * this project's wrangler.toml that would silently do nothing. This
 * endpoint is what a *separate* tiny cron Worker should call -- see the
 * proposed worker in the PR description / chat, not yet created.
 */
import { readSession } from '../../_lib/session.js';
import { syncShopInventoryFromSquare } from '../../_lib/square.js';

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
  if (!env.DB) return json({ success: false, error: 'not_configured' }, 503);
  if (!(await isAuthorized(request, env))) return json({ success: false, error: 'forbidden' }, 403);

  const result = await syncShopInventoryFromSquare(env, env.DB);
  return json({ success: true, result });
}
