/**
 * Saves risk-helpers PR (TASK HoE/v5-risk-helpers): the "Sales stopped" stall timers + chip state, the Rule 2 fatigue-cue
 * hysteresis, and the sales_stall / fatigue_cue_* emitters. Spec: product/market/sales-stopped-spec.md v1.3.27 (cfff3817)
 * §4.1-§4.8, §5, §7.1-§7.5, §8. API pinned in engineering/tasks/v5-ui-ss-fatigue/SIM-API.md (signatures unchanged; every
 * name is re-exported from econ/income.ts). UI reads stallView / fatigueCueView every frame and only calls the note* hooks.
 *
 * State: ONE never-saved session record, `GameState.stallSession` (F1a M5_SESSION_FIELDS, the pausedForS pattern; stripped
 * by m5Persist/serialize, so no save key and no SAVE_VERSION bump, §7.5 / SS-43). It exists only while
 * m4.flags.salesStopped is on: with the flag off nothing here writes state or emits (flag-off byte-identical, SS-21 gate 1).
 * Timers run on the focus clock (dt <= 1.0 s per frame, 0 offline/hidden/under a sheet). A gap >= 60 s resets them through
 * the single resetStallTimers() path (m5Offline; spec L246). Reload starts a fresh record (new episode, SS-45).
 *
 * Sales and collects are seen through the sim's own events (`sell` any `by`, `collect`, `worker_collect`): step() and apply()
 * hand this module the slice of the sink they appended (stallObserve). The note* hooks take no Balance and return void
 * (SIM-API), so they mutate s.stallSession and queue their telemetry; the next tick drains the queue into the sink.
 */
import type { Balance } from '../config/balance';
import { flagOn } from '../config/flags';
import { tcNum } from '../config/formulas';
import type { GameState } from '../sim/state';
import type { SimEvent, Sink } from '../sim/events';
import { mood, WORKERS, type WorkerId } from '../sim/workers';
import { isPaused } from '../sim/pause';
import { incomePerSec, workerAtRisk } from './income';

// ---- exported types (SIM-API "Additions", 01:36 CET) ----
export type StallCause = 'mh_asleep' | 'mh_paused' | 'mh_unpaid' | 'no_mh' | 'ch_asleep' | 'ch_unpaid' | 'other';
export type StallResolvedBy = 'chip_refill' | 'chip_sell_all' | 'chip_collect' | 'chip_manage' | 'refill_elsewhere' | 'sell_elsewhere' | 'collect_elsewhere'
  | 'auto_resume' | 'queue_empty' | 'basket_empty' | 'paused' | 'focus_lost' | 'cause_changed' | 'none';
export type FatigueSurface = 'hud_chip' | 'banner' | 'bubble';
export type StallChipAction = 'refill' | 'sell_all' | 'collect' | 'manage';
export type WorkerStateTag = 'working' | 'tired' | 'asleep' | 'unpaid' | 'paused' | 'none';
export interface StallView {
  shown: boolean;
  trigger: 'sell' | 'collect' | null;
  cause: StallCause | null;
  /** = telemetry sales_stall.stall_id (int >= 1, per-session counter); HoE ruling 2026-11-10 03:25 (was string). */
  stallId: number | null;
  noSaleS: number;
  noCollectS: number;
}
export interface FatigueCueView {
  share: number;
  shown: boolean;
  episodeId: string | null;
  suppressedByStall: boolean;
}

/** UI gates (HoE ruling 2026-11-10 03:25, SIM-API "Changes"): §4.3 extra gates the sim cannot see. The UI passes them in. */
export interface UiGates {
  /** The farm screen is the active view (§4.3). Leaving it only hides the chip (C6 rule): timers keep running. */
  farmScreenActive: boolean;
  /** onboarding.ts `finished` (§4.3). Part of T-SELL / T-COLLECT state conditions: false keeps the timers at 0. */
  onboardingDone: boolean;
}
/** Rule 2 hysteresis hold state (pure; cueStep). */
export interface CueHold { on: boolean; aboveS: number; belowS: number; }
/** The never-saved session record (M5_SESSION_FIELDS `stallSession`). Plain JSON data. */
export interface StallSession {
  /** Focus seconds since this record was created (= session start; §8 session_s). */
  sessionS: number;
  noSaleS: number; noCollectS: number;
  /** §8 focus_s_since_last_sale. */
  sinceSaleS: number;
  /** A sale / collect seen since the last tick (stallObserve; consumed by the tick). */
  sold: boolean; collected: boolean;
  /** Last tick's MH / CH state tag (C4 and Resume edges). */
  mhTag: WorkerStateTag; chTag: WorkerStateTag;
  // chip
  shown: boolean; trigger: 'sell' | 'collect' | null; cause: StallCause | null;
  /** Open pair id (int >= 1, per-session counter); stallSeq = last id issued. */
  stallId: number | null; stallSeq: number;
  shownAtS: number; tapped: StallChipAction | null;
  /** sessionS of the last C1-C5/C7 hide (re-arm), or null. */
  rearmFromS: number | null;
  /** Id of the pair closed by a C6 hide; the next show carries it as prev_stall_id (§4.5, §8). */
  c6PrevId: number | null;
  // Rule 2
  cue: CueHold; episode: number | null; episodeSeq: number;
  /** Surfaces already logged for the current episode (noteFatigueCueShown dedupe, FC-SV11). */
  cueLogged: FatigueSurface[];
  /** §5 C4 exception (rc2Refill = 0): display cleared, episode kept (SS-G39). */
  cueForceCleared: boolean;
  /** Build-time flags as of the last tick (the note* hooks take no Balance). */
  fatigueCueFlag: boolean;
  /** Last tick's fatigue payload (§8 six fields, values at the emit moment = the latest tick). */
  snap: FatigueSnap;
  /** Last setUiGates() values; both false until the UI first calls it (no chip before the UI wires the gates). */
  ui: UiGates;
  /** Telemetry queued by note* hooks; drained into the sink on the next tick. */
  out: SimEvent[];
}
export interface FatigueSnap { loss_per_s: number; loss_share: number; n_tired: number; n_asleep: number; n_paused: number; }

const EPS = 1e-9;
/** 0.1 s rounding for sales_stall time fields (spec §8: focus_s_since_last_sale, session_s, time_to_resolve_s). Unit scale, not a CSV column. */
export const STALL_TENTHS = 10;
/** §8 loss_per_s is an integer count in cents (fatigueLossPerSec is $/s). Unit scale, not a CSV column. */
export const CENTS_PER_DOLLAR = 100;
const r1 = (x: number) => Math.round(x * STALL_TENTHS) / STALL_TENTHS;
const on = (b: Balance) => flagOn(b, 'salesStopped');

/** §4.8 share guard (FC-AC6): loss / (income + loss); denominator <= 0 gives 1 when loss > 0, else 0. Always in [0, 1]. */
export function fatigueShareOf(loss: number, income: number): number {
  if (!(loss > 0)) return 0;
  const d = income + loss;
  if (!(d > 0) || !Number.isFinite(d)) return d > 0 ? 0 : 1;
  return Math.min(1, Math.max(0, loss / d));
}
/** §4.8 fatigueLoss in $/s: sum of workerAtRisk over the 4 roles, each floored at 0 (a heal that costs more wage than it
 *  earns is not a loss; §8 loss_per_s is a count >= 0). Paused and Unpaid workers are 0 by workerAtRisk. */
export function fatigueLossPerSec(s: GameState, b: Balance): number {
  let l = 0; for (const id of WORKERS) l += Math.max(0, workerAtRisk(id, s, b)); return l;
}

/** Rule 2 (§4.8): show at share >= min held `hold` focus seconds; clear at share < clear held `clearHold`. Pure. */
export function cueStep(h: CueHold, share: number, focusS: number, tc: { min: number; hold: number; clear: number; clearHold: number }): { next: CueHold; started: boolean; ended: boolean } {
  if (!(focusS > 0)) return { next: h, started: false, ended: false };
  if (!h.on) {
    const aboveS = share >= tc.min - EPS ? h.aboveS + focusS : 0;
    if (aboveS >= tc.hold - EPS) return { next: { on: true, aboveS: 0, belowS: 0 }, started: true, ended: false };
    return { next: { on: false, aboveS, belowS: 0 }, started: false, ended: false };
  }
  const belowS = share < tc.clear - EPS ? h.belowS + focusS : 0;
  if (belowS >= tc.clearHold - EPS) return { next: { on: false, aboveS: 0, belowS: 0 }, started: false, ended: true };
  return { next: { on: true, aboveS: 0, belowS }, started: false, ended: false };
}

/** §4.1 state precedence Paused > Unpaid > Asleep > Tired > Working (all 4 roles); 'none' = not hired. */
export function workerTag(s: GameState, id: WorkerId, b: Balance): WorkerStateTag {
  const w = s.workers[id]; if (!w) return 'none';
  if (isPaused(w, b)) return 'paused';
  return mood(w, b) ?? 'none';
}
const off = (t: WorkerStateTag) => t === 'asleep' || t === 'unpaid';

function freshSession(s: GameState, b: Balance): StallSession {
  return { sessionS: 0, noSaleS: 0, noCollectS: 0, sinceSaleS: 0, sold: false, collected: false,
    mhTag: workerTag(s, 'market_hand', b), chTag: workerTag(s, 'coop_hand', b),
    shown: false, trigger: null, cause: null, stallId: null, stallSeq: 0, shownAtS: 0, tapped: null, rearmFromS: null, c6PrevId: null,
    cue: { on: false, aboveS: 0, belowS: 0 }, episode: null, episodeSeq: 0, cueLogged: [], cueForceCleared: false,
    fatigueCueFlag: flagOn(b, 'fatigueCue'), ui: { farmScreenActive: false, onboardingDone: false }, snap: { loss_per_s: 0, loss_share: 0, n_tired: 0, n_asleep: 0, n_paused: 0 }, out: [] };
}

/** THE single reset path (§4.5 re-arm note, §7.2 L246; HoE d): every stall timer to 0, and the Rule 2 holds that have not
 *  fired yet. The open chip and an open fatigue episode are not touched here (a >= 60 s gap already hid the chip via C6). */
function resetCore(ss: StallSession): StallSession {
  return { ...ss, noSaleS: 0, noCollectS: 0, sinceSaleS: 0, cue: { ...ss.cue, aboveS: 0, belowS: 0 } };
}
/** SIM-API: single reset path (gap >= 60 s / welcome-back). Mutates s.stallSession (void, no Balance); no-op with the flag off. */
export function resetStallTimers(s: GameState): void {
  if (s.stallSession) s.stallSession = resetCore(s.stallSession);
}
/** Pure form of resetStallTimers for the offline path (save/m5-fields m5Offline). Same object when there is no record. */
export function withStallTimersReset(s: GameState): GameState {
  return s.stallSession ? { ...s, stallSession: resetCore(s.stallSession) } : s;
}

/** Marks sales / collects found in ev[from..] (sell any `by`, collect, worker_collect). Same object when nothing applies. */
export function stallObserve(s: GameState, ev: Sink, from: number): GameState {
  const ss = s.stallSession; if (!ss || !ev || ev.length <= from) return s;
  let sold = ss.sold, collected = ss.collected;
  for (let i = from; i < ev.length; i++) { const t = ev[i].type; if (t === 'sell') sold = true; else if (t === 'collect' || t === 'worker_collect') collected = true; }
  return sold === ss.sold && collected === ss.collected ? s : { ...s, stallSession: { ...ss, sold, collected } };
}

function stallPayload(s: GameState, ss: StallSession, cause: StallCause, mh: WorkerStateTag, ch: WorkerStateTag) {
  return { farm_level: s.farmLevel, queue_len: s.customers.length, sellable_eggs: Math.max(0, Math.floor(s.basket)), coop_eggs: Math.max(0, Math.floor(s.coop)),
    mh_state: mh, ch_state: ch, focus_s_since_last_sale: r1(ss.sinceSaleS), session_s: r1(ss.sessionS), cause };
}

/**
 * One tick of the stall + cue machines. Runs at the end of step() (after the rc1 order and stepTimers) when salesStopped is
 * on; identity otherwise. `focusS` = this tick's focus seconds; `ev0` = sink length at step start (this tick's events).
 */
export function stallTick(s: GameState, focusS: number, b: Balance, ev: Sink, ev0: number): GameState {
  if (!on(b)) return s;
  if (!s.stallSession) s = { ...s, stallSession: freshSession(s, b) };
  s = stallObserve(s, ev, ev0);
  const prev = s.stallSession!; const ss: StallSession = { ...prev, out: [] };
  if (prev.out.length) ev?.push(...prev.out);
  const f = focusS > 0 ? focusS : 0, holdS = tcNum(b, 'stall_hold_s'), chipOn = holdS > 0;
  ss.sessionS += f; ss.fatigueCueFlag = flagOn(b, 'fatigueCue');
  const mh = workerTag(s, 'market_hand', b), ch = workerTag(s, 'coop_hand', b);
  const mhC4 = off(prev.mhTag) && !off(mh) && mh !== 'paused', chC4 = off(prev.chTag) && !off(ch) && ch !== 'paused';
  const mhResume = prev.mhTag === 'paused' && mh !== 'paused', chResume = prev.chTag === 'paused' && ch !== 'paused';
  const Q = s.customers.length, E = Math.floor(s.basket), coopE = Math.floor(s.coop);
  const onb = ss.ui.onboardingDone, farm = ss.ui.farmScreenActive;
  const sellCond = onb && Q >= 1 && E >= 1 && (mh !== 'none' || s.farmLevel >= b.workers.market_hand.unlock_farm);
  const collectCond = onb && Q >= 1 && E < 1 && coopE >= 1 && off(ch);
  // A reset seen at this tick (sale / collect / C4 / Resume happened before or during it) restarts the count with this tick's
  // focus time; a broken condition holds the timer at 0.
  ss.noSaleS = !sellCond ? 0 : ss.sold || mhC4 || mhResume ? f : ss.noSaleS + f;
  ss.noCollectS = !collectCond ? 0 : ss.collected || chC4 || chResume ? f : ss.noCollectS + f;
  ss.sinceSaleS = ss.sold ? 0 : ss.sinceSaleS + f;
  if (ss.sold || ss.collected || (!sellCond && !collectCond) || mhC4 || chC4) ss.c6PrevId = null;
  // candidate (E7: T-SELL first)
  let cTrig: 'sell' | 'collect' | null = null, cCause: StallCause | null = null, cValid = false;
  if (chipOn && sellCond) {
    cTrig = 'sell';
    cCause = mh === 'none' ? 'no_mh' : mh === 'paused' ? 'mh_paused' : mh === 'unpaid' ? 'mh_unpaid' : mh === 'asleep' ? 'mh_asleep' : 'other';
    const hold = cCause === 'no_mh' ? tcNum(b, 'stall_hold_nomh_s') : cCause === 'mh_paused' ? tcNum(b, 'stall_hold_paused_s') : holdS;
    cValid = ss.noSaleS >= hold - EPS;
  } else if (chipOn && collectCond) {
    cTrig = 'collect'; cCause = ch === 'unpaid' ? 'ch_unpaid' : 'ch_asleep'; cValid = ss.noCollectS >= holdS - EPS;
  }
  const emitShown = (cause: StallCause, trig: 'sell' | 'collect', prevId: number | null) => {
    ss.stallSeq++; ss.stallId = ss.stallSeq; ss.shown = true; ss.trigger = trig; ss.cause = cause; ss.shownAtS = ss.sessionS; ss.tapped = null;
    const p = stallPayload(s, ss, cause, mh, ch);
    ev?.push(prevId === null ? { type: 'sales_stall', phase: 'shown', stall_id: ss.stallId, ...p } : { type: 'sales_stall', phase: 'shown', stall_id: ss.stallId, prev_stall_id: prevId, ...p });
  };
  let c4Refill = false;
  const emitResolved = (by: StallResolvedBy) => {
    const p = stallPayload(s, ss, ss.cause!, mh, ch);
    ev?.push({ type: 'sales_stall', phase: 'resolved', stall_id: ss.stallId!, ...p, resolved_by: by, time_to_resolve_s: r1(Math.max(0, ss.sessionS - ss.shownAtS)), chip_tapped: ss.tapped !== null });
  };
  const hide = (by: StallResolvedBy, c6: boolean) => {
    emitResolved(by);
    if (c6) ss.c6PrevId = ss.stallId; else { ss.rearmFromS = ss.sessionS; ss.c6PrevId = null; if (ss.trigger === 'sell') ss.noSaleS = 0; else ss.noCollectS = 0; }
    ss.shown = false; ss.trigger = null; ss.cause = null; ss.stallId = null; ss.tapped = null;
  };
  if (ss.shown) {
    const tap = ss.tapped, isMh = ss.cause!.startsWith('mh_'), wasPaused = ss.cause === 'mh_paused';
    let clear: StallResolvedBy | null = null;
    // C7 and C4 first: a hired / woken MH may sell on the same tick, but the clear is the hire / wake (C4 "immediately").
    if (ss.trigger === 'sell') {
      if (ss.cause === 'no_mh' && mh !== 'none') clear = 'none';
      else if (isMh && !wasPaused && mhC4) { clear = tap === 'refill' ? 'chip_refill' : prev.mhTag === 'unpaid' ? 'auto_resume' : 'refill_elsewhere'; c4Refill = prev.mhTag === 'asleep'; }
      else if (ss.sold) clear = tap === 'sell_all' ? 'chip_sell_all' : 'sell_elsewhere';
      else if (Q < 1) clear = 'queue_empty';
      else if (E < 1) clear = 'basket_empty';
      else if (wasPaused && mhResume) clear = 'none';
      else if (!onb) clear = 'none';
    } else {
      if (chC4) { clear = tap === 'refill' ? 'chip_refill' : prev.chTag === 'unpaid' ? 'auto_resume' : 'refill_elsewhere'; c4Refill = prev.chTag === 'asleep'; }
      else if (ss.collected || E >= 1) clear = tap === 'collect' ? 'chip_collect' : 'collect_elsewhere';
      else if (Q < 1) clear = 'queue_empty';
      else if (coopE < 1) clear = 'basket_empty';
      else if (ch === 'paused') clear = 'paused';
      else if (!onb) clear = 'none';
    }
    if (clear) hide(clear, false);
    else if (f === 0 || !farm) hide(tap === 'manage' ? 'chip_manage' : 'focus_lost', true); // C6 (+ leaving the farm screen, HoE d)
    else if (cCause !== ss.cause) {
      if (cValid && cTrig && cCause) { const old = ss.stallId; emitResolved('cause_changed'); emitShown(cCause, cTrig, old); }
      else hide(cCause === 'mh_paused' ? 'paused' : 'none', false); // C5: re-evaluate, don't hold a chip the new cause has not earned
    }
  }
  if (!ss.shown && cValid && cTrig && cCause && f > 0 && farm && (ss.rearmFromS === null || ss.sessionS - ss.rearmFromS >= tcNum(b, 'stall_rearm_s') - EPS)) {
    const p = ss.c6PrevId; ss.c6PrevId = null; emitShown(cCause, cTrig, p);
  }
  // ---- Rule 2 (§4.8) ----
  const loss = fatigueLossPerSec(s, b), share = fatigueShareOf(loss, incomePerSec(s, b));
  let nT = 0, nA = 0, nP = 0; for (const id of WORKERS) { const t = workerTag(s, id, b); if (t === 'tired') nT++; else if (t === 'asleep') nA++; else if (t === 'paused') nP++; }
  ss.snap = { loss_per_s: Math.max(0, Math.round(loss * CENTS_PER_DOLLAR)), loss_share: Math.round(share * 1000) / 1000, n_tired: nT, n_asleep: nA, n_paused: nP };
  const st = cueStep(ss.cue, share, f, { min: tcNum(b, 'fatigue_cue_min_share'), hold: tcNum(b, 'fatigue_cue_hold_s'), clear: tcNum(b, 'fatigue_cue_clear_share'), clearHold: tcNum(b, 'fatigue_cue_clear_hold_s') });
  ss.cue = st.next;
  if (st.ended) { ss.episode = null; ss.cueLogged = []; ss.cueForceCleared = false; }
  if (st.started) {
    ss.episodeSeq++; ss.episode = ss.episodeSeq; ss.cueLogged = []; ss.cueForceCleared = false;
    if (ss.fatigueCueFlag) { ss.cueLogged = ['hud_chip']; ev?.push({ type: 'fatigue_cue_shown', surface: 'hud_chip', ...ss.snap, suppressed_by_stall: ss.shown }); }
  }
  // §5 exception (rc2Refill = 0 only): a Refill C4 clear with share < clear_share force-clears the cue display (episode kept, SS-G39)
  if (c4Refill && !flagOn(b, 'rc2Refill') && ss.cue.on && share < tcNum(b, 'fatigue_cue_clear_share') - EPS) ss.cueForceCleared = true;
  ss.sold = false; ss.collected = false; ss.mhTag = mh; ss.chTag = ch;
  return { ...s, stallSession: ss };
}

// ---- read API (SIM-API) ----
const STALL_OFF: Readonly<StallView> = Object.freeze({ shown: false, trigger: null, cause: null, stallId: null, noSaleS: 0, noCollectS: 0 });
/** SIM-API stallView: read-only; UI reads every frame. Flag off (or before the first flag-on tick): shown false, null ids. */
export function stallView(s: GameState, b: Balance): Readonly<StallView> {
  const ss = s.stallSession; if (!on(b) || !ss) return STALL_OFF;
  return { shown: ss.shown, trigger: ss.trigger, cause: ss.cause, stallId: ss.stallId, noSaleS: ss.noSaleS, noCollectS: ss.noCollectS };
}
/** SIM-API fatigueCueView. `shown` = Rule 2 state (Rule 4 bubble reads the same thresholds), minus the §5 force-clear.
 *  fatigueCue = 0: the hud_chip slot does not exist (SS-23f) and no fatigue_cue_shown{hud_chip} is ever logged. */
export function fatigueCueView(s: GameState, b: Balance): Readonly<FatigueCueView> {
  const ss = s.stallSession;
  if (!on(b) || !ss) return { share: on(b) ? fatigueShareOf(fatigueLossPerSec(s, b), incomePerSec(s, b)) : 0, shown: false, episodeId: null, suppressedByStall: false };
  return { share: fatigueShareOf(fatigueLossPerSec(s, b), incomePerSec(s, b)), shown: ss.cue.on && !ss.cueForceCleared, episodeId: ss.episode === null ? null : String(ss.episode), suppressedByStall: ss.shown };
}

/** SIM-API "Changes" (HoE 2026-11-10 03:25): the UI passes the §4.3 gates it owns, every frame or on change (sticky until the
 *  next call). Creates the session record if needed; no-op with salesStopped off (flag-off byte-identical). Until the first
 *  call both gates read false, so no chip shows and no sales_stall is sent. */
export function setUiGates(s: GameState, b: Balance, gates: UiGates): void {
  if (!on(b)) return;
  const ss = s.stallSession ?? freshSession(s, b);
  if (s.stallSession && ss.ui.farmScreenActive === gates.farmScreenActive && ss.ui.onboardingDone === gates.onboardingDone) return;
  s.stallSession = { ...ss, ui: { farmScreenActive: gates.farmScreenActive === true, onboardingDone: gates.onboardingDone === true } };
}

// ---- UI -> sim notifications (SIM-API; the sim emits, the UI emits nothing) ----
/** Chip tap: remembered on the open pair; the hide it causes logs chip_* and chip_tapped: true. 'manage' (rc2Refill = 1) closes
 *  the pair as chip_manage when the Shift sheet stops the focus clock (§4.6 Option A). No-op with no open pair / flag off. */
export function noteStallChipTap(s: GameState, action: StallChipAction): void {
  const ss = s.stallSession; if (!ss || !ss.shown) return;
  s.stallSession = { ...ss, tapped: action };
}
/** fatigue_cue_shown for a rendered surface, once per (episodeId, surface) (FC-SV11). Needs an open Rule 2 episode; hud_chip
 *  needs fatigueCue = 1 (the sim already logged it at eligibility, so a hud_chip call is normally a dedupe no-op). */
export function noteFatigueCueShown(s: GameState, surface: FatigueSurface): void {
  const ss = s.stallSession; if (!ss || ss.episode === null || ss.cueLogged.includes(surface)) return;
  if (surface === 'hud_chip' && !ss.fatigueCueFlag) return;
  s.stallSession = { ...ss, cueLogged: [...ss.cueLogged, surface], out: [...ss.out, { type: 'fatigue_cue_shown', surface, ...ss.snap, suppressed_by_stall: ss.shown }] };
}
/** fatigue_cue_tapped, one per call (SS-48 / SS-G37: including the tap that closes the popover). */
export function noteFatigueCueTap(s: GameState, surface: FatigueSurface): void {
  const ss = s.stallSession; if (!ss) return;
  if (surface === 'hud_chip' && !ss.fatigueCueFlag) return;
  s.stallSession = { ...ss, out: [...ss.out, { type: 'fatigue_cue_tapped', surface, ...ss.snap }] };
}
