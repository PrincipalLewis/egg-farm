// rc2 Minors 2 (art-ux/rc2-notes-b2-b3.md): M-Order-zero, M-Tut-parity, M-Tut-goal, M-Toast-layer.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { orderView } from '../src/ui/orders';
const c = (d: number, f = 0) => ({ id: 1, demand: d, filled: f, waitedS: 0 }) as any;
describe('M-Order-zero', () => {
  it('nothing delivered or sellable -> "Wants 13 eggs", aria "Customer wants 13 eggs"', () => {
    const v = orderView(c(13), 0, 100); expect(v.line).toMatch(/^Wants 13 eggs · /); expect(v.aria).toBe('Customer wants 13 eggs');
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
  it('one caption per step, FM-AC4 strings', () => {
    expect(TUT_COPY).toEqual(['Tap <b>Collect</b> to gather eggs.', 'A customer! Tap <b>Sell</b> to earn coins.', 'Buy your first upgrade: more eggs per tap.']);
    expect([0, 1, 2].map(tutCaption)).toEqual([...TUT_COPY]);
  });
  it('app.ts passes tutCaption with no width/panel branching and no other caption strings', () => {
    const src = readFileSync('src/ui/app.ts', 'utf8');
    expect(src).toMatch(/\}, tutCaption \/\*/);
    expect(src).not.toMatch(/Tap <b>Sell<\/b> to earn coins|'Tap <b>Buy<\/b>\.'|gather the eggs/);
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
  it('wiring: showToast goes through toastGate blocked by #modal-layer.open; modals pull a visible toast; closeModal releases; no z-index swap (behaviour in toast-gate.test.ts)', () => {
    const app = readFileSync('src/ui/app.ts', 'utf8'), css = readFileSync('src/ui/styles.css', 'utf8');
    expect(app).toMatch(/toastGate\(\(\) => modal\.classList\.contains\('open'\), rawToast/); expect(app).toMatch(/\{ blocked: \(\) => modal\.classList\.contains\('open'\), hold: ms => toastQ\.hold\(/);
    expect(app).toMatch(/const showToast = \(text: string, ms = TOAST_MS\) => toastQ\.toast\(text, ms\)/);
    expect(app.match(/pullToast\(\); /g)?.length).toBe(2); expect(app).toMatch(/const pullToast = \(\) => pullToastFrom\(/);
    expect(app).toMatch(/const closeModal = [^\n]*\n\s*toastQ\.released\(\)/);
    expect(app).not.toMatch(/deferredToast/);
    expect(css).not.toMatch(/#modal-layer\{[^}]*z-index:(3[2-9]|[4-9]\d)/);
  });
});
import { fitOrderEggs } from '../src/ui/orders';
describe('M-Order-zero fit', () => {
  it('§9: "Wants N eggs" kept when it fits; drops " eggs" (never "0/N", never cut) when it does not', () => {
    expect(fitOrderEggs('Wants 13 eggs', () => true)).toBe('Wants 13 eggs'); expect(fitOrderEggs('Wants 13 eggs', () => false)).toBe('Wants 13'); expect(fitOrderEggs('Wants 181B eggs', () => false)).toBe('Wants 181B');
    expect(orderView(c(13), 0, 118).line).toBe('Wants 13 eggs · $15.34'); expect(orderView(c(181e9), 0, 983.4).line).toBe('Wants 181B eggs · $1.78T');
    expect(fitOrderEggs('1/13 eggs', () => false)).toBe('1/13');
  });
});

import { setHint } from '../src/ui/onboarding';
describe('M-Tut-goal hint keeps the link node (review e9b9826 #5)', () => {
  const fake = () => { const link = { classList: { contains: (c: string) => c === 'tut-link' } }; const t = { nodeType: 3, nodeValue: '' as string | null };
    const el: any = { _html: '', set innerHTML(v: string) { this._html = v; this.writes++; const k = v.endsWith(TUT_GOAL_LINK) ? v.length - TUT_GOAL_LINK.length : -1; if (k > 0) { t.nodeValue = v.slice(0, k); this.firstChild = t; this.lastElementChild = link; this.childNodes = { length: 2 }; } else { this.firstChild = null; this.lastElementChild = null; this.childNodes = { length: 1 }; } }, get innerHTML() { return this._html; }, writes: 0, firstChild: null, lastElementChild: null, childNodes: { length: 0 } };
    return { el, t, link }; };
  it('amount change rewrites only the text node; other captions replace the content', () => {
    const { el, t } = fake(); setHint(el, `$3\u00a0to\u00a0go\u00a0·\u00a0${TUT_GOAL_LINK}`); expect(el.writes).toBe(1); const node = el.lastElementChild;
    setHint(el, `$2\u00a0to\u00a0go\u00a0·\u00a0${TUT_GOAL_LINK}`); expect(el.writes).toBe(1); expect(t.nodeValue).toBe('$2\u00a0to\u00a0go\u00a0·\u00a0'); expect(el.lastElementChild).toBe(node);
    setHint(el, 'Collect some eggs to sell.'); expect(el.writes).toBe(2);
  });
});
import { fitOrderText } from '../src/ui/orders';
describe('§9 fitOrderText (review dbc6948 #3)', () => {
  it('<=375 drops " eggs"; wider keeps it when it fits; a "Wants N" that still does not fit becomes "0/N"; value never cut', () => {
    const fitsUpTo = (n: number) => (t: string) => t.length <= n;
    expect(fitOrderText('Wants 13 eggs', true, fitsUpTo(99))).toBe('Wants 13'); expect(fitOrderText('4/17 eggs', true, fitsUpTo(4))).toBe('4/17');
    expect(fitOrderText('Wants 13 eggs', true, fitsUpTo(5))).toBe('0/13');
    // §9.1 (N2): '1.23M/9.99M' -> '1.23M' -> '' (value only); value never cut
    expect(fitOrderText('1.23M/9.99M eggs', true, fitsUpTo(5))).toBe('1.23M'); expect(fitOrderText('1.23M/9.99M eggs', true, () => false)).toBe('');
    expect(fitOrderText('1.23M/9.99M eggs', true, fitsUpTo(11))).toBe('1.23M/9.99M'); expect(fitOrderText('Wants 13 eggs', true, () => false)).toBe(''); expect(fitOrderText('Wants 3.98M eggs', false, t => t.length <= 7)).toBe('0/3.98M');
    expect(fitOrderText('Wants 13 eggs', false, () => true)).toBe('Wants 13 eggs'); expect(fitOrderText('Wants 181B eggs', false, t => t !== 'Wants 181B eggs')).toBe('Wants 181B');
    expect(readFileSync('src/ui/order-list.ts', 'utf8')).toMatch(/const fe = fitOrderText\(e, narrow, fitsL1\)/);
  });
  it('3 sig figs from $1B, no "$1000B" glitch', () => {
    expect(orderView(c(181e9), 0, 100).line).toBe('Wants 181B eggs · $181B'); expect(orderView(c(1e9), 0, 99996).line).toMatch(/· \$1T$/); expect(orderView(c(13), 0, 118).line).toBe('Wants 13 eggs · $15.34');
  });
});
