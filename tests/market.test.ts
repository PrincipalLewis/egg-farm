import { describe, it, expect } from 'vitest';
import { balance as b, validateBalance } from '../src/config/balance';
import { initialState, customerIntervalS, GameState } from '../src/sim/state';
import { step, advance } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import type { SimEvent } from '../src/sim/events';
const s0 = (seed = 42) => initialState(b, seed);
const cust = (id: number, demand: number, filled = 0, waitedS = 0) => ({ id, demand, filled, waitedS });
const run = (s: GameState, ms: number, ev?: SimEvent[]) => advance(s, ms, 0, b, ev).state;
describe('config tunables (economy.md names)', () => {
  it('has market + feel tunables', () => {
    expect(b.customers).toMatchObject({ customer_patience_s: 30, queue_max: 3, first_customer_s: 10 });
    expect(b.feel).toEqual({ tap_combine_window_ms: 250, max_flying_eggs: 5 });
  });
  it.each([
    ['queue_max non-integer', (x: any) => { x.customers.queue_max = 2.5; }],
    ['queue_max 0', (x: any) => { x.customers.queue_max = 0; }],
    ['patience missing', (x: any) => { delete x.customers.customer_patience_s; }],
    ['negative first arrival', (x: any) => { x.customers.first_customer_s = -1; }],
    ['tap window 0', (x: any) => { x.feel.tap_combine_window_ms = 0; }],
    ['flying eggs 1.5', (x: any) => { x.feel.max_flying_eggs = 1.5; }],
    ['string value', (x: any) => { x.feel.max_flying_eggs = '5'; }],
  ])('rejects %s', (_n, mut) => { const x = structuredClone(b); mut(x); expect(() => validateBalance(x)).toThrow(); });
  it('reads values from config (MK-15)', () => {
    const x = structuredClone(b); x.customers.first_customer_s = 4; x.customers.queue_max = 1;
    expect(run(initialState(b, 1), 4000).customers).toHaveLength(0);
    expect(advance(initialState(x, 1), 4000, 0, x).state.customers).toHaveLength(1);
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
    let s = { ...s0(), customers: [cust(1, 5, 1), cust(2, 5, 1), cust(3, 5, 1)], nextCustomerInS: 0.05 };
    s = step(s, 0.1, b, ev); expect(s.customers).toHaveLength(3); expect(ev).toContainEqual({ type: 'customer_lost', reason: 'full_queue' });
    s = apply({ ...s, basket: 100 }, { type: 'sellAll' }, b); expect(s.customers).toHaveLength(0);
    s = step(s, 0.1, b); expect(s.customers).toHaveLength(0); // no backlog
  });
  it('MK-4 demand distribution at L0 (10k seeded spawns)', () => {
    let s = s0(7); const counts: Record<number, number> = {};
    for (let i = 0; i < 10_000; i++) { s = step({ ...s, customers: [], nextCustomerInS: 0 }, 0.001, b); const d = s.customers[0].demand; counts[d] = (counts[d] ?? 0) + 1; }
    expect(Object.keys(counts).map(Number).sort()).toEqual([3, 4, 5, 6, 7, 8]);
    for (const v of Object.values(counts)) expect(Math.abs(v / 10_000 - 1 / 6)).toBeLessThan(0.015);
  });
  it('MK-5 same seed same demands, different seed differs', () => {
    const seq = (seed: number) => run(s0(seed), 29_000).customers.map(c => c.demand).concat(run({ ...s0(seed), farmLevel: 20 }, 9000).customers.map(c => c.demand));
    expect(seq(123)).toEqual(seq(123)); expect(seq(123)).not.toEqual(seq(456));
  });
  it('MK-8 / Q4 partial fill stays with remaining N-k, patience not reset', () => {
    const s = apply({ ...s0(), basket: 2, customers: [cust(1, 6, 0, 12)] }, { type: 'sell', customerId: 1 }, b);
    expect(s.customers).toEqual([cust(1, 6, 2, 12)]);
  });
  it('partly served customer never walks away; unserved one leaves at 30s', () => {
    let s = { ...s0(), customers: [cust(1, 6, 2, 0), cust(2, 6, 0, 0)], nextCustomerInS: 1e9 };
    s = run(s, 120_000); expect(s.customers.map(c => c.id)).toEqual([1]);
    s = apply({ ...s, basket: 10 }, { type: 'sell', customerId: 1 }, b); expect(s.customers).toEqual([]);
  });
  it('served_customer_ignores_patience=0 restores MK-10 timeout behaviour', () => {
    const x = structuredClone(b); x.customers.served_customer_ignores_patience = 0;
    const ev: SimEvent[] = []; const s = advance({ ...s0(), customers: [cust(1, 6, 2, 0)], nextCustomerInS: 1e9 }, 30_000, 0, x, ev).state;
    expect(s.customers).toEqual([]); expect(ev).toContainEqual({ type: 'customer_lost', reason: 'timeout', id: 1, N: 6, filled: 2 });
  });
  it('MK-12 / Q3 price at sale time after farm upgrade; queued N unchanged', () => {
    let s = { ...s0(), coinsCents: 2500, basket: 5, customers: [cust(1, 5)] };
    s = apply(s, { type: 'buyFarm' }, b); expect(s.customers[0].demand).toBe(5);
    s = apply(s, { type: 'sell', customerId: 1 }, b); expect(s.coinsCents).toBe(5 * 110);
  });
  it('MK-9 sell all front-to-back stops at empty basket', () => {
    const s = apply({ ...s0(), basket: 9, customers: [cust(1, 4), cust(2, 4), cust(3, 4)] }, { type: 'sellAll' }, b);
    expect(s.customers).toEqual([cust(3, 4, 1)]); expect(s.basket).toBe(0); expect(s.coinsCents).toBe(900);
  });
  it('MK-11 sell to departed customer / zero basket is a no-op', () => {
    const s = { ...s0(), basket: 5, customers: [cust(1, 4)] };
    expect(apply(s, { type: 'sell', customerId: 99 }, b)).toBe(s);
    const z = { ...s, basket: 0 }; expect(apply(z, { type: 'sell', customerId: 1 }, b)).toBe(z);
  });
});
