import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { farmCost, validateCostGrowthSegments, validateCostTable, type EconomyParams } from '../src/config/formulas';
import { graderTierCostCents } from '../src/sim/workers';
import { balance, validateBalance } from '../src/config/balance';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from '../scripts/sync-economy';
const rows = parseEconomyCsv(readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8'));
/** sha256 of product/economy.f1.csv (Economy's F1 + F1-GAP table), vendored as data/economy.f1.csv. */
const F1_CSV_SHA256 = '4ad1349ad27ca4c1657c94afd0fbfabd081aa658faa3ff5882a8bc6121e4737f'; // Economy row-20 fix (w4 9100), CRLF
/** sha256 of product/economy.f1-m4cols.csv rev 6dca24cd (F1 + HoP-approved AC7 L21 trim; was 86f0e80e), copied to data/economy.csv. */
const M4COLS_SHA256 = '6dca24cd50a6fd6f11c361e16d8b3c797fddea7fe0155c1d9e79006f99845455';
/** Allowed shipping CSVs: F1 6dca24cd (flag-off/f1) and the M4-on retune T3 b48be8a4 (D-CEO-20261019-04: only hens/egg_value cost L0-L11, farm_cost and w* unchanged). */
const SHIPPING_SHA256 = [M4COLS_SHA256, 'b48be8a4f920940876168abac57c0b353c661dfeb355e627f3436d5acb83f857', '8dc90e2b36ae18619b6d870c095e77d09a83043788cbe2154feecbf94378996b' /* M5.0 shipping CSV (D-HOP-2026-10-29-01): farm_cost and w* unchanged vs T3 */, 'a8c4e26836bf7af98cb51f8e3e8a646750e82a4cdc18be450afe2f86eeeeb07f' /* M5.1 o1a: farm_cost L27-29 only (D-HOP-2026-10-29-01) */];
const F1 = [{ from: 6, to: 14, growth: 1.25 }, { from: 15, to: 20, growth: 1.45 }];
/** Curve params (pre-F1 L0 base 100, growth 1.35) with no costTable, so these tests exercise the formula path. */
const curve: any = { ...balance, farm: { ...balance.farm, costTable: undefined, baseCost: 100, costGrowth: 1.35 } };
const withSegs = (segs: any, p: any = curve): EconomyParams => ({ ...p, farm: { ...p.farm, costTable: undefined, costGrowthSegments: segs } });
const clone = () => JSON.parse(JSON.stringify(balance));

describe('F1 farm cost growth segments', () => {
  it('shipping balance (F1 m4cols 6dca24cd or T3 b48be8a4): farm_cost and every w* cost equal the CSV on every level L0..last row', async () => {
    const csv = new URL('../data/economy.csv', import.meta.url);
    expect(SHIPPING_SHA256).toContain(createHash('sha256').update(readFileSync(csv)).digest('hex'));
    expect(balance.farm.costGrowthSegments).toBeUndefined();
    expect(balance.farm.costTable?.length).toBe(rows.length); expect(balance.maxLevel).toBe(rows[rows.length - 1].level);
    const { hireCostCents, unlockFarm } = await import('../src/sim/workers');
    const tierAt = (L: number) => balance.workers.grader.tiers.filter(t => t.farm <= L).length;
    for (const r of rows) {
      expect(farmCost(r.level, balance), `L${r.level} farm_cost`).toBe(r.farm_cost);
      for (const [id, col] of [['market_hand', 'w1_cost'], ['coop_hand', 'w2_cost'], ['hawker', 'w3_cost']] as const)
        expect(r.level >= unlockFarm(id, balance) ? hireCostCents(id, balance) / 100 : 0, `L${r.level} ${col}`).toBe(r[col]);
      const k = tierAt(r.level);
      expect(k, `L${r.level} w4_tier`).toBe(r.w4_tier);
      expect(k ? graderTierCostCents(k - 1, balance) / 100 : 0, `L${r.level} w4_tier_cost`).toBe(r.w4_tier_cost);
    }
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
  it("Economy's economy.f1.csv (vendored, sha-pinned): per-level fit, F1-GAP L18/L19 exact", () => {
    // Vendored copy of Economy's product/economy.f1.csv, pinned by sha256 (verified against the product file when the studio workspace is present).
    const vendored = new URL('../data/economy.f1.csv', import.meta.url), prod = new URL('../../product/economy.f1.csv', import.meta.url);
    const sha = (u: URL) => createHash('sha256').update(readFileSync(u)).digest('hex');
    expect(sha(vendored)).toBe(F1_CSV_SHA256);
    if (existsSync(prod)) expect(sha(prod), 'data/economy.f1.csv must equal product/economy.f1.csv').toBe(sha(vendored));
    const src = vendored;
    const f1 = parseEconomyCsv(readFileSync(src, 'utf8'));
    expect(f1.length).toBe(31);
    // Approved F1-GAP cuts on top of the x1.45 L15-20 segment (decisions.md:157; product/f1-proposal.md:250): rows 18/19 are
    // x0.75 / x0.85 of the segment curve. They are DATA: sync-economy copies farm_cost and w4_tier_cost per level, so no multiplier config.
    const seg = (L: number) => farmCost(L, withSegs(F1));
    expect(f1.filter(r => seg(r.level) !== r.farm_cost).map(r => r.level)).toEqual([18, 19]); // the curve and the CSV differ only at the GAP rows
    expect([Math.floor(seg(18) * 0.75), Math.floor(seg(19) * 0.85)]).toEqual([11076, 18201]);
    const lv = [...f1].sort((a, b) => a.level - b.level);
    for (let i = 1; i < lv.length; i++) expect(lv[i].farm_cost, `L${lv[i].level} strictly increasing`).toBeGreaterThan(lv[i - 1].farm_cost);
    const nb: any = buildBalance(f1, balance, { farmCostFromCsv: true });
    expect(nb.farm.costTable).toEqual(f1.map(r => r.farm_cost));
    expect([farmCost(18, nb), farmCost(19, nb), farmCost(20, nb)]).toEqual([11076, 18201, 31050]);
    for (const r of f1) expect(farmCost(r.level, nb), `L${r.level}`).toBe(r.farm_cost);
    const t18 = nb.workers.grader.tiers.findIndex((t: any) => t.farm === 18), t19 = nb.workers.grader.tiers.findIndex((t: any) => t.farm === 19);
    expect([graderTierCostCents(t18, nb), graderTierCostCents(t19, nb)]).toEqual([553800, 910000]);
    expect(f1.find(r => r.level === 20)?.w4_tier_cost).toBe(9100); // Economy's row-20 fix (was 10707)
    expect(() => validateBalance(nb, false)).not.toThrow();
    // A CSV w4 cell that does not repeat its tier's cost still fails loudly.
    expect(() => buildBalance(f1.map(r => r.level === 20 ? { ...r, w4_tier_cost: 10707 } : r), balance, { farmCostFromCsv: true })).toThrow('L20 w4_tier_cost=10707, expected 9100');
  });
  it('sync-economy: segments off reproduces balance.json byte-for-byte; wrong segments vs CSV fail loudly', () => {
    // Curve mode (farmCostFromCsv off) on a pure-pow CSV: [] segments == no config; wrong segments fail.
    const pow: Record<string, number>[] = rows.map(r => ({ ...r, farm_cost: farmCost(r.level, curve) }));
    const tf = (t: number) => pow[balance.workers.grader.tiers[t - 1].farm].farm_cost;
    const powRows = pow.map(r => ({ ...r, w4_tier_cost: r.w4_tier ? Math.floor(balance.workers.grader.tier_cost_share_of_farm_cost * tf(r.w4_tier)) : 0 }));
    expect(JSON.stringify(buildBalance(powRows, balance, { farmCostGrowthSegments: [] }))).toBe(JSON.stringify(buildBalance(powRows, balance)));
    expect(() => buildBalance(powRows, balance, { farmCostGrowthSegments: F1 })).toThrow(/farm/);
    // Shipping config reproduces balance.json byte-for-byte; curve fitting the m4cols CSV is impossible (why per-level is needed).
    expect(JSON.stringify(buildBalance(rows, balance, readEconomyConfig()), null, 2) + '\n').toBe(readFileSync(new URL('../src/config/balance.json', import.meta.url), 'utf8'));
    expect(() => buildBalance(rows, balance)).toThrow(/farm costGrowth/);
    expect(() => buildBalance(rows, balance, { farmCostFromCsv: true, farmCostGrowthSegments: F1 })).toThrow(/mutually exclusive/);
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
  it('costTable validation (formula + balance loading)', () => {
    for (const [t, re] of [['x', /array/], [[1, 2], /maxLevel\+1/], [[...balance.farm.costTable!.slice(0, -1), 0], /positive integer/], [[...balance.farm.costTable!.slice(0, -1), 1.5], /positive integer/]] as [any, RegExp][]) {
      expect(() => validateCostTable(t, balance.maxLevel)).toThrow(re);
      const b = clone(); b.farm.costTable = t; expect(() => validateBalance(b, false)).toThrow(re);
    }
    const b = clone(); b.workers.grader.tiers[0].cost = 0; expect(() => validateBalance(b, false)).toThrow(/tiers\[0\]\.cost/);
  });
  it('big numbers: finite, integer, monotone at high levels; matches pow form', () => {
    const p: any = withSegs(F1, { ...curve, maxLevel: 500 });
    let prev = 0;
    for (let L = 0; L <= 500; L += 7) { const v = farmCost(L, p); expect(Number.isFinite(v) && Number.isInteger(v) && v >= prev).toBe(true); prev = v; }
    const L = 300, want = Math.floor(100 * 1.25 ** 9 * 1.45 ** 6 * 1.35 ** (L - 15));
    expect(farmCost(L, p) / want).toBeCloseTo(1, 12);
    expect(farmCost(600, p)).toBe(farmCost(500, p)); // clamped to maxLevel
  });
});
