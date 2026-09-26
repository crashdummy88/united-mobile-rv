/**
 * GET /book-service/ -- booking suite (Square + Text Now).
 * book.unitedmobilerv.com 301s every path to Square (see _middleware.js).
 * This handler is the mothership / shop / pages.dev copy of the same page.
 */
import { renderBookSuite } from '../_lib/book-suite.js';

export async function onRequestGet(context) {
  return renderBookSuite(context.request);
}
