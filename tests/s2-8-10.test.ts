// S2-8 (wages visible + $0 gate), S2-9 (no Market auto-open, queue-full flag), S2-10 helpers.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState, queueMax } from '../src/sim/state';
import { advance } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import { save } from '../src/save/save';
import { Game } from '../src/game';
import { wageCentsPerSec, listedWageCentsPerSec, totalWageCentsPerSec, netCentsPerSec, queueFull, queueTapOpens } from '../src/ui/rates';
import { mem } from './helpers';

const mh = (energy = 100) => ({ market_hand: { energy, cdS: 0 } });

describe('S2-8 wage from the Player log (Farm L3, Market Hand, 0 eggs)', () => {
  it('drain = Market Hand wage: 1 cent per 1-s action at L3 ($0.01/s; listed 0.75 $/min rounds to 1 c per action)', () => {
    let s: any = { ...initialState(b, 1), farmLevel: 3, coinsCents: 15_257, workers: mh(), basket: 0, coop: 0, nextCustomerInS: 1e9 };
    expect(wageCentsPerSec('market_hand', s, b)).toBe(1); expect(listedWageCentsPerSec('market_hand', s, b)).toBe(1);
    const r = advance(s, 24_000, 0, b); expect(15_257 - r.state.coinsCents).toBe(24); // $152.57 -> $152.33 in 24 s
  });
  it('net rate = income - wages; Tired is slower; Asleep/Unpaid/not hired cost 0', () => {
    const s: any = { ...initialState(b), farmLevel: 10, workers: { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 20, cdS: 0 } } };
    const w1 = Math.round(0.25 * 10 * 1 / 60 * 100) / 1, w2 = Math.round(0.5 * 10 * 4 / 60 * 100) / 4;
    expect(wageCentsPerSec('market_hand', s, b)).toBe(w1); expect(wageCentsPerSec('coop_hand', s, b)).toBe(w2);
    expect(totalWageCentsPerSec(s, b)).toBe(w1 + w2); expect(netCentsPerSec(0, s, b)).toBe(-(w1 + w2));
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
      expect(min, `start ${c}`).toBeGreaterThanOrEqual(0); expect(Number.isFinite(s.coinsCents)).toBe(true);
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
    const kv = mem(); save(kv, { ...broke(2), nextCustomerInS: 3 }, 0);
    const g = new Game(b, kv, () => 3_600_000); expect(g.state.coinsCents).toBe(2); expect(g.state.pendingOfflineEggs).toBeGreaterThan(0);
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
