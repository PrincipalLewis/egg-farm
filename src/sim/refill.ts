/**
 * rc2 Refill + autoRefill views (G0-API.md rev 9, sha256 bcc52937). G1: chargesOf (m3, lazy) and chargesView.
 * Mutators, restEligibility and the tick land at G2. UI-safe: no side effects.
 */
import type { Balance } from '../config/balance';
import { tcNum } from '../config/formulas';
import { flagOn } from '../config/flags';
import type { GameState } from './state';

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
