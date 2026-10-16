/** QA rc1-pt1 pass 1 (qa/claude-qa/rc1-pt1-pass1.md): BUG-1/2 money previews == credit, BUG-3 suffix boundaries, BUG-4/5 FX. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { apply } from '../src/sim/actions';
import type { SimEvent as GameEvent } from '../src/sim/events';
import { saleValueCents, sellAllPreview, saleMultipliers } from '../src/sim/payout';
import { orderView, sellAllLabel } from '../src/ui/orders';
import { fmtCount, fmtMoney, fmtMoneyShort } from '../src/ui/format';

const graded = (tier: number, basket: number, demands: [number, number][]): GameState => ({
  ...initialState(b), farmLevel: 20, collectionLevel: 7, basket, coinsCents: 500_000,
  workers: { grader: { energy: 100, cdS: 0 } } as GameState['workers'], graderTier: tier,
  customers: demands.map(([demand, filled], i) => ({ id: i + 1, demand, filled, waitedS: 0 })),
});

describe('BUG-1/2: every money preview equals the amount credited, to the cent', () => {
  for (const tier of [0, 1, 2]) for (const basket of [58, 37, 3, 500]) it(`tier ${tier}, basket ${basket}`, () => {
    const s = graded(tier, basket, [[29, 0], [17, 4], [21, 0], [11, 0]]);
    if (tier > 0) expect(saleMultipliers(s, b)[0]).toBeGreaterThan(1);
    const pre = sellAllPreview(s, b), label = sellAllLabel(pre.eggs, pre.cents, fmtCount, fmtMoney);
    const cards = s.customers.map(c => orderView(c, s.basket, k => saleValueCents(s, k, b)));
    const ev: GameEvent[] = []; const r = apply(s, { type: 'sellAll' }, b, ev);
    const sells = ev.filter((e): e is Extract<GameEvent, { type: 'sell' }> => e.type === 'sell');
    const delta = r.coinsCents - s.coinsCents;
    expect(pre.cents).toBe(delta);                                   // Sell all label total
    expect(label).toContain(fmtMoney(delta));
    expect(sells.reduce((a, e) => a + e.value, 0)).toBe(delta);      // '+$X' popups (fmtMoney(e.value)) sum to the delta
    expect(pre.eggs).toBe(sells.reduce((a, e) => a + e.k, 0));
    for (const e of sells) {                                         // each popup == its own credit; full-order cards == their credit
      expect(e.value).toBe(saleValueCents(s, e.k, b));
      const c = s.customers.find(c => c.id === e.id)!, card = cards.find(v => v.id === e.id)!;
      if (c.filled === 0 && e.k === c.demand) expect(card.valueCents).toBe(e.value);
    }
  });
  it('single-row Sell: popup == coin delta == card value with Grader (QA repro 58 eggs)', () => {
    const s = graded(1, 58, [[58, 0]]), card = orderView(s.customers[0], 58, k => saleValueCents(s, k, b));
    const ev: GameEvent[] = []; const r = apply(s, { type: 'sell', customerId: 1 }, b, ev);
    const e = ev.find(e => e.type === 'sell') as Extract<GameEvent, { type: 'sell' }>;
    expect(e.value).toBe(r.coinsCents - s.coinsCents); expect(card.valueCents).toBe(e.value); expect(e.value).toBeGreaterThan(58 * e.price);
  });
  it('app.ts previews only through the payout function (no k x price money anywhere)', () => {
    const src = readFileSync('src/ui/app.ts', 'utf8');
    expect(src).not.toMatch(/e\.k \* e\.price/); expect(src).not.toMatch(/cents \+= k \* price/);
    expect(src).toMatch(/sellAllPreview\(s, b\)/); expect(src).toMatch(/fmtMoney\(e\.value\)/);
  });
});

describe('BUG-3: round first, then pick the suffix', () => {
  const cases: [number, string][] = [[9_999, '9,999'], [10_000, '10K'], [999_949, '999.9K'], [999_950, '1M'], [999_960, '1M'], [999_999, '1M'],
    [1_000_000, '1M'], [9_994_999, '9.99M'], [9_996_000, '10M'], [999_949_999, '999.9M'], [999_950_000, '1B'], [999_999_999, '1B'],
    [1e9, '1B'], [999_999_999_999, '1T'], [1e12, '1T'], [2.5e13, '25T']];
  for (const [n, s] of cases) it(`${n} -> ${s}`, () => expect(fmtCount(n)).toBe(s));
  it('never 1000K/M/B across a sweep', () => {
    for (const base of [1e6, 1e9, 1e12]) for (let d = -100; d <= 100; d++) expect(fmtCount(base + d * base / 1e5)).not.toMatch(/^1000(\.\d)?[KMB]$/);
  });
  it('money', () => { expect(fmtMoney(99_996_000)).toBe('$1M'); expect(fmtMoney(1_234_500)).toBe('$12.3K'); expect(fmtMoneyShort(1e14)).toBe('$1T'); });
});

describe('BUG-4/5: FX lifetimes', () => {
  const css = readFileSync('src/ui/styles.css', 'utf8'), app = readFileSync('src/ui/app.ts', 'utf8');
  it('leaving customer waves then slides out, and reduced motion cuts the slide', () => {
    expect(css).toMatch(/\.ghost\.leave\{animation:leave 240ms 300ms/); expect(css).toMatch(/@keyframes leave\{to\{transform:translateX\(-80px\);opacity:0\}/);
    expect(css).toMatch(/\.rm \.ghost\.walkoff,\.rm \.ghost\.leave\{animation:none\}/);
    expect(app).toMatch(/ghost\(r, rm\(\) \? '' : 'wave leave'\)/); expect(app).toMatch(/spawn\(el, 1500\)/);  // lives past 300 + 240 ms
    expect(app).not.toMatch(/addEventListener\('animationend', kill/);                                       // no bubbled child animationend kill
  });
  it('merged +N floater re-arms its removal timer', () => {
    expect(app).toMatch(/retrigger\(floater\.el, 'floater'\); expire\(floater\.el, 750\)/);
    expect(app).toMatch(/clearTimeout\(timers\.get\(el\)\)/);
  });
});
