/**
 * Telemetry-session rotation hook (v5-tel-envelope / TEL-AC1 hidden >= session_hidden_end_s).
 *
 * Game calls `resetSessionFields` once per rotation on the live `this.state`, in both paths
 * (visibilitychange show after a hide >= 60 s, and R6 bfcache pageshow{persisted}), after
 * Telemetry.endSession has finished A1 (session_end, then session_summary, then every
 * contributor reset()), and never in a read-only / frozen tab (R7) or on a hide < 60 s.
 *
 * On the visibilitychange path a hide >= offlineMinSeconds later restores the hide snapshot
 * (`settleHiddenPeriod`: `this.state = h.state`) and drops the provisional sim, so Game also
 * calls the hook on `this.hidden.state` when that object differs from `this.state` — it is the
 * state that survives the rotation. Idempotent; same object → one call. The R6 path has no
 * such restore and stays a single call.
 *
 * This is the single sim-level plug-in point. It zeros the session_end pause and present
 * accumulators (pausedForS; breedsCalm.activeMs / lostCount) so both this.state and the
 * restored hide snapshot start the new sid at 0. ClockWage and Refill each add a one-line
 * call here (Hire 2: resetAsleepSession; Saves G0 M2: resetRefillSession). They also add their
 * never-saved keys to M5_SESSION_FIELDS in m5-state.ts so m5Persist strips them — that list
 * is the strip-on-serialize registry, not a wipe list. Page-lifetime fields already on it
 * (goldenEgg, streakS, streakHoldS, tapCreditCdS, irefRingCents, refWarmS, broodyNestScaled,
 * brRngState) must NOT be cleared here: they survive a mid-play rotate, and wiping them
 * would change goldens and product behaviour. Flag-off is byte-identical (no saved-state
 * shape change, no SAVE_VERSION bump).
 *
 * Immutable helpers that return a new GameState should copy their deletions onto `s`
 * (the hook is void and mutates in place):
 *   const next = resetAsleepSession(s); if (next !== s) { for (const k of Object.keys(s)) if (!(k in next)) delete (s as unknown as Record<string, unknown>)[k]; Object.assign(s, next); }
 */
import type { GameState } from './state';
import { resetPausedSession } from './pause';
import { resetPresentSession } from './breeds-traits';
import { resetRefillSession } from './refill';

export function resetSessionFields(s: GameState): void {
  resetPausedSession(s); // #138 CCR MAJOR-1: zeros pausedForS sumS/allS only; do not add a second pausedForS reset
  resetPresentSession(s);
  // G0 M2 / #133: resetRefillSession is immutable (returns a new object, drops refillSession + refillAgoMs).
  // Copy deletions onto `s` so the hide snapshot Game holds is updated in place (documented pattern above).
  const next = resetRefillSession(s);
  if (next !== s) {
    for (const k of Object.keys(s)) if (!(k in next)) delete (s as unknown as Record<string, unknown>)[k];
    Object.assign(s, next);
  }
  // Extension point — clockWage adds its one-line reset (resetAsleepSession) above this comment.
}
