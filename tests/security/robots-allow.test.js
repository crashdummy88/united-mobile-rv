/**
 * Matt lock 2026-09-20: robots.txt is crawlable by search AND AI.
 * Run: node tests/security/robots-allow.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';

const robots = readFileSync(new URL('../../robots.txt', import.meta.url), 'utf8');

const AI_AGENTS = [
  'GPTBot',
  'ClaudeBot',
  'Google-Extended',
  'PerplexityBot',
  'Applebot-Extended',
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

const groups = parseGroups(robots);
const sitemaps = sitemapLines(robots);

test('User-agent * allows / and does not invent Disallow', () => {
  const star = groups.find((g) => g.agent === '*');
  assert.ok(star, 'missing User-agent: *');
  assert.ok(star.allows.includes('/'), 'User-agent * must Allow: /');
  assert.deepEqual(star.disallows, []);
});

test('file has no Disallow directive at all', () => {
  assert.doesNotMatch(robots, /^\s*Disallow:/im);
  for (const g of groups) {
    assert.deepEqual(g.disallows, [], `${g.agent} must not Disallow`);
  }
});

test('named AI crawlers each Allow: / and are not forum-only', () => {
  for (const agent of AI_AGENTS) {
    const group = groups.find((g) => g.agent === agent);
    assert.ok(group, `missing User-agent: ${agent}`);
    assert.ok(group.allows.includes('/'), `${agent} must Allow: /`);
    assert.equal(group.allows.includes('/forum/') && !group.allows.includes('/'), false);
    assert.equal(group.allows.includes('/forum-live/') && !group.allows.includes('/'), false);
  }
});

test('Sitemap lines are live custom domains, not pages.dev', () => {
  assert.ok(sitemaps.includes('https://shop.unitedmobilerv.com/sitemap.xml'));
  assert.ok(sitemaps.includes('https://forum.unitedmobilerv.com/sitemap.xml'));
  assert.ok(sitemaps.length >= 2);
  for (const loc of sitemaps) {
    assert.doesNotMatch(loc, /pages\.dev/i, `Sitemap must not advertise pages.dev: ${loc}`);
  }
});

test('Amazonbot / CCBot stay omitted unless referenced elsewhere', () => {
  const srcTreeHint = robots;
  assert.doesNotMatch(srcTreeHint, /Amazonbot|CCBot/);
});

await run();
