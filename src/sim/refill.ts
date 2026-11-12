/**
 * rc2 Refill + autoRefill views (G0-API.md rev 10, sha256 bcf95315). G1: chargesOf (m3, lazy) and chargesView.
 * G2 M2: resetRefillSession, refillSessionTotals, autoRefillOn. Mutators, restEligibility and the tick follow.
 * UI-safe views: no side effects. Refill never writes asleep_s or clockWage state (D-HOE-61).
 *
 * TODO(G2/M2): one-line hook-up of resetRefillSession into resetSessionFields
 * (src/sim/session.ts:24, Architect Draft PR #138 head 7da29009, branch
 * v5/session-rotate-hook). #138 is not on rc/v5 (waits on #123). Merge
 * forward only with HoE's OK. Do NOT add registerSessionEnd or custom
 * rotate wiring. Same pattern as clockWage's resetAsleepSession.
 */
import type { Balance } from '../config/balance';
import { tcNum } from '../config/formulas';
import { flagOn } from '../config/flags';
import type { GameState } from './state';
import type { WorkerId } from './workers';
import { ENERGY_FULL } from './pause'; // named 100 (energy percent scale); used below for S1 0.1 s (F3-no-literal)


export interface ChargesView { charges: number; cap: number; nextChargeMs: number | null } // null at the cap (F-4)

/** Lazy accessor (Architect m3): the stored value, or start_charges when the key is absent. Does not write. */
export function chargesOf(s: GameState, b: Balance): number {
  return s.refillCharges ?? tcNum(b, 'start_charges');
}

/**
 * Flag off: {0, 0, null}. Flag on, before the first materialising tick (G0 §12 (b)):
 * charges = cap when the key is missing, and nextChargeMs = null at the cap.
 */
export function chargesView(s: GameState, b: Balance): Readonly<ChargesView> {
  if (!flagOn(b, 'rc2Refill')) return { charges: 0, cap: 0, nextChargeMs: null };
  const cap = tcNum(b, 'charge_cap');
  const charges = s.refillCharges ?? cap;
  return { charges, cap, nextChargeMs: charges >= cap ? null : (s.chargeNextMs ?? Math.round(tcNum(b, 'charge_regen_s') * 1000)) };
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

/** D-HOE-61: the switch's state. False when rc2Refill=0 or autoRefill=0, or the key is not `true`. Pure; writes nothing. */
export function autoRefillOn(s: GameState, id: WorkerId, b: Balance): boolean {
  return flagOn(b, 'rc2Refill') && flagOn(b, 'autoRefill') && s.workers[id]?.autoRefill === true;
}
