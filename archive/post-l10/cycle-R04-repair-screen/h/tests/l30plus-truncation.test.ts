// HoE (L30+ truncation, Saves M1): per-Farm-level arrays have farmMaxLevel+1 = 51 entries, the Hens/Egg value cost tables keep
// every CSV row (56) as pricing base, and the tracks keep their own max 55 (Leadership reversal of the Farm-max cap). Synthetic 56-row table built from the
// live CSV (rows 31-55 extend row 30), so this does not depend on the pending L30+ data.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseEconomyCsv, fitM4, farmMaxOf } from '../scripts/sync-economy';
import { balance as live, type Balance } from '../src/config/balance';
import { trackMaxLevel, hensCap, eggValueCap } from '../src/config/formulas';
const base = parseEconomyCsv(readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8'));
const R = [...base];
for (let L = R.length; L <= 55; L++) { const p = R[L - 1]; R.push({ ...p, level: L, hens_cost: Math.floor(p.hens_cost * 1.1) + 1, egg_value_cost: Math.floor(p.egg_value_cost * 1.1) + 1 }); }
R.forEach(r => { r.hens_cap_over_farm = r.level < 40 ? 3 : 5; r.egg_value_cap_over_farm = r.level < 40 ? 3 : 5; (r as any).hv_extra_cost_farm_share = 0.1; });
const cfg = { farmMaxLevel: 50, hvExtraSecondLevelMult: 1.1 };
const m4: any = fitM4(R, live, cfg)!;
const b = { ...live, maxLevel: farmMaxOf(R, cfg), m4: { ...m4, enabled: 1 } } as unknown as Balance;
describe('sync-economy L30+ truncation at farmMaxLevel', () => {
  it('56 rows, Farm max 50', () => { expect(R.length).toBe(56); expect(farmMaxOf(R, cfg)).toBe(50); });
  it('per-Farm-level arrays have exactly 51 entries', () => {
    expect(m4.hens.capOverFarmByFarm).toHaveLength(51); expect(m4.eggValue.capOverFarmByFarm).toHaveLength(51);
    expect(m4.extraCostFarmShareByFarm).toHaveLength(51);
  });
  it('Hens/Egg value cost tables keep all 56 rows', () => { expect(m4.hens.costs).toHaveLength(56); expect(m4.eggValue.costs).toHaveLength(56); });
  it('Leadership ruling: Farm max 50, tracks keep their own max 55 (cost rows 51-55 retained)', () => {
    expect(b.maxLevel).toBe(50); for (const t of ['hens', 'eggValue'] as const) expect(trackMaxLevel(t, b)).toBe(55);
    expect(hensCap(50, b)).toBe(55); expect(eggValueCap(50, b)).toBe(55);
  });
});
