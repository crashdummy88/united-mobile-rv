/**
 * CF /privacy-policy/ and /terms-of-use/ are the Pages copy of record.
 * Staging/prototype disclaimers must stay gone; legal body must stay full.
 * Run: node tests/chrome/legal-pages.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';

function src(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

const STAGING_BLURB = /staging page|sales prototype|live legal copy if wording ever diverges|paraphrases the live site policy/i;
const SQUARE = 'https://united-mobile-rv-llc.square.site/';

const privacy = src('privacy-policy/index.html');
const terms = src('terms-of-use/index.html');
const forum = src('forum/index.html');
const sitemap = src('functions/_lib/static-pages.js');

test('staging/prototype disclaimer strings are gone from both legal pages', () => {
  assert.doesNotMatch(privacy, STAGING_BLURB);
  assert.doesNotMatch(terms, STAGING_BLURB);
  assert.doesNotMatch(privacy, /unitedmobilerv\.com remains the live legal copy/i);
  assert.doesNotMatch(terms, /See also our/);
});

test('privacy-policy hosts the full WP legal body plus forum substance', () => {
  assert.match(privacy, /<h1>Privacy policy<\/h1>/);
  assert.match(privacy, /Information we collect/);
  assert.match(privacy, /How we use your information/);
  assert.match(privacy, /We do not sell your information/);
  assert.match(privacy, /do not sell, trade, rent, or share your personal information/);
  assert.match(privacy, /Third-party services/);
  assert.match(privacy, /Web3Forms/);
  assert.match(privacy, /Google Forms/);
  assert.match(privacy, /Square/);
  assert.match(privacy, /Community forum/);
  assert.match(privacy, /Google account/);
  assert.match(privacy, /Cloudflare Workers AI/);
  assert.match(privacy, /Data retention/);
  assert.match(privacy, /business and tax purposes/);
  assert.match(privacy, /<h2>Security<\/h2>/);
  assert.match(privacy, /Contact us/);
  assert.match(privacy, /#900175457/);
  assert.match(privacy, /unitedrvnetwork@gmail.com/);
  assert.match(privacy, /href="\/terms-of-use\/"/);
});

test('terms-of-use hosts the full site + forum terms body', () => {
  assert.match(terms, /<h1>Terms of use<\/h1>/);
  assert.match(terms, /This website is operated by United Mobile RV LLC/);
  assert.match(terms, /Community forum/);
  assert.match(terms, /AI moderation/);
  assert.match(terms, /No warranty/);
  assert.match(terms, /as is\./);
  assert.match(terms, /<h2>Changes<\/h2>/);
  assert.match(terms, /<h2>Contact<\/h2>/);
  assert.match(terms, /unitedrvnetwork@gmail.com/);
  assert.match(terms, /href="\/privacy-policy\/"/);
});

test('forum chrome still points at these CF legal paths', () => {
  assert.match(forum, /href="\/terms-of-use\/"/);
  assert.match(forum, /href="\/privacy-policy\/"/);
});

test('legal page Book CTAs stay Square; sitemap lists both paths', () => {
  const squareRe = /https:\/\/united-mobile-rv-llc\.square\.site\//;
  assert.match(privacy, squareRe);
  assert.match(terms, squareRe);
  assert.ok(privacy.includes(SQUARE));
  assert.ok(terms.includes(SQUARE));
  assert.doesNotMatch(privacy, /href="https:\/\/book\.unitedmobilerv\.com/);
  assert.doesNotMatch(terms, /href="https:\/\/book\.unitedmobilerv\.com/);
  assert.match(sitemap, /loc: '\/privacy-policy\/'/);
  assert.match(sitemap, /loc: '\/terms-of-use\/'/);
});

await run();
