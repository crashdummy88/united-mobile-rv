/**
 * Minimal, dependency-free test harness. This repo deliberately ships zero
 * npm dependencies and no build step (see DEPLOYMENT.md) -- pulling in a
 * real test framework (vitest, jest, @cloudflare/vitest-pool-workers) would
 * be a bigger change than the P1 fixes these tests exist to guard, so this
 * is intentionally small: sequential named cases, plain node:assert/strict,
 * a non-zero exit code on any failure so it's CI-runnable if a workflow is
 * ever added (none exists yet -- see DEPLOYMENT.md).
 *
 * Usage: node tests/security/<file>.test.js
 */
import assert from 'node:assert/strict';

const cases = [];
let only = null;

export function test(name, fn) {
  cases.push({ name, fn });
}

export async function run() {
  let failed = 0;
  const toRun = only ? cases.filter((c) => c === only) : cases;
  for (const { name, fn } of toRun) {
    try {
      await fn();
      console.log(`  ok  - ${name}`);
    } catch (err) {
      failed++;
      console.error(`  FAIL - ${name}`);
      console.error(`         ${err && err.message ? err.message : err}`);
    }
  }
  console.log(`\n${toRun.length - failed}/${toRun.length} passed`);
  if (failed) process.exit(1);
}

export { assert };
