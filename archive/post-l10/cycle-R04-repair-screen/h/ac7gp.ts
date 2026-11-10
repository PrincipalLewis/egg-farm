// D-HOP-33 flag-off check (SCRATCH): stack OFF (K.on false = every M5.0 flag off), seller15 'ac7' bot, seeds 1-200, m5.ts vs m5gp.ts (gpause true).
// Reports L10 fastest/median/P95 and L30 median/P95 (min) plus a sha256 of the per-seed reach traces + final state.
import { readFileSync } from 'node:fs'; import { createHash } from 'node:crypto';
import * as A from './m5'; import * as G from './m5gp';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from './scripts/sync-economy';
import { validateBalance, type Balance } from './src/config/balance';
import { quantile } from './tests/pacing-guards';
const b = validateBalance(buildBalance(parseEconomyCsv(readFileSync(process.env.CSV ?? '../economy.m50-draft.csv', 'utf8')), JSON.parse(readFileSync('./src/config/balance.json', 'utf8')), readEconomyConfig() as any) as Balance, false);
const S: any = { on: false, streakCap: 0.28, tapShare: 0.03, broody: true, golden: { gapMin: 120, gapMax: 300 }, abil: true, sweep: 'A', sweepMult: 1.15, pause: false, lockoutS: 45 };
const out: any = {};
for (const [name, M, K] of [['m5', A, S], ['m5gp', G, { ...S, gpause: +(process.env.GP ?? 1) }]] as const) {
  const h = createHash('sha256'); const l10: number[] = [], l30: number[] = [];
  for (let seed = 1; seed <= 200; seed++) { const r = (M as any).run(b, seed, (M as any).PROFS.seller15, K, 4000);
    h.update(JSON.stringify([...r.reach]) + '|' + r.final.coinsCents + '|' + r.base + '|' + r.mech + ';'); l10.push(r.reach.get(10) / 60); l30.push(r.reach.get(30) / 60); }
  const f = (a: number[]) => [+Math.min(...a).toFixed(2), +quantile(a, .5).toFixed(2), +quantile(a, .95).toFixed(2)];
  out[name] = { L10_fast_med_p95_min: f(l10), L30_fast_med_p95_min: f(l30), traceSha: h.digest('hex') }; console.error(name, JSON.stringify(out[name]));
}
out.identical = out.m5.traceSha === out.m5gp.traceSha; console.log(JSON.stringify(out));
