// M4.1 patch 1 (3/4): sales-stopped-spec §4.2 live-income fix (D-HOP-2026-10-24-13/-14). A hired Market Hand that is Asleep or
// Unpaid sells nothing on the LIVE path; the planner path (assumeWorking: best-buy, goal-label %, ★ pick) is untouched.
// "Before" values: tests/fixtures/m41-p1/income-before.json, written at 2302778 (pre-fix) by scripts/m41-p1-income-states.ts --write.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { incomePerSec, demandPerSec, wagesPerSec, salesStopped, marketHandStalled, secondsToAffordSteady } from '../src/econ/income';
import { headerRate, headerRateText } from '../src/ui/s2-economy-ui';
import { STATES, build, planner, live } from '../scripts/m41-p1-income-states';
const before = JSON.parse(readFileSync(new URL('./fixtures/m41-p1/income-before.json', import.meta.url), 'utf8')) as Record<string, ReturnType<typeof planner> & ReturnType<typeof live>>;
const stalled = (n: string) => / MH (asleep|unpaid)/.test(n) && !/paused/.test(n);

describe('§4.2 planner path unchanged (best-buy, goal label, assumeWorking income) vs before', () => {
  it('fixture covers the same states', () => { expect(Object.keys(before).sort()).toEqual(Object.keys(STATES).sort()); expect(Object.keys(before).length).toBeGreaterThanOrEqual(10); });
  for (const n of Object.keys(STATES)) it(`planner identical: ${n}`, () => {
    const p = planner(build(STATES[n]));
    const { income_live: _a, demand_live: _b, eta_1000: _c, ...want } = before[n];
    expect(JSON.parse(JSON.stringify(p))).toEqual(want); // pick, options, every optionGain, goal-label % and text, income/demand with assumeWorking
  });
});

describe('§4.2 live path: Market Hand asleep / unpaid -> no sales; everything else unchanged', () => {
  for (const n of Object.keys(STATES)) it(`live: ${n}`, () => {
    const s = build(STATES[n]), l = live(s);
    if (stalled(n)) {
      expect(marketHandStalled(s, b)).toBe(true);
      expect(l.demand_live).toBe(0);
      expect(l.income_live).toBeCloseTo(-wagesPerSec(s, b), 5); // gross sales 0, wages of awake wage-payers only
      expect(l.income_live!).toBeLessThanOrEqual(0);
      expect(salesStopped(s, b)).toBe(true);
      expect(l.eta_1000).toBeNull(); // secondsToAffordSteady reads "—" (income <= 0)
      expect(before[n].income_live!).toBeGreaterThan(0); // the bug: before the fix the live rate was positive
    } else {
      expect(marketHandStalled(s, b)).toBe(false);
      expect(l).toEqual({ income_live: before[n].income_live, demand_live: before[n].demand_live, eta_1000: before[n].eta_1000 });
    }
  });
  it('HUD rate (headerRate, the app.ts path) is <= 0, red ⚠ ▼, aria "stopped" with Market Hand asleep and with it unpaid', () => {
    for (const n of ['F6 MH asleep', 'F6 MH unpaid', 'F12 MH asleep + CH/Hawker', 'F25 H20 V15 MH unpaid']) {
      const v = headerRate(build(STATES[n]), b);
      expect(v.sign, n).toBe('neg'); expect(headerRateText(v), n).toMatch(/^⚠ ▼ /); expect(v.aria, n).toMatch(/stopped$/);
    }
    // only MH off, nothing else paid: exactly $0.00/s
    expect(headerRateText(headerRate(build(STATES['F6 MH asleep']), b))).toBe('⚠ ▼ $0.00/s');
    // CH awake pays its wage while MH sleeps: a real negative rate
    expect(headerRate(build(STATES['F12 MH asleep + CH/Hawker']), b).text).toMatch(/^⚠ \u2212\$\d+\.\d\d\/s$/);
  });
  it('Paused Market Hand (m5 pause flag, any energy) is unchanged: player sells by hand', () => {
    const p = build(STATES['F6 MH paused asleep']);
    expect(marketHandStalled(p, b)).toBe(false);
    expect(incomePerSec(p, b)).toBeCloseTo(before['F6 MH paused asleep'].income_live!, 6);
    expect(incomePerSec(p, b)).toBeGreaterThan(0);
    expect(headerRate(p, b).sign).toBe('pos');
  });
  it('Tired / Working / not hired: demand identical to the old formula; assumeWorking never zeroes', () => {
    for (const n of ['F1 no MH', 'F6 MH working', 'F6 MH tired']) expect(demandPerSec(build(STATES[n]), b)).toBeCloseTo(before[n].demand_live!, 6);
    for (const n of Object.keys(STATES)) expect(demandPerSec(build(STATES[n]), b, { assumeWorking: true })).toBeGreaterThan(0);
  });
  it('waking the Market Hand restores the old positive rate (Refill / resume)', () => {
    const s = build(STATES['F6 MH asleep']), w = { ...s, workers: { market_hand: { energy: 100, cdS: 0 } } };
    expect(incomePerSec(w, b)).toBeCloseTo(before['F6 MH working'].income_live!, 6);
    expect(secondsToAffordSteady(w, b, 100_000)).not.toBeNull();
  });
});
