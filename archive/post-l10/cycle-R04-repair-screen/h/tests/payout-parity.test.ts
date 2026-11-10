// CCR parity proof for the #25 x #31 forward merge: one payout fn (sim/payout.ts) priced by salePriceCents.
// (a) M4 off: payout + previews == the pre-merge eggPriceCents-based values (old #25/#28 formula), whole grid.
// (b) M4 on: every preview == what sellTo / sellAll actually credit, whole grid.
import { describe, it, expect } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState, eggPriceCents, type GameState } from '../src/sim/state';
import { apply, sellAllPreview as sellAllPreviewActions } from '../src/sim/actions';
import { saleValueCents, sellAllPreview } from '../src/sim/payout';
import { graderMult } from '../src/sim/workers';
import { orderView } from '../src/ui/orders';
const off: Balance = { ...balance, m4: { ...balance.m4!, enabled: 0 } };
const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
const BUYERS = [
  [{ id: 1, demand: 7, filled: 2, waitedS: 0 }, { id: 2, demand: 13, filled: 0, waitedS: 0 }, { id: 3, demand: 9, filled: 0, waitedS: 0 }],
  [{ id: 4, demand: 1, filled: 0, waitedS: 0 }],
  [{ id: 5, demand: 2e11, filled: 0, waitedS: 0 }],
  [{ id: 6, demand: 17, filled: 16, waitedS: 0 }, { id: 7, demand: 3, filled: 0, waitedS: 0 }],
];
const QTY = [0, 0.5, 1, 4.2, 21.7, 1e3 + 0.3, 181.2e9];
const LEVELS = [[1, 1, 1, 1], [3, 1, 2, 3], [23, 17, 20, 22], [30, 30, 33, 33]] as const; // farm, collection, hens, eggValue
const GRADER = [[0, 100], [1, 100], [1, 30], [2, 5], [2, 100]] as const; // tier, energy
const grid = (b: Balance) => {
  const out: { s: GameState; tag: string }[] = [];
  for (const [F, C, H, V] of LEVELS) for (const [tier, energy] of GRADER) for (const customers of BUYERS) for (const basket of QTY) {
    const s = { ...initialState(b, 3), farmLevel: F, collectionLevel: C, hensLevel: H, eggValueLevel: V, basket, coinsCents: 12_345, customers,
      workers: tier ? { grader: { energy, cdS: 0 } } : {}, graderTier: tier } as GameState;
    out.push({ s, tag: `F${F} C${C} H${H} V${V} g${tier}/${energy} n${customers.length} q${basket}` });
  }
  return out;
};
/** Pre-merge reference (main 68950c0 / #25 72078b5): eggPriceCents x graderMult, exact when no multiplier, per-order rounding. */
const oldValue = (s: GameState, k: number, b: Balance) => { const p = eggPriceCents(s.farmLevel, s.collectionLevel, b), m = graderMult(s.workers, s.graderTier, b); return m === 1 ? k * p : Math.round(k * p * m); };
const oldSellAll = (s: GameState, b: Balance) => { let left = Math.floor(s.basket), eggs = 0, cents = 0;
  for (const c of s.customers) { if (left < 1) break; const k = Math.min(left, c.demand - c.filled); if (k <= 0) continue; left -= k; eggs += k; cents += oldValue(s, k, b); } return { eggs, cents }; };
const ks = (s: GameState) => [...new Set([1, 2, 7, 13, Math.floor(s.basket)].filter(k => k > 0))];

describe('payout parity (a): M4 off == pre-merge eggPriceCents values', () => {
  const g = grid(off);
  it(`grid of ${g.length} states`, () => {
    expect(g.length).toBeGreaterThan(500);
    for (const { s, tag } of g) {
      for (const k of ks(s)) expect(saleValueCents(s, k, off), `${tag} k${k}`).toBe(oldValue(s, k, off));
      expect(sellAllPreview(s, off), tag).toEqual(oldSellAll(s, off));
      expect(sellAllPreviewActions(s, off), tag).toEqual(oldSellAll(s, off)); // #28 import path re-exports the same fn
      const after = apply(s, { type: 'sellAll' }, off);
      expect(after.coinsCents - s.coinsCents, tag).toBe(oldSellAll(s, off).cents);
      for (const c of s.customers) {
        const v = orderView(c, s.basket, k => saleValueCents(s, k, off)), r = apply(s, { type: 'sell', customerId: c.id }, off);
        expect(v.sellCents, `${tag} c${c.id}`).toBe(v.sell > 0 ? oldValue(s, v.sell, off) : 0);
        expect(r.coinsCents - s.coinsCents, `${tag} c${c.id}`).toBe(v.sellCents);
      }
    }
  });
});

describe('payout parity (b): M4 on, preview == credited', () => {
  const g = grid(on);
  it(`grid of ${g.length} states`, () => {
    let differsFromOld = 0;
    for (const { s, tag } of g) {
      const p = sellAllPreview(s, on), after = apply(s, { type: 'sellAll' }, on);
      expect(p.cents, tag).toBe(after.coinsCents - s.coinsCents);
      expect(p.eggs, tag).toBe(Math.floor(s.basket) - Math.floor(after.basket));
      expect(sellAllPreviewActions(s, on), tag).toEqual(p);
      for (const c of s.customers) {
        const v = orderView(c, s.basket, k => saleValueCents(s, k, on)), r = apply(s, { type: 'sell', customerId: c.id }, on);
        expect(r.coinsCents - s.coinsCents, `${tag} c${c.id}`).toBe(v.sellCents);
        if (v.sell > 0 && v.sellCents !== oldValue(s, v.sell, on)) differsFromOld++;
      }
    }
    expect(differsFromOld).toBeGreaterThan(0); // M4 really prices via tracks (not a vacuous pass)
  });
});
