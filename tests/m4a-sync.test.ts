import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseEconomyCsv, buildBalance } from '../scripts/sync-economy';
import { balance } from '../src/config/balance';
import { hensCost, eggValueCost } from '../src/config/formulas';
import * as S from '../src/sim/state';
import { isM4Col, readEconomyConfig } from '../scripts/sync-economy';
// M4-A columns come from data/economy.m4-candidate.csv (vendored copy of product/economy.m4-candidate.csv) until
// Economy merges them into product/economy.csv (spec O1); only M4 columns are grafted, other columns stay economy.csv's.
const live = parseEconomyCsv(readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8'));
const m4 = live, cand = live; // M4 columns now in economy.csv (Economy's f1-m4cols merge, this branch)
describe('sync-economy M4 columns', () => {
  const nb = buildBalance(cand, balance, readEconomyConfig()); // #17: farmCostFromCsv (costTable)
  it('balance.json m4 block is exactly what the CSVs generate (flag kept off)', () => {
    expect(balance.m4).toEqual(nb.m4); expect(nb.m4.enabled).toBe(0);
  });
  it('farm_cost is reproduced per level from the CSV (#17 costTable, verbatim)', () => {
    for (const r of live) expect(S.farmCost(r.level, balance)).toBe(r.farm_cost);
    expect(S.farmCost(23, balance)).toBe(68756); expect(S.farmCost(24, balance)).toBe(72194);
  });
  it('Grader tier costs are the CSV value of each tier\'s first row (T5 51,567, not re-linked)', () => {
    expect(balance.workers.grader.tiers.map((t: any) => t.cost)).toEqual([5538, 9100, 20330, 28294, 51567]);
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
  it('a CSV with no M4 columns produces no m4 block', () => { const pre = live.map(r => Object.fromEntries(Object.entries(r).filter(([k]) => !isM4Col(k)))); expect(buildBalance(pre, balance, readEconomyConfig()).m4).toBeUndefined(); });
  it('fails loudly on non-rising costs, a missing column, or a non-constant scalar', () => {
    expect(() => buildBalance(cand.map(r => r.level === 12 ? { ...r, hens_cost: 1 } : r), balance, readEconomyConfig())).toThrow(/hens_cost/);
    expect(() => buildBalance(cand.map(r => { const { egg_value_level_bonus: _, ...o } = r as any; return o; }), balance, readEconomyConfig())).toThrow(/egg_value_level_bonus/);
    expect(() => buildBalance(cand.map(r => r.level === 3 ? { ...r, balanced2_mult: 9 } : r), balance, readEconomyConfig())).toThrow(/balanced2_mult must be constant/);
  });
});
