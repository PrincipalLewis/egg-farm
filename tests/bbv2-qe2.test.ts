// BBV2-AC10 [B] Q-E2 collect fix (spec v1.0.3 27e753d8 §2.5; Econ 14:05): planner path only, flag on.
import { describe, it, expect } from 'vitest';
import { collectPerSec, incomePerSec, secondsToAffordSteady } from '../src/econ/income';
import { headerRate } from '../src/ui/s2-economy-ui';
import { applyOffline } from '../src/sim/offline';
import { eggsPerTap } from '../src/sim/state';
import { ON, OFF, fx, L17 } from './bbv2-fixtures';
import type { GameState } from '../src/sim/state';

const W = (energy: number, extra = {}) => ({ energy, cdS: 0, ...extra });
const moods: [string, Partial<GameState>][] = [
  ['no Coop Hand', {}], ['working', { workers: { coop_hand: W(100) } as any }], ['tired', { workers: { coop_hand: W(20) } as any }],
  ['asleep', { workers: { coop_hand: W(0) } as any }], ['unpaid', { workers: { coop_hand: W(80, { unpaid: true }) } as any }],
  ['all three', { workers: { market_hand: W(100), coop_hand: W(100), hawker: W(100) } as any }],
];
describe('BBV2-AC10 [B] Q-E2', () => {
  it('flag on, assumeWorking, Coop Hand hired: collect = eggs_per_tap[C] / coop_hand.every_s; no Coop Hand: eggs_per_tap[C]', () => {
    for (const C of [0, 5, 10, 14, 22, 29]) {
      const tap = eggsPerTap(C, ON);
      expect(collectPerSec(fx(17, 19, 18, C), ON, { assumeWorking: true })).toBe(tap);
      expect(collectPerSec(fx(17, 19, 18, C, moods[1][1]), ON, { assumeWorking: true })).toBe(tap / ON.workers.coop_hand.every_s);
      expect(collectPerSec(fx(17, 19, 18, C, moods[1][1]), OFF, { assumeWorking: true })).toBe(tap * 1.5); // flag off unchanged
    }
    expect(ON.workers.coop_hand.every_s).toBe(2);
  });
  it('spec probe FX-L17 C10: planner collect 82.5 -> 27.5 eggs/s (flag off -> on)', () => {
    const s = L17(0); expect(collectPerSec(s, OFF, { assumeWorking: true })).toBeCloseTo(82.5, 9); expect(collectPerSec(s, ON, { assumeWorking: true })).toBeCloseTo(27.5, 9);
  });
  it.each(moods)('live path byte-identical flag on vs off (%s): collectPerSec, incomePerSec, headerRate, secondsToAffordSteady', (_n, w) => {
    for (const C of [0, 10, 22]) for (const coins of [0, 5e5]) {
      const s = fx(17, 19, 18, C, { ...w, coinsCents: coins });
      expect(collectPerSec(s, ON)).toBe(collectPerSec(s, OFF)); expect(incomePerSec(s, ON)).toBe(incomePerSec(s, OFF));
      expect(headerRate(s, ON)).toEqual(headerRate(s, OFF));
      for (const need of [1e4, 1e6, 1e8]) expect(secondsToAffordSteady(s, ON, need)).toBe(secondsToAffordSteady(s, OFF, need));
    }
  });
  it('offline earnings identical flag on vs off (live model)', () => {
    for (const [, w] of moods) for (const away of [60e3, 3600e3, 8 * 3600e3]) {
      const s = fx(17, 19, 18, 10, { ...w, coinsCents: 1e5 });
      expect(JSON.stringify(applyOffline(s, away, ON))).toBe(JSON.stringify(applyOffline(s, away, OFF)));
    }
  });
});
