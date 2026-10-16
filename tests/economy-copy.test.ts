// The repo copy must match Product's economy.csv when the studio workspace is present; skipped in a clean checkout.
import { it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const prod = new URL('../../product/economy.csv', import.meta.url);
it.runIf(existsSync(prod))('data/economy.csv == product/economy.csv (normalised line endings)', () => {
  const norm = (t: string) => t.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/\n+$/, '');
  expect(norm(readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8'))).toBe(norm(readFileSync(prod, 'utf8')));
});
it('check script exits 0 (match or skipped)', () => {
  expect(() => execFileSync('node', [new URL('../scripts/check-economy-copy.mjs', import.meta.url).pathname], { stdio: 'pipe' })).not.toThrow();
});
