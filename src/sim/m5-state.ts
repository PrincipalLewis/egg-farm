/**
 * M5.0 optional GameState fields, declared ONCE here (engineering/m5.0-sizing.md §1 F1(e), §4 hotspot 3).
 * Every field is optional and ABSENT while its m4.flags.* flag is off, so flag-off saves and sim traces stay
 * byte-identical (flag-off golden f90d1678, M4-on golden a54c9cf9). No SAVE_VERSION bump (F2, tracksV7 precedent).
 * Names follow the specs (camelCase, HoE §12 D-C5). Feature PRs fill them; this file only declares them.
 *  - golden egg: product/collection/m5-golden-egg-spec.md R10a (saved) + §3.4 (on-screen egg, never saved)
 *  - streak / tap coins / I_ref: m5-streak-tap-coins-spec.md R11, §4.1 (none saved)
 *  - Broody Hen: m5-broody-hen-spec.md §3.6 (2 saved fields, HoP (d)) and R7 (nestScaled, not saved)
 *  - abilities: product/workers/m5-worker-abilities-spec.md rule 1/3, E2 (saved)
 *  - pause: product/workers/m5-worker-pause-spec.md (per-worker `paused`, `callLockoutS`; see sim/workers.ts Worker)
 */
import type { WorkerId } from './workers';

/** Per-worker call state (abilities spec E2). `readyAt` = epoch ms in the SAVE form; `activeS` = focus seconds left on a running call. */
export interface AbilityState { readyAt?: number; activeS?: number; }

/** The one on-screen golden egg (spec R4: at most one). Never saved (R10a): a reload removes it (R8). */
export interface GoldenEggOnScreen {
  /** Focus-clock age in seconds (R18 states: idle 0, warning tc_warn_at_s, urgent tc_urgent_at_s, fade tc_egg_despawn_s). */
  ageS: number;
  /** Spot id chosen from the UI-supplied valid-spot list (S1..S8; HoE §12.2 determinism note). */
  slotId: string;
  /** Drawn gap that led to this spawn, or tc_first_spawn_s for a first spawn (telemetry interval_s). */
  intervalS: number;
}

export interface M5Fields {
  // ---- #1 golden egg (saved, R10a) ----
  /** evRng position (uint32, non-zero). Seeded once per D-C2 (sim/rng.ts deriveEvRngState); never re-reads state.rng. */
  evRngState?: number;
  /** Focus seconds left on the current first-spawn or gap countdown. Absent on an F>=8 save = first M5 load (R2). */
  nextSpawnRemainingS?: number;
  /** Focus seconds left on a running Frenzy; absent when none runs (R23). */
  frenzyRemainingS?: number;
  // ---- #1 golden egg (session only, never saved) ----
  goldenEgg?: GoldenEggOnScreen;
  // ---- #2 streak + #3 tap coins (session only; spec R11: s is never saved) ----
  /** Streak value s in [0, tc_streak_cap]. */
  streakS?: number;
  /** Focus seconds of grace left before decay starts (tc_streak_hold_s). */
  streakHoldS?: number;
  /** Sim seconds until the next tap can be credited (R2 credited-tap gate, tc_tap_credit_min_s). */
  tapCreditCdS?: number;
  /** I_ref: 60-bucket ring of 1 s sim-time buckets, cents (spec §4.1; sim/income-ref.ts). Not saved. */
  irefRingCents?: number[];
  /** Sim seconds accrued since the last warm-up start (§4.1a). Not saved. */
  refWarmS?: number;
  // ---- #5 Broody Hen (saved, §3.6) ----
  /** floor(nest cents), integer >= 0, clamped to 1e15 by F2 sanitising. */
  broodyNestCents?: number;
  /** Marked yard slot, integer 0..11. */
  broodyHenIdx?: number;
  // ---- #5 Broody Hen (session only) ----
  /** Nest in 1/10000 cent (R7 `nestScaled`); load sets it to broodyNestCents x 10000. */
  broodyNestScaled?: number;
  /** brRng position (D-C4): derived from evRngState, never saved, only Broody draws from it. */
  brRngState?: number;
  // ---- #4 abilities (saved, abilities spec rule 1/3, E2) ----
  abilities?: Partial<Record<WorkerId, AbilityState>>;
  abilitiesUnlocked?: boolean;
  abilitiesCoachSeen?: boolean;
  // ---- M5.1 breeds (saved, breeds spec §6; sim/breeds.ts) ----
  breeds?: import('./breeds').BreedsSave;
}

/** Fields F2 persists (optional, absent = default). */
export const M5_SAVED_FIELDS = ['evRngState', 'nextSpawnRemainingS', 'frenzyRemainingS', 'broodyNestCents', 'broodyHenIdx', 'abilities', 'abilitiesUnlocked', 'abilitiesCoachSeen', 'breeds'] as const satisfies readonly (keyof M5Fields)[];
/** Fields that live only for a page session: F2 strips them before serialize (specs: never saved). */
export const M5_SESSION_FIELDS = ['goldenEgg', 'streakS', 'streakHoldS', 'tapCreditCdS', 'irefRingCents', 'refWarmS', 'broodyNestScaled', 'brRngState'] as const satisfies readonly (keyof M5Fields)[];
export const M5_FIELDS: readonly (keyof M5Fields)[] = [...M5_SAVED_FIELDS, ...M5_SESSION_FIELDS];
