/**
 * square-inventory-cron -- fires every 6 hours, calls the Pages Function
 * that actually runs the Square -> D1 inventory sync
 * (functions/_lib/square.js::syncShopInventoryFromSquare, via
 * functions/api/admin/sync-square-inventory.js). This Worker does no
 * inventory logic itself -- it's a thin, authenticated trigger, since
 * Cloudflare Pages Functions have no native Cron Trigger support.
 *
 * Auth: SYNC_ADMIN_SECRET (wrangler secret put), sent as X-Sync-Secret --
 * must match the same secret set on the united-mobile-rv Pages project.
 */

const TARGET_URL = 'https://united-mobile-rv.pages.dev/api/admin/sync-square-inventory';

async function runSync(env) {
  if (!env.SYNC_ADMIN_SECRET) {
    console.error('SYNC_ADMIN_SECRET not set -- run: wrangler secret put SYNC_ADMIN_SECRET');
    return { ok: false, reason: 'not_configured' };
  }

  const res = await fetch(TARGET_URL, {
    method: 'POST',
    headers: { 'X-Sync-Secret': env.SYNC_ADMIN_SECRET },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`sync-square-inventory failed (${res.status}):`, JSON.stringify(body));
    return { ok: false, status: res.status, body };
  }

  console.log('sync-square-inventory result:', JSON.stringify(body));
  return { ok: true, body };
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runSync(env));
  },

  // Manual trigger for testing (`wrangler dev --test-scheduled`, or a
  // direct request to the deployed Worker) -- same auth requirement, so
  // this can't be hit by anyone without the secret either.
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('POST only', { status: 405 });
    }
    const result = await runSync(env);
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
