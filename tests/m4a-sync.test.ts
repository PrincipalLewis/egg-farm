import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseEconomyCsv, buildBalance } from '../scripts/sync-economy';
import { balance } from '../src/config/balance';
import { hensCost, eggValueCost } from '../src/config/formulas';
// M4-A: product/economy.m4-candidate.csv (Head of Product 13:25, source of truth for M4 numbers), copied as a fixture.
// Its farm_cost / w4_tier_cost are the F1 piecewise table (f1/cost-segments, not on main), so the M4 columns
// (hens_cost..tc_*) are grafted onto the live data/economy.csv rows; the other columns are main's.
const full = parseEconomyCsv(readFileSync(new URL('./fixtures/economy.m4-candidate.csv', import.meta.url), 'utf8'));
const live = parseEconomyCsv(readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8'));
const cand = live.map((r, i) => { const o: Record<string, number> = { ...r }; for (const [k, v] of Object.entries(full[i])) if (!(k in r)) o[k] = v; return o; });
describe('sync-economy M4 columns', () => {
  const nb = buildBalance(cand, balance);
  it('fits Hens 36x1.30^H and Egg value 48x1.33^V, caps F+3, from the candidate CSV', () => {
    expect(nb.m4.hens).toEqual({ baseCost: 36, costGrowth: 1.3, capOverFarm: 3 });
    expect(nb.m4.eggValue).toEqual({ baseCost: 48, costGrowth: 1.33, capOverFarm: 3 });
  });
  it('every hens_cost / egg_value_cost cell is reproduced by the formulas', () => {
    for (const r of cand) { expect(hensCost(r.level, nb)).toBe(r.hens_cost); expect(eggValueCost(r.level, nb)).toBe(r.egg_value_cost); }
  });
  it('the hand-set m4 block matches what the candidate CSV generates (costs/caps)', () => {
    expect(balance.m4!.hens).toEqual(nb.m4.hens); expect(balance.m4!.eggValue).toEqual(nb.m4.eggValue);
  });
  it('keeps the flag and milestones (not CSV columns) and carries tc_* scalars', () => {
    expect(nb.m4.enabled).toBe(0); expect(nb.m4.milestones).toEqual(balance.m4!.milestones);
    expect(nb.m4.tc.streak_cap).toBe(0.4); expect(nb.m4.tc.frenzy_price_mult).toBe(2); expect(Object.keys(nb.m4.tc)).toHaveLength(23);
  });
  it('a pre-M4 CSV (no M4 columns) keeps the m4 block unchanged', () => {
    expect(buildBalance(live, balance).m4).toEqual(balance.m4);
  });
  it('fails loudly on an M4 cell no formula explains, a partial M4 column set, or a non-constant cap', () => {
    expect(() => buildBalance(cand.map(r => r.level === 12 ? { ...r, hens_cost: r.hens_cost + 1 } : r), balance)).toThrow(/hens_cost/);
    expect(() => buildBalance(cand.map(r => { const { egg_value_cost: _, ...o } = r as any; return o; }), balance)).toThrow(/missing M4 column egg_value_cost/);
    expect(() => buildBalance(cand.map(r => r.level === 4 ? { ...r, hens_cap_over_farm: 4 } : r), balance)).toThrow(/hens_cap_over_farm must be constant/);
  });
});
