// Seller15 variance bot (product/sim/seller-variance-proposal.md, sha256 17877b41; HoQA F-1): TS vs Python parity.
// Expected values: tests/fixtures/seller_variance.json, produced by scripts/gen-seller-variance-fixtures.py running the
// Python reference product/sim/seller_variance_sim.py (run / run_m2, policy seller15, 100 seeds, 60 min) on this repo's
// data/economy.csv. Regenerate: SV_SIM_DIR=<product/sim> python3 scripts/gen-seller-variance-fixtures.py
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
    console.log(`${wk} variance t18 P5/P50/P95 TS ${[.05, .5, .95].map(p => q(tT, p).toFixed(2)).join('/')} PY ${[.05, .5, .95].map(p => q(tP, p).toFixed(2)).join('/')}; spread TS ${spread(tT).toFixed(1)}% PY ${spread(tP).toFixed(1)}%; L@30 P5/P95 ${q(ts.map(r => lvlAt(r, 1800)), .05)}/${q(ts.map(r => lvlAt(r, 1800)), .95)}`);
  }, 300_000);
});
