// Unit tests for tests/pacing-guards.ts on synthetic traces. Every bound comes from data/pacing-targets.json.
import { describe, it, expect } from 'vitest';
import { l18to25FixedGuard, over, loadTargets, timeOnLevel, maxTimeOnLevels, maxStepRatio, maxGap, stepRatioGuard, gapGuard, l18to25Guard, t20P95Warning, quantile } from './pacing-guards';
const t = loadTargets();
/** Reach map from per-level durations: durs[i] = time on level start+i. Levels below start take 10 s each. */
const reach = (start: number, durs: number[]) => { const r: Record<string, number> = {}; let x = 0; for (let n = 0; n < start; n++) { r[n] = x; x += 10; } durs.forEach((d, i) => { r[start + i] = x; x += d; }); r[start + durs.length] = x; return r; };
const F = t.step_ratio_from_level, M = t.step_ratio_min_prev_s;
describe('pacing-targets.json', () => {
  it('has every guard key as a finite number', () => {
    for (const k of ['step_ratio_p95_max', 'step_ratio_worst_max', 'step_ratio_min_prev_s', 'step_ratio_from_level', 'gap_p95_max_s', 'gap_p95_target_s', 'gap_worst_max_s', 'l18_25_step_p95_max_s', 'l18_25_step_worst_max_s', 'active_idle_p95_max', 'active_idle_worst_max', 'ex1_casual_workers_step_max', 'ac7_w_t20_p95_warn_s', 'l18_25_step_p95_max_s_variance'] as const)
      expect(Number.isFinite(t[k]), k).toBe(true);
    expect(t.gap_p95_target_s).toBeLessThanOrEqual(t.gap_p95_max_s); expect(t.step_ratio_p95_max).toBeLessThanOrEqual(t.step_ratio_worst_max);
  });
});
describe('step ratio (L30+ only)', () => {
  it('ignores levels below step_ratio_from_level, even huge steps', () => {
    const r = reach(F - 3, [M, M * 10, M, M, M]); // spike at L(F-2)
    expect(maxStepRatio(r, F, M)).toBe(1);
  });
  it('counts step at from_level and skips a short previous level', () => {
    expect(maxStepRatio(reach(F - 1, [M, M * t.step_ratio_worst_max]), F, M)).toBeCloseTo(t.step_ratio_worst_max);
    expect(maxStepRatio(reach(F - 1, [M - 1, M * 10]), F, M)).toBeNull();
  });
  it('guard: P95 and worst bounds, fail just over', () => {
    const ok = Array.from({ length: 100 }, () => reach(F - 1, [M, M * t.step_ratio_p95_max]));
    expect(stepRatioGuard(ok, t).failures).toEqual([]);
    const bad = [...ok.slice(1), reach(F - 1, [M, M * (t.step_ratio_worst_max + 0.01)])];
    expect(stepRatioGuard(bad, t).failures.join()).toMatch(/worst/);
    const p95bad = ok.map((r, i) => i < 10 ? reach(F - 1, [M, M * (t.step_ratio_p95_max + 0.1)]) : r);
    expect(stepRatioGuard(p95bad, t).failures.join()).toMatch(/P95/);
    expect(stepRatioGuard(p95bad, t, true).failures).toEqual([]); // EX-1: P95 allowed up to ex1 bound
  });
  it('throws when no L30+ step counts (never vacuous)', () => expect(() => stepRatioGuard([reach(0, [M, M])], t)).toThrow(/late curve/));
});
describe('purchase gap', () => {
  it('maxGap', () => expect(maxGap([0, 100, 400, 450])).toBe(300));
  it('P95 between target and max warns, does not fail; over max fails', () => {
    const mid = (t.gap_p95_target_s + t.gap_p95_max_s) / 2;
    const g = gapGuard(Array.from({ length: 100 }, () => [0, mid]), t);
    expect(g.failures).toEqual([]); expect(g.warnings.length).toBe(1);
    expect(gapGuard(Array.from({ length: 100 }, () => [0, t.gap_p95_target_s]), t).warnings).toEqual([]);
    expect(gapGuard([[0, t.gap_worst_max_s + 1], ...Array.from({ length: 99 }, () => [0, 10])], t).failures.join()).toMatch(/worst/);
  });
});
describe('L18-25 window and P5 time-to-L20 warning', () => {
  it('time on level, window max, horizon error', () => {
    const r = reach(18, [100, 200, 300, 100, 100, 100, 100, 100]);
    expect(timeOnLevel(r, 19)).toBe(200); expect(maxTimeOnLevels(r, 18, 25)).toBe(300);
    expect(() => maxTimeOnLevels(reach(18, [100]), 18, 25)).toThrow(/horizon/);
  });
  it('guard fails over P95 / worst', () => {
    const ok = Array.from({ length: 100 }, () => reach(18, Array(8).fill(t.l18_25_step_p95_max_s_variance)));
    expect(l18to25Guard(ok, t).failures).toEqual([]);
    expect(l18to25Guard([...ok.slice(1), reach(18, [...Array(7).fill(10), t.l18_25_step_worst_max_s + 1])], t).failures.join()).toMatch(/worst/);
  });
  it('P95 t20 warning only above the bound', () => {
    const at = (s: number) => Array.from({ length: 100 }, () => ({ 0: 0, 20: s }));
    expect(t20P95Warning(at(t.ac7_w_t20_p95_warn_s), t).warning).toBeNull();
    expect(t20P95Warning(at(t.ac7_w_t20_p95_warn_s + 1), t).warning).toMatch(/warn only/);
  });
  it('quantile', () => expect(quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.95)).toBe(10));
});
describe('L18-25 per-seed slowest level', () => {
  const V = t.l18_25_step_p95_max_s_variance, slow = (x: number) => reach(18, [x, ...Array(7).fill(10)]);
  it('variance: P95 across seeds of each seed\'s slowest level, fails just over the bound', () => {
    const ok = Array.from({ length: 100 }, (_, i) => slow(i < 5 ? V + 1 : V));       // 5% over: P95 still within
    expect(l18to25Guard(ok, t).failures).toEqual([]); expect(l18to25Guard(ok, t).p95).toBe(V);
    const bad = Array.from({ length: 100 }, (_, i) => slow(i < 6 ? V + 1 : V));      // 6% over
    expect(l18to25Guard(bad, t).failures.join()).toMatch(/P95/);
  });
  it('fixed bot: any seed over l18_25_step_p95_max_s fails', () => {
    const ok = Array.from({ length: 100 }, () => slow(t.l18_25_step_p95_max_s));
    expect(l18to25FixedGuard(ok, t).failures).toEqual([]);
    expect(l18to25FixedGuard([...ok.slice(1), slow(t.l18_25_step_p95_max_s + 1)], t).failures.length).toBe(1);
  });
});
describe('fail closed on non-finite values (CCR m1)', () => {
  const ok = () => Array.from({ length: 100 }, () => reach(18, Array(8).fill(10)));
  for (const [name, bad] of [['NaN', NaN], ['Infinity', Infinity]] as const) {
    it(`${name} fails every guard`, () => {
      const r = ok(); r[0] = { ...r[0], 20: bad };                                    // poisons time on L19 and L20
      expect(l18to25Guard(r, t).failures.join()).toMatch(/non-finite/);
      expect(l18to25FixedGuard(r, t).failures.join()).toMatch(/non-finite/);
      const st = Array.from({ length: 100 }, () => reach(F - 1, [M, M])); st[0] = reach(F - 1, [M, bad]);
      expect(stepRatioGuard(st, t).failures.join()).toMatch(/non-finite/);
      expect(gapGuard([[0, bad], ...Array.from({ length: 99 }, () => [0, 10])], t).failures.join()).toMatch(/non-finite/);
      expect(t20P95Warning(Array.from({ length: 100 }, () => ({ 0: 0, 20: bad })), t).warning).toMatch(/warn only/);
      expect(over(bad, 1e9)).toBe(true);
    });
  }
  it('finite values at the bound pass (inclusive)', () => expect(over(t.l18_25_step_worst_max_s, t.l18_25_step_worst_max_s)).toBe(false));
});
