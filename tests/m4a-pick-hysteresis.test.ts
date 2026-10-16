/** M4A-18 v1.4 + M4A-41 + clarity UC6: shared highlight/hint picker, fake clock. */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { PickHysteresis, defaultScorer, type RowScore, type FarmKey } from '../src/ui/pick-hysteresis';
import { selectGoal } from '../src/ui/next-goal';
import { paybackOf } from '../src/econ/best-buy';
const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
// Fake world: paybacks / costs / levels are scripted; the picker only sees the scorer and coins.
type W = Record<FarmKey, { cost: number; pb: number; lv: number } | undefined>;
const world: { w: W } = { w: {} as W };
const scorer = () => (Object.entries(world.w).filter(([, v]) => v) as [FarmKey, { cost: number; pb: number; lv: number }][])
  .map(([key, v]): RowScore => ({ key, costCents: v.cost, payback: v.pb, level: v.lv }));
const S = (coins: number, n = 0): GameState => ({ ...initialState(on), farmLevel: 10, hensLevel: 10, eggValueLevel: 10, coinsCents: coins, manageCdS: n });
const sig = (s: GameState) => `${s.coinsCents}|${s.manageCdS}|${JSON.stringify(world.w)}`;
let t = 0; const clock = (ms: number) => { vi.advanceTimersByTime(ms); t = Date.now(); };
afterEach(() => vi.useRealTimers());
const start = (w: W) => { vi.useFakeTimers(); vi.setSystemTime(0); t = 0; world.w = w; return new PickHysteresis(scorer, sig); };

describe('PickHysteresis rule', () => {
  it('1. picks the best payback; a pricier row with better payback beats a cheaper one', () => {
    const p = start({ FARM: { cost: 100, pb: 50, lv: 1 }, HENS: { cost: 500, pb: 20, lv: 1 }, VALUE: { cost: 300, pb: 40, lv: 1 } });
    expect(p.tick(S(1000), on, t)!.key).toBe('HENS');
    // real economy: the picked row has the minimum payback among affordable rows
    const s = { ...S(1e12), farmLevel: 12, hensLevel: 10, eggValueLevel: 14 }, r = new PickHysteresis().tick(s, on, 0)!;
    expect(r.payback).toBe(Math.min(...defaultScorer(s, on).map(x => x.payback)));
    expect(paybackOf(s, on, r.key)).toBe(r.payback);
  });
  it('ties: lower cost, then Farm > Hens > Egg value', () => {
    expect(start({ FARM: { cost: 200, pb: 10, lv: 1 }, HENS: { cost: 100, pb: 10, lv: 1 }, VALUE: undefined }).tick(S(1000), on, 0)!.key).toBe('HENS');
    expect(start({ FARM: undefined, HENS: { cost: 100, pb: 10, lv: 1 }, VALUE: { cost: 100, pb: 10, lv: 1 } }).tick(S(1000), on, 0)!.key).toBe('HENS');
    expect(start({ FARM: { cost: 100, pb: 10, lv: 1 }, HENS: { cost: 100, pb: 10, lv: 1 }, VALUE: undefined }).tick(S(1000), on, 0)!.key).toBe('FARM');
  });
  it('2. challenger at 0.91x never takes over; at 0.90x it switches at 2.0 s, not before', () => {
    const p = start({ FARM: { cost: 100, pb: 100, lv: 1 }, HENS: { cost: 100, pb: 91, lv: 1 }, VALUE: undefined });
    // HENS at 0.91x from the start would win outright, so seed FARM as the first pick, then degrade it.
    world.w.HENS!.pb = 200; expect(p.tick(S(1000), on, t)!.key).toBe('FARM');
    world.w.HENS!.pb = 91;
    for (let i = 1; i <= 100; i++) { clock(100); expect(p.tick(S(1000, i), on, t)!.key).toBe('FARM'); }
    const q = start({ FARM: { cost: 100, pb: 100, lv: 1 }, HENS: { cost: 100, pb: 200, lv: 1 }, VALUE: undefined });
    expect(q.tick(S(1000), on, t)!.key).toBe('FARM'); world.w.HENS!.pb = 90;
    for (let i = 1; i < 20; i++) { clock(100); expect(q.tick(S(1000, i), on, t)!.key).toBe('FARM'); }
    clock(100); expect(t).toBe(2000); expect(q.tick(S(1000, 20), on, t)!.key).toBe('HENS'); expect(q.changes).toBe(1);
  });
  it('3. a 0.80x challenger appearing after 3 s switches in that same evaluation', () => {
    const p = start({ FARM: { cost: 100, pb: 100, lv: 1 }, HENS: undefined, VALUE: undefined });
    expect(p.tick(S(1000), on, t)!.key).toBe('FARM'); clock(3000);
    world.w.VALUE = { cost: 100, pb: 80, lv: 1 }; expect(p.tick(S(1000), on, t)!.key).toBe('VALUE'); expect(p.evals).toBe(2);
  });
  it('4. buying the pick re-picks in the same tick', () => {
    const p = start({ FARM: { cost: 100, pb: 100, lv: 1 }, HENS: { cost: 100, pb: 105, lv: 1 }, VALUE: undefined });
    expect(p.tick(S(1000), on, t)!.key).toBe('FARM'); clock(100);
    world.w.FARM = { cost: 300, pb: 110, lv: 2 }; // bought: level up, now worse than HENS (only 1.05x, < 2 s shown)
    expect(p.tick(S(900), on, t)!.key).toBe('HENS');
  });
  it('4b. capped / MAX pick re-picks at once', () => {
    const p = start({ FARM: { cost: 100, pb: 100, lv: 1 }, HENS: { cost: 100, pb: 105, lv: 1 }, VALUE: undefined });
    p.tick(S(1000), on, t); clock(100); world.w.FARM = undefined; expect(p.tick(S(1000), on, t)!.key).toBe('HENS');
  });
  it('5. coins dropping below the pick\'s cost re-picks at once', () => {
    const p = start({ FARM: { cost: 500, pb: 100, lv: 1 }, HENS: { cost: 100, pb: 105, lv: 1 }, VALUE: undefined });
    expect(p.tick(S(1000), on, t)!.key).toBe('FARM'); clock(100);
    expect(p.tick(S(400), on, t)).toMatchObject({ key: 'HENS', affordable: true });
    clock(100); expect(p.tick(S(50), on, t)).toMatchObject({ key: 'FARM', affordable: false }); // none affordable: best overall
  });
  it('6. with no state change the 5 s re-check runs once', () => {
    const p = start({ FARM: { cost: 100, pb: 100, lv: 1 }, HENS: undefined, VALUE: undefined });
    p.tick(S(1000), on, t);
    for (let i = 0; i < 99; i++) { clock(100); p.tick(S(1000), on, t); } // 0.1 .. 9.9 s
    expect(p.evals).toBe(2);
  });
});

describe('M4A-41: 60 s of steady income, hint === highlight', () => {
  const run = (step: (sec: number) => void) => {
    const p = start({ FARM: { cost: 100, pb: 100, lv: 1 }, HENS: { cost: 100, pb: 100, lv: 1 }, VALUE: undefined });
    step(0); const first = p.tick(S(1000), on, t)!.key; const firstAt = t; const changes: number[] = [];
    let last = first;
    for (let i = 1; i <= 600; i++) { // 10 Hz, coins rising
      clock(100); step(i / 10); const s = S(1000 + i), k = p.tick(s, on, t)!.key;
      expect(selectGoal(s, on, 100, p.shown!.key).key).toBe(k);
      if (k !== last) { changes.push(t - firstAt); last = k; }
    }
    return { first, changes };
  };
  it('two rows within 10% give 0 changes', () => {
    expect(run(sec => { world.w.HENS!.pb = 95 + (sec % 2); }).changes).toEqual([]);
  });
  it('rows swapping which is better every 3 s within 10% give 0 changes', () => {
    expect(run(sec => { const a = Math.floor(sec / 3) % 2 === 0; world.w.FARM!.pb = a ? 100 : 93; world.w.HENS!.pb = a ? 93 : 100; }).changes).toEqual([]);
  });
  it('a row improving to 0.9x gives exactly 1 change, >= 2 s after the first pick', () => {
    const r = run(sec => { world.w.FARM!.pb = 100; world.w.HENS!.pb = sec < 1 ? 101 : 90; });
    expect(r.first).toBe('FARM'); expect(r.changes.length).toBe(1); expect(r.changes[0]).toBeGreaterThanOrEqual(2000);
  });
});
