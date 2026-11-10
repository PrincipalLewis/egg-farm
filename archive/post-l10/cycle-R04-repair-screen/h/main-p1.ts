// PM Collection package P1 vs current approved ALL stack (SCRATCH, Economy). T3 splice CSV (L30+ step gate) unless CSV set.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { run, Opts } from './econ-v2';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from './scripts/sync-economy';
import { validateBalance, type Balance } from './src/config/balance';
import { loadTargets, maxStepRatio, quantile } from './tests/pacing-guards';
const csv = process.env.CSV ?? '../t3-splice.csv', txt = readFileSync(csv, 'utf8');
const b = validateBalance(buildBalance(parseEconomyCsv(txt), JSON.parse(readFileSync('./src/config/balance.json', 'utf8')), readEconomyConfig() as any) as Balance, false);
const tg = loadTargets(); console.error('csv', csv, createHash('sha256').update(txt).digest('hex').slice(0, 12), 'maxLevel', b.maxLevel);
const q = (a: number[], p: number) => { const x = a.filter(Number.isFinite); return x.length ? quantile(x, p) : NaN; };
const G = { spec: true, firstS: 45, unlockF: 8, gapMin: 120, gapMax: 300, wCash: 0.45, wFrenzy: 0.35, wEggs: 0.2, cashS: 45, frenzyMult: 2, frenzyS: 30, eggsS: 60, eggsAsCashFromF: 20 };
const ST = (cap: number) => ({ unlockF: 8, perTap: 0.01, cap, hold: 3, decay: 0.03, maxTps: 1 });
const AB = { unlockF: 10, mult: 1.15 ** 3, s: 30, cd: 300 };
const CF: Record<string, Opts['mech']> = {
  none: { kind: 'none' },
  ALL040: { kind: 'B', golden: G, streak: ST(0.40), abil: AB },
  P1: { kind: 'B', golden: G, streak: ST(0.28), abil: AB, tapCash: { share: 0.03, capTps: 1, unlockF: 8 }, broody: { unlockF: 8, share: 0.05, fullS: 150 }, goldenStreakBoost: { minStreak: 0.2, speed: 1.25 } },
  P1noC1: { kind: 'B', golden: G, streak: ST(0.28), abil: AB, tapCash: { share: 0.03, capTps: 1, unlockF: 8 }, broody: { unlockF: 8, share: 0.05, fullS: 150 } },
};
const PROF: Record<string, Partial<Opts>> = { idle: { tap: 'idle', checkBase: 15, catchP: 0 }, optimal: { tap: 3, checkBase: 5, catchP: 1 }, seller15: { tap: 'ac7', checkBase: 15, catchP: 0.75 }, casual: { tap: 0.5, checkBase: 30, catchP: 0.6 } };
const NS = +(process.env.SEEDS ?? 100), S0 = +(process.env.S0 ?? 0), T = +(process.env.T ?? 14400), out: any = {};
const idleRuns = Array.from({ length: NS }, (_, i) => run(S0 + i, { ...PROF.idle, T, mech: CF.none } as Opts, b));
const tl = (r: any, F: number) => (r.reach.get(F + 1) ?? NaN) - (r.reach.get(F) ?? NaN);
for (const mk of (process.env.CFG ?? 'none,ALL040,P1').split(',')) for (const pf of (process.env.PROFS ?? 'optimal,seller15,casual').split(',')) {
  const rs = Array.from({ length: NS }, (_, i) => run(S0 + i, { ...PROF[pf], T, mech: CF[mk] } as Opts, b));
  const o: any = { cfg: mk, prof: pf };
  for (const F of [10, 18, 24]) {
    const sh = rs.map(r => { const x = r.lvl.get(F); return x ? x.mech / (x.mech + x.base) : NaN; });
    const ratio = rs.map((r, i) => { const x = r.lvl.get(F), y = idleRuns[i].lvl.get(F); return x && y ? ((x.mech + x.base) / tl(r, F)) / (y.base / tl(idleRuns[i], F)) : NaN; });
    const dt = rs.map((r, i) => tl(r, F) / tl(idleRuns[i], F) - 1);
    o['F' + F] = { share: +q(sh, .5).toFixed(3), ratioMed: +q(ratio, .5).toFixed(2), ratioP95: +q(ratio, .95).toFixed(2), ratioWorst: +Math.max(...ratio.filter(Number.isFinite)).toFixed(2), dTimeVsIdle: +q(dt, .5).toFixed(3) };
  }
  const sr = (from: number) => rs.map(r => maxStepRatio(r.reach as any, from, tg.step_ratio_min_prev_s) ?? NaN);
  const s30 = sr(30), s10 = sr(10);
  o.step30 = [+q(s30, .95).toFixed(2), +Math.max(...s30.filter(Number.isFinite)).toFixed(2)]; o.step10 = [+q(s10, .95).toFixed(2), +Math.max(...s10.filter(Number.isFinite)).toFixed(2)];
  o.L = Object.fromEntries([10, 18, 25, 30, 40, 50].map(L => [L, +(q(rs.map(r => (r.reach.get(L) ?? Infinity) / 60), .5)).toFixed(1)]));
  o.reachedMax = rs.filter(r => r.reach.has(b.maxLevel)).length; o.noAffMax = Math.max(...rs.map(r => r.longestNoAff)); o.noAffMed = q(rs.map(r => r.longestNoAff), .5);
  out[`${mk}|${pf}`] = o; console.error(JSON.stringify(o));
}
out.idleL = Object.fromEntries([10, 18, 25, 30, 40, 50].map(L => [L, +(q(idleRuns.map(r => (r.reach.get(L) ?? Infinity) / 60), .5)).toFixed(1)]));
console.log(JSON.stringify(out));
