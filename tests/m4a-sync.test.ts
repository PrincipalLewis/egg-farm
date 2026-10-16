import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseEconomyCsv, buildBalance, graftM4 } from '../scripts/sync-economy';
import { balance } from '../src/config/balance';
import { hensCost, eggValueCost } from '../src/config/formulas';
// M4-A columns come from data/economy.m4-candidate.csv (vendored copy of product/economy.m4-candidate.csv) until
// Economy merges them into product/economy.csv (spec O1); only M4 columns are grafted, other columns stay economy.csv's.
const live = parseEconomyCsv(readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8'));
const m4 = parseEconomyCsv(readFileSync(new URL('../data/economy.m4-candidate.csv', import.meta.url), 'utf8'));
const cand = graftM4(live, m4);
describe('sync-economy M4 columns', () => {
  const nb = buildBalance(cand, balance);
  it('balance.json m4 block is exactly what the CSVs generate (flag kept off)', () => {
    expect(balance.m4).toEqual(nb.m4); expect(nb.m4.enabled).toBe(0);
  });
  it('graft keeps every non-M4 column from economy.csv', () => {
    cand.forEach((r, i) => { for (const k of Object.keys(live[i])) expect(r[k]).toBe(live[i][k]); });
    expect(cand[23].farm_cost).toBe(live[23].farm_cost);
  });
  it('every hens_cost / egg_value_cost cell is reproduced (incl. the M3 L23-29 taper)', () => {
    for (const r of m4) { expect(hensCost(r.level, nb)).toBe(r.hens_cost); expect(eggValueCost(r.level, nb)).toBe(r.egg_value_cost); }
    expect(eggValueCost(23, nb)).toBe(30484);
  });
  it('M1 milestones: coop + offline mult columns; grades; Balanced; price terms', () => {
    expect(nb.m4.milestones.hens).toEqual([10, 20, 30].map((level, i) => ({ level, coopMult: m4[0][`hens_ms${i + 1}_coop_mult`], offlineMult: m4[0][`hens_ms${i + 1}_offline_mult`] })));
    expect(nb.m4.milestones.grades[2]).toEqual({ level: m4[0].egg_grade3_level, mult: m4[0].egg_grade3_mult, minFarm: m4[0].egg_grade3_farm_gate });
    expect(nb.m4.milestones.balanced).toHaveLength(5);
    expect(nb.m4.eggValue.baseStep).toBe(m4[0].egg_value_base_step); expect(nb.m4.eggValue.levelBonus).toBe(m4[0].egg_value_level_bonus);
  });
  it('a pre-M4 CSV with no overlay produces no m4 block', () => { expect(buildBalance(live, balance).m4).toBeUndefined(); });
  it('fails loudly on non-rising costs, a missing column, or a non-constant scalar', () => {
    expect(() => buildBalance(cand.map(r => r.level === 12 ? { ...r, hens_cost: 1 } : r), balance)).toThrow(/hens_cost/);
    expect(() => buildBalance(cand.map(r => { const { egg_value_level_bonus: _, ...o } = r as any; return o; }), balance)).toThrow(/egg_value_level_bonus/);
    expect(() => buildBalance(cand.map(r => r.level === 3 ? { ...r, balanced2_mult: 9 } : r), balance)).toThrow(/balanced2_mult must be constant/);
  });
});
