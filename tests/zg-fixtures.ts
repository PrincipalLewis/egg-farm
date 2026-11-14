// Shared fixtures for the zero-gain UI tests (spec v0.3.7 f86de04e §9). Preconditions are asserted in the tests.
import { balance, type Balance } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { bestBuy, type BuyKey } from '../src/econ/best-buy';
import { step } from '../src/sim/tick';
import { apply, type Action } from '../src/sim/actions';

export const zgOn: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1, flags: { ...balance.m4!.flags, zeroGainUi: 1 } } };
const W = { energy: 100, cdS: 0 };
export const fx = (F: number, H: number, V: number, C: number, extra: Partial<GameState> = {}): GameState =>
  ({ ...initialState(zgOn, 1), farmLevel: F, hensLevel: H, eggValueLevel: V, collectionLevel: C, tracksV7: 1, ...extra } as GameState);
const ALLW = { workers: { market_hand: W, coop_hand: W, hawker: W, grader: W }, graderTier: 5 };
/** §9 fixtures (preconditions asserted per test; a failed precondition fails the FIXTURE). */
export const FX = {
  FLIP: () => fx(4, 5, 0, 0, { coinsCents: 1e9 }),
  H20: () => fx(17, 19, 0, 0, { coinsCents: 1e12 }),
  L30: () => fx(30, 30, 30, 27, { ...ALLW, coinsCents: 1e12 }),
  L30u: () => fx(29, 30, 30, 10, { ...ALLW, coinsCents: 1099 * 100 + 1 }),
  FARM0: () => fx(0, 0, 0, 0),
};

/** Bounded local trace (NOT the AC7 harness: tests/bot.ts has no observe hook on rc/v5, and ZG-AC13 keeps it out of the diff).
 *  Real sim, 10 Hz; collect 1/s; every 15 s sellAll then buy the econ bestBuy pick while affordable. Calls `on` after each action. */
const ACT: Record<BuyKey, Action> = { FARM: { type: 'buyFarm' }, COLL: { type: 'buyCollection' }, HENS: { type: 'buyTrack', track: 'hens' },
  VALUE: { type: 'buyTrack', track: 'eggValue' }, W1: { type: 'hire', worker: 'market_hand' }, W2: { type: 'hire', worker: 'coop_hand' },
  W3: { type: 'hire', worker: 'hawker' }, W4: { type: 'buyGraderTier' } } as any;
export function zgTrace(b: Balance, seed: number, T: number, on: (s: GameState) => void) {
  let s = initialState(b, seed); const n = Math.round(T * b.tickHz);
  for (let i = 1; i <= n; i++) {
    s = step(s, 1 / b.tickHz, b);
    if (i % b.tickHz === 0) { s = apply(s, { type: 'collect' }, b); on(s); }
    if (i % (15 * b.tickHz) === 0) {
      s = apply(s, { type: 'sellAll' }, b); on(s);
      for (let k = 0; k < 8; k++) { const p = bestBuy(s, b); if (!p) break; const a = apply(s, ACT[p.key], b); if (a === s) break; s = a; on(s); }
    }
  }
  return s;
}
