// Harness-definition window gate (SCRATCH): EVERY 10-min window, starts every STEP s (default 300) from F10 until max level,
// seeds S0..S0+NS-1 (default 1-200). Window = 600 s from the active run's live state, no buys; active stack vs idle bot (no mechanics) from the same state, same seed.
// Also: step ratio from L30 (maxStepRatio) vs the no-mechanics run on the same CSV and seeds, and the active premium (mech/passive) by band.
// Usage: CSV=../t3-draft.csv SEEDS=200 S0=1 CFG=AssZ PROFS=optimal vite-node m5x.ts
import { readFileSync } from 'node:fs'; import { createHash } from 'node:crypto';
import { run, PROFS, Stack } from './m5';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from './scripts/sync-economy';
import { validateBalance, type Balance } from './src/config/balance';
import { loadTargets, maxStepRatio, quantile } from './tests/pacing-guards';
const csv = process.env.CSV ?? '../t3-draft.csv', raw = readFileSync(csv);
const b = validateBalance(buildBalance(parseEconomyCsv(raw.toString('utf8')), JSON.parse(readFileSync('./src/config/balance.json', 'utf8')), readEconomyConfig() as any) as Balance, false);
const tg = loadTargets();
const S: Stack = { on: true, streakCap: 0.28, tapShare: 0.03, broody: true, golden: { gapMin: 120, gapMax: 300 }, abil: true, sweep: 'A', sweepMult: 1.15, pause: false, warm: true, ssZero: true };
const CF: Record<string, Stack> = { none: { ...S, on: false }, AssZ: S, AssZhold: { ...S, hold: true } };
const SF = +(process.env.STEP_FROM ?? 30), NOWIN = process.env.NOWIN === '1';
const NS = +(process.env.SEEDS ?? 200), S0 = +(process.env.S0 ?? 1), T = +(process.env.T ?? 12000), STEP = +(process.env.STEP ?? 300);
const q = (a: number[], p: number) => { const x = a.filter(Number.isFinite); return x.length ? quantile(x, p) : NaN; }, mx = (a: number[]) => Math.max(...a.filter(Number.isFinite));
const out: any = { csv, sha: createHash('sha256').update(raw).digest('hex'), seeds: [S0, S0 + NS - 1], T, STEP };
for (const ck of (process.env.CFG ?? 'AssZ').split(',')) for (const pf of (process.env.PROFS ?? 'optimal,seller15,casual').split(',')) {
  const K = CF[ck], P = PROFS[pf]; const seedMax: number[] = [], all: number[] = [], byBand: Record<string, number[]> = { 'F10-17': [], 'F18-23': [], 'F24-29': [], 'F30+': [] }, step: number[] = [], noAff: number[] = [], reachMax: number[] = [], prem: Record<string, number[]> = { 'F10-19': [], 'F20-29': [], 'F30+': [] };
  for (let i = 0; i < NS; i++) { const seed = S0 + i, r = run(b, seed, P, K, T, { snapEveryS: K.on ? STEP : undefined });
    step.push(maxStepRatio(r.reach as any, SF, tg.step_ratio_min_prev_s) ?? NaN); noAff.push(r.longestNoAff); reachMax.push(r.reach.has(b.maxLevel) ? 1 : 0);
    let m = 0; if (K.on && !NOWIN) for (const [t, F, st] of r.tsnaps) { const a = run(b, seed * 7919 + Math.round(t), P, K, 600, { start: st, noBuy: true }), z = run(b, seed * 7919 + Math.round(t), PROFS.idle, CF.none, 600, { start: st, noBuy: true });
      const ca = a.final.coinsCents - st.coinsCents, cz = z.final.coinsCents - st.coinsCents; if (!(cz > 0)) continue; const x = ca / cz; all.push(x); m = Math.max(m, x);
      byBand[F < 18 ? 'F10-17' : F < 24 ? 'F18-23' : F < 30 ? 'F24-29' : 'F30+'].push(x); }
    seedMax.push(m);
    if (K.on) for (const bd of Object.keys(prem)) { const keys = Object.keys(r.src).filter(k => k.startsWith(bd + ':')); const mech = keys.reduce((a, k) => a + r.src[k], 0); let base = 0; for (const [F, v] of r.baseF) if ((bd === 'F10-19' && F >= 10 && F < 20) || (bd === 'F20-29' && F >= 20 && F < 30) || (bd === 'F30+' && F >= 30)) base += v; if (base > 0) prem[bd].push(mech / base); }
  }
  const o: any = { cfg: ck, prof: pf, maxLevel: b.maxLevel, reachedMax: reachMax.reduce((a, x) => a + x, 0), G4_noAff_F10_to_max: [+q(noAff, .5).toFixed(1), +q(noAff, .95).toFixed(1), +mx(noAff).toFixed(1)], windows: all.length, stepFrom: SF, stepL30: [+q(step, .95).toFixed(3), +mx(step).toFixed(3)] };
  if (K.on) { o.win = { P95_allWindows: +q(all, .95).toFixed(3), P95_ofSeedMax: +q(seedMax, .95).toFixed(3), worstSeed: +mx(seedMax).toFixed(3), median: +q(all, .5).toFixed(3) };
    o.byBand = Object.fromEntries(Object.entries(byBand).map(([k, v]) => [k, [+q(v, .5).toFixed(2), +q(v, .95).toFixed(2), v.length ? +mx(v).toFixed(2) : null]]));
    o.premium = Object.fromEntries(Object.entries(prem).map(([k, v]) => [k, [+(100 * q(v, .5)).toFixed(1), +(100 * q(v, .95)).toFixed(1)]])); }
  out[ck + '|' + pf] = o; console.error(JSON.stringify(o));
}
console.log(JSON.stringify(out));
