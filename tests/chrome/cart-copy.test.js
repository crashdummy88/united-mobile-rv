/**
 * /shop/cart customer copy + quote-form shell.
 * Run: node tests/chrome/cart-copy.test.js
 */
import { test, run, assert } from '../lib/tiny-test.js';
import { readFileSync } from 'node:fs';
import { onRequestGet } from '../../functions/shop/cart.js';
import { PREFER_TEXT_LABEL } from '../../functions/_lib/mesh-chrome.js';

function src(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

function visibleHtml(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

function customerFacingScriptCopy(html) {
  const body = (html.match(/<script>\s*\(function \(\) \{([\s\S]*?)\}\)\(\);\s*<\/script>/) || [])[1] || '';
  return [
    ...body.matchAll(/status\.textContent = ([^;]+);/g),
    ...body.matchAll(/innerHTML = ([^;]+);/g),
    ...body.matchAll(/emptyStateHtml\(\) \{([\s\S]*?)return /g),
  ].map((m) => m[1]);
}

const html = await (await onRequestGet({
  request: new Request('https://shop.unitedmobilerv.com/shop/cart'),
})).text();

test('cart page renders a quote-request shell, not live checkout', () => {
  const visible = visibleHtml(html);
  assert.match(visible, /Your Cart/);
  assert.match(visible, /Nothing here is a live checkout/);
  assert.match(visible, /Request a quote for this cart/);
  assert.match(visible, /id="quote-form"/);
  assert.match(html, /\/api\/shop\/quote/);
  assert.match(html, /qf-turnstile/);
  assert.match(html, /challenges\.cloudflare\.com\/turnstile/);
  assert.doesNotMatch(visible, /checkout now|pay now|place order/i);
});

test('customer-visible cart copy has no ASCII double-dashes or em-dash stand-ins', () => {
  const visible = visibleHtml(html);
  assert.doesNotMatch(visible, / -- /);
  assert.doesNotMatch(visible, /[—–]/);
  for (const s of customerFacingScriptCopy(html)) {
    assert.doesNotMatch(s, / -- /, `customer JS copy still has double-dash: ${s}`);
    assert.doesNotMatch(s, /[—–]/, `customer JS copy still has dash stand-in: ${s}`);
  }
});

test('quote fields use visible labels, not placeholders alone', () => {
  const visible = visibleHtml(html);
  assert.match(visible, /<label for="qf-name">Your name/);
  assert.match(visible, /<label for="qf-phone">Phone/);
  assert.match(visible, /<label for="qf-email">Email/);
  assert.match(visible, /<label for="qf-location">City \/ State/);
  assert.match(visible, /<label for="qf-rig">RV year \/ make \/ model/);
  assert.match(visible, /<label for="qf-notes">Anything else we should know\?/);
  assert.doesNotMatch(html, /id="qf-name"[^>]*placeholder=/);
});

test('service tiers use a title plus small description, not a double-dash', () => {
  const visible = visibleHtml(html);
  assert.match(visible, /<strong>Hardware only<\/strong><small>Ships to you\. You install\.<\/small>/);
  assert.match(visible, /<strong>Hardware \+ remote configuration<\/strong><small>We configure it with you remotely\.<\/small>/);
  assert.match(visible, /<strong>Hardware \+ UMRT installation<\/strong><small>We install it on-site\.<\/small>/);
  assert.match(visible, /<strong>Full system design \+ installation<\/strong><small>We design the whole system around this and install it\.<\/small>/);
  assert.match(visible, /How should we handle this/);
  assert.doesNotMatch(visible, /Hardware only<\/strong>\s*--/);
});

test('empty-state and submit-error copy stay customer voice with Prefer Text', () => {
  assert.match(html, /Nothing in this cart yet/);
  assert.match(html, /Browse the shop/);
  assert.match(html, /Name and a phone or email are required\./);
  assert.ok(
    html.includes(`Could not submit. ${PREFER_TEXT_LABEL} and we will take the request that way.`),
    'submit error should keep Prefer Text without a double-dash'
  );
  assert.ok(visibleHtml(html).includes(PREFER_TEXT_LABEL), 'quote section should surface Prefer Text');
});

test('quote API success message has no customer-facing double-dash', () => {
  const quote = src('functions/api/shop/quote.js');
  assert.match(quote, /Got it\. Our team will follow up with a real quote, not an automatic charge\./);
  assert.doesNotMatch(quote, /Got it -- /);
});

await run();
