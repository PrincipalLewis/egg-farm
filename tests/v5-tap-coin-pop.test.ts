// v5 tapCoins +$ pop, pure maths (product/collection/m5-streak-tap-coins-spec.md v1.3.3 b315dea1 R15/R16, K14, ST-AC17/17b;
// art-ux/m5-combo-tiers.md v0.3 ed4ded1d §2 pill position, §4.2 coin pop on a tier-up tap).
import { describe, it, expect } from 'vitest';
import { coinPopText, coinPopAria, coinPopBox, pillBox, POP } from '../src/ui/tap-coin-pop';

describe('text (R16, ST-AC17 format, ST-AC17b zero payout)', () => {
  it('fmtMoneyShort with a leading +, no "!"', () => {
    expect([38, 81_240, 123_456, 340_000_000].map(coinPopText)).toEqual(['+$0.38', '+$812.40', '+$1.2K', '+$3.4M']);
    expect(coinPopText(233)).toBe('+$2.33');
  });
  it('0 / negative / NaN -> no pop and no aria (never +$0.00)', () => {
    for (const c of [0, -5, NaN]) { expect(coinPopText(c)).toBeNull(); expect(coinPopAria(c)).toBeNull(); }
  });
  it('aria is the exact fmtMoneyAria amount', () => { expect(coinPopAria(81_240)).toBe('$812.40'); expect(coinPopAria(123_456)).toBe('$1,234.56'); });
  it('longest visible string fits the 8-char budget', () => { expect(coinPopText(99_999)!.length).toBeLessThanOrEqual(9); expect(coinPopText(99_990_000)!.length).toBeLessThanOrEqual(9); });
});

const A360 = { cx: 168, meterTop: 432, vw: 360 }; // 360x640 phone: Collect 8-328, coop meter top 432 (combo-tiers §2: pill bottom 424)
describe('position (R16, §3.3, ST-AC10b, ST-AC17 position/clearance)', () => {
  it('pill: bottom 8 px above the coop meter, centred on Collect', () => {
    const p = pillBox(A360, 280, 30); expect(p.bottom).toBe(424); expect(p.top).toBe(394); expect(p.left).toBe(28); expect(p.right).toBe(308);
  });
  it('coin pop: bottom 8 px above the coop meter, x = Collect centre + drift', () => {
    const c = coinPopBox(A360, 80, 24, { drift: 5 }); expect(c.bottom).toBe(424); expect(c.left).toBe(168 + 5 - 40);
  });
  it('drift is limited to +/-8 px', () => {
    expect(coinPopBox(A360, 80, 24, { drift: 50 }).left).toBe(168 + POP.driftPx - 40);
    expect(coinPopBox(A360, 80, 24, { drift: -50 }).left).toBe(168 - POP.driftPx - 40);
  });
  it('on a tier-up tap: 8 px above the pill top, so they never overlap', () => {
    const p = pillBox(A360, 280, 30), c = coinPopBox(A360, 80, 24, { aboveTop: p.top });
    expect(c.bottom).toBe(p.top - 8); expect(c.bottom).toBeLessThanOrEqual(p.top);
  });
  it('same frame as an egg pop: 20 px above it', () => {
    const c = coinPopBox(A360, 80, 24, { eggTop: 420 }); expect(c.bottom).toBe(400);
  });
  it('clamped 8 px inside both screen edges (golden R25a clamp)', () => {
    const l = coinPopBox({ cx: 10, meterTop: 400, vw: 360 }, 80, 24), r = coinPopBox({ cx: 355, meterTop: 400, vw: 360 }, 80, 24);
    expect(l.left).toBe(8); expect(r.right).toBe(352);
    const wide = pillBox({ cx: 100, meterTop: 400, vw: 200 }, 300, 30); expect(wide.left).toBe(8);
  });
});
