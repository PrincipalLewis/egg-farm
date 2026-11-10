import { run, Opts } from './econ-v2';
import { balance as b } from './src/config/balance';
import { incomePerSec, demandPerSec } from './src/econ/income';
import { prodEggsPerSec, salePriceCents } from './src/sim/tracks';
import { eggsPerTap } from './src/sim/state';
import { graderMult } from './src/sim/workers';
const q = (a: number[], p: number) => { const x = [...a].filter(Number.isFinite).sort((m, n) => m - n); if (!x.length) return NaN; const i = (x.length - 1) * p, lo = Math.floor(i); return x[lo] + (x[Math.ceil(i)] - x[lo]) * (i - lo); };
const NS = +(process.env.SEEDS ?? 100), T = +(process.env.T ?? 10800), which = process.env.CFG ?? 'base';
const G0 = { unlockF: 8, gapMin: 120, gapMax: 300, wCash: 0.45, wFrenzy: 0.35, wEggs: 0.2, cashS: 45, frenzyMult: 2, frenzyS: 30, eggsS: 60, eggsAsCashFromF: 20 };
const S0 = { unlockF: 8, perTap: 0.01, cap: 0.4, hold: 3, decay: 0.03, maxTps: 1 };
export const CFGS: Record<string, Opts['mech']> = {
  none: { kind: 'none' },
  A: { kind: 'A', tapCash: { share: 0.12, capTps: 3, unlockF: 8 } },
  Bcsv: { kind: 'B', golden: G0, streak: S0 },                                   // tc_* exactly as in economy.csv today (not implemented in code)
  B: { kind: 'B', golden: { ...G0, gapMin: 90, gapMax: 210, cashS: 60 }, streak: { ...S0, cap: 0.15 } }, // proposed B
  C: { kind: 'C', golden: G0, rush: { unlockF: 8, taps: 120, maxTps: 2, s: 20, mult: 2 } },
};
const taps: Opts['tap'][] = (process.env.TAPS ?? 'idle,ac7,1,3').split(',').map(x => isNaN(+x) ? x as any : +x);
const out: any = {};
for (const mk of which.split(',')) for (const tp of taps) {
  const rs = Array.from({ length: NS }, (_, i) => run(i + 1, { tap: tp, T, mech: CFGS[mk] }));
  const at = (L: number) => rs.map(r => (r.reach.get(L) ?? Infinity) / 60);
  const gaps: number[] = [], perSeedMed: number[] = [], perSeedP90: number[] = [], perSeedMax: number[] = [];
  for (const r of rs) { const t10 = r.reach.get(10), t30 = r.reach.get(30) ?? T; if (t10 == null) continue;
    const ts = [t10, ...r.buys.filter(x => x.t > t10 && x.t <= t30).map(x => x.t)]; const uniq = [...new Set(ts)]; const g = uniq.slice(1).map((x, i) => x - uniq[i]);
    gaps.push(...g); perSeedMed.push(q(g, .5)); perSeedP90.push(q(g, .9)); perSeedMax.push(Math.max(...g)); }
  const steps = (lo: number, hi: number) => rs.map(r => { let m = 0; for (let L = lo + 1; L <= hi; L++) { const a = r.reach.get(L - 1), c = r.reach.get(L); if (a == null || c == null) return Infinity; m = Math.max(m, c - a); } return m / 60; });
  const share = rs.map(r => r.mechCentsF10 / (r.mechCentsF10 + r.baseCentsF10));
  const tapEggShare = rs.map(r => r.tapEggs / (r.tapEggs + r.workerEggs));
  const key = `${mk}|${tp}`;
  out[key] = { L10: [q(at(10), .5), q(at(10), .95)], L18: [q(at(18), .5), q(at(18), .95)], L25: [q(at(25), .5), q(at(25), .95)], L30: [q(at(30), .5), q(at(30), .95)],
    reached30: rs.filter(r => r.reach.has(30)).length,
    gapPooled: [q(gaps, .5), q(gaps, .9), Math.max(...gaps)], gapSeedMed: q(perSeedMed, .5), gapSeedP90: q(perSeedP90, .5), gapSeedMaxMed: q(perSeedMax, .5), gapSeedMaxWorst: Math.max(...perSeedMax),
    noAffLongest: [q(rs.map(r => r.longestNoAff), .5), q(rs.map(r => r.longestNoAff), .9), Math.max(...rs.map(r => r.longestNoAff))],
    noAffRunMed: q(rs.flatMap(r => r.noAffRuns), .5),
    mechShareF10plus: [q(share, .5), q(share, .05), q(share, .95)], tapEggShare: q(tapEggShare, .5),
    maxStep18_25: [q(steps(18, 25), .5), Math.max(...steps(18, 25))], eggsCaught: q(rs.map(r => r.caught), .5), rushes: q(rs.map(r => r.rushes), .5) };
  console.error(key, JSON.stringify(out[key]));
  if (mk === 'none' && tp === 'ac7') { // state snapshots for analytic table
    const snaps: any = {};
    for (const L of [1, 10, 20, 30]) { const xs = rs.map(r => r.snap.get(L)).filter(Boolean) as any[]; const s = xs[Math.floor(xs.length / 2)];
      // median-ish seed state: report seed 1's analytic plus levels
      const lv = xs.map(x => [x.collectionLevel, x.hensLevel, x.eggValueLevel, x.graderTier, Object.keys(x.workers).length]);
      snaps[L] = { n: xs.length, C: q(lv.map(v => v[0]), .5), H: q(lv.map(v => v[1]), .5), V: q(lv.map(v => v[2]), .5), G: q(lv.map(v => v[3]), .5), W: q(lv.map(v => v[4]), .5) };
    }
    out.snaps = snaps;
  }
}
console.log(JSON.stringify(out));
