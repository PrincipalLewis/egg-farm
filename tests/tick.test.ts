import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState, coopCapacity, eggPriceCents, demandRange, farmCost, eggsPerSec, queueMax } from '../src/sim/state';
import { step, advance } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import type { SimEvent } from '../src/sim/events';
const s0 = () => initialState(b, 42);
describe('fixed 10 Hz tick', () => {
  it('runs whole 100 ms ticks and keeps the remainder', () => { const r = advance(s0(), 250, 0, b); expect(r.ticks).toBe(2); expect(r.accMs).toBeCloseTo(50); });
  it('same result regardless of frame chunking (deterministic)', () => {
    let a = s0(), acc = 0; for (let i = 0; i < 1000; i++) { const r = advance(a, 33, acc, b); a = r.state; acc = r.accMs; }
    const one = advance(s0(), 33000, 0, b).state; expect(a.coop).toBeCloseTo(one.coop, 6); expect(a.customers).toEqual(one.customers.map((c, i) => ({ ...c, waitedS: a.customers[i].waitedS })));
  });
  it('AC1 coop grows at eggs_per_sec (1.5 at L0 after P3) and caps at capacity', () => {
    expect(advance(s0(), 5000, 0, b).state.coop).toBeCloseTo(5 * eggsPerSec(0, b), 6);
    expect(advance(s0(), 600_000, 0, b).state.coop).toBe(coopCapacity(0, b));
  });
  it('AC3 first customer at 10s, queue <= queueMax(0), demand within range', () => {
    expect(advance(s0(), 9900, 0, b).state.customers.length).toBe(0);
    expect(advance(s0(), 10000, 0, b).state.customers.length).toBe(1);
    const s = advance(s0(), 29_000, 0, b).state; expect(s.customers.length).toBeLessThanOrEqual(queueMax(0, b));
    const [lo, hi] = demandRange(0, b); for (const c of s.customers) { expect(c.demand).toBeGreaterThanOrEqual(lo); expect(c.demand).toBeLessThanOrEqual(hi); }
  });
  it('customers leave after 30s', () => { const s = step({ ...s0(), customers: [{ id: 1, demand: 5, filled: 0, waitedS: 29.95 }], nextCustomerInS: 99 }, 0.1, b); expect(s.customers).toEqual([]); });
});
describe('actions', () => {
  it('AC2 collect moves min(coop, per tap)', () => {
    expect(apply({ ...s0(), coop: 3 }, { type: 'collect' }, b)).toMatchObject({ coop: 0, basket: 3 });
    expect(apply({ ...s0(), coop: 20 }, { type: 'collect' }, b)).toMatchObject({ coop: 15, basket: 5 });
  });
  it('AC4 sale credits sold x price, partial fill', () => {
    const s = { ...s0(), basket: 4, farmLevel: 1, customers: [{ id: 7, demand: 6, filled: 0, waitedS: 0 }] };
    expect(apply(s, { type: 'sell', customerId: 7 }, b)).toMatchObject({ basket: 0, coinsCents: 4 * 100, /* M4 on, V0: track price = 100 c literal (M4A-5; CCR m1: not from the src price fn) */ customers: [{ id: 7, demand: 6, filled: 4 }] });
  });
  it('AC5 upgrade deducts exact cost only when affordable', () => {
    expect(apply(s0(), { type: 'buyFarm' }, b).farmLevel).toBe(0);
    expect(apply({ ...s0(), coinsCents: farmCost(0, b) * 100 + 100 }, { type: 'buyFarm' }, b)).toMatchObject({ farmLevel: 1, coinsCents: 100 });
    expect(apply({ ...s0(), coinsCents: farmCost(0, b) * 100 - 1 }, { type: 'buyFarm' }, b).farmLevel).toBe(0);
  });
});
import { patienceS as pS, queueMax as qM } from '../src/sim/state';
describe('AC3 tick order (QA-RC2-1)', () => {
  it('timeouts are processed before arrivals in the same tick: a leaver frees the slot for the newcomer', () => {
    const b2 = b, P = pS(0, b2), cap = qM(0, b2);
    const full = Array.from({ length: cap }, (_, i) => ({ id: i + 1, demand: 1, filled: 0, waitedS: i === 0 ? P - 0.1 : 1 }));
    const s = { ...initialState(b2), customers: full, nextCustomerInS: 0.1, nextCustomerId: cap + 1 };
    const ev: SimEvent[] = []; const r = step(s, 0.1, b2, ev);
    expect(ev.map(e => e.type)).toEqual(['customer_lost', 'customer_arrive']);
    expect((ev[0] as any).reason).toBe('timeout');
    expect(r.customers.map(c => c.id)).toEqual([...full.slice(1).map(c => c.id), cap + 1]);
  });
});
