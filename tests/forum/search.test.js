/**
 * BUG-F3: forum search must tokenize multi-word queries (AND) instead of
 * requiring an exact contiguous LIKE phrase. "Victron inverter" should
 * match threads that mention both terms; "brake" still matches.
 * Run: node tests/forum/search.test.js
 */
import { test, run, assert } from '../lib/tiny-test.js';
import {
  buildForumSearchWhere,
  forumSearchTokens,
  normalizeForumQuery,
  threadMatchesForumSearch,
} from '../../functions/_lib/forum-search.js';
import { onRequestGet as searchHandler } from '../../functions/api/forum/search.js';

const THREADS = [
  {
    id: 't-victron',
    title: 'Behind the scenes on a big power system install',
    body: 'Just wrapped a full Victron system install — 400Ah lithium bank, 3000W inverter/charger, and a full rewire.',
    category: 'blog',
    hidden: 0,
    author: 'Matt',
    updated_at: '2026-09-10',
  },
  {
    id: 't-inverter-only',
    title: 'Inverter beeping intermittently under load',
    body: 'An inverter that beeps intermittently under load is usually a low-voltage warning.',
    category: 'power',
    hidden: 0,
    author: 'Matt',
    updated_at: '2026-09-11',
  },
  {
    id: 't-brake',
    title: 'Electric brake controller acting up on grades',
    body: 'Controller drops out when the brake pedal is held on a long descent.',
    category: 'repair',
    hidden: 0,
    author: 'Sam',
    updated_at: '2026-09-12',
  },
  {
    id: 't-hidden',
    title: 'Victron inverter spam',
    body: 'Victron inverter Victron inverter',
    category: 'general',
    hidden: 1,
    author: 'bot',
    updated_at: '2026-09-13',
  },
];

function likeMatch(hay, pattern) {
  // Patterns are %token% with ESCAPE '\' — tests only use %literal%.
  const raw = String(pattern);
  if (!raw.startsWith('%') || !raw.endsWith('%')) return false;
  const needle = raw.slice(1, -1).replace(/\\([%_\\])/g, '$1').toLowerCase();
  return String(hay).toLowerCase().includes(needle);
}

function makeSearchD1(threads) {
  return {
    prepare(sql) {
      let bound = [];
      return {
        bind(...args) {
          bound = args;
          return this;
        },
        async all() {
          if (!/FROM threads t JOIN users u/.test(sql)) {
            throw new Error('unexpected search SQL: ' + sql);
          }
          const limit = bound[bound.length - 2];
          const offset = bound[bound.length - 1];
          const likeBinds = bound.slice(0, -2);
          const groups = [];
          for (let i = 0; i < likeBinds.length; i += 3) {
            groups.push(likeBinds[i]);
          }
          const matched = threads.filter((t) => {
            if (t.hidden) return false;
            return groups.every((like) => likeMatch(t.title, like) || likeMatch(t.body, like) || likeMatch(t.category, like));
          });
          const page = matched.slice(offset, offset + limit).map((t) => ({
            id: t.id,
            title: t.title,
            category: t.category,
            author: t.author,
            snippet: t.body.slice(0, 220),
            reply_count: 0,
            updated_at: t.updated_at,
          }));
          return { results: page };
        },
      };
    },
  };
}

async function search(q, extra = {}) {
  const url = new URL('https://forum.unitedmobilerv.com/api/forum/search');
  if (q != null) url.searchParams.set('q', q);
  const request = new Request(url);
  const res = await searchHandler({ env: { DB: makeSearchD1(THREADS) }, request, ...extra });
  return { status: res.status, body: await res.json() };
}

test('tokens: Victron inverter splits to AND terms; quoted stays a phrase', () => {
  assert.deepEqual(forumSearchTokens('Victron inverter'), ['Victron', 'inverter']);
  assert.deepEqual(forumSearchTokens('  12V charging  '), ['12V', 'charging']);
  assert.deepEqual(forumSearchTokens('Dometic E1'), ['Dometic', 'E1']);
  assert.deepEqual(forumSearchTokens('"Victron inverter"'), ['Victron inverter']);
  assert.deepEqual(forumSearchTokens('brake'), ['brake']);
  assert.deepEqual(forumSearchTokens('a'), []);
  assert.equal(normalizeForumQuery('  x'.repeat(80)).length, 120);
});

test('tokens: LIKE wildcards are escaped in binds', () => {
  const { binds } = buildForumSearchWhere(['100%_off']);
  assert.equal(binds[0], '%100\\%\\_off%');
  assert.equal(binds.length, 3);
});

test('in-memory AND: Victron inverter hits the Victron+inverter thread, not inverter-only', () => {
  const victron = THREADS.find((t) => t.id === 't-victron');
  const inverterOnly = THREADS.find((t) => t.id === 't-inverter-only');
  const brake = THREADS.find((t) => t.id === 't-brake');
  assert.equal(threadMatchesForumSearch(victron, 'Victron inverter'), true);
  assert.equal(threadMatchesForumSearch(inverterOnly, 'Victron inverter'), false);
  assert.equal(threadMatchesForumSearch(brake, 'Victron inverter'), false);
  assert.equal(threadMatchesForumSearch(brake, 'brake'), true);
  assert.equal(threadMatchesForumSearch(victron, 'brake'), false);
  assert.equal(threadMatchesForumSearch(victron, '"Victron inverter"'), false);
  assert.equal(threadMatchesForumSearch(THREADS.find((t) => t.id === 't-hidden'), 'Victron inverter'), true);
});

test('handler: Victron inverter returns the real Victron thread, not fake rows', async () => {
  const { status, body } = await search('Victron inverter');
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(body.tokens, ['Victron', 'inverter']);
  const ids = body.results.map((r) => r.id);
  assert.ok(ids.includes('t-victron'), 'expected the Victron + inverter thread');
  assert.ok(!ids.includes('t-inverter-only'), 'inverter-only must not match AND');
  assert.ok(!ids.includes('t-hidden'), 'hidden threads stay out');
  assert.ok(!ids.includes('t-brake'));
});

test('handler: brake still works as a single token', async () => {
  const { status, body } = await search('brake');
  assert.equal(status, 200);
  assert.deepEqual(body.results.map((r) => r.id), ['t-brake']);
});

test('handler: exact quoted phrase does not invent a contiguous match', async () => {
  const { body } = await search('"Victron inverter"');
  assert.equal(body.success, true);
  assert.deepEqual(body.tokens, ['Victron inverter']);
  assert.equal(body.results.length, 0);
});

test('handler: too-short and empty queries', async () => {
  const shortQ = await search('a');
  assert.equal(shortQ.status, 400);
  assert.equal(shortQ.body.error, 'query_too_short');
  const empty = await search('');
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.body.results, []);
});

test('handler: missing D1 is not_configured, not fake hits', async () => {
  const url = new URL('https://forum.unitedmobilerv.com/api/forum/search?q=brake');
  const res = await searchHandler({ env: {}, request: new Request(url) });
  const body = await res.json();
  assert.equal(res.status, 503);
  assert.equal(body.success, false);
  assert.deepEqual(body.results, []);
});

await run();
