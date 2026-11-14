// D-HOP-52 review draft r2 (QA-D-1105-K10ASSERT). All values are percentage points; do not round before judging.
import { mulberry32 } from './mulberry32';

export interface PremiumRow { seed: number; premiumPp: number }

/** Lower nearest-rank median: sort ascending, take index ceil(n/2)-1. */
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.ceil(xs.length / 2) - 1];

/** Fixed D-HOP-52 decision-text target (0.58 pp); recorded beside computed 2× noise. */
export const D_HOP_52_TARGET_PP = 0.58;

export function b4Evidence(candidate: PremiumRow[], reference: PremiumRow[]) {
  if (candidate.length < 2 || candidate.length !== reference.length) throw new Error('B4 needs at least 2 paired seeds');
  if (candidate.some((r, i) => r.seed !== reference[i].seed) || new Set(candidate.map(r => r.seed)).size !== candidate.length) {
    throw new Error('B4 seeds must be paired and unique');
  }
  if ([...candidate, ...reference].some(r => !Number.isFinite(r.premiumPp))) throw new Error('B4 premium must be finite');

  const a = candidate.map(r => r.premiumPp), b = reference.map(r => r.premiumPp);
  const marginPp = median(b) - median(a);
  const medianNoisePp = median(a.map((x, i) => Math.abs(x - b[i])));
  const targetTwoNoisePp = 2 * medianNoisePp;

  // Canonical paired bootstrap: shared mulberry32 helper, seed 1, 4000 resamples,
  // one shared index vector per resample for both arms, lower nearest-rank median,
  // population SD, no rounding before comparison.
  const random = mulberry32(1);
  const boot: number[] = [];
  for (let k = 0; k < 4000; k++) {
    const ix = a.map(() => Math.floor(random() * a.length));
    boot.push(median(ix.map(i => b[i])) - median(ix.map(i => a[i])));
  }
  const mean = boot.reduce((s, x) => s + x, 0) / boot.length;
  const bootstrapSdPp = Math.sqrt(boot.reduce((s, x) => s + (x - mean) ** 2, 0) / boot.length);

  const marginAboveNoise = marginPp > medianNoisePp;
  const aboveOneSd = marginPp > bootstrapSdPp;
  // ≥2× noise is a recorded TARGET, not a hard gate (HoQA ruling A).
  const targetTwoNoise = marginPp >= targetTwoNoisePp;
  const pass = marginAboveNoise && aboveOneSd;
  // Within 5% of the SD (either side) => MARGINAL, needs HoQA review regardless of pass/fail.
  const marginal = bootstrapSdPp > 0 && Math.abs(marginPp - bootstrapSdPp) <= 0.05 * bootstrapSdPp;

  let verdict: 'PASS' | 'PASS (below 2x target)' | 'FAIL' | 'MARGINAL';
  if (marginal) verdict = 'MARGINAL';
  else if (!pass) verdict = 'FAIL';
  else if (!targetTwoNoise) verdict = 'PASS (below 2x target)';
  else verdict = 'PASS';

  return {
    marginPp,
    medianNoisePp,
    bootstrapSdPp,
    marginAboveNoise,
    aboveOneSd,
    targetTwoNoise,
    targetTwoNoisePp,
    decisionTargetPp: D_HOP_52_TARGET_PP,
    pass,
    marginal,
    verdict,
    bootstrap: {
      algorithm: 'mulberry32',
      helper: 'tests/mulberry32.ts',
      helperIdentity: 'shared; hashed-seed formula identical to k10-breeds-offset.ts L118 / bot-m5.ts L37',
      seed: 1,
      resamples: 4000,
      paired: true,
      sharedIndexVector: true,
      median: 'lower-nearest-rank',
      sd: 'population',
      roundBeforeCompare: false,
    },
    n: a.length,
  };
}
