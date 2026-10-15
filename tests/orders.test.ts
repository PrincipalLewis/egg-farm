// P2 order cards + P1q queue display (art-ux/m3-customer-queue-spec.md v1.0)
import { describe, it, expect } from 'vitest';
import { orderView, orderHtml, visibleOrders, moreLabel, moreName, stripSplit } from '../src/ui/orders';
const c = (demand: number, filled = 0) => ({ id: 1, demand, filled, waitedS: 0 });
describe('order card (P2)', () => {
  it('shows full order value and have/want, never $0.00', () => {
    expect(orderView(c(6), 0, 250).line).toBe('0/6 eggs · $15.00');
    expect(orderView(c(5), 3, 250).line).toBe('3/5 eggs · $12.50');
    expect(orderView(c(5), 0, 0.1).line).toBe('0/5 eggs · $0.01');
  });
  it('three button states: Need N / Sell k / Sell', () => {
    expect(orderView(c(5), 0, 100)).toMatchObject({ state: 'wait', button: 'Need 5', sell: 0 });
    expect(orderView(c(5), 3, 100)).toMatchObject({ state: 'partial', button: 'Sell 3', sell: 3 });
    expect(orderView(c(5), 9, 100)).toMatchObject({ state: 'ready', button: 'Sell', sell: 5 });
  });
  it('earlier partial sales count toward have (MK-8/MK-10 partial selling)', () => {
    expect(orderView(c(10, 4), 2, 100)).toMatchObject({ have: 6, want: 10, state: 'partial', button: 'Sell 2' });
    expect(orderView(c(10, 4), 0, 100)).toMatchObject({ have: 4, state: 'wait', button: 'Need 6' });
  });
  it('progress bar ARIA + width, disabled Need', () => {
    const h = orderHtml(orderView(c(5), 3, 100), 'a.svg');
    expect(h).toContain('aria-valuenow="3"'); expect(h).toContain('aria-valuemax="5"'); expect(h).toContain('width:60.00%');
    expect(orderHtml(orderView(c(5), 0, 100), 'a.svg')).toContain('aria-disabled="true"');
  });
  it('big numbers stay compact', () => { expect(orderView(c(1500, 0), 1200, 226667).line).toBe('1.2K/1.5K eggs · $3.4M'); });
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
