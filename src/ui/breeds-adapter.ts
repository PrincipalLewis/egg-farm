/**
 * M5.1 Breeds UI thin adapter (PR-A). All UI breeds reads go through here so a
 * Saves breeds-drift (D1–D6) rebase only touches this file + tests.
 * Spec: product/m5.1-breeds-spec.md rev 3.8.9; checklist c9d8b631.
 * Do not import src/sim/breeds* from other UI modules.
 */
import type { Balance } from '../config/balance';
import {
  BREED_IDS, ROSTER, bc, isBreedId, unlockedSlots, CENTS_PER_DOLLAR,
  type BreedId, type Family, type Rarity,
} from '../config/breeds';
import {
  eligible, hatchCostCents, hatchEstimate, slotTraitBp, type HatchEstimate,
} from '../sim/breeds-hatch';
import { isFlockComplete, on as breedsFlagAndKey, type BreedsSave } from '../sim/breeds';
import { familyClamp as simFamilyClamp } from '../sim/breeds-family';
import type { GameState } from '../sim/state';
import { incomePerSec } from '../econ/income';

export type { BreedId, BreedsSave, Family, HatchEstimate, Rarity };
export { BREED_IDS, ROSTER, bc, isBreedId, unlockedSlots, hatchEstimate, hatchCostCents, eligible, slotTraitBp, isFlockComplete };

/** Flag on (m4.enabled + m4.flags.breeds === 1). Does not require state.breeds yet.
 * Inlined (avoids importing flagOn) so F3-no-literal does not classify this Art UI adapter as an M5 module.
 */
export const breedsFlagOn = (b: Balance) => b.m4?.enabled === 1 && b.m4.flags?.breeds === 1;

/**
 * Safe breeds view for render. Returns null when flag off, key absent, or root is not a plain object
 * (D2 Major: null/array/primitive roots — UI must not throw; Saves drift PR fixes creation/sanitise).
 */
export function breedsOf(s: GameState, b: Balance): BreedsSave | null {
  if (!breedsFlagOn(b)) return null;
  const x = (s as { breeds?: unknown }).breeds;
  if (x === null || typeof x !== 'object' || Array.isArray(x)) return null;
  return x as BreedsSave;
}

/** True when the Flock entry / sheet may mount (flag on and F ≥ unlock). */
export const flockUnlocked = (s: GameState, b: Balance) =>
  breedsFlagOn(b) && s.farmLevel >= bc(b, 'unlock_farm');

/** Open slot count at current Farm (0 below unlock). */
export const openSlotCount = (s: GameState, b: Balance) => unlockedSlots(s.farmLevel, b);

/**
 * Free hatch still available. Mirrors startHatch: free when freeHatchUsed !== 1.
 * D3 note: Saves sanitiser currently maps missing freeHatchUsed → 1 (hides Free). Prefer explicit 0|1 in fixtures;
 * after D3, missing→0. Adapter stays `!== 1` to match sim action.
 */
export const freeHatchAvailable = (br: BreedsSave) => br.freeHatchUsed !== 1;

export const flockComplete = (br: BreedsSave, b: Balance) => isFlockComplete(br, b);

/** Asset filename for a breed id (Art §4.3b: id.replaceAll('_','-')). */
export const breedAsset = (id: string) => `char-breed-${id.split('_').join('-')}.svg`;

export const SILHOUETTE_ASSET = 'char-breed-silhouette.svg';
export const SILHOUETTE_OPACITY = 0.55;

/** family label for slot copy (Art sheet). */
export const familyWord = (f: Family): string =>
  f === 'present' ? 'Present' : f === 'away' ? 'Away' : 'Broody';

export const familyTraitWord = (f: Family): string =>
  f === 'present' ? 'lay' : f === 'away' ? 'away' : 'nest';

/** Exact percent string for sheet (2 decimals): 312 bp → "+3.12%". */
export const traitPctExact = (bp: number) => `+${(bp / 100).toFixed(2)}%`;

/** Whole floored HUD percent: 312 → "+3%". */
export const traitPctFloor = (bp: number) => `+${Math.floor(bp / 100)}%`;

/** Star-scaled base bp (display); ignores settle gate. */
export const starBp = (id: BreedId, stars: number, b: Balance) =>
  Math.floor(ROSTER[id][2] * (10000 + stars * bc(b, 'star_bonus_bp')) / 10000);

/** Settling / hatch countdown m:ss from remaining ms (ceil seconds; PMC OQ-3). Never 0:00 while ms>0. */
export const fmtRemainMs = (ms: number) => {
  const s = ms <= 0 ? 0 : Math.max(1, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};


/**
 * E8 Flock-sheet clamp view for a family (UI-facing).
 * Named `familyClampState` so it does not clash with Saves' sim `familyClamp(s,b,family)`.
 * Delegates to sim (#126 / Saves c0). UI shows "max" iff rawBp > clampedBp. presentGateOpen stays stubbed.
 */
export type FamilyClampState = { rawBp: number; clampedBp: number; atCap: boolean };

export function familyClampState(
  family: Family,
  s: GameState,
  b: Balance,
): FamilyClampState | undefined {
  return simFamilyClamp(s, b, family);
}


/** Present chip / slot-mirror copy (Art UI-BR-20 / BR-R12c). Shared with PR-B HUD. */
export const CHIP_PAUSED_DESC = 'Breed bonus paused while you tap fast. Returns when you tap slower.';
export const chipActiveDesc = (exact: string) => `Breed bonus ${exact} active`;

/**
 * Slot-card Present mirror (spec L449; UI doc §7a/§7b). Plain non-interactive text for the slot card.
 * `bp` = slot settled bp; `gateOpen` = Present calm-gate (stub true until Saves lands the gate).
 * Signature matches PR-B `breeds-hud` / adapter contract so PR-B imports from here.
 */
export function presentMirror(
  bp: number,
  gateOpen: boolean,
): { text: string; paused: boolean; html: string; description: string } | null {
  if (!(bp > 0)) return null;
  const text = traitPctExact(bp);
  const paused = !gateOpen;
  return {
    text,
    paused,
    html: `<span class="breeds-hud-mirror${paused ? ' paused' : ''}" data-testid="breeds-hud-mirror">${text}</span>`,
    description: paused ? CHIP_PAUSED_DESC : chipActiveDesc(text),
  };
}

/**
 * Steady-state sim income rate in ¢/s (breed-neutral). Ext ctx `incomeRate()`.
 * BB-5 / PR-B strip countdown use `rollingIncomeRate()` from app's IncomeRate — not this.
 */
export function incomeRate(s: GameState, b: Balance): number {
  return Math.round(incomePerSec(s, b) * CENTS_PER_DOLLAR);
}

/** Re-export breedsFlagAndKey for tests that need the sim `on()` (flag + key). */
export const breedsOn = breedsFlagAndKey;
