import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PROFS, Stack, run as runTR } from './m5trace-order';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from '/workspace/egg-farm-studio/scratch/post-l10/baseline/h/scripts/sync-economy';
import { validateBalance, type Balance } from '/workspace/egg-farm-studio/scratch/post-l10/baseline/h/src/config/balance';
const csv = process.env.CSV!, raw = readFileSync(csv);
const b = validateBalance(buildBalance(parseEconomyCsv(raw.toString('utf8')), JSON.parse(readFileSync('./src/config/balance.json', 'utf8')), readEconomyConfig() as any) as Balance, false);
const S: Stack = { on: true, streakCap: 0.28, tapShare: 0.03, broody: true, golden: { gapMin: 120, gapMax: 300 }, abil: true, sweep: 'A', sweepMult: 1.15, pause: false, warm: true, ssZero: true };
const K: Stack = { ...S, on: false };
const seed = 130, c = runTR(b, seed, PROFS.optimal, K, 4000);
const out = {
  runner: 'run-order-probe.ts', sha256: createHash('sha256').update(raw).digest('hex'), seed,
  mrLongest: c.mrLongest, mrByF: Object.fromEntries(c.mrByF),
  // only check-in-related or farmAff flips
  orderLog: (c as any).orderLog.filter((e: any) => e.phase !== 'mr_sample' || e.willReachCheckIn || (e.t>=2400 && e.t<=2515)),
  farmBuys: (c as any).buyLog.filter((b: any) => b.kind==='f' && b.t>=2260 && b.t<=2520),
};
console.log(JSON.stringify(out));
