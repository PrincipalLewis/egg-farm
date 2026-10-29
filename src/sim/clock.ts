/**
 * v5 F1b subset (feat/v5-f1b, not on rc/v5 yet): the attended ("focus") clock, the minimum the #2 streak needs. Names and
 * bodies are F1b's sim/clock.ts verbatim; on merge take F1b's file (it adds the wall-clock helpers).
 *  - Game passes the frame's focus ms into advance(): min(frame dt, FOCUS_DT_MAX_S), 0 for a gap >= offlineMinSeconds.
 *  - The FIRST ceil(focusMs / tickMs) ticks of a frame carry focus; the rest run with M5 timed effects suspended (D-C3).
 */
/** HoP ruling (sizing §13 GE-15): a code constant, not a CSV column. */
export const FOCUS_DT_MAX_S = 1.0;
/** Per-tick clock input to step(). `focus` = this tick carries focus time. */
export interface StepClock { focus: boolean; nowMs?: number; }
/** Per-frame clock input to advance(). `focusMs` = attended ms of this frame (already clamped by focusFrameMs). */
export interface FrameClock { focusMs: number; nowMs?: number; }
/** Focus ms for one frame: 0 if not attended, non-positive or >= the offline threshold (§9.1a); else min(gap, 1.0 s) (R5e). */
export function focusFrameMs(gapMs: number, attended: boolean, offlineMinS: number): number {
  if (!attended || !(gapMs > 0) || gapMs >= offlineMinS * 1000) return 0;
  return Math.min(gapMs, FOCUS_DT_MAX_S * 1000);
}
/** How many of a frame's ticks carry focus (D-C3): ceil(focusMs / tickMs), with a float guard. */
export const focusTicks = (focusMs: number, tickMs: number) => (focusMs > 0 ? Math.ceil(focusMs / tickMs - 1e-9) : 0);
/** The StepClock advance() hands to tick i of a frame whose first nFocus ticks carry focus (D-C3). */
export const tickClock = (i: number, nFocus: number, c: FrameClock): StepClock => ({ focus: i < nFocus, nowMs: c.nowMs });
