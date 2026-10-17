import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { farmCost, validateCostGrowthSegments, type EconomyParams } from '../src/config/formulas';
import { validateBalance, balance as liveBalance } from '../src/config/balance';
import { rc1Balance as balance, RC1_CSV } from './rc1-balance'; // pure-pow rc1 table (this branch's CSV uses costOverrides)
import { parseEconomyCsv, buildBalance } from '../scripts/sync-economy';
const rows = parseEconomyCsv(readFileSync(RC1_CSV, 'utf8'));
const F1 = [{ from: 6, to: 14, growth: 1.25 }, { from: 15, to: 20, growth: 1.45 }];
const withSegs = (segs: any, p: any = balance): EconomyParams => ({ ...p, farm: { ...p.farm, costGrowthSegments: segs } });
const clone = () => JSON.parse(JSON.stringify(balance));

describe('F1 farm cost growth segments', () => {
  it('branch CSV (f1-m4cols): F1 segments + costOverrides only at F1-GAP L18-19 and M3 taper L23-29', () => {
    const live = parseEconomyCsv(readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8'));
    expect(Object.keys(liveBalance.farm.costOverrides ?? {}).map(Number)).toEqual([18, 19, 23, 24, 25, 26, 27, 28, 29]);
    for (const r of live) expect(farmCost(r.level, liveBalance), `L${r.level}`).toBe(r.farm_cost);
  });
  it('segments off: farm costs match economy.csv', () => {
    expect(balance.farm.costGrowthSegments).toBeUndefined();
    expect(rows.length).toBe(31);
    for (const r of rows) expect(farmCost(r.level, balance), `L${r.level}`).toBe(r.farm_cost);
  });
  it('empty segments array = old pure-pow values on every level', () => {
    for (let L = 0; L <= balance.maxLevel; L++) expect(farmCost(L, withSegs([]))).toBe(Math.floor(balance.farm.baseCost * balance.farm.costGrowth ** L));
  });
  it('segment boundaries: growth applies to the step INTO from..to, default growth outside', () => {
    const p = withSegs(F1);
    for (let L = 0; L <= 5; L++) expect(farmCost(L, p)).toBe(farmCost(L, balance));
    expect(farmCost(5, p)).toBe(448); expect(farmCost(6, p)).toBe(560); expect(farmCost(14, p)).toBe(3340);
    expect(farmCost(15, p)).toBe(4844); expect(farmCost(20, p)).toBe(31050); expect(farmCost(21, p)).toBe(41918);
    const one = withSegs([{ from: 3, to: 3, growth: 2 }]);
    expect(farmCost(3, one)).toBe(Math.floor(100 * 1.35 ** 2 * 2)); expect(farmCost(4, one)).toBe(Math.floor(100 * 2 * 1.35 ** 3));
  });
  it("matches every farm_cost in Economy's draft economy.f1.csv (all levels)", () => {
    const f1 = parseEconomyCsv(readFileSync(new URL('../../product/economy.f1.csv', import.meta.url), 'utf8'));
    // F1-GAP (Economy, after F1) lowered L18-19, so those two rows are no longer segment-shaped: read as costOverrides.
    for (const r of f1) if (r.level !== 18 && r.level !== 19) expect(farmCost(r.level, withSegs(F1)), `L${r.level}`).toBe(r.farm_cost);
    const nb = buildBalance(f1, balance, { farmCostGrowthSegments: F1 });
    expect([nb.farm.baseCost, nb.farm.costGrowth, nb.farm.costGrowthSegments]).toEqual([100, 1.35, F1]);
    expect(nb.farm.costOverrides).toEqual({ 18: 11076, 19: 18201 });
    for (const r of f1) expect(farmCost(r.level, nb), `L${r.level}`).toBe(r.farm_cost);
  });
  it('sync-economy: segments off reproduces balance.json byte-for-byte; wrong segments vs CSV fail loudly', () => {
    expect(JSON.stringify(buildBalance(rows, balance, { farmCostGrowthSegments: [] }))).toBe(JSON.stringify(buildBalance(rows, balance)));
    expect(() => buildBalance(rows, balance, { farmCostGrowthSegments: F1 })).toThrow(/segment 6-14/);
  });
  it('validation: overlap, from > to, growth <= 0, from < 1 rejected (formula + balance loading)', () => {
    const bad: [any, RegExp][] = [
      [[{ from: 6, to: 14, growth: 1.25 }, { from: 14, to: 20, growth: 1.45 }], /overlap/],
      [[{ from: 15, to: 20, growth: 1.45 }, { from: 6, to: 16, growth: 1.25 }], /overlap/],
      [[{ from: 9, to: 8, growth: 1.2 }], /from must be <= to/],
      [[{ from: 6, to: 8, growth: 0 }], /growth must be > 0/],
      [[{ from: 6, to: 8, growth: -1 }], /growth must be > 0/],
      [[{ from: 0, to: 2, growth: 1.2 }], /from must be >= 1/],
      [[{ from: 1.5, to: 2, growth: 1.2 }], /integers/],
      ['x', /array/],
    ];
    for (const [s, re] of bad) {
      expect(() => validateCostGrowthSegments(s)).toThrow(re);
      const b = clone(); b.farm.costGrowthSegments = s; expect(() => validateBalance(b, false)).toThrow(re);
    }
    const b = clone(); b.farm.costGrowthSegments = F1; expect(() => validateBalance(b, false)).not.toThrow();
    expect(() => validateCostGrowthSegments([{ from: 6, to: 14, growth: 1.25 }, { from: 15, to: 20, growth: 1.45 }])).not.toThrow();
  });
  it('big numbers: finite, integer, monotone at high levels; matches pow form', () => {
    const p: any = withSegs(F1, { ...balance, maxLevel: 500 });
    let prev = 0;
    for (let L = 0; L <= 500; L += 7) { const v = farmCost(L, p); expect(Number.isFinite(v) && Number.isInteger(v) && v >= prev).toBe(true); prev = v; }
    const L = 300, want = Math.floor(100 * 1.25 ** 9 * 1.45 ** 6 * 1.35 ** (L - 15));
    expect(farmCost(L, p) / want).toBeCloseTo(1, 12);
    expect(farmCost(600, p)).toBe(farmCost(500, p)); // clamped to maxLevel
  });
});
