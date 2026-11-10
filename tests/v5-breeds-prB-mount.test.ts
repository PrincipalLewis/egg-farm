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
    const m = mountBbStrip({ doc: document, b, fallback: () => fb, rate: () => 100, onOpenFlock: () => opened++ })!;
    m.sync(g.state);
    expect(goal.querySelector('.goal-label')!.textContent).toMatch(/^Hatch · /); expect(goal.dataset.breedsTarget).toBe('hatch');
    expect(goal.querySelector('.goal-label')!.textContent).not.toContain('★');
    expect(document.getElementById('goalDesc')!.textContent).toMatch(/^Next goal: Hatch, /);
    goal.dispatchEvent(new MouseEvent('click', { bubbles: true })); expect(opened).toBe(1);
    fb = false; m.sync(g.state);
    expect(goal.outerHTML).toBe(before); expect(document.getElementById('goalDesc')!.textContent).toBe(descBefore);
    m.dispose();
  });
  it('flag off → null', () => expect(mountBbStrip({ doc: document, b: flagOffBalance(), rate: () => 100 })).toBeNull());
});

describe('PR-B mounts follow the live app DOM (remount without dispose, as PR-A tests do)', () => {
  it('a second app mount (old one never disposed) gets fresh PR-B mounts; the new #rate is never pulled into the old row', async () => {
    const b = flagOnBalance();
    registerBreedsPrB();
    await mount({ farmLevel: 10, hensLevel: 5, breeds: leghorn312() }, b); uis.pop(); // left mounted, never disposed (PR-A test style)
    document.body.innerHTML = '';
    const { ui } = await mount({ farmLevel: 10, hensLevel: 5, breeds: leghorn312() }, b); ui.render();
    const rate = document.getElementById('rate')!; expect(rate.isConnected).toBe(true);
    expect(document.querySelectorAll('[data-testid="breeds-hud-chip"]')).toHaveLength(1);
    expect(rate.closest('.breeds-hud-row')?.isConnected).toBe(true);
    document.body.innerHTML = '';
    const { ui: u3 } = await mount({ farmLevel: 10, hensLevel: 5 }, b); u3.render(); // no Present breed: no chip, #rate untouched
    expect(document.getElementById('rate')!.isConnected).toBe(true); expect(document.querySelector('.breeds-hud-row')).toBeNull();
  });
});

describe('PR-A ext ctx seams consumed by PR-B (seams 3d40e76e §1 ctx table)', () => {
  it('strip: Hatch tap → ctx.openFlock() (no entry-button click); countdown rate = ctx.rollingIncomeRate() (BB-5 source, not incomeRate); real ctx opens the sheet', async () => {
    const { fmtTimeToAfford } = await import('../src/ui/format'); const { hatchCostCents } = await import('../src/sim/breeds-hatch');
    const orig = PRB_EXT.onSync!; let opened = 0, entryClicks = 0, rateCalls = 0, steadyCalls = 0; const RATE = 250, STEADY = RATE * 4;
    registerBreedsPrB({ fallback: () => true }); // #100 seam forced on
    PRB_EXT.onSync = (c) => orig({ ...c, openFlock: () => { opened++; }, rollingIncomeRate: () => { rateCalls++; return RATE; }, incomeRate: () => { steadyCalls++; return STEADY; } });
    try {
      const b = flagOnBalance(); const { g, ui } = await mount({ farmLevel: 30, coinsCents: 0, breeds: breeds({ freeHatchUsed: 1 }) }, b);
      document.getElementById('breeds-entry')?.addEventListener('click', () => entryClicks++);
      ui.render();
      const cost = hatchCostCents(g.state, b);
      expect(document.querySelector('#goal .goal-label')!.textContent).toBe('Hatch · in ' + fmtTimeToAfford((cost - Math.round(g.state.coinsCents)) / RATE));
      expect(rateCalls).toBeGreaterThan(0); expect(steadyCalls).toBe(0);
      document.getElementById('goal')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(opened).toBe(1); expect(entryClicks).toBe(0);
      PRB_EXT.onSync = orig; ui.render(); // real PR-A ctx.openFlock
      document.getElementById('goal')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(document.querySelector('[data-testid="breeds-sheet"]')).not.toBeNull();
    } finally { PRB_EXT.onSync = orig; registerBreedsPrB({}); }
  });
  it('chip: return pop follows ctx.reducedMotion (true → no pop; false → pop)', async () => {
    const { prbMounts } = await import('../src/ui/breeds-hud');
    for (const rm of [true, false]) {
      let open = false; registerBreedsPrB({ gate: { open: () => open } });
      const orig = PRB_EXT.onSync!; PRB_EXT.onSync = (c) => orig({ ...c, reducedMotion: rm });
      try {
        const { ui } = await mount({ farmLevel: 10, hensLevel: 5, breeds: leghorn312() }, flagOnBalance()); ui.render();
        const hud = prbMounts().hud!; expect(hud.state).toBe('paused');
        open = true; ui.render(); expect(hud.state).toBe('active'); expect(hud.pops).toBe(rm ? 0 : 1);
      } finally { PRB_EXT.onSync = orig; registerBreedsPrB({}); while (uis.length) uis.pop()!.dispose(); document.body.innerHTML = ''; }
    }
  });
});
