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
