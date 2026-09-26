/**
 * SQUARE BOOKING EMBED — swap the widget in this file only.
 *
 * book.unitedmobilerv.com inserts SQUARE_BOOKING_EMBED_HTML as the booking
 * surface. The fallback link ("Open booking in a new tab") lives in the
 * page shell and uses SQUARE_BOOKING_PAGE_URL, so it stays up if the
 * frame or a future widget fails.
 *
 * Matt: when Square Appointments' official booking widget embed code is
 * ready, replace the HTML string below with that snippet. Do not edit
 * the page shell, shop, or forum to swap it.
 *
 * If the official snippet loads scripts or frames from origins other than
 * the Square hosts already allowed in _headers (frame-src), add those
 * origins there too. The iframe class "book-frame" is sized in
 * functions/_lib/book-landing.js (BOOK_LANDING_CSS).
 */

export const SQUARE_BOOKING_PAGE_URL = 'https://united-mobile-rv-llc.square.site/';

export const SQUARE_BOOKING_EMBED_HTML = `<iframe class="book-frame" src="${SQUARE_BOOKING_PAGE_URL}" title="United Mobile RV booking" allow="payment" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
