// BBv2 test fixtures (spec v1.0.3 27e753d8 Part I; Card #12 4a154bb4). Preconditions are asserted in the tests that use them.
import { balance, type Balance } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';

export const bal = (bestBuyV2: number, extra: { zeroGainUi?: number; enabled?: number } = {}): Balance =>
  ({ ...balance, m4: { ...balance.m4!, enabled: extra.enabled ?? 1, flags: { ...balance.m4!.flags, bestBuyV2, zeroGainUi: extra.zeroGainUi ?? 0 } } }) as Balance;
export const ON = bal(1), OFF = bal(0);
const W = { energy: 100, cdS: 0 };
export const fx = (F: number, H: number, V: number, C: number, extra: Partial<GameState> = {}): GameState =>
  ({ ...initialState(ON, 1), farmLevel: F, hensLevel: H, eggValueLevel: V, collectionLevel: C, tracksV7: 1, ...extra } as GameState);
const W3 = { market_hand: W, coop_hand: W, hawker: W };
export const ALLW = { workers: { ...W3, grader: W }, graderTier: 5 } as Partial<GameState>;
/** FX-L17 = the SG-3 fixture (stopgap v1.2.5 §3): F17 H19 V18 C10, Market Hand, Coop Hand, Hawker at energy 100, Grader tier 0. */
export const L17 = (coinsCents: number) => fx(17, 19, 18, 10, { workers: { ...W3 } as any, graderTier: 0, coinsCents });
/** BB-1 fixtures F10/C10, F14/C10, F17/C14, F22/C18 (H/V/workers chosen here; the stopgap's committed JSONs are not in v5, D-HOE-33). */
export const BB1 = {
  'F10/C10': (c: number) => fx(10, 10, 9, 10, { workers: { market_hand: W, coop_hand: W } as any, coinsCents: c }),
  'F14/C10': (c: number) => fx(14, 15, 13, 10, { workers: { ...W3 } as any, coinsCents: c }),
  'F17/C14': (c: number) => fx(17, 19, 18, 14, { workers: { ...W3 } as any, coinsCents: c }),
  'F22/C18': (c: number) => fx(22, 24, 22, 18, { ...ALLW, graderTier: 2, coinsCents: c }),
};
/** FX-TIE (v0.3 names): every ranked payback is ∞ on the rc/v5 CSV (precondition asserted). */
export const TIE = { 'F28 H30 V30 C21': () => fx(28, 30, 30, 21, { ...ALLW, coinsCents: 1e5 }), 'F29 H30 V30 C22': () => fx(29, 30, 30, 22, { ...ALLW, coinsCents: 1e5 }) };
