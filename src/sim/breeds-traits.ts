/**
 * M5.1 breeds PR-B traits (spec v0.2 rev 3.8.9 ea922eb8 §4.4): Present calm-gate (BR-R12/R12b), Away (BR-R13), Broody (BR-R14).
 * Session-only calm ring (not saved; every load / offline ≥ 60 s starts empty → gate open). Flag-off: identity, no new state.
 */
import type { Balance } from '../config/balance';
import { m4On, tcNum as tc } from '../config/formulas';
import { BP_ONE, ROSTER, SLOT_IDX, bc, isBreedId, unlockedSlots, type Family } from '../config/breeds';
import { on, type BreedsSave } from './breeds';
import { slotTraitBp } from './breeds-hatch';
import { prodEggsPerSec, coopCap } from './tracks';
import type { GameState } from './state';

/** Session-only calm-hands ring (BR-R12b). Not in M5_SAVED_FIELDS / M5_SESSION_FIELDS; stripped like breedsRawSlots. */
export interface BreedsCalm {
  /** Cumulative focus advance this session, integer ms. */
  focusMs: number;
  /** Counted-tap stamps (focusMs after that tick's fT), newest last; capacity ≥ k. */
  stamps: number[];
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
const emptyCalm = (): BreedsCalm => ({ focusMs: 0, stamps: [], activeMs: 0, lostCount: 0, open: true });

/** Present family clamp at Farm F (E9 / BR-AC18). */
export const presentCapBp = (F: number, b: Balance) =>
  F >= bc(b, 'lay_cap_farm') ? bc(b, 'lay_cap_bp') : bc(b, 'lay_cap_bp_lt18');

/** Sum of settled trait bp for `family` in unlocked slots, then family clamp where applicable. */
export function familyTraitBp(s: GameState, b: Balance, family: Family): number {
  if (!on(s, b)) return 0;
  const x = s.breeds as BreedsSave;
  const open = unlockedSlots(s.farmLevel, b);
  let sum = 0;
  for (const i of SLOT_IDX) {
    if (i >= open) break;
    const id = x.slots[i];
    if (!isBreedId(id) || ROSTER[id][1] !== family) continue;
    sum += slotTraitBp(x, i, b);
  }
  if (family === 'present') return Math.min(sum, presentCapBp(s.farmLevel, b));
  return sum;
}

export const presentBp = (s: GameState, b: Balance) => familyTraitBp(s, b, 'present');
export const awayBp = (s: GameState, b: Balance) => familyTraitBp(s, b, 'away');
export const broodyBreedBp = (s: GameState, b: Balance) => familyTraitBp(s, b, 'broody');

/** BR-R12b: gate open iff count of stamps in (focusMs − W×1000, focusMs] < k (k=0 → always open). */
export function presentGateOpen(s: GameState, b: Balance): boolean {
  if (!breedsFlag(b)) return true;
  const k = bc(b, 'present_calm_k');
  if (k === 0) return true;
  const calm = s.breedsCalm;
  if (!calm || calm.stamps.length === 0) return true;
  const Wms = bc(b, 'present_calm_w_s') * 1000;
  let n = 0;
  for (const t of calm.stamps) if (calm.focusMs - t < Wms) n++;
  return n < k;
}

/** session_end present_* (errata / Q-COL-9): required breeds-on; 0 if no Present slotted; absent flag-off. */
export function sessionEndPresentFields(s: GameState, b: Balance): { present_active_s?: number; present_lost_count?: number } {
  if (!breedsFlag(b)) return {};
  const calm = s.breedsCalm;
  const activeMs = calm?.activeMs ?? 0;
  return {
    present_active_s: Math.round(activeMs / 100) / 10,
    present_lost_count: calm?.lostCount ?? 0,
  };
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

function stamp(s: GameState, b: Balance, ownWindow: boolean): GameState {
  if (ownWindow) {
    if (s.farmLevel < tc(b, 'streak_unlock_farm') || (s.tapCreditCdS ?? 0) > EPS) return s;
  }
  const calm = s.breedsCalm ?? emptyCalm();
  const k = bc(b, 'present_calm_k');
  const cap = k > 0 ? k : 1;
  const stamps = calm.stamps.length >= cap ? [...calm.stamps.slice(calm.stamps.length - cap + 1), calm.focusMs] : [...calm.stamps, calm.focusMs];
  const out: GameState = { ...s, breedsCalm: { ...calm, stamps } };
  return ownWindow ? { ...out, tapCreditCdS: tc(b, 'tap_credit_min_s') } : out;
}

/**
 * Per focused tick (BR-R12b order (0)/(4)/(5)): advance focusMs, eval gate, accumulate activeMs / lostCount,
 * then add Present eggs: prodEggsPerSec × focusS × presentBp / 10000 (gate open). Also ages the breeds-only credit window.
 */
export function breedsPresentTick(s: GameState, dt: number, focusS: number, b: Balance): GameState {
  if (!breedsFlag(b) || !s.breeds) return s;
  let out = s;
  // breeds-only credit window (sim dt); streak/tapCoins own the countdown when either is on.
  const streakOrTap = (m4On(b) && (b.m4?.flags?.streak === 1 || b.m4?.flags?.tapCoins === 1));
  if (!streakOrTap && (out.tapCreditCdS ?? 0) > EPS) {
    out = { ...out, tapCreditCdS: Math.max(0, out.tapCreditCdS! - dt) };
  }
  const fT = focusS > 0 ? Math.round(focusS * 1000) : 0;
  if (fT <= 0 && !out.breedsCalm) return out;
  let calm = out.breedsCalm ?? emptyCalm();
  if (fT > 0) {
    calm = { ...calm, focusMs: calm.focusMs + fT };
    const open = gateFrom(calm, b);
    const hasPresent = presentBp(out, b) > 0;
    let lost = calm.lostCount, active = calm.activeMs;
    if (hasPresent && calm.open && !open) lost++;
    if (hasPresent && open) active += fT;
    calm = { ...calm, open, lostCount: lost, activeMs: active };
  }
  out = { ...out, breedsCalm: calm };
  // Present eggs (BR-R12): only on focus, gate open, bp > 0. Base coop fill already ran on full dt.
  const bp = calm.open ? presentBp(out, b) : 0;
  if (bp > 0 && focusS > 0) {
    const add = prodEggsPerSec(out, b, { suspended: false }) * focusS * bp / BP_ONE;
    if (add > 0) {
      const cap = coopCap(out, b);
      out = { ...out, coop: Math.min(cap, out.coop + add) };
    }
  }
  return out;
}

function gateFrom(calm: BreedsCalm, b: Balance): boolean {
  const k = bc(b, 'present_calm_k');
  if (k === 0) return true;
  if (calm.stamps.length === 0) return true;
  const Wms = bc(b, 'present_calm_w_s') * 1000;
  let n = 0;
  for (const t of calm.stamps) if (calm.focusMs - t < Wms) n++;
  return n < k;
}

/** E22b / BR-AC49: offline ≥ 60 s empties the ring (gate open); keeps activeMs / lostCount / focusMs. */
export function breedsCalmClearRing(s: GameState): GameState {
  if (!s.breedsCalm) return s;
  return { ...s, breedsCalm: { ...s.breedsCalm, stamps: [], open: true } };
}
