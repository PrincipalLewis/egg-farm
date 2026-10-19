/**
 * Economy formulas (M1-R1). Single implementation used by the sim AND by scripts/sync-economy.ts
 * (which fits these params from product/economy.csv and verifies every row). Mirrors product/sim/economy_sim.py.
 */
export interface CostGrowthSegment { from: number; to: number; growth: number }
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
    /** F1 (HoE, Oct 17): farm_cost per level, copied verbatim from the CSV by sync-economy (index = level, 0..maxLevel).
     *  When present it is THE farm cost (covers the F1-GAP cuts and any later per-level edits); no formula fallback.
     *  Absent = baseCost/costGrowth/segments curve (pre-F1 behaviour). */
    costTable?: number[];
    /** D-HOP-10 (HoE): coop_capacity per Farm level, copied from the CSV by sync-economy (index = level, 0..maxLevel) when the
     *  column is not linear. Absent = coopCapacityBase + coopCapacityPerLevel x F (unchanged for linear tables). */
    coopCapacityTable?: number[];
  };
  customers: { customer_patience_s: number; first_customer_s: number; queue_max_base: number; queue_max_step_levels: number; queue_max_cap: number };
  offline: { offlineCapSeconds: number; offlineRateMultiplier: number; offlineMinSeconds: number; hiddenSimMaxSeconds: number };
  /** M4-A three tracks (product/m4-manage-proposal.md §2.1-2.2). Optional so pre-M4 params stay valid. */
  m4?: M4Params;
}
export interface M4Params {
  /** Feature flag: 0 = off (pre-M4 game, Farm drives eggs/s and price), 1 = Hens/Egg value tracks live. */
  enabled: number;
  /** costs[L] = price of L -> L+1 (CSV hens_cost / egg_value_cost, verbatim). */
  /** L30+ (l30plus-spec D2/D4/D8): capOverFarmByFarm[F] = the CSV row's cap (absent = constant capOverFarm, the L0 value);
   *  extraCostFarmShareByFarm[F] = hv_extra_cost_farm_share row (absent = 0). Track max level = costs.length - 1 (CSV rows). */
  hens: { costs: number[]; capOverFarm: number; capOverFarmByFarm?: number[] };
  extraCostFarmShareByFarm?: number[];
  /** Multiplier on the 2nd extra level's surcharge (data/economy-config.json hvExtraSecondLevelMult). */
  extraSecondLevelMult?: number;
  /** spec v1.14 M4A-4: offline grant per Hens level, verbatim from economy.csv (offline_eggs_per_sec, offline_max_eggs_2h). */
  offline?: { eggsPerSec: number[]; maxEggs2h: number[] };
  eggValue: { costs: number[]; capOverFarm: number; capOverFarmByFarm?: number[]; baseStep: number; levelBonus: number };
  milestones: {
    /** M1 (HoP 14:45): Hens milestones raise coop capacity and offline eggs only, never the in-tab lay rate. */
    hens: { level: number; coopMult: number; offlineMult: number }[];
    grades: { level: number; mult: number; minFarm: number }[];
    /** mult on the unit price (1.10 = +10%), CSV balancedN_mult. */
    balanced: { level: number; mult: number }[];
  };
  /** Later-M4 scalar tunables (tc_* columns), carried through verbatim; unused by M4-A code. */
  tc?: Record<string, number>;
}
/** Round half-up to `dp` decimals on the decimal expansion (avoids 1.005 -> 1.00 style errors). */
export const roundHalfUp = (x: number, dp: number) => { const m = 10 ** dp; return Math.round(Number((x * m).toPrecision(12))) / m; };
export const clampL = (L: number, p: EconomyParams) => Math.max(0, Math.min(L, p.maxLevel));
export const collectionCost = (C: number, p: EconomyParams) => Math.floor(p.collection.baseCost * p.collection.costGrowth ** clampL(C, p));
export const eggsPerTap = (C: number, p: EconomyParams) => p.collection.eggsPerTapBase + p.collection.eggsPerTapPerLevel * clampL(C, p);
export const collectionPriceBonus = (C: number, p: EconomyParams) => roundHalfUp(p.collection.pricePercentPerLevel * clampL(C, p), 4);
export const farmCost = (F: number, p: EconomyParams) => {
  const t = p.farm.costTable, L = clampL(F, p);
  if (t) { const v = t[L]; if (!Number.isInteger(v)) throw new Error(`balance.farm.costTable has no integer cost for level ${L}`); return v; }
  return farmCurveCost(L, p);
};
/** Farm cost from baseCost/costGrowth/segments (used when there is no costTable). */
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
/** Throws unless the table is maxLevel+1 positive integers (strict increase is NOT required here; sync-economy copies the CSV verbatim). */
export function validateCostTable(t: unknown, maxLevel: number, where = 'farm.costTable'): void {
  if (t === undefined) return;
  if (!Array.isArray(t)) throw new Error(`balance.${where} must be an array`);
  if (t.length !== maxLevel + 1) throw new Error(`balance.${where} must have maxLevel+1 = ${maxLevel + 1} entries, got ${t.length}`);
  t.forEach((v, i) => { if (!Number.isSafeInteger(v) || v <= 0) throw new Error(`balance.${where}[${i}] must be a positive integer`); });
}
export const hens = (F: number, p: EconomyParams) => p.farm.hensBase + p.farm.hensPerLevel * clampL(F, p);
export const eggsPerSec = (F: number, p: EconomyParams) =>
  clampL(F, p) === 0 && p.farm.eggsPerSecL0 !== undefined ? p.farm.eggsPerSecL0 : roundHalfUp(hens(F, p) * p.farm.eggsPerHenPerSec, 4);
export const coopCapacity = (F: number, p: EconomyParams) => {
  const t = p.farm.coopCapacityTable, L = clampL(F, p);
  if (t) { const v = t[L]; if (!Number.isInteger(v)) throw new Error(`balance.farm.coopCapacityTable has no integer capacity for level ${L}`); return v; }
  return p.farm.coopCapacityBase + p.farm.coopCapacityPerLevel * L;
};
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
// ---------- M4-A tracks (product/farm/m4a-spec.md v1.2) ----------
/** M4A-1: cost in coins of Hens/Egg value level L -> L+1 (CSV column at L). */
/** L30+ D1: a track's max level is read from data (its CSV cost rows), independent of the Farm max (balance.maxLevel). */
export const trackMaxLevel = (t: 'hens' | 'eggValue', p: EconomyParams) => p.m4![t].costs.length - 1;
const clampT = (L: number, t: 'hens' | 'eggValue', p: EconomyParams) => Math.max(0, Math.min(L, trackMaxLevel(t, p)));
export const hensCost = (H: number, p: EconomyParams) => p.m4!.hens.costs[clampT(H, 'hens', p)];
export const eggValueCost = (V: number, p: EconomyParams) => p.m4!.eggValue.costs[clampT(V, 'eggValue', p)];
/** Per-row cap over Farm (hens_cap_over_farm / egg_value_cap_over_farm at row F). */
export const capOverFarmAt = (t: 'hens' | 'eggValue', F: number, p: EconomyParams) => p.m4![t].capOverFarmByFarm?.[clampL(F, p)] ?? p.m4![t].capOverFarm;
/** M4A-2: buy cap min(maxLevel, F + *_cap_over_farm). Enforced at purchase only (migrated levels may exceed it, M4A-27/28). */
export const hensCap = (F: number, p: EconomyParams) => Math.min(trackMaxLevel('hens', p), F + capOverFarmAt('hens', F, p));
export const eggValueCap = (F: number, p: EconomyParams) => Math.min(trackMaxLevel('eggValue', p), F + capOverFarmAt('eggValue', F, p));
/** L30-17 (D8): surcharge for a level above the BASE cap (F + capOverFarm, the L0 row: F+3) = floor(share[F] x farmCost(F)),
 *  x extraSecondLevelMult for the 2nd extra level. 0 when share is 0 (below L40) or the level is within the base cap. */
export function trackExtraCost(t: 'hens' | 'eggValue', L: number, F: number, p: EconomyParams): number {
  const k = L + 1 - (F + p.m4![t].capOverFarm); if (k <= 0) return 0;
  const share = p.m4!.extraCostFarmShareByFarm?.[clampL(F, p)] ?? 0; if (!share) return 0;
  const mult = k >= 2 ? (p.m4!.extraSecondLevelMult ?? 1) ** (k - 1) : 1;
  return Math.floor(share * farmCost(F, p) * mult);
}
const best = <T extends { level: number }>(xs: T[], L: number, ok: (x: T) => boolean = () => true) => xs.filter(x => L >= x.level && ok(x)).pop();
/** M4A-8: highest Hens milestone reached (null below the first). */
export const hensMilestone = (H: number, p: EconomyParams) => best(p.m4!.milestones.hens, H) ?? null;
export const hensCoopMult = (H: number, p: EconomyParams) => hensMilestone(H, p)?.coopMult ?? 1;
export const hensOfflineMult = (H: number, p: EconomyParams) => hensMilestone(H, p)?.offlineMult ?? 1;
/** M4A-9: egg grade multiplier; a grade with a Farm gate falls back to the lower grade until F reaches it. */
export const gradeMult = (V: number, F: number, p: EconomyParams) => best(p.m4!.milestones.grades, V, g => F >= g.minFarm)?.mult ?? 1;
/** M4A-10: Balanced-farm price multiplier on min(F,H,V) (Collection not included). */
export const balancedMult = (F: number, H: number, V: number, p: EconomyParams) => best(p.m4!.milestones.balanced, Math.min(F, H, V))?.mult ?? 1;
export const balancedTier = (F: number, H: number, V: number, p: EconomyParams) => p.m4!.milestones.balanced.filter(t => Math.min(F, H, V) >= t.level).length;
/** M4A-4: in-tab lay rate = CSV eggs_per_sec at H, no milestone multiplier (M1). */
/** Saves M1 (Leadership: tracks to 55): the Hens level is clamped at the Hens track max, not the Farm max, so H51-55 lay faster. */
export const trackEggsPerSec = (H: number, p: EconomyParams) => eggsPerSec(clampT(H, 'hens', p), { ...p, maxLevel: trackMaxLevel('hens', p) });
/** M4A-4/M4A-8: coop capacity at F x the Hens coop milestone. */
export const trackCoopCapacity = (F: number, H: number, p: EconomyParams) => Math.floor(coopCapacity(F, p) * hensCoopMult(H, p));
/** M4A-5: unit price before the Grader, in integer cents, one half-up rounding at the end:
 *  (1 + baseStep*V) x (1 + levelBonus*V) x grade x Balanced. Collection never enters. */
export const trackPriceCents = (F: number, H: number, V: number, p: EconomyParams) => {
  const v = clampT(V, 'eggValue', p), e = p.m4!.eggValue; // Saves M1: Egg value track max (55), not the Farm max
  return Math.round(Number((100 * (1 + e.baseStep * v) * (1 + e.levelBonus * v) * gradeMult(v, F, p) * balancedMult(F, H, v, p)).toPrecision(12)));
};
export const m4On = (p: EconomyParams) => !!p.m4?.enabled;
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
