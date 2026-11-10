// w2_asleep_collect_share 0 (code today) vs 0.15 vs 0.20 (SCRATCH, Economy). product/economy.csv via the in-memory builder.
import { readFileSync } from 'node:fs';
import { run, Opts } from './econ-v2';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from './scripts/sync-economy';
import { validateBalance, type Balance } from './src/config/balance';
import { quantile } from './tests/pacing-guards';
const b = validateBalance(buildBalance(parseEconomyCsv(readFileSync('../../../product/economy.csv', 'utf8')), JSON.parse(readFileSync('./src/config/balance.json', 'utf8')), readEconomyConfig() as any) as Balance, false);
const q = (a: number[], p: number) => { const x = a.filter(Number.isFinite); return x.length ? quantile(x, p) : NaN; };
const NS = +(process.env.SEEDS ?? 100), T = 5400, out: any = {};
const P: Record<string, Partial<Opts>> = { idle_unmanaged: { tap: 'idle', manage: false, checkBase: 15 }, idle60_unmanaged: { tap: 'idle', manage: false, checkBase: 60 }, seller15_managed: { tap: 'ac7', manage: true }, seller15_unmanaged: { tap: 'ac7', manage: false } };
for (const pf of Object.keys(P)) for (const sh of [0, 0.15, 0.2]) {
  const rs = Array.from({ length: NS }, (_, i) => run(i + 1, { ...P[pf], T, mech: { kind: 'none' }, asleepShare: sh } as Opts, b));
  const at = (L: number) => +(q(rs.map(r => (r.reach.get(L) ?? Infinity) / 60), .5)).toFixed(2), at95 = (L: number) => +(q(rs.map(r => (r.reach.get(L) ?? Infinity) / 60), .95)).toFixed(2);
  const lvl30 = rs.map(r => Math.max(...[...r.reach].filter(([, t]) => t <= 1800).map(([k]) => k)));
  const o = { prof: pf, share: sh, L10: at(10), L18: at(18), L25: [at(25), at95(25)], L30: [at(30), at95(30)], lvlAt30min: [q(lvl30, .05), q(lvl30, .5), q(lvl30, .95)], asleepEggs: q(rs.map(r => r.asleepEggs), .5) };
  out[`${pf}|${sh}`] = o; console.error(JSON.stringify(o));
}
console.log(JSON.stringify(out));
