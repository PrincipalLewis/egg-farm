// Pure worst-seed pacing-guard helpers (bounds: data/pacing-targets.json). Reach = level -> first time (s) it was reached.
import { readFileSync } from 'node:fs';
export interface PacingTargets {
  step_ratio_p95_max: number; step_ratio_worst_max: number; step_ratio_min_prev_s: number; step_ratio_from_level: number;
  gap_p95_max_s: number; gap_p95_target_s: number; gap_worst_max_s: number;
  l18_25_step_p95_max_s: number; l18_25_step_worst_max_s: number;
  active_idle_p95_max: number; active_idle_worst_max: number; ex1_casual_workers_step_max: number; ac7_w_p5_t20_warn_s: number;
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
/** L18-25 time-on-level window guard (workers variance bot, F1). Each (seed, level) time on level L18..L25 is one step sample
 *  (QA 'L18-25 worst step' row: med(steps) -> P95(steps), HoP 23:19): P95 over all pooled samples, worst = max sample.
 *  perSeedMaxP95 (P95 of each seed's slowest level) is reported for information, not gated. */
export function l18to25Guard(reaches: Reach[], t: PacingTargets): GuardResult & { perSeedMaxP95: number } {
  const pooled: number[] = [], per: number[] = [];
  for (const r of reaches) { per.push(maxTimeOnLevels(r, 18, 25)); for (let n = 18; n <= 25; n++) pooled.push(timeOnLevel(r, n)!); }
  const p95 = quantile(pooled, 0.95), worst = Math.max(...pooled), f: string[] = [];
  if (p95 > t.l18_25_step_p95_max_s) f.push(`L18-25 P95 ${p95}s > ${t.l18_25_step_p95_max_s}s`); if (worst > t.l18_25_step_worst_max_s) f.push(`L18-25 worst ${worst}s > ${t.l18_25_step_worst_max_s}s`);
  return { p95, worst, failures: f, warnings: [], perSeedMaxP95: quantile(per, 0.95) };
}
/** Warn-only: workers P5 time-to-L20 above ac7_w_p5_t20_warn_s. Unreached L20 counts as Infinity. */
export function p5T20Warning(reaches: Reach[], t: PacingTargets): { p5: number; warning: string | null } {
  const p5 = quantile(reaches.map(r => toMap(r).get(20) ?? Infinity), 0.05);
  return { p5, warning: p5 > t.ac7_w_p5_t20_warn_s ? `workers P5 time-to-L20 ${p5}s > ${t.ac7_w_p5_t20_warn_s}s (R-AC7-W-ZERO-MARGIN, warn only)` : null };
}
