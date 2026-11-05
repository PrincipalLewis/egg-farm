/**
 * v5 Wave A #3: A1 tap coins (product/collection/m5-streak-tap-coins-spec.md v1.3.2 §3.4 R14/R15/R17, §4.1b; HoE ST-11 and
 * money-math rulings). Each CREDITED tap (sim/streak.ts creditTap, the one R2 definition shared with the streak) pays
 *   tapCoinsCents = floor((refCents x tapBp + 5000) / 10000)   (half up, integers only)
 * with tapBp = Math.round(tc_tap_income_share x 10000) and refCents from sim/income-ref.ts (§4.1/§4.1a). Paid straight to coins
 * (not the Basket, not a sale), so it never enters I_ref, and no streak / Frenzy / effect multiplies it (R9/R14).
 * BigInt guard: when refCents x bp + 5000 > Number.MAX_SAFE_INTEGER the multiply-and-floor runs in BigInt (exact to 2^53 - 1 cents).
 * Live only with m4.flags.tapCoins (default 0, needs m4.enabled). No UI, sound or telemetry here.
 */
import type { Balance } from '../config/balance';
import { m4On, tcNum } from '../config/formulas';
import { refCents } from './income-ref';
import type { GameState } from './state';
/** Basis-point denominator and its half (round half up): units of the §4.1b formula, not tunables. */
export const BP_DENOM = 10_000; const BP_HALF = BP_DENOM / 2;
const BP_DENOM_N = BigInt(BP_DENOM), BP_HALF_N = BigInt(BP_HALF);
export const tapCoinsOn = (b: Balance) => m4On(b) && b.m4?.flags?.tapCoins === 1;
/** §4.1b: the share in basis points (0.03 -> 300). validateBalance keeps the CSV rate to <= 4 decimals. */
export const tapBp = (b: Balance) => Math.round(tcNum(b, 'tap_income_share') * BP_DENOM);
/** The two integer paths, on an object so a test can spy which one ran (ST-AC2c). */
export const TAP_COINS_MATH = {
  num: (r: number, bp: number) => Math.floor((r * bp + BP_HALF) / BP_DENOM),
  big: (r: number, bp: number) => Number((BigInt(r) * BigInt(bp) + BP_HALF_N) / BP_DENOM_N),
};
/** floor((refCents x bp + 5000) / 10000) for integer refCents, bp >= 0. The float test `r * bp + 5000 > MAX_SAFE` is exact here:
 *  a true value <= MAX_SAFE is computed exactly, and a true value above it can only round to >= 2^53. */
export function tapCoinsCents(r: number, bp: number): number {
  if (!(r > 0) || !(bp > 0)) return 0;
  return r * bp + BP_HALF > Number.MAX_SAFE_INTEGER ? TAP_COINS_MATH.big(r, bp) : TAP_COINS_MATH.num(r, bp);
}
/** One credited tap's pay at the current sim time (refCents read once, from the state before the tap). 0 when off. */
export const tapCoinsFor = (s: GameState, b: Balance) => (tapCoinsOn(b) ? tapCoinsCents(refCents(s, b), tapBp(b)) : 0);
