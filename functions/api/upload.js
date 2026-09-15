/**
 * POST /api/upload — accepts one image (multipart/form-data, field "image"),
 * requires an authenticated session, stores it in R2, returns its key.
 * Images are served back publicly (read-only) via GET /r2/<key>.
 */
import { randomId } from '../_lib/session.js';
import { requireSession } from '../_lib/authz.js';
import { checkRateLimit } from '../_lib/rate-limit.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const MAX_BYTES = 5 * 1024 * 1024; // 5MB per image
// Hard spending guard: R2's free tier is 10GB stored. Stop accepting new
// uploads at 9.5GB so we never cross into billed storage, no matter how
// busy the forum gets. Existing images keep working either way.
const STORAGE_CAP_BYTES = 9.5 * 1024 * 1024 * 1024;

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.MEDIA) return json({ success: false, error: 'not_configured' }, 503);
  if (!env.SESSION_SECRET) return json({ success: false, error: 'not_configured' }, 503);

  // requireSession() (not readSession()) -- re-checks users.banned on every
  // call, same as every other authenticated write route. Fixed 2026-09-15:
  // this previously used readSession() directly, which skipped the ban
  // re-check, letting a banned member keep uploading on an old session
  // cookie for up to 30 days.
  const session = await requireSession(request, env);
  if (!session) return json({ success: false, error: 'auth_required' }, 401);

  // Added 2026-09-15: uploads had no throttle at all -- the heaviest write
  // in the app (R2 storage cost, not just a DB row), so this gets a
  // tighter limit than lighter actions like voting.
  const rl = await checkRateLimit(env, request, { max: 10, windowMinutes: 10, key: 'upload' });
  if (rl.limited) {
    return json({ success: false, error: 'rate_limited', message: 'Too many uploads -- please slow down.', retry_after: rl.retryAfter }, 429);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ success: false, error: 'invalid_form' }, 400);
  }

  const file = form.get('image');
  if (!file || typeof file === 'string') {
    return json({ success: false, error: 'missing_file' }, 400);
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return json({ success: false, error: 'unsupported_type', message: 'Only JPEG, PNG, WEBP, or GIF images are allowed.' }, 400);
  }
  if (file.size > MAX_BYTES) {
    return json({ success: false, error: 'too_large', message: 'Image must be under 5MB.' }, 400);
  }

  if (env.DB) {
    const usage = await env.DB.prepare('SELECT total_bytes FROM media_usage WHERE id = 1').first();
    const currentBytes = usage ? usage.total_bytes : 0;
    if (currentBytes + file.size > STORAGE_CAP_BYTES) {
      return json({
        success: false,
        error: 'storage_full',
        message: "We've hit our monthly photo storage limit — text (616) 606-5277 to send it directly, or post without a photo for now.",
      }, 507);
    }
  }

  const key = `forum/${randomId()}.${ext}`;
  await env.MEDIA.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  if (env.DB) {
    await env.DB.prepare(
      `UPDATE media_usage SET total_bytes = total_bytes + ?, updated_at = datetime('now') WHERE id = 1`
    ).bind(file.size).run();
  }

  return json({ success: true, key });
}
