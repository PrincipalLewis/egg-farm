// @vitest-environment jsdom
// Breeds UI PR-B — load trigger through the REAL PR-A path (seams 3d40e76e §1). PR-A's mountBreeds module eager-globs
// `./breeds-ext-*.ts`; breeds-ext-b.ts registers the PR-B extender. PR-B touches no app.ts. This file never imports
// breeds-ext-b and never calls registerBreedsPrB() for the boot cases: the app import alone must load and register it.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PRB_EXT } from '../src/ui/breeds-hud';
import { initialState } from '../src/sim/state';
import { serialize, SAVE_KEY } from '../src/save/save';
import { Game } from '../src/game';
import { mem } from './helpers';
import type { Balance } from '../src/config/balance';
import { flagOnBalance, flagOffBalance, leghorn312, stateWith } from './fixtures/breeds-prB/setup';

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

/** PR-B extenders in PR-A's leaf registry right after importing breeds-mount (registration is synchronous: no wait, no retry). */
async function registeredViaGlob(): Promise<number> {
  await import('../src/ui/breeds-mount');
  const { breedsExtList } = await import('../src/ui/breeds-ext-registry');
  return breedsExtList().filter(e => e === PRB_EXT).length;
}

describe('load trigger: breeds-ext-b via PR-A mountBreeds eager glob (real path)', () => {
  it('contract: app.ts has no PR-B reference; breeds-mount.ts names no PR-B module, only the generic glob', () => {
    expect(src('app.ts')).not.toMatch(/breeds-(hud|strip|yard|ext)|registerBreedsPrB|PRB_EXT/);
    const m = src('breeds-mount.ts');
    expect(m).not.toMatch(/breeds-(hud|strip|yard|ext-b)|registerBreedsPrB|PRB_EXT/);
    expect(m).toContain("import.meta.glob(['./breeds-ext-*.ts', '!./breeds-ext-registry.ts'], { eager: true })");
    expect(fs.readdirSync(path.resolve(__dirname, '../src/ui')).filter(f => /^breeds-ext-.*\.ts$/.test(f) && f !== 'breeds-ext-registry.ts')).toEqual(['breeds-ext-b.ts']);
  });
  it('importing breeds-mount does not throw and PR-B registers once, synchronously, via the leaf registry', async () => {
    await expect(import('../src/ui/breeds-mount')).resolves.toBeTruthy();
    expect(await registeredViaGlob()).toBe(1);
  });
  it('flag on: the real app mount shows the chip + yard with no test-side import or registerBreedsPrB call', async () => {
    expect(await registeredViaGlob()).toBe(1);
    const ui = await mount({ farmLevel: 10, hensLevel: 5, breeds: leghorn312() }, flagOnBalance()); ui.render();
    expect(document.querySelectorAll('[data-testid="breeds-hud-chip"]')).toHaveLength(1);
    expect(document.querySelector('[data-testid="breeds-hud-chip"]')?.textContent).toBe('+3% active');
    expect(document.querySelector('[data-testid="breeds-yard-leghorn"]')).not.toBeNull();
  });
  it('flag off: PR-B onSync never fires; no breeds-* nodes; #app hash identical with the extender live vs. disabled', async () => {
    expect(await registeredViaGlob()).toBe(1);
    const b = flagOffBalance(), o = { farmLevel: 30, breeds: leghorn312() }, saved = { onSync: PRB_EXT.onSync, onDispose: PRB_EXT.onDispose };
    let fired = 0;
    const hash = async (on: boolean) => {
      if (on) PRB_EXT.onSync = (c) => { fired++; saved.onSync!(c); }; else { PRB_EXT.onSync = undefined; PRB_EXT.onDispose = undefined; }
      await mount(o, b); const x = createHash('sha256').update(document.getElementById('app')!.outerHTML.replace(/style="[^"]*"/g, '')).digest('hex');
      expect(document.querySelector('[data-testid^="breeds-"], .breeds-hud-row, [data-breed]')).toBeNull();
      uis.pop()!.dispose(); document.body.innerHTML = ''; Object.assign(PRB_EXT, saved); return x;
    };
    await hash(false); const off = await hash(false), on = await hash(true); expect(on).toBe(off); expect(fired).toBe(0);
  });
  it('breeds-ext-b imports only the leaf registry for registration (no breeds-mount / app / breeds-ui), no deferral', async () => {
    const e = src('breeds-ext-b.ts'), imports = [...e.matchAll(/^import[^;]*from '([^']+)'/gm)].map(x => x[1]);
    expect(imports.sort()).toEqual(['./breeds-ext-registry', './breeds-hud']);
    expect(e).not.toMatch(/queueMicrotask|setTimeout|Promise|prbRegistered/);
    // PR-B's own extender graph never reaches PR-A's mount / sheet / app (so the eager glob cannot cycle).
    for (const f of ['breeds-hud.ts', 'breeds-strip.ts', 'breeds-yard.ts']) expect(src(f)).not.toMatch(/from '\.\/(breeds-mount|breeds-ui|app)'/);
    await import('../src/ui/breeds-ext-b');
    expect(await registeredViaGlob()).toBe(1); // still once: cached glob module, no second register
  });
});

describe('registerBreedsPrB stable signature', () => {
  it('idempotent, and a later no-arg call keeps options injected earlier (Saves gate / #100 / harness)', async () => {
    const { registerBreedsPrB } = await import('../src/ui/breeds-hud');
    expect(registerBreedsPrB({ gate: { open: () => false } })).toBe(PRB_EXT); expect(registerBreedsPrB()).toBe(PRB_EXT);
    expect(await registeredViaGlob()).toBe(1);
    document.body.innerHTML = '<div class="hud"><span class="coins-col"><span id="rate"></span></span></div>';
    const b = flagOnBalance(); let opened = 0;
    PRB_EXT.onSync!({ g: {} as any, b, s: stateWith(b, 10, leghorn312()), flockOpen: false, docked: false,
      openFlock: () => { opened++; }, incomeRate: () => 100, rollingIncomeRate: () => 100, reducedMotion: true });
    expect(document.querySelector('[data-testid="breeds-hud-chip"]')?.getAttribute('data-state')).toBe('paused');
    expect(opened).toBe(0);
    PRB_EXT.onDispose!(); registerBreedsPrB({});
  });
});
