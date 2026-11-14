// AC14g: the ?ios= debug flag is compiled out of the release bundle (vite build, mode production).
import { describe, it, expect } from 'vitest';
import { build } from 'vite';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
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
  it('D3/D4: no ?perf=1 SM-9 sampler and no ?debug=1 cheat panel in release (QA builds keep both)', async () => {
    const rel = await js('production'), qa = await js('qa');
    for (const m of [/eggfarmPerf/, /perf-ov/, /dbgInfo/, /get\("debug"\)/, /get\("perf"\)/]) { expect(qa).toMatch(m); expect(rel).not.toMatch(m); }
  }, 120_000);
  it('HoQA: ?qaBreeds=1 boot marker is QA-only (dead-code-eliminated in release)', async () => {
    const rel = await js('production'), qa = await js('qa');
    expect(qa).toMatch(/get\("qaBreeds"\)/);
    expect(rel).not.toMatch(/get\("qaBreeds"\)/);
    expect(rel).not.toMatch(/qaBreeds/);
  }, 120_000);
  it('has no window.eggfarm game handle in release (QA/dev builds keep it)', async () => {
    const rel = await js('production'), qa = await js('qa');
    expect(qa).toMatch(/\.eggfarm\s*=/); expect(rel).not.toMatch(/\.eggfarm\s*=/);
  }, 120_000);
  it('flag-0: production bundle module evaluates without TDZ / init throw', async () => {
    // Eager breeds-ext glob must not create an import cycle. Shipping balance keeps breeds=0.
    // Node has no `document`; ReferenceError: document is not defined is acceptable here.
    // TDZ ("Cannot access X before initialization") is the failure mode Features caught.
    const out = mkdtempSync(join(tmpdir(), 'ef-rel-load-'));
    await build({ mode: 'production', logLevel: 'silent', build: { outDir: out, emptyOutDir: true } });
    const dir = join(out, 'assets');
    const files = readdirSync(dir).filter(f => f.endsWith('.js'));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      try {
        await import(pathToFileURL(join(dir, f)).href);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        expect(msg, `TDZ in ${f}`).not.toMatch(/Cannot access .+ before initialization/);
        // Allow missing DOM globals in node; rethrow anything else.
        if (!/document is not defined|window is not defined|localStorage is not defined/.test(msg)) throw e;
      }
    }
  }, 120_000);
});
