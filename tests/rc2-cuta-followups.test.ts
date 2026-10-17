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
    expect(headerRateText(rateView(-125))).toMatch(/^⚠ ▼ /); expect(headerRateText(rateView(-125))).not.toMatch(/⚠ ▼ ⚠/);
  });
});
import { workersHtml } from '../src/ui/workers-ui';
import { listedWageCentsPerSec } from '../src/ui/rates';
import { fmtExactRate } from '../src/ui/s2-economy-ui';
import { balance as b } from '../src/config/balance';
import { initialState } from '../src/sim/state';
describe('reviewer m1: worker card wage is the exact listed rate (./rates)', () => {
  for (const [id, F] of [['market_hand', 3], ['market_hand', 12], ['coop_hand', 30]] as const) it(`${id} at Farm L${F}: card shows the exact listed wage`, () => {
    const s = { ...initialState(b, 3), farmLevel: F, workers: { [id]: { energy: 100, cdS: 0 } } } as any;
    const want = `Wage ${fmtExactRate(listedWageCentsPerSec(id, s, b))}`;
    expect(workersHtml(s, b)).toContain(want);
  });
});
