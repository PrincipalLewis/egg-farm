// HoQA qa/reports/ac7-twobot-528f1a7.md: tests/bot.ts logged `s.farmLevel + 1` from a stale state, so the 2nd of two Farm
// levels bought in one check-in was lost (buys[].farm, farmReachedS, farmAt -> pacing.test.ts). The level must be read after the buy.
import { describe, it, expect } from 'vitest';
import { balance } from '../src/config/balance';
import { runBot } from './bot';
describe('AC7 bot logs every Farm level bought in one check-in', () => {
  it('two Farm buys at the first check-in (15 s): levels 1 and 2 both recorded at t = 15', () => {
    // Crafted balance: flag off, Farm L0->1 and L1->2 cost $1 each, the rest unaffordable, so the first check-in buys exactly 2.
    const b = structuredClone(balance); b.m4 = { ...b.m4!, enabled: 0 };
    b.farm.costTable = b.farm.costTable!.map((v: number, L: number) => L < 2 ? 1 : 1e12);
    const r = runBot(b, 1, 'seller15', 20);
    expect(r.reach.get(1)).toBe(15); expect(r.reach.get(2)).toBe(15);
    expect(r.farmReachedS(2)).toBe(15); expect(r.farmAt(15)).toBe(2);
  });
});
