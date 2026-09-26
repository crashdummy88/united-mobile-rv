import { readFileSync } from 'node:fs';

/**
 * Read a repo file. Website files live under public/; everything else
 * (functions, db, docs) stays at the root. Tests keep the old relative
 * paths and this checks the root first.
 */
export function readSrc(rel, importMetaUrl) {
  const candidates = [
    new URL(`../../${rel}`, importMetaUrl),
    new URL(`../../public/${rel}`, importMetaUrl),
  ];
  let lastErr;
  for (const url of candidates) {
    try {
      return readFileSync(url, 'utf8');
    } catch (err) {
      lastErr = err;
      if (!err || err.code !== 'ENOENT') throw err;
    }
  }
  throw lastErr;
}
