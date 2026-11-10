import { readFileSync } from 'node:fs';
import { run, PROFS, Stack } from './m5';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from './scripts/sync-economy';
import { validateBalance, type Balance } from './src/config/balance';
const b = validateBalance(buildBalance(parseEconomyCsv(readFileSync('../t3-splice.csv', 'utf8')), JSON.parse(readFileSync('./src/config/balance.json', 'utf8')), readEconomyConfig() as any) as Balance, false);
const A: Stack = { on: true, streakCap: 0.28, tapShare: 0.03, broody: true, golden: { gapMin: 120, gapMax: 300 }, abil: true, sweep: 'A', sweepMult: 1.15, pause: false };
const N: Stack = { ...A, on: false };
const pf = process.env.P ?? 'seller15'; const hist: Record<string, Record<number, number>> = { none: {}, A: {} };
const lt: Record<string, number[][]> = { none: [], A: [] };
for (let sd = 0; sd < 30; sd++) for (const [k, K] of [['none', N], ['A', A]] as const) {
  const r = run(b, sd, PROFS[pf], K, 12000); const t: number[] = [];
  for (let L = 30; L <= 50; L++) { const c = r.reach.get(L)! - r.reach.get(L - 1)!; t.push(c); }
  lt[k].push(t); let mx = 0, at = 0; for (let i = 1; i < t.length; i++) if (t[i - 1] >= 30 && t[i] / t[i - 1] > mx) { mx = t[i] / t[i - 1]; at = 30 + i; }
  hist[k][at] = (hist[k][at] ?? 0) + 1;
}
console.log(JSON.stringify(hist));
for (const k of ['none', 'A']) console.log(k, Array.from({ length: 21 }, (_, i) => (lt[k].map(x => x[i]).sort((a, b) => a - b)[15]).toFixed(0)).join(' '));
