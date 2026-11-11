import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PROFS, Stack, run as runTR } from './m5trace-order';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from '/workspace/egg-farm-studio/scratch/post-l10/baseline/h/scripts/sync-economy';
import { validateBalance, type Balance } from '/workspace/egg-farm-studio/scratch/post-l10/baseline/h/src/config/balance';
const csv = process.env.CSV!, raw = readFileSync(csv);
const b = validateBalance(buildBalance(parseEconomyCsv(raw.toString('utf8')), JSON.parse(readFileSync('./src/config/balance.json', 'utf8')), readEconomyConfig() as any) as Balance, false);
const S: Stack = { on: true, streakCap: 0.28, tapShare: 0.03, broody: true, golden: { gapMin: 120, gapMax: 300 }, abil: true, sweep: 'A', sweepMult: 1.15, pause: false, warm: true, ssZero: true };
const K: Stack = { ...S, on: false };
const seed = +(process.env.SEED ?? 130);
const c = runTR(b, seed, PROFS.optimal, K, 4000);
const out = {
  runner: 'qa/m5/interp-mr-evidence/run-repro-baseline.ts',
  sha256: createHash('sha256').update(raw).digest('hex'), seed,
  mrLongest: c.mrLongest, mrByF: Object.fromEntries(c.mrByF),
  orderLog: (c as any).orderLog.filter((e: any) => e.phase !== 'mr_sample' || e.willReachCheckIn || (e.t>=2400 && e.t<=2515)),
  farmBuys: (c as any).buyLog.filter((b: any) => b.kind==='f' && b.t>=2260 && b.t<=2520),
  keySnapshots: (c as any).orderLog.filter((e: any) =>
    (e.phase==='mr_sample' && [2406,2407,2453,2454,2510].includes(e.t)) ||
    (e.phase==='after_sellAll' && (Math.abs(e.t-2406.5)<1e-9 || Math.abs(e.t-2453.6)<1e-9 || Math.abs(e.t-2510.7)<1e-9))
  ),
};
const dest = process.env.OUT || '/workspace/egg-farm-studio/qa/m5/interp-mr-evidence/order-probe-S01-seed130.repro.json';
writeFileSync(dest, JSON.stringify(out));
console.log(JSON.stringify({ ok: true, dest, mrLongest: out.mrLongest, keySnapshots: out.keySnapshots.length, farmBuys: out.farmBuys.length }));
