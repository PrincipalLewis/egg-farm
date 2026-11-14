/**
 * M5.1 breeds family clamps + Flock-sheet view (spec v0.2 rev 3.8.9 ea922eb8 §4.3 L365–368, E8/E9, BR-AC18).
 * Shared clamp used by trait effects (Present/Away/Broody) and by familyClamp — one math path, no duplicates.
 * API names match PR-B UI stubs (breeds-adapter): familyActiveBp, familyClamp, lay_cap_farm.
 */
import type { Balance } from '../config/balance';
import { ROSTER, SLOT_IDX, bc, isBreedId, unlockedSlots, type Family } from '../config/breeds';
import { on, type BreedsSave } from './breeds';
import { slotTraitBp } from './breeds-hatch';
import type { GameState } from './state';

/** Cap for a family at Farm F (Present steps 700 → 1500 at lay_cap_farm per E9). */
export function familyCapBp(family: Family, farmLevel: number, b: Balance): number {
  if (family === 'present') return farmLevel >= bc(b, 'lay_cap_farm') ? bc(b, 'lay_cap_bp') : bc(b, 'lay_cap_bp_lt18');
  if (family === 'away') return bc(b, 'away_cap_bp');
  return bc(b, 'broody_cap_bp');
}

/** Shared clamp: min(raw, familyCap). Trait effects MUST use this (no parallel math). */
export const clampFamilyBp = (rawBp: number, family: Family, farmLevel: number, b: Balance): number =>
  Math.min(rawBp, familyCapBp(family, farmLevel, b));

/** Unclamped sum of settled trait bp for `family` in unlocked slots (0 while settling / empty / flag-off). */
export function familyRawBp(s: GameState, b: Balance, family: Family): number {
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
  return sum;
}

/**
 * Clamped family bp — the figure trait effects apply (PR-B stub name `familyActiveBp(s, b, family)`).
 * Identical to familyClamp(...).clampedBp.
 */
export const familyActiveBp = (s: GameState, b: Balance, family: Family): number =>
  clampFamilyBp(familyRawBp(s, b, family), family, s.farmLevel, b);

/** Flock-sheet family row (E8 "max" label): raw vs clamped from the shared clamp. */
export interface FamilyClamp { rawBp: number; clampedBp: number; atCap: boolean; }

/**
 * Read-only per-family clamp view for UI (PR-A/PR-B Flock sheet). Name + return shape fixed by HoE API (01:04 CET).
 * `atCap` is true when raw ≥ cap (E8: sheet shows "max").
 */
export function familyClamp(s: GameState, b: Balance, family: Family): FamilyClamp {
  const rawBp = familyRawBp(s, b, family);
  const clampedBp = clampFamilyBp(rawBp, family, s.farmLevel, b);
  const capped = familyCapBp(family, s.farmLevel, b);
  return { rawBp, clampedBp, atCap: rawBp >= capped && capped > 0 };
}
