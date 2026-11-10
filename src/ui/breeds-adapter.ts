/**
 * M5.1 Breeds UI thin adapter (PR-A). All UI breeds reads go through here so a
 * Saves breeds-drift (D1–D6) rebase only touches this file + tests.
 * Spec: product/m5.1-breeds-spec.md rev 3.8.9; checklist c9d8b631.
 * Do not import src/sim/breeds* from other UI modules.
 */
import type { Balance } from '../config/balance';
import { flagOn } from '../config/flags';
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

/** Settling / hatch countdown m:ss from remaining ms (ceil seconds; PMC OQ-3). Never 0:00 while ms>0. */
export const fmtRemainMs = (ms: number) => {
  const s = ms <= 0 ? 0 : Math.max(1, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};


/**
 * E8 Flock-sheet "max" label for a family.
 * HoE-approved stub (2026-11-10): **undefined ⇒ no label**.
 * TODO(PMC/Saves): replace body with the sim getter when Saves lands it on
 * `saves/breeds-sim-prB-traits` (commit 0 of that branch; ETA TBD). Keep this
 * as the single UI call site so the source swaps in one place. Do not hard-code bc_*.
 */
export function familyClamp(
  _family: Family,
  _br: BreedsSave,
  _b: Balance,
  _farmLevel?: number,
): string | undefined {
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
 * Sim income rate in ¢/s for BB strip countdown / ext ctx (steady-state; breed-neutral).
 * Exposed on registerBreedsExt ctx as incomeRate().
 */
export function incomeRate(s: GameState, b: Balance): number {
  return Math.round(incomePerSec(s, b) * CENTS_PER_DOLLAR);
}

/** Re-export breedsFlagAndKey for tests that need the sim `on()` (flag + key). */
export const breedsOn = breedsFlagAndKey;

// ============================================================================================================================
// PR-B ADDITIONS (Features, feat/v5-breeds-ui-prB). Additive getters only (seams doc §2): nothing above this line is renamed,
// moved or re-signed. Stacked on PR-A v5/breeds-ui-a @ 4501009; everything above is PR-A's file unchanged
// (seams doc 95f45895 §2: PR-B adds getters only).
// ============================================================================================================================

/**
 * Spec §5 tunables the UI needs that `bc()` / BC_SPEC_DEFAULTS don't carry yet (L648-654; checklist §3).
 * TODO(Saves): move these to `BC_SPEC_DEFAULTS` as `present_calm_w_s`, `present_calm_k`, `lay_cap_bp_lt18`, `lay_cap_bp`
 * (and the lay-cap Farm boundary) and read them through `bc()`; then delete this object. Values are the spec's of record.
 */
export const PRB_STUB_TUNABLES = {
  /** bc_present_calm_w_s: trailing focus-seconds window of the Present rate gate (BR-R12b). */
  present_calm_w_s: 10,
  /** bc_present_calm_k: counted taps in the window that close the gate; 0 = never pending (BR-R12c). */
  present_calm_k: 6,
  /** bc_lay_cap_bp_lt18: Present family clamp below the lay-cap Farm level (L366, D-HOP-31 (a)). */
  lay_cap_bp_lt18: 700,
  /** bc_lay_cap_bp: Present family clamp from the lay-cap Farm level (L366). */
  lay_cap_bp: 1500,
  /** Farm level where the Present clamp steps from lay_cap_bp_lt18 to lay_cap_bp (E9 L566, "lt18"). */
  lay_cap_farm: 18,
} as const;

/** BR-R12 Present family clamp at Farm F (E9: 700 → 1500 at F18 on the next frame). */
export const presentCapBp = (F: number) =>
  F >= PRB_STUB_TUNABLES.lay_cap_farm ? PRB_STUB_TUNABLES.lay_cap_bp : PRB_STUB_TUNABLES.lay_cap_bp_lt18;

/**
 * Present family active bp: sum of the settled Present breeds in UNLOCKED slots (sim `slotTraitBp`: 0 while settling or for
 * an unknown id, E10), clamped by `presentCapBp`. 0 = no settled Present breed → no chip (BR-R12c).
 * TODO(Saves): replace with the income-trait wiring's own figure (`familyActiveBp(s, b, 'present')`) once it exists, so the
 * chip shows exactly what income pays.
 */
export function presentActiveBp(s: GameState, b: Balance): number {
  const br = breedsOf(s, b); if (!br || !Array.isArray(br.slots) || !Array.isArray(br.settleMs)) return 0;
  let sum = 0;
  for (let i = 0; i < unlockedSlots(s.farmLevel, b); i++) {
    const id = br.slots[i]; if (!isBreedId(id) || ROSTER[id][1] !== 'present') continue;
    sum += slotTraitBp(br, i, b);
  }
  return Math.min(sum, presentCapBp(s.farmLevel));
}

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

/** Strip countdown rate in ¢/s from the sim (the registry ctx has no UI rate tracker). BB-5's own strip uses the app's
 *  measured income; the two agree in steady state. TODO(PR-A seam): pass the app's `income.centsPerSec(t)` in the ext ctx. */
export const incomeCentsPerSec = (s: GameState, b: Balance): number => Math.round(incomePerSec(s, b) * CENTS_PER_DOLLAR);
