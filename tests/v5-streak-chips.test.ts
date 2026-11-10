// v5 streak price chips (product/collection/m4-collect-streak-spec.md v0.3 §4.5 / S-AC19/20, carried unchanged by
// m5-streak-tap-coins-spec.md v1.3.3 b315dea1 §3.5 + ST-AC22; combo-tiers v0.3 ed4ded1d §4.1: no tier change to chips).
// Chips come from the SAME sale-effect attribution the credit uses (sim/effects.ts saleEffectFactors), so chip == credit.
import { describe, it, expect } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { playerSaleCtx, PLAYER_SALE } from '../src/sim/effects';
import { priceChips, priceChipsHtml } from '../src/ui/streak-chips';

const mk = (flags: Record<string, number>): Balance => ({ ...balance, m4: { ...balance.m4!, flags: { ...balance.m4!.flags, ...flags } } }) as Balance;
const S = mk({ streak: 1 }), SG = mk({ streak: 1, golden: 1 }), st = (x: object) => ({ ...({} as any), ...x });
const mult = balance.m4!.tc!.frenzy_price_mult as number;

describe('priceChips', () => {
  it('flag off or s = 0: none', () => { expect(priceChips(st({ streakS: 0.2 }), balance)).toEqual([]); expect(priceChips(st({ streakS: 0 }), S)).toEqual([]); });
  it('s > 0: one meadow +N% chip (floor)', () => {
    expect(priceChips(st({ streakS: 0.187 }), S)).toEqual([{ kind: 'streak', text: '+18%', aria: 'Streak +18% price' }]);
  });
  it('not attended (suspended ctx): no chip, matching the 1x credit (R12)', () => { expect(priceChips(st({ streakS: 0.2 }), S, playerSaleCtx(false))).toEqual([]); });
  it('with a Frenzy: gold 2x first, then meadow', () => {
    const c = priceChips(st({ streakS: 0.14, frenzyRemainingS: 5 }), SG, PLAYER_SALE);
    expect(c.map(x => x.kind)).toEqual(['frenzy', 'streak']); expect(c[0].text).toBe(`${mult}×`); expect(c[1].text).toBe('+14%');
  });
  it('S-AC20: collapse into one gold 2x+ chip naming both bonuses', () => {
    expect(priceChips(st({ streakS: 0.14, frenzyRemainingS: 5 }), SG, PLAYER_SALE, { collapse: true }))
      .toEqual([{ kind: 'combined', text: `${mult}×+`, aria: `Frenzy ${mult}× price and streak +14% price` }]);
  });
  it('collapse with one chip is a no-op', () => { expect(priceChips(st({ streakS: 0.14 }), S, PLAYER_SALE, { collapse: true })).toHaveLength(1); });
  it('html: aria-labelled spans in order, empty string when none', () => {
    expect(priceChipsHtml([])).toBe('');
    expect(priceChipsHtml(priceChips(st({ streakS: 0.07 }), S))).toBe('<span class="price-chips"><span class="price-chip streak" role="img" aria-label="Streak +7% price">+7%</span></span>');
  });
});
