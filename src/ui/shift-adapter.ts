/**
 * Shift sheet ↔ sim adapter (Features). THIN by design: every value the sheet shows or every action it takes goes through
 * this interface, whose names are the Saves contract verbatim:
 *   engineering/tasks/v5-refill-sim/G0-API.md rev 6 (sha256 5225aab8, §2 views, §3 mutators, §12 answers to Features)
 *   engineering/tasks/v5-ui-ss-fatigue/SIM-API.md rev 3 (sha256 38bfc0d1, workerAtRisk + StallView, int stallId from #128 @ b7a562f8)
 * The UI never derives a sim rule (charges, thresholds, regen, eligibility, ETAs) and emits no telemetry: the sim does.
 *
 * Binding: neither src/sim/refill.ts (saves/v5-refill-sim, G1) nor src/econ/stall.ts (#128) is on this base yet, so
 * `bindShiftSim(g, b, views)` takes the pure view functions as an argument. TODO(Saves G1): app.ts passes
 * `{ ...await import('../sim/refill'), workerAtRisk, stallView }` once those modules land; until then `NULL_SHIFT_SIM` keeps
 * the sheet inert (flag_off views) and openShiftSheet is a no-op at rc2Refill=0 anyway.
 */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import type { Worker, WorkerId } from '../sim/workers';
import { resumeAtCents } from './workers-ui';

export type ShiftSheetEntry = 'nav' | 'card' | 'stall_chip' | 'fatigue_chip';
/** G0 §2. `nextChargeMs` is SIM ms, null at the cap (F-4). */
export interface ChargesView { charges: number; cap: number; nextChargeMs: number | null }
export type RefillBlock = 'flag_off' | 'not_hired' | 'unpaid' | 'above_threshold' | 'no_charges';
export type Eligibility = { ok: true } | { ok: false; reason: RefillBlock };
export type RestState = 'active' | 'paused' | 'resting';
/** G0 §3 RefillCtx: built ONCE at open and reused until closeComplete (§12 Q2). */
export interface RefillCtx { sheetId: number | null; entryPoint: ShiftSheetEntry; stallId?: number }
export type ActionResult = { ok: true } | { ok: false; reason: string };
/** G2 additions (§12 Q6/Q7). Optional until Saves G2 lands. */
export type RestBlock = string;
export interface RestEtas { etaTiredS: number | null; etaAsleepS: number | null }

/** Pure sim views (G0 §2 + SIM-API), called with the live state every frame. */
export interface ShiftViews {
  chargesView(s: GameState, b: Balance): Readonly<ChargesView>;
  refillEligibility(s: GameState, id: WorkerId, b: Balance): Eligibility;
  shiftOrder(s: GameState, b: Balance): WorkerId[];
  restState(w: Worker, b: Balance): RestState;
  refillAgoSimMs(s: GameState, id: WorkerId): number | undefined;
  autoRefillOn(s: GameState, id: WorkerId, b: Balance): boolean;
  workerAtRisk(id: WorkerId, s: GameState, b: Balance): number;
  stallView(s: GameState, b: Balance): { stallId: number | null };
  /** TODO(Saves G2 Q6): pure restEligibility(s, id, b). Absent → the Rest toggle stays enabled and setRest's {ok:false} refuses. */
  restEligibility?(s: GameState, id: WorkerId, b: Balance): { ok: true } | { ok: false; reason: RestBlock };
  /** TODO(Saves G2 Q7): restState gains etaTiredS / etaAsleepS (Rest multiplier applied). Absent → rows show `Energy N%` only. */
  restEtas?(s: GameState, id: WorkerId, b: Balance): RestEtas;
}
/** Game wrappers (G0 §12 Q1, names confirmed by Saves). */
export interface ShiftGame {
  readonly state: GameState;
  openShiftSheet(entry: ShiftSheetEntry, stallId?: number): number;
  refill(id: WorkerId, ctx: RefillCtx): ActionResult;
  setRest(id: WorkerId, on: boolean, ctx: RefillCtx): ActionResult;
  setAutoRefill(id: WorkerId, on: boolean): void;
  takeAutoRefillToast(): { n: number; worker: WorkerId | null } | null;
}

/** What the sheet consumes: state-bound views + wrappers. */
export interface ShiftSim {
  charges(): Readonly<ChargesView>;
  eligibility(id: WorkerId): Eligibility;
  order(): WorkerId[];
  worker(id: WorkerId): Worker | undefined;
  rest(id: WorkerId): RestState;
  refillAgoSimMs(id: WorkerId): number | undefined;
  autoOn(id: WorkerId): boolean;
  atRiskCentsPerS(id: WorkerId): number;
  stallId(): number | null;
  /** #83 rc1 Unpaid sentence amount (existing UI helper workers-ui.resumeAtCents), null when not Unpaid. */
  resumeAtCents(id: WorkerId): number | null;
  restEligibility?(id: WorkerId): { ok: true } | { ok: false; reason: RestBlock };
  restEtas?(id: WorkerId): RestEtas;
  open(entry: ShiftSheetEntry, stallId?: number): number;
  refill(id: WorkerId, ctx: RefillCtx): ActionResult;
  setRest(id: WorkerId, on: boolean, ctx: RefillCtx): ActionResult;
  setAutoRefill(id: WorkerId, on: boolean): void;
  takeAutoRefillToast(): { n: number; worker: WorkerId | null } | null;
}

export function bindShiftSim(g: ShiftGame, b: Balance, v: ShiftViews): ShiftSim {
  const s = () => g.state;
  return {
    charges: () => v.chargesView(s(), b),
    eligibility: id => v.refillEligibility(s(), id, b),
    order: () => v.shiftOrder(s(), b),
    worker: id => s().workers?.[id],
    rest: id => { const w = s().workers?.[id]; return w ? v.restState(w, b) : 'active'; },
    refillAgoSimMs: id => v.refillAgoSimMs(s(), id),
    autoOn: id => v.autoRefillOn(s(), id, b),
    atRiskCentsPerS: id => v.workerAtRisk(id, s(), b),
    stallId: () => v.stallView(s(), b).stallId,
    resumeAtCents: id => resumeAtCents(s(), b, id),
    restEligibility: v.restEligibility ? id => v.restEligibility!(s(), id, b) : undefined,
    restEtas: v.restEtas ? id => v.restEtas!(s(), id, b) : undefined,
    open: (entry, stallId) => g.openShiftSheet(entry, stallId),
    refill: (id, ctx) => g.refill(id, ctx),
    setRest: (id, on, ctx) => g.setRest(id, on, ctx),
    setAutoRefill: (id, on) => g.setAutoRefill(id, on),
    takeAutoRefillToast: () => g.takeAutoRefillToast(),
  };
}

/** Inert sim (flag_off everywhere) until Saves G1 binds the real views. */
export const NULL_SHIFT_SIM: ShiftSim = {
  charges: () => ({ charges: 0, cap: 0, nextChargeMs: null }), eligibility: () => ({ ok: false, reason: 'flag_off' }), order: () => [],
  worker: () => undefined, rest: () => 'active', refillAgoSimMs: () => undefined, autoOn: () => false, atRiskCentsPerS: () => 0,
  stallId: () => null, resumeAtCents: () => null, open: () => 0, refill: () => ({ ok: false, reason: 'flag_off' }), setRest: () => ({ ok: false, reason: 'flag_off' }),
  setAutoRefill: () => {}, takeAutoRefillToast: () => null,
};
