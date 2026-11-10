// M4A-27..29 migrateTracksV7 (pure; not wired into save.ts, SAVE_VERSION stays 6). Fixtures: product/farm/m4a-spec.md v1.2 §10.
import { describe, it, expect } from 'vitest';
import { balance } from '../src/config/balance';
import type { Balance } from '../src/config/balance';
import { initialState, eggsPerSec } from '../src/sim/state';
import { apply } from '../src/sim/actions';
import { eggPriceCents, trackPriceCents, hensCost } from '../src/config/formulas';
import { migrateTracksV7 } from '../src/sim/migrate-v7';
import { prodEggsPerSec, salePriceCents, pendingMilestones, trackLock, coopCap } from '../src/sim/tracks';
import { SAVE_VERSION } from '../src/save/save';
const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
const v6 = (F: number, C: number, o: object = {}) => ({ ...initialState(on), farmLevel: F, collectionLevel: C, coinsCents: 12345, ...o });
const mig = (F: number, C: number) => migrateTracksV7(v6(F, C), on);
// [F, C, expected V, v6 cents, v7 cents] (null cents = not stated in the spec)
const FIX: [number, number, number, number | null, number | null][] = [
  [10, 7, 7, 276, 301], [15, 12, 10, 427, 474], [20, 17, 14, 608, 655],
  [0, 0, 0, 100, 100], [10, 0, 3, 150, 156], [10, 10, 8, 330, 332], [10, 30, 15, 690, 704], [15, 0, 4, null, null], [15, 15, 11, null, null],
  [15, 30, 17, null, null], [20, 0, 5, 200, 242], [20, 20, 15, null, null], [20, 25, 17, null, null], [30, 30, 20, 1150, 1275],
  [0, 5, 4, 160, 178], [1, 6, 5, 181, 220], [3, 10, 7, 253, 273], [5, 14, 9, 335, 365], [13, 30, 17, 759, 808], [0, 30, 12, 460, 488], [5, 30, 13, null, null],
];
describe('migrateTracksV7: price-matched start (M4A-28, B1)', () => {
  it('not wired: SAVE_VERSION is still 6', () => { expect(SAVE_VERSION).toBe(6); });
  for (const [F, C, V, c6, c7] of FIX) it(`F${F}/C${C} -> H${F} V${V}`, () => {
    const r = mig(F, C);
    expect(r.state.hensLevel).toBe(F); expect(r.state.eggValueLevel).toBe(V);
    if (c6 !== null) expect(r.v6PriceCents).toBe(c6);
    if (c7 !== null) expect(r.v7PriceCents).toBe(c7);
  });
  it('F20/C17 edge: V13 = 607 cents < 608, so V14 (integer cents, one half-up rounding)', () => {
    expect(trackPriceCents(20, 20, 13, on)).toBe(607); expect(eggPriceCents(20, 17, on)).toBe(608); expect(mig(20, 17).state.eggValueLevel).toBe(14);
  });
  it('V search covers 0..30 with no F+3 cap: HoP fixtures exceed the cap', () => {
    for (const [F, C, V] of [[0, 5, 4], [3, 10, 7], [5, 14, 9], [13, 30, 17]]) { expect(V).toBeGreaterThan(F + on.m4!.eggValue.capOverFarm); expect(mig(F, C).state.eggValueLevel).toBe(V); }
  });
  it('every C >= F+5 save (and all 961 saves): price never drops, V is the lowest such, refund 0, nothing clamped', () => {
    let overCap = 0;
    for (let F = 0; F <= 30; F++) for (let C = 0; C <= 30; C++) {
      const r = mig(F, C), V = r.state.eggValueLevel;
      expect(r.v7PriceCents).toBeGreaterThanOrEqual(r.v6PriceCents);
      if (V > 0) expect(trackPriceCents(F, F, V - 1, on)).toBeLessThan(r.v6PriceCents);
      expect(r.migrationRefundCents).toBe(0); expect(r.state.coinsCents).toBe(12345);
      if (C >= F + 5 && V > Math.min(30, F + 3)) overCap++;
    }
    expect(overCap).toBeGreaterThan(0);
  });
  it('grandfathered V over the cap survives, but further V buys stay blocked until F + cap > V', () => {
    let s = { ...mig(0, 5).state, coinsCents: 1e12 }; // V4 at F0 (cap 3)
    expect(trackLock(s, 'eggValue', on)).toBe('cap'); expect(apply(s, { type: 'buyTrack', track: 'eggValue' }, on)).toBe(s);
    s = apply(s, { type: 'buyFarm' }, on); expect(s.eggValueLevel).toBe(4); expect(trackLock(s, 'eggValue', on)).toBe('cap'); // F1: cap 4 = V
    s = apply(s, { type: 'buyFarm' }, on); expect(trackLock(s, 'eggValue', on)).toBeNull(); // F2: cap 5 > V
    expect(apply(s, { type: 'buyTrack', track: 'eggValue' }, on).eggValueLevel).toBe(5);
  });
  it('TR-4 never-lower: lay rate equal, coop >= v6, price >= v6 (Grader state unchanged)', () => {
    for (const F of [0, 5, 10, 15, 18, 20, 29, 30]) {
      const s0 = v6(F, Math.max(0, F - 3)), r = migrateTracksV7(s0, on);
      expect(prodEggsPerSec(r.state, on)).toBe(eggsPerSec(F, on));
      expect(coopCap(r.state, on)).toBeGreaterThanOrEqual(coopCap(s0, balance));
      expect(salePriceCents(r.state, on)).toBeGreaterThanOrEqual(eggPriceCents(F, s0.collectionLevel, on));
      expect(r.state.graderTier).toBe(s0.graderTier); expect(r.state.collectionLevel).toBe(s0.collectionLevel); expect(r.state.farmLevel).toBe(F);
    }
  });
  it('milestones reached at migration are celebrated silently; pure and deterministic', () => {
    for (const F of [10, 20, 30]) expect(pendingMilestones(mig(F, F - 3).state, on)).toEqual([]);
    expect(mig(20, 17).state.celebratedMilestones).toContain('hens:20');
    const s = v6(15, 12); const a = migrateTracksV7(s, on), z = migrateTracksV7(s, on);
    expect(a).toEqual(z); expect(s.hensLevel).toBe(0);
  });
  it('refund guard (lowered max): clamped levels refunded at the CSV cost column, once', () => {
    const r = migrateTracksV7(v6(15, 12, { coinsCents: 0 }), on, { hensMax: 12, eggValueMax: 8 });
    const want = [12, 13, 14].reduce((a, L) => a + hensCost(L, on) * 100, 0) + [8, 9].reduce((a, L) => a + on.m4!.eggValue.costs[L] * 100, 0);
    expect(r.state.hensLevel).toBe(12); expect(r.state.eggValueLevel).toBe(8);
    expect(r.migrationRefundCents).toBe(want); expect(r.state.coinsCents).toBe(want);
  });
});
