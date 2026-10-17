// Pure worst-seed pacing-guard helpers (bounds: data/pacing-targets.json). Reach = level -> first time (s) it was reached.
import { readFileSync } from 'node:fs';
export interface PacingTargets {
  step_ratio_p95_max: number; step_ratio_worst_max: number; step_ratio_min_prev_s: number; step_ratio_from_level: number;
  gap_p95_max_s: number; gap_p95_target_s: number; gap_worst_max_s: number;
  l18_25_step_p95_max_s: number; l18_25_step_worst_max_s: number;
  active_idle_p95_max: number; active_idle_worst_max: number; ex1_casual_workers_step_max: number; ac7_w_t20_p95_warn_s: number; l18_25_step_p95_max_s_variance: number;
}
export const loadTargets = (): PacingTargets => JSON.parse(readFileSync(new URL('../data/pacing-targets.json', import.meta.url), 'utf8'));
export type Reach = Record<string, number> | Map<number, number>;
const toMap = (r: Reach) => r instanceof Map ? r : new Map(Object.entries(r).map(([k, v]) => [Number(k), v] as [number, number]));
/** Nearest-rank quantile (same as the AC7 band test). */
export const quantile = (a: number[], p: number) => { if (!a.length) throw new Error('quantile of empty set'); const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))]; };
/** Time spent on level n = reach[n+1] - reach[n]; null if n+1 not reached. */
export const timeOnLevel = (r: Reach, n: number): number | null => { const m = toMap(r), a = m.get(n), z = m.get(n + 1); return a == null || z == null ? null : z - a; };
/** Max time on any level in [from, to]; throws if a level in the window was not completed (extend the horizon). */
export function maxTimeOnLevels(r: Reach, from: number, to: number): number {
  let mx = -Infinity;
  for (let n = from; n <= to; n++) { const t = timeOnLevel(r, n); if (t == null) throw new Error(`L${n} not completed: extend the run horizon`); mx = Math.max(mx, t); }
  return mx;
}
/** Max step(n) = time(n)/time(n-1) over n >= fromLevel with time(n-1) >= minPrevS; null if no step counts. */
export function maxStepRatio(r: Reach, fromLevel: number, minPrevS: number): number | null {
  const m = toMap(r); let mx: number | null = null;
  for (const n of [...m.keys()].sort((x, y) => x - y)) {
    if (n < fromLevel) continue; const cur = timeOnLevel(m, n), prev = timeOnLevel(m, n - 1);
    if (cur == null || prev == null || prev < minPrevS) continue; mx = Math.max(mx ?? -Infinity, cur / prev);
  }
  return mx;
}
/** Max gap (s) between consecutive purchase times at or after fromT (purchases at level >= from, caller filters). */
export const maxGap = (buys: number[]) => { const s = [...buys].sort((x, y) => x - y); let mx = 0; for (let i = 1; i < s.length; i++) mx = Math.max(mx, s[i] - s[i - 1]); return mx; };
export interface GuardResult { p95: number; worst: number; failures: string[]; warnings: string[] }
/** L30+ step-ratio guard over seeds. ex1 = casual+workers exception: both P95 and worst use ex1_casual_workers_step_max. */
export function stepRatioGuard(reaches: Reach[], t: PacingTargets, ex1 = false): GuardResult {
  const v = reaches.map(r => maxStepRatio(r, t.step_ratio_from_level, t.step_ratio_min_prev_s)).filter((x): x is number => x != null);
  if (!v.length) throw new Error(`no counted L${t.step_ratio_from_level}+ steps: run does not reach the late curve`);
  const p95 = quantile(v, 0.95), worst = Math.max(...v), pm = ex1 ? t.ex1_casual_workers_step_max : t.step_ratio_p95_max, wm = ex1 ? t.ex1_casual_workers_step_max : t.step_ratio_worst_max, f: string[] = [];
  if (p95 > pm) f.push(`step P95 ${p95.toFixed(3)} > ${pm}`); if (worst > wm) f.push(`step worst ${worst.toFixed(3)} > ${wm}`);
  return { p95, worst, failures: f, warnings: [] };
}
/** L30+ purchase-gap guard; per-seed purchase-time lists already restricted to L30+. P95 above target is a warning only. */
export function gapGuard(buysPerSeed: number[][], t: PacingTargets): GuardResult {
  const v = buysPerSeed.map(maxGap), p95 = quantile(v, 0.95), worst = Math.max(...v), f: string[] = [], w: string[] = [];
  if (p95 > t.gap_p95_max_s) f.push(`gap P95 ${p95}s > ${t.gap_p95_max_s}s`); if (worst > t.gap_worst_max_s) f.push(`gap worst ${worst}s > ${t.gap_worst_max_s}s`);
  if (p95 > t.gap_p95_target_s) w.push(`gap P95 ${p95}s above target ${t.gap_p95_target_s}s (warn only)`);
  return { p95, worst, failures: f, warnings: w };
}
/** L18-25 guard, variance workers bot (HoP 02:05): per seed, the slowest level L18..L25; P95 across seeds
 *  <= l18_25_step_p95_max_s_variance and worst seed <= l18_25_step_worst_max_s, both hard. */
export function l18to25Guard(reaches: Reach[], t: PacingTargets): GuardResult {
  const v = reaches.map(r => maxTimeOnLevels(r, 18, 25)), p95 = quantile(v, 0.95), worst = Math.max(...v), f: string[] = [];
  if (p95 > t.l18_25_step_p95_max_s_variance) f.push(`L18-25 P95 ${p95.toFixed(1)}s > ${t.l18_25_step_p95_max_s_variance}s`);
  if (worst > t.l18_25_step_worst_max_s) f.push(`L18-25 worst ${worst.toFixed(1)}s > ${t.l18_25_step_worst_max_s}s`);
  return { p95, worst, failures: f, warnings: [] };
}
/** L18-25 guard, fixed (deterministic) workers bot: every seed's slowest L18..L25 level <= l18_25_step_p95_max_s. */
export function l18to25FixedGuard(reaches: Reach[], t: PacingTargets): GuardResult {
  const v = reaches.map(r => maxTimeOnLevels(r, 18, 25)), worst = Math.max(...v), f: string[] = [];
  if (worst > t.l18_25_step_p95_max_s) f.push(`fixed bot L18-25 slowest ${worst.toFixed(1)}s > ${t.l18_25_step_p95_max_s}s`);
  return { p95: quantile(v, 0.95), worst, failures: f, warnings: [] };
}
/** Warn-only: workers P95 time-to-L20 above ac7_w_t20_p95_warn_s. Unreached L20 counts as Infinity. */
export function t20P95Warning(reaches: Reach[], t: PacingTargets): { p95: number; warning: string | null } {
  const p95 = quantile(reaches.map(r => toMap(r).get(20) ?? Infinity), 0.95);
  return { p95, warning: p95 > t.ac7_w_t20_p95_warn_s ? `workers P95 time-to-L20 ${p95}s > ${t.ac7_w_t20_p95_warn_s}s (R-AC7-W-ZERO-MARGIN, warn only)` : null };
}
