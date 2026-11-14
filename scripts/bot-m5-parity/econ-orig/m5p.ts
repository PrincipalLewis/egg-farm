// m5p.ts = m5s.ts + per-second pressure series from F>=10 (opt.series) + one-charge perturbation at F20 reach (opt.pert = +1 grant / -1 remove; SCRATCH, Economy 2026-10-25, M5.2 pressure metric). pert 0 = play identical.
/** m5s.ts = m5r.ts + M5.1 shipping re-run measurements (SCRATCH, Economy 2026-10-24 23:xx): meaningful-row G4 (D-HOP-35, bb5 = FARM/W* always count; strict) with
 *  longest-stretch cause capture, charge-starved share F10-29 and F>=10 (LR-G3 definition), Asleep<->Unpaid toggles. Measurement only: play is identical to m5r.ts.
 *  M5.0 full-stack G3-G5 runner (SCRATCH, Economy). Real sim (src step/apply @ a05bc74 snapshot) + seller15 pickM4All bot (tests/bot-m4.ts),
 *  VAR_DEFAULT check-ins/taps, managed (code's manage: 30 s cooldown, refill at <=50%). M5.0 mechanics layered HERE only (none exist in src):
 *  D-HOP-2026-10-24-04 inputs: credited tap = >=1.0 s sim time since last credited tap (eggs moved or not); reference income I = trailing 60 s of
 *  PASSIVE sale coins (excl. golden cash, frenzy, abilities, Broody, tap coins, streak); streak cap 0.28; pause recovery 0.25x (1%/36 s), no output/wage. */
import { balance as b0 } from './src/config/balance';
import { initialState, GameState } from './src/sim/state';
import { step } from './src/sim/tick';
import { apply } from './src/sim/actions';
import type { SimEvent } from './src/sim/events';
import { showManageAll, WorkerId, mood, graderMult, resumeNeedCents } from './src/sim/workers';
import { SellerVariance, VAR_DEFAULT } from './tests/seller-variance';
import { pickBuy, pickAction, M1_KEYS } from './tests/bot-m4';
import { candidates } from './src/ui/next-goal';
import { optionGain, type BuyKey } from './src/econ/best-buy';
import { priceDollars } from './src/econ/income';
import { prodEggsPerSec, coopCap } from './src/sim/tracks';
type B = typeof b0;
export interface Stack { on: boolean; streakCap: number; tapShare: number; broody: boolean; golden: { gapMin: number; gapMax: number } | null; abil: boolean; sweep: 'A' | 'B'; sweepMult: number; pause: boolean; pat?: 'none' | 'yawn' | 'long' | 'fullcoop' | 'wages' | 'stock' | 'bench' | 'grader'; lockoutS?: number; hold?: boolean; ssZero?: boolean; warm?: boolean; rc2?: RC2; }
/** M5.1 (SCRATCH, Economy 2026-10-24): rc2 v1.2 Refill charges (regen 150 s, cap 2, Refillable <=50%) replacing the a05bc74 Manage model, + call energy cost,
 *  + lighter-refill C2 auto-refill / D auto-rest (m5.1-lighter-refill-proposal v0.1.1). manAt: manual bot refills at <= manAt, or at <=50% when charges are at cap. */
export interface RC2 { cost: number; manual: boolean; manAt: number; auto: null | { at: number; reserve: number; rest: boolean; waive0?: boolean }; regen?: number; cap?: number; }
export interface Prof { tap: 'idle' | 'ac7' | number; checkBase: number; catchP: number; }
export const PROFS: Record<string, Prof> = { slow: { tap: 0.25, checkBase: 60, catchP: 0.4 }, idle: { tap: 'idle', checkBase: 15, catchP: 0 }, optimal: { tap: 3, checkBase: 5, catchP: 1 }, seller15: { tap: 'ac7', checkBase: 15, catchP: 0.75 }, casual: { tap: 0.5, checkBase: 30, catchP: 0.6 } };
const rng = (seed: number) => { let a = (seed * 2654435761 + 99) >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const WIDS: WorkerId[] = ['market_hand', 'coop_hand', 'hawker', 'grader'];
export function run(bal: B, seed: number, P: Prof, K: Stack, T: number, opt: { start?: GameState; noBuy?: boolean; snapAt?: number[]; snapEveryS?: number; series?: { start: number; st: number[]; ex: number[]; el: number[]; pertT: number | null }; pert?: number } = {}) {
  const tsnaps: [number, number, GameState][] = [];
  const b = { ...bal, sim_test: { ...bal.sim_test, poisson_arrivals: true } } as B;
  const V = new SellerVariance(VAR_DEFAULT, seed), R = rng(seed);
  let s: GameState = opt.start ?? initialState(b, seed); const dt = 1 / b.tickHz, n = Math.round(T * b.tickHz);
  const reach = new Map<number, number>([[s.farmLevel, 0]]), snaps = new Map<number, GameState>(), buys: number[] = [];
  const ev: SimEvent[] = []; const present = P.tap !== 'idle';
  // mechanic state
  let streak = 0, lastCred = -1e9, lastTap = -1e9, frenzyUntil = -1, nextEgg = Infinity, nest = 0;
  const readyAt: Record<string, number> = {}, until: Record<string, number> = {}; const paused = new Map<WorkerId, number>(); let lockUntil = -1;
  const win: [number, number][] = []; let winSum = 0; const stall = () => { const w = s.workers.market_hand; if (!w || paused.has('market_hand')) return false; const m = mood(w, b); return m === 'asleep' || m === 'unpaid'; };
  const t0 = { v: 0 };
  const RC = K.rc2, CAP = RC?.cap ?? 2, REGEN = RC?.regen ?? 150, RTH = 50, PRIO: WorkerId[] = ['market_hand', 'grader', 'hawker', 'coop_hand'];
  const X = () => s as any; if (RC) { if (X().__ch == null) s = { ...s, __ch: CAP, __chT: 0, __rest: {} } as any; }
  const rm = { sc8T: 0, l1017T: 0, refM: 0, refA: 0, refM10: 0, refA10: 0, t10: 0, asleepWS: 0, mhAsleep: 0, restS: 0, restEnd100: 0, unpaidWS: 0, unpaidPre10: 0, pays: 0, scT29: 0, t29: 0, scT30: 0, tog: 0, tog10: 0, unpEnter: 0, unpEnter10: 0, tAll: 0 };
  const prevMood: Record<string, string | null> = {};
  let bStart: number | null = null, mStart: number | null = null, longestB = 0, longestM = 0, cur: any = null, worst: any = null, curM: any = null, worstM: any = null;
  const gainOf = (k: string) => optionGain(s, b, k as BuyKey)?.gain ?? 0;
  const eE = (id: WorkerId) => { const r = X().__rest?.[id]; return r != null ? r : s.workers[id]!.energy; };
  const refillOne = (id: WorkerId, by: 'm' | 'a') => { const rest = { ...X().__rest }; delete rest[id]; s = { ...s, workers: { ...s.workers, [id]: { ...s.workers[id]!, energy: 100 } }, __ch: X().__ch - 1, __rest: rest } as any;
    if (by === 'm') { rm.refM++; if (s.farmLevel >= 10) rm.refM10++; } else { rm.refA++; if (s.farmLevel >= 10) rm.refA10++; } };
  const elig = (id: WorkerId) => { const w = s.workers[id]; return !!w && !w.unpaid && !paused.has(id); };
  // refI: trailing 60 s passive sales (spec §4.1). K.warm: during the first 60 s of a run that starts from a snapshot, use I_ss (steady gross) instead (spec §4.1a).
  // K.ssZero: HoQA X8 / sales-stopped §4.2 — instant 0 whenever a hired, unpaused Market Hand is Asleep/Unpaid (spec applies it to I_ss only; this variant applies it always).
  const refI = () => { if (K.ssZero && stall()) return 0; if (K.warm && opt.start && t0.v < 60) return stall() ? 0 : prodEggsPerSec(s, b) * priceDollars(s, b) * 100; return winSum / 60; }; // cents/s
  const src: Record<string, number> = {}; let base = 0, baseF = new Map<number, number>(), srcF = new Map<number, number>();
  const band = (F: number) => F < 10 ? 'L0-9' : F < 20 ? 'F10-19' : F < 30 ? 'F20-29' : 'F30+';
  const add = (k: string, c: number) => { const key = band(s.farmLevel) + ':' + k; src[key] = (src[key] ?? 0) + c; srcF.set(s.farmLevel, (srcF.get(s.farmLevel) ?? 0) + c); };
  const credit = (k: string, c: number) => { c = Math.round(c); if (c <= 0) return; s = { ...s, coinsCents: s.coinsCents + c }; add(k, c); };
  let ovl = { stallS: 0, stallBy: {} as Record<string, number>, peakM: 1, peakF18: 1, peakTot: 1, tAbil: 0, tFr: 0, tBoth: 0, saleBoth: 0, xBoth: 0, xAll: 0 }; let collTap = 0, collW = 0; const collWin: [number, number, number][] = [];
  let noAffStart: number | null = null, longestNoAff = 0, longestNoAff30 = 0, noAff30Start: number | null = null;
  const act = (id: string, t: number) => until[id] != null && t < until[id];
  const drain = (t: number) => { for (const e of ev) {
    if (e.type === 'sell') { base += e.value; baseF.set(s.farmLevel, (baseF.get(s.farmLevel) ?? 0) + e.value); win.push([t, e.value]); winSum += e.value;
      if (K.on && paused.has('grader') && s.graderTier > 0) { const g = graderMult(s.workers, s.graderTier, b); const cut = Math.round(e.value * (1 - 1 / g)); if (cut > 0) { s = { ...s, coinsCents: s.coinsCents - cut }; add('gpause', -cut); } }
      if (!K.on) continue;
      const parts: [string, number][] = [];
      if (streak > 0) parts.push(['streak', 1 + streak]);
      if (t < frenzyUntil) parts.push(['frenzy', 2]);
      if (K.abil) {
        if (act('market_hand', t) && (e as any).by === 'market_hand') parts.push(['rush', 1.15]);
        if (act('hawker', t)) parts.push(['shout', 1.15]);
        if (act('grader', t) && s.graderTier > 0) { const m = mood(s.workers.grader, b); const sh = m === 'working' ? 1 : m === 'tired' ? 0.5 : 0; const g0 = graderMult(s.workers, s.graderTier, b);
          if (sh > 0) parts.push(['inspect', (1 + (b.workers.grader.tiers[s.graderTier - 1].mult + 0.5 - 1) * sh) / g0]); }
        if (K.sweep === 'B' && act('coop_hand', t)) { const w = collWin.filter(x => x[0] >= until.coop_hand - 30); const cw = w.reduce((a, x) => a + x[1], 0), ct = w.reduce((a, x) => a + x[2], 0); const f = cw + ct > 0 ? cw / (cw + ct) : 1; parts.push(['sweepB', 1 + (K.sweepMult - 1) * f]); }
      }
      const M = parts.reduce((a, [, m]) => a * m, 1); if (M <= 1) continue;
      { const gp = s.graderTier > 0 ? graderMult(s.workers, s.graderTier, b) : 1; if (M > ovl.peakM) ovl.peakM = M; if (s.farmLevel === 18 && M > ovl.peakF18) ovl.peakF18 = M; if (M * gp > ovl.peakTot) ovl.peakTot = M * gp; }
      { const hasF = parts.some(x => x[0] === 'frenzy'), Ma = parts.filter(x => ['rush', 'shout', 'inspect', 'sweepB'].includes(x[0])).reduce((a, [, m]) => a * m, 1);
        ovl.xAll += e.value * (M - 1); if (hasF && Ma > 1) { ovl.saleBoth += e.value; ovl.xBoth += e.value * (2 - 1) * (Ma - 1) * (M / (2 * Ma)); } }
      const extra = e.value * (M - 1), lsum = parts.reduce((a, [, m]) => a + Math.log(m), 0);
      for (const [k, m] of parts) credit(k, extra * Math.log(m) / lsum); // split extra by log share
    } else if (e.type === 'worker_collect') { collW += e.eggs; collWin.push([0, e.eggs, 0]); collWin[collWin.length - 1][0] = curT; }
    else if (e.type === 'collect') { collTap += e.eggs; collWin.push([curT, 0, e.eggs]); } } ev.length = 0; };
  let curT = 0, tapT = 1, fixT = 1, sellT = V.checkInterval(P.checkBase);
  for (let i = 1; i <= n; i++) {
    const t = Math.round(i * dt * 10) / 10; curT = t;
    // pause bookkeeping: paused workers held asleep (energy 0) by the runner; recover 0.25x drain into the stored energy
    for (const [id, e] of paused) { paused.set(id, Math.min(100, e + 0.25 * dt / b.workers.energy.drain_s_per_pct)); s = { ...s, workers: { ...s.workers, [id]: { ...s.workers[id]!, energy: 0 } } }; }
    s = step(s, dt, b, ev); drain(t); t0.v = t; rm.tAll += dt;
    for (const id of ['market_hand', 'coop_hand'] as WorkerId[]) { const w = s.workers[id]; const m = w ? mood(w, b) : null; const p = prevMood[id];
      if (p != null && m != null && p !== m) { if ((p === 'asleep' && m === 'unpaid') || (p === 'unpaid' && m === 'asleep')) { rm.tog++; if (s.farmLevel >= 10) rm.tog10++; } if (m === 'unpaid') { rm.unpEnter++; if (s.farmLevel >= 10) rm.unpEnter10++; } }
      prevMood[id] = m; }
    if (RC) {
      if (X().__ch < CAP && WIDS.some(id => s.workers[id])) { let c = X().__ch, ct = X().__chT + dt; if (ct >= REGEN - 1e-9) { c++; ct -= REGEN; } if (c >= CAP) ct = 0; s = { ...s, __ch: c, __chT: ct } as any; }
      if (opt.pert && opt.series && opt.series.pertT == null && s.farmLevel >= 20) { const c = X().__ch; if (opt.pert > 0 && c < CAP) { s = { ...s, __ch: c + 1 } as any; opt.series.pertT = t; } else if (opt.pert < 0 && c > 0) { s = { ...s, __ch: c - 1 } as any; opt.series.pertT = t; } }
      const rs = X().__rest; if (Object.keys(rs).length) { const nr = { ...rs }; let ws = s.workers; for (const id of Object.keys(nr) as WorkerId[]) { nr[id] = Math.min(100, nr[id] + (b.workers.energy as any).drain_s_per_pct ** -1 * 0.25 * dt); rm.restS += dt;
        if (nr[id] >= 100 - 1e-9) { delete nr[id]; ws = { ...ws, [id]: { ...ws[id]!, energy: 100 } }; rm.restEnd100++; } else ws = { ...ws, [id]: { ...ws[id]!, energy: 0 } }; } s = { ...s, workers: ws, __rest: nr } as any; }
      if (RC.auto) { const A = RC.auto; for (const id of PRIO) { if (!elig(id) || eE(id) > A.at + 1e-9) continue; const c = X().__ch; if (c > A.reserve || (A.waive0 && eE(id) <= 0 && c > 0)) refillOne(id, 'a'); }
        if (A.rest && X().__ch <= 0) for (const id of PRIO) if (elig(id) && s.workers[id]!.energy <= 0 && X().__rest[id] == null) s = { ...s, __rest: { ...X().__rest, [id]: 0 } } as any; }
      for (const id of ['market_hand', 'coop_hand'] as WorkerId[]) if (s.workers[id]?.unpaid) { if (s.farmLevel >= 10) rm.unpaidWS += dt; else rm.unpaidPre10 += dt; }
      if (s.farmLevel >= 10) { rm.t10 += dt; for (const id of WIDS) { const w = s.workers[id]; if (w && !w.unpaid && !paused.has(id) && w.energy <= 0) { rm.asleepWS += dt; if (id === 'market_hand') rm.mhAsleep += dt; } } }
      if (s.farmLevel >= 10 && s.farmLevel <= 17) { rm.l1017T += dt; const n = WIDS.filter(id => elig(id) && eE(id) <= RTH).length; if (n > X().__ch) rm.sc8T += dt; }
      if (s.farmLevel >= 10 && opt.series) { const z = opt.series; if (z.start < 0) z.start = Math.ceil(t) - 1; const k = Math.ceil(t) - 1 - z.start; while (z.st.length <= k) { z.st.push(0); z.ex.push(0); z.el.push(0); } const n = WIDS.filter(id => elig(id) && eE(id) <= RTH).length, e = Math.max(0, n - X().__ch); if (e > 0) z.st[k]++; z.ex[k] += e; z.el[k] += WIDS.filter(id => elig(id)).length; }
      if (s.farmLevel >= 10) { const n = WIDS.filter(id => elig(id) && eE(id) <= RTH).length, st = n > X().__ch; if (st) rm.scT30 += dt; if (s.farmLevel < 30) { rm.t29 += dt; if (st) rm.scT29 += dt; } }
      for (const c of [cur, curM]) if (c) { c.minCh = Math.min(c.minCh, X().__ch); for (const id of WIDS) { const w = s.workers[id]; if (!w || paused.has(id)) continue; const m = mood(w, b); if (m === 'asleep') { c.aslWS += dt; if (id === 'market_hand') c.mhAsl += dt; if (id === 'coop_hand') c.chAsl += dt; } else if (m === 'tired') c.tiredWS += dt; else if (m === 'unpaid') c.unpWS += dt; } }
    }
    if (opt.snapEveryS && s.farmLevel >= 10 && s.farmLevel < b.maxLevel && Math.abs(t / opt.snapEveryS - Math.round(t / opt.snapEveryS)) < 1e-6) tsnaps.push([t, s.farmLevel, s]);
    if (stall()) { ovl.stallS += dt; const bd = s.farmLevel < 10 ? 'F0-9' : s.farmLevel < 18 ? 'F10-17' : s.farmLevel < 24 ? 'F18-23' : 'F24+'; ovl.stallBy[bd] = (ovl.stallBy[bd] ?? 0) + dt; }
    while (win.length && win[0][0] < t - 60) winSum -= win.shift()![1];
    while (collWin.length && collWin[0][0] < t - 60) collWin.shift();
    if (K.on) {
      // Sweep A: lay x mult while active and Coop Hand working/tired (not paused/asleep), capped by coop capacity
      if (K.abil && K.sweep === 'A' && act('coop_hand', t)) { const extra = prodEggsPerSec(s, b) * (K.sweepMult - 1) * dt, room = coopCap(s, b) - s.coop, x = Math.max(0, Math.min(extra, room));
        if (x > 0) { s = { ...s, coop: s.coop + x }; add('sweepA', x * priceDollars(s, b) * 100); } } // value booked at current price (ESTIMATE: assumes the extra eggs sell; demand > supply at F10+)
      // early end on asleep/unpaid/paused
      if (K.abil) for (const id of WIDS) if (act(id, t)) { const m = mood(s.workers[id], b); if (!m || m === 'asleep' || m === 'unpaid' || paused.has(id)) until[id] = t; }
      // Activate-all (attended players only, F>=10, free)
      if (K.abil && present && s.farmLevel >= 10) for (const id of WIDS) { const w = s.workers[id]; if (!w || paused.has(id)) continue; const m = mood(w, b); if (m === 'asleep' || m === 'unpaid') continue;
        if (id === 'grader' && !(s.graderTier > 0)) continue; if ((id === 'market_hand' || id === 'hawker') && t < lockUntil) continue; if (t >= (readyAt[id] ?? 0) && (!K.hold || t < frenzyUntil)) { const cst = RC?.cost ?? 0; if (cst > 0 && (w.energy < cst + 1 || X().__rest?.[id] != null)) continue; readyAt[id] = t + 300; until[id] = t + 30; if (cst > 0) s = { ...s, workers: { ...s.workers, [id]: { ...s.workers[id]!, energy: w.energy - cst } } }; } }
      // Broody: unlock at first Coop Hand hire; fills 0.05 x I while present, cap 150 s
      if (K.broody && present && s.workers.coop_hand) nest = Math.min(0.05 * refI() * 150, nest + 0.05 * refI() * dt);
      if (t - lastTap > 3) streak = Math.max(0, streak - 0.03 * dt);
      // golden egg v0.5: unlock F8, first spawn 45 s, next gap starts when resolved
      if (K.golden && nextEgg === Infinity && s.farmLevel >= 8) nextEgg = opt.start ? t + R() * (K.golden.gapMin + K.golden.gapMax) / 2 : t + 45;
      if (K.golden && t >= nextEgg) { const got = R() < P.catchP, res = got ? 1 + 7 * R() : 30; nextEgg = t + res + K.golden.gapMin + R() * (K.golden.gapMax - K.golden.gapMin);
        if (got) { const inc = prodEggsPerSec(s, b) * priceDollars(s, b) * 100, r = R();
          if (r < 0.45) credit('golden', 45 * inc); else if (r < 0.80) frenzyUntil = t + 30;
          else if (s.farmLevel >= 20) credit('golden', 60 * inc); else { const e = Math.floor(60 * prodEggsPerSec(s, b)); s = { ...s, basket: s.basket + e }; add('golden', e * priceDollars(s, b) * 100); } } }
    }
    if (K.on && s.farmLevel >= 10) { const ab = WIDS.some(id => act(id, t)), fr = t < frenzyUntil; if (ab) ovl.tAbil += dt; if (fr) ovl.tFr += dt; if (ab && fr) ovl.tBoth += dt; }
    // taps
    let taps = 0;
    if (P.tap === 'ac7' || P.tap === 'idle') { if (t >= tapT) { tapT += V.tapInterval(); if (P.tap === 'ac7' || !s.workers.coop_hand) taps = 1; } }
    else while (t >= fixT) { fixT += 1 / (P.tap as number); taps++; }
    for (let k = 0; k < taps; k++) { s = apply(s, { type: 'collect' }, b, ev); drain(t);
      if (K.on && present && s.farmLevel >= 8 && t - lastCred >= 1.0 - 1e-9) { lastCred = t; lastTap = t; streak = Math.min(K.streakCap, streak + 0.01); credit('tapcoins', K.tapShare * refI()); } }
    // affordability (F10..max-1), and F30+ separately
    if (!opt.noBuy && Math.abs(t - Math.round(t)) < 1e-6) {
      const inR = s.farmLevel >= 10 && s.farmLevel < b.maxLevel, aff = !inR || candidates(s, b).some(c => s.coinsCents >= c.costCents);
      if (!aff) { if (noAffStart === null) noAffStart = t; } else if (noAffStart !== null) { longestNoAff = Math.max(longestNoAff, t - noAffStart); noAffStart = null; }
      const in30 = s.farmLevel >= 30 && s.farmLevel < b.maxLevel, aff30 = !in30 || aff;
      if (!aff30) { if (noAff30Start === null) noAff30Start = t; } else if (noAff30Start !== null) { longestNoAff30 = Math.max(longestNoAff30, t - noAff30Start); noAff30Start = null; }
      { let mA = !inR, bA = !inR, cheap = Infinity, cheapKey = '', cheapM = Infinity, cheapMKey = '', endKey: string | null = null, endKeyM: string | null = null;
        if (inR) for (const c of candidates(s, b)) { const g = gainOf(c.key), fw = c.key === 'FARM' || String(c.key)[0] === 'W';
          if ((g > 1e-9 || fw) && c.costCents < cheap) { cheap = c.costCents; cheapKey = c.key; } if (g > 1e-9 && c.costCents < cheapM) { cheapM = c.costCents; cheapMKey = c.key; }
          if (s.coinsCents < c.costCents) continue; if (g > 1e-9) { mA = bA = true; endKey ??= c.key; endKeyM ??= c.key; } else if (fw) { bA = true; endKey ??= c.key; } }
        const mk = (need: number, key: string) => ({ t0: t, F: s.farmLevel, C: s.collectionLevel, coins: s.coinsCents, need, key, ch: X().__ch ?? null, minCh: X().__ch ?? null, aslWS: 0, mhAsl: 0, chAsl: 0, tiredWS: 0, unpWS: 0, refA: rm.refA, refM: rm.refM, en: Object.fromEntries(WIDS.filter(id => s.workers[id]).map(id => [id, +s.workers[id]!.energy.toFixed(1)])) });
        const close = (c: any, L: number, k: string | null) => ({ ...c, len: L, endKey: k, endF: s.farmLevel, refA: rm.refA - c.refA, refM: rm.refM - c.refM });
        if (!bA) { if (bStart === null) { bStart = t; cur = mk(cheap, cheapKey); } } else if (bStart !== null) { const L = t - bStart; if (L > longestB) { longestB = L; worst = close(cur, L, endKey); } bStart = null; cur = null; }
        if (!mA) { if (mStart === null) { mStart = t; curM = mk(cheapM, cheapMKey); } } else if (mStart !== null) { const L = t - mStart; if (L > longestM) { longestM = L; worstM = close(curM, L, endKeyM); } mStart = null; curM = null; } }
    }
    if (t < sellT) continue;
    sellT = t + V.checkInterval(P.checkBase);
    s = apply(s, { type: 'sellAll' }, b, ev); drain(t);
    if (nest > 0) { credit('broody', nest); nest = 0; }
    // pause policy (K.pause): pause a worker at <=50% when Manage is on cooldown; resume + refill when Manage is ready
    const pat = K.pat ?? (K.pause ? 'yawn' : 'none');
    const doPause = (id: WorkerId) => { const w = s.workers[id]; if (!w || paused.has(id) || w.unpaid || w.energy <= 0) return; paused.set(id, w.energy); if (until[id] && t < until[id]) until[id] = t; };
    const resume = (id: WorkerId) => { const e = paused.get(id); if (e == null) return; paused.delete(id); if (id === 'market_hand') lockUntil = t + (K.lockoutS ?? 30); s = { ...s, workers: { ...s.workers, [id]: { ...s.workers[id]!, energy: e } } }; };
    if (K.on && pat !== 'none' && present && s.farmLevel >= 10) {
      if (pat === 'yawn') { for (const id of WIDS) { const w = s.workers[id]; if (w && id !== 'grader' && w.energy <= 50 && s.manageCdS > 1e-9) doPause(id); } if (s.manageCdS <= 1e-9) for (const id of [...paused.keys()]) resume(id); }
      if (pat === 'long') { for (const id of WIDS) { const w = s.workers[id]; if (w && id !== 'grader' && w.energy <= 50) doPause(id); } for (const [id, e] of [...paused]) if (e >= 100) resume(id); }
      if (pat === 'fullcoop') { // pause Coop Hand while the basket holds > 30 s of production (overstock), resume when it drops below 10 s
        const pr = prodEggsPerSec(s, b); if (s.basket > 30 * pr) doPause('coop_hand'); else if (s.basket < 10 * pr) resume('coop_hand'); }
      if (pat === 'stock') { const ra = readyAt.market_hand ?? 0; if (!paused.has('market_hand') && ra - t > 0 && ra - t <= 270) doPause('market_hand'); else if (paused.has('market_hand') && t >= ra) resume('market_hand'); }
      if (pat === 'bench') doPause('market_hand');
      if (pat === 'grader') { const w = s.workers.grader; if (w && !paused.has('grader') && w.energy <= 50) doPause('grader'); const e = paused.get('grader'); if (e != null && e >= 100) resume('grader'); }
      if (pat === 'wages') { doPause('market_hand'); doPause('coop_hand'); } // player collects + sells by hand at every check-in, skips W1/W2 wages, banks recovery
    }
    if ((b as any).__payWage && present !== undefined) { let res = 0; for (const id of ['market_hand', 'coop_hand'] as WorkerId[]) { const w = s.workers[id]; if (w && !w.unpaid && w.energy > 0) res += resumeNeedCents(id, s.farmLevel, b); }
      for (const id of ['market_hand', 'coop_hand'] as WorkerId[]) { const w = s.workers[id]; if (!w?.unpaid) continue; const need = resumeNeedCents(id, s.farmLevel, b); if (s.coinsCents < res + need) break; res += need; s = { ...s, workers: { ...s.workers, [id]: { ...w, unpaid: false, cdS: 0 } } }; rm.pays++; } }
    if (RC) { if (RC.manual) { const ids = PRIO.filter(id => elig(id) && eE(id) <= RTH + 1e-9 && (eE(id) <= RC.manAt + 1e-9 || X().__ch >= CAP)); for (const id of ids) if (X().__ch > 0) refillOne(id, 'm'); } }
    else if (s.manageCdS <= 1e-9) {
      const low = (Object.entries(s.workers) as [WorkerId, { energy: number }][]).filter(([id, w]) => !paused.has(id) && w.energy <= b.workers.energy.manage_prompt_threshold * 100).sort((a, c) => a[1].energy - c[1].energy);
      if (low.length) s = apply(s, showManageAll(s.workers, b) && low.length >= b.workers.energy.manage_all_min_workers ? { type: 'manageAll' } : { type: 'manage', worker: low[0][0] }, b);
    }
    if (opt.noBuy) continue;
    if (V.delay()) continue; V.cheapFirst();
    for (let g = 0; g < 200; g++) { const kind = pickBuy(s, b, 'seller15', false, [...M1_KEYS, 'W1', 'W2', 'W3', 'W4']); if (!kind) break; const nx = apply(s, pickAction(kind), b); if (nx === s) break; s = nx; buys.push(t);
      if (kind === 'f') { reach.set(s.farmLevel, t); if (opt.snapAt?.includes(s.farmLevel)) snaps.set(s.farmLevel, s); } }
  }
  if (bStart !== null && T - bStart > longestB) { longestB = T - bStart; worst = { ...cur, len: longestB, endKey: 'END' }; } if (mStart !== null && T - mStart > longestM) { longestM = T - mStart; worstM = { ...curM, len: longestM, endKey: 'END' }; }
  if (noAffStart !== null) longestNoAff = Math.max(longestNoAff, T - noAffStart); if (noAff30Start !== null) longestNoAff30 = Math.max(longestNoAff30, T - noAff30Start);
  const mech = Object.values(src).reduce((a, x) => a + x, 0);
  return { g4m: { bb5: longestB, strict: longestM, worst, worstM }, rm, tsnaps, ovl, reach, snaps, src, base, mech, baseF, srcF, longestNoAff, longestNoAff30, collTap, collW, final: s };
}
