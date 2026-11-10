import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// Major P3 guard (CCR 36cc9b3 #1): the scene sprite rule must stay scoped, or any UI element with class "coop"
// inherits position:absolute and overlaps the Collection card's 'Need $X more' line (375px).
const css = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
describe('P3 Collection card limit hint', () => {
  it('has no unscoped .coop rule', () => {
    expect(css.split('.scene .coop').join('')).not.toMatch(/\.coop[{.:\s,]/);
    expect(css).toMatch(/\.scene \.coop\{position:absolute/);
  });
  it('Limited by coop hint uses .hint.limit (static), not .hint.coop', () => {
    expect(app).not.toMatch(/class="hint coop"/);
    expect(app).toMatch(/class="hint limit"[^`]*Limited by coop/);
    expect(css).toMatch(/\.hint\.limit\{position:static/);
  });
});
