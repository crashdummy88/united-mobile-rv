/**
 * GET /r2/<key> — public, read-only proxy to serve forum-uploaded images
 * out of the R2 bucket. No auth (images are meant to be publicly viewable
 * once posted), long cache since keys are random/immutable.
 */
export async function onRequestGet(context) {
  const { env, params } = context;
  if (!env.MEDIA) return new Response('Not configured', { status: 503 });

  const key = Array.isArray(params.path) ? params.path.join('/') : params.path;
  if (!key || !key.startsWith('forum/')) return new Response('Not found', { status: 404 });

  const object = await env.MEDIA.get(key);
  if (!object) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
}
