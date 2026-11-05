/**
 * M5.1 breeds (product/m5.1-breeds-spec.md rev 3.8.6 sha1 13d5255e; tick semantics engineering/reviews/v5-breeds-tick-semantics.md).
 * Roster §4.3 and the bc_* tunables §5. Everything here is read only while m4.flags.breeds is on.
 */
import type { Balance } from './balance';
export type Rarity = 'C' | 'R' | 'E' | 'L';
export type Family = 'present' | 'away' | 'broody';
/** §4.3 roster: id -> [rarity, family, trait bp at 0★]. Order is the roll order (Econ h/breeds.ts ROSTER, Q3). */
export const ROSTER = {
  leghorn: ['C', 'present', 250], sussex: ['C', 'away', 1500], orpington: ['C', 'broody', 1000],
  rhode_island_red: ['R', 'present', 300], brahma: ['R', 'away', 2000], ayam_cemani: ['E', 'present', 350],
  cochin: ['E', 'broody', 1500], cream_legbar: ['L', 'present', 400],
} as const satisfies Record<string, readonly [Rarity, Family, number]>;
export type BreedId = keyof typeof ROSTER;
export const BREED_IDS = Object.keys(ROSTER) as BreedId[];
export const isBreedId = (x: unknown): x is BreedId => typeof x === 'string' && Object.prototype.hasOwnProperty.call(ROSTER, x);
/** §5 values of record. PENDING Econ (RC-PIN): economy.csv 8dc90e2b has no bc_* columns yet, so bc() reads these.
 *  When the CSV lands, bc() is the ONE place to switch to balance data. */
export const BC_SPEC_DEFAULTS = {
  unlock_farm: 10, slot2_farm: 14, slot3_farm: 20, rare_farm: 14, legendary_farm: 24, hatch_cost_s: 45, hatch_farm_share_bp: 10000,
  hatch_min_cents: 50000, hatch_time_s: 60, settle_s: 300, incubators: 1, w_common: 70, w_rare: 22, w_epic: 7, w_legendary: 1,
  pity_rare_after: 8, star_cap: 2, star_bonus_bp: 2500,
} as const;
export type BcKey = keyof typeof BC_SPEC_DEFAULTS;
export const bc = (_b: Balance, k: BcKey): number => BC_SPEC_DEFAULTS[k];
/** Q1 (tick-semantics note; HoE may re-rule): the §6 salt K for breeds.rng = mixSeed(state.rng ^ K). ASCII "brds".
 *  Must differ from EV_RNG_SALT / BR_RNG_SALT (sim/rng.ts): brRng is Broody's unsaved stream, never used for rolls (BR-R9). */
export const BREEDS_RNG_SALT = 0x62726473;
/** BR-R2: slots unlocked at Farm level F. */
export const unlockedSlots = (F: number, b: Balance) =>
  F >= bc(b, 'slot3_farm') ? 3 : F >= bc(b, 'slot2_farm') ? 2 : F >= bc(b, 'unlock_farm') ? 1 : 0;
/** §6: `slots` and `settleMs` always have 3 entries (BR-R2 max). */
export const SLOT_IDX = [0, 1, 2] as const;
/** BR-AC26 / E12: the existing save_migrated shape (game.ts:252); from/to = SAVE_VERSION 6, never bumped (§6 R5). */
export const BREEDS_SANITISE_EVENT = { type: 'save_migrated', migration: 'breeds_sanitise', from: 6, to: 6 } as const;
/** Unit constants for BR-R5 (not tunables): cents per dollar, basis points per 1, and the house half-up rounding term. */
export const CENTS_PER_DOLLAR = 100; export const BP_ONE = 10000; export const BP_HALF = 5000;
/** BR-R10 rarity -> its bc_w_* weight key, in roll order (Econ harness h/breeds.ts L39-45, confirmed against spec d43e2ce3). */
export const RARITY_WEIGHT: Record<Rarity, BcKey> = { C: 'w_common', R: 'w_rare', E: 'w_epic', L: 'w_legendary' };
/** BR-R7b: the note shows when the next Farm step is within 2 x bc_hatch_cost_s (spec writes the expression, not a column). */
export const FARM_SOON_HATCH_MULT = 2;
