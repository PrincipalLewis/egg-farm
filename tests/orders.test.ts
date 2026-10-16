// P2 order cards + P1q queue display (art-ux/m3-customer-queue-spec.md v1.0)
import { describe, it, expect } from 'vitest';
import { orderView, orderHtml, visibleOrders, moreLabel, moreName, stripSplit } from '../src/ui/orders';
const c = (demand: number, filled = 0) => ({ id: 1, demand, filled, waitedS: 0 });
describe('order card (P2)', () => {
  it('NBSP between count and eggs (Art & UX 16c2248)', () => {
    const v = orderView(c(17, 4), 58, 552);
    expect(v.line).toContain('\u00a0eggs');
    expect(v.line).not.toMatch(/\d eggs/); // no regular space before eggs
    expect(v.line.charCodeAt(v.line.indexOf('eggs') - 1)).toBe(0xa0);
    const h = orderHtml(v, 'a.svg');
    expect(h).toContain('4/17\u00a0</span><span class="egg">eggs</span>');
    expect(h).not.toContain('> eggs</span>');
  });
  it('shows full order value and delivered/demand, never $0.00 (MK-23)', () => {
    expect(orderView(c(6), 0, 250).line).toBe('0/6\u00a0eggs · $15.00');
    expect(orderView(c(5, 3), 99, 250).line).toBe('3/5\u00a0eggs · $12.50'); // filled=3; basket does not inflate the count
    expect(orderView(c(5), 3, 250).line).toBe('0/5\u00a0eggs · $12.50'); // filled=0 even when Sell would take 3
    expect(orderView(c(5), 0, 0.1).line).toBe('0/5\u00a0eggs · $0.01');
  });
  it('three button states: Need N / Sell k · +$X / Sell N · +$X (MK-24)', () => {
    expect(orderView(c(5), 0, 100)).toMatchObject({ state: 'wait', button: 'Need 5', sell: 0, sellCents: 0, valueCents: 500 });
    const partial = orderView(c(5), 3, 100);
    expect(partial).toMatchObject({ state: 'partial', sell: 3, sellCents: 300, valueCents: 500 });
    expect(partial.button).toBe('Sell 3\u00a0· +$3.00');
    const ready = orderView(c(5), 9, 100);
    expect(ready).toMatchObject({ state: 'ready', sell: 5, sellCents: 500, valueCents: 500 });
    expect(ready.button).toBe('Sell 5\u00a0· +$5.00');
  });
  it('row 2 fixture: 4/17 delivered with Sell 13 (Product delivered-eggs + Art & UX)', () => {
    // demand 17, filled 4, basket 58 -> rem 13, sell 13; card shows filled only
    const v = orderView(c(17, 4), 58, 552); // ~$5.52/egg so full ~$93.84
    expect(v).toMatchObject({ have: 4, want: 17, sell: 13, state: 'ready' });
    expect(v.line).toBe('4/17\u00a0eggs · $93.84');
    expect(v.lineAria).toBe('4 of 17 eggs delivered, order worth $93.84');
    expect(v.button).toMatch(/^Sell 13\u00a0· \+/);
    expect(v.sellCents).toBe(13 * 552);
    expect(v.valueCents).toBe(17 * 552);
    expect(v.valueCents).toBeGreaterThan(v.sellCents); // card $ = full order; button = this Sell
  });
  it('have is filled only; Sell does not inflate the count (MK-8/MK-10 + Product)', () => {
    const v = orderView(c(10, 4), 2, 100);
    expect(v).toMatchObject({ have: 4, want: 10, state: 'partial', sell: 2, sellCents: 200, valueCents: 1000 });
    expect(v.line).toBe('4/10\u00a0eggs · $10.00');
    expect(v.button).toBe('Sell 2\u00a0· +$2.00');
    expect(v.valueCents).toBeGreaterThan(v.sellCents);
    expect(orderView(c(10, 4), 0, 100)).toMatchObject({ have: 4, state: 'wait', button: 'Need 6', sellCents: 0 });
  });
  it('progress bar + row aria use delivered eggs; $ is full order (Art & UX)', () => {
    const v = orderView(c(5, 3), 9, 100);
    const h = orderHtml(v, 'a.svg');
    expect(v.have).toBe(3);
    expect(h).toContain('aria-valuenow="3"'); expect(h).toContain('aria-valuemax="5"'); expect(h).toContain('width:60.00%');
    expect(h).toContain('class="n">3/5\u00a0</span><span class="egg">eggs</span>');
    expect(h).toContain('aria-label="3 of 5 eggs delivered, order worth $5.00"');
    expect(v.lineAria).toBe('3 of 5 eggs delivered, order worth $5.00');
    expect(orderHtml(orderView(c(5), 0, 100), 'a.svg')).toContain('aria-disabled="true"');
    // basket alone does not move the bar
    const empty = orderHtml(orderView(c(5), 3, 100), 'a.svg');
    expect(empty).toContain('aria-valuenow="0"'); expect(empty).toContain('width:0.00%');
  });
  it('big numbers stay compact', () => { expect(orderView(c(1500, 0), 1200, 226667).line).toBe('0/1.5K\u00a0eggs · $3.4M'); // delivered 0; $ = full order
    expect(orderView(c(1500, 1200), 0, 226667).line).toBe('1.2K/1.5K\u00a0eggs · $3.4M'); });
  it('Sell button floors short money; aria keeps exact (HoP 15:14)', () => {
    // cents = dollars * 100. Below $1K: exact on button and aria.
    expect(orderView(c(5), 3, 100).button).toBe('Sell 3\u00a0· +$3.00');
    expect(orderView(c(5), 3, 100).buttonAria).toBe('Sell 3\u00a0· +$3.00');
    // $999.99 exact
    const under = orderView(c(1), 1, 99999);
    expect(under.button).toBe('Sell 1\u00a0· +$999.99');
    expect(under.buttonAria).toBe('Sell 1\u00a0· +$999.99');
    // $1,000 -> $1K (floor)
    const k = orderView(c(1), 1, 100_000);
    expect(k.button).toBe('Sell 1\u00a0· +$1K');
    expect(k.buttonAria).toBe('Sell 1\u00a0· +$1,000.00');
    // $1,299.99 -> $1.2K not $1.3K; aria exact
    const floor = orderView(c(1), 1, 129_999);
    expect(floor.button).toBe('Sell 1\u00a0· +$1.2K');
    expect(floor.buttonAria).toBe('Sell 1\u00a0· +$1,299.99');
    expect(floor.sellCents).toBe(129_999);
    // $9,999.99 -> $9.9K
    const nines = orderView(c(1), 1, 999_999);
    expect(nines.button).toBe('Sell 1\u00a0· +$9.9K');
    expect(nines.buttonAria).toBe('Sell 1\u00a0· +$9,999.99');
    // $1.23M -> button $1.2M; aria exact $1,230,000.00
    const mil = orderView(c(1), 1, 123_000_000);
    expect(mil.button).toBe('Sell 1\u00a0· +$1.2M');
    expect(mil.buttonAria).toBe('Sell 1\u00a0· +$1,230,000.00');
    // QA MK-24-1-A11Y: $9,999,000 and $12,345.67 stay exact on aria
    const big = orderView(c(1), 1, 999_900_000);
    expect(big.button).toBe('Sell 1\u00a0· +$9.9M');
    expect(big.buttonAria).toBe('Sell 1\u00a0· +$9,999,000.00');
    const mid = orderView(c(1), 1, 1_234_567);
    expect(mid.button).toBe('Sell 1\u00a0· +$12.3K');
    expect(mid.buttonAria).toBe('Sell 1\u00a0· +$12,345.67');
  });
});
describe('queue display (P1q)', () => {
  it('4 cards at 360x640/375x667, 5 at 390x844, all on desktop', () => {
    expect(visibleOrders(640, false, 10)).toBe(4); expect(visibleOrders(667, false, 10)).toBe(4);
    expect(visibleOrders(844, false, 10)).toBe(5); expect(visibleOrders(844, false, 3)).toBe(3); expect(visibleOrders(720, true, 10)).toBe(10);
  });
  it('chip label + accessible name', () => {
    expect(moreLabel(6, false)).toBe('+6 waiting'); expect(moreLabel(6, true)).toBe('Show less');
    expect(moreName(3, false)).toBe('3 more customers waiting, show all');
  });
  it('farm strip: <= 5 chips, 4 + "+N" past 5', () => {
    expect(stripSplit(5)).toEqual({ shown: 5, more: 0 }); expect(stripSplit(6)).toEqual({ shown: 4, more: 2 }); expect(stripSplit(10)).toEqual({ shown: 4, more: 6 });
  });
});
