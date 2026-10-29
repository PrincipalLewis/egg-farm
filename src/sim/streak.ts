/**
 * v5 #2 Collect Streak sim (product/collection/m5-streak-tap-coins-spec.md v1.1 §3/§8, sizing §2 #2 and §9.5, D-HOP-08 #2).
 * A credited Collect adds tc_streak_per_tap to s (max tc_streak_cap); s holds tc_streak_hold_s then decays
 * tc_streak_decay_per_s, both on FOCUS seconds only (R6/R7/R12); one (1 + s) price factor on every sale (R8). The
 * credit window is sim time (R2). s, hold, window and run stats are session only (save/m5-fields.ts M5_SESSION_KEYS).
 * Off unless m4.flags.streak is on; validateBalance then requires its tc columns (M5_TC_KEYS; the G3 ones land with row 4).
 * No UI here (row 17): tier pops/meter read streakS and streakTier().
 */
import type { Balance } from '../config/balance';
import { m4On, tcNum as tc } from '../config/formulas';
import type { GameState } from './state';
import type { SimEvent, Sink } from './events';
/** One streak run (s > 0 until it ends), for streak_peak. Focus seconds; extraCents = the streak share of sale credits. */
export interface StreakRun { peak: number; durationS: number; creditedTaps: number; timeAtCapS: number; extraCents: number; frenzyOverlapS: number; }
const EPS = 1e-9, r12 = (x: number) => Math.round(x * 1e12) / 1e12, r2 = (x: number) => Math.round(x * 100) / 100;
export const streakOn = (b: Balance) => m4On(b) && b.m4?.flags?.streak === 1;
/** Streak hold, then decay, over `dtFocus` focus seconds in ONE step (spec §6 formula; dt < 0 counts as 0). */
export function streakAfter(sv: number, holdS: number, dtFocus: number, b: Balance): { s: number; holdS: number } {
  const dt = Math.max(0, dtFocus); if (dt <= holdS) return { s: sv, holdS: holdS - dt };
  return { s: Math.max(0, sv - tc(b, 'streak_decay_per_s') * (dt - holdS)), holdS: 0 };
}
/** §3.3: the highest tier k (0..tc_streak_tier_count) with s >= T_k = round_to_step(cap x k / count), step = per_tap. */
export function streakTier(sv: number, b: Balance): number {
  const n = tc(b, 'streak_tier_count'), cap = tc(b, 'streak_cap'), st = tc(b, 'streak_per_tap'); let k = 0;
  while (k < n && sv >= Math.round((cap * (k + 1)) / n / st) * st - EPS) k++;
  return k;
}
/** R8: the (1 + s) sale factor; 1 when off, at 0, or on a tick without focus (`suspended`, R12/D-C3). */
export const streakSaleFactor = (s: GameState, b: Balance, suspended?: boolean) =>
  !suspended && (s.streakS ?? 0) > 0 && streakOn(b) ? 1 + s.streakS! : 1;
const newRun = (peak: number): StreakRun => ({ peak, durationS: 0, creditedTaps: 0, timeAtCapS: 0, extraCents: 0, frenzyOverlapS: 0 });
/** R2/R3/R5/R6: a player Collect (the 'collect' action only). credited = undefined while off (rc1 event shape). */
export function creditTap(s: GameState, b: Balance): { s: GameState; credited?: boolean; started?: boolean } {
  if (!streakOn(b)) return { s };
  if (s.farmLevel < tc(b, 'streak_unlock_farm') || (s.tapCreditCdS ?? 0) > EPS) return { s, credited: false };
  const prev = s.streakS ?? 0, v = r12(Math.min(tc(b, 'streak_cap'), prev + tc(b, 'streak_per_tap'))), run = s.streakRun ?? newRun(v);
  const streakRun = { ...run, peak: Math.max(run.peak, v), creditedTaps: run.creditedTaps + 1 };
  return { s: { ...s, streakS: v, streakHoldS: tc(b, 'streak_hold_s'), tapCreditCdS: tc(b, 'tap_credit_min_s'), streakRun }, credited: true, started: !(prev > 0) };
}
/** sellTo: adds the streak share of one sale (value minus the same sale at s = 0) to the run. */
export const addStreakExtra = (s: GameState, cents: number): GameState =>
  cents > 0 ? { ...s, streakRun: { ...(s.streakRun ?? newRun(s.streakS ?? 0)), extraCents: (s.streakRun?.extraCents ?? 0) + cents } } : s;
/** streak_peak for the run in `s` (null at s = 0 with no run). */
export function streakPeak(s: GameState, reason: 'decay' | 'offline' | 'reload', b: Balance): SimEvent | null {
  const r = s.streakRun ?? newRun(0), v = Math.max(r.peak, s.streakS ?? 0); if (!(v > 0)) return null;
  return { type: 'streak_peak', value: v, duration_s: r2(r.durationS), credited_taps: r.creditedTaps, time_at_cap_s: r2(r.timeAtCapS),
    extra_coins: r.extraCents, frenzy_overlap_s: r2(r.frenzyOverlapS), reason, max_tier: streakTier(v, b) };
}
/** Ends the run: streak_peak (if any), s = 0, hold 0, run dropped. R11 (offline) and K5 (decay). */
export function endStreak(s: GameState, reason: 'decay' | 'offline', b: Balance, ev?: Sink): GameState {
  const p = streakPeak(s, reason, b); if (p) ev?.push(p);
  const { streakRun: _r, ...o } = s; return { ...o, streakS: 0, streakHoldS: 0 };
}
/** Per tick: the credit window counts down in sim time (R2, hidden ticks too); hold/decay and run stats use focus seconds
 *  only (frozen otherwise, R10/R12). K18: s clamps to a lowered cap. Reaching 0 ends the run (reason "decay"). */
export function streakTick(s: GameState, dt: number, focusS: number, b: Balance, ev?: Sink): GameState {
  if (!streakOn(b)) return s;
  const cd = s.tapCreditCdS ?? 0, sv0 = s.streakS ?? 0; if (!(sv0 > 0) && !(cd > 0)) return s;
  const o: GameState = cd > 0 ? { ...s, tapCreditCdS: Math.max(0, r12(cd - dt)) } : s;
  if (!(sv0 > 0)) return o;
  const cap = tc(b, 'streak_cap'), sv = Math.min(sv0, cap);
  if (!(focusS > 0)) return sv === sv0 ? o : { ...o, streakS: sv };
  const r = streakAfter(sv, o.streakHoldS ?? 0, focusS, b), run = o.streakRun ?? newRun(sv);
  const streakRun = { ...run, durationS: run.durationS + focusS, timeAtCapS: run.timeAtCapS + (sv >= cap - EPS ? Math.min(focusS, o.streakHoldS ?? 0) : 0),
    frenzyOverlapS: run.frenzyOverlapS + ((o.frenzyRemainingS ?? 0) > 0 ? focusS : 0) };
  const out = { ...o, streakS: r12(r.s), streakHoldS: r12(r.holdS), streakRun };
  return out.streakS > EPS ? out : endStreak(out, 'decay', b, ev);
}
