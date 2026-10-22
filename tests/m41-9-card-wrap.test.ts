// @vitest-environment jsdom
// Art ruling on #64 (Oct 22): order-card line 16 -> 14 -> 12px (-0.02em); still too wide at 12px -> WRAP to a second line.
// Never clip, never ellipsize a number; wrap replaces the '.egg ellipsis' last resort.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fitLine } from '../src/ui/order-list';
const css = readFileSync('src/ui/styles.css', 'utf8');
/** A card line whose content is `need` px wide at each step (none/fit1/fit2) inside a line box of `box` px; at fit3 it wraps
 *  (content fits). Widths scale like the real fonts: 16px -> 14px (x0.875) -> 12px -0.02em (x0.75 minus 0.24px a character). */
function line(text: [string, string, string], need16: number, box: number) {
  const l1 = document.createElement('div'); l1.className = 'l1';
  l1.innerHTML = `<span class="n">${text[0]}\u00a0</span><span class="egg">${text[1]}</span><span class="v">\u00a0· ${text[2]}</span>`;
  const chars = (l1.textContent ?? '').length;
  const need = () => l1.classList.contains('fit3') ? box : l1.classList.contains('fit2') ? need16 * 0.75 - chars * 0.24 : l1.classList.contains('fit1') ? need16 * 0.875 : need16;
  Object.defineProperty(l1, 'scrollWidth', { get: () => Math.max(box, Math.ceil(need())) }); Object.defineProperty(l1, 'clientWidth', { get: () => box });
  return l1;
}
const DC: [string, string, string] = ['999Dc/999.9Dc', 'eggs', '$999.9Dc'];
describe('Art ruling on #64: fit steps, then wrap', () => {
  it('fits at 16px: no class', () => { const l = line(DC, 140, 149); expect(fitLine(l)).toBe(0); expect(l.className).toBe('l1'); });
  it('fits at 14px: fit1', () => { const l = line(DC, 165, 149); expect(fitLine(l)).toBe(1); expect(l.classList.contains('fit1')).toBe(true); });
  it('fits at 12px -0.02em: fit2', () => { const l = line(DC, 190, 149); expect(fitLine(l)).toBe(2); expect(l.classList.contains('fit2')).toBe(true); });
  it('FORCED over-12px case: still cut at 12px -> fit3 (wrap), and only one fit class', () => {
    const l = line(DC, 241, 149); expect(fitLine(l)).toBe(3);
    expect([...l.classList]).toEqual(['l1', 'fit3']);
  });
  it('re-fit from a wrapped state when the line gets shorter', () => {
    const l = line(DC, 140, 149); l.classList.add('fit3'); expect(fitLine(l)).toBe(0); expect(l.classList.contains('fit3')).toBe(false);
  });
  it('CSS: fit3 is 12px -0.02em, wraps, nothing on the line shrinks (no ellipsis), and the card grows instead of clipping', () => {
    expect(css).toMatch(/\.order \.l1\.fit3\{font-size:12px;letter-spacing:-\.02em;flex-wrap:wrap\}\.order \.l1\.fit3>\*\{flex-shrink:0\}\.order:has\(\.l1\.fit3\)\{height:auto;min-height:60px\}/);
    expect(css).toMatch(/\.order \.l1\.fit1\{font-size:14px\}\.order \.l1\.fit2\{font-size:12px;letter-spacing:-\.02em\}/);
    expect(css).toMatch(/\.order \.l1 \.n\{[^}]*flex-shrink:0/); expect(css).toMatch(/\.order \.l1 \.v\{[^}]*flex-shrink:0[^}]*\}/);
    expect(css).not.toMatch(/\.order \.l1 \.(n|v)\{[^}]*text-overflow:ellipsis/);
  });
});

describe('HoE / QA UI Oct 22: the 75-egg cap with $1,682.25 at 360px (QA max-real repro: "74/75 e… · $1,682.25")', () => {
  it('real line text at the cap', async () => {
    const { orderView } = await import('../src/ui/orders');
    const v = orderView({ id: 921, demand: 75, filled: 74, waitedS: 0 } as any, 200, 2243); // $22.43 an egg at L30 (QA max-real)
    expect(v.line).toBe('74/75\u00a0eggs · $1,682.25'); expect(v.lineAria).toBe('74 of 75 eggs delivered, order worth $1,682.25');
  });
  it('360px line box (149px): 192px of content at 16px (QA: n 48 + eggs 36 + v 88 + gaps) steps down, never ellipsizes', () => {
    const l = line(['74/75', 'eggs', '$1,682.25'], 192, 149); const step = fitLine(l);
    expect(step).toBeGreaterThanOrEqual(1); expect(l.scrollWidth).toBeLessThanOrEqual(l.clientWidth); // fits (no clip) at the chosen step
  });
  it('a narrower box than the 12px line forces the wrap (fit3) instead of any ellipsis', () => {
    const l = line(['74/75', 'eggs', '$1,682.25'], 192, 120); expect(fitLine(l)).toBe(3); expect(l.classList.contains('fit3')).toBe(true);
  });
  it('CSS: .egg can no longer ellipsize or shrink', () => {
    expect(css).toMatch(/\.order \.l1 \.egg\{flex:0 0 auto;flex-shrink:0;overflow:visible;text-overflow:clip\}/);
    expect(css).not.toMatch(/\.order \.l1 \.egg\{[^}]*ellipsis/);
  });
});
