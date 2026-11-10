/** v5 Hire2/v5-clockwage: M5.1 clock wage (product/workers/m5.1-worker-failure-cost-proposal.54b994bd.md v0.3.24 FC-R1/FC-R4, U1/U2, AC-FC1/2/4/18/19).
 *  Behind m4.flags.clockWage (FC-R7). PURE helpers only. The call site lives in sim/tick.ts workerActions, which is the shared
 *  tick.ts/workers.ts seam (Saves + Architect): it is NOT wired here. Proposed seam change (HANDOFF S1/S2):
 *    in workerActions, for MH/CH: `if (m === 'asleep' && !isPaused(w, b) && clockWageOn(b)) { s = clockWageAsleepStep(s, id, dt, b, ev); continue; }`
 *    before the existing `if (isOff(m) || isPaused(w, b)) continue;`, and `wageState(m, b)` spread into the existing wage event.
 *  Everything here returns the same state object when the flag is off. */
import type { Balance } from '../config/balance';
import { flagOn } from '../config/flags';
import { CENTS_PER_DOLLAR } from '../config/breeds';
import type { Sink } from './events';
import { isPaused } from './pause';
import type { GameState } from './state';
import { mood, wageCharge, type WorkerMood } from './workers';
export type WageWorker = 'market_hand' | 'coop_hand';
export const clockWageOn = (b: Balance): boolean => flagOn(b, 'clockWage');
/** AC-FC15 / §6: `wage.state` enum, flag-on only. Spread into the wage event: `{ type:'wage', worker, cents, ...wageState(m, b) }`. */
export const wageState = (m: WorkerMood | null, b: Balance): { state?: 'working' | 'tired' | 'asleep' } =>
  clockWageOn(b) && (m === 'working' || m === 'tired' || m === 'asleep') ? { state: m } : {};
const EPS = 1e-9;
/** FC-R1 + U1: an Asleep (0%), not paused, not Unpaid MH/CH keeps decrementing the SAME cdS it had while Working/Tired (no transition
 *  writes cdS). When cdS ≤ 0 it is charged one `every_s` interval wage (fraction carried, S2-8) and cdS = every_s; no action.
 *  FC-R4: a charge coins can't cover → Unpaid, cdS 0, no charge (existing trigger), `worker_state:'unpaid'` emitted (shipping re-run HoE item).
 *  Same object when the flag is off, the worker isn't hired, isn't Asleep or is paused (FC-R2). Offline never calls step(), so FC-R5 holds. */
export function clockWageAsleepStep(s: GameState, id: WageWorker, dt: number, b: Balance, ev?: Sink): GameState {
  const w = s.workers[id];
  if (!clockWageOn(b) || !w || isPaused(w, b) || mood(w, b) !== 'asleep') return s;
  let cdS = w.cdS - dt;
  if (cdS > EPS) return { ...s, workers: { ...s.workers, [id]: { ...w, cdS } } };
  const interval = b.workers[id].every_s;
  const { cents, frac } = wageCharge(id, s.farmLevel, interval, s.wageFracCents?.[id] ?? 0, b);
  if (cents > s.coinsCents) {
    ev?.push({ type: 'worker_state', worker: id, state: 'unpaid' });
    return { ...s, workers: { ...s.workers, [id]: { ...w, cdS: 0, unpaid: true } } };
  }
  cdS = interval;
  if (cents > 0) ev?.push({ type: 'wage', worker: id, cents, state: 'asleep' });
  return { ...s, coinsCents: s.coinsCents - cents, wageFracCents: { ...s.wageFracCents, [id]: frac }, workers: { ...s.workers, [id]: { ...w, cdS } } };
}
/** §4 caption $X: that worker's wage per minute at Farm F, cents (W1 0.25·F, W2 0.5·F $/min from balance). */
export const wagePerMinCents = (id: WageWorker, farm: number, b: Balance) => Math.round(b.workers[id].wage_per_farm_per_min * farm * CENTS_PER_DOLLAR);

// ---- S5 (Saves-approved): clockWageTipShown is an OPTIONAL saved field (M5Fields / M5_SAVED_FIELDS in m5-state.ts), no
// SAVE_VERSION bump (AC-FC11). Its sanitiser runs inside save/m5-fields.ts m5Load, so every load path gets it.
/** Load sanitiser (called from m5Load): a non-boolean value is dropped (= default, not shown). Identity with clockWage off. */
export function clockWageLoad(s: GameState, b: Balance): GameState {
  if (!clockWageOn(b) || !('clockWageTipShown' in s) || typeof s.clockWageTipShown === 'boolean') return s;
  const { clockWageTipShown: _x, ...rest } = s; return rest as GameState;
}
/** AC-FC11: the tip is due (on the first yawn) only with clockWage on and not yet shown in this save. */
export const clockWageTipDue = (s: GameState, b: Balance) => clockWageOn(b) && s.clockWageTipShown !== true;
