// @vitest-environment jsdom
// #5b Rule 3 farm-screen Asleep banner (sales-stopped-spec cfff3817 §4.8 Rule 3, §5, SS-12/SS-25/SS-31; fatigue-ux ffb13c19 §2).
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { Game } from '../src/game';
import { mem } from './helpers';
import { farmBannerPick, moreText } from '../src/ui/stall-banner';
import { stallStub, type StallView } from '../src/ui/stall-sim-stub';

const shift = vi.hoisted(() => ({ calls: [] as unknown[][] }));
vi.mock('../src/ui/shift-sheet', () => ({ openShiftSheet: (...a: unknown[]) => { shift.calls.push(a); } }));
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  vi.spyOn(performance, 'now').mockImplementation(() => 5000);
});
beforeEach(() => { stallStub.reset(); shift.calls = []; localStorage.clear(); });
const fl = (f: Record<string, number>): Balance => ({ ...balance, m4: { ...balance.m4!, enabled: 1, flags: { ...balance.m4!.flags, ...f } } } as Balance);
const ON = fl({ salesStopped: 1 }), RC2 = fl({ salesStopped: 1, rc2Refill: 1 }), PAUSE = fl({ salesStopped: 1, pause: 1 });
const W = (energy: number, extra: object = {}) => ({ energy, cdS: 0, ...extra });
const st = (extra: Partial<GameState>): GameState => ({ ...initialState(balance, 1), farmLevel: 12, collectionLevel: 3, hensLevel: 6, tracksV7: 1, coinsCents: 5000,
  basket: 30, coop: 12, customers: [{ id: 1, demand: 3, filled: 0, waitedS: 2 }], ...extra } as GameState);
const view = (cause: StallView['cause']): StallView => ({ shown: true, trigger: 'sell', cause, stallId: 1, noSaleS: 9, noCollectS: 0 });
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
    expect(farmBannerPick(s, ON, null)).toMatchObject({ id: 'market_hand', more: 3, verb: 'Refill', banner: { text: 'Market Hand asleep: sales stopped', short: 'Asleep: sales stopped', aria: 'Market Hand is asleep. Auto-sales have stopped.' } });
    stallStub.atRisk = { hawker: 5, grader: 2 };
    expect(farmBannerPick(s, ON, null)).toMatchObject({ id: 'hawker', banner: { text: 'Hawker asleep: sales slowed' } });
    stallStub.atRisk = {};
    expect(farmBannerPick(s, ON, 'market_hand')).toMatchObject({ id: 'coop_hand', more: 2, banner: { text: 'Coop Hand asleep: collecting stopped' } });
    expect(farmBannerPick(st({ workers: { market_hand: W(0) } }), ON, 'market_hand')).toBeNull(); // SS-12: never the chip's role
    expect(farmBannerPick(st({ workers: { market_hand: W(10) } }), ON, null)).toBeNull(); // Tired is not Asleep
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
    expect(stallStub.notes).toContainEqual({ fn: 'noteFatigueCueShown', arg: 'banner' });
    stallStub.stall = view('mh_asleep'); m.ui.render(); expect(el.hidden).toBe(true);
    stallStub.stall = null; m.ui.render(); expect(el.hidden).toBe(false);
  });
  it('Refill tap runs today\'s manage on that worker and calls noteFatigueCueTap(banner); never a Collect', async () => {
    const m = await mount(ON, st({ workers: { market_hand: W(0) } }));
    const coop = m.g.state.coop; m.el()!.querySelector<HTMLButtonElement>('.fb-act')!.click();
    expect(m.g.state.workers.market_hand!.energy).toBeGreaterThan(0); expect(m.g.state.coop).toBe(coop);
    expect(stallStub.notes).toContainEqual({ fn: 'noteFatigueCueTap', arg: 'banner' });
  });
  it('rc2Refill = 1: "Manage" opens the Shift sheet at that worker and spends nothing (no /refill/i control on the farm)', async () => {
    const m = await mount(RC2, st({ workers: { coop_hand: W(0) } }));
    const before = JSON.stringify(m.g.state); const btn = m.el()!.querySelector<HTMLButtonElement>('.fb-act')!;
    expect(btn.textContent).toBe('Manage'); btn.click();
    expect(shift.calls).toEqual([['coop_hand', btn, 'asleep_banner']]); expect(JSON.stringify(m.g.state)).toBe(before);
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
