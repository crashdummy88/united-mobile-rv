/**
 * Homepage Credentials band: four partner logo images, no text stubs.
 * Run: node tests/chrome/home-credentials.test.js
 */
import { readFileSync, existsSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';

function src(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

const home = src('index.html');
const band = (home.match(/<section class="band band-tight" aria-label="Credentials">[\s\S]*?<\/section>/) || [''])[0];

test('credentials band has four cred-pill logo images', () => {
  assert.ok(band, 'missing Credentials section');
  const pills = band.match(/<a class="cred-pill"/g) || [];
  assert.equal(pills.length, 4, `expected 4 cred-pill links, got ${pills.length}`);
  const imgs = band.match(/<img [^>]+>/g) || [];
  assert.equal(imgs.length, 4, `expected 4 logo imgs, got ${imgs.length}`);
  assert.doesNotMatch(band, /cred-text/);
  assert.doesNotMatch(band, /Starlink Certified/i);
});

test('credential alts, assets, and destinations are honest', () => {
  assert.match(band, /href="\/victron\/"[^>]*>\s*<img[^>]+alt="Victron Professional Certified Installer"/);
  assert.match(band, /href="\/wireless\/"[^>]*>\s*<img[^>]+alt="Peplink Certified Associate"/);
  assert.match(band, /href="\/wireless\/"[^>]*>\s*<img[^>]+alt="weBoost Authorized Installer"/);
  assert.match(band, /href="\/service\/"[^>]*>\s*<img[^>]+alt="Dometic Professional Certified"/);
  assert.match(band, /src="\/assets\/brand\/victron-certified-installer\.webp"/);
  assert.match(band, /src="\/assets\/brand\/peplink-certified-associate\.webp"/);
  assert.match(band, /src="\/assets\/brand\/weboost-authorized\.webp"/);
  assert.match(band, /src="\/assets\/brand\/dometic-professional\.webp"/);
});

test('partner logo files exist under assets/brand', () => {
  const files = [
    'assets/brand/victron-certified-installer.webp',
    'assets/brand/peplink-certified-associate.webp',
    'assets/brand/weboost-authorized.webp',
    'assets/brand/weboost-authorized.png',
    'assets/brand/dometic-professional.webp',
    'assets/brand/dometic-professional.png',
  ];
  for (const rel of files) {
    const path = new URL('../../' + rel, import.meta.url);
    assert.ok(existsSync(path), `missing ${rel}`);
  }
});

await run();
