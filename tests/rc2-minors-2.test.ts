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
