// QA bug-sellall-label-grader: the Sell all label must equal what the sellAll action pays (Grader mult + per-order rounding).
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { salePriceCents } from '../src/sim/tracks';
import { initialState, eggPriceCents } from '../src/sim/state';
import { apply, sellAllPreview } from '../src/sim/actions';
import { graderMult } from '../src/sim/workers';
import { sellAllLabel } from '../src/ui/orders';
import { fmtCount, fmtMoney } from '../src/ui/format';
import { readFileSync } from 'node:fs';
const custs = [{ id: 1, demand: 7, filled: 2, waitedS: 0 }, { id: 2, demand: 13, filled: 0, waitedS: 0 }, { id: 3, demand: 9, filled: 0, waitedS: 0 }];
const st = (tier: number, energy = 100, basket = 21.7, farmLevel = 23) => ({ ...initialState(b, 3), farmLevel, collectionLevel: 17, basket, coinsCents: 12_345,
  customers: custs, workers: tier ? { grader: { energy, cdS: 0 } } : {}, graderTier: tier });
describe('Sell all label = actual sellAll money delta', () => {
  for (const tier of [0, 1, 2]) it(`Grader tier ${tier}`, () => {
    const s = st(tier), p = sellAllPreview(s, b), after = apply(s, { type: 'sellAll' }, b);
    expect(p.cents).toBe(after.coinsCents - s.coinsCents);
    expect(p.eggs).toBe(Math.floor(s.basket) - Math.floor(after.basket));
    if (tier) expect(graderMult(s.workers, tier, b)).toBeGreaterThan(1); // the case the old label got wrong
    if (tier) expect(p.cents).not.toBe(p.eggs * eggPriceCents(s.farmLevel, s.collectionLevel, b));
  });
  it('tired Grader (partial bonus) and a basket that runs out mid-order', () => {
    for (const [e, bk] of [[30, 21.7], [5, 9], [100, 4.2]] as const) { const s = st(2, e, bk), after = apply(s, { type: 'sellAll' }, b);
      expect(sellAllPreview(s, b).cents).toBe(after.coinsCents - s.coinsCents); }
  });
  it('huge basket at tier 1 (QA repro scale): label matches payout', () => {
    const s = { ...st(1, 100, 181.2e9), customers: [{ id: 9, demand: 2e11, filled: 0, waitedS: 0 }] }, after = apply(s, { type: 'sellAll' }, b);
    expect(sellAllPreview(s, b).cents).toBe(after.coinsCents - s.coinsCents);
  });
  it('per-order rounding like sellTo (odd price 129c, x1.5 and tired x1.25 leave fractions)', () => {
    for (const e of [100, 30]) { const s = { ...st(1, e, 21.7), farmLevel: 3, collectionLevel: 1 }, p = sellAllPreview(s, b), after = apply(s, { type: 'sellAll' }, b);
      expect(eggPriceCents(3, 1, b)).toBe(129); expect(Number.isInteger(p.cents)).toBe(true); expect(p.cents).toBe(after.coinsCents - s.coinsCents); }
  });
  it('absolute payout pinned: per-order round(k x 129 x 1.5), not round of the total', () => {
    // 129 = flag-off price at F3/C1. M4 ships ON (D-CEO-20261019-01); the per-order rounding rule is price-agnostic, so this
    // absolute pin runs on an explicit forced-flag-off build, and the same rule is then checked on the shipped (M4-on) price.
    const off = { ...b, m4: { ...b.m4!, enabled: 0 } };
    const s = { ...st(1, 100, 21.7), farmLevel: 3, collectionLevel: 1 }; // basket 21 -> orders take 5, 13, 3
    const want = [5, 13, 3].reduce((a, k) => a + Math.round(k * 129 * 1.5), 0);
    expect(want).toBe(968 + 2516 + 581); expect(want).not.toBe(Math.round(21 * 129 * 1.5));
    expect(sellAllPreview(s, off)).toEqual({ eggs: 21, cents: want }); expect(apply(s, { type: 'sellAll' }, off).coinsCents - s.coinsCents).toBe(want);
    const p = salePriceCents(s, b), wantOn = [5, 13, 3].reduce((a, k) => a + Math.round(k * p * 1.5), 0);
    expect(sellAllPreview(s, b)).toEqual({ eggs: 21, cents: wantOn }); expect(apply(s, { type: 'sellAll' }, b).coinsCents - s.coinsCents).toBe(wantOn);
  });
  it('app.ts builds the #sellAll label from sellAllPreview (no second copy of the price math)', () => {
    const src = readFileSync(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
    expect(src).toMatch(/const \{ eggs, cents \} = sellAllPreview\(s, b\);[^\n]*\n\s*setText\(sellAllBtn, sellAllLabel\(eggs, cents, fmtCount, fmtMoney\)\)/);
    expect(src.match(/sellAllLabel\(/g)?.length).toBe(1);
  });
  it('empty basket: nothing to sell', () => { expect(sellAllPreview(st(1, 100, 0.5), b)).toEqual({ eggs: 0, cents: 0 }); });
});
