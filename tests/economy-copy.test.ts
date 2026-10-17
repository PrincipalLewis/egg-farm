// check-economy-copy is an opt-in, warn-only drift report against product/ (engineering/ci-gates.md).
// These tests never read outside the repo: the opt-in runs point ECONOMY_PRODUCT_DIR at temp dirs.
import { it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const script = new URL('../scripts/check-economy-copy.mjs', import.meta.url).pathname;
const run = (args: string[], env: Record<string, string> = {}) => {
  const r = spawnSync('node', [script, ...args], { encoding: 'utf8', env: { ...process.env, ECONOMY_PRODUCT_CHECK: '', ...env } });
  return { code: r.status, out: r.stdout + r.stderr };
};
it('default run is a no-op skip (reads nothing outside the repo)', () => {
  const r = run([], { ECONOMY_PRODUCT_DIR: '/nonexistent-should-not-be-read' });
  expect(r.code).toBe(0); expect(r.out).toMatch(/opt-in only/);
});
it('opt-in: match reported, mismatch and missing file only warn (exit 0)', () => {
  const ok = mkdtempSync(join(tmpdir(), 'prod-'));
  writeFileSync(join(ok, 'economy.csv'), readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8').replace(/\n/g, '\r\n'));
  expect(run(['--product'], { ECONOMY_PRODUCT_DIR: ok })).toMatchObject({ code: 0, out: expect.stringMatching(/matches/) });
  const bad = mkdtempSync(join(tmpdir(), 'prod-')); writeFileSync(join(bad, 'economy.csv'), 'level\n0\n');
  expect(run([], { ECONOMY_PRODUCT_CHECK: '1', ECONOMY_PRODUCT_DIR: bad })).toMatchObject({ code: 0, out: expect.stringMatching(/WARNING .*differs/) });
  expect(run(['--product'], { ECONOMY_PRODUCT_DIR: join(bad, 'nope') })).toMatchObject({ code: 0, out: expect.stringMatching(/WARNING .*not found/) });
});
it('--strict: exit 1 on mismatch or missing product file, exit 0 on match', () => {
  const ok = mkdtempSync(join(tmpdir(), 'prod-'));
  writeFileSync(join(ok, 'economy.csv'), readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8'));
  expect(run(['--product', '--strict'], { ECONOMY_PRODUCT_DIR: ok }).code).toBe(0);
  const bad = mkdtempSync(join(tmpdir(), 'prod-')); writeFileSync(join(bad, 'economy.csv'), 'level\n0\n');
  expect(run(['--product', '--strict'], { ECONOMY_PRODUCT_DIR: bad })).toMatchObject({ code: 1, out: expect.stringMatching(/ERROR .*differs/) });
  expect(run(['--product', '--strict'], { ECONOMY_PRODUCT_DIR: join(bad, 'nope') })).toMatchObject({ code: 1, out: expect.stringMatching(/ERROR .*not found/) });
  expect(run(['--strict'], { ECONOMY_PRODUCT_DIR: join(bad, 'nope') }).code).toBe(0); // still opt-in: --strict alone does nothing
});
