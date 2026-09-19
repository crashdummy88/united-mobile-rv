/**
 * BUG-X1: mothership pages.dev /forum must 301 to forum.unitedmobilerv.com.
 * /go/forum is already a hop — leave it. Book stays Square.
 * Run: node tests/chrome/forum-redirect.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';
import {
  FORUM_PUBLIC_ORIGIN,
  mothershipForumRedirectLocation,
} from '../../functions/_lib/hosts.js';
import { onRequest as middleware } from '../../functions/_middleware.js';

function src(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

function makeRequest(url) {
  return new Request(url);
}

function makeNextCapture() {
  const calls = [];
  const next = async (req) => {
    calls.push(req);
    return new Response('forum-pass', {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  };
  return { next, calls };
}

const env = { SESSION_SECRET: 'test-session-secret', DB: {}, PORTAL_DB: {} };

test('_redirects: /forum and /forum/ 301 to forum custom domain; /go/forum left alone', () => {
  const redirects = src('_redirects');
  assert.match(redirects, /^\/forum\s+https:\/\/forum\.unitedmobilerv\.com\/\s+301/m);
  assert.match(redirects, /^\/forum\/\s+https:\/\/forum\.unitedmobilerv\.com\/\s+301/m);
  assert.match(redirects, /^\/forum-live\s+https:\/\/forum\.unitedmobilerv\.com\/\s+301/m);
  assert.match(redirects, /^\/forum-live\/\s+https:\/\/forum\.unitedmobilerv\.com\/\s+301/m);
  assert.match(redirects, /^\/forum-live\/\*\s+https:\/\/forum\.unitedmobilerv\.com\/\s+301/m);
  assert.match(redirects, /^\/go\/forum\s+https:\/\/forum\.unitedmobilerv\.com\/\s+302/m);
  assert.match(redirects, /^\/go\/forum\/\s+https:\/\/forum\.unitedmobilerv\.com\/\s+302/m);
  assert.doesNotMatch(redirects, /^\/forum\/\*\s+/m);
});

test('helper: mothership /forum and /forum/ land on forum host root', () => {
  assert.equal(
    mothershipForumRedirectLocation('united-mobile-rv.pages.dev', '/forum'),
    `${FORUM_PUBLIC_ORIGIN}/`
  );
  assert.equal(
    mothershipForumRedirectLocation('united-mobile-rv.pages.dev', '/forum/'),
    `${FORUM_PUBLIC_ORIGIN}/`
  );
  assert.equal(
    mothershipForumRedirectLocation('staging.unitedmobilerv.com', '/forum/'),
    `${FORUM_PUBLIC_ORIGIN}/`
  );
});

test('helper: deeper HTML paths are preserved on the forum host', () => {
  assert.equal(
    mothershipForumRedirectLocation('united-mobile-rv.pages.dev', '/forum/t/abc'),
    `${FORUM_PUBLIC_ORIGIN}/forum/t/abc`
  );
  assert.equal(
    mothershipForumRedirectLocation('united-mobile-rv-staging.pages.dev', '/forum/member/u1'),
    `${FORUM_PUBLIC_ORIGIN}/forum/member/u1`
  );
});

test('helper: leftover /forum-live lands on forum home', () => {
  assert.equal(
    mothershipForumRedirectLocation('united-mobile-rv.pages.dev', '/forum-live/'),
    `${FORUM_PUBLIC_ORIGIN}/`
  );
});

test('helper: forum host and /go/forum and forum assets are not redirected', () => {
  assert.equal(mothershipForumRedirectLocation('forum.unitedmobilerv.com', '/forum/'), null);
  assert.equal(mothershipForumRedirectLocation('forum.unitedmobilerv.com', '/forum/t/abc'), null);
  assert.equal(mothershipForumRedirectLocation('united-mobile-rv.pages.dev', '/go/forum'), null);
  assert.equal(mothershipForumRedirectLocation('united-mobile-rv.pages.dev', '/forum/features.css'), null);
  assert.equal(mothershipForumRedirectLocation('united-mobile-rv.pages.dev', '/api/forum-stats'), null);
});

test('middleware: pages.dev /forum and /forum/ 301 to forum.unitedmobilerv.com/', async () => {
  const { next, calls } = makeNextCapture();
  for (const path of ['/forum', '/forum/']) {
    const res = await middleware({
      request: makeRequest(`https://united-mobile-rv.pages.dev${path}`),
      env,
      next,
    });
    assert.equal(res.status, 301, `${path} should 301`);
    assert.equal(res.headers.get('Location'), 'https://forum.unitedmobilerv.com/', path);
  }
  assert.equal(calls.length, 0);
});

test('middleware: pages.dev /forum/t/:id preserves path on forum host', async () => {
  const { next } = makeNextCapture();
  const res = await middleware({
    request: makeRequest('https://united-mobile-rv.pages.dev/forum/t/thread-1'),
    env,
    next,
  });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('Location'), 'https://forum.unitedmobilerv.com/forum/t/thread-1');
});

test('middleware: leftover /forum-live 301s to forum home', async () => {
  const { next } = makeNextCapture();
  const res = await middleware({
    request: makeRequest('https://united-mobile-rv.pages.dev/forum-live/'),
    env,
    next,
  });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('Location'), 'https://forum.unitedmobilerv.com/');
});

test('middleware: forum. host still serves /forum/ (no self-redirect)', async () => {
  const { next, calls } = makeNextCapture();
  const res = await middleware({
    request: makeRequest('https://forum.unitedmobilerv.com/forum/'),
    env,
    next,
  });
  assert.equal(res.status, 200);
  assert.equal(calls.length, 1);
});

test('middleware: /go/forum is not intercepted (existing _redirects hop)', async () => {
  const { next, calls } = makeNextCapture();
  const res = await middleware({
    request: makeRequest('https://united-mobile-rv.pages.dev/go/forum'),
    env,
    next,
  });
  assert.equal(res.status, 200);
  assert.equal(calls.length, 1);
});

test('FB share leftovers no longer emit pages.dev forum URLs', () => {
  const js = src('forum/features.js');
  assert.match(js, /https:\/\/forum\.unitedmobilerv\.com\/forum\/t\//);
  assert.doesNotMatch(js, /united-mobile-rv\.pages\.dev\/forum/);
});

await run();
