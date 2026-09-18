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
  return hasPrice(product)
    ? `Public reference price (${product.price_source || 'source on file'}) -- your actual quote may differ once availability and shipping are confirmed.`
    : 'Custom/premium item -- contact us for current pricing before ordering.';
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
  special_order: { label: 'Special Order', cls: 'warn', note: 'Special order -- lead time confirmed as part of your quote.' },
  unverified: { label: 'Availability Unverified', cls: 'muted', note: 'No confirmed supplier link and no live stock check -- we will not guess. Confirmed as part of your quote.' },
  discontinued: { label: 'Discontinued', cls: 'off', note: 'This item is discontinued; shown for reference only.' },
};

/** Matt's six product-line sources. Brand slug is filterable; supplier_id is who we actually buy from. */
export const LINE_BRANDS = {
  amazon: 'Amazon',
  artek: 'Artek',
  dometic: 'Dometic',
  victron: 'Victron',
  peplink: 'Peplink',
  weboost: 'weBoost',
};

export const LINE_BRAND_ORDER = ['amazon', 'artek', 'dometic', 'victron', 'peplink', 'weboost'];

export const SUPPLIER_LABELS = {
  artek: 'Artek Energy',
  amazon: 'Amazon',
  dometic: 'Dometic',
  victron: 'Victron Energy',
  peplink: 'Peplink',
  weboost: 'weBoost',
};

export const SKU_KIND_LABELS = {
  manufacturer: 'Manufacturer SKU',
  amazon: 'Amazon SKU',
  internal: 'UMRV catalog SKU',
};

const BRAND_SLUG_ALIASES = {
  'victron energy': 'victron',
  victron: 'victron',
  weboost: 'weboost',
  'rich solar': 'rich-solar',
  artek: 'artek',
  amazon: 'amazon',
  dometic: 'dometic',
  peplink: 'peplink',
};

export function brandSlug(manufacturer) {
  const raw = String(manufacturer || '').trim().toLowerCase();
  if (!raw) return '';
  if (BRAND_SLUG_ALIASES[raw]) return BRAND_SLUG_ALIASES[raw];
  const first = raw.split(/\s+/)[0];
  if (BRAND_SLUG_ALIASES[first]) return BRAND_SLUG_ALIASES[first];
  return raw.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function productBrandSlug(product) {
  const tagged = product && String(product.brand_slug || '').trim();
  return tagged || brandSlug(product && product.manufacturer);
}

export function hasSupplierLink(product) {
  return !!(product && String(product.supplier_id || '').trim());
}

export function skuKindLabel(product) {
  const kind = product && product.sku_kind;
  return SKU_KIND_LABELS[kind] || '';
}

export function supplierLabel(supplierId) {
  const id = String(supplierId || '').trim();
  return SUPPLIER_LABELS[id] || id;
}

/**
 * Quote-first shop -- not click-pay-ship. Shared customer-facing copy so
 * listing, product, and cart stay on the same model.
 */
export const QUOTE_MODEL_ONE_LINER = 'Request info. We quote, Matt arranges payment with you, then orders the shipment. Install and VRM are optional add-ons -- nothing is charged here.';

export const QUOTE_FORM_INTRO = 'This is a request for information, not a checkout. We follow up with a real quote. Matt arranges payment with you, then orders the shipment from the supplier. Installation and Victron VRM setup are available as add-ons. No charge happens here. Call or text (616) 606-5277 anytime.';

export function stockStatusMeta(product) {
  if (product && product.stock_status === 'unverified' && hasSupplierLink(product)) {
    return {
      label: 'Confirm at quote',
      cls: 'warn',
      note: 'Linked to a known supplier. Live stock is not polled -- confirmed when we quote, then Matt orders the shipment after payment.',
    };
  }
  return (product && STOCK_STATUS[product.stock_status]) || {
    label: 'Contact for Availability', cls: 'muted', note: 'Availability is unknown until we check with a supplier as part of your quote.',
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
