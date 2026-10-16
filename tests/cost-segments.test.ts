import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { farmCost, validateCostGrowthSegments, validateCostLevelMultipliers, type EconomyParams } from '../src/config/formulas';
import { graderTierCostCents } from '../src/sim/workers';
import { balance, validateBalance } from '../src/config/balance';
import { parseEconomyCsv, buildBalance } from '../scripts/sync-economy';
const rows = parseEconomyCsv(readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8'));
/** sha256 of product/economy.f1.csv (Economy's F1 + F1-GAP table), vendored as data/economy.f1.csv. */
const F1_CSV_SHA256 = 'e4847fe4882afbf0aef20fc50bbecb4ce78b7e678413dd63e9cd27d99680d129';
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
    // Vendored copy of Economy's product/economy.f1.csv, pinned by sha256 (verified against the product file when the studio workspace is present).
    const vendored = new URL('../data/economy.f1.csv', import.meta.url), prod = new URL('../../product/economy.f1.csv', import.meta.url);
    const sha = (u: URL) => createHash('sha256').update(readFileSync(u)).digest('hex');
    expect(sha(vendored)).toBe(F1_CSV_SHA256);
    if (existsSync(prod)) expect(sha(prod), 'data/economy.f1.csv must equal product/economy.f1.csv').toBe(sha(vendored));
    const src = vendored;
    const f1 = parseEconomyCsv(readFileSync(src, 'utf8'));
    expect(f1.length).toBe(31);
    // Approved F1-GAP cuts on top of the x1.45 L15-20 segment (decisions.md:157; product/f1-proposal.md:250):
    // row 18 = x0.75 and row 19 = x0.85 of the segment value, floored (w4_tier_cost follows: 5538, 9100).
    const F1_GAP: Record<number, number> = { 18: 0.75, 19: 0.85 };
    const expected = (L: number) => { const v = farmCost(L, withSegs(F1)); return F1_GAP[L] ? Math.floor(v * F1_GAP[L]) : v; };
    const seg = (L: number) => farmCost(L, withSegs(F1));
    for (const r of f1) expect(r.farm_cost, `L${r.level}`).toBe(expected(r.level));
    expect([expected(18), expected(19)]).toEqual([11076, 18201]);
    expect(f1.find(r => r.level === 18)?.w4_tier_cost).toBe(5538); expect(f1.find(r => r.level === 19)?.w4_tier_cost).toBe(9100);
    const lv = [...f1].sort((a, b) => a.level - b.level);
    for (let i = 1; i < lv.length; i++) expect(lv[i].farm_cost, `L${lv[i].level} strictly increasing`).toBeGreaterThan(lv[i - 1].farm_cost);
    // F1-GAP as config multipliers (data/economy-config.json shape): buildBalance fits the real CSV unmodified,
    // balance.json carries the multipliers, and farmCost + the Grader (w4) tier cost honour them.
    const mults = Object.entries(F1_GAP).map(([level, mult]) => ({ level: Number(level), mult }));
    const cfg = { farmCostGrowthSegments: F1, farmCostLevelMultipliers: mults };
    // KNOWN DATA BUG in economy.f1.csv (reported to Economy, not fudged in code): row 20 is still tier 2 (tier farm L19),
    // so w4_tier_cost must repeat L19's 9100, but the CSV still has 10707 = 0.5 x the pre-GAP L19 cost 21414 (f1-proposal.md:250).
    // That is the ONLY cell the raw CSV fails on; drop this patch once Economy ships the corrected row.
    expect(() => buildBalance(f1, balance, cfg)).toThrow('economy.csv L20 w4_tier_cost=10707, expected 9100');
    const f1fixed = f1.map(r => (r.level === 20 && r.w4_tier_cost === 10707 ? { ...r, w4_tier_cost: 9100 } : r));
    expect(f1fixed.filter((r, i) => JSON.stringify(r) !== JSON.stringify(f1[i])).map(r => r.level)).toEqual([20]);
    const nb: any = buildBalance(f1fixed, balance, cfg);
    expect([nb.farm.baseCost, nb.farm.costGrowth, nb.farm.costGrowthSegments, nb.farm.costLevelMultipliers]).toEqual([100, 1.35, F1, mults]);
    expect(JSON.parse(JSON.stringify(nb)).farm.costLevelMultipliers).toEqual([{ level: 18, mult: 0.75 }, { level: 19, mult: 0.85 }]);
    expect([farmCost(17, nb), farmCost(18, nb), farmCost(19, nb), farmCost(20, nb)]).toEqual([seg(17), 11076, 18201, 31050]);
    for (const r of f1) expect(farmCost(r.level, nb), `L${r.level}`).toBe(r.farm_cost);
    const t18 = nb.workers.grader.tiers.findIndex((t: any) => t.farm === 18), t19 = nb.workers.grader.tiers.findIndex((t: any) => t.farm === 19);
    expect([graderTierCostCents(t18, nb), graderTierCostCents(t19, nb)]).toEqual([553800, 910000]); // row 20 is still tier 2, so the game charges 9100 there too
    expect(() => validateBalance(nb, false)).not.toThrow();
    // The un-gapped segment curve differs from the CSV at exactly L18 and L19 (the F1-GAP rows), nowhere else.
    expect(f1.filter(r => seg(r.level) !== r.farm_cost).map(r => r.level)).toEqual([18, 19]);
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
  it('per-level multipliers: validation (formula + balance loading); empty = unchanged', () => {
    for (const [m, re] of [[[{ level: 0, mult: 0.5 }], />= 1/], [[{ level: 1.5, mult: 0.5 }], /integer/], [[{ level: 3, mult: 0 }], /mult must be > 0/],
      [[{ level: 3, mult: 0.5 }, { level: 3, mult: 0.6 }], /duplicate/], ['x', /array/]] as [any, RegExp][]) {
      expect(() => validateCostLevelMultipliers(m)).toThrow(re);
      const b = clone(); b.farm.costLevelMultipliers = m; expect(() => validateBalance(b, false)).toThrow(re);
    }
    const p: any = { ...balance, farm: { ...balance.farm, costLevelMultipliers: [] } };
    for (let L = 0; L <= balance.maxLevel; L++) expect(farmCost(L, p)).toBe(farmCost(L, balance));
    expect(JSON.stringify(buildBalance(rows, balance, { farmCostLevelMultipliers: [] }))).toBe(JSON.stringify(buildBalance(rows, balance)));
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
