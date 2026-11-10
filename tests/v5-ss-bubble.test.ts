// @vitest-environment jsdom
// #5b Rule 4 fatigue goal bubble (sales-stopped-spec cfff3817 §4.8 Rule 4, SS-26; slot priority §4.7). Sim state = local stub.
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { Game } from '../src/game';
import { mem } from './helpers';
import { stallStub } from '../src/ui/stall-sim-stub';
import { DOT } from '../src/ui/stall-chip';

const shift = vi.hoisted(() => ({ calls: [] as unknown[][] }));
vi.mock('../src/ui/shift-sheet', () => ({ openShiftSheet: (...a: unknown[]) => { shift.calls.push(a); } }));
let T = 5000;
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  vi.spyOn(performance, 'now').mockImplementation(() => T);
});
beforeEach(() => { stallStub.reset(); shift.calls = []; localStorage.clear(); T = 5000; });
const fl = (f: Record<string, number>): Balance => ({ ...balance, m4: { ...balance.m4!, enabled: 1, flags: { ...balance.m4!.flags, ...f } } } as Balance);
const ON = fl({ salesStopped: 1 }), RC2 = fl({ salesStopped: 1, rc2Refill: 1 });
const st = (extra: Partial<GameState>): GameState => ({ ...initialState(balance, 1), farmLevel: 6, collectionLevel: 3, hensLevel: 6, tracksV7: 1, coinsCents: 5000,
  basket: 30, coop: 12, customers: [], workers: { market_hand: { energy: 10, cdS: 0 }, coop_hand: { energy: 5, cdS: 0 } }, ...extra } as GameState);
const cue = (shown: boolean) => ({ share: shown ? 0.2 : 0.05, shown, episodeId: 'e1', suppressedByStall: false });
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
    stallStub.atRisk = { market_hand: 1.5, coop_hand: 0.75 }; stallStub.cue = cue(true); m.ui.render();
    expect(m.lbl()).toBe(`Refill workers${DOT}+$2.25/s`); expect(m.goal().dataset.state).toBe('fatigue');
    expect(document.getElementById('goalDesc')!.textContent).toBe('Next goal: refill workers, plus $2.25 per second.');
    expect(stallStub.notes.filter(n => n.fn === 'noteFatigueCueShown')).toEqual([{ fn: 'noteFatigueCueShown', arg: 'bubble' }]);
    stallStub.cue = cue(false); m.ui.render();
    expect(m.lbl()).toBe(buy); expect(m.goal().dataset.fatigue).toBeUndefined();
  });
  it('the stall chip wins: with the chip shown the bubble is not rendered (SS-26)', async () => {
    const m = await mount(ON); stallStub.cue = cue(true);
    stallStub.stall = { shown: true, trigger: 'sell', cause: 'mh_asleep', stallId: 's', noSaleS: 9, noCollectS: 0 }; m.ui.render(); m.ui.render();
    expect(m.lbl()).not.toMatch(/Refill workers/);
    expect(stallStub.notes.some(n => n.arg === 'bubble')).toBe(false);
  });
  it('tap (rc2Refill = 0) opens Upgrades > Workers; rc2Refill = 1 opens the Shift sheet at the costliest worker', async () => {
    let m = await mount(ON); stallStub.atRisk = { coop_hand: 2 }; stallStub.cue = cue(true); m.ui.render();
    m.goal().click();
    expect((document.getElementById('p-upgrades') as HTMLElement).hidden).toBe(false);
    expect(document.querySelector('.tabs [data-tab=workers]')!.classList.contains('active')).toBe(true);
    expect(stallStub.notes).toContainEqual({ fn: 'noteFatigueCueTap', arg: 'bubble' });
    stallStub.reset(); m = await mount(RC2); stallStub.atRisk = { market_hand: 1, coop_hand: 2 }; stallStub.cue = cue(true); m.ui.render();
    m.goal().click(); expect(shift.calls).toEqual([['coop_hand', m.goal(), 'fatigue_bubble']]);
  });
});
