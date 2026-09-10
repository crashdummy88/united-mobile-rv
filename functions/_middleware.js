/**
 * Sets X-Robots-Tag exactly once per response, path-aware.
 * Replaces the old _headers-based approach: Cloudflare Pages merges
 * X-Robots-Tag across every matching _headers block instead of letting a
 * more specific path win, so a blanket "noindex" on /* and an "index" on
 * /forum/* both got sent at once — and per Google's docs, duplicate
 * X-Robots-Tag headers are combined as a union, so noindex always won
 * regardless of the other value. This middleware builds a single clean
 * header on every response instead.
 */
const INDEXABLE_PREFIXES = ['/forum/', '/forum-live/'];

export async function onRequest(context) {
  const response = await context.next();
  const path = new URL(context.request.url).pathname;
  const indexable = INDEXABLE_PREFIXES.some((p) => path === p.slice(0, -1) || path.startsWith(p));

  const headers = new Headers(response.headers);
  headers.delete('X-Robots-Tag');
  headers.set('X-Robots-Tag', indexable ? 'index, follow' : 'noindex, follow');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
