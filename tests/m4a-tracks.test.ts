import { describe, it, expect } from 'vitest';
import { balance } from '../src/config/balance';
import type { Balance } from '../src/config/balance';
import { initialState, eggsPerSec, eggPriceCents, demandRange, customerIntervalS } from '../src/sim/state';
import { apply } from '../src/sim/actions';
import { step } from '../src/sim/tick';
import { applyOffline } from '../src/sim/offline';
import { hensCost, eggValueCost, hensCap, trackPriceCents, trackEggsPerSec, gradeMult, balancedMult } from '../src/config/formulas';
import * as S from '../src/sim/state';
import { prodEggsPerSec, salePriceCents, coopCap, trackLock, reachedMilestones, pendingMilestones, balancedStrip } from '../src/sim/tracks';
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
  it('costs read from the CSV columns at the track level (no constants in code)', () => {
    for (let L = 0; L <= 30; L++) { expect(hensCost(L, on)).toBe(on.m4!.hens.costs[L]); expect(eggValueCost(L, on)).toBe(on.m4!.eggValue.costs[L]); }
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
  it('M4A-4/M1: lay rate = CSV eggs_per_sec at H, no milestone mult; coop fills at that rate', () => {
    for (const H of [0, 9, 10, 11, 19, 20, 29, 30]) expect(trackEggsPerSec(H, on)).toBe(eggsPerSec(H, on));
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
    expect(r.eggs).toBe(Math.floor(600 * on.offline.offlineRateMultiplier * eggsPerSec(9, on)));
  });
  // M4A-4 worked cases (spec v1.2, MJ2): H9 x1.0, H10 x1.25, H20 x1.5, H30 x2.0; 2 h time cap; egg cap x mult.
  const OFF: [number, number, number][] = [[9, 3600, 9000], [9, 3 * 3600, 18000], [10, 3600, 12375], [10, 3 * 3600, 24750], [20, 3600, 28350], [20, 3 * 3600, 56700], [30, 3600, 55800], [30, 3 * 3600, 111600], [10, 7200, 24750], [10, 7201, 24750]];
  for (const [H, s, eggs] of OFF) it(`M4A-4 offline H${H} away ${s}s = ${eggs}`, () => { expect(applyOffline(st({ farmLevel: 0, hensLevel: H }), s * 1000, on).eggs).toBe(eggs); });
  it('M4A-8 coop capacity x Hens coop mult at H10/20/30 only (boundaries 9/10/11, 19/20, 29/30); Farm drives the base', () => {
    const M = on.m4!.milestones.hens, base = (F: number) => S.coopCapacity(F, on);
    for (const [H, m] of [[9, 1], [10, M[0].coopMult], [11, M[0].coopMult], [19, M[0].coopMult], [20, M[1].coopMult], [29, M[1].coopMult], [30, M[2].coopMult]] as const)
      expect(coopCap(st({ farmLevel: 12, hensLevel: H }), on)).toBe(Math.floor(base(12) * m));
    expect(coopCap(st({ farmLevel: 12, hensLevel: 30 }), balance)).toBe(base(12));
  });
  it('M4A-14 Grader multiplies the full graded/Balanced price; top-end x7.8 stack', () => {
    const top = on.m4!.milestones, stack = top.grades[2].mult * top.balanced[4].mult * on.workers.grader.tiers[on.workers.grader.tiers.length - 1].mult;
    expect(Math.round(stack * 100) / 100).toBe(7.8);
    expect(trackPriceCents(25, 25, 25, on)).toBe(1755);
  });
  it('M4A-7 Collection never changes the price (flag on)', () => {
    for (const C of [0, 5, 30]) expect(salePriceCents(st({ farmLevel: 10, hensLevel: 10, eggValueLevel: 10, collectionLevel: C }), on)).toBe(trackPriceCents(10, 10, 10, on));
  });
  it('M4A-25 gate map: Farm stats ignore H/V; eggs/s ignores F/V; price ignores C', () => {
    const a = st({ farmLevel: 8, hensLevel: 0, eggValueLevel: 0 }), z = st({ farmLevel: 8, hensLevel: 9, eggValueLevel: 11 });
    expect(S.queueMax(a.farmLevel, on)).toBe(S.queueMax(z.farmLevel, on));
    expect(prodEggsPerSec(st({ farmLevel: 0, hensLevel: 5 }), on)).toBe(prodEggsPerSec(st({ farmLevel: 9, hensLevel: 5, eggValueLevel: 12 }), on));
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
    expect(ev.filter(e => e.type === 'milestone_reached')).toEqual([{ type: 'milestone_reached', id: 'hens:10', track: 'hens', level: 10, mult: on.m4!.milestones.hens[0].offlineMult }]);
    expect(ev.find(e => e.type === 'upgrade')).toMatchObject({ track: 'hens', upgrade: 'hens' });
    expect(pendingMilestones(s, on)).toEqual(['hens:10']);
    s = apply(s, { type: 'markMilestones', ids: ['hens:10'] }, on); expect(pendingMilestones(s, on)).toEqual([]);
    expect(apply(s, { type: 'markMilestones', ids: ['hens:10'] }, on)).toBe(s);
  });
  it('buying Farm can unlock Jumbo and a Balanced tier', () => {
    const ev: SimEvent[] = [];
    apply(st({ coinsCents: rich, farmLevel: 14, hensLevel: 15, eggValueLevel: 20 }), { type: 'buyFarm' }, on, ev);
    expect(ev.filter(e => e.type === 'milestone_reached' || e.type === 'balanced_tier').map(e => (e as any).id)).toEqual(['grade:20', 'balanced:3']);
    expect(ev.find(e => e.type === 'balanced_tier')).toMatchObject({ tier: 3, min_level: 15 });
  });
});
describe('big numbers', () => {
  it('top-end costs and prices stay exact integers in cents', () => {
    for (const c of [hensCost(30, on), eggValueCost(30, on)]) expect(Number.isSafeInteger(c * 100)).toBe(true);
    expect(Number.isSafeInteger(trackPriceCents(30, 30, 30, on))).toBe(true);
  });
});
