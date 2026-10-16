import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { farmCost, validateCostGrowthSegments, type EconomyParams } from '../src/config/formulas';
import { balance, validateBalance } from '../src/config/balance';
import { parseEconomyCsv, buildBalance } from '../scripts/sync-economy';
const rows = parseEconomyCsv(readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8'));
const F1 = [{ from: 6, to: 14, growth: 1.25 }, { from: 15, to: 20, growth: 1.45 }];
const withSegs = (segs: any, p: any = balance): EconomyParams => ({ ...p, farm: { ...p.farm, costGrowthSegments: segs } });
const clone = () => JSON.parse(JSON.stringify(balance));

describe('F1 farm cost growth segments', () => {
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
    // Economy's draft lives outside the repo; try env override, in-repo copy, then the sibling product/ dir.
    const cands = [process.env.ECONOMY_F1_CSV, new URL('../product/economy.f1.csv', import.meta.url), new URL('../../product/economy.f1.csv', import.meta.url)].filter(Boolean) as (string | URL)[];
    const src = cands.find(c => existsSync(c));
    if (!src) throw new Error(`economy.f1.csv not found; set ECONOMY_F1_CSV (tried ${cands.map(String).join(', ')})`);
    const f1 = parseEconomyCsv(readFileSync(src, 'utf8'));
    // Approved F1-GAP cuts on top of the x1.45 L15-20 segment (decisions.md:157; product/f1-proposal.md:250):
    // row 18 = x0.75 and row 19 = x0.85 of the segment value, floored (w4_tier_cost follows: 5538, 9100).
    const F1_GAP: Record<number, number> = { 18: 0.75, 19: 0.85 };
    const expected = (L: number) => { const v = farmCost(L, withSegs(F1)); return F1_GAP[L] ? Math.floor(v * F1_GAP[L]) : v; };
    for (const r of f1) expect(r.farm_cost, `L${r.level}`).toBe(expected(r.level));
    expect([expected(18), expected(19)]).toEqual([11076, 18201]);
    expect(f1.find(r => r.level === 18)?.w4_tier_cost).toBe(5538); expect(f1.find(r => r.level === 19)?.w4_tier_cost).toBe(9100);
    const lv = [...f1].sort((a, b) => a.level - b.level);
    for (let i = 1; i < lv.length; i++) expect(lv[i].farm_cost, `L${lv[i].level} strictly increasing`).toBeGreaterThan(lv[i - 1].farm_cost);
    // sync-economy/farmCost have no per-level override yet, so fit on the CSV with the F1-GAP rows restored to
    // pure segment values. The F1 PR must add override support before balance.json can carry the cuts.
    const share = balance.workers.grader.tier_cost_share_of_farm_cost, seg = (L: number) => farmCost(L, withSegs(F1));
    const w4Fix = new Map(Object.keys(F1_GAP).map(Number).map(L => [Math.floor(share * expected(L)), Math.floor(share * seg(L))]));
    const unGapped = f1.map(r => ({ ...r, farm_cost: F1_GAP[r.level] ? seg(r.level) : r.farm_cost, w4_tier_cost: w4Fix.get(r.w4_tier_cost) ?? r.w4_tier_cost }));
    expect(() => buildBalance(f1, balance, { farmCostGrowthSegments: F1 })).toThrow(/farm/);
    const nb = buildBalance(unGapped, balance, { farmCostGrowthSegments: F1 });
    expect([nb.farm.baseCost, nb.farm.costGrowth, nb.farm.costGrowthSegments]).toEqual([100, 1.35, F1]);
  });
  it('sync-economy: segments off reproduces balance.json byte-for-byte; wrong segments vs CSV fail loudly', () => {
    expect(JSON.stringify(buildBalance(rows, balance, { farmCostGrowthSegments: [] }))).toBe(JSON.stringify(buildBalance(rows, balance)));
    expect(() => buildBalance(rows, balance, { farmCostGrowthSegments: F1 })).toThrow(/farm/);
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
