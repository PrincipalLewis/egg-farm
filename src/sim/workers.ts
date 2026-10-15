import type { Balance } from '../config/balance';
import { farmCost } from '../config/formulas';
/** M2 Workers (m2-proposal v1.0). All tunables in balance.workers. Pure helpers used by tick/actions. */
export type WorkerId = 'market_hand' | 'coop_hand' | 'hawker' | 'grader';
export const WORKERS: WorkerId[] = ['market_hand', 'coop_hand', 'hawker', 'grader'];
export type WorkerMood = 'working' | 'tired' | 'asleep';
/** energy 0..100; cdS = seconds until next auto action (Market/Coop Hand only). */
export interface Worker { energy: number; cdS: number; }
export type Workers = Partial<Record<WorkerId, Worker>>;
export const mood = (w: Worker | undefined, b: Balance): WorkerMood | null =>
  !w ? null : w.energy >= b.workers.energy.tired_below_pct ? 'working' : w.energy > 0 ? 'tired' : 'asleep';
/** Hire cost in cents; grader = its first tier. */
export function hireCostCents(id: WorkerId, b: Balance): number {
  return id === 'grader' ? graderTierCostCents(0, b) : b.workers[id].hire_cost * 100;
}
export const unlockFarm = (id: WorkerId, b: Balance) => id === 'grader' ? b.workers.grader.tiers[0].farm : b.workers[id].unlock_farm;
/** Tier i cost = floor(share x farmCost(tier farm level)) dollars. */
export const graderTierCostCents = (i: number, b: Balance) =>
  Math.floor(b.workers.grader.tier_cost_share_of_farm_cost * farmCost(b.workers.grader.tiers[i].farm, b)) * 100;
/** Price multiplier from the Grader: full bonus Working, half Tired, asleep keeps asleep_bonus_share. */
export function graderMult(ws: Workers, tier: number, b: Balance): number {
  const m = mood(ws.grader, b); if (!m || tier <= 0) return 1;
  const g = b.workers.grader, bonus = g.tiers[tier - 1].mult - 1;
  return 1 + bonus * (m === 'working' ? 1 : m === 'tired' ? g.tired_bonus_share : g.asleep_bonus_share);
}
export function hawkerDemandMult(ws: Workers, b: Balance): number {
  const m = mood(ws.hawker, b); return m === 'working' ? b.workers.hawker.demand_mult : m === 'tired' ? b.workers.hawker.tired_demand_mult : 1;
}
/** Wage for one action interval, cents (rounded), never more than the player has (coins never go negative). */
export const wageCents = (id: 'market_hand' | 'coop_hand', farm: number, intervalS: number, coinsCents: number, b: Balance) =>
  Math.min(coinsCents, Math.round(b.workers[id].wage_per_farm_per_min * farm * intervalS / 60 * 100));
