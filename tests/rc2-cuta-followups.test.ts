import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const app = readFileSync(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');
describe('rc2 Cut A follow-ups', () => {
  it('Upgrades nav badge + asleep count live in .nav-ic, anchored top-right -6/-6', () => {
    expect(app).toMatch(/data-nav="upgrades"[^>]*><span class="nav-ic"><img[^>]*><span class="badge" hidden><\/span><\/span>/);
    expect(app).toContain("ensure(nav.querySelector('[data-nav=upgrades] .nav-ic'))");
    expect(css).toContain('nav [data-nav=upgrades] .nav-ic .badge{top:-6px;right:-6px}');
  });
});
