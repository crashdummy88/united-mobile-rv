/**
 * Forum growth: archive seed/pin spam, freeze the generator, Tech pins,
 * content-bot first-reply-only. Run: node tests/forum/growth.test.js
 */
import { readFileSync } from 'node:fs';
import { test, run, assert } from '../lib/tiny-test.js';
import {
  BOT_UMRT_TEAM_ID,
  STAFF_UMRV_TECH_ID,
  TECH_PIN_IDS,
  isTechPinId,
  isSeedOrPinSpamId,
  isLeftoverBotSeedThread,
  isPubliclyListedThread,
  publicThreadSql,
} from '../../functions/_lib/forum-growth.js';
import { maybeRunNudgeSweep } from '../../functions/_lib/bot-sweep.js';
import { runOnce } from '../../workers/content-bot/index.js';

function src(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

test('isSeedOrPinSpamId matches seed-, seed3-, and pin- only', () => {
  assert.equal(isSeedOrPinSpamId('seed-0001-repair'), true);
  assert.equal(isSeedOrPinSpamId('seed3-0001-repair'), true);
  assert.equal(isSeedOrPinSpamId('pin-troubleshoot-index'), true);
  assert.equal(isSeedOrPinSpamId('tech-winterize'), false);
  assert.equal(isSeedOrPinSpamId('16d25ebd19ab8ef7b1b9628cab239acb'), false);
  assert.equal(isSeedOrPinSpamId('e5f40df7-eca8-454c-8ebe-e71e9e8cdd9a'), false);
});

test('TECH_PIN_IDS are the five real UMRV Tech stickies', () => {
  assert.deepEqual([...TECH_PIN_IDS], [
    'tech-winterize',
    'tech-12v-battery',
    'tech-solar',
    'tech-slides',
    'tech-generator',
  ]);
  for (const id of TECH_PIN_IDS) {
    assert.equal(isTechPinId(id), true);
    assert.equal(isSeedOrPinSpamId(id), false);
  }
});

test('publicThreadSql hides seed/pin ids and leftover bot threads', () => {
  const sql = publicThreadSql('t');
  assert.match(sql, /t\.hidden = 0/);
  assert.match(sql, /t\.id NOT LIKE 'seed-%'/);
  assert.match(sql, /t\.id NOT LIKE 'seed3-%'/);
  assert.match(sql, /t\.id NOT LIKE 'pin-%'/);
  assert.match(sql, /t\.author_id != 'bot-umrt-team'/);
});

test('isPubliclyListedThread drops hidden, seed/pin, and leftover bot guides', () => {
  assert.equal(isPubliclyListedThread({ id: 'tech-solar', hidden: 0, author_id: STAFF_UMRV_TECH_ID }), true);
  assert.equal(isPubliclyListedThread({ id: 'seed-0001-repair', hidden: 0, author_id: 'matt' }), false);
  assert.equal(isPubliclyListedThread({ id: 'pin-repair-general', hidden: 0, author_id: 'matt' }), false);
  assert.equal(isPubliclyListedThread({
    id: '16d25ebd19ab8ef7b1b9628cab239acb',
    hidden: 0,
    author_id: BOT_UMRT_TEAM_ID,
  }), false);
  assert.equal(isLeftoverBotSeedThread({
    id: '16d25ebd19ab8ef7b1b9628cab239acb',
    author_id: BOT_UMRT_TEAM_ID,
  }), true);
  assert.equal(isPubliclyListedThread({
    id: 'welcome',
    hidden: 0,
    author_id: '3fe12c80-087b-474b-9e7b-b5938de0b77c',
  }), true);
});

test('migration 021 archives seed/pin spam and inserts five Tech pins as UMRV Tech', () => {
  const sql = src('db/migrations/021_archive_seeds_tech_pins.sql');
  assert.match(sql, /Do NOT apply to production D1 without Matt/);
  assert.match(sql, /hidden = 1/);
  assert.match(sql, /pinned = 0/);
  assert.match(sql, /locked = 1/);
  assert.match(sql, /id LIKE 'seed-%'/);
  assert.match(sql, /id LIKE 'seed3-%'/);
  assert.match(sql, /id LIKE 'pin-%'/);
  assert.match(sql, /author_id = 'bot-umrt-team'/);
  assert.doesNotMatch(sql, /DELETE FROM threads/);
  assert.match(sql, /staff-umrv-tech/);
  assert.match(sql, /'UMRV Tech'/);
  for (const id of TECH_PIN_IDS) {
    assert.match(sql, new RegExp(`'${id}'`));
  }
  assert.match(sql, /Honest question, not a canned checklist/);
  assert.match(sql, /What chemistry are you on/);
  assert.match(sql, /stuck in bulk all day/);
  assert.match(sql, /hydraulic or Schwintek/);
  assert.match(sql, /hard start after storage/);
});

test('historical seed SQL files are marked frozen', () => {
  assert.match(src('db/seed_threads.sql'), /FROZEN/);
  assert.match(src('db/seed_threads_batch2.sql'), /FROZEN/);
  assert.match(src('db/migrations/008_seed3_threads.sql'), /FROZEN/);
  assert.match(src('db/migrations/014_pinned_silo_bridge_threads.sql'), /FROZEN/);
});

test('public listings and thread pages use the growth helper', () => {
  const listFiles = [
    'functions/api/threads/index.js',
    'functions/api/forum/search.js',
    'functions/api/forum/trending.js',
    'functions/api/forum-stats.js',
    'functions/feed.xml.js',
    'functions/sitemap.xml.js',
    'functions/api/forum/leaderboard.js',
    'functions/api/forum/members/[id].js',
    'functions/forum/member/[id].js',
    'functions/_lib/analytics.js',
  ];
  for (const rel of listFiles) {
    assert.match(src(rel), /publicThreadSql/, rel);
  }
  assert.match(src('functions/forum/t/[id].js'), /isSeedOrPinSpamId/);
  assert.match(src('functions/forum/t/[id].js'), /isPubliclyListedThread/);
  assert.match(src('functions/api/threads/index.js'), /first reply on the five UMRV Tech pins only/);
  assert.doesNotMatch(src('functions/api/threads/index.js'), /draftAiReply/);
  assert.doesNotMatch(src('functions/api/threads/index.js'), /Welcome to the forum/);
});

test('maybeRunNudgeSweep is a frozen no-op', async () => {
  let called = false;
  const env = {
    DB: {
      prepare() {
        called = true;
        throw new Error('nudge sweep must not touch D1');
      },
    },
  };
  await maybeRunNudgeSweep(env, () => 'x');
  assert.equal(called, false);
});

function makeBotDb({ pins = [], existingBotPosts = [], users = [{ id: BOT_UMRT_TEAM_ID }] } = {}) {
  const inserts = [];
  const updates = [];
  return {
    inserts,
    updates,
    prepare(sql) {
      let bound = [];
      const stmt = {
        bind(...args) {
          bound = args;
          return stmt;
        },
        async first() {
          if (/SELECT id FROM users WHERE id = \?/.test(sql)) {
            const u = users.find((u) => u.id === bound[0]);
            return u ? { id: u.id } : undefined;
          }
          throw new Error(`unhandled first: ${sql}`);
        },
        async all() {
          if (/SELECT t\.id, t\.title, t\.body FROM threads t/.test(sql)) {
            const needed = pins.filter((p) => !existingBotPosts.includes(p.id));
            return { results: needed };
          }
          throw new Error(`unhandled all: ${sql}`);
        },
        async run() {
          if (/INSERT INTO threads/.test(sql)) {
            inserts.push({ kind: 'thread', sql, bound });
            return { success: true };
          }
          if (/INSERT INTO posts/.test(sql)) {
            inserts.push({ kind: 'post', sql, bound });
            return { success: true };
          }
          if (/UPDATE threads SET updated_at/.test(sql)) {
            updates.push(bound[0]);
            return { success: true };
          }
          throw new Error(`unhandled run: ${sql}`);
        },
      };
      return stmt;
    },
  };
}

test('content-bot refuses the frozen seed-thread generator flag', async () => {
  const db = makeBotDb();
  const out = await runOnce({
    DB: db,
    AI: { async run() { return { response: 'hello' }; } },
    CONTENT_BOT_CREATE_THREADS: '1',
  });
  assert.equal(out.ok, false);
  assert.equal(out.error, 'seed_generator_frozen');
  assert.equal(db.inserts.length, 0);
});

test('content-bot posts one first reply on tech pins only and never creates threads', async () => {
  const pins = TECH_PIN_IDS.map((id) => ({ id, title: id, body: 'pin body' }));
  const db = makeBotDb({ pins, existingBotPosts: ['tech-winterize'] });
  const out = await runOnce({
    DB: db,
    AI: { async run() { return { response: 'Check rest voltage first, then a known load.' }; } },
  });
  assert.equal(out.ok, true);
  assert.equal(db.inserts.some((i) => i.kind === 'thread'), false);
  assert.doesNotMatch(src('workers/content-bot/index.js'), /INSERT INTO threads/);
  const postInserts = db.inserts.filter((i) => i.kind === 'post');
  assert.equal(postInserts.length, 4);
  for (const row of postInserts) {
    const threadId = row.bound[1];
    assert.equal(isTechPinId(threadId), true);
    assert.equal(threadId === 'tech-winterize', false);
    assert.match(row.bound[3], /Automated first-pass/);
    assert.equal(row.bound[2], BOT_UMRT_TEAM_ID);
  }
  assert.equal(out.replied.length, 4);
});

test('content-bot no-ops when every Tech pin already has a bot reply', async () => {
  const pins = TECH_PIN_IDS.map((id) => ({ id, title: id, body: 'pin body' }));
  const db = makeBotDb({ pins, existingBotPosts: [...TECH_PIN_IDS] });
  const out = await runOnce({
    DB: db,
    AI: { async run() { throw new Error('AI must not run'); } },
  });
  assert.equal(out.ok, true);
  assert.equal(out.skipped, 'all_pins_have_first_reply_or_missing');
  assert.equal(db.inserts.length, 0);
});

test('content-bot worker banner states pin first-reply only', () => {
  const js = src('workers/content-bot/index.js');
  assert.match(js, /pin first-reply only/i);
  assert.match(js, /TECH_PIN_IDS/);
  assert.doesNotMatch(js, /Generates one deep-dive diagnostic guide thread/);
  assert.match(src('workers/content-bot/wrangler.toml'), /Pin first-reply only/);
});

await run();
