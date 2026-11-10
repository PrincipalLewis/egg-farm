// S2-8 (wages visible + $0 gate), S2-9 (no Market auto-open, queue-full flag), S2-10 helpers.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState, queueMax } from '../src/sim/state';
import { advance } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import { save, migrate, SAVE_VERSION } from '../src/save/save';
import { Game } from '../src/game';
import { wageCentsPerSec, listedWageCentsPerSec, totalWageCentsPerSec, netCentsPerSec, queueFull, queueTapOpens } from '../src/ui/rates';
import { mem } from './helpers';
const T0 = 1.8e12; // QA BUG-1: savedAt 0 / pre-2020 is invalid now; offline tests use a real epoch

const mh = (energy = 100) => ({ market_hand: { energy, cdS: 0 } });

describe('S2-8 wage from the Player log (Farm L3, Market Hand, 0 eggs)', () => {
  it('drain = Market Hand wage at the exact economy.csv rate (0.75 $/min at L3 = 1.25 c/s; fraction carried)', () => {
    let s: any = { ...initialState(b, 1), farmLevel: 3, coinsCents: 15_257, workers: mh(), basket: 0, coop: 0, nextCustomerInS: 1e9 };
    expect(wageCentsPerSec('market_hand', s, b)).toBe(1.25); expect(listedWageCentsPerSec('market_hand', s, b)).toBe(1.25);
    const r = advance(s, 24_000, 0, b); expect(15_257 - r.state.coinsCents).toBe(30);
  });
  it('60 s of Market Hand wages at L3 = $0.75 +- 1 c (was $0.60 with per-charge rounding)', () => {
    for (const start of [10_000, 123_457]) { const s: any = { ...initialState(b, 1), farmLevel: 3, coinsCents: start, workers: mh(), basket: 0, coop: 0, nextCustomerInS: 1e9 };
      const spent = start - advance(s, 60_000, 0, b).state.coinsCents; expect(Math.abs(spent - 75)).toBeLessThanOrEqual(1); }
    for (const F of [1, 7, 11, 23]) { const s: any = { ...initialState(b, 1), farmLevel: F, coinsCents: 1e9, workers: { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 } }, basket: 0, coop: 0, nextCustomerInS: 1e9 };
      const want = (0.25 + 0.5) * F * 100; expect(Math.abs(1e9 - advance(s, 60_000, 0, b).state.coinsCents - want), `F${F}`).toBeLessThanOrEqual(2); }
  });
  it('the fraction survives a save round-trip; v5 saves migrate with nothing owed', () => {
    const kv = mem(); let t = 1_000; const g = new Game(b, kv, () => t);
    g.state = { ...g.state, farmLevel: 3, coinsCents: 10_000, workers: mh(), customers: [], nextCustomerInS: 1e9 } as any; g.debugAdvance(3_000);
    const frac = g.state.wageFracCents.market_hand!; expect(frac).toBeGreaterThan(0); expect(frac).toBeLessThan(1); g.save();
    t += 10; const g2 = new Game(b, kv, () => t); expect(g2.state.wageFracCents.market_hand).toBeCloseTo(frac, 9);
    const v5 = { version: 5, savedAt: 0, state: { ...initialState(b), wageFracCents: undefined } }; delete (v5.state as any).wageFracCents;
    expect(migrate(v5, b).state.wageFracCents).toEqual({}); expect(migrate(v5, b).version).toBe(SAVE_VERSION);
  });
  it('net rate = income - wages (exact per-second rate at any pace); Asleep/Unpaid/not hired cost 0', () => {
    const s: any = { ...initialState(b), farmLevel: 10, workers: { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 20, cdS: 0 } } };
    const w1 = 0.25 * 10 / 60 * 100, w2 = 0.5 * 10 / 60 * 100; // exact economy.csv rates (per second, any pace)
    expect(wageCentsPerSec('market_hand', s, b)).toBeCloseTo(w1, 9); expect(wageCentsPerSec('coop_hand', s, b)).toBeCloseTo(w2, 9);
    expect(totalWageCentsPerSec(s, b)).toBeCloseTo(w1 + w2, 9); expect(netCentsPerSec(0, s, b)).toBeCloseTo(-(w1 + w2), 9);
    expect(wageCentsPerSec('coop_hand', { ...s, workers: { coop_hand: { energy: 0, cdS: 0 } } }, b)).toBe(0);
    expect(wageCentsPerSec('market_hand', { ...s, workers: { market_hand: { energy: 90, cdS: 0, unpaid: true } } }, b)).toBe(0);
    expect(wageCentsPerSec('market_hand', { ...s, workers: {} }, b)).toBe(0);
  });
});

describe('S2-8 gate: wages draining money to $0', () => {
  const broke = (coins: number, F = 10): any => ({ ...initialState(b, 5), farmLevel: F, coinsCents: coins, basket: 0, coop: 0, nextCustomerInS: 1e9,
    workers: { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 } } });
  it('money never goes negative (small, exact-wage and huge balances)', () => {
    for (const c of [0, 1, 3, 4, 7, 50, 1e15, Number.MAX_SAFE_INTEGER]) {
      let s = broke(c), min = Infinity;
      for (let i = 0; i < 600; i++) { s = advance(s, 1000, 0, b).state; min = Math.min(min, s.coinsCents); }
      expect(min, `start ${c}`).toBeGreaterThanOrEqual(0); expect(Number.isFinite(s.coinsCents)).toBe(true); expect(Number.isInteger(s.coinsCents)).toBe(true);
      for (const f of Object.values(s.wageFracCents) as number[]) { expect(f).toBeGreaterThanOrEqual(0); expect(f).toBeLessThan(1); }
    }
  });
  it('workers go Unpaid when a wage cannot be paid, and resume once money covers it', () => {
    let s = broke(10); for (let i = 0; i < 30; i++) s = advance(s, 1000, 0, b).state;
    expect(s.workers.market_hand!.unpaid).toBe(true); expect(s.workers.coop_hand!.unpaid).toBe(true);
    const c0 = s.coinsCents; s = advance(s, 10_000, 0, b).state; expect(s.coinsCents).toBe(c0); // paused: no further charge
    s = { ...s, coinsCents: 100_000 }; s = advance(s, 2000, 0, b).state;
    expect(s.workers.market_hand!.unpaid).toBeFalsy(); expect(s.workers.coop_hand!.unpaid).toBeFalsy();
  });
  it('no soft-lock at $0: Collect and manual Sell still work and earn money', () => {
    let s: any = { ...broke(0), coop: 50, workers: { market_hand: { energy: 100, cdS: 0, unpaid: true } }, customers: [{ id: 1, demand: 5, filled: 0, waitedS: 0 }] };
    s = apply(s, { type: 'collect' }, b); expect(s.basket).toBeGreaterThan(0);
    s = apply(s, { type: 'sell', customerId: 1 }, b); expect(s.coinsCents).toBeGreaterThan(0);
  });
  it('no soft-lock with 0 eggs and $0: the coop refills and customers keep arriving', () => {
    let s: any = { ...broke(0), nextCustomerInS: 1 }; s = advance(s, 20_000, 0, b).state;
    expect(s.coop).toBeGreaterThan(0); expect(s.customers.length).toBeGreaterThan(0); expect(s.coinsCents).toBeGreaterThanOrEqual(0);
  });
  it('offline settlement at $0: grant pays no wages, money stays >= 0, Collect/Sell work after', () => {
    const kv = mem(); save(kv, { ...broke(2), nextCustomerInS: 3 }, T0);
    const g = new Game(b, kv, () => T0 + 3_600_000); expect(g.state.coinsCents).toBe(2); expect(g.state.pendingOfflineEggs).toBeGreaterThan(0);
    g.dispatch({ type: 'collectOffline' }); g.debugAdvance(60_000);
    expect(g.state.coinsCents).toBeGreaterThanOrEqual(0); expect(g.state.basket).toBeGreaterThan(0);
  });
});

describe('S2-9 Market never opens by itself', () => {
  it('queueFull flag tracks capacity', () => {
    const s: any = { ...initialState(b), farmLevel: 3 }, n = queueMax(3, b);
    expect(queueFull({ ...s, customers: Array.from({ length: n - 1 }, (_, i) => ({ id: i })) }, b)).toBe(false);
    expect(queueFull({ ...s, customers: Array.from({ length: n }, (_, i) => ({ id: i })) }, b)).toBe(true);
  });
  it('a queue tap opens Market only on the same chip, present >= 250 ms', () => {
    const a = {}, c = {};
    expect(queueTapOpens(a, a, 400)).toBe(true);
    expect(queueTapOpens(a, a, 100)).toBe(false);   // chip arrived under the finger
    expect(queueTapOpens(null, a, 400)).toBe(false); // finger went down on an empty slot / elsewhere
    expect(queueTapOpens(a, c, 400)).toBe(false);   // strip reflowed between down and up
  });
});
