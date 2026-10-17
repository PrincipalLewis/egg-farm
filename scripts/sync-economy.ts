/**
 * MK-15: fit balance.json economy params from data/economy.csv (copied from product/economy.csv), verify EVERY row/column is reproduced by
 * src/config/formulas.ts, then write. Hand-set blocks (tickHz, save, feel, telemetry, offline cap/min) are preserved.
 * Usage: npm run sync-economy [-- --check]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from 'node:url';
import { tableRow, validateCostGrowthSegments, type EconomyParams, type CostGrowthSegment } from '../src/config/formulas';
const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
export const CSV_PATH = here('../data/economy.csv');
export const OUT_PATH = here('../src/config/balance.json');
/** Hand-set economy shape config (F1): farm cost growth segments. Not fitted from the CSV; every farm_cost row is verified against them. */
export const ECON_CONFIG_PATH = here('../data/economy-config.json');
/** farmCostFromCsv (F1): farm.costTable = the CSV farm_cost column and grader tiers carry the CSV w4_tier_cost (verified on every row). */
export interface EconomyConfig { farmCostGrowthSegments?: CostGrowthSegment[]; farmCostFromCsv?: boolean }
export const readEconomyConfig = (path = ECON_CONFIG_PATH): EconomyConfig => JSON.parse(readFileSync(path, 'utf8'));
type Row = Record<string, number>;
const INT_COLS = ['level', 'collection_cost', 'eggs_per_tap', 'farm_cost', 'hens', 'coop_capacity', 'demand_min', 'demand_max', 'offline_max_eggs_2h', 'queue_max'];
export function parseEconomyCsv(text: string): Row[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const head = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map((line, i) => {
    const cells = line.split(',').map(c => c.trim());
    if (cells.length !== head.length) throw new Error(`economy.csv row ${i + 2}: expected ${head.length} cells, got ${cells.length}`);
    const row: Row = {};
    head.forEach((h, j) => {
      const v = Number(cells[j]); if (cells[j] === '' || !Number.isFinite(v)) throw new Error(`economy.csv row ${i + 2} ${h}: "${cells[j]}" is not a number`);
      if (INT_COLS.includes(h) && !Number.isInteger(v)) throw new Error(`economy.csv row ${i + 2} ${h} must be an integer`);
      row[h] = v;
    });
    if (row.level !== i) throw new Error(`economy.csv row ${i + 2}: level ${row.level}, expected ${i}`);
    return row;
  });
}
const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
/** Search a grid of candidates for the first value that makes `ok` true. */
function fit(name: string, guess: number, step: number, span: number, ok: (v: number) => boolean): number {
  const n = Math.round(span / step);
  for (let i = 0; i <= n; i++) for (const s of i ? [1, -1] : [1]) { const v = r4(guess + s * i * step); if (v > 0 && ok(v)) return v; }
  throw new Error(`sync-economy: could not fit ${name} from economy.csv (formula changed? update src/config/formulas.ts)`);
}
export function fitParams(rows: Row[], prev: any, cfg: EconomyConfig = {}): EconomyParams {
  const R = rows, n = R.length - 1, all = (f: (r: Row) => boolean) => R.every(f);
  // PR #17 review: every Farm level must cost strictly more than the one before (L0..maxLevel), in both curve and per-level mode.
  for (let i = 1; i < R.length; i++) if (!(R[i].farm_cost > R[i - 1].farm_cost))
    throw new Error(`sync-economy: economy.csv farm_cost must be strictly increasing: L${R[i].level}=${R[i].farm_cost} <= L${R[i - 1].level}=${R[i - 1].farm_cost}`);
  const lin = (col: string) => ({ base: R[0][col], per: r4(R[1][col] - R[0][col]) });
  const tap = lin('eggs_per_tap'), hn = lin('hens'), cap = lin('coop_capacity');
  const p: EconomyParams = {
    maxLevel: n,
    collection: { baseCost: R[0].collection_cost, costGrowth: 0, eggsPerTapBase: tap.base, eggsPerTapPerLevel: tap.per, pricePercentPerLevel: r4(R[1].collection_price_bonus ?? 0) },
    farm: {
      baseCost: R[0].farm_cost, costGrowth: 0, hensBase: hn.base, hensPerLevel: hn.per, eggsPerHenPerSec: r4(R[1].eggs_per_sec / R[1].hens),
      coopCapacityBase: cap.base, coopCapacityPerLevel: cap.per,
      eggPriceCentsBase: Math.round(R[0].egg_price * 100), eggPriceCentsPerLevel: Math.round((R[1].egg_price - R[0].egg_price) * 100),
      customerIntervalBaseS: R[0].customer_interval_s, customerIntervalDecay: 0, customerIntervalMinS: Math.min(...R.map(r => r.customer_interval_s)),
      demandLoFactor: 0, demandHiFactor: 0,
    },
    customers: {
      customer_patience_s: R[0].customer_patience_s, first_customer_s: R[0].first_customer_s,
      queue_max_base: R[0].queue_max, queue_max_cap: Math.max(...R.map(r => r.queue_max)),
      queue_max_step_levels: (R.find(r => r.queue_max > R[0].queue_max)?.level ?? n + 1) - 0,
    },
    offline: { ...prev.offline, offlineRateMultiplier: r4(R[1].offline_eggs_per_sec / R[1].eggs_per_sec) },
  };
  // P3: an L0 eggs/s off the eggs/s = rate x hens line becomes the eggsPerSecL0 param (verified with every other cell).
  if (Math.abs(R[0].eggs_per_sec - r4(R[0].hens * p.farm.eggsPerHenPerSec)) > 1e-9) p.farm.eggsPerSecL0 = R[0].eggs_per_sec;
  const segs = cfg.farmCostGrowthSegments;
  validateCostGrowthSegments(segs, 'economy-config.farmCostGrowthSegments');
  if (segs && segs.length) p.farm.costGrowthSegments = segs.map(s => ({ from: s.from, to: s.to, growth: s.growth }));
  const inSeg = (L: number) => !!segs?.some(s => L >= s.from && L <= s.to);
  const plain = R.find(r => r.level > 0 && r.level <= n && !inSeg(r.level));
  const farmGuess = segs && segs.length && plain ? R[plain.level].farm_cost / R[plain.level - 1].farm_cost : (R[n].farm_cost / R[0].farm_cost) ** (1 / n);
  const col = (c: string) => (q: EconomyParams) => all(r => (tableRow(r.level, q) as any)[c] === r[c]);
  p.collection.costGrowth = fit('collection costGrowth', (R[n].collection_cost / R[0].collection_cost) ** (1 / n), 0.0001, 0.05, v => col('collection_cost')({ ...p, collection: { ...p.collection, costGrowth: v } }));
  if (cfg.farmCostFromCsv) {
    // F1 (HoE, Oct 17): farm_cost is per-level data, copied verbatim; no formula fit and no fallback. costGrowth/segments are
    // not used for costs and are kept only as the pre-F1 shape (costGrowth = baseline growth, informational).
    if (segs && segs.length) throw new Error('sync-economy: economy-config farmCostFromCsv and farmCostGrowthSegments are mutually exclusive');
    p.farm.costTable = R.map(r => r.farm_cost);
    p.farm.costGrowth = prev.farm?.costGrowth ?? 1;
  } else p.farm.costGrowth = fit('farm costGrowth', farmGuess, 0.0001, 0.05, v => col('farm_cost')({ ...p, farm: { ...p.farm, costGrowth: v } }));
  p.farm.customerIntervalDecay = fit('customerIntervalDecay', R[1].customer_interval_s / R[0].customer_interval_s, 0.0001, 0.02, v => col('customer_interval_s')({ ...p, farm: { ...p.farm, customerIntervalDecay: v } }));
  const k0 = R[0].eggs_per_sec * R[0].customer_interval_s;
  p.farm.demandLoFactor = fit('demandLoFactor', R[0].demand_min / k0, 0.01, 1, v => col('demand_min')({ ...p, farm: { ...p.farm, demandLoFactor: v, demandHiFactor: 99 } }));
  p.farm.demandHiFactor = fit('demandHiFactor', R[0].demand_max / k0, 0.01, 2, v => col('demand_max')({ ...p, farm: { ...p.farm, demandHiFactor: v } }));
  verify(rows, p);
  return p;
}
/** Every CSV cell must equal the formula output (floats to 1e-9). */
export function verify(rows: Row[], p: EconomyParams) {
  for (const r of rows) {
    const t = tableRow(r.level, p) as Record<string, number>;
    for (const [c, v] of Object.entries(r)) {
      if (!(c in t)) continue;
      if (Math.abs(t[c] - v) > 1e-9) throw new Error(`sync-economy: economy.csv L${r.level} ${c}=${v} but formula gives ${t[c]}`);
    }
  }
}
/** M2 Workers (v1.1): scalar columns must be constant on every row; per-level columns (wages, costs, Grader tiers)
 *  are checked against the formulas the sim uses. Hand-set extras not in the CSV (e.g. tips.coop_hand_tip_min_farm) are kept. */
export function fitWorkers(rows: Row[], prev: any, perLevel = false) {
  const R = rows, has = (c: string) => c in R[0];
  const one = (c: string) => {
    if (!has(c)) throw new Error(`sync-economy: economy.csv is missing workers column ${c}`);
    const v = R[0][c]; for (const r of R) if (r[c] !== v) throw new Error(`sync-economy: economy.csv ${c} must be constant (L${r.level}=${r[c]}, L0=${v})`);
    return v;
  };
  const W = prev.workers ?? {};
  const perFarmWage = (col: string, unlock: number) => {
    const r = R.find(x => x.level === unlock)!; const v = r4(r[col] / unlock);
    for (const x of R) { const want = x.level >= unlock ? r4(v * x.level) : 0; if (Math.abs(x[col] - want) > 1e-9) throw new Error(`sync-economy: economy.csv L${x.level} ${col}=${x[col]}, expected ${want}`); }
    return v;
  };
  const hire = (col: string, unlock: number) => {
    const v = Math.max(...R.map(r => r[col]));
    for (const r of R) if (r[col] !== (r.level >= unlock ? v : 0)) throw new Error(`sync-economy: economy.csv L${r.level} ${col}=${r[col]}, expected ${r.level >= unlock ? v : 0}`);
    return v;
  };
  const u1 = one('w1_unlock_farm'), u2 = one('w2_unlock_farm'), u3 = one('w3_unlock_farm');
  const tiers: { farm: number; mult: number; cost?: number }[] = [];
  for (const r of R) if (r.w4_tier > tiers.length) { if (r.w4_tier !== tiers.length + 1) throw new Error(`sync-economy: w4_tier skips at L${r.level}`); tiers.push({ farm: r.level, mult: r.w4_price_mult, ...(perLevel ? { cost: r.w4_tier_cost } : {}) }); }
  return {
    ...W,
    _note: 'M2 Workers v1.1 (product/workers/m2-proposal.md §10) GENERATED from data/economy.csv (copied from product/economy.csv); wages in $ per Farm level per minute.',
    energy: { start_pct: one('energy_start_pct'), drain_s_per_pct: one('drain_s_per_pct'), tired_below_pct: one('tired_below_pct'),
      yawn_at_pct: one('yawn_at_pct'), manage_cooldown_s: one('manage_cooldown_s'), manage_all_min_workers: one('manage_all_min_workers'),
      unpaid_resume_wage_min: one('unpaid_resume_wage_min'),
      // B5 (Product, Oct 15; 0.4 = Yawning): Manage / 'Manage all (N need it)' count a worker only at energy <= this share.
      ...(has('manage_prompt_threshold') ? { manage_prompt_threshold: one('manage_prompt_threshold') } : {}) },
    market_hand: { ...W.market_hand, unlock_farm: u1, hire_cost: hire('w1_cost', u1), wage_per_farm_per_min: perFarmWage('w1_wage_per_min', u1), every_s: one('w1_every_s'), tired_every_s: one('w1_tired_every_s') },
    coop_hand: { ...W.coop_hand, unlock_farm: u2, hire_cost: hire('w2_cost', u2), wage_per_farm_per_min: perFarmWage('w2_wage_per_min', u2), every_s: one('w2_every_s'), tired_every_s: one('w2_tired_every_s') },
    hawker: { ...W.hawker, unlock_farm: u3, hire_cost: hire('w3_cost', u3), demand_mult: one('w3_demand_mult'), tired_demand_mult: one('w3_tired_demand_mult') },
    grader: { ...W.grader, tiers, tier_cost_share_of_farm_cost: one('w4_tier_cost_share'), tired_bonus_share: one('w4_tired_bonus_share'), asleep_bonus_share: one('w4_asleep_bonus_share') },
    tips: { ...W.tips, coop_hand_tip_full_s: one('coop_full_tip_s') },
  };
}
/** w4_tier_cost = floor(share x farm_cost(tier farm)) of the CURRENT tier on each row. */
function verifyGraderCosts(rows: Row[], w: any) {
  const fc = (L: number) => rows[L].farm_cost;
  for (const r of rows) {
    // Per-level (F1): every row repeats its current tier's CSV cost. Pre-F1: floor(share x farm_cost(tier farm)).
    const t = r.w4_tier ? w.grader.tiers[r.w4_tier - 1] : null;
    const want = t ? (t.cost ?? Math.floor(w.grader.tier_cost_share_of_farm_cost * fc(t.farm))) : 0;
    if (r.w4_tier_cost !== want) throw new Error(`sync-economy: economy.csv L${r.level} w4_tier_cost=${r.w4_tier_cost}, expected ${want}`);
  }
}
export function buildBalance(rows: Row[], prev: any, cfg: EconomyConfig = {}) {
  const p = fitParams(rows, prev, cfg);
  const workers = fitWorkers(rows, prev, !!cfg.farmCostFromCsv); verifyGraderCosts(rows, workers);
  prev = { ...prev, workers };
  const { levels: _drop, collection: _c, farm: _f, customers: _cu, offline: _o, maxLevel: _m, ...rest } = prev;
  return { ...rest, _source: 'economy params GENERATED from data/economy.csv (copied from product/economy.csv) by scripts/sync-economy.ts (verified on every row); edit the CSV, not these blocks', ...p };
}
