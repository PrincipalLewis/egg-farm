/**
 * Economy formulas (M1-R1). Single implementation used by the sim AND by scripts/sync-economy.ts
 * (which fits these params from product/economy.csv and verifies every row). Mirrors product/sim/economy_sim.py.
 */
export interface CostGrowthSegment { from: number; to: number; growth: number }
/** F1-GAP: per-level farm cost multiplier applied to that level's (segment) cost, floored; does not compound into later levels. */
export interface CostLevelMultiplier { level: number; mult: number }
export interface EconomyParams {
  maxLevel: number;
  collection: { baseCost: number; costGrowth: number; eggsPerTapBase: number; eggsPerTapPerLevel: number; pricePercentPerLevel: number };
  farm: {
    baseCost: number; costGrowth: number; hensBase: number; hensPerLevel: number; eggsPerHenPerSec: number;
    coopCapacityBase: number; coopCapacityPerLevel: number; eggPriceCentsBase: number; eggPriceCentsPerLevel: number;
    customerIntervalBaseS: number; customerIntervalDecay: number; customerIntervalMinS: number;
    demandLoFactor: number; demandHiFactor: number;
    /** P3 (PT1-11, Economy's approach): L0 eggs/s from the CSV row; hens stay formula-driven. Absent = formula. */
    eggsPerSecL0?: number;
    /** F1 (product/f1-proposal.md): per-level-range cost growth; levels inclusive, non-overlapping, from >= 1.
     *  Segment {from,to,growth} uses `growth` for the step INTO each level from..to; costGrowth elsewhere. Absent/empty = pure pow. */
    costGrowthSegments?: CostGrowthSegment[];
    /** F1-GAP (decisions.md:157): farm_cost(L) = floor(curve(L) x mult) for the listed levels only. Absent/empty = no overrides. */
    costLevelMultipliers?: CostLevelMultiplier[];
  };
  customers: { customer_patience_s: number; first_customer_s: number; queue_max_base: number; queue_max_step_levels: number; queue_max_cap: number };
  offline: { offlineCapSeconds: number; offlineRateMultiplier: number; offlineMinSeconds: number };
}
/** Round half-up to `dp` decimals on the decimal expansion (avoids 1.005 -> 1.00 style errors). */
export const roundHalfUp = (x: number, dp: number) => { const m = 10 ** dp; return Math.round(Number((x * m).toPrecision(12))) / m; };
const clampL = (L: number, p: EconomyParams) => Math.max(0, Math.min(L, p.maxLevel));
export const collectionCost = (C: number, p: EconomyParams) => Math.floor(p.collection.baseCost * p.collection.costGrowth ** clampL(C, p));
export const eggsPerTap = (C: number, p: EconomyParams) => p.collection.eggsPerTapBase + p.collection.eggsPerTapPerLevel * clampL(C, p);
export const collectionPriceBonus = (C: number, p: EconomyParams) => roundHalfUp(p.collection.pricePercentPerLevel * clampL(C, p), 4);
export const farmCost = (F: number, p: EconomyParams) => {
  const L = clampL(F, p), base = farmCurveCost(L, p), o = p.farm.costLevelMultipliers?.find(m => m.level === L);
  return o ? Math.floor(base * o.mult) : base;
};
/** Farm cost from baseCost/costGrowth/segments only (no per-level multipliers). */
export const farmCurveCost = (F: number, p: EconomyParams) => {
  const segs = p.farm.costGrowthSegments, L = clampL(F, p);
  if (!segs || segs.length === 0) return Math.floor(p.farm.baseCost * p.farm.costGrowth ** L); // pre-F1 expression, unchanged
  // Same evaluation order as the sim (SegEco.fcost) so floors match the CSV.
  let v = p.farm.baseCost, n = L;
  for (const s of segs) { const k = Math.max(0, Math.min(L, s.to) - s.from + 1); v *= s.growth ** k; n -= k; }
  return Math.floor(v * p.farm.costGrowth ** n);
};
/** Throws unless segments are well-formed: integers, 1 <= from <= to, growth > 0 (finite), no overlaps. */
export function validateCostGrowthSegments(segs: unknown, where = 'farm.costGrowthSegments'): void {
  if (segs === undefined) return;
  if (!Array.isArray(segs)) throw new Error(`balance.${where} must be an array`);
  const ok = (x: unknown) => typeof x === 'number' && Number.isFinite(x);
  segs.forEach((s: any, i) => {
    if (!s || !ok(s.from) || !ok(s.to) || !ok(s.growth)) throw new Error(`balance.${where}[${i}] needs numeric from, to, growth`);
    if (!Number.isInteger(s.from) || !Number.isInteger(s.to)) throw new Error(`balance.${where}[${i}] from/to must be integers`);
    if (s.from < 1) throw new Error(`balance.${where}[${i}] from must be >= 1`);
    if (s.from > s.to) throw new Error(`balance.${where}[${i}] from must be <= to`);
    if (!(s.growth > 0)) throw new Error(`balance.${where}[${i}] growth must be > 0`);
  });
  const sorted = [...segs].sort((a: any, b: any) => a.from - b.from);
  for (let i = 1; i < sorted.length; i++) if (sorted[i].from <= sorted[i - 1].to)
    throw new Error(`balance.${where}: segments ${sorted[i - 1].from}-${sorted[i - 1].to} and ${sorted[i].from}-${sorted[i].to} overlap`);
}
/** Throws unless per-level multipliers are well-formed: integer level >= 1, unique, finite mult > 0. */
export function validateCostLevelMultipliers(ms: unknown, where = 'farm.costLevelMultipliers'): void {
  if (ms === undefined) return;
  if (!Array.isArray(ms)) throw new Error(`balance.${where} must be an array`);
  const seen = new Set<number>();
  ms.forEach((m: any, i) => {
    if (!m || typeof m.level !== 'number' || typeof m.mult !== 'number' || !Number.isFinite(m.mult)) throw new Error(`balance.${where}[${i}] needs numeric level, mult`);
    if (!Number.isInteger(m.level) || m.level < 1) throw new Error(`balance.${where}[${i}] level must be an integer >= 1`);
    if (!(m.mult > 0)) throw new Error(`balance.${where}[${i}] mult must be > 0`);
    if (seen.has(m.level)) throw new Error(`balance.${where}: duplicate level ${m.level}`); seen.add(m.level);
  });
}
export const hens = (F: number, p: EconomyParams) => p.farm.hensBase + p.farm.hensPerLevel * clampL(F, p);
export const eggsPerSec = (F: number, p: EconomyParams) =>
  clampL(F, p) === 0 && p.farm.eggsPerSecL0 !== undefined ? p.farm.eggsPerSecL0 : roundHalfUp(hens(F, p) * p.farm.eggsPerHenPerSec, 4);
export const coopCapacity = (F: number, p: EconomyParams) => p.farm.coopCapacityBase + p.farm.coopCapacityPerLevel * clampL(F, p);
/** Farm part of the egg price in cents (CSV egg_price x 100). */
export const farmPriceCents = (F: number, p: EconomyParams) => p.farm.eggPriceCentsBase + p.farm.eggPriceCentsPerLevel * clampL(F, p);
/** Sale price in cents: round_half_up((1.00 + 0.05F) x (1 + 0.12C), 2 dp), coefficients from config. */
export const eggPriceCents = (F: number, C: number, p: EconomyParams) =>
  Math.round(roundHalfUp((farmPriceCents(F, p) / 100) * (1 + p.collection.pricePercentPerLevel * clampL(C, p)), 2) * 100);
export const customerIntervalS = (F: number, p: EconomyParams) =>
  Math.max(p.farm.customerIntervalMinS, roundHalfUp(p.farm.customerIntervalBaseS * p.farm.customerIntervalDecay ** clampL(F, p), 2));
/** Demand = uniform int [ceil(lo*k), ceil(hi*k)], k = eggs/s x interval (min 1; max >= min). */
export const demandRange = (F: number, p: EconomyParams): readonly [number, number] => {
  const k = eggsPerSec(F, p) * customerIntervalS(F, p);
  const lo = Math.max(1, Math.ceil(p.farm.demandLoFactor * k));
  return [lo, Math.max(lo, Math.ceil(p.farm.demandHiFactor * k))] as const;
};
export const queueMax = (F: number, p: EconomyParams) =>
  Math.min(p.customers.queue_max_cap, p.customers.queue_max_base + Math.floor(clampL(F, p) / p.customers.queue_max_step_levels));
export const patienceS = (_F: number, p: EconomyParams) => p.customers.customer_patience_s;
/** One row in economy.csv column format, for verification/parity. */
export function tableRow(L: number, p: EconomyParams) {
  const [demand_min, demand_max] = demandRange(L, p);
  return {
    level: L, collection_cost: collectionCost(L, p), eggs_per_tap: eggsPerTap(L, p), farm_cost: farmCost(L, p), hens: hens(L, p),
    eggs_per_sec: eggsPerSec(L, p), coop_capacity: coopCapacity(L, p), egg_price: farmPriceCents(L, p) / 100,
    customer_interval_s: customerIntervalS(L, p), demand_min, demand_max,
    offline_eggs_per_sec: roundHalfUp(eggsPerSec(L, p) * p.offline.offlineRateMultiplier, 2),
    offline_max_eggs_2h: Math.floor(Math.min(7200, p.offline.offlineCapSeconds) * p.offline.offlineRateMultiplier * eggsPerSec(L, p)),
    customer_patience_s: p.customers.customer_patience_s, queue_max: queueMax(L, p), first_customer_s: p.customers.first_customer_s,
    collection_price_bonus: collectionPriceBonus(L, p),
  };
}
