// M4.1 patch 1: AC-R7 (rc1-asleep-state-spec v1.0.7) - when a worker falls asleep, the HUD, the card and the ETA all read the SAME value
// (incomePerSec, the one shared selector; addendum: no separate or cached figures).
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { mood } from '../src/sim/workers';
import { incomePerSec, collectPerSec, grossSalesPerSec, secondsToAffordSteady } from '../src/econ/income';
import { headerRate, rateMoney } from '../src/ui/s2-economy-ui';
import { workerBanner } from '../src/ui/workers-ui';
const st = (workers: object): any => ({ ...initialState(b, 1), farmLevel: 12, collectionLevel: 9, coinsCents: 1e6, workers });
const awake = { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 } };
describe('AC-R7: HUD, card and ETA share one value', () => {
  for (const [name, off] of [['Market Hand', 'market_hand'], ['Coop Hand', 'coop_hand']] as const) it(`${name} falls asleep`, () => {
    const s0 = st(awake), s1 = st({ ...awake, [off]: { energy: 0, cdS: 0 } });
    for (const s of [s0, s1]) {
      const r = incomePerSec(s, b), v = headerRate(s, b);
      expect(v.money).toBe(rateMoney(Math.abs(r * 100))); // HUD = selector
      const eta = secondsToAffordSteady(s, b, 1_000_000);
      if (r <= 0) expect(eta).toBeNull(); else expect(eta).toBeCloseTo(1_000_000 / 100 / r, 6); // ETA = selector
    }
    // the worker's own contribution is gone (AC-R2); net may still rise when its wage stops and sales were not collection-bound
    if (off === 'market_hand') expect(grossSalesPerSec(s1, b)).toBeLessThan(grossSalesPerSec(s0, b)); else expect(collectPerSec(s1, b)).toBeLessThan(collectPerSec(s0, b));
    expect(workerBanner(off, mood(s1.workers[off], b), b)).not.toBeNull(); expect(workerBanner(off, mood(s0.workers[off], b), b)).toBeNull(); // card
  });
});
