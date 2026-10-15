import type { Balance } from '../config/balance';
/** demand = original order; filled = eggs sold so far. filled > 0 => served: never walks away. */
export interface Customer { id: number; demand: number; filled: number; waitedS: number; }
export interface GameState {
  coinsCents: number; coop: number; basket: number;
  collectionLevel: number; farmLevel: number;
  customers: Customer[]; nextCustomerInS: number; nextCustomerId: number;
  rng: number; pendingOfflineEggs: number;
}
export const initialState = (b: Balance, seed = 1): GameState => ({
  coinsCents: 0, coop: 0, basket: 0, collectionLevel: 0, farmLevel: 0,
  customers: [], nextCustomerInS: b.customers.first_customer_s, nextCustomerId: 1,
  rng: seed >>> 0 || 1, pendingOfflineEggs: 0,
});
const F = (b: Balance) => b.farm;
export const collectionCost = (L: number, b: Balance) => Math.floor(b.collection.baseCost * Math.pow(b.collection.costGrowth, L));
export const farmCost = (L: number, b: Balance) => Math.floor(F(b).baseCost * Math.pow(F(b).costGrowth, L));
export const eggsPerTap = (L: number, b: Balance) => b.collection.eggsPerTapBase + b.collection.eggsPerTapPerLevel * L;
export const hens = (L: number, b: Balance) => F(b).hensBase + F(b).hensPerLevel * L;
export const eggsPerSec = (L: number, b: Balance) => F(b).eggsPerHenPerSec * hens(L, b);
export const coopCapacity = (L: number, b: Balance) => F(b).coopCapacityBase + F(b).coopCapacityPerLevel * L;
export const eggPriceCents = (L: number, b: Balance) => F(b).eggPriceCentsBase + F(b).eggPriceCentsPerLevel * L;
export const customerIntervalS = (L: number, b: Balance) => Math.max(F(b).customerIntervalMinS, F(b).customerIntervalBaseS * Math.pow(F(b).customerIntervalDecay, L));
export const demandRange = (L: number, b: Balance) => [F(b).demandMinBase + F(b).demandMinPerLevel * L, F(b).demandMaxBase + F(b).demandMaxPerLevel * L] as const;
/** xorshift32, state stored in GameState so sim stays pure/deterministic */
export function nextRand(x: number): [number, number] { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return [x, x / 4294967296]; }
