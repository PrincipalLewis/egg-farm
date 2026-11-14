// @vitest-environment jsdom
// #5b Rule 4 fatigue goal bubble (sales-stopped-spec cfff3817 §4.8 Rule 4, SS-26; slot priority §4.7). Sim state = real stallSession fixtures.
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { Game } from '../src/game';
import { mem } from './helpers';
import { DOT } from '../src/ui/stall-chip';
import { qaWriteStall, qaWriteCue, qaResetAtRisk, costliestAtRisk, type StallCause, type StallView } from '../src/ui/stall-api';
import { fatigueLossCents, RULE4_DESC } from '../src/ui/fatigue-bubble';
import { fmtMoneyShort } from '../src/ui/format';
import * as stallSim from '../src/econ/stall';

const shift = vi.hoisted(() => ({ calls: [] as unknown[][] }));
vi.mock('../src/ui/shift-sheet', () => ({ openShiftSheet: (...a: unknown[]) => { shift.calls.push(a); } }));
let T = 5000;
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  vi.spyOn(performance, 'now').mockImplementation(() => T);
});
beforeEach(() => {
  qaResetAtRisk(); shift.calls = []; localStorage.clear(); T = 5000;
  vi.spyOn(stallSim, 'noteFatigueCueShown');
  vi.spyOn(stallSim, 'noteFatigueCueTap');
});
const fl = (f: Record<string, number>): Balance => ({ ...balance, m4: { ...balance.m4!, enabled: 1, flags: { ...balance.m4!.flags, ...f } } } as Balance);
const ON = fl({ salesStopped: 1 }), RC2 = fl({ salesStopped: 1, rc2Refill: 1 });
const st = (extra: Partial<GameState>): GameState => ({ ...initialState(balance, 1), farmLevel: 6, collectionLevel: 3, hensLevel: 6, tracksV7: 1, coinsCents: 5000,
  basket: 30, coop: 12, customers: [], workers: { market_hand: { energy: 0, cdS: 0 }, coop_hand: { energy: 0, cdS: 0 } }, ...extra } as GameState);
const view = (cause: StallCause, id = 1): StallView => ({ shown: true, trigger: cause.startsWith('ch') ? 'collect' : 'sell', cause, stallId: id, noSaleS: 9, noCollectS: 0 });
const money = (s: GameState, b: Balance) => fmtMoneyShort(fatigueLossCents(s, b), { round: 'floor' });
async function mount(bal: Balance) {
  localStorage.setItem('eggfarm.ui', JSON.stringify({ reducedMotion: true, onboardingDone: true }));
  const g = new Game(bal, mem() as any, () => 1760000000000, 1, 'test'); g.state = { ...g.state, ...st({}) } as any;
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, bal, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  ui.render();
  return { g, ui, goal: () => document.getElementById('goal')!, lbl: () => document.querySelector('#goal .goal-label')!.textContent };
}
describe('Rule 4 bubble (flag on)', () => {
  it('reads `Refill workers · +$X/s` ahead of buy goals while the Rule 2 state is shown; X = Σ workerAtRisk; returns to the buy goal on clear', async () => {
    const m = await mount(ON); const buy = m.lbl();
    expect(buy).not.toMatch(/Refill/);
    qaWriteCue(m.g.state, { share: 0.2, shown: true, episodeId: '1' }); m.ui.render();
    const x = money(m.g.state, ON);
    expect(m.lbl()).toBe(`Refill workers${DOT}+${x}/s`); expect(m.goal().dataset.state).toBe('fatigue');
    expect(m.goal().hasAttribute('aria-label')).toBe(false);
    expect(document.getElementById('goalDesc')!.textContent).toBe(RULE4_DESC);
    expect(stallSim.noteFatigueCueShown).toHaveBeenCalledWith(expect.anything(), 'bubble');
    qaWriteCue(m.g.state, { share: 0.05, shown: false, episodeId: '1' }); m.ui.render();
    expect(m.lbl()).toBe(buy); expect(m.goal().dataset.fatigue).toBeUndefined();
  });
  it('the stall chip wins: with the chip shown the bubble is not rendered (SS-26)', async () => {
    const m = await mount(ON); qaWriteCue(m.g.state, { share: 0.2, shown: true, episodeId: '1' });
    qaWriteStall(m.g.state, view('mh_asleep')); m.ui.render();
    expect(m.lbl()).not.toMatch(/workers/);
    expect(document.getElementById('stallChip')!.hidden).toBe(false);
  });
  it('tap (rc2Refill = 0) opens Upgrades > Workers; rc2Refill = 1 opens the Shift sheet at the costliest worker', async () => {
    let m = await mount(ON); qaWriteCue(m.g.state, { share: 0.2, shown: true, episodeId: '1' }); m.ui.render();
    m.goal().click();
    expect((document.getElementById('p-upgrades') as HTMLElement).hidden).toBe(false);
    expect(document.querySelector('.tabs [data-tab=workers]')!.classList.contains('active')).toBe(true);
    expect(stallSim.noteFatigueCueTap).toHaveBeenCalledWith(expect.anything(), 'bubble');
    m = await mount(RC2); qaWriteCue(m.g.state, { share: 0.2, shown: true, episodeId: '1' }); m.ui.render();
    const id = costliestAtRisk(m.g.state, RC2);
    m.goal().click(); expect(shift.calls).toEqual([[id, m.goal(), 'fatigue_bubble']]);
  });
  it('copy per D-HOP-2026-11-10-22: rc2Refill = 0 `Refill workers · +$X/s`, rc2Refill = 1 `Manage workers · +$X/s` (NBSP both sides of ·)', async () => {
    for (const [bal, verb] of [[ON, 'Refill'], [RC2, 'Manage']] as const) {
      const m = await mount(bal); qaWriteCue(m.g.state, { share: 0.2, shown: true, episodeId: '1' }); m.ui.render();
      const x = money(m.g.state, bal);
      expect(m.lbl()).toBe(`${verb} workers\u00a0\u00b7\u00a0+${x}/s`);
      expect(m.goal().hasAttribute('aria-label')).toBe(false);
      expect(document.getElementById('goalDesc')!.textContent).toBe(RULE4_DESC);
      qaWriteCue(m.g.state, { share: 0.05, shown: false, episodeId: '1' }); m.ui.render(); expect(m.lbl()).not.toMatch(/workers/);
    }
  });
});
