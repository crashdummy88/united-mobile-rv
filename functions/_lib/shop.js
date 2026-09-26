/**
 * Shared shop price-display helpers -- added 2026-09-14 alongside the
 * Precision Stack products, which deliberately ship with retail_price =
 * NULL (real pricing needs Matt's review first, same "never fabricate"
 * discipline as commerce/pricing.py). Before this, every template did
 * `$${Number(product.retail_price).toLocaleString()}` with no null check,
 * which renders literal "$0" for a NULL price -- a real, misleading bug,
 * not a cosmetic one. These helpers fix that everywhere retail_price is
 * displayed or totaled.
 */

import { BOOK_PUBLIC_HREF } from './mesh-chrome.js';

export function hasPrice(product) {
  return product && product.retail_price !== null && product.retail_price !== undefined;
}

export function formatPrice(product) {
  return hasPrice(product) ? `$${Number(product.retail_price).toLocaleString()}` : 'Contact for pricing';
}

export function priceNote(product) {
  if (!hasPrice(product)) return 'Priced on request. Contact us for current pricing before you order.';
  // The Square sync stores "Square catalog sync, <ISO timestamp>" in
  // price_source as an internal audit note. Keep it off the page.
  if (/^Square catalog sync\b/i.test(product.price_source || '')) {
    return 'Published reference price. Your quote may differ once availability and shipping are confirmed.';
  }
  return `Published reference price (${product.price_source || 'source on file'}). Your quote may differ once availability and shipping are confirmed.`;
}

/**
 * Product titles sometimes already open with the brand name -- avoid
 * repeating it. Fixed 2026-09-14: this used to only check whether the
 * title started with the *full* manufacturer string, so "Victron Energy"
 * + "Victron GX Touch 50 System Monitor" (title uses the short brand
 * form, not the full company name) missed the overlap and rendered
 * "Victron Energy Victron GX Touch 50..." on every card, the cart, and
 * the product page. Now also checks manufacturer's first word alone.
 */
// Stand-in for a product's card/hero image when it has no image_url yet --
// keeps the shop's visual rhythm uniform without ever presenting a
// placeholder as if it were a real photo of the part.
export const CATEGORY_ICONS = {
  'rv-batteries': '🔋', 'rv-solar': '☀️', 'rv-power-protection': '⚡',
  'rv-connectivity': '📡', 'rv-climate': '❄️', 'rv-refrigeration': '🧊',
  'rv-roof-ventilation': '🌬️', 'rv-precision-stack': '⚙️',
};

/**
 * Services (added 2026-09-15) price display -- separate rules from
 * products' formatPrice/priceNote above: services use price_type
 * ('flat' | 'starting_at' | 'quote') instead of a bare nullable price,
 * since "no price on file" and "this is deliberately quote-only" are
 * different states here (every quote-only service has price_type set
 * on purpose at seed time, not left null by omission).
 */
export function formatServicePrice(service) {
  if (service.price_type === 'quote' || service.price === null || service.price === undefined) {
    return 'Contact for quote';
  }
  const amt = `$${Number(service.price).toLocaleString()}`;
  return service.price_type === 'starting_at' ? `Starting at ${amt}` : amt;
}

/**
 * Availability status display -- added 2026-09-16 for the "frontend
 * polish" pass. Previously this label/description map lived only inline
 * in functions/shop/p/[id].js (product page), so the category grid on
 * functions/shop/index.js pulled `stock_status` from D1 but never
 * rendered it -- dead data, and the one place customers actually browse
 * (the grid, not each individual product page) showed no availability
 * signal at all. Centralized here so both pages render the exact same
 * label/copy for a given status, matching the file's own price-helper
 * pattern above. `cls` picks the chip color in each page's CSS.
 */
const STOCK_STATUS = {
  in_stock: { label: 'In Stock', cls: 'ok', note: 'Currently available.' },
  special_order: { label: 'Special order', cls: 'warn', note: 'Special order. Lead time is confirmed as part of your quote.' },
  unverified: { label: 'Availability unverified', cls: 'muted', note: 'Availability is not yet confirmed with the supplier. It is confirmed as part of your quote.' },
  discontinued: { label: 'Discontinued', cls: 'off', note: 'This item is discontinued; shown for reference only.' },
};

export function stockStatusMeta(product) {
  return (product && STOCK_STATUS[product.stock_status]) || {
    label: 'Contact for Availability', cls: 'muted', note: 'Availability confirmed as part of your quote.',
  };
}

export function displayName(manufacturer, title) {
  const m = String(manufacturer || '').trim();
  const t = String(title || '').trim();
  const tLower = t.toLowerCase();
  const mLower = m.toLowerCase();
  const mFirstWord = mLower.split(/\s+/)[0] || mLower;
  if (tLower.indexOf(mLower) === 0 || (mFirstWord && tLower.indexOf(mFirstWord) === 0)) {
    return t;
  }
  return `${m} ${t}`;
}

/**
 * Square-land allowlist for service "Book this service" hrefs.
 * Owner lock: stay on Square ecosystem URLs. Reject everything else
 * (including javascript:/relative/portal/book-service) so a bad paste
 * cannot take Book off Square. Hosts verified against live Square
 * Online + Appointments + Payment Links -- no catalog IDs invented here.
 */
const SQUARE_LAND_HOST_EXACT = new Set([
  'united-mobile-rv-llc.square.site',
  'app.squareup.com',
  'squareup.com',
  'www.squareup.com',
  'book.squareup.com',
  'square.link',
  'squareupscheduling.com',
  'www.squareupscheduling.com',
]);

function squareLandHostOk(hostname) {
  const host = String(hostname || '').toLowerCase();
  if (SQUARE_LAND_HOST_EXACT.has(host)) return true;
  return (
    host.endsWith('.square.site')
    || host.endsWith('.squareup.com')
    || host.endsWith('.square.link')
    || host.endsWith('.squareupscheduling.com')
  );
}

export function isSquareLandUrl(value) {
  try {
    const u = new URL(String(value || '').trim());
    return u.protocol === 'https:' && squareLandHostOk(u.hostname);
  } catch {
    return false;
  }
}

function appendServiceIntent(href, service) {
  const u = new URL(href);
  const id = String((service && service.id) || '').trim();
  const title = String((service && service.title) || '').trim();
  if (id && !u.searchParams.has('service')) u.searchParams.set('service', id);
  if (title && !u.searchParams.has('service_name')) u.searchParams.set('service_name', title);
  if (!u.searchParams.has('utm_source')) {
    u.searchParams.set('utm_source', 'umrt_shop');
    u.searchParams.set('utm_medium', 'service_card');
    u.searchParams.set('utm_campaign', 'book_this_service');
    if (id) u.searchParams.set('utm_content', id);
  }
  return u.toString();
}

/**
 * Per-card Book href. Preference order (no invented Square item IDs):
 *   1. services.book_url when it is a Square-land https URL (Matt paste)
 *   2. env.SQUARE_BOOKING_URL when set to a Square-land URL (Pages env)
 *   3. Square Online homepage + service/UTM query so the landing URL
 *      carries which SKU was clicked. Default is the homepage (working
 *      "Request an appointment" form), not /s/appointments -- that path
 *      is HTTP 200 but the live widget errors as of 2026-09-17.
 * Header Book stays BOOK_PUBLIC_HREF with no query -- not this helper.
 */
export function serviceBookHref(service, env) {
  const explicit = service && service.book_url;
  if (isSquareLandUrl(explicit)) return String(explicit).trim();

  const fromEnv = env && env.SQUARE_BOOKING_URL;
  const base = isSquareLandUrl(fromEnv)
    ? String(fromEnv).trim()
    : BOOK_PUBLIC_HREF;
  return appendServiceIntent(base, service);
}

/**
 * Optional customer-facing Square Online item URL for a shop part.
 * Only returns a href when a real Square-land URL is already on the row
 * (products.square_item_url). square_catalog_object_id is an internal
 * inventory match key -- it is not a storefront URL and must not be
 * turned into one here. No invented SKUs, no invented /product/ slugs.
 */
export function productSquareHref(product) {
  const explicit = product && product.square_item_url;
  if (isSquareLandUrl(explicit)) return String(explicit).trim();
  return '';
}
