/**
 * Product photo URLs are stored as already-encoded https paths.
 * One extra encode pass turns a space into %2520 (and "(" / ")" into
 * %2528 / %2529). The manufacturer host 404s that path. Undo a single
 * extra encode layer when that pattern is present. Leave a correctly
 * single-encoded URL (%20) unchanged.
 */
export function productImageSrc(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (!/%25(?:20|28|29|2[Cc])/i.test(raw)) return raw;
  return raw.replace(/%25/gi, '%');
}
