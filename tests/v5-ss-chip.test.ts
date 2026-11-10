// @vitest-environment jsdom
// #5b V51-SS-1 flag-on tests (sales-stopped-spec cfff3817 §4.4-§4.7, SS-36). The sim side is the LOCAL STUB (src/ui/stall-sim-stub.ts):
// the tests set the pinned StallView shape and check that the UI only reads it, acts once per tap and calls noteStallChipTap.
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { Game } from '../src/game';
import { mem } from './helpers';
import { chipCopy, DOT, CAUSE_WORKER } from '../src/ui/stall-chip';
import { stallStub, type StallView, type StallCause } from '../src/ui/stall-sim-stub';
import { stallView } from '../src/ui/stall-api';

const shift = vi.hoisted(() => ({ calls: [] as unknown[][] }));
vi.mock('../src/ui/shift-sheet', () => ({ openShiftSheet: (...a: unknown[]) => { shift.calls.push(a); } }));

let T = 5000;
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  vi.spyOn(performance, 'now').mockImplementation(() => T);
});
beforeEach(() => { stallStub.reset(); shift.calls = []; T = 5000; localStorage.clear(); });
const fl = (f: Record<string, number>): Balance => ({ ...balance, m4: { ...balance.m4!, enabled: 1, flags: { ...balance.m4!.flags, ...f } } } as Balance);
const ON = fl({ salesStopped: 1 }), RC2 = fl({ salesStopped: 1, rc2Refill: 1 });
const W = (energy: number, extra: object = {}) => ({ energy, cdS: 0, ...extra });
const st = (extra: Partial<GameState>): GameState => ({ ...initialState(balance, 1), farmLevel: 6, collectionLevel: 3, hensLevel: 6, tracksV7: 1, coinsCents: 5000,
  basket: 30, coop: 12, customers: [{ id: 1, demand: 3, filled: 0, waitedS: 2 }], ...extra } as GameState);
const view = (cause: StallCause, id = 'st1'): StallView => ({ shown: true, trigger: cause.startsWith('ch') ? 'collect' : 'sell', cause, stallId: id, noSaleS: 9, noCollectS: 0 });
async function mount(bal: Balance, s: GameState, rmOn = true) {
  if (rmOn) localStorage.setItem('eggfarm.ui', JSON.stringify({ reducedMotion: true, onboardingDone: true }));
  const g = new Game(bal, mem() as any, () => 1760000000000, 1, 'test'); g.state = { ...g.state, ...s } as any;
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, bal, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  document.getElementById('modal-layer')?.classList.remove('open');
  (document.querySelector('#modal-layer .btn') as HTMLElement | null)?.click();
  ui.render();
  return { g, ui, chip: () => document.getElementById('stallChip') as HTMLButtonElement | null, goal: () => document.getElementById('goal')! };
}

describe('§4.4 chip copy (pure)', () => {
  const c0 = { rc2Refill: false, cooldown: false, needCents: 1234 };
  it('visible text per cause, NBSP around the dot, rc2Refill = 0', () => {
    const t = (c: StallCause, x = c0) => chipCopy(c, x).text;
    expect(DOT).toBe('\u00a0\u00b7\u00a0');
    expect(t('mh_asleep')).toBe(`Market Hand asleep${DOT}Refill`);
    expect(t('mh_paused')).toBe(`Market Hand on break${DOT}Sell all`);
    expect(t('mh_unpaid')).toBe(`Market Hand unpaid${DOT}Sell all`);
    expect(t('no_mh')).toBe(`Eggs waiting${DOT}Sell all`);
    expect(t('ch_asleep')).toBe(`Coop Hand asleep${DOT}Refill`);
    expect(t('ch_unpaid')).toBe(`Coop Hand unpaid${DOT}Collect`);
    expect(t('other')).toBe(`Sales stopped${DOT}Sell all`);
  });
  it('§4.6 cooldown swap (rc2Refill = 0) and SS-36 Manage (rc2Refill = 1, no cooldown swap)', () => {
    expect(chipCopy('mh_asleep', { ...c0, cooldown: true })).toMatchObject({ text: `Market Hand asleep${DOT}Sell all`, action: 'sell_all' });
    expect(chipCopy('ch_asleep', { ...c0, cooldown: true })).toMatchObject({ text: `Coop Hand asleep${DOT}Collect`, action: 'collect' });
    for (const cd of [false, true]) {
      expect(chipCopy('mh_asleep', { ...c0, rc2Refill: true, cooldown: cd })).toMatchObject({ text: `Market Hand asleep${DOT}Manage`, action: 'manage', worker: 'market_hand' });
      expect(chipCopy('ch_asleep', { ...c0, rc2Refill: true, cooldown: cd })).toMatchObject({ text: `Coop Hand asleep${DOT}Manage`, action: 'manage', worker: 'coop_hand' });
    }
    // unpaid / paused / no_mh labels are unchanged by rc2Refill
    for (const c of ['mh_paused', 'mh_unpaid', 'no_mh', 'ch_unpaid', 'other'] as const) expect(chipCopy(c, { ...c0, rc2Refill: true }).text).toBe(chipCopy(c, c0).text);
  });
  it('describedby sentences (rc2 §6 aria + "Tap to {verb}.")', () => {
    const d = (c: StallCause, x = c0) => chipCopy(c, x).desc;
    expect(d('mh_asleep')).toBe('Market Hand is asleep. Auto-sales have stopped. Tap to refill.');
    expect(d('mh_asleep', { ...c0, cooldown: true })).toBe('Market Hand is asleep. Auto-sales have stopped. Tap to sell all.');
    expect(d('mh_asleep', { ...c0, rc2Refill: true })).toBe('Market Hand is asleep. Auto-sales have stopped. Tap to manage.');
    expect(d('mh_paused')).toBe('Market Hand is on break. Auto-sales have stopped. Tap to sell all.');
    expect(d('mh_unpaid')).toBe('Market Hand is unpaid. Auto-sales have stopped. Needs 12.34 dollars. Tap to sell all.');
    expect(d('no_mh')).toBe('Customers are waiting and eggs are ready. Tap to sell all.');
    expect(d('ch_asleep', { ...c0, cooldown: true })).toBe('Coop Hand is asleep. Auto-collecting has stopped. Tap to collect.');
    expect(d('ch_unpaid')).toBe('Coop Hand is unpaid. Auto-collecting has stopped. Tap to collect.');
    expect(d('other')).toBe('Sales have stopped. Tap to sell all.');
  });
  it('icons: zzz for asleep, pause for mh_paused, warning for unpaid/other, nest for no_mh; no emoji or ⚠ anywhere', () => {
    const ic = Object.fromEntries((Object.keys(CAUSE_WORKER) as StallCause[]).map(c => [c, chipCopy(c, c0).icon]));
    expect(ic).toEqual({ mh_asleep: 'zzz', mh_paused: 'pause', mh_unpaid: 'warning', no_mh: 'nest', ch_asleep: 'zzz', ch_unpaid: 'warning', other: 'warning' });
    for (const c of Object.keys(CAUSE_WORKER) as StallCause[]) for (const x of [c0, { ...c0, rc2Refill: true }]) expect(chipCopy(c, x).text + chipCopy(c, x).desc).not.toMatch(/[\u26A0\u{1F300}-\u{1FAFF}]/u);
  });
});

describe('flag guard', () => {
  it('salesStopped = 0: stallView is hidden even with a stub view set, and no chip is mounted', async () => {
    stallStub.stall = view('mh_asleep');
    expect(stallView(st({}), balance).shown).toBe(false);
    const m = await mount(balance, st({ workers: { market_hand: W(0) } }));
    expect(m.chip()).toBeNull(); expect(document.querySelector('.collectbar')!.classList.contains('ss-on')).toBe(false);
  });
});

describe('#5b chip DOM (flag on)', () => {
  it('shows in the #goal slot over the bubble: name = visible text (no aria-label), describedby sentence, live region once per show', async () => {
    const m = await mount(ON, st({ workers: { market_hand: W(0) } }));
    expect(m.chip()!.hidden).toBe(true);
    stallStub.stall = view('mh_asleep'); m.ui.render();
    const c = m.chip()!;
    expect(c.hidden).toBe(false); expect(c.hasAttribute('aria-label')).toBe(false); expect(c.tagName).toBe('BUTTON');
    expect(c.textContent).toBe(`Market Hand asleep${DOT}Refill`);
    expect(document.getElementById(c.getAttribute('aria-describedby')!)!.textContent).toBe('Market Hand is asleep. Auto-sales have stopped. Tap to refill.');
    const live = document.getElementById('stallLive')!;
    expect(live.getAttribute('role')).toBe('status'); expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toBe('Market Hand is asleep. Auto-sales have stopped. Tap to refill.');
    expect(m.goal().getAttribute('aria-hidden')).toBe('true'); expect(m.goal().tabIndex).toBe(-1); expect(m.goal().hidden).toBe(false); // laid out, 0 px shift
    expect(c.previousElementSibling).toBe(m.goal()); // same slot, DOM order right after the bubble
    live.textContent = ''; m.ui.render(); m.ui.render(); expect(live.textContent).toBe(''); // no re-announce for the same stall_id
    expect(c.querySelector('.ss-ph')!.getAttribute('data-ph')).toBe('ico_fatigue_zzz'); // placeholder icon until Art's file lands
  });
  it('tap = one Refill (manage on market_hand), noteStallChipTap first, repeats inside tc.stall_tap_guard_ms ignored, never reaches #scene', async () => {
    const m = await mount(ON, st({ workers: { market_hand: W(0), coop_hand: W(100) } }));
    stallStub.stall = view('mh_asleep'); m.ui.render();
    const coop = m.g.state.coop;
    m.chip()!.click();
    expect(m.g.state.workers.market_hand!.energy).toBeGreaterThan(0);
    expect(stallStub.notes.filter(n => n.fn === 'noteStallChipTap')).toEqual([{ fn: 'noteStallChipTap', arg: 'refill' }]);
    expect(m.g.state.coop).toBe(coop); // SS-35: no Collect from a chip tap
    T += balance.m4!.tc!.stall_tap_guard_ms - 1; m.chip()!.click();
    expect(stallStub.notes.filter(n => n.fn === 'noteStallChipTap').length).toBe(1);
    T += 2; m.chip()!.click(); expect(stallStub.notes.filter(n => n.fn === 'noteStallChipTap').length).toBe(2);
  });
  it('cooldown: label swaps in place to "· Sell all" and the tap sells', async () => {
    const m = await mount(ON, st({ workers: { market_hand: W(0) }, manageCdS: 12 }));
    stallStub.stall = view('mh_asleep'); m.ui.render();
    expect(m.chip()!.textContent).toBe(`Market Hand asleep${DOT}Sell all`);
    const basket = m.g.state.basket; m.chip()!.click();
    expect(m.g.state.basket).toBeLessThan(basket); expect(stallStub.notes.at(-1)).toEqual({ fn: 'noteStallChipTap', arg: 'sell_all' });
  });
  it('ch_unpaid: tap collects once', async () => {
    const m = await mount(ON, st({ basket: 0, workers: { market_hand: W(100), coop_hand: W(50, { unpaid: true }) } }));
    stallStub.stall = view('ch_unpaid'); m.ui.render();
    const coop = m.g.state.coop; m.chip()!.click();
    expect(m.g.state.coop).toBeLessThan(coop); expect(stallStub.notes.at(-1)).toEqual({ fn: 'noteStallChipTap', arg: 'collect' });
  });
  it('SS-36 rc2Refill = 1: "· Manage" opens the Shift sheet via openShiftSheet(id, opener, "stall_chip") and spends nothing', async () => {
    const m = await mount(RC2, st({ workers: { market_hand: W(0), coop_hand: W(0) }, manageCdS: 12 }));
    stallStub.stall = view('ch_asleep'); m.ui.render();
    expect(m.chip()!.textContent).toBe(`Coop Hand asleep${DOT}Manage`);
    const before = JSON.stringify(m.g.state); m.chip()!.click();
    expect(shift.calls).toEqual([['coop_hand', m.chip(), 'stall_chip']]);
    expect(stallStub.notes.at(-1)).toEqual({ fn: 'noteStallChipTap', arg: 'manage' });
    expect(JSON.stringify(m.g.state)).toBe(before);
  });
  it('cause change swaps text without re-show; clear hides it (reduced motion: instant) and returns the bubble, focus moves to the bubble', async () => {
    const m = await mount(ON, st({ workers: { market_hand: W(0) } }));
    stallStub.stall = view('mh_asleep'); m.ui.render();
    stallStub.stall = view('mh_unpaid'); m.ui.render();
    expect(m.chip()!.textContent).toBe(`Market Hand unpaid${DOT}Sell all`); expect(m.chip()!.dataset.tone).toBe('danger');
    m.chip()!.focus(); stallStub.stall = null; m.ui.render();
    expect(m.chip()!.hidden).toBe(true); expect(m.goal().hasAttribute('aria-hidden')).toBe(false); expect(m.goal().hasAttribute('tabindex')).toBe(false);
    expect(document.activeElement).toBe(m.goal());
  });
  it('a new stall_id after a hide announces again (once per show)', async () => {
    const m = await mount(ON, st({ workers: { market_hand: W(0) } }));
    stallStub.stall = view('mh_asleep', 'a'); m.ui.render(); const live = document.getElementById('stallLive')!; live.textContent = '';
    stallStub.stall = null; m.ui.render(); T += 1500; stallStub.stall = view('mh_asleep', 'b'); m.ui.render();
    expect(live.textContent).toBe('Market Hand is asleep. Auto-sales have stopped. Tap to refill.');
  });
  it('UI gates: hidden while a sheet covers the farm', async () => {
    const m = await mount(ON, st({ workers: { market_hand: W(0) } }));
    stallStub.stall = view('mh_asleep'); m.ui.render(); expect(m.chip()!.hidden).toBe(false);
    m.ui.openPanel('upgrades'); m.ui.render(); expect(m.chip()!.hidden).toBe(true);
    m.ui.openPanel(null); m.ui.render(); expect(m.chip()!.hidden).toBe(false);
  });
  it('the UI emits no telemetry of its own for the chip (sales_stall is the sim\'s)', async () => {
    const m = await mount(ON, st({ workers: { market_hand: W(0) } }));
    const spy = vi.spyOn(m.g.telemetry, 'track');
    stallStub.stall = view('mh_asleep'); m.ui.render(); m.chip()!.click(); stallStub.stall = null; m.ui.render();
    expect(spy.mock.calls.map(c => c[0]).filter(n => /stall|fatigue/.test(String(n)))).toEqual([]);
  });
});
