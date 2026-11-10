// G5-P pause patterns + ability x frenzy overlap (SCRATCH). Same runner/CSV as m5main.ts. Usage: SEEDS=100 S0=0 T=12000 PROFS=optimal,seller15,casual vite-node m5pause.ts
import { readFileSync } from 'node:fs';
import { run, PROFS, Stack } from './m5';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from './scripts/sync-economy';
import { validateBalance, type Balance } from './src/config/balance';
import { quantile } from './tests/pacing-guards';
const txt = readFileSync(process.env.CSV ?? '../t3-splice.csv', 'utf8');
const b = validateBalance(buildBalance(parseEconomyCsv(txt), JSON.parse(readFileSync('./src/config/balance.json', 'utf8')), readEconomyConfig() as any) as Balance, false);
const q = (a: number[], p: number) => { const x = a.filter(Number.isFinite); return x.length ? quantile(x, p) : NaN; };
const SW = (process.env.SWEEP ?? 'A') as 'A' | 'B';
const S: Stack = { on: true, streakCap: 0.28, tapShare: 0.03, broody: true, golden: { gapMin: 120, gapMax: 300 }, abil: true, sweep: SW, sweepMult: 1.15, pause: false, pat: 'none' };
const NS = +(process.env.SEEDS ?? 100), S0 = +(process.env.S0 ?? 0), T = +(process.env.T ?? 12000), out: any = {};
for (const pf of (process.env.PROFS ?? 'optimal,seller15,casual').split(',')) {
  const P = PROFS[pf]; const base = Array.from({ length: NS }, (_, i) => run(b, S0 + i, P, S, T));
  const ov = base.map(r => r.ovl);
  out[pf + '|overlap'] = { abilUptimePct: +(100 * q(ov.map(o => o.tAbil / Math.max(1, T)), .5)).toFixed(1), frenzyUptimePct: +(100 * q(ov.map(o => o.tFr / T), .5)).toFixed(2),
    bothUptimePct: +(100 * q(ov.map(o => o.tBoth / T), .5)).toFixed(2), bothPerHourMin: +(q(ov.map(o => o.tBoth / T * 60), .5)).toFixed(2), crossTermPctOfMech: +(100 * q(ov.map(o => o.xBoth / Math.max(1, o.xAll)), .5)).toFixed(2), crossTermPctOfMechWorst: +(100 * Math.max(...ov.map(o => o.xBoth / Math.max(1, o.xAll)))).toFixed(2) };
  console.error(pf, 'overlap', JSON.stringify(out[pf + '|overlap']));
  for (const pat of ['yawn', 'long', 'fullcoop', 'wages'] as const) {
    const rs = Array.from({ length: NS }, (_, i) => run(b, S0 + i, P, { ...S, pat }, T));
    const g = (L: number) => rs.map((r, i) => { const a = base[i].reach.get(L), c = r.reach.get(L); return a != null && c != null ? a / c - 1 : NaN; }); // + = pausing is faster
    const inc = rs.map((r, i) => (r.base + r.mech) / (base[i].base + base[i].mech) - 1);
    const o: any = { pat };
    for (const L of [20, 30, 40, 50]) { const x = g(L); o['L' + L] = [+(100 * x.reduce((a, v) => a + (Number.isFinite(v) ? v : 0), 0) / x.filter(Number.isFinite).length).toFixed(2), +(100 * Math.max(...x.filter(Number.isFinite))).toFixed(2)]; }
    o.coinsMeanWorst = [+(100 * inc.reduce((a, v) => a + v, 0) / inc.length).toFixed(2), +(100 * Math.max(...inc)).toFixed(2)];
    const ks = ['L30', 'L40', 'L50', 'coinsMeanWorst'].map(k => o[k]).filter(v => Number.isFinite(v[0])); o.pass = ks.every(v => v[0] <= 1 && v[1] <= 2);
    out[pf + '|' + pat] = o; console.error(pf, JSON.stringify(o));
  }
}
console.log(JSON.stringify(out));
