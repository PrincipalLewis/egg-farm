// Golden egg v0.5 re-sim on the T3 lineage (SCRATCH, Economy). CSV = scratch/v2-econ/t3-splice.csv (product/economy.csv L0-30 + N0b_C150 L31-55).
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { run, Opts } from './econ-v2';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from './scripts/sync-economy';
import { validateBalance, type Balance } from './src/config/balance';
import { loadTargets, maxStepRatio, quantile } from './tests/pacing-guards';
const csv = process.env.CSV ?? '../t3-splice.csv', txt = readFileSync(csv, 'utf8');
const b = validateBalance(buildBalance(parseEconomyCsv(txt), JSON.parse(readFileSync('./src/config/balance.json', 'utf8')), readEconomyConfig() as any) as Balance, false);
const tg = loadTargets();
console.error('csv', csv, createHash('sha256').update(txt).digest('hex'), 'maxLevel', b.maxLevel, 'step from', tg.step_ratio_from_level, 'minPrev', tg.step_ratio_min_prev_s);
const q = (a: number[], p: number) => { const x = a.filter(Number.isFinite); return x.length ? quantile(x, p) : NaN; };
const G = { spec: true, firstS: 45, unlockF: 8, gapMin: 120, gapMax: 300, wCash: 0.45, wFrenzy: 0.35, wEggs: 0.2, cashS: 45, frenzyMult: 2, frenzyS: 30, eggsS: 60, eggsAsCashFromF: 20 };
const CF: Record<string, Opts['mech']> = { none: { kind: 'none' }, spec: { kind: 'B', golden: G }, freq: { kind: 'B', golden: { ...G, gapMin: 60, gapMax: 150 } },
  freqCap: { kind: 'B', golden: { ...G, gapMin: 60, gapMax: 150, cashS: 30, eggsS: 40 } } };
const NS = +(process.env.SEEDS ?? 100), T = +(process.env.T ?? 14400), out: any = {};
for (const mk of (process.env.CFG ?? 'none,spec,freq').split(',')) for (const tp of (process.env.TAPS ?? 'idle,ac7,3').split(',').map(x => isNaN(+x) ? x as any : +x)) {
  const rs = Array.from({ length: NS }, (_, i) => run(i + 1, { tap: tp, T, mech: CF[mk] }, b));
  const at = (L: number) => rs.map(r => (r.reach.get(L) ?? Infinity) / 60);
  const sr = (from: number) => rs.map(r => maxStepRatio(r.reach as any, from, tg.step_ratio_min_prev_s) ?? NaN);
  const sh = rs.map(r => (r.mechCents) / (r.mechCents + r.baseCents));
  const top = rs.map(r => { const t50 = r.reach.get(b.maxLevel); if (t50 == null) return NaN; let m = 0; for (let L = 1; L <= b.maxLevel; L++) m = Math.max(m, r.reach.get(L)! - r.reach.get(L - 1)!); return m / t50; });
  const o = { L10: q(at(10), .5), L18: q(at(18), .5), L25: q(at(25), .5), L30: [q(at(30), .5), q(at(30), .95)], L40: q(at(40), .5), L50: [q(at(50), .5), q(at(50), .95)], reachedMax: rs.filter(r => r.reach.has(b.maxLevel)).length,
    stepFrom: [q(sr(tg.step_ratio_from_level), .95), Math.max(...sr(tg.step_ratio_from_level).filter(Number.isFinite))], step28: [q(sr(28), .95), Math.max(...sr(28).filter(Number.isFinite))],
    topStepShare: [q(top, .5), Math.max(...top.filter(Number.isFinite))], noAff: [q(rs.map(r => r.longestNoAff), .5), Math.max(...rs.map(r => r.longestNoAff))],
    goldShareAll: [q(sh, .5), q(sh, .05), q(sh, .95)], eggs: q(rs.map(r => r.eggs), .5), caught: q(rs.map(r => r.caught), .5) };
  out[`${mk}|${tp}`] = o; console.error(`${mk}|${tp}`, JSON.stringify(o));
}
console.log(JSON.stringify(out));
