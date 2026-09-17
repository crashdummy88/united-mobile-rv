/**
 * BUG-F1 / BUG-F2 forum chrome: Ask the Community opens a visible
 * composer or Google sign-in gate; pinned index links the live Field
 * Guide (not the 404 /troubleshoot/ hub). Book stays Square.
 * Run: node tests/chrome/forum-composer.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';
import {
  ELECTRICAL_TS_GUIDE_URL,
  PIN_TROUBLESHOOT_INDEX_BODY,
  PIN_TROUBLESHOOT_INDEX_ID,
  canonicalPinTroubleshootBody,
  renderThreadBodyHtml,
} from '../../functions/_lib/forum-body.js';

const SQUARE = 'https://united-mobile-rv-llc.square.site/';
const GUIDE = 'https://unitedmobilerv.com/guide/electrical-troubleshooting/';

function src(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

test('BUG-F1: #new-thread-form wrapper is not display:none; composer/gate toggle with is-open', () => {
  const html = src('forum/index.html');
  assert.match(html, /id="new-thread-form"/);
  assert.match(html, /id="new-thread-composer"/);
  assert.match(html, /id="new-thread-gate"/);
  assert.match(html, /#new-thread-composer,#new-thread-gate,#thread-view\{display:none\}/);
  assert.match(html, /#new-thread-composer\.is-open,#new-thread-gate\.is-open,#thread-view\.is-open\{display:block\}/);
  assert.doesNotMatch(html, /#new-thread-form,#thread-view\{display:none\}/);
  assert.match(html, /id="new-thread-gate"[^>]*class="is-open"/);
  assert.match(html, /<a class="google-signin-btn" href="\/api\/auth\/google\/login">/);
  assert.match(html, /window\.umrtOpenNewThread/);
  assert.match(html, /location\.hash === '#new-thread-form'/);
});

test('BUG-F1: yellow Ask the community CTA intercepts hash and calls open intent', () => {
  const js = src('forum/features.js');
  assert.match(js, /id="ask-community-cta"/);
  assert.match(js, /href="#new-thread-form"/);
  assert.match(js, /umrtOpenNewThread/);
  assert.match(js, /preventDefault/);
  assert.match(js, /sms:\+16166065277/);
  assert.doesNotMatch(js, /united-mobile-rv\.pages\.dev/);
  assert.match(js, /https:\/\/forum\.unitedmobilerv\.com\/forum\/t\//);
});

test('forum chrome Book land remains Square; no pages.dev customer hrefs', () => {
  const html = src('forum/index.html');
  const js = src('forum/features.js');
  assert.match(html, /united-mobile-rv-llc\.square\.site/);
  assert.doesNotMatch(html, /href="https:\/\/united-mobile-rv\.pages\.dev/);
  assert.doesNotMatch(js, /pages\.dev/);
  assert.equal(SQUARE, 'https://united-mobile-rv-llc.square.site/');
});

test('BUG-F2: pin seed + migration lock Field Guide electrical-troubleshooting URL', () => {
  const seed = src('db/migrations/014_pinned_silo_bridge_threads.sql');
  const mig = src('db/migrations/019_pin_troubleshoot_field_guide.sql');
  for (const sql of [seed, mig]) {
    assert.match(sql, /pin-troubleshoot-index/);
    assert.match(sql, /https:\/\/unitedmobilerv\.com\/guide\/electrical-troubleshooting\//);
    assert.match(sql, /Field Guide/);
    assert.doesNotMatch(sql, /unitedmobilerv\.com\/troubleshoot\/\)/);
    assert.doesNotMatch(sql, /Troubleshooting Hub \(unitedmobilerv\.com\/troubleshoot/);
  }
  assert.equal(ELECTRICAL_TS_GUIDE_URL, GUIDE);
});

test('BUG-F2: dead hub body is rewritten and autolinked to the Field Guide', () => {
  const oldBody =
    'Before opening a new thread, check whether your symptom is already covered on the Troubleshooting Hub (unitedmobilerv.com/troubleshoot/) -- leftover.';
  const rewritten = canonicalPinTroubleshootBody(PIN_TROUBLESHOOT_INDEX_ID, oldBody);
  assert.equal(rewritten, PIN_TROUBLESHOOT_INDEX_BODY);
  assert.match(rewritten, /https:\/\/unitedmobilerv\.com\/guide\/electrical-troubleshooting\//);
  assert.doesNotMatch(rewritten, /unitedmobilerv\.com\/troubleshoot\//);

  const html = renderThreadBodyHtml(PIN_TROUBLESHOOT_INDEX_ID, oldBody);
  assert.match(html, /href="https:\/\/unitedmobilerv\.com\/guide\/electrical-troubleshooting\/"/);
  assert.match(html, /target="_blank"/);
  assert.doesNotMatch(html, /unitedmobilerv\.com\/troubleshoot\//);
  assert.doesNotMatch(html, /pages\.dev/);
});

test('BUG-F2: already-updated pin body is left alone and still linkified', () => {
  const html = renderThreadBodyHtml(PIN_TROUBLESHOOT_INDEX_ID, PIN_TROUBLESHOOT_INDEX_BODY);
  assert.match(html, /href="https:\/\/unitedmobilerv\.com\/guide\/electrical-troubleshooting\/"/);
  assert.match(html, />unitedmobilerv\.com\/guide\/electrical-troubleshooting\/</);
  assert.doesNotMatch(html, /<script/);
});

test('forum-body does not autolink pages.dev or invent a /troubleshoot/ hub', () => {
  const html = renderThreadBodyHtml('other-thread', 'See https://united-mobile-rv.pages.dev/forum/ and https://unitedmobilerv.com/guide/');
  assert.match(html, /united-mobile-rv\.pages\.dev\/forum\//);
  assert.doesNotMatch(html, /href="https:\/\/united-mobile-rv\.pages\.dev/);
  assert.match(html, /href="https:\/\/unitedmobilerv\.com\/guide\/"/);
});

await run();
