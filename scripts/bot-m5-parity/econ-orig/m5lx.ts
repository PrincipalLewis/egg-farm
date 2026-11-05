// m5lx.ts = m5sx.ts on m5l.ts + env REGEN (charge_regen_s, all rc2 configs incl. idle), CAP (max charges), ARES (auto-refill restore %). Defaults = shipping (150 / 2 / 100).
// m5sx.ts = m5rx.ts driver on m5s.ts (SCRATCH, Economy 2026-10-24 23:xx, M5.1 shipping re-run): + meaningful-row G4 (bb5/strict) with worst-seed cause, LR-G3 starved share
// F10-29 / F>=10 per seed, Asleep<->Unpaid toggles, per-seed dump (PERSEED=path). CFG adds 'neglect' (rc2, no manual, no auto). Play identical to m5rx.
// M5.1 lighter Refill (C2 auto-refill + D auto-rest) econ runner (SCRATCH, Economy 2026-10-24). Based on scratch/v2-econ/h/m5x.ts (harness-definition window gate:
// every 10-min window, starts every STEP s from F10 to max level, seeds S0..S0+NS-1; windows from the active run's live state, no buys; idle bot = no mechanics, same state & seed).
// CFG: off = M5.0 harness exactly (a05bc74 Manage model; must reproduce the record) | base = M5.1: rc2 charges + call cost COST (manual refills) | auto/both = main run auto-only / manual+auto.
// WIN (windows per snapshot, base/auto/both): man = active manual, auto = active auto-only, idle = idle bot manual (comparator of record), idleA = idle bot auto-only.
// Env: AT RES REST WAIVE MANAT COST HOLD(1) NOWIN PROFS SEEDS S0 T STEP CSV
import { readFileSync } from 'node:fs'; import { createHash } from 'node:crypto';
import { run, PROFS, Stack, RC2 } from './m5l'; import { writeFileSync } from 'node:fs';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from './scripts/sync-economy';
import { validateBalance, type Balance } from './src/config/balance';
import { loadTargets, maxStepRatio, quantile } from './tests/pacing-guards';
const csv = process.env.CSV ?? '../../v2-econ/economy.m50-draft.csv', raw = readFileSync(csv);
const b = validateBalance(buildBalance(parseEconomyCsv(raw.toString('utf8')), JSON.parse(readFileSync('./src/config/balance.json', 'utf8')), readEconomyConfig() as any) as Balance, false);
const tg = loadTargets(); const E = process.env; (b as any).__clockWage = E.CLOCK === '1'; (b as any).__payWage = E.PAYWAGE === '1';
const HOLD = (E.HOLD ?? '1') === '1';
const S: Stack = { on: true, streakCap: 0.28, tapShare: 0.03, broody: true, golden: { gapMin: 120, gapMax: 300 }, abil: true, sweep: 'A', sweepMult: 1.15, pause: false, warm: true, ssZero: true, hold: HOLD };
const COST = +(E.COST ?? 10), MANAT = +(E.MANAT ?? 32), AUTO = { at: +(E.AT ?? 20), reserve: +(E.RES ?? 1), rest: (E.REST ?? '1') === '1', waive0: E.WAIVE === '1' };
const LEV = { regen: +(E.REGEN ?? 150), cap: +(E.CAP ?? 2) }, ARES = +(E.ARES ?? 100);
const rcMan: RC2 = { cost: COST, manual: true, manAt: MANAT, auto: null, ...LEV, autoRestore: ARES }, rcAuto: RC2 = { ...rcMan, manual: false, auto: AUTO }, rcBoth: RC2 = { ...rcMan, auto: AUTO };
const idleMan: RC2 = { cost: 0, manual: true, manAt: MANAT, auto: null, ...LEV, autoRestore: ARES }, idleAuto: RC2 = { cost: 0, manual: false, manAt: MANAT, auto: AUTO, ...LEV, autoRestore: ARES };
const CF: Record<string, Stack> = { off: S, offnone: { ...S, on: false }, base: { ...S, rc2: rcMan }, auto: { ...S, rc2: rcAuto }, both: { ...S, rc2: rcBoth }, neglect: { ...S, rc2: { ...rcMan, manual: false, auto: null } },
  none: { ...S, on: false, rc2: idleMan }, noneA: { ...S, on: false, rc2: idleAuto } };
const NOWIN = E.NOWIN === '1', NS = +(E.SEEDS ?? 200), S0 = +(E.S0 ?? 1), T = +(E.T ?? 12000), STEP = +(E.STEP ?? 300), SF = 30;
const WIN = (E.WIN ?? 'man,auto,idle,idleA').split(',');
const q = (a: number[], p: number) => { const x = a.filter(Number.isFinite); return x.length ? quantile(x, p) : NaN; }, mx = (a: number[]) => Math.max(...a.filter(Number.isFinite)), mn = (a: number[]) => Math.min(...a.filter(Number.isFinite));
const r3 = (x: number) => +x.toFixed(3);
const out: any = { LEV, ARES, csv, sha: createHash('sha256').update(raw).digest('hex'), seeds: [S0, S0 + NS - 1], T, STEP, HOLD, COST, MANAT, AUTO, WIN };
for (const ck of (E.CFG ?? 'base').split(',')) for (const pf of (E.PROFS ?? 'optimal,seller15,casual').split(',')) {
  const K = CF[ck], P = PROFS[pf], mech = K.on;
  const KW: Record<string, [Stack, any]> = ck === 'off' ? { man: [K, P], idle: [CF.offnone, PROFS.idle] } : { man: [{ ...K, rc2: rcMan }, P], auto: [{ ...K, rc2: rcAuto }, P], idle: [CF.none, PROFS.idle], idleA: [CF.noneA, PROFS.idle] };
  const wk = ck === 'off' ? ['man', 'idle'] : WIN; const W: Record<string, number[]> = {}; const seedMax: Record<string, number[]> = {}; const ratios = ['man/idle', 'auto/idle', 'man/idleA', 'auto/idleA', 'auto/man'];
  for (const r of ratios) { W[r] = []; seedMax[r] = []; }
  const unp: number[] = [], unp0: number[] = [], noAff: number[] = [], step: number[] = [], L10: number[] = [], L18: number[] = [], L30: number[] = [], sc8: number[] = [], refM: number[] = [], refA: number[] = [], asl: number[] = [], mhA: number[] = [], restS: number[] = [], inc: number[] = [], prem: Record<string, number[]> = { 'F10-19': [], 'F20-29': [] };
  let SC8T = 0, L17T = 0; const bb5: number[] = [], strict: number[] = [], sc29: number[] = [], sc30: number[] = [], tog: number[] = [], tog10: number[] = [], unpE: number[] = [], per: any[] = []; let worst: any = null, worstM: any = null, SC29T = 0, T29 = 0;
  for (let i = 0; i < NS; i++) { const seed = S0 + i, r = run(b, seed, P, K, T, { snapEveryS: mech && !NOWIN ? STEP : undefined });
    noAff.push(r.longestNoAff); step.push(maxStepRatio(r.reach as any, SF, tg.step_ratio_min_prev_s) ?? NaN);
    L10.push((r.reach.get(10) ?? NaN) / 60); L18.push((r.reach.get(18) ?? NaN) / 60); L30.push((r.reach.get(30) ?? NaN) / 60);
    { const g = (r as any).g4m, rm = r.rm; bb5.push(g.bb5); strict.push(g.strict); if (!worst || g.bb5 > worst.len) worst = { seed, ...g.worst }; if (!worstM || g.strict > worstM.len) worstM = { seed, ...g.worstM };
      if (rm.t29 > 0) sc29.push(rm.scT29 / rm.t29); if (rm.t10 > 0) sc30.push(rm.scT30 / rm.t10); SC29T += rm.scT29; T29 += rm.t29; tog.push(rm.tog / rm.tAll * 1800); if (rm.t10 > 0) tog10.push(rm.tog10 / rm.t10 * 1800); unpE.push(rm.unpEnter / rm.tAll * 1800);
      const t10 = r.reach.get(10), t30 = r.reach.get(30); let e = NaN; if (t10 != null && t30 != null) { e = 0; for (const [F, v] of r.baseF) if (F >= 10 && F < 30) e += v; for (const [F, v] of r.srcF) if (F >= 10 && F < 30) e += v; e /= (t30 - t10); }
      per.push([seed, g.bb5, g.strict, r.longestNoAff, rm.t29 > 0 ? +(rm.scT29 / rm.t29).toFixed(5) : null, rm.t10 > 0 ? +(rm.scT30 / rm.t10).toFixed(5) : null, +e.toFixed(3), rm.tog, rm.unpEnter, +(rm.t29).toFixed(1)]); }
    const rm = r.rm; unp0.push(rm.unpaidPre10); if (rm.t10 > 0) unp.push(rm.unpaidWS / rm.t10 * 1800); if (rm.l1017T > 0) sc8.push(rm.sc8T / rm.l1017T); SC8T += rm.sc8T; L17T += rm.l1017T;
    if (rm.t10 > 0) { refM.push(rm.refM10 / rm.t10 * 1800); refA.push(rm.refA10 / rm.t10 * 1800); asl.push(rm.asleepWS / rm.t10); mhA.push(rm.mhAsleep / rm.t10 * 1800); restS.push(rm.restS / rm.t10 * 1800); }
    const t10 = r.reach.get(10), t30 = r.reach.get(30); if (t10 != null && t30 != null) { let e = 0; for (const [F, v] of r.baseF) if (F >= 10 && F < 30) e += v; for (const [F, v] of r.srcF) if (F >= 10 && F < 30) e += v; inc.push(e / (t30 - t10)); }
    if (mech) for (const bd of Object.keys(prem)) { const keys = Object.keys(r.src).filter(k => k.startsWith(bd + ':')); const m = keys.reduce((a, k) => a + r.src[k], 0); let base = 0; for (const [F, v] of r.baseF) if ((bd === 'F10-19' && F >= 10 && F < 20) || (bd === 'F20-29' && F >= 20 && F < 30)) base += v; if (base > 0) prem[bd].push(m / base); }
    const sm: Record<string, number> = {}; for (const k of ratios) sm[k] = 0;
    if (mech && !NOWIN) for (const [t, F, st] of r.tsnaps) { const g: Record<string, number> = {};
      for (const k of wk) { const [KK, PP] = KW[k]; const z = run(b, seed * 7919 + Math.round(t), PP, KK, 600, { start: st, noBuy: true }); g[k] = z.final.coinsCents - st.coinsCents; }
      for (const k of ratios) { const [a, c] = k.split('/'); if (g[a] == null || g[c] == null || !(g[c] > 0)) continue; const x = g[a] / g[c]; W[k].push(x); sm[k] = Math.max(sm[k], x); } }
    for (const k of ratios) if (W[k].length) seedMax[k].push(sm[k]);
  }
  const o: any = { cfg: ck, prof: pf, maxLevel: b.maxLevel, G4_noAff: [r3(q(noAff, .5)), r3(q(noAff, .95)), r3(mx(noAff))], stepL30: [r3(q(step, .95)), r3(mx(step))],
    L10: [r3(mn(L10)), r3(q(L10, .5)), r3(q(L10, .95))], L18: r3(q(L18, .5)), L30: [r3(q(L30, .5)), r3(q(L30, .95))], incF10_29_cps: r3(q(inc, .5)),
    SC8: { pooled: r3(L17T ? SC8T / L17T : NaN), median: r3(q(sc8, .5)), p5: r3(q(sc8, .05)), min: r3(mn(sc8)) }, refillsPer30m_F10: { manual: r3(q(refM, .5)), auto: r3(q(refA, .5)) },
    meanWorkersAsleep_F10: [r3(q(asl, .5)), r3(q(asl, .95))], mhAsleepSper30m_F10: [r3(q(mhA, .5)), r3(q(mhA, .95))], restSper30m: r3(q(restS, .5)), unpaidSper30m_F10: [r3(q(unp, .5)), r3(q(unp, .95))], unpaidS_preF10: [r3(q(unp0, .5)), r3(q(unp0, .95)), r3(mx(unp0))], CLOCK: E.CLOCK === '1', PAYWAGE: E.PAYWAGE === '1' };
  const d = (a: number[]) => { const x = a.filter(Number.isFinite); return x.length ? { n: x.length, min: +mn(x).toFixed(4), p5: +q(x, .05).toFixed(4), p25: +q(x, .25).toFixed(4), med: +q(x, .5).toFixed(4), p75: +q(x, .75).toFixed(4), p95: +q(x, .95).toFixed(4), max: +mx(x).toFixed(4), mean: +(x.reduce((a, v) => a + v, 0) / x.length).toFixed(4) } : null; };
  o.G4M_bb5 = [r3(q(bb5, .5)), r3(q(bb5, .95)), r3(mx(bb5))]; o.G4M_strict = [r3(q(strict, .5)), r3(q(strict, .95)), r3(mx(strict))]; o.worstBb5 = worst; o.worstStrict = worstM;
  o.starved = { F10_29: d(sc29), F10_29_pooled: r3(T29 ? SC29T / T29 : NaN), F10plus_incl_F30_dwell: d(sc30) }; o.toggles = { asleepUnpaidPer30m_all: d(tog), asleepUnpaidPer30m_F10: d(tog10), unpaidEntriesPer30m_all: d(unpE) };
  o.incF10_29_mean = r3(inc.reduce((a, v) => a + v, 0) / inc.length); o.CLOCK = E.CLOCK === '1'; o.AUTO = AUTO;
  if (E.PERSEED) writeFileSync(E.PERSEED + '.' + ck + '.' + pf + '.json', JSON.stringify({ cols: ['seed', 'bb5', 'strict', 'anyRow', 'sc29', 'sc10plus', 'incF10_29', 'toggles', 'unpaidEntries', 't29'], rows: per }));
  if (mech) o.premium = Object.fromEntries(Object.entries(prem).map(([k, v]) => [k, [+(100 * q(v, .5)).toFixed(1), +(100 * q(v, .95)).toFixed(1)]]));
  if (mech && !NOWIN) o.win = Object.fromEntries(ratios.filter(k => W[k].length).map(k => [k, { n: W[k].length, P95_all: r3(q(W[k], .95)), P95_seedMax: r3(q(seedMax[k], .95)), worstSeed: r3(mx(seedMax[k])), median: r3(q(W[k], .5)), min: r3(mn(W[k])), P5: r3(q(W[k], .05)) }]));
  out[ck + '|' + pf] = o; console.error(JSON.stringify(o));
}
console.log(JSON.stringify(out));
