// rc2 Minors 2 (art-ux/rc2-notes-b2-b3.md): M-Order-zero, M-Tut-parity, M-Tut-goal, M-Toast-layer.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { orderView } from '../src/ui/orders';
const c = (d: number, f = 0) => ({ id: 1, demand: d, filled: f, waitedS: 0 }) as any;
describe('M-Order-zero', () => {
  it('nothing delivered or sellable -> "Wants 13", aria "Customer wants 13 eggs"', () => {
    const v = orderView(c(13), 0, 100); expect(v.line).toMatch(/^Wants 13 · /); expect(v.aria).toBe('Customer wants 13 eggs');
  });
  it('after the first egg -> "1/13 eggs", aria "Order 1 of 13 eggs"', () => {
    const v = orderView(c(13, 1), 0, 100); expect(v.line).toMatch(/^1\/13 eggs · /); expect(v.aria).toBe('Order 1 of 13 eggs');
    expect(orderView(c(13), 1, 100).line).toMatch(/^1\/13 eggs · /);
  });
  it('ready keeps "✓ Ready"', () => { expect(orderView(c(5), 5, 100).line).toMatch(/^✓ Ready · /); });
  it('order-list writes the view aria to the progressbar', () => { expect(readFileSync('src/ui/order-list.ts', 'utf8')).toMatch(/bar\.setAttribute\('aria-label', v\.aria\)/); });
});
import { TUT_COPY, tutCaption } from '../src/ui/onboarding';
describe('M-Tut-parity', () => {
  it('one caption per step, the 390 strings', () => {
    expect(TUT_COPY).toEqual(['Tap <b>Collect</b> to gather the eggs.', 'A customer! Tap them to sell eggs.', 'Spend coins to collect more eggs per tap.']);
    expect([0, 1, 2].map(tutCaption)).toEqual([...TUT_COPY]);
  });
  it('app.ts passes tutCaption with no width/panel branching and no other caption strings', () => {
    const src = readFileSync('src/ui/app.ts', 'utf8');
    expect(src).toMatch(/\}, tutCaption \/\*/);
    expect(src).not.toMatch(/Tap <b>Sell<\/b> to earn coins|'Tap <b>Buy<\/b>\.'/);
  });
});
