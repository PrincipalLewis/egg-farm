/**
 * v5 Wave A #3: the reference income I_ref (product/collection/m5-streak-tap-coins-spec.md v1.3.2 §4.1, §4.1a, §4.1b; shared
 * with m5-broody-hen-spec R7). Pure, sim time only, never saved (M5_SESSION_FIELDS: irefRingCents, refWarmS).
 *  - Ring: tc_tap_bonus_income_window_s (W = 60) buckets of 1 s of SIM time holding the BASE value of every egg sale (player and
 *    worker alike, §4.1 base_cents = price chain x Grader; no streak, Frenzy, ability or other timed effect: sellTo records the
 *    suspended-context value). It has W + 1 slots: the W completed seconds plus the open one, so the window read is exactly the
 *    last W completed seconds (a full 60 s window at the handover, spec §4.1a) and the open second joins when it completes.
 *  - Warm-up (§4.1a, D-HOP-07 X2): while refWarmS < W, refCents = Math.round(I_ss x 100), I_ss = max(0, incomePerSec + wagesPerSec)
 *    (econ/income.ts, live moods, gross of wages), re-read from live state. At refWarmS >= W: hard switch to the ring,
 *    refCents = floor((Σ ring + W/2) / W) in integers (§4.1b, = floor((Σ + 30) / 60) at W = 60). No blend.
 *  - Warm-up starts (ring and refWarmS absent): a fresh start / CSR reset, every page load (session fields are not saved) and an
 *    offline return (m5Offline: a hidden-tab or frame gap >= 60 s). A hide < 60 s or a menu keeps ticking (rc1 hidden sim).
 * Live only with m4.flags.tapCoins (A1 tap coins, the first reader); the Broody PR adds its flag to incomeRefOn. Flag off: no
 * field is ever created, so traces and saves are byte-identical.
 */
import type { Balance } from '../config/balance';
import { m4On, tcNum } from '../config/formulas';
import { incomePerSec, wagesPerSec } from '../econ/income';
import type { GameState } from './state';
/** Money unit, not a tunable: cents per dollar. */
const CENTS_PER_DOLLAR = 100;
/** Sim-time grid for refWarmS (ticks are 0.1 s; keeps the 1 s bucket boundaries exact after float sums). */
const TIME_GRID = 1e6, EPS = 1e-9;
const grid = (x: number) => Math.round(x * TIME_GRID) / TIME_GRID;
/** I_ref is live while a reader is on: #3 tap coins (the Broody PR extends this). */
export const incomeRefOn = (b: Balance) => m4On(b) && b.m4?.flags?.tapCoins === 1;
/** W = tc_tap_bonus_income_window_s, whole seconds (validateBalance: integer >= 1). */
export const incomeWindowS = (b: Balance) => tcNum(b, 'tap_bonus_income_window_s');
/** I_ss in $/s (§4.1a): RC1's steady-state model with default options, gross of wages, never below 0. No M5 uplift is in it. */
export const issDollars = (s: GameState, b: Balance) => Math.max(0, incomePerSec(s, b) + wagesPerSec(s, b));
/** Warm-up refCents: Math.round(I_ss x 100) on the float I_ss, the only rounding (§4.1b float edge: 1.005 -> 100). */
export const warmRefCents = (issD: number) => Math.round(issD * CENTS_PER_DOLLAR);
/** Trailing refCents: floor((sum + W/2) / W), half up in integers; written as floor((2 sum + W) / (2 W)) so odd W is exact too. */
export const trailingRefCents = (sumCents: number, W: number) => Math.floor((sumCents + sumCents + W) / (W + W));
const second = (t: number) => Math.floor(t + EPS);
/** The ring and warm counter, created empty (a warm-up start) when absent or when W changed (live config reload). */
function ensure(s: GameState, W: number): GameState {
  return s.irefRingCents && s.irefRingCents.length === W + 1 && typeof s.refWarmS === 'number' ? s
    : { ...s, irefRingCents: new Array<number>(W + 1).fill(0), refWarmS: 0 };
}
/** Σ of the last W completed seconds (the open second's slot excluded). 0 when the ring is absent. */
export function ringSumCents(s: GameState, b: Balance): number {
  const r = s.irefRingCents, W = incomeWindowS(b); if (!r || r.length !== W + 1) return 0;
  const open = second(s.refWarmS ?? 0) % (W + 1); let sum = 0;
  for (let i = 0; i < r.length; i++) if (i !== open) sum += r[i];
  return sum;
}
/** refCents (integer cents/s) for the current sim time: warm-up I_ss, else the ring (hard switch at refWarmS >= W). 0 when off. */
export function refCents(s: GameState, b: Balance): number {
  if (!incomeRefOn(b)) return 0;
  const W = incomeWindowS(b);
  return (s.refWarmS ?? 0) < W - EPS || !s.irefRingCents || s.irefRingCents.length !== W + 1 ? warmRefCents(issDollars(s, b)) : trailingRefCents(ringSumCents(s, b), W);
}
/** sellTo: add one sale's BASE cents to the open second. Identity when off. */
export function recordSale(s: GameState, baseCents: number, b: Balance): GameState {
  if (!incomeRefOn(b) || !(baseCents > 0)) return s;
  const W = incomeWindowS(b), o = ensure(s, W), r = o.irefRingCents!.slice(), i = second(o.refWarmS!) % (W + 1);
  r[i] += baseCents; return { ...o, irefRingCents: r };
}
/** Per tick (TIMER_SYSTEMS, sim dt, hidden ticks too): advance refWarmS; each second entered clears its slot (the slot that held
 *  second n - W - 1, now outside the window). Identity when off. */
export function incomeRefTick(s: GameState, dt: number, b: Balance): GameState {
  if (!incomeRefOn(b)) return s;
  const W = incomeWindowS(b), o = ensure(s, W), t0 = o.refWarmS!, t1 = grid(t0 + Math.max(0, dt));
  const n0 = second(t0), n1 = second(t1); if (n1 === n0) return { ...o, refWarmS: t1 };
  const r = o.irefRingCents!.slice();
  for (let n = Math.max(n0 + 1, n1 - W); n <= n1; n++) r[n % (W + 1)] = 0;
  return { ...o, irefRingCents: r, refWarmS: t1 };
}
/** Offline return (m5Offline) and any warm-up restart: drop the ring and refWarmS; the next read is I_ss (§4.1a #3). */
export function resetIncomeRef(s: GameState): GameState {
  if (!('irefRingCents' in s) && !('refWarmS' in s)) return s;
  const { irefRingCents: _r, refWarmS: _w, ...o } = s; return o as GameState;
}
