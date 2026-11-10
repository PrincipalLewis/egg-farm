// G5-P per pause-spec §10 (SCRATCH): T3 splice, seeds S0.., snapshots at F10/F18/F24 from the never-pause full-stack run,
// then W s of managed play (no buys) from the same snapshot + same seed per pattern; managed income = coins delta net of wages/refills.
// Usage: SEEDS=100 S0=0 W=1800 PROFS=optimal SWEEP=A vite-node m5g5p.ts
import { readFileSync } from 'node:fs';
import { run, PROFS, Stack } from './m5';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from './scripts/sync-economy';
import { validateBalance, type Balance } from './src/config/balance';
const b = validateBalance(buildBalance(parseEconomyCsv(readFileSync(process.env.CSV ?? '../t3-splice.csv', 'utf8')), JSON.parse(readFileSync('./src/config/balance.json', 'utf8')), readEconomyConfig() as any) as Balance, false);
const S: Stack = { on: true, streakCap: 0.28, tapShare: 0.03, broody: true, golden: process.env.NOGOLD ? null : { gapMin: 120, gapMax: 300 }, abil: true, sweep: (process.env.SWEEP ?? 'A') as any, sweepMult: 1.15, pause: false, pat: 'none', lockoutS: +(process.env.LOCK ?? 30) };
const NS = +(process.env.SEEDS ?? 100), S0 = +(process.env.S0 ?? 0), W = +(process.env.W ?? 1800), CK = [10, 18, 24];
const PATS = (process.env.PATS ?? 'long,stock,bench,grader,yawn,fullcoop,wages').split(',') as any[];
const out: any = {};
for (const pf of (process.env.PROFS ?? 'optimal').split(',')) {
  const P = PROFS[pf]; const d: Record<string, number[]> = {};
  for (let i = 0; i < NS; i++) { const seed = S0 + i; const r = run(b, seed, P, S, 12000, { snapAt: CK });
    for (const F of CK) { const st = r.snaps.get(F); if (!st) continue;
      const inc = (pat: string) => { const x = run(b, seed * 13 + F, P, { ...S, pat }, W, { start: st, noBuy: true }); return x.final.coinsCents - st.coinsCents; };
      const z = inc('none'); for (const pat of PATS) { const k = pat + '|F' + F; const v = z > 0 ? inc(pat) / z - 1 : NaN; (d[k] ??= []).push(v); if (v > 0.02) console.error('EXCEED', pf, pat, 'seed', seed, 'F' + F, (100 * v).toFixed(2)); } } }
  for (const pat of PATS) { const all: number[] = []; const o: any = {};
    for (const F of CK) { const v = (d[pat + '|F' + F] ?? []).filter(Number.isFinite); all.push(...v); o['F' + F] = [+(100 * v.reduce((a, x) => a + x, 0) / v.length).toFixed(2), +(100 * Math.max(...v)).toFixed(2), v.length]; }
    o.all = [+(100 * all.reduce((a, x) => a + x, 0) / all.length).toFixed(2), +(100 * Math.max(...all)).toFixed(2)];
    o.pass = CK.every(F => o['F' + F][0] <= 1 && o['F' + F][1] <= 2); if (pat === 'grader') o.pass = CK.every(F => o['F' + F][1] <= 0);
    out[pf + '|' + pat] = o; console.error(pf, pat, JSON.stringify(o)); }
}
console.log(JSON.stringify({ W, sweep: S.sweep, lockoutS: S.lockoutS, ...out }));
