import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PROFS, Stack, run as runTR } from './m5trace-measure';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from '/workspace/egg-farm-studio/scratch/post-l10/baseline/h/scripts/sync-economy';
import { validateBalance, type Balance } from '/workspace/egg-farm-studio/scratch/post-l10/baseline/h/src/config/balance';
const csv = process.env.CSV!, raw = readFileSync(csv);
const b = validateBalance(buildBalance(parseEconomyCsv(raw.toString('utf8')), JSON.parse(readFileSync('./src/config/balance.json', 'utf8')), readEconomyConfig() as any) as Balance, false);
const S: Stack = { on: true, streakCap: 0.28, tapShare: 0.03, broody: true, golden: { gapMin: 120, gapMax: 300 }, abil: true, sweep: 'A', sweepMult: 1.15, pause: false, warm: true, ssZero: true };
const K: Stack = { ...S, on: false };
const seed0 = +(process.env.S0 ?? 130), nSeeds = +(process.env.SEEDS ?? 1), T = +(process.env.T ?? 4000);
const pf = process.env.PROF || 'optimal';
const rows: any[] = [];
for (let i = 0; i < nSeeds; i++) {
  const seed = seed0 + i;
  const c = runTR(b, seed, PROFS[pf], K, T) as any;
  rows.push({
    seed,
    mrLongest: c.mrLongest, mrByF: Object.fromEntries(c.mrByF),
    mrALongest: c.mrALongest, mrAByF: Object.fromEntries(c.mrAByF),
    mrBLongest: c.mrBLongest, mrBByF: Object.fromEntries(c.mrBByF),
  });
}
const worst = (key: string) => rows.reduce((m, r) => Math.max(m, r[key]), 0);
const out = {
  runner: 'qa/m5/interp-mr-evidence/run-measure.ts',
  sha256: createHash('sha256').update(raw).digest('hex'),
  csv, seeds: [seed0, seed0 + nSeeds - 1], T, prof: pf,
  rows,
  summary: {
    n: rows.length,
    worst_current: worst('mrLongest'),
    worst_a: worst('mrALongest'),
    worst_b: worst('mrBLongest'),
    n_over_180_current: rows.filter(r => r.mrLongest > 180).length,
    n_over_180_a: rows.filter(r => r.mrALongest > 180).length,
    n_over_180_b: rows.filter(r => r.mrBLongest > 180).length,
  },
};
const dest = process.env.OUT!;
writeFileSync(dest, JSON.stringify(out));
console.log(JSON.stringify({ ok: true, dest, summary: out.summary, seed0: rows[0] }));
