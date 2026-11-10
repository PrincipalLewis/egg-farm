// DIAGNOSTIC ONLY (not a screen, not evidence): per-Farm-level purchase/income trace using the unmodified harness m5.ts run()
// (snapEveryS=1). Usage (cwd = ../h): CSV=<csv> SEEDS=n S0=1 PROFS=casual node node_modules/.bin/vite-node ../tools/trace.ts > out.json
import { readFileSync } from 'node:fs';
import { run, PROFS, Stack } from '../h/m5';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from '../h/scripts/sync-economy';
import { validateBalance, type Balance } from '../h/src/config/balance';
const csv = process.env.CSV!, raw = readFileSync(csv, 'utf8');
const b = validateBalance(buildBalance(parseEconomyCsv(raw), JSON.parse(readFileSync('./src/config/balance.json', 'utf8')), readEconomyConfig() as any) as Balance, false);
const S: Stack = { on: true, streakCap: 0.28, tapShare: 0.03, broody: true, golden: { gapMin: 120, gapMax: 300 }, abil: true, sweep: 'A', sweepMult: 1.15, pause: false, warm: true, ssZero: true };
const K: Stack = { ...S, on: false };
const NS = +(process.env.SEEDS ?? 20), S0 = +(process.env.S0 ?? 1), T = 4000;
const out: any = { csv, prof: {} };
for (const pf of (process.env.PROFS ?? 'casual').split(',')) {
  const rows: any[] = [];
  for (let i = 0; i < NS; i++) {
    const seed = S0 + i, r = run(b, seed, PROFS[pf], K, T, { snapEveryS: 1 });
    const ev: any[] = []; let prev: any = null;
    for (const [t, F, s] of r.tsnaps) {
      if (prev) {
        const p = prev[2];
        for (let h = p.hensLevel; h < s.hensLevel; h++) ev.push([t, p.farmLevel, 'H', h]);
        for (let h = p.eggValueLevel; h < s.eggValueLevel; h++) ev.push([t, p.farmLevel, 'V', h]);
        for (let h = p.collectionLevel; h < s.collectionLevel; h++) ev.push([t, p.farmLevel, 'C', h]);
        for (let h = p.graderTier; h < s.graderTier; h++) ev.push([t, p.farmLevel, 'G', h]);
        for (const w of Object.keys(s.workers)) if (!p.workers[w]) ev.push([t, p.farmLevel, 'W:' + w, 0]);
      }
      prev = [t, F, s];
    }
    rows.push({ seed, reach: Object.fromEntries(r.reach), baseF: Object.fromEntries(r.baseF), ev });
  }
  out.prof[pf] = rows;
}
console.log(JSON.stringify(out));
