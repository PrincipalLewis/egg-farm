import { describe, it, expect } from 'vitest';
import { balance } from '../src/config/balance';
import type { Balance } from '../src/config/balance';
import { initialState, eggsPerSec, eggPriceCents, demandRange, customerIntervalS } from '../src/sim/state';
import { apply } from '../src/sim/actions';
import { step } from '../src/sim/tick';
import { applyOffline } from '../src/sim/offline';
import { hensCost, eggValueCost, hensCap, trackPriceCents, trackEggsPerSec, gradeMult, balancedMult } from '../src/config/formulas';
import { prodEggsPerSec, salePriceCents, trackLock, reachedMilestones, pendingMilestones, balancedStrip } from '../src/sim/tracks';
import type { SimEvent } from '../src/sim/events';
const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
const st = (o: Partial<ReturnType<typeof initialState>> = {}) => ({ ...initialState(on), ...o });
const rich = 1e12;
describe('M4-A flag off (default) = pre-M4 game', () => {
  it('ships with enabled = 0', () => { expect(balance.m4!.enabled).toBe(0); });
  it('eggs/s and price follow Farm/Collection; buyTrack is a no-op', () => {
    const s = { ...initialState(balance), farmLevel: 7, collectionLevel: 3, hensLevel: 20, eggValueLevel: 20, coinsCents: rich };
    expect(prodEggsPerSec(s, balance)).toBe(eggsPerSec(7, balance));
    expect(salePriceCents(s, balance)).toBe(eggPriceCents(7, 3, balance));
    expect(apply(s, { type: 'buyTrack', track: 'hens' }, balance)).toBe(s);
    expect(pendingMilestones(s, balance)).toEqual([]);
  });
});
describe('TR-1 costs from config', () => {
  it('Hens 36 x 1.30^H, Egg value 48 x 1.33^V (floored), as in economy.m4-candidate.csv', () => {
    expect([0, 1, 10, 30].map(L => hensCost(L, on))).toEqual([36, 46, 496, 94319]);
    expect([0, 1, 10, 30].map(L => eggValueCost(L, on))).toEqual([48, 63, 831, 249339]);
  });
  it('buying charges the cost in cents and raises the level', () => {
    const ev: SimEvent[] = [];
    const s = apply(st({ coinsCents: 10_000 }), { type: 'buyTrack', track: 'eggValue' }, on, ev);
    expect(s.eggValueLevel).toBe(1); expect(s.coinsCents).toBe(10_000 - 4800);
    expect(ev[0]).toMatchObject({ type: 'upgrade', upgrade: 'eggValue', newLevel: 1, cost: 4800 });
    expect(apply(st({ coinsCents: 3599 }), { type: 'buyTrack', track: 'hens' }, on).hensLevel).toBe(0);
  });
});
describe('TR-2 cap min(F+3, 30)', () => {
  it('refuses above F+3 with reason cap; Farm raises the cap', () => {
    let s = st({ coinsCents: rich, farmLevel: 2 });
    for (let i = 0; i < 10; i++) s = apply(s, { type: 'buyTrack', track: 'hens' }, on);
    expect(s.hensLevel).toBe(5); expect(trackLock(s, 'hens', on)).toBe('cap');
    s = apply(s, { type: 'buyFarm' }, on); expect(trackLock(s, 'hens', on)).toBeNull();
    expect(apply(s, { type: 'buyTrack', track: 'hens' }, on).hensLevel).toBe(6);
  });
  it('never above 30, even at F28-30', () => {
    expect(hensCap(28, on)).toBe(30); expect(hensCap(30, on)).toBe(30);
    const s = st({ coinsCents: rich, farmLevel: 30, hensLevel: 30 });
    expect(trackLock(s, 'hens', on)).toBe('max'); expect(apply(s, { type: 'buyTrack', track: 'hens' }, on)).toBe(s);
  });
});
describe('TR-3 / production / price', () => {
  it('demand and interval follow Farm only', () => {
    const a = st({ farmLevel: 6, hensLevel: 0 }), z = st({ farmLevel: 6, hensLevel: 9, eggValueLevel: 9 });
    expect(demandRange(a.farmLevel, on)).toEqual(demandRange(z.farmLevel, on)); expect(customerIntervalS(6, on)).toBe(customerIntervalS(6, on));
    expect(step(a, 1, on).nextCustomerInS).toBe(step(z, 1, on).nextCustomerInS);
  });
  it('eggs/s from the Hens curve x milestone; coop fills at that rate', () => {
    expect(trackEggsPerSec(9, on)).toBe(10); expect(trackEggsPerSec(10, on)).toBe(13.75); expect(trackEggsPerSec(20, on)).toBe(31.5); expect(trackEggsPerSec(30, on)).toBe(62);
    expect(step(st({ farmLevel: 0, hensLevel: 3 }), 1, on).coop).toBeCloseTo(4, 9);
  });
  it('TR-6: price = (1+0.05V)(1+0.12V) x grade x Balanced; Collection adds nothing', () => {
    expect(trackPriceCents(0, 0, 0, on)).toBe(100);
    expect(trackPriceCents(0, 0, 1, on)).toBe(118); // 1.05 x 1.12 = 1.176 -> 1.18
    expect(trackPriceCents(5, 5, 5, on)).toBe(Math.round(Math.round(1.25 * 1.6 * 1.1 * 1.1 * 100 * 1e6) / 1e6));
    expect(salePriceCents(st({ eggValueLevel: 1, collectionLevel: 9 }), on)).toBe(118);
  });
  it('the sale uses the track price', () => {
    const s = st({ basket: 10, eggValueLevel: 1, customers: [{ id: 1, demand: 10, filled: 0, waitedS: 0 }] });
    expect(apply(s, { type: 'sell', customerId: 1 }, on).coinsCents).toBe(1180);
  });
  it('offline eggs use the Hens rate', () => {
    const r = applyOffline(st({ farmLevel: 0, hensLevel: 9 }), 600_000, on);
    expect(r.eggs).toBe(Math.floor(600 * on.offline.offlineRateMultiplier * 10));
  });
});
describe('MS-1 / MS-2 milestones', () => {
  it('Hens H10/20/30 and grades apply exactly at thresholds; Jumbo (V20) stays x1.25 until F15', () => {
    expect([4, 5, 9, 10, 19].map(V => gradeMult(V, 0, on))).toEqual([1, 1.1, 1.1, 1.25, 1.25]);
    expect(gradeMult(20, 14, on)).toBe(1.25); expect(gradeMult(20, 15, on)).toBe(1.5);
  });
  it('Balanced uses min(F,H,V): +10/15/20/25/30% at 5/10/15/20/25', () => {
    expect(balancedMult(5, 5, 4, on)).toBe(1); expect(balancedMult(5, 5, 5, on)).toBe(1.1); expect(balancedMult(30, 25, 27, on)).toBe(1.3);
    expect(balancedStrip(st({ farmLevel: 12, hensLevel: 10, eggValueLevel: 11 }), on)).toEqual({ n: 2, of: 5, nextLevel: 15 });
  });
  it('reached ids are level-derived; Jumbo counts only once Farm reaches 15', () => {
    expect(reachedMilestones(st({ farmLevel: 14, hensLevel: 10, eggValueLevel: 20 }), on)).toEqual(['hens:10', 'grade:5', 'grade:10', 'balanced:1', 'balanced:2']);
    expect(reachedMilestones(st({ farmLevel: 15, hensLevel: 10, eggValueLevel: 20 }), on)).toContain('grade:20');
  });
  it('buying emits milestone_reached once; markMilestones stops it replaying', () => {
    const ev: SimEvent[] = [];
    let s = apply(st({ coinsCents: rich, farmLevel: 7, hensLevel: 9 }), { type: 'buyTrack', track: 'hens' }, on, ev);
    expect(ev.filter(e => e.type === 'milestone_reached')).toEqual([{ type: 'milestone_reached', id: 'hens:10' }]);
    expect(pendingMilestones(s, on)).toEqual(['hens:10']);
    s = apply(s, { type: 'markMilestones', ids: ['hens:10'] }, on); expect(pendingMilestones(s, on)).toEqual([]);
    expect(apply(s, { type: 'markMilestones', ids: ['hens:10'] }, on)).toBe(s);
  });
  it('buying Farm can unlock Jumbo and a Balanced tier', () => {
    const ev: SimEvent[] = [];
    apply(st({ coinsCents: rich, farmLevel: 14, hensLevel: 15, eggValueLevel: 20 }), { type: 'buyFarm' }, on, ev);
    expect(ev.filter(e => e.type === 'milestone_reached').map(e => (e as any).id)).toEqual(['grade:20', 'balanced:3']);
  });
});
describe('big numbers', () => {
  it('top-end costs and prices stay exact integers in cents', () => {
    for (const c of [hensCost(30, on), eggValueCost(30, on)]) expect(Number.isSafeInteger(c * 100)).toBe(true);
    expect(Number.isSafeInteger(trackPriceCents(30, 30, 30, on))).toBe(true);
  });
});
import { migrateTracksV7 } from '../src/sim/tracks';
import { eggPriceCents as v6Price } from '../src/config/formulas';
describe('migrateTracksV7 (TR-4 amended; pure, not yet wired into save.ts)', () => {
  // Typical save (Economy's migration_v7 assumptions): Collection = max(0, F-3).
  const v6 = (F: number) => ({ ...initialState(balance), farmLevel: F, collectionLevel: Math.max(0, F - 3), coinsCents: 12345 });
  const expected: Record<number, number> = { 0: 0, 3: 1, 10: 7, 15: 10, 20: 14, 30: 20 };
  const res = Object.fromEntries([0, 3, 10, 15, 20, 30].map(F => [F, migrateTracksV7(v6(F), on)]));
  it('H = F, V = lowest level with v7 price >= v6 price (Economy fixtures V7/V10/V14 at F10/15/20)', () => {
    for (const F of [0, 3, 10, 15, 20, 30]) { expect(res[F].state.hensLevel).toBe(F); expect(res[F].state.eggValueLevel).toBe(expected[F]); }
  });
  it('V is the lowest such level at every tested F, and price never drops', () => {
    for (const F of [0, 3, 10, 15, 20, 30]) {
      const { state: s, v6PriceCents } = res[F];
      expect(salePriceCents(s, on)).toBeGreaterThanOrEqual(v6PriceCents);
      if (s.eggValueLevel > 0) expect(trackPriceCents(F, F, s.eggValueLevel - 1, on)).toBeLessThan(v6PriceCents);
      expect(v6PriceCents).toBe(v6Price(F, Math.max(0, F - 3), on));
    }
  });
  it('eggs/s identical below H10 and never lower', () => {
    for (const F of [0, 3]) expect(prodEggsPerSec(res[F].state, on)).toBe(eggsPerSec(F, on));
    for (const F of [10, 15, 20, 30]) expect(prodEggsPerSec(res[F].state, on)).toBeGreaterThanOrEqual(eggsPerSec(F, on));
  });
  it('Collection keeps its levels; refund 0 for real saves; coins unchanged', () => {
    for (const F of [0, 3, 10, 15, 20, 30]) { expect(res[F].state.collectionLevel).toBe(Math.max(0, F - 3)); expect(res[F].migrationRefundCents).toBe(0); expect(res[F].state.coinsCents).toBe(12345); }
  });
  it('reached milestones are seeded as celebrated (no toasts after migration)', () => {
    for (const F of [10, 20, 30]) expect(pendingMilestones(res[F].state, on)).toEqual([]);
    expect(res[20].state.celebratedMilestones).toContain('hens:20');
  });
  it('clamp guard (lowered-max fixture): a level above min(F+3, max) is clamped and refunded at track cost', () => {
    const low: Balance = { ...on, maxLevel: 12 };
    const s = { ...initialState(low), farmLevel: 15, collectionLevel: 12, coinsCents: 0 };
    const r = migrateTracksV7(s, low);
    const want = [12, 13, 14].reduce((a, L) => a + hensCost(L, low) * 100, 0);
    expect(r.state.hensLevel).toBe(12); expect(r.migrationRefundCents).toBe(want); expect(r.state.coinsCents).toBe(want);
    expect(r.state.eggValueLevel).toBeLessThanOrEqual(12);
  });
  it('report', () => { console.log('MIGRATION', JSON.stringify(Object.fromEntries(Object.entries(res).map(([F, r]) => [F, { H: r.state.hensLevel, V: r.state.eggValueLevel, v6: r.v6PriceCents, v7: salePriceCents(r.state, on), refund: r.migrationRefundCents }])))); });
});
