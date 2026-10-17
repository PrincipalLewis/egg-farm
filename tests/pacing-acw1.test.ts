import { describe, it, expect } from 'vitest';
import { balance, validateBalance, Balance } from '../src/config/balance';
import { runM2 } from './bot-m2';
import { median } from './bot';
// AC-W1 (m2-proposal §8 item 17): casual model = test-only Poisson arrivals + demand x0.75, sell every 20 s, tap 1/s,
// seller15 buy rule, managed, v1.1 values, 2 h runs, seeds 0-99 (one RNG stream per run, seeded by the integer seed).
// Reference: product/sim/economy_sim.py run_m2(seller15, spec=M2_CURRENT, **CASUAL), seeds 0-99 (M2_CURRENT = M2_F1, 50 / 0.5, since sim 10f29a4a; wage-aligned min wait since 0ee6433c).
const PY = { pass10: 100, medF10: 10.33, medF18: 21.33 }; // F1 m4cols Python re-sim (Economy ruling, decisions.md); was 98 / 12.33 / 30.67
const casual: Balance = { ...balance, sim_test: { poisson_arrivals: true, demand_scale: 0.75 } };
describe('AC-W1 casual (100 seeds, slow)', () => {
  it('hooks are off by default and rejected in production', () => {
    expect(balance.sim_test).toBeUndefined();
    expect(() => validateBalance(casual, true)).toThrow(/test-only/);
    expect(() => validateBalance(casual, false)).not.toThrow();
  });
  it('>= 95% reach F10 within 15 min, F18 median <= 40 min, parity with Python (±20% medians, ±5 pts pass rate)', () => {
    const R = Array.from({ length: 100 }, (_, seed) => runM2(casual, seed, { model: 'seller15', sellEvery: 20 }));
    const t10 = R.map(r => r.reach.get(10) ?? Infinity), t18 = R.map(r => r.reach.get(18) ?? Infinity);
    const pass10 = t10.filter(t => t <= 900).length, m10 = median(t10) / 60, m18 = median(t18) / 60;
    console.log('AC-W1 build', { pass10, medF10: +m10.toFixed(2), medF18: +m18.toFixed(2) }, 'python', PY);
    expect(pass10).toBeGreaterThanOrEqual(95); expect(m18).toBeLessThanOrEqual(40);
    // parity: a miss here (with thresholds met) is a sim/build bug, not an AC-W1 fail
    expect(Math.abs(pass10 - PY.pass10)).toBeLessThanOrEqual(5);
    expect(Math.abs(m10 / PY.medF10 - 1)).toBeLessThanOrEqual(0.2);
    expect(Math.abs(m18 / PY.medF18 - 1)).toBeLessThanOrEqual(0.2);
  });
}, 600_000);
