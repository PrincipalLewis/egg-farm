import { describe, it, expect } from 'vitest';
import { balance, validateBalance, Balance } from '../src/config/balance';
import { runM2 } from './bot-m2';
import { median } from './bot';
// AC-W1 (m2-proposal §8 item 17): casual model = test-only Poisson arrivals + demand x0.75, sell every 20 s, tap 1/s,
// seller15 buy rule, managed, v1.1 values, 2 h runs, seeds 1-200 and 201-299 (one RNG stream per run, seeded by the integer seed).
// Refs: D-HOP-2026-10-19-09 (product/decisions.md:241), D-CEO-20261019-06 (decisions.md:57, IN FORCE per its 04:04 entry: >= 95% reach F10 within 16 min, inclusive, on seeds 1-200 and 201-299; median F18 <= 40 min), product/decisions.md:232.
// Old reference: product/sim/economy_sim.py run_m2(seller15, spec=M2_CURRENT, **CASUAL), seeds 0-99 (M2_CURRENT = M2_F1, 50 / 0.5, since sim 10f29a4a).
// M4-on reference (Economy round 4, D-HOP-08; scratch/m4-retune/REPORT.md Round 4 §C/§D): REGRESSION BASELINE ONLY; Python has no M4 model.
// Same code as the build, so this is not an independent check. pass10 here = count reaching F10 within 15 min (900 s).
// Replaces the Python F1 m4cols re-sim 100 / 10.33 / 21.33.
const PY = { pass10: 91, medF10: 13.67, medF18: 25.0 };
const casual: Balance = { ...balance, sim_test: { poisson_arrivals: true, demand_scale: 0.75 } };
describe('AC-W1 casual (seeds 1-200, 201-299, slow)', () => {
  it('hooks are off by default and rejected in production', () => {
    expect(balance.sim_test).toBeUndefined();
    expect(() => validateBalance(casual, true)).toThrow(/test-only/);
    expect(() => validateBalance(casual, false)).not.toThrow();
  });
  // Design gate (D-CEO-20261019-06, in force): >= 95 % of seeds reach F10 within 16 min (960 s), median F18 <= 40 min,
  // on seeds 1-200 and 201-299. Comparison inclusive (t <= limit), the same as the bot's reach times.
  // Run cap: runM2 runs T = 7200 s (tests/bot-m2.ts:25); there is no 900 s cut-off. Buys happen only at sell check-ins
  // (sellEvery 20 s), so reach times sit on a 20 s grid and 900 s = 45 x 20 s is a real check-in time, not a cap.
  const GATE_S = 960, GATE_PCT = 95, F18_MAX_MIN = 40;
  const measure = (seeds: number[]) => {
    const R = seeds.map(seed => runM2(casual, seed, { model: 'seller15', sellEvery: 20 }));
    const t10 = R.map(r => r.reach.get(10) ?? Infinity), t18 = R.map(r => r.reach.get(18) ?? Infinity);
    const pct = (lim: number) => 100 * t10.filter(t => t <= lim).length / seeds.length;
    return { pass10: pct(900), pass10at16: pct(960), pass10gate: pct(GATE_S), medF10: median(t10) / 60, medF18: median(t18) / 60, at900: t10.filter(t => t === 900).length };
  };
  const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  for (const [a, z] of [[1, 200], [201, 299]] as const) {
    it(`design gate seeds ${a}-${z}: >= ${GATE_PCT}% reach F10 within ${GATE_S / 60} min, F18 median <= ${F18_MAX_MIN} min; M4 baseline (1-200 only)`, () => {
      const m = measure(range(a, z));
      console.log(`AC-W1 build ${a}-${z}`, Object.fromEntries(Object.entries(m).map(([k, v]) => [k, +v.toFixed(2)])), 'M4 baseline', PY);
      if (a === 1) { // REGRESSION BASELINE ONLY; Python has no M4 model (pass10 baseline is measured at 900 s)
        expect(Math.abs(m.pass10 - PY.pass10)).toBeLessThanOrEqual(5);
        expect(Math.abs(m.medF10 / PY.medF10 - 1)).toBeLessThanOrEqual(0.2);
        expect(Math.abs(m.medF18 / PY.medF18 - 1)).toBeLessThanOrEqual(0.2);
      }
      expect(m.pass10gate).toBeGreaterThanOrEqual(GATE_PCT); expect(m.medF18).toBeLessThanOrEqual(F18_MAX_MIN);
    });
  }
}, 1_800_000);
