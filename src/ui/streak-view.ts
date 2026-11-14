/**
 * v5 streak / tapCoins UI, pure view logic (no DOM). Spec product/collection/m5-streak-tap-coins-spec.md v1.3.3 sha1 b315dea1
 * §3.3 tiers, §3.5 UI, ST-AC9/10/11/21/24/25; art art-ux/m5-combo-tiers.md v0.3 sha1 ed4ded1d §0 anatomy, §1 per-tier table,
 * §2 tier-up, §3 cooling, §6 a11y.
 * Every number comes from balance.m4.tc (tc_streak_cap, tc_streak_per_tap, tc_streak_tier_count): the ladder, copy and %s are
 * cap-relative (ST-AC11/ST-AC28), so a CSV retune needs no code change. Thresholds and the tier index are the sim's own
 * (sim/streak.ts streakTier: T_k = round_to_step(cap x k / count)), so visual, sound and aria always agree with the sim.
 */
import type { Balance } from '../config/balance';
import { tcNum } from '../config/formulas';
import { streakTier } from '../sim/streak';

export { streakUiOn, tapCoinUiOn } from './streak-flags';

export interface StreakParams { cap: number; step: number; count: number }
export const streakParams = (b: Balance): StreakParams =>
  ({ cap: tcNum(b, 'streak_cap'), step: tcNum(b, 'streak_per_tap'), count: tcNum(b, 'streak_tier_count') });
/** Float guard for comparisons on sums of tc_streak_per_tap (same as sim/streak.ts). */
const EPS = 1e-9;
/** T_1..T_n = round_to_step(cap x k / n), cleaned to 12 places (0.2, not 0.2000000000000001). */
export const tierThresholds = (p: StreakParams): number[] =>
  Array.from({ length: p.count }, (_, i) => Math.round(Math.round((p.cap * (i + 1)) / p.count / p.step) * p.step * 1e12) / 1e12);
/** floor(x x 100) as shown in copy (spec: "% = floor(T_k x 100)", label floor(s x 100)), robust to float noise (0.29 -> 29). */
export const pctFloor = (x: number) => Math.floor(x * 100 + EPS);

export interface MeterView {
  shown: boolean; /** fill transform scaleX, 0..1 of the cap */ scale: number; tier: number; lit: boolean[]; max: boolean; cooling: boolean;
  label: string; valueNow: number; valueMax: number; valueText: string;
}
/** The meter row for streak value `s` with `holdS` focus seconds of hold left. Cooling = s > 0 with the hold spent (§3). Reduced
 *  motion: the fill moves in whole-percent steps (ST-AC24). */
export function meterView(s: number, holdS: number, b: Balance, opts: { rm?: boolean } = {}): MeterView {
  const p = streakParams(b), T = tierThresholds(p), sv = Math.max(0, s), shown = sv > EPS;
  // MAX only while held: at the decay start (hold spent, s still = cap) gold -> stripes and the label returns to +N% (§1 MAX row).
  const cooling = shown && !(holdS > EPS), max = shown && sv >= p.cap - EPS && !cooling, tier = shown ? streakTier(sv, b) : 0;
  const n = pctFloor(sv), capN = pctFloor(p.cap);
  const scale = !shown ? 0 : max ? 1 : Math.min(1, opts.rm ? n / (p.cap * 100) : sv / p.cap);
  const label = !shown ? '' : max ? `MAX +${capN}%` : `+${n}% price`;
  const base = max ? `Streak max, +${capN}% price` : `Streak +${n}% price, tier ${tier} of ${p.count}`;
  return { shown, scale, tier, lit: T.map(t => shown && sv >= t - EPS), max, cooling, label, valueNow: n, valueMax: capN,
    valueText: shown ? base + (cooling ? ', cooling' : '') : '' };
}

/** §3.3 pop-up names for tiers 1..count-1 (product copy, Art-final); the top tier is always the MAX copy. */
const PILL_NAMES = ['Warm streak!', 'Hot streak!', 'On fire!'] as const;
const ARIA_NAMES = ['Warm streak', 'Hot streak', 'On fire'] as const;
const nameAt = <T extends readonly string[]>(names: T, k: number) => names[Math.min(k, names.length) - 1];
/** Tier pop-up pill copy (§3.3): `Warm streak! +7% price` ... `MAX +27%!`. */
export function pillCopy(k: number, b: Balance): string {
  const p = streakParams(b); if (k >= p.count) return `MAX +${pctFloor(p.cap)}%!`;
  return `${nameAt(PILL_NAMES, k)} +${pctFloor(tierThresholds(p)[k - 1])}% price`;
}
/** #streak-live text on an eligible crossing (combo-tiers §6): `Warm streak, +7% price` ... `Streak max, +27% price`. */
export function tierAria(k: number, b: Balance): string {
  const p = streakParams(b); if (k >= p.count) return `Streak max, +${pctFloor(p.cap)}% price`;
  return `${nameAt(ARIA_NAMES, k)}, +${pctFloor(tierThresholds(p)[k - 1])}% price`;
}
export const COOLING_ARIA = 'Streak cooling';
/** The tier from which a cooling start plays sfx-streak-cool-01 and announces (combo-tiers §1 tier 2 row, §6): m4.tc
 *  streak_cool_cue_min_tier (economy.csv tc_streak_cool_cue_min_tier = 2, #143 / D-HOP-2026-11-13-01). The ST-AC18 8th key
 *  (M5_TC_KEYS.streak, pinned list, validateBalance) is Saves' PR (D-CEO-20261114-06). */
export const coolCueMinTier = (b: Balance): number => tcNum(b, 'streak_cool_cue_min_tier');

/**
 * Eligible upward crossings with hysteresis (§3.3): tier k pops on s going from < T_k to >= T_k, and can pop again only after s
 * has fallen below T_(k-1) (T_0 = 0). Only the highest tier crossed in one step pops (a config edge; one pill at a time). A cap
 * change (K18 clamp, live config reload) re-syncs silently. Also reports the cooling start (once per decay start, only if the
 * run reached tier >= coolCueMinTier(b)).
 */
export class StreakTiers {
  private prev = 0; private armed: boolean[] = []; private key = ''; private runMax = 0; private wasCooling = false;
  /** `fromTap` = this change came from a credited tap: only then can a tier pop (s never rises otherwise; a remount, a resync or a
   *  frame that skipped the tap event just disarms the crossed tiers silently). */
  update(s: number, cooling: boolean, b: Balance, fromTap = true): { tierUp?: number; coolStart?: true } {
    const p = streakParams(b), T = tierThresholds(p), key = T.join(',');
    if (key !== this.key) { this.key = key; this.armed = T.map(t => !(s >= t - EPS)); this.prev = s; this.runMax = streakTier(Math.max(0, s), b); this.wasCooling = cooling; return {}; }
    for (let k = 1; k <= T.length; k++) if (s < (k === 1 ? 0 : T[k - 2]) - EPS || s <= EPS) this.armed[k - 1] = true;
    let up = 0;
    if (s > this.prev + EPS) for (let k = 1; k <= T.length; k++) { const t = T[k - 1]; if (this.prev < t - EPS && s >= t - EPS && this.armed[k - 1]) up = k; }
    for (let k = 1; k <= T.length; k++) if (this.prev < T[k - 1] - EPS && s >= T[k - 1] - EPS) this.armed[k - 1] = false;
    if (s <= EPS) this.runMax = 0; else this.runMax = Math.max(this.runMax, streakTier(s, b));
    const coolStart = cooling && !this.wasCooling && s > EPS && this.runMax >= coolCueMinTier(b);
    this.wasCooling = cooling && s > EPS; this.prev = s;
    if (!fromTap) up = 0;
    return { ...(up ? { tierUp: up } : {}), ...(coolStart ? { coolStart: true as const } : {}) };
  }
}

/**
 * Live-region throttle: the first message goes out at once; within `gapMs` of the last one a newer message replaces the pending
 * one (latest wins) and goes out when the gap has passed. Nothing goes out while frozen (menu / hidden, combo-tiers §6).
 */
export class LiveThrottle {
  private last = -Infinity; private pending: string | null = null;
  constructor(private gapMs: number) {}
  push(msg: string, t: number, frozen = false): string | null { this.pending = msg; return this.poll(t, frozen); }
  poll(t: number, frozen = false): string | null {
    if (this.pending === null || frozen || t - this.last < this.gapMs) return null;
    const m = this.pending; this.pending = null; this.last = t; return m;
  }
  clear() { this.pending = null; }
}
