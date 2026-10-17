// rc2 Minors (art-ux/rc2-notes-b2-b3.md): M-SellAll-empty label, M-Sold-freeze chip + timing constants and wiring.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { sellAllLabel, soldLabel, SOLD_HOLD_MS, SOLD_FADE_RM_MS } from '../src/ui/orders';
const fm = (c: number) => `$${(c / 100).toFixed(2)}`;
describe('M-SellAll-empty', () => {
  it('eggs in basket, no customers -> "Waiting for customers"', () => { expect(sellAllLabel(0, 0, String, fm, 12, 0)).toBe('Waiting for customers'); expect(sellAllLabel(0, 0, String, fm, 1, 0)).toBe('Waiting for customers'); });
  it('empty basket keeps "No eggs to sell" (with or without customers; a 0.6 egg basket is empty)', () => {
    expect(sellAllLabel(0, 0, String, fm, 0, 0)).toBe('No eggs to sell'); expect(sellAllLabel(0, 0, String, fm, 0, 3)).toBe('No eggs to sell'); expect(sellAllLabel(0, 0, String, fm, 0.6, 0)).toBe('No eggs to sell');
    expect(sellAllLabel(0, 0, String, fm)).toBe('No eggs to sell');
  });
  it('sellable eggs are unchanged', () => { expect(sellAllLabel(3, 300, String, fm, 3, 1)).toBe('Sell all (3 eggs\u00a0· $3.00)'); });
  it('app passes basket + customer count; the label is the button text (= its accessible name, no separate aria-label)', () => {
    const src = readFileSync('src/ui/app.ts', 'utf8');
    expect(src).toMatch(/sellAllLabel\(eggs, cents, fmtCount, fmtMoney, basket, s\.customers\.length\)/);
    expect(src).not.toMatch(/sellAllBtn\.setAttribute\('aria-label'/);
  });
});
describe('M-Sold-freeze', () => {
  it('chip text and timings', () => { expect(soldLabel('$12.40')).toBe('Sold! +$12.40'); expect(SOLD_HOLD_MS).toBe(240); expect(SOLD_FADE_RM_MS).toBe(120); });
  it('served -> orderList.sold with the completing sale value; held rows are not removed; empty state waits for leaving rows', () => {
    const app = readFileSync('src/ui/app.ts', 'utf8'), ol = readFileSync('src/ui/order-list.ts', 'utf8'), css = readFileSync('src/ui/styles.css', 'utf8');
    expect(app).toMatch(/case 'customer_served':[^\n]*orderList\.sold\(e\.id, fmtMoneyShort\(lastSale\.get\(e\.id\)/);
    expect(ol).toMatch(/planRemovals\(\{ gone, inQueue/);
    expect(ol).toMatch(/this\.empty\.hidden = i\.customers\.length > 0 \|\| this\.nodes\.size > 0 \|\| this\.leavingN > 0/);
    expect(ol).toMatch(/if \(el\.classList\.contains\('sold'\)\) return;/);
    expect(css).toMatch(/\.order \.btn\.sell\.sold[^{]*\{background:#3D7F33;color:#fff/);
    expect(css).toMatch(/\.reduced-motion \.order\.leaving,\.order\.leaving\.rmfade\{animation:orderFade \.12s/); expect(ol).toMatch(/if \(i\.rm\) el\.classList\.add\('rmfade'\)/);
  });
});
import { planRemovals } from '../src/ui/orders';
describe('M-Sold-freeze removal plan (behaviour, review ebbd02e #2/#4/#5)', () => {
  const base = { inQueue: () => false, t: 1000, frozen: false, rm: false, lastLeave: -Infinity };
  it('a Sold row is kept until its hold ends, then animates out', () => {
    const held = new Map([[7, 1100]]);
    expect(planRemovals({ ...base, gone: [7], soldUntil: held })).toEqual({ keep: [7], animate: [], drop: [], ms: 240 });
    expect(planRemovals({ ...base, t: 1100, gone: [7], soldUntil: held })).toEqual({ keep: [], animate: [7], drop: [], ms: 240 });
  });
  it('reduced motion: 120ms fade', () => { expect(planRemovals({ ...base, rm: true, t: 1200, gone: [7], soldUntil: new Map([[7, 1100]]) }).ms).toBe(120); });
  it('a Sold row leaves even under a pointer freeze; other removals wait for it (#4)', () => {
    const p = planRemovals({ ...base, frozen: true, t: 1200, gone: [7, 8], soldUntil: new Map([[7, 1100]]) });
    expect(p.animate).toEqual([7]); expect(p.keep).toEqual([8]); expect(p.drop).toEqual([]);
  });
  it('several Sold rows leave together in one batch (#5); a plain leave still obeys the 240ms anti-churn rule', () => {
    const p = planRemovals({ ...base, t: 1200, lastLeave: 1100, gone: [1, 2, 3], soldUntil: new Map([[1, 1100], [2, 1150]]) });
    expect(p.animate).toEqual([1, 2]); expect(p.drop).toEqual([3]);
    expect(planRemovals({ ...base, gone: [3], soldUntil: new Map() }).animate).toEqual([3]);
    expect(planRemovals({ ...base, lastLeave: 900, gone: [3], soldUntil: new Map() }).drop).toEqual([3]);
  });
  it('a row still in the queue (scrolled out of view) is never treated as sold', () => {
    expect(planRemovals({ ...base, inQueue: () => true, t: 1200, gone: [7], soldUntil: new Map([[7, 1100]]) }).animate).toEqual([]);
  });
});
