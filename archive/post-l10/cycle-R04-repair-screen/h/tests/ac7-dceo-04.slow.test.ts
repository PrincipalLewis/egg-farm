// SLOW: AC7 final-SHA acceptance gate, D-CEO-20261019-04 (decisions.md:49-52, CEO authority; studio-internal AC7 gate).
// Exact thresholds (decisions.md:51): L10 P95 <= 12.1 min on seeds 1-200, both paths; fastest-seed L10 >= 7.8 min;
// seeds 201-300 pass all original gates strictly; L30+ workers path P95 step ratio <= 2.00, worst seed <= 2.25.
// All other gates unchanged (they keep living in their own suites). Metric definitions mirror Economy gates.py:
// no-workers = runBot seller15 variance, 3600 s; workers = runM2 seller15 variance, 7200 s; L10 = reach[10]/60;
// L@30 = max level reached by 1800 s. Run with `npm run test:slow`.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { runBot } from './bot';
import { runM2 } from './bot-m2';
import { VAR_DEFAULT } from './seller-variance';
import { loadTargets, quantile as q, l18to25Guard, l18to25FixedGuard, stepRatioGuard, Reach } from './pacing-guards';
const t = loadTargets();
const seeds = (a: number, z: number) => Array.from({ length: z - a + 1 }, (_, i) => a + i);
const nw = (s: number) => runBot(b, s, 'seller15', 3600, 15, VAR_DEFAULT).reach as Reach;
const w = (s: number, T = 7200) => runM2(b, s, { model: 'seller15', T, variance: VAR_DEFAULT }).reach as Reach;
const get = (r: Reach, L: number) => (r instanceof Map ? r.get(L) : (r as any)[L]) ?? Infinity;
const l10 = (rs: Reach[]) => rs.map(r => get(r, 10) / 60), t18 = (rs: Reach[]) => rs.map(r => get(r, 18) / 60);
const lvlAt = (r: Reach, s: number) => Math.max(0, ...[...(r instanceof Map ? r : new Map(Object.entries(r).map(([k, v]) => [+k, v as number])))].filter(([, v]) => v <= s).map(([k]) => k));
const spread = (a: number[]) => 100 * (q(a, 0.95) / q(a, 0.5) - 1);
const fmt = (a: number[]) => `P95 ${q(a, 0.95).toFixed(2)} fastest ${Math.min(...a).toFixed(2)}`;
describe('AC7 D-CEO-20261019-04 final-SHA gate', () => {
  it('seeds 1-200, both paths: L10 P95 <= 12.1 min, fastest-seed L10 >= 7.8 min', () => {
    const S = seeds(1, 200), a = l10(S.map(nw)), c = l10(S.map(s => w(s)));
    console.log(`D-CEO-04 1-200 L10 nw ${fmt(a)} | w ${fmt(c)}`);
    for (const x of [a, c]) { expect(q(x, 0.95)).toBeLessThanOrEqual(12.1); expect(Math.min(...x)).toBeGreaterThanOrEqual(7.8); }
  }, 1_200_000);
  it('seeds 201-300 pass all original gates strictly', () => {
    const S = seeds(201, 300), A = S.map(nw), W = S.map(s => w(s)), F = S.map(s => runM2(b, s, { model: 'seller15', T: 7200 }).reach as Reach);
    const a = l10(A), c = l10(W), la = A.map(r => lvlAt(r, 1800)), lw = W.map(r => lvlAt(r, 1800));
    console.log(`D-CEO-04 201-300 L10 nw ${fmt(a)} | w ${fmt(c)}; L@30 nw P5/P95 ${q(la, .05)}/${q(la, .95)} w ${q(lw, .05)}/${q(lw, .95)}`);
    // original L10 gate (pre-D-CEO-04): P95 <= 12.0, fastest >= 8.0, both paths
    for (const x of [a, c]) { expect(q(x, 0.95)).toBeLessThanOrEqual(12.0); expect(Math.min(...x)).toBeGreaterThanOrEqual(8.0); }
    // AC7 band on the variance bot: no-workers P5 >= 18, P95 <= 22; workers P5 >= 20, P95 <= 24
    expect(q(la, 0.05)).toBeGreaterThanOrEqual(18); expect(q(la, 0.95)).toBeLessThanOrEqual(22);
    expect(q(lw, 0.05)).toBeGreaterThanOrEqual(20); expect(q(lw, 0.95)).toBeLessThanOrEqual(24);
    // variance targets: t18 distinct >= 50, P95 != P50, spread 3-15 %, >= 15 distinct in the first 30 seeds (both paths)
    for (const x of [t18(A), t18(W)]) {
      expect(new Set(x).size).toBeGreaterThanOrEqual(50); expect(q(x, 0.95)).not.toBe(q(x, 0.5));
      expect(spread(x)).toBeGreaterThanOrEqual(3); expect(spread(x)).toBeLessThanOrEqual(15); expect(new Set(x.slice(0, 30)).size).toBeGreaterThanOrEqual(15);
    }
    // L18-25 worst-seed guards (workers variance + fixed bot)
    expect(l18to25Guard(W, t).failures).toEqual([]); expect(l18to25FixedGuard(F, t).failures).toEqual([]);
  }, 1_200_000);
  // L30+ step ratio needs farm levels past 30. The T3 economy caps at maxLevel 30 (L30+ pack a957b072 not landed), so
  // stepRatioGuard has no counted step and cannot be evaluated here; it activates as soon as maxLevel > 30.
  it.skipIf(b.maxLevel <= 30)('L30+ workers path: P95 step ratio <= 2.00, worst seed <= 2.25 (seeds 1-200)', () => {
    const g = stepRatioGuard(seeds(1, 200).map(s => w(s, 4 * 3600)), { ...t, step_ratio_p95_max: 2.0, step_ratio_worst_max: 2.25 });
    console.log(`D-CEO-04 L30+ step P95 ${g.p95.toFixed(2)} worst ${g.worst.toFixed(2)}`);
    expect(g.p95).toBeLessThanOrEqual(2.0); expect(g.worst).toBeLessThanOrEqual(2.25); expect(g.failures).toEqual([]);
  }, 1_800_000);
});
