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
  unverified: { label: 'Availability Unverified', cls: 'muted', note: 'Availability not yet confirmed with the supplier for this order -- confirmed as part of your quote.' },
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
