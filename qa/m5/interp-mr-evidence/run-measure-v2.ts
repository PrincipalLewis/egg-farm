import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PROFS, Stack, run as runMeasure } from './m5trace-measure';
import { run as runOrder } from './m5trace-order';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from '/workspace/egg-farm-studio/scratch/post-l10/baseline/h/scripts/sync-economy';
import { validateBalance, type Balance } from '/workspace/egg-farm-studio/scratch/post-l10/baseline/h/src/config/balance';

const csv = process.env.CSV!, raw = readFileSync(csv);
const b = validateBalance(buildBalance(parseEconomyCsv(raw.toString('utf8')), JSON.parse(readFileSync('./src/config/balance.json', 'utf8')), readEconomyConfig() as any) as Balance, false);
const S: Stack = { on: true, streakCap: 0.28, tapShare: 0.03, broody: true, golden: { gapMin: 120, gapMax: 300 }, abil: true, sweep: 'A', sweepMult: 1.15, pause: false, warm: true, ssZero: true };
const K: Stack = { ...S, on: false };
const seed0 = +(process.env.S0 ?? 1), nSeeds = +(process.env.SEEDS ?? 1), T = +(process.env.T ?? 4000);
const pf = process.env.PROF || 'optimal';
const doTraj = process.env.TRAJ !== '0';

const trajHash = (buyLog: any[]) => createHash('sha256').update(JSON.stringify(buyLog.map((x: any) =>
  [x.t, x.kind, x.costCents, x.farmLevel, x.hensLevel, x.eggValueLevel, x.collectionLevel, x.farmAfter, x.hensAfter, x.eggValueAfter, x.collectionAfter]
))).digest('hex');

const stretchPairs = (evs: any[]) => {
  const opens = evs.filter(e => e.type === 'open');
  const closes = evs.filter(e => e.type === 'close' || e.type === 'close_at_T');
  // pair in order
  const pairs: { openT: number; closeT: number; dur: number; farm: number; openTag?: string }[] = [];
  let ci = 0;
  for (const o of opens) {
    while (ci < closes.length && closes[ci].t < o.t - 1e-12) ci++;
    const c = closes[ci++];
    if (!c) break;
    pairs.push({ openT: o.t, closeT: c.t, dur: c.dur ?? (c.t - o.t), farm: o.farmLevel ?? c.openedAtFarm, openTag: o.tag });
  }
  return pairs;
};

const rows: any[] = [];
let trajMismatch = 0;
for (let i = 0; i < nSeeds; i++) {
  const seed = seed0 + i;
  const c = runMeasure(b, seed, PROFS[pf], K, T) as any;
  let traj = { measure: trajHash(c.buyLog), order: '' as string, match: true as boolean };
  if (doTraj) {
    const o = runOrder(b, seed, PROFS[pf], K, T) as any;
    traj.order = trajHash(o.buyLog);
    traj.match = traj.measure === traj.order;
    if (!traj.match) trajMismatch++;
  }
  const curPairs = stretchPairs(c.mrEvents);
  const aPairs = stretchPairs(c.mrAEvents);
  // lengthening analysis vs current: for each (a) stretch, compare to current stretches
  // Earlier open: an (a) open at tA where the covering current stretch (if any) opened at tC > tA,
  // or no current stretch covers that interval but (a) has one.
  const earlierOpens: any[] = [];
  const aOpens = (c.mrAEvents as any[]).filter(e => e.type === 'open');
  const curOpens = (c.mrEvents as any[]).filter(e => e.type === 'open');
  // (1) (a) open earlier than the next current open (same farm band / before next cur open)
  for (const ao of aOpens) {
    const nextCur = curOpens.find((co: any) => co.t > ao.t + 1e-12);
    const prevCur = [...curOpens].reverse().find((co: any) => co.t <= ao.t + 1e-12);
    // earlier than next current open, and not simply equal to an existing current open
    const exactCur = curOpens.find((co: any) => Math.abs(co.t - ao.t) < 1e-9);
    if (exactCur) continue;
    if (nextCur) {
      // Only count if no current open already active: i.e. previous current stretch already closed before ao.t
      const prevPair = curPairs.filter(cp => cp.openT <= ao.t + 1e-12).pop();
      const curAlreadyOpen = prevPair && prevPair.closeT > ao.t + 1e-12;
      if (!curAlreadyOpen && nextCur.t > ao.t + 1e-12) {
        earlierOpens.push({
          aOpen: ao.t, curOpen: nextCur.t, delta: nextCur.t - ao.t,
          farm: ao.farmLevel, openTag: ao.tag,
          kind: Math.abs(ao.t - Math.round(ao.t)) > 1e-6 ? 'fractional_before_next_cur_open' : 'int_before_next_cur_open',
        });
      }
    } else if (!exactCur) {
      // (a) opened with no subsequent current open — new tail stretch
      const prevPair = curPairs.filter(cp => cp.openT <= ao.t + 1e-12).pop();
      const curAlreadyOpen = prevPair && prevPair.closeT > ao.t + 1e-12;
      if (!curAlreadyOpen) earlierOpens.push({ aOpen: ao.t, curOpen: null, delta: null, farm: ao.farmLevel, openTag: ao.tag, kind: 'a_open_no_cur_counterpart' });
    }
  }
  // (2) pair-based: same close time but earlier open
  for (const ap of aPairs) {
    const laterOpenSameClose = curPairs.find(cp => Math.abs(cp.closeT - ap.closeT) < 1e-9 && cp.openT > ap.openT + 1e-12);
    if (laterOpenSameClose) {
      earlierOpens.push({ aOpen: ap.openT, curOpen: laterOpenSameClose.openT, delta: laterOpenSameClose.openT - ap.openT, aDur: ap.dur, curDur: laterOpenSameClose.dur, farm: ap.farm, openTag: ap.openTag, kind: 'earlier_open_same_close' });
    }
  }
  const afterSellAllOpens = aOpens.filter((e: any) => e.tag === 'after_sellAll');
  const fractionalOpens = aOpens.filter((e: any) => Math.abs(e.t - Math.round(e.t)) > 1e-6);
  // Also: (a) longest > current longest
  const lengthened = c.mrALongest > c.mrLongest + 1e-12;
  rows.push({
    seed,
    mrLongest: c.mrLongest, mrALongest: c.mrALongest,
    nCurStretches: curPairs.length, nAStretches: aPairs.length,
    earlierOpens, nEarlierOpens: earlierOpens.length,
    nAfterSellAllOpens: afterSellAllOpens.length,
    nFractionalOpens: fractionalOpens.length,
    fractionalOpens: fractionalOpens.map((e: any) => ({ t: e.t, farm: e.farmLevel, tag: e.tag })),
    lengthened,
    longestDelta: c.mrALongest - c.mrLongest,
    traj,
    // keep compact: only longest stretch pair each
    curLongestPair: curPairs.slice().sort((x,y)=>y.dur-x.dur)[0] || null,
    aLongestPair: aPairs.slice().sort((x,y)=>y.dur-x.dur)[0] || null,
  });
}

const summary = {
  n: rows.length,
  worst_current: Math.max(...rows.map(r => r.mrLongest)),
  worst_a: Math.max(...rows.map(r => r.mrALongest)),
  n_lengthened_longest: rows.filter(r => r.lengthened).length,
  n_seeds_with_earlier_open: rows.filter(r => r.nEarlierOpens > 0).length,
  n_earlier_open_events: rows.reduce((a, r) => a + r.nEarlierOpens, 0),
  n_fractional_opens: rows.reduce((a, r) => a + r.nFractionalOpens, 0),
  n_after_sellAll_opens: rows.reduce((a, r) => a + r.nAfterSellAllOpens, 0),
  n_seeds_with_fractional_open: rows.filter(r => r.nFractionalOpens > 0).length,
  sum_earlier_delta: rows.reduce((a, r) => a + r.earlierOpens.reduce((x: number, e: any) => x + (e.delta ?? 0), 0), 0),
  max_earlier_delta: Math.max(0, ...rows.flatMap(r => r.earlierOpens.map((e: any) => e.delta ?? 0))),
  traj_mismatches: trajMismatch,
  traj_compared: doTraj ? rows.length : 0,
};
const dest = process.env.OUT!;
writeFileSync(dest, JSON.stringify({ runner: 'run-measure-v2.ts', sha256: createHash('sha256').update(raw).digest('hex'), csv, seeds: [seed0, seed0+nSeeds-1], T, prof: pf, summary, rows }, null, 0));
console.log(JSON.stringify({ ok: true, dest, summary }));
