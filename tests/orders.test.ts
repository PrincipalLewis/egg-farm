// P2 order cards + P1q queue display (art-ux/m3-customer-queue-spec.md v1.0)
import { describe, it, expect } from 'vitest';
import { orderView, orderHtml, visibleOrders, moreLabel, moreName, stripSplit } from '../src/ui/orders';
const c = (demand: number, filled = 0) => ({ id: 1, demand, filled, waitedS: 0 });
describe('order card (P2)', () => {
  it('shows full order value and have/want, never $0.00', () => {
    expect(orderView(c(6), 0, 250).line).toBe('Wants 6 · $15.00');
    expect(orderView(c(5), 3, 250).line).toBe('3/5 eggs · $12.50');
    expect(orderView(c(5), 0, 0.1).line).toBe('Wants 5 · $0.01');
  });
  it('three button states: No eggs (MK-35) / Sell k / Sell', () => {
    expect(orderView(c(5), 0, 100)).toMatchObject({ state: 'wait', button: 'No eggs', sell: 0 });
    expect(orderView(c(5), 3, 100)).toMatchObject({ state: 'partial', button: 'Sell 3', sell: 3 });
    expect(orderView(c(5), 9, 100)).toMatchObject({ state: 'ready', button: 'Sell', sell: 5 });
  });
  it('earlier partial sales count toward have (MK-8/MK-10 partial selling)', () => {
    expect(orderView(c(10, 4), 2, 100)).toMatchObject({ have: 6, want: 10, state: 'partial', button: 'Sell 2' });
    expect(orderView(c(10, 4), 0, 100)).toMatchObject({ have: 4, state: 'wait', button: 'No eggs' });
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

import { fitOrderEggs } from '../src/ui/orders';
describe('fitOrderEggs (m3-customer-queue-spec §2.4)', () => {
  it('keeps " eggs" when it fits', () => { expect(fitOrderEggs('0/5 eggs', () => true)).toBe('0/5 eggs'); });
  it('drops the whole word " eggs" when it does not fit, never mid-word', () => {
    const seen: string[] = []; const out = fitOrderEggs('0/1.8M eggs', s => { seen.push(s); return s.length <= 6; });
    expect(out).toBe('0/1.8M'); expect(seen).toEqual(['0/1.8M eggs']); expect(out).not.toMatch(/eg$|…/);
  });
});
describe('order button labels (MK-35 supersedes 22:31 12px)', () => {
  it('0 eggs -> "No eggs" (no .long shrink); 3-sig counts keep labels <= 10 chars; only >9-char Sell labels get .long', () => {
    const v = orderView({ id: 1, demand: 181.2e9, filled: 0, waitedS: 0 } as any, 0, 4);
    expect(v.button).toBe('No eggs'); expect(orderHtml(v, 'a.svg')).not.toMatch(/ long"/);
    const p = orderView({ id: 2, demand: 181.2e9, filled: 0, waitedS: 0 } as any, 99.94e9, 4); expect(p.button).toBe('Sell 99.9B'); expect(orderHtml(p, 'a.svg')).toMatch(/ long"/);
  });
});
import { count3 } from '../src/ui/orders';
import { fmtShortDur } from '../src/ui/format';
describe('rc2-order-sell-preview v1.1 + MK-35', () => {
  it('(b) counts >= 1,000 use 3 significant figures, below exact, roll over', () => {
    expect(count3(999)).toBe('999'); expect(count3(1000)).toBe('1K'); expect(count3(1234)).toBe('1.23K'); expect(count3(1.8e6)).toBe('1.8M');
    expect(count3(181.2e9)).toBe('181B'); expect(count3(999.6e9)).toBe('1T'); expect(count3(12345)).toBe('12.3K');
  });
  it('(a) complete order reads "✓ Ready · $X"', () => {
    const v = orderView({ id: 1, demand: 181.2e9, filled: 0, waitedS: 0 } as any, 1e12, 4); expect(v.state).toBe('ready'); expect(v.line).toMatch(/^✓ Ready · \$/);
  });
  it('(b) partial / waiting lines use 3-sig counts; 0 eggs -> "No eggs" button', () => {
    const w = orderView({ id: 1, demand: 181.2e9, filled: 0, waitedS: 0 } as any, 0, 4); expect(w.line).toMatch(/^Wants 181B · /); expect(w.button).toBe('No eggs');
    const n = orderView({ id: 2, demand: 5, filled: 2, waitedS: 0 } as any, 0, 4); expect(n.button).toBe('No eggs');
  });
  it('#6 short duration: ~m:ss, ~1h 59m, — when never', () => {
    expect(fmtShortDur(41)).toBe('~0:41'); expect(fmtShortDur(7140)).toBe('~1h 59m'); expect(fmtShortDur(1e9)).toBe('—'); expect(fmtShortDur(Infinity)).toBe('—');
  });
});
describe('QA order clips (main repro): 1.8M/181.2B row and $9.94M value use v1.1 3-sig and never a "Need x/y" button', () => {
  it('181.2B order with 1.8M filled, 0 eggs: "1.8M/181B eggs", button "No eggs"', () => {
    const v = orderView({ id: 1, demand: 181.2e9, filled: 1.8e6, waitedS: 0 } as any, 0, 250);
    expect(v.line.startsWith('1.8M/181B eggs · ')).toBe(true); expect(v.button).toBe('No eggs');
  });
  it('$9.94M value: 3 significant figures; no reachable "Need" label for any basket', () => {
    expect(orderView({ id: 2, demand: 3976000, filled: 0, waitedS: 0 } as any, 0, 250).line).toBe('Wants 3.98M · $9.94M');
    for (const bk of [0, 0.5, 1, 3, 1e7]) expect(orderView({ id: 2, demand: 3976000, filled: 0, waitedS: 0 } as any, bk, 250).button).not.toMatch(/Need|\//);
  });
});
