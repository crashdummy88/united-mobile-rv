/**
 * Shop / forum / book bodies carry WP-depth facts, not thin stubs.
 * Run: node tests/chrome/island-substance.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';
import {
  techVoiceSection,
  diagnosticProcessSection,
  serviceLinesSection,
  troubleshootingSection,
  quoteFirstSection,
  bookHeroHtml,
  shopPartsIntroHtml,
} from '../../functions/_lib/island-substance.js';
import { renderBookSuite } from '../../functions/_lib/book-suite.js';
import { islandHeader } from '../../functions/_lib/mesh-chrome.js';

function src(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

test('substance helpers carry WP facts, not outbound-only stubs', () => {
  const tech = techVoiceSection();
  assert.match(tech, /owner and lead technician/i);
  assert.match(tech, /Liebherr Aerospace/);
  assert.match(tech, /Victron Professional Certified Installer/);
  assert.match(tech, /Xentry/);
  assert.doesNotMatch(tech, /href="https:\/\/unitedmobilerv\.com\/tech\/"/);

  const diag = diagnosticProcessSection();
  assert.match(diag, /Thermal imaging/);
  assert.match(diag, /parasitic draw/i);
  assert.match(diag, /108V|voltage drop/);

  const lines = serviceLinesSection();
  assert.match(lines, /MultiPlus/);
  assert.match(lines, /weBoost Authorized Installer/);
  assert.match(lines, /Onan/);
  assert.match(lines, /Starlink installs only/);

  const ts = troubleshootingSection();
  assert.match(ts, /No power/);
  assert.match(ts, /soft deck/);
  assert.match(ts, /city or ZIP/);

  const quote = quoteFirstSection({ variant: 'shop' });
  assert.match(quote, /not a parts store checkout/i);
  assert.match(quote, /Arrange payment/);
  assert.match(quote, /Full system design/);

  assert.match(shopPartsIntroHtml(), /Specify the system/);
  assert.match(bookHeroHtml(), /Book on Square/);
  assert.doesNotMatch(bookHeroHtml(), /BOOK ONLINE/);
});

test('shop listing source includes substance + quote-first, not MAIN HUB chrome', () => {
  const shop = src('functions/shop/index.js');
  assert.match(shop, /island-substance\.js/);
  assert.match(shop, /shopPartsIntroHtml/);
  assert.match(shop, /serviceLinesSection/);
  assert.match(shop, /diagnosticProcessSection/);
  assert.match(shop, /quoteFirstSection/);
  assert.match(src('functions/shop/cart.js'), /diagnosticProcessSection/);
  assert.match(shop, /extraAfterKey: 'shop'/);
  assert.doesNotMatch(shop, /Not a parts store/);
  assert.doesNotMatch(shop, /🔋/);
});

test('book suite HTML is dense WP-ported copy in Pages chrome', async () => {
  const html = renderBookSuite(new Request('https://book.unitedmobilerv.com/'));
  const text = await html.text();
  assert.match(text, /Request a service call/);
  assert.match(text, /Liebherr Aerospace/);
  assert.match(text, /Thermal imaging/);
  assert.match(text, /Victron Professional Certified Installer/);
  assert.match(text, /Book on Square/);
  assert.match(text, /\$175/);
  assert.match(text, />Home</);
  assert.doesNotMatch(text, /brand-text/);
  assert.doesNotMatch(text, /BOOK ONLINE/);
  assert.doesNotMatch(text, /MAIN HUB/);
  const nav = islandHeader({ current: 'book' });
  assert.doesNotMatch(nav, /brand-text/);
});

test('static book-service fallback is dense, not a Square-only stub', () => {
  const book = src('book-service/index.html');
  assert.match(book, /Liebherr Aerospace/);
  assert.match(book, /Thermal imaging/);
  assert.match(book, /MultiPlus/);
  assert.match(book, /No power \/ dead coach/);
  assert.match(book, /Book on Square/);
  assert.match(book, />Home</);
  assert.doesNotMatch(book, /brand-text/);
  assert.doesNotMatch(book, /href="https:\/\/unitedmobilerv\.com\/tech\/"/);
});

test('forum index has on-page tech + diagnostic substance', () => {
  const forum = src('forum/index.html');
  assert.match(forum, /owner and lead technician/i);
  assert.match(forum, /Liebherr Aerospace/);
  assert.match(forum, /Thermal imaging/);
  assert.match(forum, /Victron Professional Certified Installer/);
  assert.match(forum, /No power \/ dead coach/);
  assert.match(forum, /soft deck/);
  assert.match(forum, />Home</);
  assert.doesNotMatch(forum, /brand-text/);
  assert.doesNotMatch(forum, /Founding community/);
  assert.doesNotMatch(forum, /📌/);
});

await run();
