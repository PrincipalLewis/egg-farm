// M1 flip prerequisite: BR-R5 hatchCostCents isolates Q-E2 (D-ECON-20261105-M1-QE2-HATCH (a); HoP/PMC).
// planRef / hatch quote / charged coins identical bb0 vs bb1; assumeWorking kept; planner Q-E2 untouched (BB-AC10).
import { describe, it, expect } from 'vitest';
import { bal, fx } from './bbv2-fixtures';
import { hatchCostCents, startHatch } from '../src/sim/breeds-hatch';
import { collectPerSec, incomePerSec } from '../src/econ/income';
import { eggsPerTap, type GameState } from '../src/sim/state';
import type { BreedsSave } from '../src/sim/breeds';

const W = { energy: 100, cdS: 0 };
/** breeds-on + Market Hand + Coop Hand + Hawker; bestBuyV2 0|1. */
const br = (bestBuyV2: 0 | 1) => {
  const b = bal(bestBuyV2);
  return { ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, breeds: 1, bestBuyV2 } } } as typeof b;
};
const BB0 = br(0), BB1 = br(1);
const fresh = (o: Partial<BreedsSave> = {}): BreedsSave => ({
  owned: {}, slots: [null, null, null], incubator: null, settleMs: [0, 0, 0], hatches: 0, pity: 0, rng: 0x9e3779b9,
  freeHatchUsed: 1, flockCompleteLogged: 0, ...o,
});
/** Collect-binding farm/collection pairs (Architect M1 probe e.g. F22 C5) + workers. */
const states = (): GameState[] => {
  const workers = { market_hand: W, coop_hand: W, hawker: W } as GameState['workers'];
  const pairs = [[10, 5], [14, 5], [17, 5], [17, 10], [22, 5], [22, 10], [22, 14], [28, 10]];
  return pairs.map(([F, C]) => fx(F, Math.min(F, 20), Math.min(F, 18), C, { workers, graderTier: 0, breeds: fresh(), coinsCents: 1e12 } as any));
};

describe('M1 BR-R5 hatchCostCents bestBuyV2-invariant (Q-E2 isolated)', () => {
  it('collect-binding + workers: hatchCostCents(bb0) === hatchCostCents(bb1); planRef ignores Q-E2', () => {
    for (const s of states()) {
      expect(hatchCostCents(s, BB0)).toBe(hatchCostCents(s, BB1));
      const plan0 = Math.round(incomePerSec(s, BB0, { assumeWorking: true, ignoreQE2: true }) * 100);
      const plan1 = Math.round(incomePerSec(s, BB1, { assumeWorking: true, ignoreQE2: true }) * 100);
      expect(plan1).toBe(plan0);
      // Pre-Q-E2 bb0 baseline equals hatch planRef under bb1
      expect(plan1).toBe(Math.round(incomePerSec(s, BB0, { assumeWorking: true }) * 100));
      // Planner Q-E2 still applies without ignoreQE2 (BB-AC10; no regression)
      const tap = eggsPerTap(s.collectionLevel, BB1);
      expect(collectPerSec(s, BB1, { assumeWorking: true })).toBe(tap / BB1.workers.coop_hand.every_s);
      expect(collectPerSec(s, BB1, { assumeWorking: true, ignoreQE2: true })).toBe(tap * 1.5);
    }
  });
  it('startHatch charged coins identical bb0 vs bb1 when not free', () => {
    for (const s0 of states()) {
      const cost = hatchCostCents(s0, BB0);
      expect(cost).toBeGreaterThan(0);
      const s = { ...s0, coinsCents: cost + 50_000 };
      const a = startHatch(s, BB0), z = startHatch(s, BB1);
      expect(a.coinsCents).toBe(s.coinsCents - cost);
      expect(z.coinsCents).toBe(a.coinsCents);
      expect(a.breeds!.incubator!.costCents).toBe(cost);
      expect(z.breeds!.incubator!.costCents).toBe(cost);
    }
  });
});
