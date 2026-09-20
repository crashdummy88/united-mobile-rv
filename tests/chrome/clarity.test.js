/**
 * Microsoft Clarity yl6ovtkj2p: shared head snippet on shop / forum / book,
 * once-only inject for any other HTML Pages serve.
 * Run: node tests/chrome/clarity.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';
import {
  CLARITY_PROJECT_ID,
  CLARITY_HEAD_SNIPPET,
  clarityHeadSnippet,
  htmlHasClarity,
  injectClarityOnce,
} from '../../functions/_lib/clarity.js';
import { clarityHeadSnippet as meshClarity } from '../../functions/_lib/mesh-chrome.js';
import { renderBookSuite, renderBookThankYou } from '../../functions/_lib/book-suite.js';
import { onRequest as middleware } from '../../functions/_middleware.js';

function src(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

const ISLAND_SSR = [
  'functions/shop/index.js',
  'functions/shop/p/[id].js',
  'functions/shop/cart.js',
  'functions/forum/t/[id].js',
  'functions/forum/member/[id].js',
  'functions/_lib/book-suite.js',
];

test('Clarity project id is exact yl6ovtkj2p and loader stays async', () => {
  assert.equal(CLARITY_PROJECT_ID, 'yl6ovtkj2p');
  assert.equal(clarityHeadSnippet(), CLARITY_HEAD_SNIPPET);
  assert.equal(meshClarity(), CLARITY_HEAD_SNIPPET);
  assert.match(CLARITY_HEAD_SNIPPET, /t\.async=1/);
  assert.match(CLARITY_HEAD_SNIPPET, /https:\/\/www\.clarity\.ms\/tag\/"\+i/);
  assert.match(CLARITY_HEAD_SNIPPET, /"clarity", "script", "yl6ovtkj2p"/);
  assert.doesNotMatch(CLARITY_HEAD_SNIPPET, /book\.unitedmobilerv\.com/);
});

test('injectClarityOnce inserts before </head> and never duplicates', () => {
  const page = '<!DOCTYPE html><html><head><title>x</title>\n</head><body></body></html>';
  const once = injectClarityOnce(page);
  assert.match(once, /<\/script>\n<\/head>/);
  assert.equal((once.match(/yl6ovtkj2p/g) || []).length, 1);
  assert.equal(injectClarityOnce(once), once);
  assert.ok(htmlHasClarity(once));
  assert.ok(!htmlHasClarity('<html><head></head></html>'));
  assert.equal(injectClarityOnce('<html><body>no head</body></html>'), '<html><body>no head</body></html>');
});

test('shop / forum / book SSR shells pull the shared Clarity snippet', () => {
  for (const file of ISLAND_SSR) {
    const html = src(file);
    assert.match(html, /clarityHeadSnippet/, file);
    assert.match(html, /mesh-chrome\.js/, file);
  }
});

test('static forum homepage already has Clarity yl6ovtkj2p in <head>', () => {
  const html = src('forum/index.html');
  const head = html.match(/<head>[\s\S]*?<\/head>/)[0];
  assert.match(head, /clarity\.ms\/tag/);
  assert.match(head, /yl6ovtkj2p/);
  assert.match(head, /t\.async=1/);
  assert.equal((head.match(/yl6ovtkj2p/g) || []).length, 1);
});

test('rendered book suite and thank-you include Clarity once in <head>', async () => {
  for (const [label, res] of [
    ['suite', renderBookSuite(new Request('https://book.unitedmobilerv.com/'))],
    ['thanks', renderBookThankYou(new Request('https://unitedmobilerv.com/book-service/thank-you/'))],
  ]) {
    const html = await res.text();
    const head = html.match(/<head>[\s\S]*?<\/head>/)[0];
    assert.match(head, /yl6ovtkj2p/, label);
    assert.match(head, /t\.async=1/, label);
    assert.equal((html.match(/yl6ovtkj2p/g) || []).length, 1, label);
  }
});

test('middleware injects Clarity into HTML that lacks it, skips non-HTML and duplicates', async () => {
  const env = { SESSION_SECRET: 'test-session-secret', DB: {}, PORTAL_DB: {} };

  const htmlRes = await middleware({
    request: new Request('https://forum.unitedmobilerv.com/forum/'),
    env,
    next: async () => new Response('<!DOCTYPE html><html><head><title>Forum</title></head><body></body></html>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }),
  });
  const injected = await htmlRes.text();
  assert.match(injected, /yl6ovtkj2p/);
  assert.match(injected, /<\/script>\n<\/head>/);
  assert.equal(htmlRes.headers.get('X-Robots-Tag'), 'index, follow');

  const already = await middleware({
    request: new Request('https://shop.unitedmobilerv.com/shop/'),
    env,
    next: async () => new Response(
      `<!DOCTYPE html><html><head>${clarityHeadSnippet()}</head><body></body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    ),
  });
  const alreadyHtml = await already.text();
  assert.equal((alreadyHtml.match(/yl6ovtkj2p/g) || []).length, 1);

  const plain = await middleware({
    request: new Request('https://forum.unitedmobilerv.com/robots.txt'),
    env,
    next: async () => new Response('User-agent: *\nAllow: /\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    }),
  });
  const plainBody = await plain.text();
  assert.doesNotMatch(plainBody, /clarity/);
  assert.equal(plain.headers.get('X-Robots-Tag'), null);
});

await run();
