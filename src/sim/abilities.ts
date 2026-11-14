/**
 * v5 #4 worker abilities ("Shift calls") sim: eligibility, fireAbility, activateAll and the call timer
 * (product/workers/m5-worker-abilities-spec.md v1.3.11 rules 2-7, 10, 11, E14; contract of record:
 * engineering/reviews/arch-golden-slice2-contracts-20261105.md ADDENDUM `fireAbility` API 2026-11-05 21:29 CET).
 *  - Clock: `nowMs` is the INJECTED wall epoch (Game: this.now(); tests: deterministic). On success
 *    readyAt = nowMs + tc_ability_cd_s * 1000; eligibility reads wallReady() (F1b sim/clock.ts, E2/E2b). Never Date.now.
 *  - Duration: activeS (focus seconds) counts down only on focus ticks (F1b). A call fired from the sheet is therefore
 *    suspended until sheetCloseComplete as long as Game keeps the closing sheet counted as a menu (rule 10, AB-14 (ii)):
 *    the sim stores no "pending close" state. Early end (asleep / unpaid / paused) clears activeS, never readyAt (rule 6).
 *  - Effects enter through sim/effects.ts (Rush, Shout, Sweep) and graderMult's tier add (Inspect); all are 1 when suspended.
 *  - Telemetry: direct blocked taps emit ability_blocked{count:1}; TEL-9 coalescing and the 50-event session cap belong to
 *    the telemetry layer. Activate-all skips ineligible workers silently.
 */
import type { Balance } from '../config/balance';
import { flagOn } from '../config/flags';
import { tcNum } from '../config/formulas';
import { wallReady } from './clock';
import type { AbilityBlockReason, SimEvent, Sink } from './events';
import { isPaused } from './pause';
import type { GameState } from './state';
import { WORKERS, mood, type WorkerId } from './workers';

/** Not-available reasons: no call UI exists, so no telemetry (rule 1, E8, E13). `no_clock` = non-finite nowMs. */
export type AbilityUnavailable = 'flag_off' | 'locked' | 'not_hired' | 'no_clock';
export type AbilityEligibility = { eligible: true } | { eligible: false; reason: AbilityBlockReason | AbilityUnavailable };
export interface FireOpts {
  inSheet: boolean; viaAll: boolean; nowMs: number;
  /** Rule 11 / Architect #112 §2 (APPROVED WITH GUARDS): SIM ms since this worker's MANUAL refill tap (refill_used{by:manual}),
   *  measured and injected by the caller (rc2 Refill / Game). Read ONLY when abilities && rc2Refill && inSheet && !viaAll; absent,
   *  non-finite or < 0 => no combo (never throws); inclusive <= combo_window_s * 1000. Activate-all never passes or reads it.
   *  This module never invents, stores or persists a refill clock. Not the wall `nowMs`. */
  refillAgoSimMs?: number;
}
export type FireResult =
  | { ok: true; state: GameState; events: SimEvent[]; closeSheet: boolean; combo: boolean }
  | { ok: false; reason: AbilityBlockReason | AbilityUnavailable; state: GameState; events: SimEvent[]; closeSheet: false };
export interface ActivateAllResult { state: GameState; events: SimEvent[]; fired: WorkerId[]; closeSheet: boolean }

const on = (b: Balance) => flagOn(b, 'abilities');
const EPS = 1e-9;
/** A call is running (and its effect is live when the tick has focus). */
export const abilityActive = (s: GameState, b: Balance, id: WorkerId) => on(b) && (s.abilities?.[id]?.activeS ?? 0) > EPS;

/** Rule 4, first reason in the rule-4 order: Asleep, Unpaid, Paused, lockout (Pause G2), cooldown. */
export function abilityEligibility(s: GameState, id: WorkerId, b: Balance, nowMs: number): AbilityEligibility {
  if (!on(b)) return { eligible: false, reason: 'flag_off' };
  if (!Number.isFinite(nowMs)) return { eligible: false, reason: 'no_clock' };
  const w = s.workers[id]; if (!w) return { eligible: false, reason: 'not_hired' };
  if (s.farmLevel < tcNum(b, 'ability_unlock_farm')) return { eligible: false, reason: 'locked' };
  const m = mood(w, b);
  if (m === 'asleep' || m === 'unpaid') return { eligible: false, reason: m };
  if (isPaused(w, b)) return { eligible: false, reason: 'paused' };
  if (flagOn(b, 'pause') && (w.callLockoutS ?? 0) > EPS) return { eligible: false, reason: 'lockout' };
  if (!wallReady(s.abilities?.[id]?.readyAt, nowMs, tcNum(b, 'ability_cd_s') * 1000)) return { eligible: false, reason: 'cooldown' };
  return { eligible: true };
}

/** Rule 11 window (Architect #112 §2 guards 1-3): abilities && rc2Refill, finite 0 <= sim ms since the manual refill
 *  <= tc combo_window_s * 1000 (inclusive, SG-3). The window value comes from balance via tcNum only (no prod literal). */
export function comboQualifies(b: Balance, refillAgoSimMs: number | undefined): boolean {
  if (!on(b) || !flagOn(b, 'rc2Refill') || typeof refillAgoSimMs !== 'number' || !Number.isFinite(refillAgoSimMs) || refillAgoSimMs < 0) return false;
  return refillAgoSimMs <= tcNum(b, 'combo_window_s') * 1000;
}

const isBlockReason = (r: string): r is AbilityBlockReason => r === 'cooldown' || r === 'asleep' || r === 'unpaid' || r === 'paused' || r === 'lockout';

/** One call. ok -> readyAt/activeS set, one ability_used; blocked -> state unchanged, one ability_blocked unless viaAll or unavailable. */
export function fireAbility(s: GameState, id: WorkerId, b: Balance, o: FireOpts): FireResult {
  const el = abilityEligibility(s, id, b, o.nowMs);
  if (!el.eligible) {
    const events: SimEvent[] = !o.viaAll && isBlockReason(el.reason) ? [{ type: 'ability_blocked', worker: id, reason: el.reason, count: 1 }] : [];
    return { ok: false, reason: el.reason, state: s, events, closeSheet: false };
  }
  // Guards 1 + 4: only a direct sheet Boost may combo; viaAll forces non-combo and the window is not even read.
  const w = s.workers[id]!, prev = s.abilities?.[id], combo = o.inSheet && !o.viaAll && comboQualifies(b, o.refillAgoSimMs);
  // Granted focus duration of this call (v1.3.12 AbilityState.durS): tc_ability_s, or tc combo_boost_duration_s for a combo.
  const durS = combo ? tcNum(b, 'combo_boost_duration_s') : tcNum(b, 'ability_s');
  const r = prev?.readyAt, sinceReady = typeof r === 'number' && Number.isFinite(r) ? Math.max(0, o.nowMs - r) / 1000 : 0;
  const { activeS: _a, durS: _d, ...keep } = prev ?? {};
  const abilities = { ...s.abilities, [id]: { ...keep, readyAt: o.nowMs + tcNum(b, 'ability_cd_s') * 1000, activeS: durS, durS } };
  const state: GameState = { ...s, abilities };
  const ev: SimEvent = { type: 'ability_used', worker: id, farm: s.farmLevel, energy_pct: w.energy, mood: mood(w, b)!,
    via_all: o.viaAll, t_since_ready_s: sinceReady, in_sheet: o.inSheet, combo };
  return { ok: true, state, events: [ev], closeSheet: o.inSheet && !o.viaAll, combo };
}

/** Rule 7 / E14 (c): every eligible worker in WORKERS order (MH -> CH -> Hawker -> Grader) in one pass; skips are silent; one
 *  close request when anything fired from the sheet. No combo (via_all:true). */
export function activateAll(s: GameState, b: Balance, o: { inSheet: boolean; nowMs: number }): ActivateAllResult {
  const events: SimEvent[] = [], fired: WorkerId[] = [];
  for (const id of WORKERS) {
    const r = fireAbility(s, id, b, { inSheet: o.inSheet, viaAll: true, nowMs: o.nowMs }); // no refillAgoSimMs: never a combo
    if (r.ok) { s = r.state; events.push(...r.events); fired.push(id); }
  }
  return { state: s, events, fired, closeSheet: o.inSheet && fired.length > 0 };
}

/** TimerSystem body (sim/timers.ts): early end (rule 6), then focus countdown and expiry. Identity unless the flag is on and a
 *  call is running. effect_s = focus seconds run (durS - activeS; durS absent => tc_ability_s). Ending a call clears activeS and
 *  durS together, never readyAt. (Load / offline end of a saved call is Saves-owned: m5-fields endCalls.) */
export function abilitiesTick(s: GameState, focusS: number, b: Balance, ev?: Sink): GameState {
  if (!on(b) || !s.abilities) return s;
  let abilities: GameState['abilities'] | undefined;
  for (const id of WORKERS) {
    const a = s.abilities[id]; if (!a || !((a.activeS ?? 0) > EPS)) continue;
    const dur = typeof a.durS === 'number' && Number.isFinite(a.durS) && a.durS > 0 ? a.durS : tcNum(b, 'ability_s'), w = s.workers[id], m = mood(w, b);
    const early = !w ? null : m === 'asleep' || m === 'unpaid' ? m : isPaused(w, b) ? 'paused' : null;
    const left = early ? a.activeS! : a.activeS! - focusS;
    if (early || left <= EPS) {
      ev?.push({ type: 'ability_ended', worker: id, cause: early ?? 'expired', effect_s: early ? dur - a.activeS! : dur });
      const { activeS: _x, durS: _y, ...rest } = a; abilities = { ...(abilities ?? s.abilities), [id]: rest };
    } else if (left !== a.activeS) abilities = { ...(abilities ?? s.abilities), [id]: { ...a, activeS: left } };
  }
  return abilities ? { ...s, abilities } : s;
}

/** Inspect (rule 2): tier add for graderMult while the Grader's call runs on a focus tick; 0 otherwise. */
export const inspectTierAdd = (s: GameState, b: Balance, suspended: boolean | undefined) =>
  !suspended && abilityActive(s, b, 'grader') ? tcNum(b, 'ability_w4_tier_add') : 0;
