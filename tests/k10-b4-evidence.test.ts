import assert from 'node:assert/strict';
import { it } from 'vitest';
import { b4Evidence, D_HOP_52_TARGET_PP } from './k10-b4-evidence';

it('D-HOP-52 strict noise, signed margin, deterministic paired-bootstrap and validation boundaries', () => {
  const row = (values: number[]) => values.map((premiumPp, i) => ({ seed: i + 1, premiumPp }));
  assert.equal(b4Evidence(row([1, 1, 1, 1, 1]), row([1, 1, 1, 1, 1])).pass, false);
  assert.equal(b4Evidence(row([1, 1, 1, 1, 1]), row([2, 2, 2, 2, 2])).pass, false); // strict margin > noise
  assert.equal(b4Evidence(row([3, 3, 3, 3, 3]), row([2, 2, 2, 2, 2])).pass, false);
  assert.throws(() => b4Evidence(row([1]), row([2])), /at least 2/);
  assert.throws(() => b4Evidence(row([1, 2]), row([2, Number.NaN])), /finite/);
  assert.throws(() => b4Evidence(row([1, 2]), [{ seed: 2, premiumPp: 1 }, { seed: 1, premiumPp: 2 }]), /paired/);
  const a = row([0, 0, 8, 8, 8]), b = row([0, 7, 9, 9, 9]);
  assert.deepEqual(b4Evidence(a, b), b4Evidence(a, b));
  const passing = b4Evidence(row([0, 1, 2, 100, 100]), row([0, 1, 50, 100, 100]));
  assert.equal(passing.pass, true);
  assert.equal(passing.marginPp, 48);
  assert.equal(passing.medianNoisePp, 0);
  assert.equal(passing.targetTwoNoise, true);
  assert.equal(passing.verdict, 'PASS');
  assert.equal(b4Evidence(row([0, 1, 50, 100, 100]), row([0, 1, 2, 100, 100])).pass, false);
  const sdFailure = b4Evidence(row([0, 1, 2, 3, 4, 5, 100]), row([-1000, 1, 2, 4, 4, 5, 10000]));
  assert.equal(sdFailure.marginAboveNoise, true);
  assert.equal(sdFailure.aboveOneSd, false);
  assert.equal(sdFailure.pass, false);
  assert.equal(sdFailure.verdict, 'FAIL');
  console.log('stats boundary checks passed', JSON.stringify({ passing, sdFailure }));
});

it('golden bootstrap SD + convention metadata on fixed small input (shared hashed mulberry32)', () => {
  const row = (values: number[]) => values.map((premiumPp, i) => ({ seed: i + 1, premiumPp }));
  const e = b4Evidence(row([0, 1, 2, 3, 4]), row([1, 2, 4, 4, 10]));
  // Exact population SD from mulberry32(seed=1 hashed), 4000 paired resamples, lower nearest-rank median.
  assert.equal(e.bootstrapSdPp, 1.130034042628836);
  assert.equal(e.marginPp, 2);
  assert.equal(e.medianNoisePp, 1);
  assert.equal(e.targetTwoNoisePp, 2);
  assert.equal(e.decisionTargetPp, D_HOP_52_TARGET_PP);
  assert.equal(e.decisionTargetPp, 0.58);
  assert.deepEqual(e.bootstrap, {
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
  });
  // Re-compute must be bit-identical (determinism).
  assert.equal(b4Evidence(row([0, 1, 2, 3, 4]), row([1, 2, 4, 4, 10])).bootstrapSdPp, e.bootstrapSdPp);
});

it('PASS (below 2x target) and MARGINAL verdict paths (exact strings)', () => {
  const row = (values: number[]) => values.map((premiumPp, i) => ({ seed: i + 1, premiumPp }));
  const below = b4Evidence(
    row([19, 3, 16, 0, 13, 10, 1, 8]),
    row([25, 7, 20, 5, 17, 14, 5, 14]),
  );
  assert.equal(below.pass, true);
  assert.equal(below.targetTwoNoise, false);
  assert.equal(below.marginal, false);
  assert.equal(below.verdict, 'PASS (below 2x target)');
  assert.equal(below.decisionTargetPp, 0.58);
  assert.equal(below.targetTwoNoisePp, 2 * below.medianNoisePp);

  const marginal = b4Evidence(
    row([0, 11, 13, 14, 19, 18, 22, 29]),
    row([0, 11, 14, 19, 17, 16, 24, 28]),
  );
  assert.equal(marginal.marginal, true);
  assert.equal(marginal.verdict, 'MARGINAL');
  assert.ok(Math.abs(marginal.marginPp - marginal.bootstrapSdPp) <= 0.05 * marginal.bootstrapSdPp);
});
