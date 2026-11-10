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
 * HoE stub (2026-11-10): **undefined ⇒ no "max" label**.
 * Clamp-bind follow-up (`v5/breeds-ui-a-clamp-bind`) delegates to sim and returns
 * `{rawBp, clampedBp, atCap}`. UI shows "max" iff `rawBp > clampedBp`. PR-B uses this name.
 */
export type FamilyClampState = { rawBp: number; clampedBp: number; atCap: boolean };

export function familyClampState(
  _family: Family,
  _br?: BreedsSave,
  _b?: Balance,
  _farmLevel?: number,
): FamilyClampState | undefined {
  return undefined;
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

// ============================================================================================================================
// PR-B ADDITIONS (Features, feat/v5-breeds-ui-prB). Additive getters only (seams doc §2): nothing above this line is renamed,
// moved or re-signed. Stacked on PR-A v5/breeds-ui-a (merged forward); everything above is PR-A's file unchanged
// (seams doc 3d40e76e §2: PR-B adds getters only).
// ============================================================================================================================

/**
 * Present calm-gate tunables (spec §5 L648-654; BR-R12b/c). TODO(Saves #126 commit 1): `presentGateOpen` + its bc() keys
 * land in Saves' commit 1; then read `bc(b, 'present_calm_w_s' | 'present_calm_k')` and delete this object.
 */
export const PRB_STUB_TUNABLES = {
  /** bc_present_calm_w_s: trailing focus-seconds window of the Present rate gate (BR-R12b). */
  present_calm_w_s: 10,
  /** bc_present_calm_k: counted taps in the window that close the gate; 0 = never pending (BR-R12c). */
  present_calm_k: 6,
} as const;

// ---- Family clamps: names, signatures, bc() keys and shapes mirror Saves #126 commit 0 (d4b5fdc,
// src/sim/breeds-family.ts + BC_SPEC_DEFAULTS). Spec-value stand-ins until Saves is in the stack. ---------------------------

/** The five family-clamp bc() keys, exactly as Saves names them (no bc_ prefix). */
export type BreedsCapKey = 'lay_cap_bp_lt18' | 'lay_cap_bp' | 'lay_cap_farm' | 'away_cap_bp' | 'broody_cap_bp';
/**
 * TODO(Saves #126): stand-ins for `BC_SPEC_DEFAULTS[k]` (spec ea922eb8 §4.3 L365-368, E9). When #126 is in the stack,
 * `capBc` becomes `bc(b, k)` and this object is deleted.
 */
export const PRB_CAP_STANDINS: Readonly<Record<BreedsCapKey, number>> = {
  lay_cap_bp_lt18: 700, lay_cap_bp: 1500, lay_cap_farm: 18, away_cap_bp: 3000, broody_cap_bp: 2000,
};
/** `bc()`-shaped read of a cap key. TODO(Saves #126): `=> bc(b, k)`. */
export const capBc = (_b: Balance, k: BreedsCapKey): number => PRB_CAP_STANDINS[k];

/** Family cap at Farm F (Present steps lay_cap_bp_lt18 → lay_cap_bp at lay_cap_farm, E9). Saves: `familyCapBp`. TODO(Saves #126). */
export function familyCapBp(family: Family, farmLevel: number, b: Balance): number {
  if (family === 'present') return farmLevel >= capBc(b, 'lay_cap_farm') ? capBc(b, 'lay_cap_bp') : capBc(b, 'lay_cap_bp_lt18');
  return family === 'away' ? capBc(b, 'away_cap_bp') : capBc(b, 'broody_cap_bp');
}

/** Shared clamp min(raw, familyCap). Saves: `clampFamilyBp` (one math path for effects and the UI view). TODO(Saves #126). */
export const clampFamilyBp = (rawBp: number, family: Family, farmLevel: number, b: Balance): number =>
  Math.min(rawBp, familyCapBp(family, farmLevel, b));

/** Unclamped settled trait bp of `family` in UNLOCKED slots (0 while settling / empty / unknown id / flag off). Saves: `familyRawBp`. TODO(Saves #126). */
export function familyRawBp(s: GameState, b: Balance, family: Family): number {
  const br = breedsOf(s, b); if (!br || !Array.isArray(br.slots) || !Array.isArray(br.settleMs)) return 0;
  let sum = 0;
  for (let i = 0; i < unlockedSlots(s.farmLevel, b); i++) {
    const id = br.slots[i]; if (!isBreedId(id) || ROSTER[id][1] !== family) continue;
    sum += slotTraitBp(br, i, b);
  }
  return sum;
}

/** Saves' `familyActiveBp(s, b, family)`: the clamped bp income pays (min(familyRawBp, familyCapBp)). The {rawBp, clampedBp, atCap}
 *  view is PR-A's `familyClampState` (seams §2); PR-B adds no second clamp-view name. TODO(Saves #126): delegate to the sim. */
export const familyActiveBp = (s: GameState, b: Balance, family: Family): number =>
  clampFamilyBp(familyRawBp(s, b, family), family, s.farmLevel, b);

/** The Present rate gate as the UI reads it, once per tick. `nowMs` = performance.now() of the tick (presentation clock). */
export interface PresentGateSource { open(s: GameState, b: Balance, nowMs: number): boolean; }

/**
 * TODO(Saves): the sim has no Present calm-gate yet (readiness §2, "Gap — PR-B / Saves"). Until Saves exposes
 * `presentGateOpen(s, b)`, the stub reports the gate OPEN on every tick (the chip is never pending in production builds,
 * which is the spec-safe state: k = 0 / boot behaviour). Tests and the browser harness inject a reference gate instead.
 */
export const STUB_PRESENT_GATE: PresentGateSource = { open: () => true };

/**
 * BB-5 / BBv2 fallback branch: no meaningful row is offered (BR-BB4 (b), BR-AC23b). TODO(#100): with BBv2 merged this is
 * `bestBuyV2On(b) && meaningfulKeys(s, b).size === 0` (`src/econ/best-buy.ts` on v5-m51-bbv2 2e76d0c5). Until #100 is on
 * rc/v5 the M5.0 stopgap has no fallback branch, so the strip keeps its target (BR-BB4 (d)): the stub returns false.
 */
export const bbFallbackActive = (_s: GameState, _b: Balance): boolean => false;

/** BR-BB4 (c): incubator idle, flock incomplete, Flock unlocked, something eligible (E5). The strip may offer a Hatch. */
export function hatchTargetEligible(s: GameState, b: Balance): boolean {
  const br = breedsOf(s, b);
  if (!br || !flockUnlocked(s, b) || br.incubator || isFlockComplete(br, b)) return false;
  const pool = eligible(br, s.farmLevel, b);
  return freeHatchAvailable(br) ? pool.some(id => ROSTER[id][0] === 'C') : pool.length > 0;
}

/** This frame's hatch price, as the sim's `startHatch` charges it (free hatch = 0). Never computed in the UI (checklist §3). */
export const hatchPriceNowCents = (s: GameState, b: Balance): number => {
  const br = breedsOf(s, b); return br && freeHatchAvailable(br) ? 0 : hatchCostCents(s, b);
};

/** Slotted breed ids in UNLOCKED slots in slot order; an unknown id renders empty (E10) and is skipped. */
export function slottedBreeds(s: GameState, b: Balance): BreedId[] {
  const br = breedsOf(s, b); if (!br || !Array.isArray(br.slots)) return [];
  const out: BreedId[] = [];
  for (let i = 0; i < unlockedSlots(s.farmLevel, b); i++) { const id = br.slots[i]; if (isBreedId(id)) out.push(id); }
  return out;
}

