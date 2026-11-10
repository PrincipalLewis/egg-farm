// Usage: SEEDS=100 S0=0 T=12000 CFG=<none|A|B|B110|Apause|As20> PROFS=optimal,seller15,casual vite-node m5main.ts  (CSV env, default ../t3-splice.csv)
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { run, PROFS, Stack } from './m5';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from './scripts/sync-economy';
import { validateBalance, type Balance } from './src/config/balance';
import { loadTargets, maxStepRatio, quantile } from './tests/pacing-guards';
const csv = process.env.CSV ?? '../t3-splice.csv', txt = readFileSync(csv, 'utf8');
const b = validateBalance(buildBalance(parseEconomyCsv(txt), JSON.parse(readFileSync('./src/config/balance.json', 'utf8')), readEconomyConfig() as any) as Balance, false);
const tg = loadTargets(); const sha = createHash('sha256').update(txt).digest('hex');
const q = (a: number[], p: number) => { const x = a.filter(Number.isFinite); return x.length ? quantile(x, p) : NaN; };
const mx = (a: number[]) => Math.max(...a.filter(Number.isFinite));
const S: Stack = { on: true, streakCap: 0.28, tapShare: 0.03, broody: true, golden: { gapMin: 120, gapMax: 300 }, abil: true, sweep: 'A', sweepMult: 1.15, pause: false };
const CF: Record<string, Stack> = { none: { ...S, on: false }, A: S, B: { ...S, sweep: 'B' }, B110: { ...S, sweep: 'B', sweepMult: 1.10 }, Apause: { ...S, pause: true }, As20: { ...S, streakCap: 0.20 }, Bpause: { ...S, sweep: 'B', pause: true }, Ahold: { ...S, hold: true }, Bhold: { ...S, sweep: 'B', hold: true }, B110hold: { ...S, sweep: 'B', sweepMult: 1.10, hold: true }, Gonly: { ...S, streakCap: 0, tapShare: 0, broody: false, abil: false }, Noabil: { ...S, abil: false }, StreakOnly: { ...S, tapShare: 0, broody: false, abil: false, golden: null }, Awarm: { ...S, warm: true }, AssZ: { ...S, warm: true, ssZero: true }, AssZall: { ...S, ssZero: true } };
const NS = +(process.env.SEEDS ?? 100), S0 = +(process.env.S0 ?? 0), T = +(process.env.T ?? 12000), CK = [10, 18, 24];
console.error('csv', csv, sha, 'maxLevel', b.maxLevel);
const out: any = { csv, sha, seeds: [S0, S0 + NS - 1], T };
for (const ck of (process.env.CFG ?? 'A').split(',')) for (const pf of (process.env.PROFS ?? 'optimal,seller15,casual').split(',')) {
  const K = CF[ck], P = PROFS[pf], R: any[] = [], WS: Record<number, number[]> = { 10: [], 18: [], 24: [] }, wr: Record<number, number[]> = { 10: [], 18: [], 24: [] };
  for (let i = 0; i < NS; i++) {
    const seed = S0 + i, r = run(b, seed, P, K, T, { snapAt: CK }); R.push(r);
    for (const F of CK) { const st = r.snaps.get(F); if (!st) { wr[F].push(NaN); continue; }
      const a = run(b, seed * 7 + F, P, K, 600, { start: st, noBuy: true }); WS[F].push(a.ovl.stallS); const _z = 0, z = run(b, seed * 7 + F, PROFS.idle, CF.none, 600, { start: st, noBuy: true });
      const ca = a.final.coinsCents - st.coinsCents, cz = z.final.coinsCents - st.coinsCents; wr[F].push(cz > 0 ? ca / cz : NaN); }
  }
  const sr = (from: number) => R.map(r => maxStepRatio(r.reach as any, from, tg.step_ratio_min_prev_s) ?? NaN);
  const s30 = sr(30), s28 = sr(28);
  const top = R.map(r => { const tE = r.reach.get(b.maxLevel); if (tE == null) return NaN; let m = 0; for (let L = 1; L <= b.maxLevel; L++) m = Math.max(m, r.reach.get(L)! - r.reach.get(L - 1)!); return m / tE; });
  const lv = (L: number) => R.map(r => (r.reach.get(L) ?? Infinity) / 60);
  const bands = ['F10-19', 'F20-29', 'F30+'], keys = ['golden', 'frenzy', 'streak', 'tapcoins', 'broody', 'rush', 'sweepA', 'sweepB', 'shout', 'inspect'];
  const shareBy: any = {};
  for (const bd of bands) { const tot = R.map(r => { const m = keys.reduce((a, k) => a + (r.src[bd + ':' + k] ?? 0), 0); return { m, src: r.src }; });
    // base per band
    const baseB = R.map(r => { let x = 0; for (const [F, v] of r.baseF) if ((bd === 'F10-19' && F >= 10 && F < 20) || (bd === 'F20-29' && F >= 20 && F < 30) || (bd === 'F30+' && F >= 30)) x += v; return x; });
    shareBy[bd] = { all: +q(tot.map((x, i) => x.m / (x.m + baseB[i])), .5).toFixed(3) };
    for (const k of keys) { const v = q(R.map((r, i) => (r.src[bd + ':' + k] ?? 0) / baseB[i]), .5); if (v > 0) shareBy[bd][k] = +(100 * v).toFixed(2); } }
  const pk = (f: (o: any) => number) => [+q(R.map(r => f(r.ovl)), .5).toFixed(2), +mx(R.map(r => f(r.ovl))).toFixed(2)];
  const stallW: Record<number, number[]> = { 10: [], 18: [], 24: [] }; // filled below from window runs
  const o = { stall: { runS: [+q(R.map(r => r.ovl.stallS), .5).toFixed(1), +mx(R.map(r => r.ovl.stallS)).toFixed(1)], by: Object.fromEntries(['F10-17', 'F18-23', 'F24+'].map(k => [k, [+q(R.map(r => r.ovl.stallBy[k] ?? 0), .5).toFixed(1), +q(R.map(r => r.ovl.stallBy[k] ?? 0), .95).toFixed(1), +mx(R.map(r => r.ovl.stallBy[k] ?? 0)).toFixed(1)]])), win600: Object.fromEntries(CK.map(F => [F, [+q(WS[F], .5).toFixed(1), +q(WS[F], .95).toFixed(1), +mx(WS[F]).toFixed(1)]])) }, peak: { M: pk(o => o.peakM), F18: pk(o => o.peakF18), withGraderPassive: pk(o => o.peakTot), bothPct: pk(o => 100 * o.tBoth / T) }, cfg: ck, prof: pf,
    G1_stepP95_L30: +q(s30, .95).toFixed(3), G2_stepWorst_L30: +mx(s30).toFixed(3), stepFromF28: [+q(s28, .95).toFixed(3), +mx(s28).toFixed(3)],
    G3_topStepShare: [+q(top, .5).toFixed(3), +mx(top).toFixed(3)], G4_noAff_F10plus: [q(R.map(r => r.longestNoAff), .95), mx(R.map(r => r.longestNoAff))], G4_noAff_F30plus: [q(R.map(r => r.longestNoAff30), .95), mx(R.map(r => r.longestNoAff30))],
    G5_L10: [+q(lv(10), .5).toFixed(2), +q(lv(10), .95).toFixed(2)], L11: +q(lv(11), .5).toFixed(2), L12: +q(lv(12), .5).toFixed(2), L18: +q(lv(18), .5).toFixed(1), L30: +q(lv(30), .5).toFixed(1), L50: [+q(lv(50), .5).toFixed(1), +q(lv(50), .95).toFixed(1)], reachedMax: R.filter(r => r.reach.has(b.maxLevel)).length,
    win10: Object.fromEntries(CK.map(F => [F, [+q(wr[F], .5).toFixed(2), +q(wr[F], .95).toFixed(2), +mx(wr[F]).toFixed(2)]])), shareBy,
    reachL0_9: R.map(r => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(L => r.reach.get(L))).map(x => x.join(',')) };
  out[`${ck}|${pf}`] = o; const { reachL0_9, ...rest } = o; console.error(JSON.stringify(rest));
}
console.log(JSON.stringify(out));
