import type { Balance } from '../config/balance';
import type { Workers } from './workers';
/** demand = original order; filled = eggs sold so far. MK-10: a partly served customer (filled > 0) still leaves
 *  customer_patience_s after arrival (logged customer_partial); the timer is never reset by a sale. */
export interface Customer { id: number; demand: number; filled: number; waitedS: number; }
export interface GameState {
  coinsCents: number; coop: number; basket: number;
  collectionLevel: number; farmLevel: number;
  customers: Customer[]; nextCustomerInS: number; nextCustomerId: number;
  rng: number; pendingOfflineEggs: number;
  /** Highest coop tier already celebrated (feature-spec F3); never replays on reload. */
  celebratedTier: number;
  /** M2: hired workers (absent = not hired), Egg Grader tiers bought (0..5), shared Manage cooldown. */
  workers: Workers; graderTier: number; manageCdS: number;
  /** M2: seconds the coop has been full (Coop Hand tip); session-only, not meaningful across loads. */
  coopFullS: number;
  /** S2-8 (Product): wage cents owed but not yet charged (fraction < 1 per worker); charged exactly at the economy.csv rate over time. v6. */
  wageFracCents: { market_hand?: number; coop_hand?: number };
  /** M4-A tracks (sim/tracks.ts; live only with balance.m4.enabled). Saved since v7 (migration pending: H = V = F). */
  hensLevel: number; eggValueLevel: number;
  /** M4-A: set once the tracks exist for this farm (new M4 game or migrated by migrateTracksV7). Absent = pre-M4 farm. */
  tracksV7?: 1;
  /** M4-A milestone ids already celebrated (never replay on reload; seeded silently by the v7 migration). */
  celebratedMilestones: string[];
}
export const initialState = (b: Balance, seed = 1): GameState => ({
  coinsCents: 0, coop: 0, basket: 0, collectionLevel: 0, farmLevel: 0,
  customers: [], nextCustomerInS: b.customers.first_customer_s, nextCustomerId: 1,
  rng: mixSeed(seed), pendingOfflineEggs: 0, celebratedTier: 0,
  workers: {}, graderTier: 0, manageCdS: 0, coopFullS: 0, wageFracCents: {},
  hensLevel: 0, eggValueLevel: 0, celebratedMilestones: [],
});
/** Per-level stats: formulas in config/formulas.ts, params from balance.json (generated from economy.csv, MK-15). */
export {
  collectionCost, eggsPerTap, farmCost, hens, eggsPerSec, coopCapacity, eggPriceCents, customerIntervalS,
  demandRange, queueMax, patienceS, collectionPriceBonus, farmPriceCents,
} from '../config/formulas';
/** Scramble a user/time seed into xorshift32 state (murmur3 fmix32). Without this, small seeds (1, 2, 3...) give
 *  first draws near 0, e.g. seed 1 -> r = 0.0000025, so the first customer always wanted demand_min. */
export function mixSeed(seed: number): number {
  let h = (seed >>> 0) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) || 1;
}
/** xorshift32, state stored in GameState so sim stays pure/deterministic */
export function nextRand(x: number): [number, number] { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return [x, x / 4294967296]; }
/** Coop sprite tier: L0-4 -> 0, L5-9 -> 1, L10-19 -> 2, L20+ -> 3 (layout-spec 4.3). */
export const coopTier = (L: number) => (L >= 20 ? 3 : L >= 10 ? 2 : L >= 5 ? 1 : 0);
