/**
 * GET /book-service/ -- booking suite (Square + Text Now).
 * On book.unitedmobilerv.com this path 301s to / (see _middleware.js);
 * this handler is the mothership / shop / pages.dev copy of the same page.
 */
import { renderBookSuite } from '../_lib/book-suite.js';

export async function onRequestGet(context) {
  return renderBookSuite(context.request);
}
