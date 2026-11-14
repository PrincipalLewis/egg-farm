// @vitest-environment jsdom
// #5b Rule 3 farm-screen Asleep banner (sales-stopped-spec cfff3817 §4.8 Rule 3, §5, SS-12/SS-25/SS-31; fatigue-ux ffb13c19 §2).
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { Game } from '../src/game';
import { mem } from './helpers';
import { farmBannerPick, moreText } from '../src/ui/stall-banner';
import { workerBanner } from '../src/ui/workers-ui';
import { workersAtRisk, qaWriteStall, qaWriteCue, qaResetAtRisk, emptyStallSession, type StallView } from '../src/ui/stall-api';
import * as stallSim from '../src/econ/stall';
import type { WorkerId } from '../src/sim/workers';
import { WORKERS } from '../src/sim/workers';

const shift = vi.hoisted(() => ({ calls: [] as unknown[][] }));
vi.mock('../src/ui/shift-sheet', () => ({ openShiftSheet: (...a: unknown[]) => { shift.calls.push(a); } }));
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  vi.spyOn(performance, 'now').mockImplementation(() => 5000);
});
beforeEach(() => {
  qaResetAtRisk(); shift.calls = []; localStorage.clear();
  vi.spyOn(stallSim, 'noteFatigueCueShown');
  vi.spyOn(stallSim, 'noteFatigueCueTap');
});
const fl = (f: Record<string, number>): Balance => ({ ...balance, m4: { ...balance.m4!, enabled: 1, flags: { ...balance.m4!.flags, ...f } } } as Balance);
const ON = fl({ salesStopped: 1 }), RC2 = fl({ salesStopped: 1, rc2Refill: 1 }), PAUSE = fl({ salesStopped: 1, pause: 1 });
const W = (energy: number, extra: object = {}) => ({ energy, cdS: 0, ...extra });
const episode = () => emptyStallSession({ cue: { on: true, aboveS: 0, belowS: 0 }, episode: 1, episodeSeq: 1 });
const st = (extra: Partial<GameState>): GameState => ({ ...initialState(balance, 1), farmLevel: 12, collectionLevel: 3, hensLevel: 6, tracksV7: 1, coinsCents: 5000,
  basket: 30, coop: 12, customers: [{ id: 1, demand: 3, filled: 0, waitedS: 2 }], stallSession: episode(), ...extra } as GameState);
const view = (cause: StallView['cause']): StallView => ({ shown: true, trigger: 'sell', cause, stallId: 1, noSaleS: 9, noCollectS: 0 });
const costliestAsleep = (s: GameState, b: Balance, covered: WorkerId | null = null) => {
  const asleep = WORKERS.filter(id => { const w = s.workers[id]; return !!w && id !== covered && w && (w as { energy: number }).energy === 0; });
  const risk = workersAtRisk(s, b);
  return asleep.reduce((a, x) => (risk[x] ?? 0) > (risk[a] ?? 0) ? x : a, asleep[0]);
};
async function mount(bal: Balance, s: GameState) {
  localStorage.setItem('eggfarm.ui', JSON.stringify({ reducedMotion: true, onboardingDone: true }));
  const g = new Game(bal, mem() as any, () => 1760000000000, 1, 'test'); g.state = { ...g.state, ...s } as any;
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, bal, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  ui.render();
  return { g, ui, el: () => document.querySelector<HTMLElement>('[data-testid=farm-asleep-banner]') };
}

describe('Rule 3 pick (pure)', () => {
  it('rc2 §6 strings per role, costliest by workerAtRisk (ties in code order), +N more, chip role excluded', () => {
    const s = st({ workers: { market_hand: W(0), coop_hand: W(0), hawker: W(0), grader: W(0) }, graderTier: 1 });
    const id = costliestAsleep(s, ON);
    const p = farmBannerPick(s, ON, null);
    expect(p).toMatchObject({ id, more: 3, verb: 'Refill', banner: workerBanner(id, 'asleep', ON) });
    const only = st({ workers: { market_hand: W(100), coop_hand: W(100), hawker: W(0), grader: W(100) }, graderTier: 1 });
    expect(farmBannerPick(only, ON, null)).toMatchObject({ id: 'hawker', banner: { text: 'Hawker asleep: sales slowed' } });
    const next = farmBannerPick(s, ON, 'market_hand');
    expect(next?.id).toBe(costliestAsleep(s, ON, 'market_hand'));
    expect(next?.more).toBe(2);
    expect(farmBannerPick(st({ workers: { market_hand: W(0) } }), ON, 'market_hand')).toBeNull();
    expect(farmBannerPick(st({ workers: { market_hand: W(10) } }), ON, null)).toBeNull();
    expect(farmBannerPick(s, RC2, null)!.verb).toBe('Manage');
    expect(moreText(0)).toBe(''); expect(moreText(2)).toBe('+2 more');
  });
  it('SS-31: a Paused worker is never named', () => {
    const s = st({ farmLevel: 12, workers: { market_hand: W(0, { paused: true }), coop_hand: W(0) } });
    const p = farmBannerPick(s, PAUSE, null);
    expect(p?.id).toBe('coop_hand'); expect(p?.more).toBe(0);
  });
});
describe('Rule 3 DOM (flag on)', () => {
  it('flag off: no banner element', async () => {
    const m = await mount(balance, st({ workers: { market_hand: W(0) } })); expect(m.el()).toBeNull();
  });
  it('shows under the top bar for an Asleep role with Refill; the chip takes that role and the banner hides (§5)', async () => {
    const m = await mount(ON, st({ workers: { market_hand: W(0), coop_hand: W(100) } }));
    const el = m.el()!; expect(el.hidden).toBe(false); expect(el.parentElement!.classList.contains('farm')).toBe(true); expect(el.parentElement!.firstElementChild).toBe(el);
    expect(el.querySelector('.bt')!.textContent).toBe('Market Hand asleep: sales stopped'); expect(el.querySelector('.sr')!.textContent).toBe('Market Hand is asleep. Auto-sales have stopped.');
    const btn = el.querySelector<HTMLButtonElement>('.fb-act')!; expect(btn.textContent).toBe('Refill'); expect(btn.hasAttribute('aria-label')).toBe(false);
    expect(stallSim.noteFatigueCueShown).toHaveBeenCalledWith(expect.anything(), 'banner');
    qaWriteStall(m.g.state, view('mh_asleep')); m.ui.render(); expect(el.hidden).toBe(true);
    qaWriteStall(m.g.state, null); m.ui.render(); expect(el.hidden).toBe(false);
  });
  it('Refill tap runs today\'s manage on that worker and calls noteFatigueCueTap(banner); never a Collect', async () => {
    const m = await mount(ON, st({ workers: { market_hand: W(0) } }));
    const coop = m.g.state.coop; m.el()!.querySelector<HTMLButtonElement>('.fb-act')!.click();
    expect(m.g.state.workers.market_hand!.energy).toBeGreaterThan(0); expect(m.g.state.coop).toBe(coop);
    expect(stallSim.noteFatigueCueTap).toHaveBeenCalledWith(expect.anything(), 'banner');
  });
  it('rc2Refill = 1: "Manage" opens the Shift sheet at that worker and spends nothing (no /refill/i control on the farm)', async () => {
    const m = await mount(RC2, st({ workers: { coop_hand: W(0) } }));
    const before = { coins: m.g.state.coinsCents, basket: m.g.state.basket, coop: m.g.state.coop, workers: structuredClone(m.g.state.workers) };
    const btn = m.el()!.querySelector<HTMLButtonElement>('.fb-act')!;
    expect(btn.textContent).toBe('Manage'); btn.click();
    expect(shift.calls).toEqual([['coop_hand', btn, 'asleep_banner']]);
    expect({ coins: m.g.state.coinsCents, basket: m.g.state.basket, coop: m.g.state.coop, workers: m.g.state.workers }).toEqual(before);
    expect(m.el()!.textContent).not.toMatch(/refill/i);
  });
});
describe('Rule 3 banner placement (Art ruling: absolute, 0 px shift; browser gate scripts/v5-ss-banner-rects.mjs)', () => {
  it('CSS: absolute over the queue band (x 8, farm - 16, 8 under the HUD/.fslot, 44-52 high); no grid row added', async () => {
    const { readFileSync } = await import('node:fs'); const css = readFileSync('src/ui/styles.css', 'utf8');
    const rule = css.match(/\n\.farm-banner\{([^}]*)\}/)![1];
    expect(rule).toMatch(/position:absolute/); expect(rule).toMatch(/left:8px;right:8px/); expect(rule).toMatch(/top:calc\(var\(--fb-top,0px\) \+ 8px\)/);
    expect(rule).toMatch(/min-height:44px/); expect(rule).toMatch(/max-height:52px/);
    expect(css).not.toMatch(/\.fb-on\{grid-template-rows/); expect(css).toMatch(/\.farm\.fb-host\{position:relative\}/);
  });
});
