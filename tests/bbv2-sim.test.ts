// BBV2-AC8 / AC9 / AC14 [B] unit subset (Card #12 4a154bb4; spec v1.0.3 27e753d8 §7). Seeds 1–200: bbv2-sim.slow.test.ts.
import { describe, it, expect } from 'vitest';
import { ac8, ac9, ac14, AC14_CONFIGS, seeds } from './bbv2-sim';
import { ON } from './bbv2-fixtures';

describe('BBV2-AC8 [B] fresh save: first ★ meaningful + affordable <= 30 s (sim time, VAR_DEFAULT taps)', () => {
  it('seeds 1–200, 15 s check-in sells (gating cadence): 0 violating seeds', () => {
    const r = seeds(1, 200).map(sd => ({ sd, ...ac8(ON, sd, 'fixed') }));
    const bad = r.filter(x => !(x.t <= 30) || !x.meaningful || x.firstHintMeaningful !== true);
    console.log(`AC8 fixed cadence: max first ★ ${Math.max(...r.map(x => x.t))} s; keys ${[...new Set(r.map(x => x.key))].join(',')}; violating ${bad.length}`);
    expect(bad.map(x => x.sd)).toEqual([]);
  });
  it('VAR_DEFAULT check-in cadence: REPORT-ONLY (the bot\'s random first check-in), every seed gets a meaningful ★', () => {
    const r = seeds(1, 200).map(sd => ac8(ON, sd, 'variance'));
    console.log(`AC8 variance cadence (report-only): ${r.filter(x => x.t > 30).length}/200 first ★ after 30 s, max ${Math.max(...r.map(x => x.t))} s`);
    expect(r.every(x => Number.isFinite(x.t) && x.meaningful && x.firstHintMeaningful)).toBe(true);
  });
});

describe('BBV2-AC9 [B] seller15 bots (runBot band + runM2 workers, VAR_DEFAULT): zero-gain buys below L30 = 0', () => {
  it('flag on, seeds 1–10 (1–200 in the slow test)', () => {
    const r = ac9(ON, seeds(1, 10)); console.log(`AC9 seeds 1-10: ${r.zeroGainBelow30} zero-gain of ${r.buys} buys`);
    expect(r.buys).toBeGreaterThan(0); expect(r.perSeed).toEqual([]); expect(r.zeroGainBelow30).toBe(0);
  });
});

describe('BBV2-AC14 [B] traces: hint on a zero-gain row while a meaningful row is offered = 0', () => {
  for (const [label, b] of Object.entries(AC14_CONFIGS)) it(`${label}: seeds 1–3 (1–200 in the slow test)`, () => {
    const r = ac14(b, seeds(1, 3)); console.log(`AC14 ${label} seeds 1-3: ${JSON.stringify(r)}`);
    expect(r.states).toBeGreaterThan(0); expect(r.violations).toBe(0); expect(r.examples).toEqual([]);
    expect(r.suppressedAffordableBelow30).toBe(0); // suppressed with an affordable hint only in the post-L30 mark-null net
    expect(r.suppressedEvents).toBe(0); // no SG-8 emitter in v5 (D-HOE-33)
  }, 120_000);
});
