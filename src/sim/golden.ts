/**
 * v5 Wave A #1 (slice 1): golden-egg rewards + the Frenzy timer (product/collection/m5-golden-egg-spec.md v1.3.2 §3.5 R22/R23/X7,
 * §4 #2-#3; GE-AC7/8/9/9b/10/10b). Pure sim: the reward roll is a pure function of one evRng draw (the caller draws, Q4 rule 1),
 * grants are applied by grantGolden. Integer money (HoE money-math ruling 2):
 *   baseScaled = Math.round(E x P_cents x 100)  (1/100 cent; E = goldenEEggsPerSec, P = priceDollars: Grader in, streak/Frenzy out)
 *   reward     = floor((baseScaled x bp + 500000) / 1000000), bp = Math.round(seconds x 10000), BigInt above MAX_SAFE_INTEGER.
 * Frenzy: frenzyRemainingS counts down on FOCUS seconds only (frozen under menus / hidden, R23); the x tc_frenzy_price_mult enters
 * saleMultipliers() through the 'frenzy' entry in sim/effects.ts (R22), which already pays 1x on suspended sales (D-C3).
 * Live only with m4.flags.golden (default 0, needs m4.enabled). Spawn / lifetime / tap action / events / UI are NOT here.
 */
import type { Balance } from '../config/balance';
import { m4On, tcNum } from '../config/formulas';
import type { GoldenReward } from './events';
import type { GameState } from './state';
import { goldenEEggsPerSec } from './tracks';
import { priceDollars } from '../econ/income';
export { frenzyFactor } from './effects';
export const goldenOn = (b: Balance) => m4On(b) && b.m4?.flags?.golden === 1;
/** Units of §4 #2 (bp = seconds x 10^4; baseScaled in 10^-4 $ -> cents / 10^6), not tunables. */
const SEC_BP = 10_000, DENOM = 1_000_000, HALF = DENOM / 2, DENOM_N = BigInt(DENOM), HALF_N = BigInt(HALF);
export const cashBp = (b: Balance) => Math.round(tcNum(b, 'egg_cash_s') * SEC_BP);
export const eggsBp = (b: Balance) => Math.round(tcNum(b, 'egg_eggs_s') * SEC_BP);
/** E x P in 1/100 cent, read once at tap time (GE-AC8). */
export const baseScaled = (s: GameState, b: Balance) => Math.round(goldenEEggsPerSec(s, b) * (priceDollars(s, b) * 100) * 100);
/** The two integer paths, on an object so a test can spy which one ran (GE-AC9b). */
export const GOLDEN_MATH = {
  num: (x: number, bp: number) => Math.floor((x * bp + HALF) / DENOM),
  big: (x: number, bp: number) => Number((BigInt(x) * BigInt(bp) + HALF_N) / DENOM_N),
};
/** floor((baseScaled x bp + 500000) / 1000000) for integer inputs >= 0; the float overflow test is exact (see tap-coins.ts). */
export function rewardCents(x: number, bp: number): number {
  if (!(x > 0) || !(bp > 0)) return 0;
  return x * bp + HALF > Number.MAX_SAFE_INTEGER ? GOLDEN_MATH.big(x, bp) : GOLDEN_MATH.num(x, bp);
}
/** §3.5 table order: [0, w_cash) cash, [w_cash, w_cash + w_frenzy) frenzy, the rest eggs (F < tc_egg_eggs_as_cash_from_farm) or eggs_cash. */
export function rollReward(u: number, farmLevel: number, b: Balance): GoldenReward {
  const wc = tcNum(b, 'egg_w_cash'), wf = wc + tcNum(b, 'egg_w_frenzy');
  return u < wc ? 'cash' : u < wf ? 'frenzy' : farmLevel >= tcNum(b, 'egg_eggs_as_cash_from_farm') ? 'eggs_cash' : 'eggs';
}
/** Apply one reward (R20: the caller grants once per egg). Identity when golden is off. */
export function grantGolden(s: GameState, r: GoldenReward, b: Balance): GameState {
  if (!goldenOn(b)) return s;
  switch (r) {
    case 'cash': return { ...s, coinsCents: s.coinsCents + rewardCents(baseScaled(s, b), cashBp(b)) };
    case 'eggs_cash': return { ...s, coinsCents: s.coinsCents + rewardCents(baseScaled(s, b), eggsBp(b)) };
    case 'eggs': return { ...s, basket: s.basket + Math.floor(tcNum(b, 'egg_eggs_s') * goldenEEggsPerSec(s, b)) }; // coop untouched, cap ignored
    case 'frenzy': return { ...s, frenzyRemainingS: tcNum(b, 'frenzy_s') }; // R23: reset to 30 s, never stacked
  }
}
const r12 = (x: number) => Math.round(x * 1e12) / 1e12, EPS = 1e-9;
/** R23: counts down on focus seconds only; at 0 the field is removed (no Frenzy). Identity when off or none running. */
export function frenzyTick(s: GameState, focusS: number, b: Balance): GameState {
  const f = s.frenzyRemainingS; if (!goldenOn(b) || f === undefined || !(focusS > 0)) return s;
  const left = r12(f - focusS);
  if (left > EPS) return { ...s, frenzyRemainingS: left };
  const { frenzyRemainingS: _x, ...o } = s; return o as GameState;
}
