/**
 * Forum engagement chrome: Ask the Community opens a visible composer
 * or Google sign-in gate (BUG-F1); Troubleshooting Index points at the
 * electrical field guide (BUG-F2); Book stays Square.
 * Run: node tests/chrome/forum-composer.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';
import { TROUBLESHOOTING_INDEX_HREF, TECH_PIN_IDS } from '../../functions/_lib/forum-growth.js';
import { renderForumBodyHtml } from '../../functions/_lib/forum-body.js';

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

test('BUG-F1: Ask the Community CTA intercepts hash and calls open intent', () => {
  const js = src('forum/features.js');
  assert.match(js, /id="ask-community-cta"/);
  assert.match(js, /Ask the Community/);
  assert.match(js, /href="#new-thread-form"/);
  assert.match(js, /umrtOpenNewThread/);
  assert.match(js, /preventDefault/);
  assert.match(js, /sms:\+16166065277/);
  assert.match(js, /Real rigs only/);
  assert.doesNotMatch(js, /united-mobile-rv\.pages\.dev/);
  assert.match(js, /https:\/\/forum\.unitedmobilerv\.com\/forum\/t\//);
});

test('forum chrome Book land remains Square; no pages.dev customer hrefs', () => {
  const html = src('forum/index.html');
  const js = src('forum/features.js');
  assert.match(html, /united-mobile-rv-llc\.square\.site/);
  assert.doesNotMatch(html, /href="https:\/\/united-mobile-rv\.pages\.dev/);
  assert.doesNotMatch(html, /href="https:\/\/book\.unitedmobilerv\.com/);
  assert.doesNotMatch(js, /pages\.dev/);
  assert.equal(SQUARE, 'https://united-mobile-rv-llc.square.site/');
});

test('BUG-F2: Troubleshooting Index pin href is the electrical field guide', () => {
  const html = src('forum/index.html');
  assert.equal(TROUBLESHOOTING_INDEX_HREF, GUIDE);
  assert.match(html, /data-pin-id="troubleshooting-index"/);
  assert.match(html, /href="https:\/\/unitedmobilerv\.com\/guide\/electrical-troubleshooting\/"/);
  assert.doesNotMatch(html, /href="https:\/\/unitedmobilerv\.com\/troubleshoot\/"/);
  assert.doesNotMatch(html, /href="\/troubleshoot\/"/);
});

test('home Tech pin cards use the five live tech-* URLs', () => {
  const html = src('forum/index.html');
  for (const id of TECH_PIN_IDS) {
    assert.match(html, new RegExp(`href="/forum/t/${id}"`));
  }
  assert.doesNotMatch(html, /href="\/forum\/t\/pin-/);
  assert.doesNotMatch(html, /href="\/forum\/t\/seed-/);
});

test('forum-body autolinks custom-domain https URLs, not pages.dev', () => {
  const html = renderForumBodyHtml(
    'See https://unitedmobilerv.com/guide/electrical-troubleshooting/ and https://united-mobile-rv.pages.dev/forum/'
  );
  assert.match(html, /href="https:\/\/unitedmobilerv\.com\/guide\/electrical-troubleshooting\/"/);
  assert.match(html, /united-mobile-rv\.pages\.dev\/forum\//);
  assert.doesNotMatch(html, /href="https:\/\/united-mobile-rv\.pages\.dev/);
});

await run();
