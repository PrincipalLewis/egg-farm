// @vitest-environment jsdom
// Breeds UI PR-B — registry wiring through PR-A's mountBreeds (seams 95f45895 §1): no app.ts edits; flag-off byte-identical.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { initialState } from '../src/sim/state';
import { serialize, SAVE_KEY } from '../src/save/save';
import { Game } from '../src/game';
import { mem } from './helpers';
import type { Balance } from '../src/config/balance';
import { registerBreedsPrB, PRB_EXT } from '../src/ui/breeds-hud';
import { mountBbStrip } from '../src/ui/breeds-strip';
import { flagOnBalance, flagOffBalance, leghorn312, breeds } from './fixtures/breeds-prB/setup';
import { createHash } from 'node:crypto';

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
  uis.push(ui); ui.render(); return { g, ui };
}
const h = (s: string) => createHash('sha256').update(s).digest('hex');
const appHtml = () => document.getElementById('app')!.outerHTML.replace(/style="[^"]*"/g, '');

describe('registry wiring', () => {
  it('registerBreedsPrB is idempotent (one extender)', () => { expect(registerBreedsPrB()).toBe(PRB_EXT); expect(registerBreedsPrB()).toBe(PRB_EXT); });
  it('flag on: chip + yard appear through mountBreeds onSync on the real app; dispose tears down', async () => {
    registerBreedsPrB();
    const { ui } = await mount({ farmLevel: 10, hensLevel: 5, breeds: leghorn312() }, flagOnBalance());
    ui.render();
    expect(document.querySelector('[data-testid="breeds-hud-chip"]')?.textContent).toBe('+3% active');
    expect(document.querySelector('#rate')!.closest('.breeds-hud-row')).not.toBeNull();
    expect(document.querySelector('[data-testid="breeds-yard-leghorn"]')).not.toBeNull();
    uis.pop()!.dispose();
    expect(document.querySelector('[data-testid="breeds-hud-chip"]')).toBeNull();
    expect(document.querySelector('[data-breed]')).toBeNull();
  });
  it('flag off: app DOM hash is identical with and without the PR-B extender registered (byte-identical)', async () => {
    const b = flagOffBalance(), o = { farmLevel: 30, breeds: breeds() };
    const ext = PRB_EXT, saved = { onSync: ext.onSync, onDispose: ext.onDispose };
    const once = async (withExt: boolean) => {
      if (!withExt) { ext.onSync = undefined; ext.onDispose = undefined; } else { Object.assign(ext, saved); registerBreedsPrB(); }
      await mount(o, b); const x = h(appHtml()); uis.pop()!.dispose(); document.body.innerHTML = ''; Object.assign(ext, saved); return x;
    };
    await once(false); // warm module-level UI state (queue unlock cue etc.) so both measured mounts start equal
    const without = await once(false), withExt = await once(true), without2 = await once(false);
    expect(without2).toBe(without); // the app itself is deterministic here
    expect(withExt).toBe(without);
  });
});

describe('strip DOM mount on #goal (fallback forced on: the #100 seam)', () => {
  it('writes the Hatch target into #goal, marks it, restores the BB-5 DOM when the fallback ends', async () => {
    const b = flagOnBalance(); const { g } = await mount({ farmLevel: 30, coinsCents: 1e15, breeds: breeds() }, b);
    const goal = document.getElementById('goal')!, before = goal.outerHTML, descBefore = document.getElementById('goalDesc')!.textContent;
    let fb = true; let opened = 0;
    const m = mountBbStrip({ doc: document, b, fallback: () => fb, onOpenFlock: () => opened++ })!;
    m.sync(g.state);
    expect(goal.querySelector('.goal-label')!.textContent).toMatch(/^Hatch · /); expect(goal.dataset.breedsTarget).toBe('hatch');
    expect(goal.querySelector('.goal-label')!.textContent).not.toContain('★');
    expect(document.getElementById('goalDesc')!.textContent).toMatch(/^Next goal: Hatch, /);
    goal.dispatchEvent(new MouseEvent('click', { bubbles: true })); expect(opened).toBe(1);
    fb = false; m.sync(g.state);
    expect(goal.outerHTML).toBe(before); expect(document.getElementById('goalDesc')!.textContent).toBe(descBefore);
    m.dispose();
  });
  it('flag off → null', () => expect(mountBbStrip({ doc: document, b: flagOffBalance() })).toBeNull());
});
