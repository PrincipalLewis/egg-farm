/**
 * M4-A three tracks (product/m4-manage-proposal.md §2.1-2.2; decisions 2026-10-16 13:05-13:50).
 * Behind balance.m4.enabled (default 0): with the flag off every helper returns the pre-M4 value, so main's game is unchanged.
 *  - Farm: coop, queue, demand, interval, worker unlocks, and the Hens/Egg value caps (min(F+3, maxLevel)).
 *  - Hens: production (CSV eggs_per_sec at H); milestones H10/20/30 raise coop size + offline eggs only (M1).
 *  - Egg value: price (1+step*V)(1+bonus*V) x grade x Balanced (then x Grader); Collection adds no price.
 * The v6->v7 migration is pure in migrate-v7.ts and NOT wired into save.ts (waits for the save-durability merge).
 */
import type { Balance } from '../config/balance';
import { m4On, trackEggsPerSec, trackPriceCents, trackCoopCapacity, hensOfflineMult, eggsPerSec, eggPriceCents, coopCapacity, hensCap, eggValueCap, hensCost, eggValueCost, balancedTier, clampL } from '../config/formulas';
import type { GameState } from './state';
import { layFactor, type LayCtx } from './effects';
export type Track = 'hens' | 'eggValue';
/** Eggs/s into the coop. With `ctx` (the live tick only), live LAY_EFFECTS multiply it (Sweep, F1c); without ctx it is the base
 *  rate, so offline grants, income previews and golden-egg E never see a timed effect (sizing §9.5 edge 3). */
export const prodEggsPerSec = (s: GameState, b: Balance, ctx?: LayCtx) => (m4On(b) ? trackEggsPerSec(s.hensLevel, b) : eggsPerSec(s.farmLevel, b)) * layFactor(s, b, ctx);
/** Q-F1c-2 ruled D-HOP-2026-10-29-06: Sweep is EXCLUDED from golden-egg reward E. E reads this base rate (prodEggsPerSec with no
 *  ctx, as GE-AC8 does for P); golden #1 must use this, never a ctx'd rate. */
export const goldenEEggsPerSec = (s: GameState, b: Balance) => prodEggsPerSec(s, b);
/** M4A-4/8: coop capacity (Farm, x Hens coop milestone when on). */
export const coopCap = (s: GameState, b: Balance) => m4On(b) ? trackCoopCapacity(s.farmLevel, s.hensLevel, b) : coopCapacity(s.farmLevel, b);
/** M4A-4/8 offline multiplier on eggs and on the 2 h egg cap (x1.0 when off or below the first Hens milestone). */
export const offlineMult = (s: GameState, b: Balance) => m4On(b) ? hensOfflineMult(s.hensLevel, b) : 1;
/** Unit price in cents BEFORE sale multipliers (Grader etc.). payout.ts (fix/rc1-qa-bugs) must take its base from here. */
export const salePriceCents = (s: GameState, b: Balance) => m4On(b) ? trackPriceCents(s.farmLevel, s.hensLevel, s.eggValueLevel, b) : eggPriceCents(s.farmLevel, s.collectionLevel, b);
export const trackLevel = (s: GameState, t: Track) => t === 'hens' ? s.hensLevel : s.eggValueLevel;
export const trackCap = (s: GameState, t: Track, b: Balance) => (t === 'hens' ? hensCap : eggValueCap)(s.farmLevel, b);
export const trackCost = (L: number, t: Track, b: Balance) => (t === 'hens' ? hensCost : eggValueCost)(L, b);
/** Why a track row can't be bought ('max' = balance.maxLevel from economy.csv, 'cap' = at F+3: buy Farm first), or null. */
export const trackLock = (s: GameState, t: Track, b: Balance): 'max' | 'cap' | null =>
  trackLevel(s, t) >= b.maxLevel ? 'max' : trackLevel(s, t) >= trackCap(s, t, b) ? 'cap' : null;

/** Milestone ids reached by the current levels (level-derived, so they are re-evaluated on load).
 *  hens:<L>, grade:<L> (a minFarm grade counts only once Farm reaches it), balanced:<tier 1..5>. */
export function reachedMilestones(s: GameState, b: Balance): string[] {
  if (!b.m4) return [];
  const M = b.m4.milestones, out: string[] = [];
  for (const m of M.hens) if (s.hensLevel >= m.level) out.push(`hens:${m.level}`);
  for (const g of M.grades) if (s.eggValueLevel >= g.level && s.farmLevel >= g.minFarm) out.push(`grade:${g.level}`);
  for (let t = 1; t <= balancedTier(s.farmLevel, s.hensLevel, s.eggValueLevel, b); t++) out.push(`balanced:${t}`);
  return out;
}
/** Reached but not yet celebrated (the UI pops these once, then dispatches markMilestones). */
export const pendingMilestones = (s: GameState, b: Balance) => m4On(b) ? reachedMilestones(s, b).filter(id => !s.celebratedMilestones.includes(id)) : [];
/** Balanced-farm strip: tiers reached (N/5) and the next tier's level (null at 5/5). */
export function balancedStrip(s: GameState, b: Balance): { n: number; of: number; nextLevel: number | null } {
  const T = b.m4!.milestones.balanced, n = balancedTier(s.farmLevel, s.hensLevel, s.eggValueLevel, b);
  return { n, of: T.length, nextLevel: T[n]?.level ?? null };
}

