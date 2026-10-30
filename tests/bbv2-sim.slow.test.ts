// BBV2-AC9 / AC14 [B] seeds 1–200 (Card #12 4a154bb4 N3/N6). Run with `npm run test:slow` (lane H; one heavy sim at a time).
import { describe, it, expect } from 'vitest';
import { ac9, ac14, AC14_CONFIGS, seeds } from './bbv2-sim';
import { ON } from './bbv2-fixtures';
const S = seeds(1, 200);
describe('BBV2-AC9 seeds 1–200', () => {
  it('flag on: zero-gain buys below L30 = 0 (runBot band + runM2 workers)', () => {
    const r = ac9(ON, S); console.log(`AC9 seeds 1-200: ${r.zeroGainBelow30} zero-gain of ${r.buys} buys`);
    expect(r.perSeed).toEqual([]); expect(r.zeroGainBelow30).toBe(0);
  }, 1_800_000);
});
describe('BBV2-AC14 seeds 1–200 (DECISIVE first, then CONFIRMATORY ship)', () => {
  for (const [label, b] of Object.entries(AC14_CONFIGS)) it(label, () => {
    const r = ac14(b, S); console.log(`AC14 ${label} seeds 1-200: ${JSON.stringify(r)}`);
    expect(r.violations).toBe(0); expect(r.suppressedAffordableBelow30).toBe(0); expect(r.suppressedEvents).toBe(0);
  }, 3_600_000);
});
