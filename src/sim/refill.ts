/**
 * rc2 Refill + autoRefill (G0-API.md rev 11, sha256 a29b999d). G1: chargesOf (m3, lazy) and chargesView.
 * G2: session views, autoRefillOn, restEligibility, refillEligibility, mutators, tick (M4).
 * UI-safe views: no side effects. Refill never writes asleep_s or clockWage state (D-HOE-61).
 * M4: sim-clock only; no wall-clock or RNG calls.
 *
 * TODO(G2/M2): one-line hook-up of resetRefillSession into resetSessionFields
 * (src/sim/session.ts:24) after #138 merges into rc/v5 and we merge rc/v5 forward.
 * HoE ruling: NEVER merge Draft #138 into #133; do NOT create src/sim/session.ts
 * locally (it would conflict with #138). Do NOT add registerSessionEnd.
 * Same pattern as clockWage's resetAsleepSession.
 */
import type { Balance } from '../config/balance';
import { tcNum } from '../config/formulas';
import { flagOn } from '../config/flags';
import type { GameState } from './state';
import { WORKERS, mood, type Worker, type WorkerId } from './workers';
import { ENERGY_FULL, isPaused, pauseWorker, resumeWorker } from './pause';
import { sessionEndPresentFields } from './breeds-traits';
import type { RefillSession } from './m5-state';
import type { SimEvent, Sink } from './events';

export interface ChargesView { charges: number; cap: number; nextChargeMs: number | null } // null at the cap (F-4)

/** Lazy accessor (Architect m3 / §14c): the stored value, or start_charges when the key is absent. Does not write. */
export function chargesOf(s: GameState, b: Balance): number {
  return s.refillCharges ?? tcNum(b, 'start_charges');
}

/**
 * Flag off: {0, 0, null}. Flag on (§14c): chargesView delegates to chargesOf (one fallback,
 * start_charges). nextChargeMs is null only at the cap; below the cap it's the stored value
 * or the full regen interval until the first tick.
 */
export function chargesView(s: GameState, b: Balance): Readonly<ChargesView> {
  if (!flagOn(b, 'rc2Refill')) return { charges: 0, cap: 0, nextChargeMs: null };
  const cap = tcNum(b, 'charge_cap');
  const charges = chargesOf(s, b);
  return { charges, cap, nextChargeMs: charges >= cap ? null : (s.chargeNextMs ?? Math.round(tcNum(b, 'charge_regen_s') * 1000)) };
}

/** True when rc2Refill is effective. Callers outside this file use this so they do not invoke flagOn (F3-no-literal). */
export function rc2RefillOn(b: Balance): boolean {
  return flagOn(b, 'rc2Refill');
}

/** Session rotation (Architect M2 note 22:18): pure; deletes refillSession and refillAgoMs. Same object when both are absent. */
export function resetRefillSession(s: GameState): GameState {
  if (!('refillSession' in s) && !('refillAgoMs' in s)) return s;
  const { refillSession: _r, refillAgoMs: _a, ...rest } = s;
  return rest as GameState;
}

/** session_end view (Architect M2, m7). Accumulators are integer ms (M4); shortage_s is whole seconds (floor), charge_starved_s is S1 (0.1 s). Flag off: {}. charges_capped_s is never emitted (7.2). */
export interface RefillSessionTotals {
  shortage_s?: number;
  refills_manual?: number;
  refills_auto?: number;
  charge_starved_s?: number;
}
export function refillSessionTotals(s: GameState, b: Balance): RefillSessionTotals {
  if (!flagOn(b, 'rc2Refill')) return {};
  const sess = s.refillSession;
  const out: RefillSessionTotals = { shortage_s: Math.floor((sess?.shortageS ?? 0) / 1000) };
  if (flagOn(b, 'autoRefill')) {
    out.refills_manual = sess?.refillsManual ?? 0;
    out.refills_auto = sess?.refillsAuto ?? 0;
    out.charge_starved_s = Math.round((sess?.chargeStarvedS ?? 0) / ENERGY_FULL) / (1000 / ENERGY_FULL);
  }
  return out;
}

/** T-AC9: one helper for Game.session_end — no comma-bearing calls inside the track literal. */
export function sessionEndFields(s: GameState, b: Balance): Record<string, unknown> {
  return { ...sessionEndPresentFields(s, b), ...refillSessionTotals(s, b) };
}

/** D-HOE-61: the switch's state. False when rc2Refill=0 or autoRefill=0, or the key is not `true`. Pure; writes nothing. */
export function autoRefillOn(s: GameState, id: WorkerId, b: Balance): boolean {
  return flagOn(b, 'rc2Refill') && flagOn(b, 'autoRefill') && s.workers[id]?.autoRefill === true;
}

/** m1: integer 0..100 for refill_used and rest_toggled energy_pct. */
export function pct(energy: number): number {
  const n = Math.round(energy);
  return n < 0 ? 0 : n > ENERGY_FULL ? ENERGY_FULL : n;
}

export type RefillBlock = 'flag_off' | 'not_hired' | 'unpaid' | 'above_threshold' | 'no_charges';

/** m4 precedence: flag_off > not_hired > unpaid > above_threshold > no_charges. ≤ threshold includes Asleep and Paused; Unpaid is blocked. */
export function refillEligibility(s: GameState, id: WorkerId, b: Balance): { ok: true } | { ok: false; reason: RefillBlock } {
  if (!flagOn(b, 'rc2Refill')) return { ok: false, reason: 'flag_off' };
  const w = s.workers[id];
  if (!w) return { ok: false, reason: 'not_hired' };
  if (w.unpaid) return { ok: false, reason: 'unpaid' };
  if (w.energy > tcNum(b, 'refill_threshold_pct')) return { ok: false, reason: 'above_threshold' };
  if (chargesOf(s, b) < 1) return { ok: false, reason: 'no_charges' };
  return { ok: true };
}

/** §9 7.4: hired, not Unpaid, energy ≤ threshold (Paused included). */
export function isRefillable(s: GameState, id: WorkerId, b: Balance): boolean {
  if (!flagOn(b, 'rc2Refill')) return false;
  const w = s.workers[id];
  return !!w && !w.unpaid && w.energy <= tcNum(b, 'refill_threshold_pct');
}

export function refillableCount(s: GameState, b: Balance): number {
  if (!flagOn(b, 'rc2Refill')) return 0;
  let n = 0;
  for (const id of WORKERS) if (isRefillable(s, id, b)) n++;
  return n;
}

/** G0 §14a. Closed, sim-internal, never a wire field. First match wins. Resume (Rest off) is never blocked. */
export type RestBlock = 'disabled' | 'locked' | 'not_hired';
export function restEligibility(s: GameState, id: WorkerId, b: Balance): { ok: true } | { ok: false; reason: RestBlock } {
  if (!flagOn(b, 'pause')) return { ok: false, reason: 'disabled' };
  if (s.farmLevel < tcNum(b, 'pause_unlock_farm')) return { ok: false, reason: 'locked' };
  if (!s.workers[id]) return { ok: false, reason: 'not_hired' };
  return { ok: true };
}

/** rest_toggled.state (D-HOE-33). §12.7 etas are it.todo (formula not specified). */
export function restState(w: Worker | undefined, b: Balance): 'active' | 'paused' | 'resting' {
  if (!isPaused(w, b)) return 'active';
  return w?.restAuto === true ? 'resting' : 'paused';
}

export function refillAgoSimMs(s: GameState, id: WorkerId): number | undefined {
  return s.refillAgoMs?.[id];
}

/**
 * #119's session-only pausedForS is the source for rest_toggled / worker_resumed paused_duration_s
 * (G0 §14b). We only read and floor at emit, matching #119's pausedDurationS; we do not add a
 * parallel field and we do not tick the tracker (that's #119, including the integer-ms fix).
 * Missing entry → 0.
 */
type PausedForHolder = { pausedForS?: Partial<Record<WorkerId, number>> };
export function pausedDurationS(s: GameState, id: WorkerId): number {
  const v = (s as GameState & PausedForHolder).pausedForS?.[id];
  return Math.floor(typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);
}

export type ShiftSheetEntry = 'nav' | 'card' | 'stall_chip' | 'fatigue_chip';
export interface RefillCtx {
  sheetId: number | null;
  entryPoint: ShiftSheetEntry | 'auto';
  stallId?: number;
}

function emptySess(): RefillSession {
  return { sheetSeq: 0, refillsManual: 0, refillsAuto: 0, chargeStarvedS: 0, shortageS: 0, chargesCappedS: 0, autoToastQueue: [] };
}
function sessOf(s: GameState): RefillSession {
  return s.refillSession ? { ...s.refillSession, autoToastQueue: s.refillSession.autoToastQueue.slice() } : emptySess();
}

function hiredIds(s: GameState): WorkerId[] {
  return WORKERS.filter(id => !!s.workers[id]);
}

/** Temporary stand-in for shiftOrder (energy asc, then WORKERS index). Full AC-RF3 needs #128 workerAtRisk — not in this tree. */
function energyThenIndex(s: GameState, ids: WorkerId[]): WorkerId[] {
  return ids.slice().sort((a, c) => {
    const d = (s.workers[a]!.energy) - (s.workers[c]!.energy);
    return d !== 0 ? d : WORKERS.indexOf(a) - WORKERS.indexOf(c);
  });
}

function rankByRisk(s: GameState, id: WorkerId): number {
  const hired = hiredIds(s);
  const i = hired.indexOf(id);
  return i < 0 ? 1 : i + 1; // HoE 7.3: 1-based among hired; order is WORKERS until shiftOrder lands
}

function bestAndLowest(s: GameState, b: Balance): { best: WorkerId; lowest: WorkerId } {
  const refs = energyThenIndex(s, hiredIds(s).filter(id => isRefillable(s, id, b)));
  const fallback = hiredIds(s)[0] ?? WORKERS[0]!;
  const lowest = refs[0] ?? fallback;
  return { best: lowest, lowest };
}

function onTrueFields(s: GameState, id: WorkerId, b: Balance): {
  farm: number; mood: NonNullable<ReturnType<typeof mood>>; unpaid: boolean;
  ability_active: boolean; golden_on_screen: boolean; frenzy_active: boolean;
} {
  const w = s.workers[id];
  return {
    farm: s.farmLevel,
    mood: mood(w, b) ?? 'working',
    unpaid: !!w?.unpaid,
    ability_active: (s.abilities?.[id]?.activeS ?? 0) > 0,
    golden_on_screen: !!s.goldenEgg,
    frenzy_active: (s.frenzyRemainingS ?? 0) > 0,
  };
}

function stallOf(entry: string, stallId?: number): { stall_id?: number } {
  return entry === 'stall_chip' && stallId !== undefined ? { stall_id: stallId } : {};
}

export function noteShiftSheetOpened(
  s: GameState, b: Balance, entry: ShiftSheetEntry, stallId?: number,
): { state: GameState; events: SimEvent[]; sheetId: number } {
  if (!flagOn(b, 'rc2Refill')) return { state: s, events: [], sheetId: 0 };
  const cur = sessOf(s);
  const sheetId = cur.sheetSeq + 1;
  cur.sheetSeq = sheetId;
  const ev: SimEvent = { type: 'shift_sheet_opened', entry, sheet_id: sheetId, ...stallOf(entry, stallId) };
  return { state: { ...s, refillSession: cur }, events: [ev], sheetId };
}

export function refillWorker(
  s: GameState, id: WorkerId, b: Balance, ctx: RefillCtx,
): { ok: true; state: GameState; events: SimEvent[] } | { ok: false; reason: RefillBlock; state: GameState; events: [] } {
  const el = refillEligibility(s, id, b);
  if (!el.ok) return { ok: false, reason: el.reason, state: s, events: [] };
  const w0 = s.workers[id]!;
  const prePct = pct(w0.energy);
  const { best, lowest } = bestAndLowest(s, b);
  const n = refillableCount(s, b);
  const rank = rankByRisk(s, id);
  let state = s;
  const evs: SimEvent[] = [];
  // Resume a paused worker through resumeWorker (rule 8, cause 'manage'). Never write cdS (U1, AC-LR20).
  if (isPaused(w0, b)) {
    const dur = pausedDurationS(state, id);
    state = resumeWorker(state, id, b);
    const wr = state.workers[id]!;
    const { restAuto: _r, ...rest } = wr as Worker & { restAuto?: true };
    state = { ...state, workers: { ...state.workers, [id]: rest } };
    evs.push({
      type: 'rest_toggled', worker: id, on: false, energy_pct: prePct, state: 'active',
      cause: 'manage', sheet_id: ctx.sheetId, entry_point: ctx.entryPoint, ...stallOf(ctx.entryPoint, ctx.stallId),
      paused_duration_s: dur,
    });
  }
  const w = { ...state.workers[id]!, energy: ENERGY_FULL };
  const charges = chargesOf(state, b) - 1;
  const cap = tcNum(b, 'charge_cap');
  const regen = Math.round(tcNum(b, 'charge_regen_s') * 1000);
  // From the cap, start a full chargeNextMs (F-4). Below the cap, keep an existing countdown or start one.
  const next = charges >= cap ? undefined : (state.chargeNextMs ?? regen);
  const ago = { ...(state.refillAgoMs ?? {}), [id]: 0 }; // manual only (AC-RF4)
  const cur = sessOf(state);
  cur.refillsManual += 1;
  const { chargeNextMs: _drop, ...base } = state as GameState & { chargeNextMs?: number };
  state = {
    ...base,
    workers: { ...state.workers, [id]: w },
    refillCharges: charges,
    refillAgoMs: ago,
    refillSession: cur,
    ...(next !== undefined ? { chargeNextMs: next } : {}),
  } as GameState;
  evs.push({
    type: 'refill_used', worker: id, energy_pct: prePct, charges_left: charges, rank_by_risk: rank,
    by: 'manual', sheet_id: ctx.sheetId, entry_point: ctx.entryPoint, ...stallOf(ctx.entryPoint, ctx.stallId),
    refillable_n: n, best_worker: best, lowest_worker: lowest,
  });
  return { ok: true, state, events: evs };
}

export function setRest(
  s: GameState, id: WorkerId, on: boolean, b: Balance, ctx: RefillCtx,
): { state: GameState; events: SimEvent[] } {
  // Architect: with pause = 0, setRest is a no-op. Resume (on:false) is never blocked by restEligibility.
  if (!flagOn(b, 'pause')) return { state: s, events: [] };
  const w = s.workers[id];
  if (!w) return { state: s, events: [] };
  if (on) {
    const el = restEligibility(s, id, b);
    if (!el.ok) return { state: s, events: [] };
    if (isPaused(w, b) && w.restAuto === true) return { state: s, events: [] };
    let state = pauseWorker(s, id, b);
    const nw = state.workers[id];
    if (!nw) return { state: s, events: [] };
    state = { ...state, workers: { ...state.workers, [id]: { ...nw, restAuto: true as const } } };
    const ev: SimEvent = {
      type: 'rest_toggled', worker: id, on: true, energy_pct: pct(nw.energy), state: 'resting',
      cause: 'manual', sheet_id: ctx.sheetId, entry_point: ctx.entryPoint, ...stallOf(ctx.entryPoint, ctx.stallId),
      ...onTrueFields(state, id, b),
    };
    return { state, events: [ev] };
  }
  // Resume: never blocked. No-op if not paused.
  if (!isPaused(w, b)) return { state: s, events: [] };
  const dur = pausedDurationS(s, id);
  let state = resumeWorker(s, id, b);
  const nw = state.workers[id]!;
  if ('restAuto' in nw) {
    const { restAuto: _r, ...rest } = nw;
    state = { ...state, workers: { ...state.workers, [id]: rest } };
  }
  const ev: SimEvent = {
    type: 'rest_toggled', worker: id, on: false, energy_pct: pct(nw.energy), state: 'active',
    cause: 'manual', sheet_id: ctx.sheetId, entry_point: ctx.entryPoint, ...stallOf(ctx.entryPoint, ctx.stallId),
    paused_duration_s: dur,
  };
  return { state, events: [ev] };
}

export function setAutoRefill(s: GameState, id: WorkerId, on: boolean, b: Balance): { state: GameState; events: SimEvent[] } {
  if (!flagOn(b, 'rc2Refill') || !flagOn(b, 'autoRefill')) return { state: s, events: [] };
  const w = s.workers[id];
  if (!w) return { state: s, events: [] };
  const already = w.autoRefill === true;
  if (on === already) return { state: s, events: [] };
  let nw: Worker;
  if (on) nw = { ...w, autoRefill: true };
  else { const { autoRefill: _a, ...rest } = w; nw = rest; }
  const state = { ...s, workers: { ...s.workers, [id]: nw } };
  const ev: SimEvent = { type: 'autorefill_toggled', worker: id, on, farm_level: s.farmLevel };
  return { state, events: [ev] };
}

/** m6 / AC-LR14: one coalesced toast, drained when the UI chooses. Same state and toast:null when the queue is empty. */
export function takeAutoRefillToast(s: GameState): { state: GameState; toast: { n: number; worker: WorkerId | null } | null } {
  const q = s.refillSession?.autoToastQueue;
  if (!q || q.length === 0) return { state: s, toast: null };
  const n = q.length, worker = q[n - 1] ?? null;
  const cur = sessOf(s);
  cur.autoToastQueue = [];
  return { state: { ...s, refillSession: cur }, toast: { n, worker } };
}

/** SIM-API chip→sheet path. At rc2Refill=1 the chip never refills directly (G0 §3). Stall telemetry is Features' stall sim, not here. */
export function noteStallChipTap(s: GameState, _action: 'refill' | 'sell_all' | 'collect' | 'manage'): GameState {
  return s;
}

function autoTc(b: Balance): { at: number; reserve: number } | null {
  const tc = b.m4?.tc;
  const at = tc?.['autorefill_at_pct'], reserve = tc?.['autorefill_reserve'];
  if (typeof at !== 'number' || !Number.isFinite(at) || typeof reserve !== 'number' || !Number.isFinite(reserve)) return null;
  return { at, reserve };
}

function applyAutoRefill(s: GameState, id: WorkerId, b: Balance, ev?: Sink): GameState {
  const el = refillEligibility(s, id, b);
  if (!el.ok) return s;
  const w0 = s.workers[id]!;
  if (isPaused(w0, b) || w0.unpaid) return s;
  const prePct = pct(w0.energy);
  const { best, lowest } = bestAndLowest(s, b);
  const n = refillableCount(s, b);
  const rank = rankByRisk(s, id);
  const w = { ...w0, energy: ENERGY_FULL };
  const charges = chargesOf(s, b) - 1;
  const cap = tcNum(b, 'charge_cap');
  const regen = Math.round(tcNum(b, 'charge_regen_s') * 1000);
  const next = charges >= cap ? undefined : (s.chargeNextMs ?? regen);
  const cur = sessOf(s);
  cur.refillsAuto += 1;
  cur.autoToastQueue = [...cur.autoToastQueue, id];
  let state: GameState = { ...s, workers: { ...s.workers, [id]: w }, refillCharges: charges, refillSession: cur };
  // Auto does not touch refillAgoMs (G0 §3).
  if (charges >= cap) {
    const { chargeNextMs: _c, ...rest } = state as GameState & { chargeNextMs?: number };
    state = { ...rest, refillCharges: charges, refillSession: cur, workers: state.workers } as GameState;
  } else {
    state = { ...state, chargeNextMs: next };
  }
  ev?.push({
    type: 'refill_used', worker: id, energy_pct: prePct, charges_left: charges, rank_by_risk: rank,
    by: 'auto', sheet_id: null, entry_point: 'auto',
    refillable_n: n, best_worker: best, lowest_worker: lowest,
  });
  return state;
}

/**
 * Tick (R2/R4/R6), only when rc2Refill=1. Caller passes integer Math.round(dt*1000) ms (M4).
 * Regen runs on the sim clock (including Rest and under modals). Offline and hidden ≥ 60 s
 * never call step, so this is frozen there; a visible stall credits the first 60 s (G-5) because
 * those ticks do run. Does not tick manageCdS (the caller leaves it). Never writes asleep_s.
 */
export function tickRefill(s: GameState, dtMs: number, b: Balance, ev?: Sink): GameState {
  if (!flagOn(b, 'rc2Refill') || !(dtMs > 0)) return s;
  let state = s;
  const cap = tcNum(b, 'charge_cap');
  const regen = Math.round(tcNum(b, 'charge_regen_s') * 1000);
  const startCharges = chargesOf(state, b);
  let charges = startCharges;
  let next = state.chargeNextMs;
  const cur = sessOf(state);
  if (charges >= cap) {
    cur.chargesCappedS += dtMs;
    if (next !== undefined) { const { chargeNextMs: _c, ...rest } = state; state = rest as GameState; next = undefined; }
  } else {
    let t = (next ?? regen) - dtMs;
    while (t <= 0 && charges < cap) {
      charges += 1;
      if (charges >= cap) { t = 0; break; }
      t += regen;
    }
    if (charges >= cap) {
      const { chargeNextMs: _c, ...rest } = state as GameState & { chargeNextMs?: number };
      state = rest as GameState;
      next = undefined;
    } else {
      next = t;
      state = { ...state, chargeNextMs: next };
    }
    if (charges !== startCharges) state = { ...state, refillCharges: charges };
  }

  // Advance manual-refill ages (existing keys only).
  if (state.refillAgoMs) {
    const ago: NonNullable<GameState['refillAgoMs']> = {};
    for (const id of WORKERS) {
      const v = state.refillAgoMs[id];
      if (typeof v === 'number') ago[id] = v + dtMs;
    }
    state = { ...state, refillAgoMs: ago };
  }

  // Rest auto-end at a full tank (energy already recovered in step via pausedRecoveredEnergy).
  for (const id of WORKERS) {
    const w = state.workers[id];
    if (!w || !isPaused(w, b) || w.restAuto !== true) continue;
    if (w.energy < ENERGY_FULL) continue;
    const dur = pausedDurationS(state, id);
    let nextS = resumeWorker(state, id, b);
    const nw = nextS.workers[id]!;
    const { restAuto: _r, ...rest } = nw as Worker & { restAuto?: true };
    nextS = { ...nextS, workers: { ...nextS.workers, [id]: rest } };
    ev?.push({
      type: 'rest_toggled', worker: id, on: false, energy_pct: pct(nw.energy), state: 'active',
      cause: 'auto_full', sheet_id: null, entry_point: 'auto', paused_duration_s: dur,
    });
    state = nextS;
  }

  // Shortage / starved accumulators (ms). Wall-clock: +dtMs when the predicate holds.
  // shortage: ≥1 refillable (Paused ≤ threshold included, Unpaid excluded, §9 7.4).
  // charge_starved: charges == 0 and ≥1 hired non-unpaid, non-paused worker at/below threshold.
  if (refillableCount(state, b) > 0) cur.shortageS += dtMs;
  if (chargesOf(state, b) === 0) {
    let starved = false;
    for (const id of WORKERS) {
      const w = state.workers[id];
      if (w && !w.unpaid && !isPaused(w, b) && w.energy <= tcNum(b, 'refill_threshold_pct')) { starved = true; break; }
    }
    if (starved) cur.chargeStarvedS += dtMs;
  }

  // Auto-refill (AC-LR19), after Rest auto-end. Skipped when Econ CSV keys are not on the fixture.
  // Temporary order: energy asc, WORKERS index (shiftOrder / #128 workerAtRisk is it.todo).
  if (flagOn(b, 'autoRefill')) {
    const keys = autoTc(b);
    if (keys) {
      const cands = energyThenIndex(state, hiredIds(state).filter(id => {
        const w = state.workers[id]!;
        return autoRefillOn(state, id, b) && w.energy <= keys.at && !isPaused(w, b) && !w.unpaid;
      }));
      for (const id of cands) {
        if (chargesOf(state, b) <= keys.reserve) break;
        state = applyAutoRefill(state, id, b, ev);
      }
    }
  }

  // Merge accumulator ticks (cur) with any auto-refill session writes (do not clobber the toast queue).
  const later = sessOf(state);
  later.shortageS = cur.shortageS;
  later.chargeStarvedS = cur.chargeStarvedS;
  later.chargesCappedS = cur.chargesCappedS;
  state = { ...state, refillSession: later };
  return state;
}
