/**
 * v5 F1b: the M5 event RNG streams (engineering/m5.0-sizing.md §1 F1(a), §12.1 D-C2/D-C4; golden spec R10a, HoE Q4 ruling).
 * Spawns, slots and reward rolls NEVER draw from state.rng (customer arrivals/demand), so every customer sequence,
 * pacing seed and golden stays put. Every function here is pure and never reads or writes state.rng after seeding.
 */
import { mixSeed, nextRand, type GameState } from './state';
/** ASCII "evRn" (D-C2). */
export const EV_RNG_SALT = 0x6576526e;
/** ASCII "brNg" (D-C4). */
export const BR_RNG_SALT = 0x62724e67;
/** A usable xorshift32 state: a non-zero uint32 (D-C5 sanitising rule). */
export const isRngState = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x > 0 && x <= 0xffffffff;
/** evRngState = mixSeed(state.rng ^ EV_RNG_SALT), taken ONCE (D-C2). For initialState(b, 7) at tick 0 this is mixSeed(mixSeed(7) ^ salt) (GE-AC33). */
export const deriveEvRngState = (rng: number) => mixSeed((rng ^ EV_RNG_SALT) >>> 0);
/** brRng = mixSeed(evRngState ^ BR_RNG_SALT): re-derived on load / when Broody turns on, never saved (D-C4, Q4 rule 2). */
export const deriveBrRngState = (evRngState: number) => mixSeed((evRngState ^ BR_RNG_SALT) >>> 0);
/** Seed evRngState if absent/invalid (call only while golden or broody is on). Returns s unchanged when already valid. */
export function ensureEvRng(s: GameState): GameState {
  return isRngState(s.evRngState) ? s : { ...s, evRngState: deriveEvRngState(s.rng) };
}
/** One draw from evRng: u in [0, 1) and the next state. Golden draws only (Q4 rule 1). Throws if unseeded. */
export function evDraw(s: GameState): [GameState, number] {
  if (!isRngState(s.evRngState)) throw new Error('evDraw: evRngState not seeded (call ensureEvRng first)');
  const [x, u] = nextRand(s.evRngState); return [{ ...s, evRngState: x }, u];
}
/** One draw from brRng (Broody only). Seeds brRngState from evRngState when absent; never advances evRngState. */
export function brDraw(s: GameState): [GameState, number] {
  const seed = isRngState(s.brRngState) ? s.brRngState : isRngState(s.evRngState) ? deriveBrRngState(s.evRngState) : null;
  if (seed === null) throw new Error('brDraw: evRngState not seeded (call ensureEvRng first)');
  const [x, u] = nextRand(seed); return [{ ...s, brRngState: x }, u];
}
/** Uniform index in [0, n) from u (slot pick: the UI passes the valid-spot list, the sim draws an index into it, sizing §12.2). */
export const pickIndex = (u: number, n: number) => Math.min(n - 1, Math.floor(u * n));
