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
import { headerRateText, rateView } from '../src/ui/s2-economy-ui';
describe('reviewer m2: header rate text comes from the real rateView path', () => {
  it('stopped -> "⚠ ▼ $0.00/s"; negative -> "⚠ ▼ −$0.03/s"; positive unchanged', () => {
    expect(headerRateText(rateView(0, { stopped: true }))).toBe('⚠ ▼ $0.00/s');
    expect(headerRateText(rateView(-3))).toBe('⚠ ▼ \u2212$0.03/s');
    expect(headerRateText(rateView(125))).toBe(rateView(125).text);
    expect(app).toContain('setText(rateEl, headerRateText(v))');
  });
});
describe('reviewer m1: workers-ui wage comes from ./rates, not the stub', () => {
  it('no wagePerSecCents import in workers-ui', () => {
    const w = readFileSync(new URL('../src/ui/workers-ui.ts', import.meta.url), 'utf8');
    expect(w).not.toMatch(/wagePerSecCents/); expect(w).toContain('listedWageCentsPerSec');
  });
});
