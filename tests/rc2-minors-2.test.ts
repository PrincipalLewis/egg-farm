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
import { ftueGate, TUT_GOAL_LINK } from '../src/ui/onboarding';
describe('M-Tut-goal', () => {
  it('bubble reads "$2 to go · Upgrades ›" with NBSPs (never breaks)', () => {
    const h = ftueGate('upgrade', { coop: 0, eggsPerTap: 5, customers: 0, basket: 0, coinsCents: 800, costCents: 1000, nextCustomerInS: 10 }).hint;
    expect(h).toBe('$2\u00a0to\u00a0go\u00a0·\u00a0' + TUT_GOAL_LINK);
    expect(h.replace(/<[^>]+>/g, '')).toBe('$2\u00a0to\u00a0go\u00a0·\u00a0Upgrades\u00a0›'); expect(h.replace(/<[^>]+>/g, '')).not.toMatch(/ /);
  });
  it('link opens Upgrades, scrolls to and pulses the target Buy button; tappable through the overlay', () => {
    const app = readFileSync('src/ui/app.ts', 'utf8'), css = readFileSync('src/ui/styles.css', 'utf8');
    expect(app).toMatch(/closest\?\.\('\.tut-link'\)[\s\S]{0,200}openPanel\('upgrades'\)[\s\S]{0,300}scrollIntoView[\s\S]{0,120}retrigger\(buy, 'pulse'\)/);
    expect(css).toMatch(/\.onb \.tut-link\{pointer-events:auto/);
  });
});
describe('M-Toast-layer', () => {
  it('toasts wait while Welcome-back is open, a visible one is pulled, and the latest shows after it closes', () => {
    const app = readFileSync('src/ui/app.ts', 'utf8');
    expect(app).toMatch(/const showToast = \(text: string, ms = 1300\) => \{ if \(modalKind === 'welcome'\) \{ deferredToast = \[text, ms\]; return; \}/);
    expect(app).toMatch(/if \(toast\.classList\.contains\('show'\)\) \{ deferredToast = [^\n]*toast\.classList\.remove\('show'\)[^\n]*\n\s*modalKind = 'welcome'/);
    expect(app).toMatch(/if \(wasWelcome && deferredToast\)[^\n]*showToast\(t, ms\)/);
  });
});
