import { describe, it, expect } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { PROFS, run, M5X_STACKS, runSource } from './bot-m5';
import { summarizeActiveWindows, activeWindow, F5_PROFILES, F5_SEEDS, F5_FARMS } from './bot-m5-active';

const withStreak = (on: number): Balance => ({ ...balance, m4: { ...balance.m4!, flags: { ...balance.m4!.flags, streak: on } } });
const start = () => ({ ...initialState(balance, 7), coinsCents: 100000, farmLevel: 10, collectionLevel: 10, hensLevel: 10, eggValueLevel: 10,
  workers: { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 } } });

describe('F5 source-only runner (not the Economy model)', () => {
  it('keeps the existing flags-off casual run byte-identical and does not mutate its input', () => {
    const st = start(), before = JSON.stringify(st);
    const actual = runSource(balance, 7, 'casual', 30, { start: st, noBuy: true });
    const old = run(balance, 7, PROFS.casual, M5X_STACKS.none, 30, { start: st, noBuy: true });
    expect(JSON.stringify(actual)).toBe(JSON.stringify(old));
    expect(JSON.stringify(st)).toBe(before);
  });
  it('never means zero Collects even before hiring a Coop Hand (idle is not never)', () => {
    const actions: string[] = [];
    runSource(balance, 0, 'never', 30, { onObserve: (_k, a) => actions.push(a) });
    expect(actions.filter(a => a === 'collect')).toEqual([]);
  });
  it('uses an injected focused tick clock: shipped streak credit expires; no synthetic mechanics', () => {
    const st = { ...start(), streakS: 0.28, streakHoldS: 0 };
    const z = runSource(withStreak(1), 7, 'never', 5, { start: st, noBuy: true });
    expect(z.final.streakS).toBeCloseTo(0.13);
    expect(z.mech).toBe(0); // the legacy overlay did not pay anything
  });
  it('rejects inherited/unknown profile names before running', () => {
    for (const pf of ['toString', 'nope']) expect(() => runSource(balance, 0, pf as any, 1)).toThrow(/profile/);
  });
  it('retains the specified profiles and seed/checkpoint domain', () => {
    expect(F5_PROFILES).toEqual(['optimal', 'seller15', 'casual']);
    expect(PROFS.casual).toMatchObject({ tap: 0.5, catchP: 0.6 });
    expect(F5_SEEDS).toEqual(Array.from({ length: 100 }, (_, i) => i));
    expect(F5_FARMS).toEqual([10, 18, 24]);
  });
});

describe('F5 G1 measurement hooks (fail closed, never certify missing systems)', () => {
  it('runs a real paired frozen-purchase 600-second window from independent copies of the same snapshot', () => {
    const st = start(), before = JSON.stringify(st);
    const w = activeWindow(balance, 7, 'casual', st);
    expect(w).toMatchObject({ seed: 7, profile: 'casual', farm: 10, seconds: 600 });
    expect(w.activeCents).toBeGreaterThan(0); expect(w.idleCents).toBeGreaterThan(0);
    expect(w.ratio).toBe(w.activeCents / w.idleCents);
    expect(JSON.stringify(st)).toBe(before);
  });
  it('keeps a bankrupt idle denominator as null instead of skipping it', () => {
    const w = activeWindow(balance, 7, 'casual', { ...start(), coinsCents: 0 });
    expect(w.idleCents).toBe(0); expect(w.ratio).toBeNull();
  });
  const w = (seed: number, ratio: number | null) => ({ seed, profile: 'casual' as const, farm: 10, seconds: 600 as const,
    activeCents: ratio === null ? 1 : ratio * 100, idleCents: ratio === null ? 0 : 100, ratio });
  it('reports nearest-rank P95 and worst raw ratio without rounding through a threshold', () => {
    const z = summarizeActiveWindows(Array.from({ length: 20 }, (_, i) => w(i, i === 19 ? 2.250001 : 2)), []);
    expect(z.p95).toBe(2); expect(z.worstSeed).toBe(19);
    expect(z.worst).toBe(2.250001); expect(z.failures.join(' ')).toMatch(/worst/);
  });
  it('does not hide a failing F18/profile P95 inside pooled lower windows', () => {
    const windows = Array.from({ length: 200 }, (_, i) => w(i, 1));
    windows.push({ ...w(0, 2.1), farm: 18 }, { ...w(1, 2.1), farm: 18 });
    const z = summarizeActiveWindows(windows, []);
    expect(z.p95).toBe(1);
    expect(z.failures.join(' ')).toMatch(/casual\|18.*P95/);
  });
  it('empty, zero-denominator, NaN and negative inputs are failures, not silently dropped windows', () => {
    expect(summarizeActiveWindows([], []).failures.length).toBeGreaterThan(0);
    for (const ratio of [null, NaN, Infinity, -1]) {
      const z = summarizeActiveWindows([w(0, ratio)], []);
      expect(z.failures.length).toBeGreaterThan(0); expect(z.status).not.toBe('PASS');
    }
  });
  it('reports missing coverage and explicit system dependencies even when all measured ratios pass', () => {
    const z = summarizeActiveWindows([w(0, 1)], [{ seed: 0, profile: 'casual', farm: 10 }, { seed: 1, profile: 'casual', farm: 18 }]);
    expect(z.missing).toEqual([{ seed: 1, profile: 'casual', farm: 18 }]);
    expect(z.status).toBe('DEPENDENCY-BLOCKED');
    expect(z.dependencies.join(' ')).toMatch(/golden/); expect(z.dependencies.join(' ')).toMatch(/abilities/);
    expect(z.coverage).toMatch(/sampled/);
  });
});
