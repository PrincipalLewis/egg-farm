/** v5 Hire2/v5-clockwage: running-wage UI copy (failure-cost v0.3.24 §4 Art final; AC-FC8/9/10/11/12). Pure; every string is behind
 *  m4.flags.clockWage at its call site. Money = fmtMoney of balance-derived cents; {pct} from workers.grader.asleep_bonus_share (FZ-2). */
import type { Balance } from '../config/balance';
import { clockWageOn, clockWageTipDue, wagePerMinCents, type WageWorker } from '../sim/clock-wage';
import type { GameState } from '../sim/state';
import { mood, isYawning, WORKERS, type WorkerId, type WorkerMood } from '../sim/workers';
import { isPaused } from '../sim/pause';
import { fmtMoney } from './format';

const isWageWorker = (id: WorkerId): id is WageWorker => id === 'market_hand' || id === 'coop_hand';
/** AC-FC8: "Still paid $X/min" for a hired, Asleep (not Unpaid) MH/CH with the flag on; null otherwise (Unpaid keeps "Resumes at $X"). */
export function stillPaidCaption(s: GameState, id: WorkerId, b: Balance): string | null {
  if (!clockWageOn(b) || !isWageWorker(id) || mood(s.workers[id], b) !== 'asleep' || isPaused(s.workers[id], b)) return null; // FC-R2: Paused is wage-free
  return `Still paid ${fmtMoney(wagePerMinCents(id, s.farmLevel, b))}/min`;
}
/** §4 / FC-G12: aria-describedby sentence of the Refill button while Asleep (never an aria-label). */
export const stillPaidDescription = (role: string, perMinCents: number) =>
  `${role} is asleep and still paid ${fmtMoney(perMinCents)} per minute. Refill to get them working.`;
/** AC-FC9 (v0.3.23/24): one toast per fall-asleep onset, all four roles, exact Art strings; flag-gated by the caller. */
export function asleepToast(id: WorkerId, b: Balance): string {
  switch (id) {
    case 'market_hand': return 'Market Hand fell asleep. Auto-selling stopped, wage still running.';
    case 'coop_hand': return 'Coop Hand fell asleep. Collecting stopped, wage still running.';
    case 'hawker': return 'Hawker fell asleep: sales slowed. Tap Refill.';
    case 'grader': return `Egg Grader fell asleep: bonus down to ${Math.round(b.workers.grader.asleep_bonus_share * 100)}%. Tap Refill.`;
  }
}
/** AC-FC9 onset (Architect M1): a fall-asleep toast only on a Working/Tired -> Asleep change. The Unpaid -> resume event
 *  (worker_state asleep from the wage check) and Asleep <-> Unpaid flips never toast. `observe` runs once per rendered frame
 *  (after g.frame()), so `last` is the mood at the previous frame; `onState` is called for each worker_state event. */
export class FallAsleepToasts {
  private last: Partial<Record<WorkerId, WorkerMood | null>> = {};
  observe(s: GameState, b: Balance) { for (const id of WORKERS) this.last[id] = mood(s.workers[id], b); }
  onState(id: WorkerId, state: WorkerMood): boolean { const p = this.last[id]; this.last[id] = state; return state === 'asleep' && (p === 'working' || p === 'tired'); }
}
/** AC-FC11 trigger: the first yawn of a wage-paying worker (MH/CH) while the tip is still due in this save. */
export const clockWageTipNow = (s: GameState, b: Balance) => clockWageTipDue(s, b) && (isYawning(s.workers.market_hand, b) || isYawning(s.workers.coop_hand, b));
/** AC-FC11: one-time yawn tip copy (first yawn per save; save flag clockWageTipShown, S5). */
export const CLOCK_WAGE_TIP = 'Sleeping workers still get paid. Refill to wake them.';
/** AC-FC12 duration: floor to whole seconds FIRST, then m:ss below one hour, h:mm:ss from one hour. Never "60:00". */
export function sleptDuration(seconds: number): string {
  const t = Math.max(0, Math.floor(seconds)), p = (n: number) => String(n).padStart(2, '0');
  if (t < 3600) return `${Math.floor(t / 60)}:${p(t % 60)}`;
  return `${Math.floor(t / 3600)}:${p(Math.floor(t % 3600 / 60))}:${p(t % 60)}`;
}
/** AC-FC12 / §4.3: welcome-back line "{Role} slept {t} and was paid $Y"; null when Y = 0 (no line). */
export const welcomeBackWageLine = (role: string, asleepS: number, paidCents: number): string | null =>
  paidCents > 0 ? `${role} slept ${sleptDuration(asleepS)} and was paid ${fmtMoney(paidCents)}` : null;
/** AC-FC12 modal markup: one line per wage role (MH then CH) with Y > 0, from Game.clockWageSinceWelcome(); '' with clockWage off or nothing paid. */
export function welcomeBackWageHtml(v: Record<'market_hand' | 'coop_hand', { asleepS: number; cents: number }>, b: Balance): string {
  if (!clockWageOn(b)) return '';
  const rows = ([['market_hand', 'Market Hand'], ['coop_hand', 'Coop Hand']] as const).map(([id, n]) => welcomeBackWageLine(n, v[id].asleepS, v[id].cents)).filter((x): x is string => x !== null);
  return rows.map(r => `<div class="wb-wage">${r}</div>`).join('');
}
