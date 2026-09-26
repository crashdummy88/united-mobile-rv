/**
 * Matt/ADMIN lock 2026-09-20: mothership robots.txt allows search + AI
 * site-wide. Sitemap lines are live custom hosts, never pages.dev.
 * Run: node tests/security/robots-allow.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';
import { onRequest as middleware } from '../../functions/_middleware.js';
import { onRequestGet as robotsFn } from '../../functions/robots.txt.js';
import {
  AI_CRAWLERS,
  SHOP_SITEMAP,
  FORUM_SITEMAP,
  renderRobotsTxt,
  sitemapsForHost,
} from '../../functions/_lib/robots-txt.js';

const staticRobots = readFileSync(new URL('../../robots.txt', import.meta.url), 'utf8');

const REQUIRED_BOTS = [
  'GPTBot',
  'ClaudeBot',
  'Google-Extended',
  'PerplexityBot',
  'Applebot-Extended',
  'Amazonbot',
  'Bytespider',
];

function parseGroups(text) {
  const groups = [];
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const ua = line.match(/^User-agent:\s*(.+)$/i);
    if (ua) {
      current = { agent: ua[1].trim(), allows: [], disallows: [] };
      groups.push(current);
      continue;
    }
    const allow = line.match(/^Allow:\s*(.+)$/i);
    if (allow && current) {
      current.allows.push(allow[1].trim());
      continue;
    }
    const disallow = line.match(/^Disallow:\s*(.*)$/i);
    if (disallow && current) {
      current.disallows.push(disallow[1].trim());
    }
  }
  return groups;
}

function sitemapLines(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^Sitemap:/i.test(l))
    .map((l) => l.replace(/^Sitemap:\s*/i, '').trim());
}

function assertOpenRobots(text, label) {
  const groups = parseGroups(text);
  const star = groups.find((g) => g.agent === '*');
  assert.ok(star, `${label}: missing User-agent: *`);
  assert.ok(star.allows.includes('/'), `${label}: User-agent * must Allow: /`);
  assert.deepEqual(star.disallows, [], `${label}: * must not Disallow`);
  assert.doesNotMatch(text, /^\s*Disallow:/im, `${label}: no Disallow lines`);

  for (const agent of REQUIRED_BOTS) {
    const group = groups.find((g) => g.agent === agent);
    assert.ok(group, `${label}: missing User-agent: ${agent}`);
    assert.ok(group.allows.includes('/'), `${label}: ${agent} must Allow: /`);
    assert.equal(
      group.allows.includes('/forum/') && !group.allows.includes('/'),
      false,
      `${label}: ${agent} must not be forum-only`
    );
    assert.deepEqual(group.disallows, [], `${label}: ${agent} must not Disallow`);
  }

  for (const loc of sitemapLines(text)) {
    assert.doesNotMatch(loc, /pages\.dev/i, `${label}: Sitemap must not use pages.dev: ${loc}`);
  }
}

test('shared AI crawler list matches ADMIN lock', () => {
  assert.deepEqual([...AI_CRAWLERS], REQUIRED_BOTS);
});

test('static robots.txt is open Allow: / for * and every named AI bot', () => {
  assertOpenRobots(staticRobots, 'static robots.txt');
  const sitemaps = sitemapLines(staticRobots);
  assert.ok(sitemaps.includes(SHOP_SITEMAP));
  assert.ok(sitemaps.includes(FORUM_SITEMAP));
  assert.equal(sitemaps.length, 2);
});

test('static robots.txt matches the preview/default Function body', () => {
  assert.equal(staticRobots, renderRobotsTxt('united-mobile-rv.pages.dev'));
});

test('shop host Sitemap is shop.unitedmobilerv.com only', () => {
  assert.deepEqual(sitemapsForHost('shop.unitedmobilerv.com'), [SHOP_SITEMAP]);
  const body = renderRobotsTxt('shop.unitedmobilerv.com');
  assertOpenRobots(body, 'shop host');
  assert.deepEqual(sitemapLines(body), [SHOP_SITEMAP]);
  assert.doesNotMatch(body, /forum\.unitedmobilerv\.com/);
  assert.doesNotMatch(body, /book\.unitedmobilerv\.com/);
});

test('forum host Sitemap is forum.unitedmobilerv.com only', () => {
  assert.deepEqual(sitemapsForHost('forum.unitedmobilerv.com'), [FORUM_SITEMAP]);
  const body = renderRobotsTxt('forum.unitedmobilerv.com');
  assertOpenRobots(body, 'forum host');
  assert.deepEqual(sitemapLines(body), [FORUM_SITEMAP]);
  assert.doesNotMatch(body, /shop\.unitedmobilerv\.com/);
});

test('book host has no Sitemap (book does not serve /sitemap.xml)', () => {
  assert.deepEqual(sitemapsForHost('book.unitedmobilerv.com'), []);
  const body = renderRobotsTxt('book.unitedmobilerv.com');
  assertOpenRobots(body, 'book host');
  assert.deepEqual(sitemapLines(body), []);
  assert.doesNotMatch(body, /^Sitemap:/im);
});

test('pages.dev / preview never advertise a pages.dev Sitemap', () => {
  for (const host of [
    'united-mobile-rv.pages.dev',
    'cursor-mothership-robots-allow-138c.united-mobile-rv.pages.dev',
  ]) {
    const body = renderRobotsTxt(host);
    assertOpenRobots(body, host);
    assert.deepEqual(sitemapLines(body), [SHOP_SITEMAP, FORUM_SITEMAP]);
    assert.doesNotMatch(body, /united-mobile-rv\.pages\.dev/i);
  }
});

test('Function serves host-aware text/plain and shop Sitemap', async () => {
  const res = await robotsFn({
    request: new Request('https://shop.unitedmobilerv.com/robots.txt'),
  });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('Content-Type'), /text\/plain/);
  const body = await res.text();
  assertOpenRobots(body, 'Function shop');
  assert.deepEqual(sitemapLines(body), [SHOP_SITEMAP]);
});

test('Function on book host allows crawl but omits Sitemap', async () => {
  const res = await robotsFn({
    request: new Request('https://book.unitedmobilerv.com/robots.txt'),
  });
  assert.equal(res.status, 200);
  const body = await res.text();
  assertOpenRobots(body, 'Function book');
  assert.deepEqual(sitemapLines(body), []);
});

test('middleware still exempts /robots.txt from X-Robots-Tag', async () => {
  const next = async () =>
    new Response(renderRobotsTxt('forum.unitedmobilerv.com'), {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  const res = await middleware({
    request: new Request('https://forum.unitedmobilerv.com/robots.txt'),
    env: { SESSION_SECRET: 'test-session-secret', DB: {}, PORTAL_DB: {} },
    next,
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('X-Robots-Tag'), null);
  const body = await res.text();
  assertOpenRobots(body, 'middleware-exempt robots');
});

test('sitemap-network mothership entries are live custom hosts, not pages.dev', () => {
  const src = readFileSync(new URL('../../functions/sitemap-network.xml.js', import.meta.url), 'utf8');
  assert.match(src, /https:\/\/shop\.unitedmobilerv\.com\/sitemap\.xml/);
  assert.match(src, /https:\/\/forum\.unitedmobilerv\.com\/sitemap\.xml/);
  assert.doesNotMatch(src, /united-mobile-rv\.pages\.dev\/sitemap\.xml/);
});

test('middleware 301s book / to Square (no page to index)', async () => {
  const next = async () => new Response('ok', { status: 200 });
  const res = await middleware({
    request: new Request('https://book.unitedmobilerv.com/'),
    env: { SESSION_SECRET: 'test-session-secret', DB: {}, PORTAL_DB: {} },
    next,
  });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('Location'), 'https://united-mobile-rv-llc.square.site/');
});

await run();
