// @vitest-environment jsdom
// Breeds UI PR-B — label-in-name sweep over EVERY Flock control on the real app (PR-A sheet via mountBreeds + PR-B chip/strip).
// BR-AC52c "every interactive Flock control" (UI doc v0.2.7 §7b / UI-BR-23). jsdom approximation; the browser script checks
// engine-computed names for the PR-B controls.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { initialState } from '../src/sim/state';
import { serialize, SAVE_KEY } from '../src/save/save';
import { Game } from '../src/game';
import { mem } from './helpers';
import type { Balance } from '../src/config/balance';
import { registerBreedsPrB } from '../src/ui/breeds-hud';
import { labelInNameIssues } from './fixtures/breeds-prB/a11y';
import { flagOnBalance, breeds } from './fixtures/breeds-prB/setup';

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
const SCOPE = '[data-testid="breeds-sheet"], [data-testid="breeds-entry"], .breeds-hud-row, #goal';
const flockIssues = () => [...new Set([...document.querySelectorAll(SCOPE)])].flatMap(r => labelInNameIssues(r.parentElement ?? r).filter(i => i.el.closest(SCOPE)))
  .filter((i, k, a) => a.findIndex(j => j.el === i.el && j.issue === i.issue) === k)
  .map(i => ({ issue: i.issue, name: i.name, visible: i.visible, html: (i.el as HTMLElement).outerHTML.slice(0, 140) }));

describe('label-in-name sweep, every Flock control', () => {
  it.each([
    ['empty slots, free hatch', { farmLevel: 20, coinsCents: 0, breeds: breeds({ freeHatchUsed: 0 }) }],
    ['owned Present/Away/Broody + settling, affordable hatch', { farmLevel: 20, coinsCents: 1e12, breeds: breeds({
      owned: { leghorn: { stars: 1 }, sussex: { stars: 0 }, cochin: { stars: 2 } }, slots: ['leghorn', 'sussex', 'cochin'], settleMs: [0, 120000, 0] }) }],
    ['incubating, unaffordable', { farmLevel: 14, coinsCents: 0, breeds: breeds({ owned: { leghorn: { stars: 0 } }, incubator: { breed: 'sussex', remainingMs: 30000, costCents: 1 } }) }],
  ])('%s: 0 issues (sheet open)', async (_n, o) => {
    registerBreedsPrB();
    const { ui } = await mount(o, flagOnBalance()); ui.render();
    const entry = document.querySelector<HTMLElement>('[data-testid="breeds-entry"], #breeds-entry, .flock-entry'); expect(entry).not.toBeNull();
    entry!.click(); ui.render();
    expect(document.querySelectorAll('[data-testid="breeds-sheet"] button').length).toBeGreaterThan(0);
    expect(flockIssues()).toEqual([]);
  });
});
