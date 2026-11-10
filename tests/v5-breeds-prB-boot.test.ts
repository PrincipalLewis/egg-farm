// @vitest-environment jsdom
// Breeds UI PR-B — load trigger (FINAL, Architect + HoE 01:05 CET): PR-A's mountBreeds, inside the breeds flag guard, eager-loads
// `import.meta.glob('./breeds-ext-*.ts', { eager: true })`. PR-B ships src/ui/breeds-ext-b.ts, which registers the PR-B extender
// at import. PR-B touches no app.ts. Until PR-A's glob lands, this test imports breeds-ext-b itself (exactly what the glob does)
// and never calls registerBreedsPrB() directly.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import '../src/ui/breeds-ext-b'; // stands in for PR-A's eager glob
import { PRB_EXT } from '../src/ui/breeds-hud';
import { initialState } from '../src/sim/state';
import { serialize, SAVE_KEY } from '../src/save/save';
import { Game } from '../src/game';
import { mem } from './helpers';
import type { Balance } from '../src/config/balance';
import { flagOnBalance, flagOffBalance, leghorn312 } from './fixtures/breeds-prB/setup';

const src = (f: string) => fs.readFileSync(path.resolve(__dirname, '../src/ui', f), 'utf8');
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (globalThis as any).cancelAnimationFrame ??= (i: number) => clearTimeout(i);
});
const uis: Array<{ dispose(): void }> = [];
afterEach(() => { while (uis.length) uis.pop()!.dispose(); document.body.innerHTML = ''; });
let n = 0; const id = () => (++n).toString(16).padStart(16, '0');
async function mount(o: Record<string, unknown>, b: Balance) {
  const kv = mem() as any; kv.removeItem = (k: string) => kv.m.delete(k);
  kv.setItem(SAVE_KEY, serialize({ ...initialState(b), tracksV7: 1, seenTracksExplainer: true, ...o } as any, 1760000000000));
  kv.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false }));
  const g = new Game(b, kv, () => 1760000000500 + n * 1000, undefined, 'dev', null, null, { idbBoot: 'absent', newId: id });
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, b, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  uis.push(ui); ui.render(); return ui;
}

describe('load trigger contract (breeds-ext-b via PR-A glob)', () => {
  it('app.ts has no PR-B reference; breeds-mount.ts names no PR-B module (only the generic glob, once PR-A lands it)', () => {
    expect(src('app.ts')).not.toMatch(/breeds-(hud|strip|yard|ext)|registerBreedsPrB|PRB_EXT/);
    expect(src('breeds-mount.ts')).not.toMatch(/breeds-(hud|strip|yard|ext-b)|registerBreedsPrB|PRB_EXT/);
  });
  it('the file name matches the agreed glob ./breeds-ext-*.ts', () => {
    expect(fs.readdirSync(path.resolve(__dirname, '../src/ui')).filter(f => /^breeds-ext-.*\.ts$/.test(f))).toContain('breeds-ext-b.ts');
  });
  it('flag on: importing breeds-ext-b alone makes the chip + yard mount on the real app (no direct registerBreedsPrB call)', async () => {
    const ui = await mount({ farmLevel: 10, hensLevel: 5, breeds: leghorn312() }, flagOnBalance()); ui.render();
    expect(document.querySelectorAll('[data-testid="breeds-hud-chip"]')).toHaveLength(1);
    expect(document.querySelector('[data-testid="breeds-hud-chip"]')?.textContent).toBe('+3% active');
    expect(document.querySelector('[data-testid="breeds-yard-leghorn"]')).not.toBeNull();
  });
  it('flag off: no breeds-* nodes; #app hash identical with the extender registered vs. disabled', async () => {
    const b = flagOffBalance(), o = { farmLevel: 30, breeds: leghorn312() }, saved = { onSync: PRB_EXT.onSync, onDispose: PRB_EXT.onDispose };
    const hash = async (on: boolean) => {
      if (!on) { PRB_EXT.onSync = undefined; PRB_EXT.onDispose = undefined; }
      await mount(o, b); const x = createHash('sha256').update(document.getElementById('app')!.outerHTML.replace(/style="[^"]*"/g, '')).digest('hex');
      expect(document.querySelector('[data-testid^="breeds-"], .breeds-hud-row, [data-breed]')).toBeNull();
      uis.pop()!.dispose(); document.body.innerHTML = ''; Object.assign(PRB_EXT, saved); return x;
    };
    await hash(false); const off = await hash(false), on = await hash(true); expect(on).toBe(off);
  });
  it.todo('PENDING PR-A head: the same flag-on/flag-off cases with NO test-side import (PR-A mountBreeds eager glob loads breeds-ext-b)');
});

describe('registerBreedsPrB stable signature', () => {
  it('idempotent, and a later no-arg call (breeds-ext-b) keeps options injected earlier (Saves gate / #100 / harness)', async () => {
    const { registerBreedsPrB } = await import('../src/ui/breeds-hud');
    expect(registerBreedsPrB({ gate: { open: () => false } })).toBe(PRB_EXT); expect(registerBreedsPrB()).toBe(PRB_EXT);
    document.body.innerHTML = '<div class="hud"><span class="coins-col"><span id="rate"></span></span></div>';
    const b = flagOnBalance(); const { stateWith } = await import('./fixtures/breeds-prB/setup');
    PRB_EXT.onSync!({ g: {} as any, b, s: stateWith(b, 10, leghorn312()), flockOpen: false, docked: false });
    expect(document.querySelector('[data-testid="breeds-hud-chip"]')?.getAttribute('data-state')).toBe('paused');
    PRB_EXT.onDispose!(); registerBreedsPrB({});
  });
});
