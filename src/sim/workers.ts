import type { Balance } from '../config/balance';
import { farmCost } from '../config/formulas';
/** M2 Workers (m2-proposal v1.0). All tunables in balance.workers. Pure helpers used by tick/actions. */
export type WorkerId = 'market_hand' | 'coop_hand' | 'hawker' | 'grader';
export const WORKERS: WorkerId[] = ['market_hand', 'coop_hand', 'hawker', 'grader'];
export type WorkerMood = 'working' | 'tired' | 'asleep' | 'unpaid';
/** energy 0..100; cdS = seconds until next auto action (Market/Coop Hand only). */
/** unpaid (§8 item 2/15): wage couldn't be paid in full; acts as Asleep for output, no drain, no wage. */
export interface Worker { energy: number; cdS: number; unpaid?: boolean; }
export type Workers = Partial<Record<WorkerId, Worker>>;
export const mood = (w: Worker | undefined, b: Balance): WorkerMood | null =>
  !w ? null : w.unpaid ? 'unpaid' : w.energy >= b.workers.energy.tired_below_pct ? 'working' : w.energy > 0 ? 'tired' : 'asleep';
/** Off = Asleep or Unpaid: the worker does not do its job (Market Hand/Coop Hand/Hawker effect lost, Grader keeps asleep_bonus_share). Farm output continues; see salesStopped for a true zero. */
export const isOff = (m: WorkerMood | null) => m === 'asleep' || m === 'unpaid';
/** Yawn cue (v1.1): energy at/below yawn_at_pct and above 0, while not Unpaid/Asleep. */
export const isYawning = (w: Worker | undefined, b: Balance) => !!w && !w.unpaid && w.energy > 0 && w.energy <= b.workers.energy.yawn_at_pct;
export const hiredCount = (ws: Workers) => WORKERS.filter(id => ws[id]).length;
/** rc1-asleep-state-spec T5/AC-R9 (PM Workers 00:17): the bulk Refill bar / nav Refill show for ANY single tired or asleep
 *  hired worker of any role (N>=1); hidden at N=0 is enforced by the callers. The old >= manage_all_min_workers hire gate hid
 *  them when e.g. the Market Hand was the only worker hired. _b kept for call-site compatibility. */
export const showManageAll = (ws: Workers, _b: Balance) => hiredCount(ws) >= 1;
/** PM Workers ruling (b), 00:4x: bulk refill (every tired/asleep worker in one tap) needs >= manage_all_min_workers hired.
 *  Below that, the same bar refills only the single lowest-energy tired/asleep worker (per-worker Manage rules + cooldown). */
export const bulkManageAllowed = (ws: Workers, b: Balance) => hiredCount(ws) >= b.workers.energy.manage_all_min_workers;
/** Target of a below-threshold Refill tap: the lowest-energy hired worker <= manage_prompt_threshold (card order breaks ties).
 *  review 5d8a058 #6: Unpaid workers stay stopped after a refill, so a paid tired worker is preferred; Unpaid ones are picked only when no paid worker needs it. */
export const lowestManageTarget = (ws: Workers, b: Balance) => {
  const low = (ids: WorkerId[]) => ids.reduce<WorkerId | null>((m, id) => m == null || ws[id]!.energy < ws[m]!.energy ? id : m, null);
  const need = needManage(ws, b); return low(need.filter(id => !ws[id]!.unpaid)) ?? low(need);
};
/** P4 / B5: Manage is allowed only at energy <= manage_prompt_threshold (0.4 = Yawning). */
export const canManageWorker = (w: Worker | undefined, b: Balance) => !!w && w.energy <= b.workers.energy.manage_prompt_threshold * 100;
/** P4: workers Manage all refills / "(n need it)" counts: hired and <= threshold. 0 -> no action, no cooldown (ruling 4). */
export const needManage = (ws: Workers, b: Balance) => WORKERS.filter(id => canManageWorker(ws[id], b));
/** 1 minute (x unpaid_resume_wage_min) of a wage-paying worker's wage at Farm F, cents. */
export const resumeNeedCents = (id: 'market_hand' | 'coop_hand', farm: number, b: Balance) =>
  Math.round(b.workers[id].wage_per_farm_per_min * farm * b.workers.energy.unpaid_resume_wage_min * 100);
/** Hire cost in cents; grader = its first tier. */
export function hireCostCents(id: WorkerId, b: Balance): number {
  return id === 'grader' ? graderTierCostCents(0, b) : b.workers[id].hire_cost * 100;
}
export const unlockFarm = (id: WorkerId, b: Balance) => id === 'grader' ? b.workers.grader.tiers[0].farm : b.workers[id].unlock_farm;
/** Tier i cost in cents: the CSV's w4_tier_cost for that tier when sync-economy carried it (tiers[i].cost, dollars),
 *  else floor(share x farmCost(tier farm level)) dollars (pre-F1 balance files). */
export const graderTierCostCents = (i: number, b: Balance) => {
  const t = b.workers.grader.tiers[i] as { farm: number; mult: number; cost?: number };
  return (t.cost ?? Math.floor(b.workers.grader.tier_cost_share_of_farm_cost * farmCost(t.farm, b))) * 100;
};
/** Price multiplier from the Grader: full bonus Working, half Tired, asleep keeps asleep_bonus_share. */
export function graderMult(ws: Workers, tier: number, b: Balance): number {
  const m = mood(ws.grader, b); if (!m || tier <= 0) return 1;
  const g = b.workers.grader, bonus = g.tiers[tier - 1].mult - 1;
  return 1 + bonus * (m === 'working' ? 1 : m === 'tired' ? g.tired_bonus_share : g.asleep_bonus_share /* asleep or unpaid */);
}
export function hawkerDemandMult(ws: Workers, b: Balance): number {
  const m = mood(ws.hawker, b); return m === 'working' ? b.workers.hawker.demand_mult : m === 'tired' ? b.workers.hawker.tired_demand_mult : 1;
}
/** Full wage for one action interval, cents (rounded). Caller makes the worker Unpaid if coins < this. */
export const wageCents = (id: 'market_hand' | 'coop_hand', farm: number, intervalS: number, b: Balance) =>
  Math.round(b.workers[id].wage_per_farm_per_min * farm * intervalS / 60 * 100);
/** S2-8: exact wage for one action interval in cents (economy.csv rate, unrounded). */
export const wageExactCents = (id: 'market_hand' | 'coop_hand', farm: number, intervalS: number, b: Balance) =>
  b.workers[id].wage_per_farm_per_min * farm * intervalS / 60 * 100;
/** S2-8: charge = whole cents of (carried fraction + exact wage); the rest carries to the next action. */
export function wageCharge(id: 'market_hand' | 'coop_hand', farm: number, intervalS: number, fracCents: number, b: Balance) {
  const due = (fracCents || 0) + wageExactCents(id, farm, intervalS, b), cents = Math.floor(due + 1e-9);
  return { cents, frac: Math.max(0, due - cents) };
}
