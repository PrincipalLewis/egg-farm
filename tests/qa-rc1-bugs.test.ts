/** QA rc1-pt1 pass 1 (qa/claude-qa/rc1-pt1-pass1.md): BUG-1/2 money previews == credit, BUG-3 suffix boundaries, BUG-4/5 FX. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { apply } from '../src/sim/actions';
import type { SimEvent as GameEvent } from '../src/sim/events';
import { saleValueCents, sellAllPreview, saleMultipliers } from '../src/sim/payout';
import { orderView, sellAllLabel } from '../src/ui/orders';
import { fmtCount, fmtMoney, fmtMoneyShort, fmtMoneyPreview, fmtMoneyExact } from '../src/ui/format';

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
    for (const e of sells) expect(e.value).toBe(saleValueCents(s, e.k, b)); // each '+$X' popup == its credit
    // Per-card Sell button == what tapping THAT card credits (own basket, not the sellAll walk).
    for (const card of cards) {
      const c = s.customers.find(x => x.id === card.id)!;
      expect(card.valueCents).toBe(saleValueCents(s, c.demand, b));  // card line keeps full order value
      if (card.sell === 0) { expect(card.sellCents).toBe(0); expect(card.button).toMatch(/^Need /); continue; }
      expect(card.sellCents).toBe(saleValueCents(s, card.sell, b));
      const one: GameEvent[] = []; const r1 = apply(s, { type: 'sell', customerId: card.id }, b, one);
      const e1 = one.find(e => e.type === 'sell') as Extract<GameEvent, { type: 'sell' }>;
      expect(e1.k).toBe(card.sell);
      expect(e1.value).toBe(card.sellCents);
      expect(r1.coinsCents - s.coinsCents).toBe(card.sellCents);
      expect(card.button).toContain(`+${fmtMoneyPreview(card.sellCents)}`);
      expect(card.buttonAria).toContain(`+${fmtMoneyExact(card.sellCents)}`);
    }
  });
  it('single-row Sell: popup == coin delta == Sell button with Grader (QA repro 58 eggs)', () => {
    const s = graded(1, 58, [[58, 0]]), card = orderView(s.customers[0], 58, k => saleValueCents(s, k, b));
    const ev: GameEvent[] = []; const r = apply(s, { type: 'sell', customerId: 1 }, b, ev);
    const e = ev.find(e => e.type === 'sell') as Extract<GameEvent, { type: 'sell' }>;
    expect(e.value).toBe(r.coinsCents - s.coinsCents);
    expect(card.sellCents).toBe(e.value);
    expect(card.valueCents).toBe(e.value); // full order == this Sell when filled=0 and k=demand
    expect(e.value).toBeGreaterThan(58 * e.price);
  });
  it('partial order: card keeps full order value; Sell button == next Sell credit (Grader 0/1/2)', () => {
    for (const tier of [0, 1, 2]) {
      // Partly filled (4/17), basket 3 -> this Sell is 3 eggs; full order is 17.
      const s = graded(tier, 3, [[17, 4]]);
      const card = orderView(s.customers[0], s.basket, k => saleValueCents(s, k, b));
      const ev: GameEvent[] = []; const r = apply(s, { type: 'sell', customerId: 1 }, b, ev);
      const e = ev.find(e => e.type === 'sell') as Extract<GameEvent, { type: 'sell' }>;
      expect(e.k).toBe(3);
      expect(card.sell).toBe(3);
      expect(card.sellCents).toBe(e.value);
      expect(card.sellCents).toBe(r.coinsCents - s.coinsCents);
      expect(card.valueCents).toBe(saleValueCents(s, 17, b));
      expect(card.valueCents).toBeGreaterThan(card.sellCents); // card shows more than next Sell; button shows the Sell amount
      expect(card.button).toBe(`Sell 3\u00a0· +${fmtMoneyPreview(e.value)}`);
      expect(card.buttonAria).toBe(`Sell 3\u00a0· +${fmtMoneyExact(e.value)}`);
      expect(card.line).toContain(fmtMoney(card.valueCents));
    }
  });
  it('app.ts previews only through the payout function (no k x price money anywhere)', () => {
    const src = readFileSync('src/ui/app.ts', 'utf8');
    expect(src).not.toMatch(/e\.k \* e\.price/); expect(src).not.toMatch(/cents \+= k \* price/);
    expect(src).toMatch(/sellAllPreview\(s, b\)/); expect(src).toMatch(/fmtMoneyExact\(e\.value\)/);
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
  it('fmtMoneyExact: full dollars + thousands + 2 dp; — for non-finite', () => {
    expect(fmtMoneyExact(999_900_000)).toBe('$9,999,000.00');
    expect(fmtMoneyExact(1_234_567)).toBe('$12,345.67');
    expect(fmtMoneyExact(50)).toBe('$0.50');
    expect(fmtMoneyExact(100_000)).toBe('$1,000.00');
    expect(fmtMoneyExact(NaN)).toBe('—');
    expect(fmtMoneyExact(Infinity)).toBe('—');
  });
  it('fmtMoneyPreview floors at $1K+ and never exceeds credit', () => {
    expect(fmtMoneyPreview(99_999)).toBe('$999.99');
    expect(fmtMoneyPreview(100_000)).toBe('$1K');
    expect(fmtMoneyPreview(129_999)).toBe('$1.2K'); // not $1.3K
    expect(fmtMoneyPreview(999_999)).toBe('$9.9K');
    expect(fmtMoneyPreview(123_000_000)).toBe('$1.2M');
    // Displayed short value in dollars <= exact dollars
    for (const c of [99_999, 100_000, 129_999, 999_999, 1_234_567, 123_000_000]) {
      const shown = fmtMoneyPreview(c);
      if (shown.endsWith('K')) expect(parseFloat(shown.slice(1)) * 1e3).toBeLessThanOrEqual(c / 100 + 1e-9);
      else if (shown.endsWith('M')) expect(parseFloat(shown.slice(1)) * 1e6).toBeLessThanOrEqual(c / 100 + 1e-9);
      else expect(shown).toBe(fmtMoney(c));
    }
  });
});

describe('BUG-4/5: FX lifetimes', () => {
  const css = readFileSync('src/ui/styles.css', 'utf8'), app = readFileSync('src/ui/app.ts', 'utf8');
  it('leaving customer waves then slides out, and reduced motion cuts the slide', () => {
    expect(css).toMatch(/\.ghost\.leave\{animation:leave 240ms 300ms/); expect(css).toMatch(/@keyframes leave\{to\{transform:translateX\(-80px\);opacity:0\}/);
    expect(css).toMatch(/\.rm \.ghost\.walkoff,\.rm \.ghost\.leave\{animation:none\}/);
    expect(app).toMatch(/ghost\(r, rm\(\) \? '' : 'wave leave'\)/); expect(app).toMatch(/spawn\(el, 1500\)|live\.splice\(i, 1\); \}, 1500\)/);  /* #31: ghostHost + setTimeout 1500 */  // lives past 300 + 240 ms
    expect(app).not.toMatch(/addEventListener\('animationend', kill/);                                       // no bubbled child animationend kill
  });
  it('merged +N floater re-arms its removal timer', () => {
    expect(app).toMatch(/retrigger\(floater\.el, 'floater'\); expire\(floater\.el, 750\)/);
    expect(app).toMatch(/clearTimeout\(timers\.get\(el\)\)/);
  });
});

describe('MK-24-1 v3: always two-line Sell, shared width, money never truncates', () => {
  const css = readFileSync('src/ui/styles.css', 'utf8');
  const listSrc = readFileSync('src/ui/order-list.ts', 'utf8');
  it('1: always two-line (column, 14px/12px); no one-line mode or sell-stack', () => {
    expect(css).toMatch(/\.order \.btn\.sell\{[^}]*flex-direction:column/);
    expect(css).toMatch(/\.order \.btn\.sell \.sk\{[^}]*font:800 14px/);
    expect(css).toMatch(/\.order \.btn\.sell \.sy\{[^}]*font:800 12px/);
    expect(css).not.toMatch(/\.order \.btn\.sell\.sell-stack/);
    expect(css).not.toMatch(/@media \(max-width:375px\)\{[^}]*\.order \.btn\.sell/);
    expect(listSrc).not.toMatch(/sell-stack/);
    expect(listSrc).toMatch(/syncSellWidth/);
  });
  it('2: shared --sell-w, min 88, max 45cqw, pad 10, no ellipsis on button', () => {
    expect(css).toMatch(/\.order \.btn\.sell\{[^}]*width:var\(--sell-w,88px\)/);
    expect(css).toMatch(/\.order \.btn\.sell\{[^}]*min-width:88px/);
    expect(css).toMatch(/\.order \.btn\.sell\{[^}]*max-width:45cqw/);
    expect(css).toMatch(/\.order \.btn\.sell\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.order \.btn\.sell\{[^}]*padding-inline:10px/);
    expect(css).toMatch(/\.order \.btn\.sell \.sk,\.order \.btn\.sell \.sy\{[^}]*flex-shrink:0/);
    expect(css).not.toMatch(/\.order \.btn\.sell \.sk,\.order \.btn\.sell \.sy\{[^}]*text-overflow:ellipsis/);
    expect(listSrc).toMatch(/--sell-w/);
  });
  it('3: row count and $ never truncate; .egg no longer ellipsizes either (Art ruling on #64 / HoE Oct 22: wrap instead)', () => {
    expect(css).toMatch(/\.order \.l1 \.n\{[^}]*flex-shrink:0/);
    expect(css).toMatch(/\.order \.l1 \.v\{[^}]*flex-shrink:0/);
    expect(css).toMatch(/\.order \.l1 \.v\{[^}]*overflow:visible/);
    expect(css).not.toMatch(/\.order \.l1 \.v\{[^}]*text-overflow:ellipsis/);
    expect(css).not.toMatch(/\.order \.l1 \.egg\{[^}]*text-overflow:ellipsis/); expect(css).toMatch(/\.order \.l1 \.egg\{[^}]*flex-shrink:0/);
  });
  it('≤375 does not cap the Sell button at 96px', () => {
    expect(css).not.toMatch(/@media \(max-width:375px\)\{[^}]*\.order \.btn\.sell[^}]*max-width:96px/);
  });
});

describe('S2-REL-1 / exact money wiring', () => {
  const app = readFileSync('src/ui/app.ts', 'utf8');
  const main = readFileSync('src/main.ts', 'utf8');
  it('eggfarmOrderList and eggfarm are IOS_FLAG-only', () => {
    expect(app).toMatch(/if \(IOS_FLAG_ENABLED\) \(window as any\)\.eggfarmOrderList/);
    expect(app).not.toMatch(/^\s*\(window as any\)\.eggfarmOrderList/m);
    expect(main).toMatch(/if \(IOS_FLAG_ENABLED\) \(window as any\)\.eggfarm =/);
  });
  it('sell popup and Thanks card use fmtMoneyExact', () => {
    expect(app).toMatch(/fmtMoneyExact\(e\.value\)/);
    expect(app).toMatch(/fmtMoneyExact\(d\.cents\)/);
    expect(app).not.toMatch(/fmtMoneyShort\((?!trackPriceCents)/); // #31: unit Egg price row may use short form; sell money stays exact
  });
});

describe('QA TUT-1: docked tutorial Sell step', () => {
  const app = readFileSync('src/ui/app.ts', 'utf8');
  it('step 1 targets the first Sell button when docked (openPanel keeps open=null there)', () => {
    expect(app).toMatch(/if \(st === 1\) return open === 'market' \|\| docked\.matches \? mRows\.querySelector\('button\[data-id\]'\)/);
  });
  it('a docked card tap highlights its order row', () => {
    expect(app).toMatch(/if \(docked\.matches && c\) \{[^\n]*\.order\[data-row=/);
    expect(app).toMatch(/row\.dataset\.hl = '1'/);
  });
});
