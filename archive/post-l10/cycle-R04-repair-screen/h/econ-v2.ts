/** Economy v2-slices research runner (SCRATCH, Economy). Snapshot of wt-m41-integrated a05bc74 (src/tests via git archive),
 *  data/economy.csv = c7bb783f. Mirrors tests/bot-m2.ts runM2 (seller15, VAR_DEFAULT check-ins, managed) with knobs:
 *  tap mode (ac7 variance taps | fixed r taps/s | 'idle' = ac7 taps until Coop Hand hired, then 0) and a hypothetical mechanic
 *  layered on top in THIS runner only (src untouched): A tap-cash, B golden egg + streak, C golden egg + rush meter. */
import { balance as b0 } from './src/config/balance';
import { initialState, GameState, eggsPerTap } from './src/sim/state';
import { step } from './src/sim/tick';
import { apply } from './src/sim/actions';
import type { SimEvent } from './src/sim/events';
import { showManageAll, WorkerId } from './src/sim/workers';
import { SellerVariance, VAR_DEFAULT } from './tests/seller-variance';
import { pickBuy, pickAction, M1_KEYS } from './tests/bot-m4';
import { candidates } from './src/ui/next-goal';
import { incomePerSec, priceDollars } from './src/econ/income';
import { prodEggsPerSec } from './src/sim/tracks';

export type Mech = { kind: 'none' | 'A' | 'B' | 'C';
  tapCash?: { share: number; capTps: number; unlockF: number };
  golden?: { spec?: boolean; firstS?: number; unlockF: number; gapMin: number; gapMax: number; wCash: number; wFrenzy: number; wEggs: number; cashS: number; frenzyMult: number; frenzyS: number; eggsS: number; eggsAsCashFromF: number };
  streak?: { unlockF: number; perTap: number; cap: number; hold: number; decay: number; maxTps: number };
  rush?: { unlockF: number; taps: number; maxTps: number; s: number; mult: number };
  abil?: { unlockF: number; mult: number; s: number; cd: number };         // abilities v0.2 proxy: Activate-all when ready, x mult on sale value for s
  broody?: { unlockF: number; share: number; fullS: number };             // B1: nest fills share x income/s while present, cap = share x income x fullS
  goldenStreakBoost?: { minStreak: number; speed: number } };             // C1: golden gap / speed while streak >= minStreak
const CATCH = (tap: Opts['tap']) => tap === 'idle' ? 0 : tap === 3 ? 0.95 : 0.75; // ESTIMATE: share of golden eggs caught within the 30 s despawn
export interface Opts { tap: 'ac7' | 'idle' | number; T: number; mech: Mech; checkBase?: number; catchP?: number; manage?: boolean; asleepShare?: number; }
const rng = (seed: number) => { let a = (seed * 2654435761) >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
export function run(seed: number, o: Opts, bal: typeof b0 = b0) {
  const b = { ...bal, sim_test: { ...b0.sim_test, poisson_arrivals: true } } as typeof b0;
  const V = new SellerVariance(VAR_DEFAULT, seed), R = rng(seed + 7777);
  let s: GameState = initialState(b, seed); const dt = 1 / b.tickHz, n = Math.round(o.T * b.tickHz);
  const reach = new Map<number, number>([[0, 0]]), snap = new Map<number, GameState>(), buys: { t: number; f: number; k: string }[] = [];
  const CB = o.checkBase ?? 15, CP = o.catchP ?? CATCH(o.tap); let abilUntil = -1, abilReady = 0, nest = 0, asleepAcc = 0, asleepEggs = 0;
  let tapT = 1, sellT = V.checkInterval(CB);
  const ev: SimEvent[] = [];
  // attribution
  let baseCents = 0, mechCents = 0, tapEggs = 0, workerEggs = 0, mechCentsF10 = 0, baseCentsF10 = 0;
  // mechanic state
  let rushUntil = -1, rushMeter = 0, streak = 0, lastTapT = -1e9, frenzyUntil = -1, nextEgg = Infinity, eggs = 0, caught = 0, rushes = 0, tapsThisSec = 0, secMark = 0;
  const affFalse: number[] = []; let noAffStart: number | null = null, longestNoAff = 0, noAffRuns: number[] = [];
  const lvl = new Map<number, { base: number; mech: number }>(); const L_ = (F: number) => lvl.get(F) ?? (lvl.set(F, { base: 0, mech: 0 }), lvl.get(F)!);
  const credit = (c: number, F: number) => { c = Math.round(c); L_(F).mech += c; s = { ...s, coinsCents: s.coinsCents + c }; mechCents += c; if (F >= 10) mechCentsF10 += c; };
  const drain = (t: number) => { for (const e of ev) {
    if (e.type === 'sell') { baseCents += e.value; L_(s.farmLevel).base += e.value; if (s.farmLevel >= 10) baseCentsF10 += e.value; let m = 0;
      if (o.mech.golden && t < frenzyUntil) m += o.mech.golden.frenzyMult - 1; m += streak; if (o.mech.rush && t < rushUntil) m += o.mech.rush.mult - 1; if (o.mech.abil && t < abilUntil) m += o.mech.abil.mult - 1;
      if (m > 0) credit(e.value * m, s.farmLevel); }
    else if (e.type === 'worker_collect') workerEggs += e.eggs; else if (e.type === 'collect') tapEggs += e.eggs; } ev.length = 0; };
  const tapsPerS = typeof o.tap === 'number' ? o.tap : 0;
  let fixT = 1;
  for (let i = 1; i <= n; i++) {
    const t = Math.round(i * dt * 10) / 10, F = s.farmLevel;
    s = step(s, dt, b, ev); drain(t);
    if (o.asleepShare && s.workers.coop_hand && (s.workers.coop_hand.unpaid || s.workers.coop_hand.energy <= 0)) { // ESTIMATE model of w2_asleep_collect_share (not in code)
      asleepAcc += o.asleepShare * dt / b.workers.coop_hand.every_s; if (asleepAcc >= 1) { asleepAcc -= 1; const k = Math.min(Math.floor(s.coop), eggsPerTap(s.collectionLevel, b)); s = { ...s, coop: s.coop - k, basket: s.basket + k }; asleepEggs += k; } }
    if (o.mech.broody && o.tap !== 'idle' && s.farmLevel >= o.mech.broody.unlockF) { const inc = Math.max(0, incomePerSec(s, b)) * 100; nest = Math.min(o.mech.broody.share * inc * o.mech.broody.fullS, nest + o.mech.broody.share * inc * dt); }
    if (o.mech.abil && o.tap !== 'idle' && s.farmLevel >= o.mech.abil.unlockF && t >= abilReady) { abilUntil = t + o.mech.abil.s; abilReady = t + o.mech.abil.cd; }
    // taps
    let tapsNow = 0;
    if (o.tap === 'ac7' || o.tap === 'idle') { if (t >= tapT) { tapT += V.tapInterval(); if (o.tap === 'ac7' || !s.workers.coop_hand) tapsNow = 1; } }
    else if (tapsPerS > 0) { while (t >= fixT) { fixT += 1 / tapsPerS; tapsNow++; } }
    if (Math.floor(t) !== secMark) { secMark = Math.floor(t); tapsThisSec = 0; }
    for (let k = 0; k < tapsNow; k++) {
      s = apply(s, { type: 'collect' }, b, ev); drain(t);
      const M = o.mech;
      if (M.tapCash && s.farmLevel >= M.tapCash.unlockF && tapsThisSec < M.tapCash.capTps) credit(M.tapCash.share * Math.max(0, incomePerSec(s, b)) * 100, s.farmLevel);
      if (M.streak && s.farmLevel >= M.streak.unlockF && tapsThisSec < M.streak.maxTps) { streak = Math.min(M.streak.cap, streak + M.streak.perTap); lastTapT = t; }
      if (M.rush && s.farmLevel >= M.rush.unlockF && t >= rushUntil && tapsThisSec < M.rush.maxTps) { rushMeter++; if (rushMeter >= M.rush.taps) { rushMeter = 0; rushUntil = t + M.rush.s; rushes++; } }
      tapsThisSec++;
    }
    if (o.mech.streak && t - lastTapT > o.mech.streak.hold) streak = Math.max(0, streak - o.mech.streak.decay * dt);
    if (o.mech.golden) { const M = o.mech.golden;
      if (nextEgg === Infinity && s.farmLevel >= M.unlockF) nextEgg = t + (M.spec ? (M.firstS ?? 45) : M.gapMin + R() * (M.gapMax - M.gapMin));
      if (t >= nextEgg) { eggs++; const got = R() < CP, resolve = M.spec ? (got ? 1 + 7 * R() : 30) : 0;
        const gb = o.mech.goldenStreakBoost, sp = gb && streak >= gb.minStreak ? gb.speed : 1; nextEgg = t + resolve + (M.gapMin + R() * (M.gapMax - M.gapMin)) / sp;
        if (got) { caught++; const inc = M.spec ? prodEggsPerSec(s, b) * priceDollars(s, b) * 100 : Math.max(0, incomePerSec(s, b)) * 100, r = R();
          if (r < M.wCash) credit(M.cashS * inc, s.farmLevel);
          else if (r < M.wCash + M.wFrenzy) frenzyUntil = t + M.frenzyS;
          else if (s.farmLevel >= M.eggsAsCashFromF) credit(M.eggsS * inc, s.farmLevel);
          else if (M.spec) s = { ...s, basket: s.basket + Math.floor(M.eggsS * prodEggsPerSec(s, b)) };
          else s = { ...s, basket: s.basket + Math.floor(M.eggsS * prodEggsPerSec(s, b)) };
        } } }
    // affordability sample at 1 s, F>=10
    if (Math.abs(t - Math.round(t)) < 1e-6) {
      const inR = s.farmLevel >= 10 && s.farmLevel < b.maxLevel, aff = !inR || candidates(s, b).some(c => s.coinsCents >= c.costCents);
      if (!aff) { if (noAffStart === null) noAffStart = t; } else if (noAffStart !== null) { noAffRuns.push(t - noAffStart); longestNoAff = Math.max(longestNoAff, t - noAffStart); noAffStart = null; }
    }
    if (t < sellT) continue;
    sellT = t + V.checkInterval(CB);
    s = apply(s, { type: 'sellAll' }, b, ev); drain(t);
    if (nest > 0) { credit(nest, s.farmLevel); nest = 0; }
    if (o.manage !== false && s.manageCdS <= 1e-9) {
      const low = (Object.entries(s.workers) as [WorkerId, { energy: number }][]).filter(([, w]) => w.energy <= b.workers.energy.manage_prompt_threshold * 100).sort((a, c) => a[1].energy - c[1].energy);
      if (low.length) s = apply(s, showManageAll(s.workers, b) && low.length >= b.workers.energy.manage_all_min_workers ? { type: 'manageAll' } : { type: 'manage', worker: low[0][0] }, b);
    }
    if (V.delay()) continue;
    V.cheapFirst();
    for (let g = 0; g < 200; g++) {
      let kind = pickBuy(s, b, 'seller15', false, [...M1_KEYS, 'W1', 'W2', 'W3', 'W4']);
      if (!kind) break; const next = apply(s, pickAction(kind), b); if (next === s) break; s = next;
      buys.push({ t, f: s.farmLevel, k: String(kind) });
      if (kind === 'f') { reach.set(s.farmLevel, t); snap.set(s.farmLevel, s); }
    }
  }
  if (noAffStart !== null) { noAffRuns.push(o.T - noAffStart); longestNoAff = Math.max(longestNoAff, o.T - noAffStart); }
  return { lvl, asleepEggs, rushes, reach, snap, buys, baseCents, mechCents, baseCentsF10, mechCentsF10, tapEggs, workerEggs, longestNoAff, noAffRuns, eggs, caught, finalF: s.farmLevel };
}
