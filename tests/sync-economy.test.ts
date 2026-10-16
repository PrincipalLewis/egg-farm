import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseEconomyCsv, buildBalance } from '../scripts/sync-economy';
import { balance } from '../src/config/balance';
const csv = readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8');const rows = parseEconomyCsv(csv);
describe('sync-economy (MK-15)', () => {
  it('balance.json is exactly what the CSV generates', () => { expect(buildBalance(rows, balance)).toEqual(balance); });
  it('a consistent CSV change (new cost curve) changes config without code changes', () => {
    const fc = (L: number) => Math.floor(200 * 1.4 ** L), tierFarm = [0, 18, 19, 21, 22, 24];
    const edited = rows.map(r => ({ ...r, farm_cost: fc(r.level), w4_tier_cost: r.w4_tier ? Math.floor(0.5 * fc(tierFarm[r.w4_tier])) : 0 }));
    const nb = buildBalance(edited, balance); expect(nb.farm.baseCost).toBe(200); expect(nb.farm.costGrowth).toBe(1.4);
  });
  it('fails loudly on a CSV cell no formula explains', () => {
    const edited = rows.map(r => r.level === 7 ? { ...r, hens: r.hens + 1 } : r);
    expect(() => buildBalance(edited, balance)).toThrow(/L7 hens/);
  });
  it('M2 v1.1 worker tunables come from the CSV', () => {
    const e = balance.workers.energy;
    expect([e.drain_s_per_pct, e.tired_below_pct, e.yawn_at_pct, e.manage_all_min_workers, e.unpaid_resume_wage_min]).toEqual([9, 30, 40, 3, 1]);
    expect(balance.workers.grader.asleep_bonus_share).toBe(0.15);
    const nb = buildBalance(rows.map(r => ({ ...r, drain_s_per_pct: 12, yawn_at_pct: 45 })), balance);
    expect(nb.workers.energy.drain_s_per_pct).toBe(12); expect(nb.workers.energy.yawn_at_pct).toBe(45);
  });
  it('fails loudly on inconsistent worker columns', () => {
    expect(() => buildBalance(rows.map(r => r.level === 5 ? { ...r, tired_below_pct: 50 } : r), balance)).toThrow(/tired_below_pct must be constant/);
    expect(() => buildBalance(rows.map(r => r.level === 10 ? { ...r, w1_wage_per_min: 9 } : r), balance)).toThrow(/L10 w1_wage_per_min/);
    expect(() => buildBalance(rows.map(r => r.level === 20 ? { ...r, w4_tier_cost: 1 } : r), balance)).toThrow(/L20 w4_tier_cost/);
    const { yawn_at_pct: _y, ...noYawn } = rows[0] as any;
    expect(() => buildBalance(rows.map(r => { const { yawn_at_pct: _, ...o } = r as any; return o; }), balance)).toThrow(/missing workers column yawn_at_pct/);
  });
  it('rejects malformed CSV', () => {
    expect(() => parseEconomyCsv(csv.replace(/^1,(\d+),/m, '1,abc,'))).toThrow(/not a number/);
    expect(() => parseEconomyCsv(csv.replace(/^1,(\d+),/m, '1,11.5,'))).toThrow(/integer/);
    expect(() => parseEconomyCsv(csv.replace(/^2,/m, '7,'))).toThrow(/level/);
  });
});
