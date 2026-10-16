// AC14g: the ?ios= debug flag is compiled out of the release bundle (vite build, mode production).
import { describe, it, expect } from 'vitest';
import { build } from 'vite';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const js = async (mode: string) => {
  const out = mkdtempSync(join(tmpdir(), `ef-${mode}-`));
  await build({ mode, logLevel: 'silent', build: { outDir: out, emptyOutDir: true } });
  const dir = join(out, 'assets');
  return readdirSync(dir).filter(f => f.endsWith('.js')).map(f => readFileSync(join(dir, f), 'utf8')).join('\n');
};
describe('release bundle', () => {
  it('has no ?ios= override (the flag reader is dead-code eliminated)', async () => {
    const rel = await js('production'), qa = await js('qa');
    // the URL param name only exists in the bundle to read the flag
    expect(qa).toMatch(/get\("ios"\)/);
    expect(rel).not.toMatch(/get\("ios"\)/);
  }, 120_000);
  it('has no window.eggfarmOnb onboarding debug handle (QA builds only)', async () => {
    const rel = await js('production'), qa = await js('qa');
    expect(qa).toMatch(/eggfarmOnb/);
    expect(rel).not.toMatch(/eggfarmOnb/);
    expect(qa).toMatch(/eggfarmQaRecovery/); expect(rel).not.toMatch(/eggfarmQaRecovery/);
  }, 120_000);
});
