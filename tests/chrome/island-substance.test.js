/**
 * Each island has unique body copy. Shared chrome only.
 * Run: node tests/chrome/island-substance.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';
import {
  quoteFirstSection,
  shopPartsIntroHtml,
  shopSystemsSection,
  shopQuoteNeedsSection,
  bookHeroHtml,
  bookExpectSection,
  bookWhoArrivesSection,
  bookVisitSection,
  bookRequestSection,
  forumHowToAskSection,
  forumEvidenceSection,
  forumRulesSection,
} from '../../functions/_lib/island-substance.js';
import { renderBookSuite } from '../../functions/_lib/book-suite.js';
import { islandHeader } from '../../functions/_lib/mesh-chrome.js';

function src(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

const SHOP_MARKERS = [
  /Specify the system/,
  /not a parts store checkout/i,
  /Hardware only/,
  /daily watt-hours/,
  /Systems we specify/,
];
const BOOK_MARKERS = [
  /Book on Square/,
  /Three steps\. Price before work/,
  /Liebherr Aerospace/,
  /\$225 service deposit/,
  /What to put on Square/,
];
const FORUM_MARKERS = [
  /Write the thread/,
  /How this forum is run/,
  /Evidence in the post/,
  /Not an appointment desk/,
  /One problem per thread/,
];

test('shop helpers are quote/parts/systems — not booking or forum', () => {
  const quote = quoteFirstSection({ variant: 'shop' });
  const systems = shopSystemsSection();
  const needs = shopQuoteNeedsSection();
  const intro = shopPartsIntroHtml();
  const blob = quote + systems + needs + intro;
  for (const re of SHOP_MARKERS) assert.match(blob, re);
  assert.doesNotMatch(blob, /Liebherr Aerospace/);
  assert.doesNotMatch(blob, /Book on Square/);
  assert.doesNotMatch(blob, /How this forum is run/);
  assert.doesNotMatch(blob, /Write the thread/);
  assert.doesNotMatch(blob, /No power \/ dead coach/);
  assert.doesNotMatch(blob, /Three steps/);
  assert.doesNotMatch(intro, /href="https:\/\/unitedmobilerv\.com\/tech\/"/);
});

test('book helpers are appointments + Text — not shop quotes or forum Q&A', () => {
  const blob = bookHeroHtml() + bookExpectSection() + bookWhoArrivesSection() + bookVisitSection() + bookRequestSection();
  for (const re of BOOK_MARKERS) assert.match(blob, re);
  assert.doesNotMatch(blob, /not a parts store checkout/i);
  assert.doesNotMatch(blob, /Hardware only/);
  assert.doesNotMatch(blob, /Specify the system/);
  assert.doesNotMatch(blob, /How this forum is run/);
  assert.doesNotMatch(blob, /Write the thread/);
  assert.doesNotMatch(blob, /No power \/ dead coach/);
  assert.doesNotMatch(bookHeroHtml(), /BOOK ONLINE/);
});

test('forum helpers are community Q&A — not shop or book bodies', () => {
  const blob = forumHowToAskSection() + forumEvidenceSection() + forumRulesSection();
  for (const re of FORUM_MARKERS) assert.match(blob, re);
  assert.doesNotMatch(blob, /Liebherr Aerospace/);
  assert.doesNotMatch(blob, /not a parts store checkout/i);
  assert.doesNotMatch(blob, /Specify the system/);
  assert.doesNotMatch(blob, /\$225 service deposit/);
  assert.doesNotMatch(blob, /Three steps\. Price before work/);
  assert.doesNotMatch(blob, /Systems we specify/);
});

test('shop listing source imports shop sections only', () => {
  const shop = src('functions/shop/index.js');
  assert.match(shop, /island-substance\.js/);
  assert.match(shop, /shopPartsIntroHtml/);
  assert.match(shop, /shopSystemsSection/);
  assert.match(shop, /shopQuoteNeedsSection/);
  assert.match(shop, /quoteFirstSection/);
  assert.match(shop, /extraAfterKey: 'shop'/);
  assert.doesNotMatch(shop, /bookWhoArrivesSection|bookVisitSection|bookRequestSection|publishedRatesSection/);
  assert.doesNotMatch(shop, /forumHowToAskSection|forumEvidenceSection|forumRulesSection/);
  assert.doesNotMatch(shop, /techVoiceSection|diagnosticProcessSection|serviceLinesSection|troubleshootingSection/);
  assert.doesNotMatch(src('functions/shop/cart.js'), /diagnosticProcessSection|bookWhoArrivesSection|forumHowToAskSection/);
  assert.doesNotMatch(src('functions/shop/p/[id].js'), /diagnosticProcessSection|bookVisitSection|forumRulesSection/);
  assert.doesNotMatch(shop, /🔋/);
});

test('book suite HTML is booking-only depth in Pages chrome', async () => {
  const html = renderBookSuite(new Request('https://book.unitedmobilerv.com/'));
  const text = await html.text();
  assert.match(text, /Request a service call/);
  assert.match(text, /Liebherr Aerospace/);
  assert.match(text, /Book on Square/);
  assert.match(text, /What to put on Square/);
  assert.match(text, /\$175/);
  assert.match(text, />Home</);
  assert.doesNotMatch(text, /Specify the system/);
  assert.doesNotMatch(text, /not a parts store checkout/i);
  assert.doesNotMatch(text, /Hardware only/);
  assert.doesNotMatch(text, /How this forum is run/);
  assert.doesNotMatch(text, /Write the thread/);
  assert.doesNotMatch(text, /No power \/ dead coach/);
  assert.doesNotMatch(text, /brand-text/);
  assert.doesNotMatch(text, /BOOK ONLINE/);
  assert.doesNotMatch(text, /MAIN HUB/);
  const nav = islandHeader({ current: 'book' });
  assert.doesNotMatch(nav, /brand-text/);
});

test('static book-service fallback matches booking-only body', () => {
  const book = src('book-service/index.html');
  assert.match(book, /Liebherr Aerospace/);
  assert.match(book, /Book on Square/);
  assert.match(book, /What to put on Square/);
  assert.match(book, /\$225 service deposit/);
  assert.match(book, />Home</);
  assert.doesNotMatch(book, /Specify the system/);
  assert.doesNotMatch(book, /How this forum is run/);
  assert.doesNotMatch(book, /No power \/ dead coach/);
  assert.doesNotMatch(book, /What we actually fix on site/);
  assert.doesNotMatch(book, /brand-text/);
  assert.doesNotMatch(book, /href="https:\/\/unitedmobilerv\.com\/tech\/"/);
});

test('forum index is Q&A depth, not shop spec or book intake', () => {
  const forum = src('forum/index.html');
  assert.match(forum, /Write the thread/);
  assert.match(forum, /Evidence in the post/);
  assert.match(forum, /How this forum is run/);
  assert.match(forum, /Not an appointment desk/);
  assert.match(forum, />Home</);
  assert.doesNotMatch(forum, /Liebherr Aerospace/);
  assert.doesNotMatch(forum, /Specify the system/);
  assert.doesNotMatch(forum, /not a parts store checkout/i);
  assert.doesNotMatch(forum, /\$225 service deposit/);
  assert.doesNotMatch(forum, /Three steps/);
  assert.doesNotMatch(forum, /No power \/ dead coach/);
  assert.doesNotMatch(forum, /Thermal imaging/);
  assert.doesNotMatch(forum, /brand-text/);
  assert.doesNotMatch(forum, /Founding community/);
  assert.doesNotMatch(forum, /📌/);
});

await run();
