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
 *
 * URL (checked 2026-09-26): the contact form, not the Appointments
 * calendar. Square has no page that is only a contact form. Published
 * pages are /, /remote, and /repair-agreement. /contact and the
 * book.squareup.com appointment URLs are not a form (/contact is 404;
 * the calendar URLs render "Page not found"). /s/appointments is a
 * broken theme placeholder with a demo street address.
 *
 * The contact form is the homepage block named "Appointment request"
 * (type contact-form): Full Name, Email, Phone Number, Service Location,
 * What Services Do You Need?, Trailer/RV Year,Make,Model. #HjeiGL is
 * that block (short id for c2ee3d80-b196-11f1-994c-e58736b6895a).
 * /remote is a different form (VictronConnect / PowerWatch), not this
 * one. The page sends no X-Frame-Options or frame-ancestors. The
 * landing CSS crops the Square header pinned above this anchor.
 */

export const SQUARE_BOOKING_PAGE_URL = 'https://united-mobile-rv-llc.square.site/#HjeiGL';

export const SQUARE_BOOKING_EMBED_HTML = `<iframe class="book-frame" src="${SQUARE_BOOKING_PAGE_URL}" title="United Mobile RV booking" allow="payment" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
