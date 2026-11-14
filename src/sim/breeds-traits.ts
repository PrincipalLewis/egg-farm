/**
 * M5.1 breeds PR-B traits (spec v0.2 rev 3.8.9 ea922eb8 §4.4): Present calm-gate (BR-R12/R12b), Away (BR-R13), Broody (BR-R14).
 * Session-only calm ring (not saved; every load / offline ≥ 60 s starts empty → gate open). Flag-off: identity, no new state.
 */
import type { Balance } from '../config/balance';
import { m4On, tcNum as tc } from '../config/formulas';
import { BP_ONE, bc } from '../config/breeds';
import { familyActiveBp } from './breeds-family';
import { prodEggsPerSec, coopCap } from './tracks';
import type { GameState } from './state';

/** Session-only calm-hands ring (BR-R12b). Not in M5_SAVED_FIELDS / M5_SESSION_FIELDS; stripped like breedsRawSlots. */
export interface BreedsCalm {
  /** Cumulative focus advance this session, integer ms. */
  focusMs: number;
  /** Counted-tap stamps (focusMs after that tick's fT), newest last; capacity ≥ k. */
  stamps: number[];
  /** Credited taps waiting to stamp after the next focused tick's fT (BR-R12b order (0)→(3)). */
  pendingCount: number;
  /** Σ fT (ms) while ≥1 settled Present slotted and gate open. */
  activeMs: number;
  /** open → closed transitions while Present was slotted. */
  lostCount: number;
  /** Last evaluated gate (true = open). */
  open: boolean;
}

const EPS = 1e-9;
/** m4.flags.breeds without importing flagOn (keeps this file out of the F3 flagOn scan). */
const breedsFlag = (b: Balance) => m4On(b) && b.m4?.flags?.breeds === 1;
const emptyCalm = (): BreedsCalm => ({ focusMs: 0, stamps: [], pendingCount: 0, activeMs: 0, lostCount: 0, open: true });

/** Clamped family bp via shared familyActiveBp (breeds-family / commit 0) — no duplicate clamp math. */
export const presentBp = (s: GameState, b: Balance) => familyActiveBp(s, b, 'present');
export const awayBp = (s: GameState, b: Balance) => familyActiveBp(s, b, 'away');
export const broodyBreedBp = (s: GameState, b: Balance) => familyActiveBp(s, b, 'broody');

/** BR-R14: broodyBp_eff = floor(broodyBp × (10000 + broodyBreedBp) / 10000), broodyBp = round(tc_broody_income_share × 10000).
 *  broodyBreedBp is familyActiveBp(..., "broody") clamped to bc_broody_cap_bp (= 2000). Nest accrual (when built) must use broodyBpEff. */
export const broodyBaseBp = (b: Balance) => Math.round(tc(b, 'broody_income_share') * BP_ONE);
export const broodyBpEff = (s: GameState, b: Balance) =>
  Math.floor(broodyBaseBp(b) * (BP_ONE + broodyBreedBp(s, b)) / BP_ONE);

/** Pure BR-R12b gate: open iff stamps in (focusMs − W×1000, focusMs] < k. k = 0 → always open (BR-AC48). */
export function calmGateOpen(focusMs: number, stamps: readonly number[], wS: number, k: number): boolean {
  if (k === 0) return true;
  if (stamps.length === 0) return true;
  const Wms = wS * 1000;
  let n = 0;
  for (const t of stamps) if (focusMs - t < Wms) n++;
  return n < k;
}

/** PR-B stub API: presentGateOpen(s, b). Flag-off / empty ring → open; k from bc_present_calm_k. */
export function presentGateOpen(s: GameState, b: Balance): boolean {
  if (!breedsFlag(b)) return true;
  const calm = s.breedsCalm;
  if (!calm) return true;
  return calmGateOpen(calm.focusMs, calm.stamps, bc(b, 'present_calm_w_s'), bc(b, 'present_calm_k'));
}

/** session_end present_* (errata / Q-COL-9): required breeds-on; 0 if no Present slotted; absent flag-off. */
export function sessionEndPresentFields(s: GameState, b: Balance): { present_active_s?: number; present_lost_count?: number } {
  if (!breedsFlag(b)) return {};
  const calm = s.breedsCalm;
  const activeMs = calm?.activeMs ?? 0;
  // Q-COL-9 / BR-AC53: round(ΣfT/100)/10 half-up on integer ms (Math.round).
  return {
    present_active_s: Math.round(activeMs / 100) / 10,
    present_lost_count: calm?.lostCount ?? 0,
  };
}
/** Zero session_end present_* accumulators on a session rotate (mutates in place). Leaves the calm ring,
 *  focusMs, pendingCount and open. Idempotent; no-op if breedsCalm is absent (flag-off byte-identical). */
export function resetPresentSession(s: GameState): void {
  const calm = s.breedsCalm;
  if (!calm) return;
  calm.activeMs = 0;
  calm.lostCount = 0;
}

/** Credited-tap stamp for the calm ring. Runs whenever breeds is on (HoE Q-COL-12), even with streak/tapCoins off. */
export function breedsNoteCreditedTap(s: GameState, b: Balance, credited: boolean | undefined): GameState {
  if (!breedsFlag(b) || !s.breeds) return s;
  // When streak/tapCoins reported credited explicitly: only stamp on true.
  if (credited === false) return s;
  if (credited === true) return stamp(s, b, false);
  // breeds-only detector (streak + tapCoins both off): unlock + 1 s window, pay nothing.
  return stamp(s, b, true);
}

/** Queue a counted-tap stamp; flushed after the next focused tick's fT (BR-R12b order (0) fT → (3) stamp). */
function stamp(s: GameState, b: Balance, ownWindow: boolean): GameState {
  if (ownWindow) {
    if (s.farmLevel < tc(b, 'streak_unlock_farm') || (s.tapCreditCdS ?? 0) > EPS) return s;
  }
  const calm = s.breedsCalm ?? emptyCalm();
  const out: GameState = {
    ...s,
    breedsCalm: { ...calm, pendingCount: (calm.pendingCount ?? 0) + 1 },
  };
  return ownWindow ? { ...out, tapCreditCdS: tc(b, 'tap_credit_min_s') } : out;
}

/**
 * Per focused tick (BR-R12b order (0)/(3)/(4)/(5)): advance focusMs by fT, flush pending stamps at post-fT focusMs,
 * eval gate, accumulate activeMs / lostCount, then Present eggs with fT/1000.
 * `focusFtMs` = BR-R12b integer-ms share from FrameClock (absent → round(focusS×1000) for direct step() tests).
 */
export function breedsPresentTick(s: GameState, dt: number, focusS: number, b: Balance, focusFtMs?: number): GameState {
  if (!breedsFlag(b) || !s.breeds) return s;
  let out = s;
  // breeds-only credit window (sim dt); streak/tapCoins own the countdown when either is on.
  const streakOrTap = (m4On(b) && (b.m4?.flags?.streak === 1 || b.m4?.flags?.tapCoins === 1));
  if (!streakOrTap && (out.tapCreditCdS ?? 0) > EPS) {
    out = { ...out, tapCreditCdS: Math.max(0, out.tapCreditCdS! - dt) };
  }
  const fT = focusFtMs !== undefined ? Math.max(0, Math.floor(focusFtMs))
    : (focusS > 0 ? Math.round(focusS * 1000) : 0);
  if (fT <= 0 && !out.breedsCalm) return out;
  let calm = out.breedsCalm ?? emptyCalm();
  if (fT > 0) {
    // (0) fT
    let focusMs = calm.focusMs + fT;
    let stamps = calm.stamps;
    // (3) stamp at post-fT focusMs
    const pending = calm.pendingCount ?? 0;
    if (pending > 0) {
      const k = bc(b, 'present_calm_k');
      const cap = k > 0 ? k : 1;
      stamps = stamps.slice();
      for (let i = 0; i < pending; i++) {
        stamps = stamps.length >= cap ? [...stamps.slice(stamps.length - cap + 1), focusMs] : [...stamps, focusMs];
      }
    }
    // (4) gate
    const open = calmGateOpen(focusMs, stamps, bc(b, 'present_calm_w_s'), bc(b, 'present_calm_k'));
    const hasPresent = presentBp(out, b) > 0;
    let lost = calm.lostCount, active = calm.activeMs;
    if (hasPresent && calm.open && !open) lost++;
    if (hasPresent && open) active += fT;
    calm = { ...calm, focusMs, stamps, pendingCount: 0, open, lostCount: lost, activeMs: active };
  }
  out = { ...out, breedsCalm: calm };
  // (5) Present eggs (BR-R12): prod × (fT/1000) × presentBp / 10000. Base coop fill already ran on full dt.
  const bp = calm.open ? presentBp(out, b) : 0;
  const focusTermS = fT / 1000;
  if (bp > 0 && focusTermS > 0) {
    const add = prodEggsPerSec(out, b, { suspended: false }) * focusTermS * bp / BP_ONE;
    if (add > 0) {
      const cap = coopCap(out, b);
      out = { ...out, coop: Math.min(cap, out.coop + add) };
    }
  }
  return out;
}

/** E22b / BR-AC49: offline ≥ 60 s empties the ring (gate open); keeps activeMs / lostCount / focusMs. */
export function breedsCalmClearRing(s: GameState): GameState {
  if (!s.breedsCalm) return s;
  return { ...s, breedsCalm: { ...s.breedsCalm, stamps: [], pendingCount: 0, open: true } };
}
