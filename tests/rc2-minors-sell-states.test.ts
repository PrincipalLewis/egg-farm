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
    expect(ol).toMatch(/!shownSet\.has\(id\) && !held\(id\)/);
    expect(ol).toMatch(/this\.empty\.hidden = i\.customers\.length > 0 \|\| this\.nodes\.size > 0 \|\| this\.leavingN > 0/);
    expect(ol).toMatch(/if \(el\.classList\.contains\('sold'\)\) return;/);
    expect(css).toMatch(/\.order \.btn\.sell\.sold[^{]*\{background:#3D7F33;color:#fff/);
    expect(css).toMatch(/\.reduced-motion \.order\.leaving\{animation:orderFade \.12s/);
  });
});
