/**
 * M4-A v6 -> v7 track migration (product/farm/m4a-spec.md v1.2 M4A-27..29). PURE; NOT wired into save.ts and
 * SAVE_VERSION is NOT bumped: that waits for the save-durability branch (CEO, 2026-10-16).
 *  - hensLevel = farmLevel (in-tab lay rate identical, M1).
 *  - eggValueLevel = the lowest V in 0..maxLevel whose v7 price (M4A-5: base x grade x Balanced, before the Grader,
 *    integer cents with one half-up rounding) is >= the v6 price eggPriceCents(F, C). No min(F+3, maxLevel) cap here
 *    (B1, grandfathered at migration only); buying stays blocked by the purchase cap until F + cap_over_farm > V.
 *  - Collection keeps its levels; no Collection refund.
 *  - Guard (M4A-29): a level above its track max is clamped; removed levels are refunded at the CSV cost column
 *    (coins -> cents), added to coinsCents and returned as migrationRefundCents. 0 for every save with current data.
 *  - Milestones / grades / Balanced tiers reached are seeded into celebratedMilestones silently (no toasts).
 */
import type { Balance } from '../config/balance';
import { eggPriceCents, trackPriceCents } from '../config/formulas';
import type { GameState } from './state';
import { reachedMilestones } from './tracks';
export interface MigrateV7Opts { hensMax?: number; eggValueMax?: number }
export interface MigrateV7Result { state: GameState; migrationRefundCents: number; v6PriceCents: number; v7PriceCents: number }
/** Lowest V in 0..maxLevel with v7 price >= target, or null if none. */
export function priceMatchedV(F: number, H: number, targetCents: number, b: Balance): number | null {
  for (let v = 0; v <= b.maxLevel; v++) if (trackPriceCents(F, H, v, b) >= targetCents) return v;
  return null;
}
export function migrateTracksV7(s: GameState, b: Balance, o: MigrateV7Opts = {}): MigrateV7Result {
  const F = s.farmLevel, hMax = o.hensMax ?? b.maxLevel, vMax = o.eggValueMax ?? b.maxLevel;
  const v6PriceCents = eggPriceCents(F, s.collectionLevel, b);
  const wantH = F, wantV = priceMatchedV(F, wantH, v6PriceCents, b) ?? b.maxLevel;
  const H = Math.min(wantH, hMax), V = Math.min(wantV, vMax);
  const costs = b.m4!;
  let refund = 0;
  for (let L = H; L < wantH; L++) refund += costs.hens.costs[L] * 100;
  for (let L = V; L < wantV; L++) refund += costs.eggValue.costs[L] * 100;
  const st: GameState = { ...s, hensLevel: H, eggValueLevel: V, coinsCents: s.coinsCents + refund };
  return {
    state: { ...st, celebratedMilestones: [...new Set([...s.celebratedMilestones, ...reachedMilestones(st, b)])] },
    migrationRefundCents: refund, v6PriceCents, v7PriceCents: trackPriceCents(F, H, V, b),
  };
}
/** l30plus-saves M2: the migration for a STORED state whose Farm level may exceed this build's maxLevel (saved by a
 *  higher-cap build). migrateTracksV7 runs unchanged at the effective level min(F, maxLevel), so H/V and the refund
 *  stay inside the cost tables (no NaN); the stored Farm level is kept as saved so a rollback + forward never loses it. */
export function migrateStoredTracksV7(s: GameState, b: Balance): MigrateV7Result {
  const F = s.farmLevel, Fe = Math.min(F, b.maxLevel);
  if (Fe === F) return migrateTracksV7(s, b);
  const r = migrateTracksV7({ ...s, farmLevel: Fe }, b);
  return { ...r, state: { ...r.state, farmLevel: F } };
}
