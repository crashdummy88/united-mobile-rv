/**
 * Shop → WP Field Guide wiring: only published unitedmobilerv.com/guide/
 * URLs, Book → Square unchanged. Run: node tests/chrome/field-guides.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';
import {
  FIELD_GUIDES_HREF,
  WP_FIELD_GUIDES,
  wpGuideHref,
  wpGuide,
  relatedGuidesForService,
  relatedGuidesForProduct,
  relatedGuidesMarkup,
} from '../../functions/_lib/field-guides.js';
import { MESH_LINKS } from '../../functions/_lib/mesh-chrome.js';
import { onRequestGet } from '../../functions/shop/p/[id].js';

function src(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

test('hub + every mapped slug is a published WP /guide/ URL', () => {
  assert.equal(FIELD_GUIDES_HREF, 'https://unitedmobilerv.com/guide/');
  assert.equal(wpGuideHref('generator-troubleshooting'), 'https://unitedmobilerv.com/guide/generator-troubleshooting/');
  assert.equal(wpGuideHref('peplink-multi-wan-guide'), '');
  assert.equal(wpGuideHref('not-a-real-guide'), '');
  assert.equal(wpGuide('invented-slug'), null);
  for (const slug of Object.keys(WP_FIELD_GUIDES)) {
    assert.match(wpGuideHref(slug), /^https:\/\/unitedmobilerv\.com\/guide\/[a-z0-9-]+\/$/);
    assert.doesNotMatch(wpGuideHref(slug), /pages\.dev/);
  }
});

test('service SKUs map to the live guides Matt named (no invented URLs)', () => {
  const gen = relatedGuidesForService({ id: 'generator-maintenance' });
  assert.equal(gen[0].href, 'https://unitedmobilerv.com/guide/generator-troubleshooting/');
  assert.ok(gen.some((g) => g.slug === 'generator-manufacturer-guide'));

  assert.equal(relatedGuidesForService({ id: 'starlink-installation' })[0].href, 'https://unitedmobilerv.com/guide/starlink-rv-guide/');
  assert.equal(relatedGuidesForService({ id: 'cellular-booster-installation' })[0].href, 'https://unitedmobilerv.com/guide/weboost-install-guide/');

  const solar = relatedGuidesForService({ id: 'solar-system-installation' }).map((g) => g.slug);
  assert.ok(solar.includes('solar-sizing-installation-guide'));
  assert.ok(solar.includes('solar-battery-troubleshooting'));

  const victron = relatedGuidesForService({ id: 'victron-system-build' }).map((g) => g.slug);
  assert.ok(victron.includes('victron-fault-code-guide'));

  const winter = relatedGuidesForService({ id: 'winterization-travel-trailer' }).map((g) => g.slug);
  assert.ok(winter.includes('winterization-guide'));
  assert.ok(winter.includes('spring-dewinterization-checklist'));

  const appliance = relatedGuidesForService({ id: 'appliance-diagnosis-repair' }).map((g) => g.slug);
  assert.ok(appliance.includes('rv-furnace-troubleshooting-guide'));
  assert.ok(appliance.includes('coleman-mach-ac-guide'));

  assert.equal(relatedGuidesForService({ id: 'no-such-sku' }).length, 0);
});

test('product category + manufacturer overlays stay on WP /guide/', () => {
  const victron = relatedGuidesForProduct({
    category: 'rv-power-protection',
    manufacturer: 'Victron Energy',
  });
  assert.ok(victron.some((g) => g.slug === 'victron-fault-code-guide'));
  assert.ok(victron.every((g) => g.href.startsWith('https://unitedmobilerv.com/guide/')));
  assert.ok(victron.length <= 3);

  const weboost = relatedGuidesForProduct({
    category: 'rv-connectivity',
    manufacturer: 'weBoost',
  });
  assert.ok(weboost.some((g) => g.slug === 'weboost-install-guide'));

  const unknown = relatedGuidesForProduct({ category: 'not-a-category', manufacturer: 'Acme' });
  assert.equal(unknown.length, 0);
});

test('markup is a quiet Guide text link, not a button, and drops unknown slugs', () => {
  const html = relatedGuidesMarkup(relatedGuidesForService({ id: 'generator-maintenance' }));
  assert.match(html, /class="shop-related-guides"/);
  assert.match(html, />Guide</);
  assert.doesNotMatch(html, /Related guides/i);
  assert.doesNotMatch(html, /WP Field Guides/i);
  assert.doesNotMatch(html, /Field guides/i);
  assert.match(html, /unitedmobilerv\.com\/guide\/generator-troubleshooting\//);
  assert.doesNotMatch(html, /Book this service/);
  assert.doesNotMatch(html, /text-link/);
  assert.doesNotMatch(html, /btn /);
  assert.doesNotMatch(html, /href="\/guide\//);
  assert.equal(relatedGuidesMarkup([]), '');
  assert.equal(relatedGuidesMarkup([{ href: 'https://evil.example/x', label: 'Nope' }]), '');
});

test('shared mesh chrome links Guides to the apex hub; Book stays Square', () => {
  assert.deepEqual(MESH_LINKS.map((l) => l.label), ['Home', 'Services', 'Guides', 'Shop', 'Book', 'Forum', 'Software', 'Docs']);
  assert.ok(MESH_LINKS.findIndex((l) => l.label === 'Services') < MESH_LINKS.findIndex((l) => l.label === 'Guides'));
  assert.ok(MESH_LINKS.findIndex((l) => l.label === 'Guides') < MESH_LINKS.findIndex((l) => l.label === 'Shop'));
  assert.ok(MESH_LINKS.findIndex((l) => l.label === 'Shop') < MESH_LINKS.findIndex((l) => l.label === 'Book'));
  assert.equal(MESH_LINKS.find((l) => l.key === 'guides').href, 'https://unitedmobilerv.com/guide/');
  assert.equal(MESH_LINKS.find((l) => l.key === 'services').href, 'https://unitedmobilerv.com/services/');
  assert.ok(!MESH_LINKS.some((l) => /portal|status/i.test(l.label) || /portal|status/i.test(l.key)));
  assert.ok(!MESH_LINKS.some((l) => /field guides/i.test(l.label)));
  const book = src('functions/_lib/mesh-chrome.js');
  assert.match(book, /BOOK_PUBLIC_HREF = SQUARE_BOOK_URL/);
  assert.equal(MESH_LINKS.find((l) => l.key === 'book').href, 'https://united-mobile-rv-llc.square.site/');
  assert.doesNotMatch(MESH_LINKS.find((l) => l.key === 'book').href, /book\.unitedmobilerv\.com/);
  assert.doesNotMatch(book, /href="\/guide\//);
  assert.match(book, /MAIN_GUIDES_HREF = 'https:\/\/unitedmobilerv\.com\/guide\/'/);
  assert.match(book, /label: MAIN_GUIDES_LABEL/);
  assert.doesNotMatch(book, /label: 'Field guides'/);
  assert.doesNotMatch(book, /FIELD_GUIDES_HREF/);
});

test('product page has no related-guide chrome; Book stays Square', async () => {
  const product = {
    id: 'victron-smartsolar-mppt',
    sku: null,
    manufacturer: 'Victron Energy',
    model: 'SmartSolar MPPT',
    title: 'Victron SmartSolar MPPT Charge Controller',
    description: 'Solar charge controller.',
    category: 'rv-power-protection',
    product_type: 'individual',
    retail_price: 65.45,
    price_source: 'artek.energy',
    stock_status: 'unverified',
    installation_required: 1,
    compatibility: null,
    image_url: null,
  };
  const env = {
    DB: {
      prepare() {
        return {
          bind() { return this; },
          async first() { return product; },
          async all() { return { results: [] }; },
        };
      },
    },
  };
  const res = await onRequestGet({
    env,
    params: { id: product.id },
    request: new Request('https://shop.unitedmobilerv.com/shop/p/victron-smartsolar-mppt'),
  });
  assert.equal(res.status, 200);
  const html = await res.text();
  const main = html.match(/<main[\s\S]*<\/main>/)[0];
  const header = html.match(/<header[\s\S]*?<\/header>/)[0];
  assert.doesNotMatch(main, /Related guides/i);
  assert.doesNotMatch(html, /shop-related-guides/);
  assert.doesNotMatch(main, /unitedmobilerv\.com\/guide\//);
  assert.match(header, /href="https:\/\/unitedmobilerv\.com\/guide\/"[^>]*>Guides</);
  assert.doesNotMatch(html, /Field guides/i);
  assert.doesNotMatch(html, /WP Field Guides/i);
  assert.doesNotMatch(html, /href="\/guide\//);
  assert.match(html, /united-mobile-rv-llc\.square\.site\/" target="_blank" rel="noopener">Book</);
});

await run();
