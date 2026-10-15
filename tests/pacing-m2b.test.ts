import { describe, it, expect } from 'vitest';
import { runs, min, SLOW, med } from './m2-runs';
// AC-W3 (unmanaged never worse than no workers) and AC-W6 (slow tapper Coop Hand value).
const none = runs({ model: 'seller15', use: [] }), un = runs({ model: 'seller15', manage: 'unmanaged' });
const noneC = runs({ model: 'cheapest', use: [] }), unC = runs({ model: 'cheapest', manage: 'unmanaged' });
const slow = runs({ model: 'seller15', ...SLOW }), slowNoCH = runs({ model: 'seller15', ...SLOW, use: ['market_hand', 'hawker', 'grader'] });
describe('M2 pacing: unmanaged + slow tapper', () => {
  it('AC-W3: unmanaged F25 faster than no workers (seller15, cheapest); F10/F18 within +0.8 min hire cost', () => {
    expect(min(un, 25)).toBeLessThan(min(none, 25)); expect(min(unC, 25)).toBeLessThan(min(noneC, 25));
    for (const L of [10, 18]) { expect(min(un, L) - min(none, L)).toBeLessThanOrEqual(0.8 + 1e-9); expect(min(unC, L) - min(noneC, L)).toBeLessThanOrEqual(0.8 + 1e-9); }
  });
  it('AC-W6: slow tapper with Coop Hand beats no Coop Hand by >= 4 min at F18 and >= 15% F21 income', () => {
    expect(min(slowNoCH, 18) - min(slow, 18)).toBeGreaterThanOrEqual(4);
    expect(med(slow, r => r.incomeAt(21)) / med(slowNoCH, r => r.incomeAt(21))).toBeGreaterThanOrEqual(1.15);
  });
  it.todo('AC-W1 casual (Poisson arrivals, demand x0.75, sell every 20 s): needs sim-only arrival/demand hooks, see m2-questions Q7');
}, 300_000);
