/**
 * v5 F1b: the attended ("focus") clock and wall-clock timer checks (engineering/m5.0-sizing.md §1 F1(b), §12.1 D-C3, §13 GE-15).
 *  - Game decides per frame whether the player is attending (tab visible, no menu/sheet/modal, game live) and passes the
 *    frame's focus ms into advance(). focusDt = min(frame dt, FOCUS_DT_MAX_S); a gap >= offlineMinSeconds gives 0.
 *  - advance() spreads it over the frame's ticks: the FIRST ceil(focusMs / tickMs) ticks carry focus (M5 timers count down,
 *    timed effects live); the rest run with M5 timed effects suspended (D-C3). With no clock every tick is unfocused,
 *    which is exactly today's sim (M5 code never runs while every m4.flags.* is off anyway).
 *  - Wall-clock timers (abilities `readyAt`, epoch ms) are checked against an INJECTED now; step() never calls Date.now.
 */
/** HoP ruling (sizing §13 GE-15): a code constant, not a CSV column. Allowlisted by the F3 no-literal-tunables test. */
export const FOCUS_DT_MAX_S = 1.0;
/** Per-tick clock input to step(). `focus` = this tick carries focus time; `nowMs` = injected wall clock (epoch ms). */
export interface StepClock { focus: boolean; nowMs?: number; /** M5.1 breeds Q4: Farm level at the frame start. */ slotsFarm?: number; }
/** Per-frame clock input to advance(). `focusMs` = attended ms of this frame (already clamped by focusFrameMs). */
export interface FrameClock { focusMs: number; nowMs?: number; slotsFarm?: number; }
/** Focus seconds this tick contributes (0 when unfocused or no clock). */
export const tickFocusS = (dt: number, c?: StepClock) => (c?.focus ? dt : 0);
/** Focus ms for one frame: 0 if not attended, non-positive or >= the offline threshold (§9.1a); else min(gap, 1.0 s) (R5e). */
export function focusFrameMs(gapMs: number, attended: boolean, offlineMinS: number): number {
  if (!attended || !(gapMs > 0) || gapMs >= offlineMinS * 1000) return 0;
  return Math.min(gapMs, FOCUS_DT_MAX_S * 1000);
}
/** How many of a frame's ticks carry focus (D-C3): ceil(focusMs / tickMs), with a float guard. */
export const focusTicks = (focusMs: number, tickMs: number) => (focusMs > 0 ? Math.ceil(focusMs / tickMs - 1e-9) : 0);
/** Wall-clock timer: ms left until `atMs`, against injected `nowMs`, clamped to [0, capMs] on EVERY read
 *  (abilities E2b: clock rollback can't show more than one cooldown). Non-finite input = ready (D-C5 sanitising). */
export function wallRemainingMs(atMs: number | undefined, nowMs: number, capMs: number): number {
  if (typeof atMs !== 'number' || !Number.isFinite(atMs) || !Number.isFinite(nowMs)) return 0;
  return Math.max(0, Math.min(capMs, atMs - nowMs));
}
export const wallReady = (atMs: number | undefined, nowMs: number, capMs: number) => wallRemainingMs(atMs, nowMs, capMs) === 0;
/** The StepClock advance() hands to tick i of a frame whose first nFocus ticks carry focus (D-C3). */
export const tickClock = (i: number, nFocus: number, c: FrameClock): StepClock =>
  (c.slotsFarm === undefined ? { focus: i < nFocus, nowMs: c.nowMs } : { focus: i < nFocus, nowMs: c.nowMs, slotsFarm: c.slotsFarm });
