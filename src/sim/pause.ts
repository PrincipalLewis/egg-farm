/**
 * v5 F3 (HoE, manifest row 8): THE one read of Worker.paused (m5-worker-pause-spec; sizing §9.2 G3: `paused` is an orthogonal
 * flag, not a 5th mood). False whenever m4.flags.pause is 0 (or m4.enabled is 0), so a stray `paused: true` (old save, QA
 * setter) has no effect with the flag off. Every src read of `paused` goes through here (tests/v5-f3-is-paused.test.ts greps).
 * Saves' Pause sim and UI's QA setter read it through this selector too.
 */
import type { Balance } from '../config/balance';
import { flagOn } from '../config/flags';
import { tcNum } from '../config/formulas';
import type { GameState } from './state';
import type { Worker, WorkerId, Workers } from './workers';
export const isPaused = (w: Worker | undefined, b: Balance): boolean => !!w && w.paused === true && flagOn(b, 'pause');
/** CCR-F4 load sanitiser (pause spec E9 "non-boolean = false", rule 1/E12 "below the unlock: not paused"): drops `paused` unless it is a
 *  boolean and the farm is at or above tc_pause_unlock_farm (`open`). The same object when nothing changes. Called by save/m5-fields.ts m5Load. */
export const sanitizePausedOnLoad = (w: Worker, open: boolean): Worker => { if (!('paused' in w) || (open && typeof w.paused === 'boolean')) return w; const { paused: _p, ...rest } = w; return rest; };
const EPS = 1e-9;
/** Energy is a percent. Full tank is that scale, not a CSV column (same 0..100 as Worker.energy). */
export const ENERGY_FULL = 100;
/** Rule 3 / §6: energy after `dt` sim seconds paused. Recovers at rest_recovery_mult of the drain rate, capped at a full tank. No drain. */
export function pausedRecoveredEnergy(w: Worker, dt: number, b: Balance): number {
  return Math.min(ENERGY_FULL, w.energy + tcNum(b, 'rest_recovery_mult') * dt / b.workers.energy.drain_s_per_pct);
}
/** Rule 1: pause a hired worker at or above tc_pause_unlock_farm. Flag off, below the unlock, missing or already paused: the same state. */
export function pauseWorker(s: GameState, id: WorkerId, b: Balance): GameState {
  if (!flagOn(b, 'pause')) return s;
  const w = s.workers[id];
  if (!w || isPaused(w, b) || s.farmLevel < tcNum(b, 'pause_unlock_farm')) return s;
  return { ...s, workers: { ...s.workers, [id]: { ...w, paused: true } } };
}
/** Resume. Market Hand (B5) starts callLockoutS at tc_pause_call_lockout_s (45 sim seconds). Other workers get no lockout. */
export function resumeWorker(s: GameState, id: WorkerId, b: Balance): GameState {
  if (!flagOn(b, 'pause')) return s;
  const w = s.workers[id];
  if (!w || !isPaused(w, b)) return s;
  const next: Worker = { ...w, paused: false };
  if (id === 'market_hand') next.callLockoutS = tcNum(b, 'pause_call_lockout_s');
  return { ...s, workers: { ...s.workers, [id]: next } };
}
/** B5: Market Hand lockout counts down in sim seconds (not focus seconds). Absent at 0 (E9). Offline / hidden ≥ 60 s never call this
 *  on the kept state, so the lockout stays frozen there. The same workers object when the flag is off or nothing is running. */
export function tickCallLockout(ws: Workers, dt: number, b: Balance): Workers {
  if (!flagOn(b, 'pause')) return ws;
  const w = ws.market_hand;
  if (!w || typeof w.callLockoutS !== 'number' || !(w.callLockoutS > 0)) return ws;
  const left = w.callLockoutS - dt;
  if (left <= EPS) { const { callLockoutS: _c, ...rest } = w; return { ...ws, market_hand: rest }; }
  return { ...ws, market_hand: { ...w, callLockoutS: left } };
}
