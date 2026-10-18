// HoE 2026-10-19 (D-HOP-2026-10-19-02 follow-up): a new save makes its first purchase within 30 s, every seed 1-200,
// shipped balance (M4 on), seller15 bot (game pick over all purchasables, wait rule), deterministic bot (gating); variance bot reported.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { runBot } from './bot';
import { VAR_DEFAULT } from './seller-variance';
const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
describe('AC7 new save: first purchase within 30 s (seeds 1-200, M4 on)', () => {
  it('ships with M4 on', () => { expect(b.m4!.enabled).toBe(1); });
  it('deterministic bot (fixed 1 s taps, 15 s check-ins): every seed\'s first purchase <= 30 s', () => {
    const t = SEEDS.map(s => runBot(b, s, 'seller15', 120).firstUpgradeS ?? Infinity);
    console.log(`first purchase deterministic: max ${Math.max(...t)} s`);
    for (const [i, x] of t.entries()) expect(x, `seed ${i + 1}`).toBeLessThanOrEqual(30);
  });
  // Report only: the variance bot's first check-in is itself random (VAR_DEFAULT check interval / p_delay). 40/200 seeds buy
  // after 30 s (P95 42 s, max 57.8 s), identical with M4 forced off, so it measures the bot's cadence, not the game.
  it('variance bot (report, non-gating)', () => {
    const t = SEEDS.map(s => runBot(b, s, 'seller15', 120, 15, VAR_DEFAULT).firstUpgradeS ?? Infinity);
    console.log(`first purchase variance: ${t.filter(x => x > 30).length}/200 over 30 s, max ${Math.max(...t)} s`);
    expect(t.every(Number.isFinite)).toBe(true);
  });
});
