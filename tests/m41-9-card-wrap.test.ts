// @vitest-environment jsdom
// Art ruling on #64 (Oct 22): order-card line 16 -> 14 -> 12px (-0.02em); still too wide at 12px -> WRAP to a second line.
// Never clip, never ellipsize a number; wrap replaces the '.egg ellipsis' last resort.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fitLine } from '../src/ui/order-list';
const css = readFileSync('src/ui/styles.css', 'utf8');
/** A card line whose .egg is cut (clientWidth < 36) until the given step: avail[cls] = .egg width at that step. */
function line(avail: Record<string, number>) {
  const l1 = document.createElement('div'); l1.className = 'l1'; l1.innerHTML = '<span class="n">999Dc/999.9Dc\u00a0</span><span class="egg">eggs</span><span class="v">\u00a0· $999.9Dc</span>';
  const egg = l1.querySelector('.egg')!; const step = () => ['fit3', 'fit2', 'fit1'].find(c => l1.classList.contains(c)) ?? 'none';
  Object.defineProperty(egg, 'scrollWidth', { get: () => 36 }); Object.defineProperty(egg, 'clientWidth', { get: () => avail[step()] ?? 36 });
  return l1;
}
describe('Art ruling on #64: fit steps, then wrap', () => {
  it('fits at 16px: no class', () => { const l = line({ none: 36 }); expect(fitLine(l)).toBe(0); expect(l.className).toBe('l1'); });
  it('fits at 14px: fit1', () => { const l = line({ none: 10 }); expect(fitLine(l)).toBe(1); expect(l.classList.contains('fit1')).toBe(true); });
  it('fits at 12px -0.02em: fit2', () => { const l = line({ none: 0, fit1: 20 }); expect(fitLine(l)).toBe(2); expect(l.classList.contains('fit2')).toBe(true); });
  it('FORCED over-12px case: still cut at 12px -> fit3 (wrap), and only one fit class', () => {
    const l = line({ none: 0, fit1: 0, fit2: 14, fit3: 36 }); expect(fitLine(l)).toBe(3);
    expect([...l.classList]).toEqual(['l1', 'fit3']);
  });
  it('re-fit from a wrapped state when the line gets shorter', () => {
    const l = line({ none: 36 }); l.classList.add('fit3'); expect(fitLine(l)).toBe(0); expect(l.classList.contains('fit3')).toBe(false);
  });
  it('CSS: fit3 is 12px -0.02em, wraps, nothing on the line shrinks (no ellipsis), and the card grows instead of clipping', () => {
    expect(css).toMatch(/\.order \.l1\.fit3\{font-size:12px;letter-spacing:-\.02em;flex-wrap:wrap\}\.order \.l1\.fit3>\*\{flex-shrink:0\}\.order:has\(\.l1\.fit3\)\{height:auto;min-height:60px\}/);
    expect(css).toMatch(/\.order \.l1\.fit1\{font-size:14px\}\.order \.l1\.fit2\{font-size:12px;letter-spacing:-\.02em\}/);
    expect(css).toMatch(/\.order \.l1 \.n\{[^}]*flex-shrink:0/); expect(css).toMatch(/\.order \.l1 \.v\{[^}]*flex-shrink:0[^}]*\}/);
    expect(css).not.toMatch(/\.order \.l1 \.(n|v)\{[^}]*text-overflow:ellipsis/);
  });
});
