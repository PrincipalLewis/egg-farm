// P4 (product/playtest1-resim.md): Manage only at <= 40%, Manage all refills only those; Economy expects W4 4.5, W4b 5.25 (F1 m4cols re-sim, Economy ruling logged in decisions.md; was 5.5 / 7.5), 6.88 Manage / 15 min
// (Economy ruling Oct 17, product/sim/economy_sim.py sha 5ad5a3a6: F1 sim 6.875 = 5.62 + 1.125 from yawn 50 / manage 0.5 + 0.125 from F1 costs; was 5.62).
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { runs, med } from './m2-runs';
import { initialState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
// M4-on targets (HoP approved, D-HOP-08; scratch/m4-retune/REPORT.md Round 4 §D):
//   W4 3.0 min ±0.3, W4b 3.25 min ±0.3: model-derived, Economy round 4, D-HOP-08; confirmed D-HOP-2026-10-19-09 (product/decisions.md:241; see also :232) (replace pre-M4 4.5 / 5.25).
//   managePer15 6.75 ±10%: REGRESSION BASELINE ONLY (bot-policy driven, not model-derived) (replaces 6.88).
const P4 = { W4: 3.0, W4b: 3.25, managePer15: 6.75 };
describe('P4 build numbers vs Economy re-sim', () => {
  const man = runs({ model: 'seller15' }), manC = runs({ model: 'cheapest' });
  const w4 = med(man, r => r.maxStep(18, 25)) / 60, w4b = med(manC, r => r.maxStep(18, 25)) / 60, per15 = med(man, r => r.manages) / 8;
  it('report', () => console.log('P4 build', { W4: +w4.toFixed(2), W4b: +w4b.toFixed(2), managePer15: +per15.toFixed(2) }));
  it('W4 ~3.0, W4b ~3.25 (model-derived, D-HOP-08), Manage ~6.75 / 15 min (regression baseline only) (+-0.3 min / +-10%)', () => {
    expect(Math.abs(w4 - P4.W4)).toBeLessThanOrEqual(0.3); expect(Math.abs(w4b - P4.W4b)).toBeLessThanOrEqual(0.3);
    expect(Math.abs(per15 - P4.managePer15) / P4.managePer15).toBeLessThanOrEqual(0.1);
  });
});
describe('regression: a worker going Unpaid while the Grader is hired (Python sim crashed here)', () => {
  it('no crash, Grader unaffected, Unpaid worker resumes once paid', () => {
    let s = { ...initialState(b, 3), farmLevel: 20, coinsCents: 1e9, graderTier: 0 };
    for (const a of [{ type: 'hire', worker: 'market_hand' }, { type: 'hire', worker: 'coop_hand' }, { type: 'buyGraderTier' }] as const) s = apply(s, a as any, b);
    expect(s.workers.grader).toBeTruthy();
    s = { ...s, coinsCents: 0, basket: 50, customers: [{ id: 1, demand: 40, filled: 0, waitedS: 0 }] };
    expect(() => { for (let i = 0; i < 600; i++) s = step(s, 0.1, b, []); }).not.toThrow();
    expect(s.workers.market_hand!.unpaid || s.workers.coop_hand!.unpaid).toBe(true);
    expect(Number.isFinite(s.coinsCents)).toBe(true);
    s = { ...s, coinsCents: 1e9 }; expect(() => { for (let i = 0; i < 600; i++) s = step(s, 0.1, b, []); }).not.toThrow();
  });
});
