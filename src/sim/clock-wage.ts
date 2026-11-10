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
  const out: GameState = { ...s, coinsCents: s.coinsCents - cents, wageFracCents: { ...s.wageFracCents, [id]: frac }, workers: { ...s.workers, [id]: { ...w, cdS } } };
  return cents > 0 ? addAsleepCents(out, id, cents) : out;
}
// ---- Asleep clock (Architect ruling 4 / M3 + M4; D-HOE-57 amendment: Hire 2 owns session_end.asleep_s). ONE predicate, ONE writer.
// Live sim only: offline never steps (FC-R5); a dropped hidden sim is reverted with the hide snapshot. Counts mood 'asleep' (Unpaid excluded,
// FC-R4 precedence) and not paused. Integer ms. Refill later ORs autoRefill into asleepClockOn (one line, no second writer).
/** Gate for session_end.asleep_s and the asleep clock (today clockWage only). */
export const asleepClockOn = (b: Balance): boolean => clockWageOn(b);
const WAGE_WORKERS: readonly WageWorker[] = ['market_hand', 'coop_hand'];
type Win = NonNullable<GameState['clockWageWindow']>;
const bump = (win: Win | undefined, id: WageWorker, ms: number, cents: number): Win => {
  const r = win?.[id] ?? { asleepMs: 0, cents: 0 }; return { ...win, [id]: { asleepMs: r.asleepMs + ms, cents: r.cents + cents } };
};
function addAsleepCents(s: GameState, id: WageWorker, cents: number): GameState {
  return { ...s, asleepPaidCents: (s.asleepPaidCents ?? 0) + cents, clockWageWindow: bump(s.clockWageWindow, id, 0, cents) };
}
/** Called once per step() after the energy loop. Same object when the clock is off or no wage worker is Asleep. */
export function tickAsleepClock(s: GameState, dtMs: number, b: Balance): GameState {
  if (!asleepClockOn(b)) return s;
  let out = s;
  for (const id of WAGE_WORKERS) { const w = s.workers[id]; if (!w || isPaused(w, b) || mood(w, b) !== 'asleep') continue;
    out = { ...out, asleepSessionMs: (out.asleepSessionMs ?? 0) + dtMs, ...(clockWageOn(b) ? { clockWageWindow: bump(out.clockWageWindow, id, dtMs, 0) } : {}) }; }
  return out;
}
/** session_end fields, each under its own gate (FC §6 L168): asleep_s (0.1 s) with asleepClockOn, wage_paid_asleep_cents with clockWageOn. */
export function asleepSessionEnd(s: GameState, b: Balance): { asleep_s?: number; wage_paid_asleep_cents?: number } {
  return { ...(asleepClockOn(b) ? { asleep_s: Number(((s.asleepSessionMs ?? 0) / 1000).toFixed(1)) } : {}), ...(clockWageOn(b) ? { wage_paid_asleep_cents: s.asleepPaidCents ?? 0 } : {}) };
}
/** Session rotation (and session_end): a new session starts at 0. Shared with Refill's G0 M2 reset. */
export function resetAsleepSession(s: GameState): GameState {
  if (!('asleepSessionMs' in s) && !('asleepPaidCents' in s)) return s;
  const { asleepSessionMs: _a, asleepPaidCents: _c, ...rest } = s; return rest as GameState;
}
/** AC-FC12 read view: per role {asleepS, cents} since the last welcome-back close. */
export function clockWageWindowView(s: GameState): Record<WageWorker, { asleepS: number; cents: number }> {
  const v = (id: WageWorker) => { const r = s.clockWageWindow?.[id]; return { asleepS: r ? r.asleepMs / 1000 : 0, cents: r?.cents ?? 0 }; };
  return { market_hand: v('market_hand'), coop_hand: v('coop_hand') };
}
/** Welcome-back close (collectOffline / dismissOffline reducer): a new window starts, also when Y = 0. Identity with clockWage off. */
export function resetClockWageWindow(s: GameState, b: Balance): GameState {
  if (!clockWageOn(b) || !('clockWageWindow' in s)) return s;
  const { clockWageWindow: _w, ...rest } = s; return rest as GameState;
}
/** §4 caption $X: that worker's wage per minute at Farm F, cents (W1 0.25·F, W2 0.5·F $/min from balance). */
export const wagePerMinCents = (id: WageWorker, farm: number, b: Balance) => Math.round(b.workers[id].wage_per_farm_per_min * farm * CENTS_PER_DOLLAR);

// ---- S5 (Saves-approved) + Architect ruling 2: clockWageTipShown and clockWageWindow are OPTIONAL saved fields (M5Fields / M5_SAVED_FIELDS in m5-state.ts), no
// SAVE_VERSION bump (AC-FC11). Its sanitiser runs inside save/m5-fields.ts m5Load, so every load path gets it.
/** Load sanitiser (called from m5Load): non-boolean clockWageTipShown dropped (= not shown); clockWageWindow cleaned. Identity with clockWage off
 *  (fields of an off flag are written back verbatim, E13 pattern). */
export function clockWageLoad(s: GameState, b: Balance): GameState {
  if (!clockWageOn(b)) return s;
  let out = s;
  if ('clockWageTipShown' in out && typeof out.clockWageTipShown !== 'boolean') { const { clockWageTipShown: _x, ...rest } = out; out = rest as GameState; }
  if ('clockWageWindow' in out) { const w = sanitizeWindow(out.clockWageWindow); const { clockWageWindow: _w, ...rest } = out; out = (w ? { ...rest, clockWageWindow: w } : rest) as GameState; }
  return out;
}
const okInt = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
/** clockWageWindow sanitiser: non-object -> absent; an entry without non-negative integer asleepMs + cents is dropped; empty -> absent. */
function sanitizeWindow(v: unknown): Win | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const out: Win = {};
  for (const id of WAGE_WORKERS) { const e = (v as any)[id]; if (e && typeof e === 'object' && okInt(e.asleepMs) && okInt(e.cents)) out[id] = { asleepMs: e.asleepMs, cents: e.cents }; }
  return Object.keys(out).length ? out : undefined;
}
/** AC-FC11: the tip is due (on the first yawn) only with clockWage on and not yet shown in this save. */
export const clockWageTipDue = (s: GameState, b: Balance) => clockWageOn(b) && s.clockWageTipShown !== true;
