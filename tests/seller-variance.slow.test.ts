// SLOW (~80 s): *.slow.test.ts is excluded from default `vitest run` / `npm test` (vite.config.ts test.exclude).
// Run it with `npm run test:slow` (vitest.slow.config.ts); CI always runs it in the ci.yml `slow` job. Seeds stay at 100.
// Seller15 variance bot (vendor/economy-sim/sim/seller-variance-proposal.md, vendored from product/sim/, sha256 17877b41; HoQA F-1): TS vs Python parity.
// Expected values: tests/fixtures/seller_variance.json, produced by scripts/gen-seller-variance-fixtures.py running the
// Python reference vendor/economy-sim/sim/seller_variance_sim.py (vendored from product/sim/) (run / run_m2, policy seller15, 100 seeds, 60 min) on this repo's
// data/economy.csv. Regenerate: python3 scripts/gen-seller-variance-fixtures.py (defaults to vendor/economy-sim/sim; SV_SIM_DIR overrides)
//
// What is exact and what has a tolerance (the proposal specifies neither, so it is fixed here):
//  EXACT  - the variance stream (CPython MT19937 port): random() bit-for-bit, every p_delay / p_cheap_first roll, the call
//           order and counts of the full action trace (check-in gap, tap gap, delay, cheap-first). The trace is economy-
//           independent, so TS must reproduce it. Values that pass through exp/log (lognormal check gaps, tap skill) may
//           differ by 1 ulp between V8 and glibc libm: REL_EPS = 1e-12 relative (observed max ~2 ulp).
//  EXACT  - old deterministic bot (var undefined), M1 run(): per-seed reach times, all 100 seeds.
//  TOL    - variance bot outcomes. The game's demand/Poisson RNG (xorshift in GameState) is not Python's random.Random, and
//           irregular check-ins make early levels demand-sensitive, so per-seed reach times legitimately differ. Asserted at
//           the distribution level, as AC7 is judged: L@30 P5/P50/P95 equal; time-to-L18 P5/P50/P95 within 2 % relative;
//           P95/P50 spread within 2 percentage points; plus proposal targets 1-2 on the TS bot itself.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { balance as b } from '../src/config/balance';
import { runBot } from './bot';
import { runM2 } from './bot-m2';
import { PyRandom } from './py-random';
import { SellerVariance, VAR_DEFAULT, varianceSeed, TRACE } from './seller-variance';
type Run = { reach: Record<string, number>; buys: number; c: number; f: number };
type Trace = { n: Record<string, number>; sum: Record<string, number>; seq: [string, number][] };
const fx = JSON.parse(readFileSync(new URL('./fixtures/seller_variance.json', import.meta.url), 'utf8')) as {
  T: number; seeds: number[]; var: Record<string, unknown>; draws: Record<string, { skill: number; seq: number[] }>;
  traces: Record<string, Trace>; runs: Record<string, Record<string, Run>> };
const reachOf = (m: Map<number, number>) => Object.fromEntries([...m].sort((x, y) => x[0] - y[0]).map(([k, v]) => [String(k), v]));
const q = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))]; };
const lvlAt = (r: Record<string, number>, t: number) => Math.max(0, ...Object.entries(r).filter(([, v]) => v <= t).map(([k]) => Number(k)));
const REL_EPS = 1e-12;
const near = (a: number, e: number) => a === e || Math.abs(a - e) <= REL_EPS * Math.max(Math.abs(a), Math.abs(e));
const t18 = (r: Record<string, number>) => (r['18'] ?? Infinity) / 60;
const LVL30: Partial<Record<'m1' | 'm2', number[]>> = {};
const RUN = {
  m1: (s: number, v?: typeof VAR_DEFAULT) => reachOf(runBot(b, s, 'seller15', fx.T, 15, v).reach),
  m2: (s: number, v?: typeof VAR_DEFAULT) => reachOf(runM2(b, s, { model: 'seller15', T: fx.T, variance: v }).reach),
};

describe('variance stream = CPython random.Random (exact)', () => {
  it('params object = Python VAR_DEFAULT', () => expect(fx.var).toEqual({ ...VAR_DEFAULT }));
  it('known CPython values', () => {
    expect(new PyRandom(0).random()).toBe(0.8444218515250481); expect(new PyRandom(42).random()).toBe(0.6394267984578837);
    expect(varianceSeed(0)).toBe(1_000_020);
  });
  it('raw draws, seeds 0-3', () => {
    for (const [s, d] of Object.entries(fx.draws)) {
      const V = new SellerVariance(VAR_DEFAULT, Number(s)), got: number[] = [];
      for (let i = 0; i < 10; i++) got.push(V.checkInterval(15), V.tapInterval(), V.r.random(), V.r.lognormvariate(0, 0.35));
      expect(near(V.skill, d.skill)).toBe(true); expect(got.length).toBe(d.seq.length);
      got.forEach((x, i) => { expect(near(x, d.seq[i]), `seed ${s} draw ${i}: ${x} vs ${d.seq[i]}`).toBe(true); if (i % 4 === 2) expect(x).toBe(d.seq[i]); }); // random() exact
    }
  });
  for (const wk of ['m1', 'm2'] as const) it(`${wk}: full action trace equals Python (seeds ${Object.keys(fx.traces).filter(k => k.startsWith(wk)).map(k => k.split('/')[2]).join(',')})`, () => {
    for (const [key, exp] of Object.entries(fx.traces).filter(([k]) => k.startsWith(wk + '/'))) {
      const got: Trace = { n: { check: 0, tap: 0, delay: 0, cheap: 0 }, sum: { check: 0, tap: 0, delay: 0, cheap: 0 }, seq: [] };
      TRACE.fn = (k, v) => { got.n[k]++; got.sum[k] += v; if (got.seq.length < exp.seq.length) got.seq.push([k, v]); };
      try { RUN[wk](Number(key.split('/')[2]), VAR_DEFAULT); } finally { TRACE.fn = undefined; }
      expect(got.n, key).toEqual(exp.n); expect(got.seq.map(x => x[0]), key).toEqual(exp.seq.map(x => x[0]));
      got.seq.forEach(([k, v], i) => { if (k === 'delay' || k === 'cheap') expect(v, `${key} #${i}`).toBe(exp.seq[i][1]); else expect(near(v, exp.seq[i][1]), `${key} #${i}`).toBe(true); });
      for (const k of ['delay', 'cheap']) expect(got.sum[k], key).toBe(exp.sum[k]);
      for (const k of ['check', 'tap']) expect(Math.abs(got.sum[k] / exp.sum[k] - 1), key).toBeLessThanOrEqual(1e-9);
    }
  }, 60_000);
});

describe('old deterministic bot (variance off) = Python var=None', () => {
  it('m1: per-seed reach times exact, 100 seeds', () => {
    for (const s of fx.seeds) expect(RUN.m1(s), `seed ${s}`).toEqual(fx.runs['m1/old'][String(s)].reach);
  }, 120_000);
  // m2: no per-seed bit-exactness even with variance off (pre-existing on main, not from this port): the workers economy is
  // partly demand-bound and the game's demand RNG is not Python's. Asserted: same levels reached, level at 30:00 equal per
  // seed, every reach time within one 15 s sell step, and the old bot still degenerate (<= 2 distinct t18) on both sides.
  it('m2: per-seed level at 30:00 equal, every reach time within 15 s, 100 seeds', () => {
    let exact = 0; const tT: number[] = [], tP: number[] = [];
    for (const s of fx.seeds) {
      const got = RUN.m2(s), exp = fx.runs['m2/old'][String(s)].reach;
      expect(Object.keys(got), `seed ${s}`).toEqual(Object.keys(exp));
      expect(lvlAt(got, 1800), `seed ${s} L@30`).toBe(lvlAt(exp, 1800));
      for (const L of Object.keys(exp)) expect(Math.abs(got[L] - exp[L]), `seed ${s} L${L}`).toBeLessThanOrEqual(15);
      if (JSON.stringify(got) === JSON.stringify(exp)) exact++; tT.push(t18(got)); tP.push(t18(exp));
    }
    expect(new Set(tT).size).toBeLessThanOrEqual(2); expect(new Set(tP).size).toBeLessThanOrEqual(2);
    console.log(`m2 old: ${exact}/100 seeds bit-exact`);
  }, 120_000);
});

for (const wk of ['m1', 'm2'] as const) describe(`${wk} variance bot vs Python, ${fx.seeds.length} seeds (distribution)`, () => {
  it('AC7 quantiles match; proposal targets 1-2 hold', () => {
    const ts = fx.seeds.map(s => RUN[wk](s, VAR_DEFAULT)), py = fx.seeds.map(s => fx.runs[`${wk}/variance`][String(s)].reach);
    const tT = ts.map(t18), tP = py.map(t18);
    for (const p of [0.05, 0.5, 0.95]) {
      expect(q(ts.map(r => lvlAt(r, 1800)), p), `L@30 P${p * 100}`).toBe(q(py.map(r => lvlAt(r, 1800)), p));
      expect(Math.abs(q(tT, p) / q(tP, p) - 1), `t18 P${p * 100}`).toBeLessThanOrEqual(0.02);
    }
    const spread = (a: number[]) => 100 * (q(a, 0.95) / q(a, 0.5) - 1);
    expect(Math.abs(spread(tT) - spread(tP))).toBeLessThanOrEqual(2);
    expect(new Set(tT).size).toBeGreaterThanOrEqual(50); expect(q(tT, 0.95)).not.toBe(q(tT, 0.5)); // target 1
    expect(spread(tT)).toBeGreaterThanOrEqual(3); expect(spread(tT)).toBeLessThanOrEqual(15);        // target 2
    expect(new Set(tP).size).toBeGreaterThanOrEqual(50); expect(q(tP, 0.95)).not.toBe(q(tP, 0.5));   // targets 1-2 on the Python fixture too
    expect(spread(tP)).toBeGreaterThanOrEqual(3); expect(spread(tP)).toBeLessThanOrEqual(15);
    expect(new Set(tT.slice(0, 30)).size).toBeGreaterThanOrEqual(15);                                   // target 1, '15 of 30 seeds' variant
    expect(new Set(tP.slice(0, 30)).size).toBeGreaterThanOrEqual(15);
    LVL30[wk] = ts.map(r => lvlAt(r, 1800));
    console.log(`${wk} variance t18 P5/P50/P95 TS ${[.05, .5, .95].map(p => q(tT, p).toFixed(2)).join('/')} PY ${[.05, .5, .95].map(p => q(tP, p).toFixed(2)).join('/')}; spread TS ${spread(tT).toFixed(1)}% PY ${spread(tP).toFixed(1)}%; L@30 P5/P95 ${q(ts.map(r => lvlAt(r, 1800)), .05)}/${q(ts.map(r => lvlAt(r, 1800)), .95)}`);
  }, 300_000);
});

// AC7 band on the variance bot (proposal §AC7 with variance; CCR PR #19 M1/M2). Judged at P5/P95 of level at 30:00, switched
// on the sha256 of data/economy.csv. Every branch is a hard `it`: a thrown error always fails.
//  9980ec22 (F1 economy.f1-m4cols + HoP-approved AC7 L21 trim + start_coop_eggs column, cost cells = 6dca24cd; was 86f0e80e from PR #17): the band holds. No workers P5 >= 18 and P95 <= 22; workers P5 >= 20 and P95 <= 24.
//  57d964d5 (main, pre-F1): the known failing values are asserted exactly (no workers L@30 P5 = 17; workers max L@30 = 18),
//           so any drift (or a crash) fails. Needs #17 economy.f1-m4cols 86f0e80e for the real band.
//  any other sha: fails with 'unknown economy CSV <sha>: update AC7 band test'.
// After the CSV changes, regenerate the fixture first: scripts/gen-seller-variance-fixtures.py.
export const F1_CSV = '9980ec22', MAIN_PRE_F1_CSV = '57d964d5';
const csvSha = createHash('sha256').update(readFileSync(new URL('../data/economy.csv', import.meta.url))).digest('hex').slice(0, 8);
const BAND = { m1: { lo: 18, hi: 22 }, m2: { lo: 20, hi: 24 } } as const;
export function ac7BandCheck(sha: string, l30: { m1: number[]; m2: number[] }): void {
  if (sha === F1_CSV) for (const wk of ['m1', 'm2'] as const) {
    expect(q(l30[wk], 0.05), `${wk} L@30 P5`).toBeGreaterThanOrEqual(BAND[wk].lo); expect(q(l30[wk], 0.95), `${wk} L@30 P95`).toBeLessThanOrEqual(BAND[wk].hi);
  } else if (sha === MAIN_PRE_F1_CSV) { // known failing values on pre-F1 main (needs #17 economy.f1-m4cols 86f0e80e)
    expect(q(l30.m1, 0.05), 'm1 L@30 P5 (pre-F1)').toBe(17); expect(Math.max(...l30.m2), 'm2 max L@30 (pre-F1)').toBe(18);
  } else throw new Error(`unknown economy CSV ${sha}: update AC7 band test`);
}
const l30 = (wk: 'm1' | 'm2') => LVL30[wk] ?? fx.seeds.map(s => lvlAt(RUN[wk](s, VAR_DEFAULT), 1800));
describe(`AC7 band, variance bot (data/economy.csv ${csvSha})`, () => {
  it(`band per CSV sha ${csvSha}${csvSha === F1_CSV ? ' (F1: hard band)' : csvSha === MAIN_PRE_F1_CSV ? ' (pre-F1: known values, needs #17)' : ' (UNKNOWN)'}`, () => {
    ac7BandCheck(csvSha, { m1: l30('m1'), m2: l30('m2') });
  }, 300_000);
  it('meta: unknown sha (appended newline, 168b74da) and a thrown error both fail', () => {
    const ok = { m1: Array(100).fill(20), m2: Array(100).fill(21) };
    expect(() => ac7BandCheck('168b74da', ok)).toThrow('unknown economy CSV 168b74da: update AC7 band test');
    expect(() => ac7BandCheck(F1_CSV, ok)).not.toThrow();
    expect(() => ac7BandCheck(F1_CSV, { ...ok, m1: Array(100).fill(17) })).toThrow();           // F1 band violated
    expect(() => ac7BandCheck(MAIN_PRE_F1_CSV, ok)).toThrow();                                   // pre-F1 values drifted
    expect(() => ac7BandCheck(F1_CSV, { m1: undefined as unknown as number[], m2: ok.m2 })).toThrow(); // crash inside -> throws, not masked
    // and the sha itself: data/economy.csv + '\n' hashes to 168b74da on main
    if (csvSha === MAIN_PRE_F1_CSV) expect(createHash('sha256').update(Buffer.concat([readFileSync(new URL('../data/economy.csv', import.meta.url)), Buffer.from('\n')])).digest('hex').slice(0, 8)).toBe('168b74da');
  });
});
