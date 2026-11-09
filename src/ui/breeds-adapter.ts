/**
 * M5.1 Breeds UI thin adapter (PR-A). All UI breeds reads go through here so a
 * Saves breeds-drift (D1–D6) rebase only touches this file + tests.
 * Spec: product/m5.1-breeds-spec.md rev 3.8.9; checklist c9d8b631.
 * Do not import src/sim/breeds* from other UI modules.
 */
import type { Balance } from '../config/balance';
import { flagOn } from '../config/flags';
import {
  BREED_IDS, ROSTER, bc, isBreedId, unlockedSlots, type BreedId, type Family, type Rarity,
} from '../config/breeds';
import {
  eligible, hatchCostCents, hatchEstimate, slotTraitBp, type HatchEstimate,
} from '../sim/breeds-hatch';
import { isFlockComplete, on as breedsFlagAndKey, type BreedsSave } from '../sim/breeds';
import type { GameState } from '../sim/state';

export type { BreedId, BreedsSave, Family, HatchEstimate, Rarity };
export { BREED_IDS, ROSTER, bc, isBreedId, unlockedSlots, hatchEstimate, hatchCostCents, eligible, slotTraitBp, isFlockComplete };

/** Flag on (m4.enabled + m4.flags.breeds === 1). Does not require `state.breeds` yet. */
export const breedsFlagOn = (b: Balance) => flagOn(b, 'breeds');

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

/** Settling / hatch countdown m:ss from remaining ms (floor seconds; OQ-3 PMC default until ruled). */
export const fmtRemainMs = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};

/** Re-export breedsFlagAndKey for tests that need the sim `on()` (flag + key). */
export const breedsOn = breedsFlagAndKey;
