/**
 * GET /robots.txt — host-aware so shop / forum / book each advertise
 * the live custom-host sitemap (or none, on book). Static robots.txt
 * is the same body as the preview/default case and is only a fallback
 * if this Function is not invoked.
 */
import { renderRobotsTxt } from './_lib/robots-txt.js';

export async function onRequestGet(context) {
  const hostname = new URL(context.request.url).hostname;
  return new Response(renderRobotsTxt(hostname), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
