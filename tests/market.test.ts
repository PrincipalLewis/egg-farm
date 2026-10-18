import { describe, it, expect } from 'vitest';
import { balance as b, validateBalance } from '../src/config/balance';
import { salePriceCents } from '../src/sim/tracks';
import { initialState, customerIntervalS, GameState, eggPriceCents, demandRange, farmCost, queueMax } from '../src/sim/state';
import { step, advance } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import type { SimEvent } from '../src/sim/events';
const s0 = (seed = 42) => initialState(b, seed);
const cust = (id: number, demand: number, filled = 0, waitedS = 0) => ({ id, demand, filled, waitedS });
const run = (s: GameState, ms: number, ev?: SimEvent[]) => advance(s, ms, 0, b, ev).state;
describe('config tunables (economy.md names)', () => {
  it('has market + feel tunables', () => {
    expect(b.customers).toEqual({ customer_patience_s: 30, first_customer_s: 10, queue_max_base: 6, queue_max_cap: 10, queue_max_step_levels: 5 });
    expect(b.feel).toMatchObject({ tap_combine_window_ms: 250, max_flying_eggs: 5 });
  });
  it.each([
    ['queue base non-integer', (x: any) => { x.customers.queue_max_base = 2.5; }],
    ['queue cap 0', (x: any) => { x.customers.queue_max_cap = 0; }],
    ['queue cap < base', (x: any) => { x.customers.queue_max_cap = 5; }],
    ['patience 0', (x: any) => { x.customers.customer_patience_s = 0; }],
    ['negative first arrival', (x: any) => { x.customers.first_customer_s = -1; }],
    ['demand lo > hi', (x: any) => { x.farm.demandLoFactor = 2; }],
    ['cost growth < 1', (x: any) => { x.collection.costGrowth = 0.9; }],
    ['tap window 0', (x: any) => { x.feel.tap_combine_window_ms = 0; }],
    ['flying eggs 1.5', (x: any) => { x.feel.max_flying_eggs = 1.5; }],
    ['string value', (x: any) => { x.feel.max_flying_eggs = '5'; }],
  ])('rejects %s', (_n, mut) => { const x = structuredClone(b); mut(x); expect(() => validateBalance(x)).toThrow(); });
  it('reads values from config (MK-15)', () => {
    const x = structuredClone(b); x.customers.first_customer_s = 4; x.customers.queue_max_base = 1; x.customers.queue_max_cap = 1;
    expect(run(initialState(b, 1), 4000).customers).toHaveLength(0);
    expect(advance(initialState(x, 1), 4000, 0, x).state.customers).toHaveLength(1);
    expect(advance(initialState(x, 1), 60_000, 0, x).state.customers.length).toBeLessThanOrEqual(1);
  });
});
describe('market spec MK-*', () => {
  it('MK-2 spawn interval at L10 is 5.99s', () => {
    const ev: SimEvent[] = []; let s = { ...s0(), farmLevel: 10, nextCustomerInS: 0.05 }; s = run(s, 100, ev);
    const t0 = ev.length; s = run(s, Math.floor(customerIntervalS(10, b) * 1000) - 100, ev); expect(ev.length).toBe(t0);
    run(s, 200, ev); expect(ev.filter(e => e.type === 'customer_arrive')).toHaveLength(2);
  });
  it('MK-3 / Q2 arrival to a full queue is lost, no burst later', () => {
    const ev: SimEvent[] = [];
    let s = { ...s0(), customers: Array.from({ length: queueMax(0, b) }, (_, i) => cust(i + 1, 5, 1)), nextCustomerInS: 0.05 };
    s = step(s, 0.1, b, ev); expect(s.customers).toHaveLength(queueMax(0, b)); expect(ev).toContainEqual({ type: 'customer_lost', reason: 'full_queue' });
    s = apply({ ...s, basket: 100 }, { type: 'sellAll' }, b); expect(s.customers).toHaveLength(0);
    s = step(s, 0.1, b); expect(s.customers).toHaveLength(0); // no backlog
  });
  it('MK-4 demand distribution at L0 (10k seeded spawns)', () => {
    let s = s0(7); const counts: Record<number, number> = {};
    for (let i = 0; i < 10_000; i++) { s = step({ ...s, customers: [], nextCustomerInS: 0 }, 0.001, b); const d = s.customers[0].demand; counts[d] = (counts[d] ?? 0) + 1; }
    const [lo, hi] = demandRange(0, b); const n = hi - lo + 1;
    expect(Object.keys(counts).map(Number).sort((x, y) => x - y)).toEqual(Array.from({ length: n }, (_, i) => lo + i));
    for (const v of Object.values(counts)) expect(Math.abs(v / 10_000 - 1 / n)).toBeLessThan(0.015 * 6 / n + 0.005);
  });
  it('MK-5 same seed same demands, different seed differs', () => {
    const seq = (seed: number) => run(s0(seed), 29_000).customers.map(c => c.demand).concat(run({ ...s0(seed), farmLevel: 20 }, 9000).customers.map(c => c.demand));
    expect(seq(123)).toEqual(seq(123)); expect(seq(123)).not.toEqual(seq(456));
  });
  it('MK-8 / Q4 partial fill stays with remaining N-k, patience not reset', () => {
    const s = apply({ ...s0(), basket: 2, customers: [cust(1, 6, 0, 12)] }, { type: 'sell', customerId: 1 }, b);
    expect(s.customers).toEqual([cust(1, 6, 2, 12)]);
  });
  it('MK-10 partly served customer leaves 30s after ARRIVAL; partial coins kept; logs customer_partial', () => {
    const ev: SimEvent[] = [];
    let s = { ...s0(), basket: 2, customers: [cust(1, 6, 0, 0)], nextCustomerInS: 1e9 };
    s = run(s, 10_000); s = apply(s, { type: 'sell', customerId: 1 }, b); expect(s.coinsCents).toBe(2 * eggPriceCents(0, 0, b)); expect(s.customers[0].filled).toBe(2);
    s = run(s, 19_900, ev); expect(s.customers).toHaveLength(1);
    s = run(s, 100, ev); expect(s.customers).toHaveLength(0); expect(s.coinsCents).toBe(2 * eggPriceCents(0, 0, b));
    expect(ev).toContainEqual({ type: 'customer_partial', id: 1, N: 6, filled: 2 }); expect(ev.some(e => e.type === 'customer_lost')).toBe(false);
  });
  it('MK-10 unserved customer timeout is not partial', () => {
    const ev: SimEvent[] = []; run({ ...s0(), customers: [cust(1, 6)], nextCustomerInS: 1e9 }, 30_000, ev);
    expect(ev).toContainEqual({ type: 'customer_lost', reason: 'timeout', id: 1, N: 6 });
  });
  it('F8 queue size = min(cap, base + floor(F/step)) from config, P1q 6..10: 6/7/8/10 at L4/L5/L10/L20', () => {
    const fill = (L: number) => run({ ...s0(), farmLevel: L, nextCustomerInS: 0.05 }, 60_000).customers.length;
    for (const L of [0, 9, 10, 19, 20, 30]) expect(fill(L)).toBe(queueMax(L, b));
    expect([4, 5, 10, 20, 30].map(L => queueMax(L, b))).toEqual([6, 7, 8, 10, 10]);
    const x = structuredClone(b); x.customers.queue_max_step_levels = 10; expect(queueMax(10, x)).toBe(7);
  });
  it('MK-12 / Q3 price at sale time after farm upgrade; queued N unchanged', () => {
    let s = { ...s0(), coinsCents: farmCost(0, b) * 100, basket: 5, customers: [cust(1, 5)] };
    s = apply(s, { type: 'buyFarm' }, b); expect(s.customers[0].demand).toBe(5);
    const p = salePriceCents(s, b); expect(p).toBe(salePriceCents({ ...s, farmLevel: 1 }, b)); // M4 on: price from the tracks at sale time (M4A-5)
    s = apply(s, { type: 'sell', customerId: 1 }, b); expect(s.coinsCents).toBe(5 * p);
  });
  it('MK-9 sell all front-to-back stops at empty basket', () => {
    const s = apply({ ...s0(), basket: 9, customers: [cust(1, 4), cust(2, 4), cust(3, 4)] }, { type: 'sellAll' }, b);
    expect(s.customers).toEqual([cust(3, 4, 1)]); expect(s.basket).toBe(0); expect(s.coinsCents).toBe(9 * eggPriceCents(0, 0, b));
  });
  it('MK-11 sell to departed customer / zero basket is a no-op', () => {
    const s = { ...s0(), basket: 5, customers: [cust(1, 4)] };
    expect(apply(s, { type: 'sell', customerId: 99 }, b)).toBe(s);
    const z = { ...s, basket: 0 }; expect(apply(z, { type: 'sell', customerId: 1 }, b)).toBe(z);
  });
});
describe('RNG seeding', () => {
  it('first demand is not pinned to demand_min for small seeds (bug: unmixed xorshift seed)', () => {
    const [lo, hi] = demandRange(0, b);
    const firsts = Array.from({ length: 50 }, (_, i) => run({ ...initialState(b, i + 1), nextCustomerInS: 0.05 }, 100).customers[0].demand);
    expect(firsts.filter(d => d === lo).length).toBeLessThan(50 * 0.3);
    expect(Math.max(...firsts)).toBeGreaterThan(lo + (hi - lo) / 2);
  });
});
