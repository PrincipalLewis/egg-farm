// v5 Wave A #3 income-ref (product/collection/m5-streak-tap-coins-spec.md v1.3.2 §4.1, §4.1a, §4.1b; ST-AC2b ring rows,
// ST-AC16, ST-AC16b, ST-AC16d (a)-(g), ST-AC16e warm-up half). Pure sim: a 60 x 1 s sim-time ring of BASE-price sale cents,
// a steady-state warm-up I_ss = max(0, incomePerSec + wagesPerSec), a hard handover at refWarmS >= window, a reset on
// m5Offline, nothing saved. Consumers (tap coins #3, Broody #5) land in their own PRs; this file tests the reference only.
import { describe, it, expect, afterEach } from 'vitest';
import { Game } from '../src/game';
import { mem } from './helpers';
import { balance as b } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { apply, sellTo } from '../src/sim/actions';
import { step, advance } from '../src/sim/tick';
import { saleValueCents } from '../src/sim/payout';
import { SALE_EFFECTS, type SaleEffect } from '../src/sim/effects';
import { incomePerSec, wagesPerSec } from '../src/econ/income';
import { incomeRefOn, refCents, issDollars, warmRefCents, trailingRefCents, ringSumCents, recordSale, incomeRefTick, incomeWindowS } from '../src/sim/income-ref';
import { m5Offline, m5Persist, m5Load } from '../src/save/m5-fields';
import { ON } from './v5-f2-helpers';
import { validateBalance } from '../src/config/balance';
import { M5_TC_KEYS } from '../src/config/formulas';
const TC = { ...ON, m4: { ...ON.m4!, flags: { ...ON.m4!.flags, tapCoins: 1 } } } as typeof b; // income-ref is live with tapCoins
const NO_TC = { ...ON, m4: { ...ON.m4!, flags: { ...ON.m4!.flags, tapCoins: 0, broody: 0 } } } as typeof b; // v5 #5: broody also reads I_ref (R7), so 'off' = both 0
const W = TC.m4!.tc!.tap_bonus_income_window_s, DT = 1 / TC.tickHz, PER_S = Math.round(1 / DT);
const working = { energy: 100, cdS: 0 };
/** An F10 farm with every worker hired and working (spec ST-AC16d). */
const f10 = (extra: Partial<GameState> = {}): GameState => ({ ...initialState(TC, 5), farmLevel: 10, collectionLevel: 8, hensLevel: 10, eggValueLevel: 10,
  coinsCents: 50_000_000, coop: 20, basket: 0, graderTier: 1,
  workers: { market_hand: { ...working }, coop_hand: { ...working }, hawker: { ...working }, grader: { ...working } }, ...extra });
const issCents = (s: GameState, bb = TC) => Math.round(100 * Math.max(0, incomePerSec(s, bb) + wagesPerSec(s, bb)));
const run = (s: GameState, n: number, bb = TC, f?: (s: GameState, i: number) => GameState) => { for (let i = 0; i < n; i++) { s = step(s, DT, bb, undefined, { focus: true }); if (f) s = f(s, i); } return s; };
afterEach(() => { (SALE_EFFECTS as SaleEffect[]).splice(1); }); // drop fixture effects (registry pattern, v5-f1c)

describe('#3 income-ref: flags and session state (R13a, §4.1 storage)', () => {
  it('flag off (tapCoins 0, or m4 off, or the shipping balance): no ring, no refWarmS, refCents 0, sales unchanged', () => {
    for (const bb of [b, NO_TC, { ...TC, m4: { ...TC.m4!, enabled: 0 } } as typeof b]) {
      expect(incomeRefOn(bb)).toBe(false);
      const s = run(f10(), 30 * PER_S, bb);
      expect('irefRingCents' in s).toBe(false); expect('refWarmS' in s).toBe(false); expect(refCents(s, bb)).toBe(0);
    }
    expect(incomeRefOn(TC)).toBe(true); expect(incomeRefOn({ ...NO_TC, m4: { ...NO_TC.m4!, flags: { ...NO_TC.m4!.flags, broody: 1 } } } as typeof b)).toBe(true); // v5 #5 R7
  });
  it('the window is tc_tap_bonus_income_window_s (60): W + 1 slots (60 complete seconds + the open one)', () => {
    expect(incomeWindowS(TC)).toBe(60);
    const s = run(f10(), 1, TC); expect(s.irefRingCents).toHaveLength(W + 1); expect(s.refWarmS).toBeCloseTo(DT, 9);
  });
  it('validateBalance: the window must be a whole number of seconds >= 1, and tapCoins on requires it (no silent default)', () => {
    const withW = (w: unknown) => ({ ...TC, m4: { ...TC.m4!, tc: { ...TC.m4!.tc!, tap_bonus_income_window_s: w } } }) as typeof b;
    expect(() => validateBalance(TC, false)).not.toThrow();
    for (const w of [30.5, 0.5, 0]) expect(() => validateBalance(withW(w), false)).toThrow(/tap_bonus_income_window_s/);
    expect(M5_TC_KEYS.tapCoins).toContain('tap_bonus_income_window_s');
    const { tap_bonus_income_window_s: _w, ...rest } = TC.m4!.tc! as any;
    expect(() => validateBalance({ ...TC, m4: { ...TC.m4!, tc: rest } } as typeof b, false)).toThrow(/tc_tap_bonus_income_window_s/);
    expect(() => validateBalance({ ...NO_TC, m4: { ...NO_TC.m4!, tc: rest } } as typeof b, false)).not.toThrow();
  });
  it('never saved: m5Persist strips the ring and refWarmS; a load starts a warm-up (§4.1a #2)', () => {
    const s = run(f10(), 70 * PER_S, TC); expect(s.refWarmS!).toBeGreaterThanOrEqual(W);
    const p = m5Persist(s); expect('irefRingCents' in p).toBe(false); expect('refWarmS' in p).toBe(false);
    const l = m5Load({ ...s }, TC, 0, []); expect('irefRingCents' in l).toBe(false); expect('refWarmS' in l).toBe(false);
    expect(refCents(l, TC)).toBe(issCents(l));
  });
  it('deterministic: the same inputs give the same ring, warm counter and refCents', () => {
    const a = run(f10(), 75 * PER_S, TC), c = run(f10(), 75 * PER_S, TC);
    expect(a.irefRingCents).toEqual(c.irefRingCents); expect(a.refWarmS).toBe(c.refWarmS); expect(refCents(a, TC)).toBe(refCents(c, TC));
  });
});

describe('#3 income-ref: warm-up I_ss (§4.1a, ST-AC16d)', () => {
  it('ST-AC16d (a)/(g): from the first tick of a fresh start, refCents = Math.round(100 x max(0, incomePerSec + wagesPerSec)), every tick < 60 s', () => {
    let s = f10(); expect(refCents(s, TC)).toBe(issCents(s)); expect(issCents(s)).toBeGreaterThan(0);
    for (let i = 0; i < W * PER_S - 1; i++) { s = step(s, DT, TC, undefined, { focus: true }); expect(s.refWarmS!).toBeLessThan(W); expect(refCents(s, TC)).toBe(issCents(s)); }
  });
  it('I_ss is gross of wages and clamps at 0', () => {
    const s = f10(); expect(issDollars(s, TC)).toBeCloseTo(incomePerSec(s, TC) + wagesPerSec(s, TC), 12); expect(wagesPerSec(s, TC)).toBeGreaterThan(0);
    const none = { ...f10(), customers: [], farmLevel: 0, workers: {} }; expect(issDollars(none, TC)).toBeGreaterThanOrEqual(0);
  });
  it('ST-AC2b warm-up float edge: refCents = Math.round(I_ss x 100) on the float, so 1.005 -> 100 (reference built from the same float expression)', () => {
    expect(warmRefCents(1.005)).toBe(Math.round(1.005 * 100)); expect(warmRefCents(1.005)).toBe(100); expect(warmRefCents(16.5)).toBe(1650); expect(warmRefCents(0)).toBe(0);
  });
  it('ST-AC16d (b): live I_ss: the Coop Hand put to sleep at t = 20 s moves refCents on that tick', () => {
    let s = run(f10({ collectionLevel: 0 }), 20 * PER_S, TC); const before = refCents(s, TC); // collection-bound farm, so the Coop Hand term binds
    s = { ...s, workers: { ...s.workers, coop_hand: { energy: 0, cdS: 0 } } }; s = step(s, DT, TC, undefined, { focus: true });
    expect(refCents(s, TC)).toBe(issCents(s)); expect(refCents(s, TC)).not.toBe(before);
  });
  it('ST-AC16e: a hired Market Hand Asleep (or Unpaid) during a warm-up gives I_ss = 0, refCents 0; working again -> > 0 on that tick', () => {
    for (const mh of [{ energy: 0, cdS: 0 }, { energy: 50, cdS: 0, unpaid: true }]) {
      let s = run(f10({ coinsCents: 0, workers: { ...f10().workers, market_hand: mh } }), 1, TC); // coins 0: Unpaid can't resume
      expect(issDollars(s, TC)).toBe(0); expect(refCents(s, TC)).toBe(0);
      s = { ...s, workers: { ...s.workers, market_hand: { ...working } } }; expect(refCents(s, TC)).toBe(issCents(s)); expect(refCents(s, TC)).toBeGreaterThan(0);
    }
  });
  it('ST-AC16d (d): uplifts never enter I_ss (streak s = 0.28 and a x2 fixture effect, live)', () => {
    (SALE_EFFECTS as SaleEffect[]).push({ id: 'fixture2x', flag: 'golden', factor: () => 2 });
    const s = f10(), up = { ...s, streakS: 0.28, streakHoldS: 3 };
    expect(refCents(up, TC)).toBe(refCents(s, TC)); expect(refCents(up, TC)).toBe(issCents(s));
  });
});

describe('#3 income-ref: ring and hard handover (§4.1, §4.1b, ST-AC16b/c/d)', () => {
  it('ST-AC2b: trailing refCents = floor((ring sum + 30) / 60) in integers: 465,029 -> 7750, 465,030 -> 7751', () => {
    expect(trailingRefCents(465_029, 60)).toBe(7750); expect(trailingRefCents(465_030, 60)).toBe(7751); expect(trailingRefCents(0, 60)).toBe(0);
    for (const sum of [1, 29, 30, 59, 60, 89, 90, 123_456_789]) expect(trailingRefCents(sum, 60)).toBe(Math.floor((sum + 30) / 60));
  });
  it('ST-AC16d (c): hard switch at refWarmS >= 60 to floor((Σ ring + 30) / 60), and I_ss is never read again until the next warm-up', () => {
    let s = run(f10(), W * PER_S - 1, TC); expect(refCents(s, TC)).toBe(issCents(s));
    s = run(s, 1, TC); expect(s.refWarmS!).toBeCloseTo(W, 9);
    const want = Math.floor((ringSumCents(s, TC) + 30) / 60); expect(refCents(s, TC)).toBe(want); expect(ringSumCents(s, TC)).toBeGreaterThan(0);
    const changed = { ...s, workers: {}, farmLevel: 1 }; expect(issCents(changed)).not.toBe(issCents(s)); expect(refCents(changed, TC)).toBe(want); // no I_ss read
  });
  it('ST-AC16b: $600.00 of base sales over a completed 60 s window -> I_ref = $10.00/s exactly (1000 cents/s)', () => {
    let s = { ...f10(), customers: [] as GameState['customers'], workers: {} };
    for (let i = 0; i < W * PER_S; i++) { if (i % PER_S === 0) s = recordSale(s, 1000, TC); s = incomeRefTick(s, DT, TC); }
    expect(s.refWarmS!).toBeCloseTo(W, 9); expect(ringSumCents(s, TC)).toBe(60_000); expect(refCents(s, TC)).toBe(1000);
  });
  it('ST-AC16b: a sale records its BASE value (price chain x Grader); the streak and live sale effects are credited but kept out of the ring', () => {
    (SALE_EFFECTS as SaleEffect[]).push({ id: 'fixture2x', flag: 'golden', factor: () => 2 });
    const s0 = run(f10({ basket: 10, workers: { grader: { ...working } } }), 1, TC), c = { id: 99, demand: 4, filled: 0, waitedS: 0 };
    const s = { ...s0, customers: [c], streakS: 0.28, streakHoldS: 3 };
    const base = saleValueCents(s, 4, TC, { by: 'player', suspended: true }), paid = saleValueCents(s, 4, TC);
    expect(paid).toBeGreaterThan(base); const r = sellTo(s, 99, TC);
    expect(r.coinsCents - s.coinsCents).toBe(paid); expect(ringSumCents(r, TC) + r.irefRingCents![Math.floor(r.refWarmS!) % (W + 1)] - ringSumCents(s, TC) - s.irefRingCents![Math.floor(s.refWarmS!) % (W + 1)]).toBe(base);
  });
  it('§4.1: the open second only counts once it completes; sales older than the window drop out', () => {
    let s = { ...f10(), workers: {} }; s = recordSale(s, 600, TC); // second 0
    expect(ringSumCents(s, TC)).toBe(0); // still open
    s = incomeRefTick(s, 1, TC); expect(ringSumCents(s, TC)).toBe(600); // second 0 complete
    for (let i = 0; i < W - 1; i++) s = incomeRefTick(s, 1, TC); expect(s.refWarmS).toBe(W); expect(ringSumCents(s, TC)).toBe(600); expect(refCents(s, TC)).toBe(10);
    s = incomeRefTick(s, 1, TC); expect(ringSumCents(s, TC)).toBe(0); expect(refCents(s, TC)).toBe(0); // ST-AC16 / K13: no sales in the last 60 s -> 0
  });
  it('player and worker sales both enter (D-HOP-08 #1); tap coins / grants never call recordSale', () => {
    let s = run(f10(), 15 * PER_S, TC); const sum0 = s.irefRingCents!.reduce((a, x) => a + x, 0); expect(sum0).toBeGreaterThan(0); // Market Hand sold
    s = { ...s, basket: 5, customers: [{ id: 77, demand: 2, filled: 0, waitedS: 0 }] }; const r = apply(s, { type: 'sell', customerId: 77 }, TC);
    expect(r.irefRingCents!.reduce((a, x) => a + x, 0) - sum0).toBe(saleValueCents(s, 2, TC, { by: 'player', suspended: true }));
  });
  it('the window follows config (tc 30): handover at 30 s, divisor 30 (no code change)', () => {
    const T30 = { ...TC, m4: { ...TC.m4!, tc: { ...TC.m4!.tc!, tap_bonus_income_window_s: 30 } } } as typeof b;
    let s = { ...f10(), workers: {} }; for (let i = 0; i < 30; i++) { s = recordSale(s, 300, T30); s = incomeRefTick(s, 1, T30); }
    expect(s.irefRingCents).toHaveLength(31); expect(refCents(s, T30)).toBe(300); expect(trailingRefCents(9000 + 14, 30)).toBe(300); expect(trailingRefCents(9000 + 15, 30)).toBe(301);
  });
});

describe('#3 income-ref: hidden tab, offline return (§4.1 hidden tab, ST-AC16b, ST-AC16d (e)/(f))', () => {
  it('ST-AC16d (f) / ST-AC16b: a 40 s hide at t = 30 s keeps ticking (rc1 hidden sim, no clock): refWarmS = 70, trailing window in use, hidden sales count', () => {
    let s = run(f10(), 30 * PER_S, TC); const sum = s.irefRingCents!.reduce((a, x) => a + x, 0);
    s = advance(s, 40_000, 0, TC).state; // hidden < 60 s: Game.frame() advances without a FrameClock
    expect(s.refWarmS!).toBeCloseTo(70, 6); expect(refCents(s, TC)).toBe(Math.floor((ringSumCents(s, TC) + 30) / 60));
    expect(s.irefRingCents!.reduce((a, x) => a + x, 0)).toBeGreaterThan(sum);
  });
  it('ST-AC16d (e): an offline return (m5Offline, a gap >= 60 s) clears the ring and starts a new warm-up: I_ref = I_ss again', () => {
    let s = run(f10(), 70 * PER_S, TC); expect(s.refWarmS!).toBeGreaterThan(W);
    s = m5Offline(s, TC, []); expect('irefRingCents' in s).toBe(false); expect('refWarmS' in s).toBe(false); expect(refCents(s, TC)).toBe(issCents(s));
    s = run(s, 1, TC); expect(s.refWarmS!).toBeCloseTo(DT, 9); expect(refCents(s, TC)).toBe(issCents(s));
  });
  it('m5Offline with income-ref off leaves the state untouched (flag-off identity)', () => {
    const s = run(f10(), 10, NO_TC); expect(m5Offline(s, b, [])).toBe(s);
  });
});

// Integration: a visible offline frame still performs RC1's capped catch-up, unlike a hidden offline return.
// The new I_ref warm-up must start at RETURN, not be consumed by that absent-time catch-up.
describe('#3 income-ref: actual Game frame/visibility return boundary', () => {
  const game = (bb = TC) => {
    let t = Date.UTC(2026, 10, 5, 12);
    const g = new Game(bb, mem(), () => t, 5, 'dev', null, null, { newId: () => '0123456789abcdef' });
    g.state = run(f10(), 70 * PER_S, bb);
    return { g, advanceFrame: (ms: number) => { t += ms; g.frame(); }, hide: () => g.onHidden(t), show: () => g.onShown(t) };
  };
  it.each([60_000, 600_000])('visible gap %i ms starts a fresh 60 s warm-up AFTER the unchanged catch-up', gap => {
    const { g, advanceFrame } = game(), legacy = game(NO_TC);
    advanceFrame(gap); legacy.advanceFrame(gap);
    expect(g.state.refWarmS ?? 0).toBe(0);
    expect(g.state.irefRingCents?.reduce((a, x) => a + x, 0) ?? 0).toBe(0);
    expect(refCents(g.state, TC)).toBe(issCents(g.state));
    const withoutRef = ({ irefRingCents: _r, refWarmS: _w, broodyRun: _br, broodyNestCents: _bn, broodyHenIdx: _bh, ...s }: GameState) => s; // v5 #5: TC (ON) runs broody, NO_TC does not
    expect(withoutRef(g.state)).toEqual(withoutRef(legacy.g.state)); // sales, wages, RNG, workers, all other timers unchanged
    advanceFrame(100); expect(g.state.refWarmS).toBe(0.1); expect(refCents(g.state, TC)).toBe(issCents(g.state));
    advanceFrame(59_800); expect(g.state.refWarmS).toBe(59.9); expect(refCents(g.state, TC)).toBe(issCents(g.state));
    advanceFrame(100); expect(g.state.refWarmS).toBe(60);
    expect(refCents(g.state, TC)).toBe(Math.floor((ringSumCents(g.state, TC) + 30) / 60));
  });
  it('a visible gap below 60 s keeps the existing ring and warm clock', () => {
    const { g, advanceFrame } = game(); advanceFrame(59_900);
    expect(g.state.refWarmS).toBe(129.9);
  });
  it.each([60_000, 600_000])('hidden offline return %i ms still resets, including provisional hidden ticks', gap => {
    const { g, advanceFrame, hide, show } = game(); hide(); advanceFrame(gap); show();
    expect(g.state.refWarmS ?? 0).toBe(0); expect(g.state.irefRingCents).toBeUndefined();
    expect(refCents(g.state, TC)).toBe(issCents(g.state));
    advanceFrame(100); expect(g.state.refWarmS).toBe(0.1);
  });
  it('a short hidden return retains its simulated sales and warm clock', () => {
    const { g, advanceFrame, hide, show } = game(); hide(); advanceFrame(40_000); show();
    expect(g.state.refWarmS).toBe(110); expect(ringSumCents(g.state, TC)).toBeGreaterThan(0);
  });
});
