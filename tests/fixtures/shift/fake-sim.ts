/** Test double for ShiftSim (tests only). It is NOT a sim: every value is set by the test, so the sheet is graded on how it
 *  renders/acts on the G0 contract (G0-API.md rev 6 sha256 5225aab8 §2/§3/§12), never on re-derived rules. */
import type { WorkerId, Worker } from '../../../src/sim/workers';
import type { ShiftSim, ChargesView, Eligibility, RestState, RefillCtx, ShiftSheetEntry, RestEtas } from '../../../src/ui/shift-adapter';
export class FakeShiftSim implements ShiftSim {
  chargesV: ChargesView = { charges: 2, cap: 2, nextChargeMs: null };
  ord: WorkerId[] = ['market_hand', 'coop_hand', 'grader'];
  workers: Partial<Record<WorkerId, Worker>> = { market_hand: { energy: 42, cdS: 0 }, coop_hand: { energy: 0, cdS: 0 }, grader: { energy: 81, cdS: 0 } };
  elig: Partial<Record<WorkerId, Eligibility>> = { market_hand: { ok: true }, coop_hand: { ok: true }, grader: { ok: false, reason: 'above_threshold' } };
  rests: Partial<Record<WorkerId, RestState>> = {};
  risk: Partial<Record<WorkerId, number>> = { market_hand: 120000, coop_hand: 80000, grader: 0 };
  auto: Partial<Record<WorkerId, boolean>> = {};
  ago: Partial<Record<WorkerId, number>> = {};
  resume: Partial<Record<WorkerId, number>> = {};
  stall: number | null = 7; seq = 0; toastQ: { n: number; worker: WorkerId | null } | null = null;
  etas?: Partial<Record<WorkerId, RestEtas>>;
  calls: unknown[][] = []; refillResult: { ok: true } | { ok: false; reason: string } = { ok: true };
  restResult: { ok: true } | { ok: false; reason: string } = { ok: true };
  charges = () => this.chargesV;
  eligibility = (id: WorkerId) => this.elig[id] ?? { ok: false, reason: 'not_hired' } as Eligibility;
  order = () => this.ord.slice();
  worker = (id: WorkerId) => this.workers[id];
  rest = (id: WorkerId) => this.rests[id] ?? 'active';
  refillAgoSimMs = (id: WorkerId) => this.ago[id];
  autoOn = (id: WorkerId) => !!this.auto[id];
  atRiskCentsPerS = (id: WorkerId) => this.risk[id] ?? 0;
  stallId = () => this.stall;
  resumeAtCents = (id: WorkerId) => this.resume[id] ?? null;
  get restEtas() { return this.etas ? (id: WorkerId) => this.etas![id] ?? { etaTiredS: null, etaAsleepS: null } : undefined; }
  open = (entry: ShiftSheetEntry, stallId?: number) => { this.calls.push(['open', entry, stallId]); return ++this.seq; };
  refill = (id: WorkerId, ctx: RefillCtx) => { this.calls.push(['refill', id, ctx]); return this.refillResult; };
  setRest = (id: WorkerId, on: boolean, ctx: RefillCtx) => { this.calls.push(['setRest', id, on, ctx]); return this.restResult; };
  setAutoRefill = (id: WorkerId, on: boolean) => { this.calls.push(['setAutoRefill', id, on]); this.auto[id] = on; };
  takeAutoRefillToast = () => { this.calls.push(['takeAutoRefillToast']); const t = this.toastQ; this.toastQ = null; return t; };
}
