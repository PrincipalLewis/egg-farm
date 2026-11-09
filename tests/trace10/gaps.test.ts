import { describe, it, expect } from 'vitest';
import { gapRow, gapRuns, consumeCell, EC1_LEVELS, type AffSample } from './gaps';

const reachTo = (Lmax: number, step = 100) => new Map(Array.from({ length: Lmax + 1 }, (_, L) => [L, L * step] as [number, number]));
/** samples every second from 1..T; F from reach; unaffordable during the given [from, to) windows */
const samples = (reach: Map<number, number>, T: number, gaps: [number, number][]): AffSample[] => Array.from({ length: T }, (_, k) => {
  const t = k + 1; let F = 0; for (const [L, r] of reach) if (r <= t) F = Math.max(F, L); return { t, F, aff: !gaps.some(([a, b]) => t >= a && t < b) };
});
describe('EC-1 Option A gaps (design §12)', () => {
  it('T-EC1a: fully observed L with no gap -> key present, === 0, consumer PASS-eligible', () => {
    const r = reachTo(30), { row } = gapRow(1, samples(r, 3100, []), r, 3100);
    expect(row.observed['15']).toBe(0); expect(Object.keys(row.observed)).toEqual(EC1_LEVELS.map(String));
    expect(consumeCell(row, 15)).toBe('PASS_ELIGIBLE');
  });
  it('gap length keyed by the start level; max per level', () => {
    const r = reachTo(30), { row, maxGap } = gapRow(1, samples(r, 3100, [[1210, 1250], [1260, 1270], [1520, 1530]]), r, 3100);
    expect(row.observed['12']).toBe(40); expect(row.observed['15']).toBe(10); expect(maxGap).toBe(40);
  });
  it('T-EC1b: missing key / null / [] / NaN / empty map -> FAIL or UNASSESSED, never PASS', () => {
    const base = { seed: 1, observed: { '11': 0 }, unobserved: {} };
    for (const row of [base, { ...base, observed: { '11': 0, '12': null } }, { ...base, observed: { '11': 0, '12': [] } }, { ...base, observed: { '11': 0, '12': NaN } }, { ...base, observed: {} }, { seed: 1 }, null])
      expect(['FAIL', 'UNASSESSED']).toContain(consumeCell(row, 12));
  });
  it('T-EC1c: unreached L -> in unobserved as "unreached", not 0', () => {
    const r = reachTo(18), { row } = gapRow(1, samples(r, 2000, []), r, 2000);
    expect(row.observed['18']).toBeUndefined(); expect(row.unobserved['18']).toBe('unreached'); expect(row.unobserved['25']).toBe('unreached');
    expect(row.observed['17']).toBe(0); expect(consumeCell(row, 18)).toBe('UNASSESSED');
  });
  it('a gap still open at T makes its level window_incomplete; open length counts in maxGap (T - start)', () => {
    const r = reachTo(20), T = 2100, { row, maxGap } = gapRow(1, samples(r, T, [[2050, 9999]]), r, T);
    expect(row.unobserved['20']).toBe('unreached'); expect(gapRuns(samples(r, T, [[2050, 9999]]), T).open).toEqual({ L: 20, len: 50 }); expect(maxGap).toBe(50);
  });
});
