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
import type { Sink } from './events';
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
  return { ...s, workers: { ...s.workers, [id]: { ...w, paused: true } }, pausedForS: { ...s.pausedForS, [id]: 0 } }; // pause start: count from 0
}
/** paused_duration_s (D-PMW-2026-11-10-02, QA-D-1110-PAUDUR; Architect G2 ruling (b), G0-API.md rev 11 §14b): integer
 *  floor of ms/1000 at emit, from the never-saved pausedForS tracker (integer milliseconds internally). Always a
 *  number (never null, NaN or negative); a missing entry (reload, or a pause set without pauseWorker) reads 0, i.e.
 *  the count starts at load time. Known limits: a reload resets the count to load time; offline time and hidden
 *  gaps >= 60 s are not counted (sim time only). The one tracker for worker_resumed / rest_toggled{on:false}.paused_duration_s
 *  and session_end paused_worker_s / all_paused_s. */
export function pausedDurationS(s: GameState, id: WorkerId): number { return floorMsToS(s.pausedForS?.[id]); }
/** Integer floor of ms/1000 >= 0; anything not a finite positive number reads 0 (QA-D-1110-PAUDUR). Sanitiser shape unchanged. */
const floorMsToS = (v: unknown): number => typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v / 1000) : 0;
/** tick.ts: add Math.round(dt*1000) ms for every paused worker, that times the paused count to sumS, and the same to allS
 *  while every hired worker is paused (at least one hired). Flag off or nobody paused: the same object (no M5 field is created).
 *  Architect G2 ruling (b), G0-API.md rev 11 §14b. */
export function tickPausedFor(s: GameState, ws: Workers, dt: number, b: Balance): GameState['pausedForS'] {
  if (!flagOn(b, 'pause')) return s.pausedForS;
  const dtMs = Math.round(dt * 1000);
  let out: GameState['pausedForS'], hired = 0, paused = 0;
  for (const id of Object.keys(ws) as WorkerId[]) { if (!ws[id]) continue; hired++;
    if (isPaused(ws[id], b)) { paused++; out ??= { ...s.pausedForS }; out[id] = (s.pausedForS?.[id] ?? 0) + dtMs; } }
  if (!out) return s.pausedForS;
  out.sumS = (s.pausedForS?.sumS ?? 0) + dtMs * paused;
  if (paused === hired) out.allS = (s.pausedForS?.allS ?? 0) + dtMs;
  return out;
}
/** session_end additions (pause §12 L299; gate e485f762 card #T TEL-AC8/TEL-AC14): `paused_worker_s` (sum of paused seconds over
 *  workers) and `all_paused_s` (seconds while all hired workers were paused), integer floor of ms/1000 at emit, from the same
 *  never-saved integer-ms tracker (Architect G2 ruling (b), G0-API.md rev 11 §14b). Present only with pause = 1 and rc2Refill = 0;
 *  otherwise {} (absent). Known limits: a reload resets both to load time; offline time and hidden gaps >= 60 s are not counted
 *  (sim time only). Game.endSession spreads this into session_end. */
export function pauseSessionEnd(s: GameState, b: Balance): { paused_worker_s?: number; all_paused_s?: number } {
  if (!flagOn(b, 'pause') || flagOn(b, 'rc2Refill')) return {};
  return { paused_worker_s: floorMsToS(s.pausedForS?.sumS), all_paused_s: floorMsToS(s.pausedForS?.allS) };
}
/** Resume. Market Hand (B5) starts callLockoutS at tc_pause_call_lockout_s (45 sim seconds), on a Manage resume too (HoE 00:16).
 *  Other workers get no lockout. THE one worker_resumed emitter (pause §12, rule 8): cause 'manual' (Resume) or 'manage'
 *  (sim/actions.ts Manage on a paused worker). Exclusive emission (v1.3.11): with rc2Refill = 1 the toggle belongs to
 *  rest_toggled{on:false}, which has no emitter yet (rc2 not built), so nothing is emitted here then. */
export function resumeWorker(s: GameState, id: WorkerId, b: Balance, ev?: Sink, cause: 'manual' | 'manage' = 'manual'): GameState {
  if (!flagOn(b, 'pause')) return s;
  const w = s.workers[id];
  if (!w || !isPaused(w, b)) return s;
  const next: Worker = { ...w, paused: false };
  if (id === 'market_hand') next.callLockoutS = tcNum(b, 'pause_call_lockout_s');
  if (!flagOn(b, 'rc2Refill')) ev?.push({ type: 'worker_resumed', worker: id, farm: s.farmLevel,
    energy_pct: Math.min(ENERGY_FULL, Math.max(0, Math.round(next.energy))), paused_duration_s: pausedDurationS(s, id), cause });
  const out: GameState = { ...s, workers: { ...s.workers, [id]: next } };
  if (s.pausedForS && id in s.pausedForS) { const { [id]: _d, ...rest } = s.pausedForS; if (Object.keys(rest).length) out.pausedForS = rest; else delete out.pausedForS; }
  return out;
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
