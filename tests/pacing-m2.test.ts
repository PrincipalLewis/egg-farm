import { describe, it, expect } from 'vitest';
import { runs, med, min } from './m2-runs';
// AC-W2 / AC-W4 / AC-W4b (m2-proposal v1.0 §8) on the real sim with the run_m2 bots.
const none = runs({ model: 'seller15', use: [] }), man = runs({ model: 'seller15' }), manC = runs({ model: 'cheapest' });
describe('M2 pacing: managed workers', () => {
  it('report', () => console.log('M2 seller15', { none: [min(none, 10), min(none, 18), min(none, 25)], managed: [min(man, 10), min(man, 18), min(man, 25)],
    step: med(man, r => r.maxStep(18, 25)) / 60, cheapestStep: med(manC, r => r.maxStep(18, 25)) / 60, managesPer10min: med(man, r => r.manages) / 12 }));
  it('AC-W2: seller15 managed at most +1 min slower than M1 at F10 and F18', () => {
    for (const L of [10, 18]) expect(min(man, L) - min(none, L)).toBeLessThanOrEqual(1 + 1e-9);
  });
  it('AC-W4: seller15 managed steps F18->F25 <= 6 min, F25 <= 70 min', () => {
    expect(med(man, r => r.maxStep(18, 25)) / 60).toBeLessThanOrEqual(6 + 1e-9); expect(min(man, 25)).toBeLessThanOrEqual(70);
  });
  it('AC-W4b (soft, non-gating): cheapest managed steps F18->F25 <= 8 min', () => {
    const s = med(manC, r => r.maxStep(18, 25)) / 60;
    if (s > 8) console.warn(`AC-W4b SOFT FAIL: cheapest worst step ${s} min > 8`); else console.log(`AC-W4b soft pass: ${s} min`);
  });
}, 300_000);
