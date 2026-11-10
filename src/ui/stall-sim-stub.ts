/**
 * LOCAL STUB of the pinned sim API (engineering/tasks/v5-ui-ss-fatigue/SIM-API.md, owner Saves 3ba38cf3; HoE ruling 2026-11-10 01:31 CET).
 * TO BE REPLACED by Saves' risk-helpers module when it merges: point src/ui/stall-api.ts at the real module and delete this file.
 * Names and shapes are copied verbatim from SIM-API.md and must not be renamed here. The stub computes NOTHING: with no override it
 * reports "not shown" (the same as flag-off), and tests / the QA build set the views through `stallStub`. It emits no telemetry.
 */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import type { WorkerId } from '../sim/workers';
import { flagOn } from '../config/flags';

export type StallCause = 'mh_asleep' | 'mh_paused' | 'mh_unpaid' | 'no_mh' | 'ch_asleep' | 'ch_unpaid' | 'other';
export type StallResolvedBy = 'chip_refill' | 'chip_sell_all' | 'chip_collect' | 'chip_manage' | 'refill_elsewhere' | 'sell_elsewhere' | 'collect_elsewhere'
  | 'auto_resume' | 'queue_empty' | 'basket_empty' | 'paused' | 'focus_lost' | 'cause_changed' | 'none';
export type FatigueSurface = 'hud_chip' | 'banner' | 'bubble';
export interface StallView {
  shown: boolean;
  trigger: 'sell' | 'collect' | null;
  cause: StallCause | null;
  stallId: string | null;
  noSaleS: number;
  noCollectS: number;
}
export interface FatigueCueView {
  share: number;
  shown: boolean;
  episodeId: string | null;
  suppressedByStall: boolean;
}
const NO_STALL: Readonly<StallView> = Object.freeze({ shown: false, trigger: null, cause: null, stallId: null, noSaleS: 0, noCollectS: 0 });
const NO_CUE: Readonly<FatigueCueView> = Object.freeze({ share: 0, shown: false, episodeId: null, suppressedByStall: false });

/** Test / QA control surface of the stub only (not part of the pinned API). */
export const stallStub = {
  stall: null as StallView | null,
  cue: null as FatigueCueView | null,
  atRisk: {} as Partial<Record<WorkerId, number>>,
  notes: [] as { fn: string; arg: string }[],
  shownKeys: new Set<string>(),
  reset() { this.stall = null; this.cue = null; this.atRisk = {}; this.notes = []; this.shownKeys.clear(); },
};

// src/econ/income.ts signatures (Saves): stand-ins so the UI can read X and the Manage target before the real helpers land.
export function workerAtRisk(id: WorkerId, _s: GameState, _b: Balance): number { return stallStub.atRisk[id] ?? 0; }
export function workersAtRisk(s: GameState, b: Balance): Record<WorkerId, number> {
  return { market_hand: workerAtRisk('market_hand', s, b), coop_hand: workerAtRisk('coop_hand', s, b), hawker: workerAtRisk('hawker', s, b), grader: workerAtRisk('grader', s, b) };
}
export function costliestAtRisk(s: GameState, b: Balance): WorkerId | null {
  let best: WorkerId | null = null, v = 0; // ties: code id order market_hand, coop_hand, hawker, grader (spec SS-G36)
  for (const [id, x] of Object.entries(workersAtRisk(s, b)) as [WorkerId, number][]) if (x > v) { v = x; best = id; }
  return best;
}
export function fatigueShare(s: GameState, b: Balance): number { return fatigueCueView(s, b).share; }

export function stallView(_s: GameState, b: Balance): Readonly<StallView> {
  if (!flagOn(b, 'salesStopped')) return NO_STALL;
  return stallStub.stall ?? NO_STALL;
}
export function fatigueCueView(s: GameState, b: Balance): Readonly<FatigueCueView> {
  if (!flagOn(b, 'salesStopped')) return NO_CUE;
  const v = stallStub.cue ?? NO_CUE;
  return { ...v, suppressedByStall: stallView(s, b).shown };
}
export function resetStallTimers(_s: GameState): void { stallStub.notes.push({ fn: 'resetStallTimers', arg: '' }); }
export function noteStallChipTap(_s: GameState, action: 'refill' | 'sell_all' | 'collect' | 'manage'): void { stallStub.notes.push({ fn: 'noteStallChipTap', arg: action }); }
/** Idempotent per (episodeId, surface), like the sim's dedupe (FC-SV11). */
export function noteFatigueCueShown(s: GameState, surface: FatigueSurface): void {
  const k = `${stallStub.cue?.episodeId ?? ''}|${surface}`; void s;
  if (stallStub.shownKeys.has(k)) return; stallStub.shownKeys.add(k); stallStub.notes.push({ fn: 'noteFatigueCueShown', arg: surface });
}
export function noteFatigueCueTap(_s: GameState, surface: FatigueSurface): void { stallStub.notes.push({ fn: 'noteFatigueCueTap', arg: surface }); }
