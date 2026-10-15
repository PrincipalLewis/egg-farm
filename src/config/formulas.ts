/**
 * Economy formulas (M1-R1). Single implementation used by the sim AND by scripts/sync-economy.ts
 * (which fits these params from product/economy.csv and verifies every row). Mirrors product/sim/economy_sim.py.
 */
export interface EconomyParams {
  maxLevel: number;
  collection: { baseCost: number; costGrowth: number; eggsPerTapBase: number; eggsPerTapPerLevel: number; pricePercentPerLevel: number };
  farm: {
    baseCost: number; costGrowth: number; hensBase: number; hensPerLevel: number; eggsPerHenPerSec: number;
    coopCapacityBase: number; coopCapacityPerLevel: number; eggPriceCentsBase: number; eggPriceCentsPerLevel: number;
    customerIntervalBaseS: number; customerIntervalDecay: number; customerIntervalMinS: number;
    demandLoFactor: number; demandHiFactor: number;
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
export const farmCost = (F: number, p: EconomyParams) => Math.floor(p.farm.baseCost * p.farm.costGrowth ** clampL(F, p));
export const hens = (F: number, p: EconomyParams) => p.farm.hensBase + p.farm.hensPerLevel * clampL(F, p);
export const eggsPerSec = (F: number, p: EconomyParams) => roundHalfUp(hens(F, p) * p.farm.eggsPerHenPerSec, 4);
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
