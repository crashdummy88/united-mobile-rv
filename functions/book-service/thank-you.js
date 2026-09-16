/**
 * GET /book-service/thank-you/ -- host-aware thank-you so book. chrome
 * does not reintroduce mothership mega-nav (those links 301 home there).
 */
import { renderBookThankYou } from '../_lib/book-suite.js';

export async function onRequestGet(context) {
  return renderBookThankYou(context.request);
}
