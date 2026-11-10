// @vitest-environment jsdom
// #5b / #11 flag-off golden (V51-SS-1): with m4.flags.salesStopped = 0 (any fatigueCue / rc2Refill value) the whole mounted app
// markup (#app + body-level layers) over stall-shaped fixtures is byte-identical to rc/v5 d65391b. The pin was produced by running
// THIS file, unmodified, on a clean d65391b checkout (it imports nothing from the #5b/#11 code).
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { balance, type Balance } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { Game } from '../src/game';
import { mem } from './helpers';

const BASE_D65391B = 'd3faaa39ca35a9b4797d14d6219540109a4093ab0c10880104d9952d282bd12b';
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  vi.spyOn(performance, 'now').mockImplementation(() => 5000);
});
const fl = (f: Record<string, number>, enabled = 1): Balance => ({ ...balance, m4: { ...balance.m4!, enabled, flags: { ...balance.m4!.flags, ...f } } } as Balance);
const cfgs: [string, Balance][] = [
  ['shipped', balance],
  ['ss0-fc1', fl({ salesStopped: 0, fatigueCue: 1 })],
  ['ss0-rc2', fl({ salesStopped: 0, rc2Refill: 1 })],
  ['m4off-ss1-fc1', fl({ salesStopped: 1, fatigueCue: 1 }, 0)],
];
const W = (energy: number, extra: object = {}) => ({ energy, cdS: 0, ...extra });
const base = (extra: Partial<GameState>): GameState => ({ ...initialState(balance, 1), farmLevel: 6, collectionLevel: 3, hensLevel: 6, tracksV7: 1, coinsCents: 5000,
  basket: 30, coop: 12, customers: [{ id: 1, demand: 3, filled: 0, waitedS: 2 }, { id: 2, demand: 2, filled: 0, waitedS: 1 }], ...extra } as GameState);
const FX: Record<string, () => GameState> = {
  NEW: () => initialState(balance, 1),
  MH_ASLEEP: () => base({ workers: { market_hand: W(0) } }),
  MH_UNPAID: () => base({ workers: { market_hand: W(40, { unpaid: true }) } }),
  CH_ASLEEP: () => base({ basket: 0, workers: { market_hand: W(100), coop_hand: W(0) } }),
  NO_MH: () => base({ workers: {} }),
  TIRED_ALL: () => base({ workers: { market_hand: W(10), coop_hand: W(10), hawker: W(10), grader: W(0) }, graderTier: 1 }),
  MH_ASLEEP_CD: () => base({ workers: { market_hand: W(0), coop_hand: W(0) }, manageCdS: 12 }),
};
async function dump(state: GameState, bal: Balance, panel: 'market' | 'upgrades' | null) {
  const g = new Game(bal, mem() as any, () => 1760000000000, 1, 'test'); g.state = { ...g.state, ...state } as any;
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, bal, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  document.getElementById('modal-layer')?.classList.remove('open');
  ui.openPanel(panel); if (panel === 'upgrades') (document.querySelector('[data-tab=workers]') as HTMLElement)?.click();
  ui.render(); ui.render();
  return document.body.innerHTML;
}
describe('#5b/#11 flag-off DOM byte-identical to rc/v5 d65391b', () => {
  it('sha256 over (config x fixture x panel) full body markup', async () => {
    const h = createHash('sha256');
    for (const [c, bal] of cfgs) for (const [n, f] of Object.entries(FX)) for (const p of [null, 'market', 'upgrades'] as const)
      h.update(`${c}|${n}|${p}\u0002${await dump(f(), bal, p)}\u0003`);
    const got = h.digest('hex'); console.log('SS-FLAGOFF-DOM ' + got);
    expect(got).toBe(BASE_D65391B);
  });
});
