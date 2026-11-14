/** The ONE import point for the #5b/#11 sim read API (SIM-API.md rev 3, sha256 38bfc0d1).
 *  Re-exports Saves' real helpers from src/econ/stall.ts via income.ts (#128, merged into rc/v5).
 *  UI files import only from here. Test/QA helpers below write a StallSession onto GameState; they are not part of the pinned API. */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import type { WorkerId } from '../sim/workers';
import { WORKERS } from '../sim/workers';
import type { StallSession } from '../econ/stall';
import {
  stallView as realStallView,
  fatigueCueView as realFatigueCueView,
  setUiGates,
  resetStallTimers,
  noteStallChipTap,
  noteFatigueCueShown,
  noteFatigueCueTap,
  workerAtRisk as realWorkerAtRisk,
  workersAtRisk as realWorkersAtRisk,
  costliestAtRisk as realCostliestAtRisk,
  fatigueShare,
} from '../econ/income';
import type { StallView, FatigueCueView } from '../econ/income';
import { flagOn } from '../config/flags';
import { IOS_FLAG_ENABLED } from './ios-tip';

export type { StallCause, StallResolvedBy, StallView, FatigueCueView, FatigueSurface, UiGates } from '../econ/income';
export { setUiGates, resetStallTimers, noteStallChipTap, noteFatigueCueShown, noteFatigueCueTap, fatigueShare };

/** QA-only overlays (compiled out of release with __IOS_FLAG__). Shots plant views here so a live stallTick cannot clear them. */
let qaAtRisk: Partial<Record<WorkerId, number>> | null = null;
let qaStall: StallView | null = null;
let qaCue: FatigueCueView | null = null;

export function workerAtRisk(id: WorkerId, s: GameState, b: Balance): number {
  if (IOS_FLAG_ENABLED && qaAtRisk && qaAtRisk[id] != null) return Math.max(0, qaAtRisk[id]!);
  return realWorkerAtRisk(id, s, b);
}
export function workersAtRisk(s: GameState, b: Balance): Record<WorkerId, number> {
  if (IOS_FLAG_ENABLED && qaAtRisk) {
    const out = {} as Record<WorkerId, number>;
    for (const id of WORKERS) out[id] = workerAtRisk(id, s, b);
    return out;
  }
  return realWorkersAtRisk(s, b);
}
export function costliestAtRisk(s: GameState, b: Balance): WorkerId | null {
  if (IOS_FLAG_ENABLED && qaAtRisk) {
    let best: WorkerId | null = null, v = 0;
    for (const id of WORKERS) { const x = workerAtRisk(id, s, b); if (x > v) { v = x; best = id; } }
    return best;
  }
  return realCostliestAtRisk(s, b);
}
export function stallView(s: GameState, b: Balance): Readonly<StallView> {
  if (IOS_FLAG_ENABLED && qaStall && flagOn(b, 'salesStopped')) return qaStall;
  return realStallView(s, b);
}
export function fatigueCueView(s: GameState, b: Balance): Readonly<FatigueCueView> {
  if (IOS_FLAG_ENABLED && qaCue && flagOn(b, 'salesStopped')) {
    return { ...qaCue, suppressedByStall: qaCue.suppressedByStall || stallView(s, b).shown };
  }
  return realFatigueCueView(s, b);
}

/** Fixture/QA: a never-saved StallSession with safe defaults, then `p` on top. */
export function emptyStallSession(p: Partial<StallSession> = {}): StallSession {
  const { cue, ui, snap, ...rest } = p;
  return {
    sessionS: 0, noSaleS: 0, noCollectS: 0, sinceSaleS: 0, sold: false, collected: false,
    mhTag: 'none', chTag: 'none',
    shown: false, trigger: null, cause: null, stallId: null, stallSeq: 0, shownAtS: 0, tapped: null, rearmFromS: null, c6PrevId: null,
    episode: null, episodeSeq: 0, cueLogged: [], cueForceCleared: false,
    fatigueCueFlag: false, out: [],
    ...rest,
    cue: { on: false, aboveS: 0, belowS: 0, ...(cue ?? {}) },
    ui: { farmScreenActive: false, onboardingDone: false, ...(ui ?? {}) },
    snap: { loss_per_s: 0, loss_share: 0, n_tired: 0, n_asleep: 0, n_paused: 0, ...(snap ?? {}) },
  };
}

/** Fixture/QA: plant or clear the stall chip view on `s.stallSession` (cue fields are kept). */
export function qaWriteStall(s: GameState, v: StallView | null): void {
  const ss = emptyStallSession(s.stallSession ?? {});
  if (!v || !v.shown) { s.stallSession = { ...ss, shown: false, trigger: null, cause: null, stallId: null }; return; }
  s.stallSession = { ...ss, shown: true, trigger: v.trigger, cause: v.cause, stallId: v.stallId,
    noSaleS: v.noSaleS, noCollectS: v.noCollectS, stallSeq: Math.max(ss.stallSeq, v.stallId ?? 0) };
}

/** Fixture/QA: plant or clear the Rule 2 view (`shown` = cue.on && !cueForceCleared). Stall fields are kept. */
export function qaWriteCue(s: GameState, v: Pick<FatigueCueView, 'shown' | 'episodeId' | 'share'> | null): void {
  const ss = emptyStallSession(s.stallSession ?? {});
  if (!v || !v.shown) { s.stallSession = { ...ss, cue: { on: false, aboveS: 0, belowS: 0 }, cueForceCleared: false }; return; }
  const n = v.episodeId != null ? Number(v.episodeId) : NaN;
  const ep = Number.isFinite(n) && n > 0 ? n : (ss.episode ?? 1);
  s.stallSession = { ...ss, cue: { on: true, aboveS: 0, belowS: 0 }, cueForceCleared: false, episode: ep, episodeSeq: Math.max(ss.episodeSeq, ep),
    snap: { ...ss.snap, loss_share: v.share } };
}

export function qaResetAtRisk(): void { qaAtRisk = null; qaStall = null; qaCue = null; }
/** QA/test-only overlay for workersAtRisk (compiled out of release). */
export function qaSetAtRisk(v: Partial<Record<WorkerId, number>> | null): void {
  qaAtRisk = v && Object.keys(v).length ? { ...v } : null;
}


type QaStallHandle = {
  reset(): void;
  atRisk: Partial<Record<WorkerId, number>>;
  stall: StallView | null;
  cue: FatigueCueView | null;
};

if (IOS_FLAG_ENABLED && typeof window !== 'undefined') {
  const state = (): GameState | undefined => (window as unknown as { eggfarm?: { state: GameState } }).eggfarm?.state;
  (window as unknown as { eggfarmQaStall: QaStallHandle }).eggfarmQaStall = {
    reset() { qaAtRisk = null; qaStall = null; qaCue = null; const s = state(); if (s) s.stallSession = emptyStallSession(); },
    get atRisk() { return qaAtRisk ?? {}; },
    set atRisk(v) { qaAtRisk = { ...(v ?? {}) }; },
    get stall() { const s = state(); return s ? { ...emptyStallSession(s.stallSession ?? {}), shown: !!s.stallSession?.shown } as StallView : null; },
    set stall(v) { qaStall = v && v.shown ? v : null; const s = state(); if (s) qaWriteStall(s, v); },
    get cue() { const s = state(); return s ? fatigueCueView(s, (window as unknown as { eggfarm?: { balance: Balance } }).eggfarm?.balance as Balance) : null; },
    set cue(v) { qaCue = v && v.shown ? { ...v, suppressedByStall: v.suppressedByStall ?? false } : null; const s = state(); if (s) qaWriteCue(s, v); },
  };
}
