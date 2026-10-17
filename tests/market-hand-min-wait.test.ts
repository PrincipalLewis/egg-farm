// F1 option (b) Market Hand min wait (product/f1-proposal.md §5, HoP 2026-10-16; HoE ruling 2026-10-17: missing implementation,
// the game must match Economy's AC7 model). Reference: vendor/economy-sim/sim/economy_sim.py
//   :309  turn fires only if any(t - arrival >= defer for x in q)   -> otherwise HELD: no wage, no action, cooldown stays expired
//   :316  per customer: `if t - arrival < defer: continue`          -> customers still inside the min wait are skipped
//   :409  spec_from_csv: defer = market_hand_min_wait_s, hold_until_servable = True
// So the comparison is inclusive (>=): waited 2.0 s is servable, 1.99 s is not.
import { describe, it, expect } from 'vitest';
import { balance as b, validateBalance } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { step, servable } from '../src/sim/tick';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from '../scripts/sync-economy';
import { readFileSync } from 'node:fs';
import type { SimEvent } from '../src/sim/events';

const MW = b.workers.market_hand.min_wait_s, DT = 1 / b.tickHz, PAT = b.customers.customer_patience_s;
// MK-57 market_hand_last_chance_s (product/market/feature-spec.md; not yet in economy.csv / balance.json, MK-56..57 unbuilt)
const MK57_LAST_CHANCE_S = 1.0;
const st = (o: Partial<GameState> = {}): GameState => ({ ...initialState(b, 3), farmLevel: 10, collectionLevel: 3, coinsCents: 1e9, basket: 100,
  nextCustomerInS: 1e9, workers: { market_hand: { energy: 100, cdS: 0 } }, ...o });
const cust = (id: number, waitedS: number, demand = 5) => ({ id, demand, filled: 0, waitedS });
/** one tick; customers age by DT inside step() before Market Hand acts, so pass waited-before-tick */
const tick = (s: GameState) => { const ev: SimEvent[] = []; const out = step(s, DT, b, ev); return { s: out, ev, sells: ev.filter(e => e.type === 'sell'), wages: ev.filter(e => e.type === 'wage') }; };

describe('Market Hand min wait: data', () => {
  it('min_wait_s flows from economy.csv market_hand_min_wait_s through sync-economy', () => {
    const rows = parseEconomyCsv(readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8'));
    expect(MW).toBe((rows[0] as any).market_hand_min_wait_s); expect(MW).toBe(2);
    const nb = buildBalance(rows.map(r => ({ ...r, market_hand_min_wait_s: 3 })), b, readEconomyConfig());
    expect(nb.workers.market_hand.min_wait_s).toBe(3);
    const noCol = rows.map(r => { const { market_hand_min_wait_s: _x, ...rest } = r as any; return rest; });
    expect('min_wait_s' in buildBalance(noCol, b, readEconomyConfig()).workers.market_hand).toBe(false); // never a stale value
  });
  it('validateBalance requires a number >= 0', () => {
    const mh = (v: unknown) => ({ ...b, workers: { ...b.workers, market_hand: { ...b.workers.market_hand, min_wait_s: v } } }) as any;
    expect(() => validateBalance(mh(undefined), false)).toThrow(/min_wait_s/);
    expect(() => validateBalance(mh(-1), false)).toThrow();
    expect(() => validateBalance(mh(0), false)).not.toThrow();
  });
});

describe('Market Hand min wait: edges (sim: t - arrival >= defer)', () => {
  it('waited 1.99 s: turn held -> no sale, no wage, cooldown stays expired', () => {
    const r = tick(st({ customers: [cust(1, MW - 0.01 - DT)] }));
    expect(r.s.customers[0].waitedS).toBeCloseTo(MW - 0.01, 9);
    expect(r.sells.length).toBe(0); expect(r.wages.length).toBe(0); expect(r.s.coinsCents).toBe(1e9);
    expect(r.s.workers.market_hand!.cdS).toBe(0); expect(r.s.basket).toBe(100);
  });
  it('waited exactly 2.0 s (accumulated 0.1 s ticks): serves and charges the wage', () => {
    let s = st({ customers: [cust(1, 0)] }); const sold: number[] = [];
    for (let i = 1; i <= Math.round(MW * b.tickHz); i++) { const r = tick(s); s = r.s; if (r.sells.length) sold.push(i); }
    expect(sold).toEqual([Math.round(MW * b.tickHz)]); // first sale on the tick where waited reaches 2.0, not earlier, not later
    const r = tick(st({ customers: [cust(1, MW - DT)] }));
    expect(r.sells.length).toBe(1); expect(r.wages.length).toBe(1); expect(r.s.workers.market_hand!.cdS).toBe(b.workers.market_hand.every_s);
  });
  it('servable() is inclusive with the tick-float tolerance used for patience', () => {
    expect(servable({ waitedS: MW }, b)).toBe(true); expect(servable({ waitedS: 2.0000000000000004 }, b)).toBe(true);
    expect(servable({ waitedS: 1.9999999999999998 }, b)).toBe(true); expect(servable({ waitedS: MW - 0.01 }, b)).toBe(false);
  });
  it('per-customer skip: a newer front customer is passed over, the older one behind is served', () => {
    const r = tick(st({ customers: [cust(1, 0.5), cust(2, MW + 1)] }));
    expect(r.sells.map((e: any) => e.id)).toEqual([2]); expect(r.s.customers.map(c => c.id)).toEqual([1]);
  });
  it('empty queue: held, no wage (old build charged every interval)', () => {
    let s = st({ customers: [] }); const w: SimEvent[] = [];
    for (let i = 0; i < 100; i++) { const r = tick(s); s = r.s; w.push(...r.wages); }
    expect(w.length).toBe(0); expect(s.coinsCents).toBe(1e9);
  });
  it('empty basket with a servable customer is a normal paid turn (sim: empty-basket turn unchanged)', () => {
    const r = tick(st({ basket: 0, customers: [cust(1, MW + 1)] }));
    expect(r.wages.length).toBe(1); expect(r.sells.length).toBe(0);
  });
  it('a held turn fires on the first servable tick, then the normal interval applies', () => {
    let s = st({ customers: [cust(1, MW - 0.5, 1e6)] }); const at: number[] = [];
    for (let i = 1; i <= 30; i++) { const r = tick(s); s = r.s; if (r.wages.length) at.push(i); }
    expect(at).toEqual([5, 15, 25]); // held for 0.5 s, then every_s = 1
  });
});

describe('Market Hand min wait x MK-57 last chance (1.0 s)', () => {
  it('min wait never blocks the last-chance window: every customer is servable long before time-left 1.0 s', () => {
    expect(MW).toBeLessThan(PAT - MK57_LAST_CHANCE_S);
  });
  it('a customer at time-left 1.0 s is served on the Market Hand turn; one at timeout is never sold to', () => {
    const r = tick(st({ customers: [cust(1, PAT - MK57_LAST_CHANCE_S - DT)] }));
    expect(r.sells.length).toBe(1); expect(r.ev.some(e => e.type === 'customer_served')).toBe(true); // time-left was 1.0 s on this tick
    const gone = tick(st({ customers: [cust(1, PAT - DT)] }));
    expect(gone.sells.length).toBe(0); expect(gone.ev.some(e => e.type === 'customer_lost')).toBe(true);
    expect(gone.wages.length).toBe(0); // timed out before Market Hand acts -> queue empty -> held
  });
});
