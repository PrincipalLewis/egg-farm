// SCRATCH post-L10 baseline runner (Econ 2026-10-30). Runs the pinned m5.ts run() AND the instrumented copy m5pl.ts (adds only
// per-Farm-level longest nothing-affordable gap, keyed by the Farm level at which the gap starts) on the same seeds, asserts
// reach map + longestNoAff identical per seed (parity), and dumps per-seed raw. Flags-off reference = CFG none (same Stack as m5x.ts).
// Usage: CSV=<csv> SEEDS=200 S0=1 T=4000 PROFS=optimal,seller15,casual vite-node pl.ts > raw.json
import { readFileSync } from 'node:fs'; import { createHash } from 'node:crypto';
import { run, PROFS, Stack } from './m5';
import { run as runPL } from './m5pl';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from './scripts/sync-economy';
import { validateBalance, type Balance } from './src/config/balance';
const csv = process.env.CSV!, raw = readFileSync(csv);
const b = validateBalance(buildBalance(parseEconomyCsv(raw.toString('utf8')), JSON.parse(readFileSync('./src/config/balance.json', 'utf8')), readEconomyConfig() as any) as Balance, false);
const S: Stack = { on: true, streakCap: 0.28, tapShare: 0.03, broody: true, golden: { gapMin: 120, gapMax: 300 }, abil: true, sweep: 'A', sweepMult: 1.15, pause: false, warm: true, ssZero: true };
const K: Stack = { ...S, on: false };
const NS = +(process.env.SEEDS ?? 200), S0 = +(process.env.S0 ?? 1), T = +(process.env.T ?? 4000);
const out: any = { runner: 'pl.ts (SCRATCH)', csv, sha256: createHash('sha256').update(raw).digest('hex'), seeds: [S0, S0 + NS - 1], T, cfg: 'none', maxLevel: b.maxLevel, prof: {} };
for (const pf of (process.env.PROFS ?? 'optimal,seller15,casual').split(',')) {
  const P = PROFS[pf], rows: any[] = []; let mism = 0;
  for (let i = 0; i < NS; i++) { const seed = S0 + i, a = run(b, seed, P, K, T), c = runPL(b, seed, P, K, T);
    const ra = JSON.stringify([...a.reach]), rc = JSON.stringify([...c.reach]);
    if (ra !== rc || a.longestNoAff !== c.longestNoAff) mism++;
    const g = Math.max(0, ...[...c.noAffByF.values()]);
    if (Math.abs(g - c.longestNoAff) > 1e-9 && c.longestNoAff > 0) mism++;
    rows.push({ seed, reach: Object.fromEntries(c.reach), noAffByF: Object.fromEntries(c.noAffByF), longestNoAff: c.longestNoAff, spanBuy: c.spanBuy, spanFarm: c.spanFarm }); }
  out.prof[pf] = { parityMismatches: mism, rows }; console.error(JSON.stringify({ prof: pf, parityMismatches: mism }));
}
console.log(JSON.stringify(out));
