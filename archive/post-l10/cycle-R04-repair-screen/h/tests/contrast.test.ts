// M3 §A contrast token swaps (art-ux/m3-next-goal-spec §A): tokens in styles.css meet WCAG 2.x ratios.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');
const tok = (n: string) => css.match(new RegExp(`--${n}:(#[0-9A-Fa-f]{6})`))![1];
const lum = (h: string) => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a: string, z: string) => { const [x, y] = [lum(a), lum(z)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const W = '#FFFFFF';
describe('§A AA contrast tokens', () => {
  const cases: [string, string, string, number][] = [
    ['muted on cream', tok('c-muted'), tok('c-cream'), 4.5], ['muted on white', tok('c-muted'), W, 4.5],
    ['white on button bg', W, tok('c-meadow-strong'), 4.5], ['white on barn', W, tok('c-barn'), 4.5],
    ['wood text on cream', tok('c-wood-text'), tok('c-cream'), 4.5], ['wood text on white', tok('c-wood-text'), W, 4.5],
    ['focus ring on white', tok('c-focus'), W, 3], ['focus ring on cream', tok('c-focus'), tok('c-cream'), 3],
    ['empty-slot outline on cream', tok('c-slot-outline'), tok('c-cream'), 3], ['floater on white', tok('c-floater'), W, 4.5],
  ];
  for (const [n, a, z, need] of cases) it(`${n} >= ${need}:1`, () => expect(ratio(a, z)).toBeGreaterThanOrEqual(need));
  it('exact §A values', () => expect([tok('c-muted'), tok('c-meadow-strong'), tok('c-barn'), tok('c-wood-text'), tok('c-focus'), tok('c-slot-outline'), tok('c-floater')].map(s => s.toUpperCase()))
    .toEqual(['#6B5D52', '#3D7F33', '#B83B37', '#8A5528', '#2B79A8', '#6B5D52', '#3E2C23']));
});
