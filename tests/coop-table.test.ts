// D-HOP-10 (HoE): coop_capacity is per-row CSV data. sync-economy copies a non-linear column into farm.coopCapacityTable
// (rows 0..farmMaxLevel) and the game reads it; a linear column (b48be8a4) keeps the formula, byte-identical (test:flagoff).
// Also: Hens/Egg value track costs must rise strictly L0..L55 or sync fails loudly.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseEconomyCsv, buildBalance, fitM4, readEconomyConfig } from '../scripts/sync-economy';
import { balance as live } from '../src/config/balance';
import { coopCapacity } from '../src/config/formulas';
const csv = readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8');
const coop: number[] = JSON.parse(readFileSync(new URL('./fixtures/coop_capacity.625452d4.json', import.meta.url), 'utf8')).coop_capacity;
const cfg = readEconomyConfig();
describe('per-level coop capacity table', () => {
  it('live b48be8a4 (linear): no table, formula unchanged', () => {
    const b: any = buildBalance(parseEconomyCsv(csv), live, cfg);
    expect(b.farm.coopCapacityTable).toBeUndefined(); expect((live.farm as any).coopCapacityTable).toBeUndefined();
  });
  it('625452d4 coop rows 20..50 (non-linear jump at L32) on the 31-row table: copied verbatim and read by coopCapacity', () => {
    const R = parseEconomyCsv(csv); expect(coop).toHaveLength(56);
    const src = coop.slice(20, 20 + R.length); R.forEach(r => { r.coop_capacity = src[r.level]; });
    const b: any = buildBalance(R, live, cfg);
    expect(b.farm.coopCapacityTable).toEqual(src);
    for (let F = 0; F < R.length; F++) expect(coopCapacity(F, b)).toBe(src[F]);
  });
  it('coopCapacity reads a 51-entry table at L32-50 (625452d4: L32 = 2475, not the linear 1650)', () => {
    const b: any = { ...live, maxLevel: 50, farm: { ...live.farm, coopCapacityTable: coop.slice(0, 51) } };
    expect(coopCapacity(32, b)).toBe(2475); expect(coopCapacity(50, b)).toBe(coop[50]); expect(coopCapacity(60, b)).toBe(coop[50]);
  });
});
describe('track costs strictly rising L0..L55', () => {
  const R = parseEconomyCsv(csv);
  for (let L = R.length; L <= 55; L++) { const p = R[L - 1]; R.push({ ...p, level: L, hens_cost: p.hens_cost + 1, egg_value_cost: p.egg_value_cost + 1 }); }
  it('rising table passes, 56 cost rows', () => { const m: any = fitM4(R, live, { farmMaxLevel: 50 }); expect(m.hens.costs).toHaveLength(56); });
  for (const c of ['hens_cost', 'egg_value_cost']) for (const L of [31, 55]) it(`${c} drop at L${L} fails loudly`, () => {
    const bad = R.map(r => ({ ...r })); bad[L][c] = bad[L - 1][c];
    expect(() => fitM4(bad, live, { farmMaxLevel: 50 })).toThrow(new RegExp(`${c} must be positive integers, strictly rising \\(L${L}\\)`));
  });
});
