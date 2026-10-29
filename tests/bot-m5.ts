// M5 bot (Q-ZG-H3 port, rc/v5): Economy's M5.0 full-stack runner scratch/v2-econ/h/m5.ts (sha256 29d423c5...) and its
// window-gate driver m5x.ts (sha256 196e8ed5...), ported verbatim as test tooling. Play logic, RNG draw order and arithmetic
// are unchanged. Results equal the original harness's on the same CSV and seeds with today's src (artifacts/bot-m5-parity, CSVs b48be8a4
// and 8dc90e2b): empirical, not structural (CCR O-1 on #78). The harness runs on its own src snapshot; on a CSV with L30+ columns the two
// would diverge, and the port is the one that follows the shipped game. Also ported (B): m5p/m5l + m5px/m5lx, see refillGate()/pressureRuns().
// Original header: real sim (src step/apply) + seller15 pickM4All bot (tests/bot-m4.ts), VAR_DEFAULT check-ins/taps, managed
// (30 s cooldown, refill at <= 50%). M5.0 mechanics are layered HERE only (none exist in src): credited tap = >= 1.0 s of sim
// time since the last credited tap (eggs moved or not); reference income I = trailing 60 s of PASSIVE sale coins (excl. golden
// cash, frenzy, abilities, Broody, tap coins, streak); streak cap 0.28; pause recovery 0.25x (1%/36 s), no output or wage.
// The mechanics model the specs for pacing only; they are not the shipping implementation (that lands behind m4.flags.*).
// Port changes vs m5.ts: import paths; types for strict tsc; an optional read-only `onEvents` / `onSecond` observer (used by
// `npm run verify -- --profile m5x-casual`); m5x.ts's top-level loop is `windowGate()` below. None of these changes a number.
import type { Balance } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import type { SimEvent } from '../src/sim/events';
import { showManageAll, type WorkerId, mood, graderMult } from '../src/sim/workers';
import { SellerVariance, VAR_DEFAULT } from './seller-variance';
import { pickBuy, pickAction, M1_KEYS } from './bot-m4';
import { candidates } from '../src/ui/next-goal';
import { optionGain, type BuyKey } from '../src/econ/best-buy';
import { priceDollars } from '../src/econ/income';
import { prodEggsPerSec, coopCap } from '../src/sim/tracks';
import { maxStepRatio, quantile, type PacingTargets } from './pacing-guards';
type B = Balance;
export interface Stack { on: boolean; streakCap: number; tapShare: number; broody: boolean; golden: { gapMin: number; gapMax: number } | null; abil: boolean; sweep: 'A' | 'B'; sweepMult: number; pause: boolean; pat?: 'none' | 'yawn' | 'long' | 'fullcoop' | 'wages' | 'stock' | 'bench' | 'grader'; lockoutS?: number; hold?: boolean; ssZero?: boolean; warm?: boolean; rc2?: RC2; }
/** M5.1 (m5p.ts 9eed2879 / m5l.ts e930c8c7): rc2 v1.2 Refill charges (regen 150 s, cap 2, Refillable <= 50%) replacing the Manage model, + call energy
 *  cost, + lighter-refill C2 auto-refill / D auto-rest. manAt: the manual bot refills at <= manAt, or at <= 50% when charges are at the cap.
 *  autoRestore (m5l lever a): an auto refill restores to max(energy, autoRestore) (default 100 = m5p). Unset = no charges (M5.0, m5.ts). */
export interface RC2 { cost: number; manual: boolean; manAt: number; auto: null | { at: number; reserve: number; rest: boolean; waive0?: boolean }; regen?: number; cap?: number; autoRestore?: number; }
/** m5p.ts per-second pressure series from F>=10 (st/ex/el) and the one-charge perturbation time. */
export interface Series { start: number; st: number[]; ex: number[]; el: number[]; pertT: number | null }
export interface Prof { tap: 'idle' | 'ac7' | number; checkBase: number; catchP: number; }
export const PROFS: Record<string, Prof> = { slow: { tap: 0.25, checkBase: 60, catchP: 0.4 }, idle: { tap: 'idle', checkBase: 15, catchP: 0 }, optimal: { tap: 3, checkBase: 5, catchP: 1 }, seller15: { tap: 'ac7', checkBase: 15, catchP: 0.75 }, casual: { tap: 0.5, checkBase: 30, catchP: 0.6 } };
const rng = (seed: number) => { let a = (seed * 2654435761 + 99) >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const WIDS: WorkerId[] = ['market_hand', 'coop_hand', 'hawker', 'grader'];
/** Bad driver input (CCR N-1/N-2 on #78): the CLIs exit 2 on it. */
export class BotUsageError extends Error {}
/** Own keys only (CCR N-1: `CF['__proto__']` / `PROFS['toString']` must not resolve to inherited members). */
const own = <T>(o: Record<string, T>, k: string): T | undefined => Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined;
/** Largest seed for which SellerVariance's PyRandom seed 1000003*(seed+1)+17 stays a safe integer (CCR N-2). */
export const MAX_SEED = Math.floor((Number.MAX_SAFE_INTEGER - 17) / 1000003) - 1;
/** Validates the numeric env of the drivers (same defaults as the originals, which never validated): SEEDS >= 1, S0 >= 0 and
 *  S0+SEEDS-1 <= MAX_SEED (integers), T > 0 and STEP > 0 (finite); any other listed key must be a finite number. */
export function checkEnv(E: Record<string, string | undefined>, extra: string[] = []): void {
  const num = (k: string, d: number) => { const v = E[k]; return v === undefined ? d : v.trim() === '' ? NaN : Number(v); };
  const NS = num('SEEDS', 200), S0 = num('S0', 1), T = num('T', 12000), STEP = num('STEP', 300);
  if (!Number.isSafeInteger(NS) || NS < 1) throw new BotUsageError(`SEEDS must be an integer >= 1, got ${E.SEEDS}`);
  if (!Number.isSafeInteger(S0) || S0 < 0) throw new BotUsageError(`S0 must be an integer >= 0, got ${E.S0}`);
  if (S0 + NS - 1 > MAX_SEED) throw new BotUsageError(`seeds must be <= ${MAX_SEED} (S0+SEEDS-1 = ${S0 + NS - 1})`);
  if (!(Number.isFinite(T) && T > 0)) throw new BotUsageError(`T must be a number > 0, got ${E.T}`);
  if (!(Number.isFinite(STEP) && STEP > 0)) throw new BotUsageError(`STEP must be a number > 0, got ${E.STEP}`);
  for (const k of extra) if (E[k] !== undefined && !Number.isFinite(num(k, 0))) throw new BotUsageError(`${k} must be a number, got ${E[k]}`);
}
/** CCR O-3 on #78: the bot layers its OWN model of the M5 mechanics (golden egg, streak, tap coins, Broody, abilities, pause) and of
 *  M5.1 Refill charges + C2 auto-refill (src: m4.flags.rc2Refill / autoRefill). It may do so only while the matching src flags are off; once src implements them behind m4.flags.*, a run with
 *  both would count them twice. So: a stack with `on` (or `rc2`) and any of those src flags on throws. Turn the bot model off
 *  (`on: false` / no `rc2`) to run on the src mechanics. clockWage is not in the list: the bot never models it (it is src-only). */
export const SRC_M5_FLAGS = ['golden', 'streak', 'tapCoins', 'broody', 'abilities', 'pause'] as const;
export const SRC_M51_FLAGS = ['rc2Refill', 'autoRefill'] as const; // manifest row 25: the M5.1 src refill piece (charges + C2 auto-refill)
export function assertNoDoubleModel(b: B, K: Stack): void {
  const m4 = (b as any).m4, f = m4?.flags ?? {}, onSrc = (k: string) => m4?.enabled === 1 && f[k] === 1;
  const both = [...(K.on ? SRC_M5_FLAGS.filter(onSrc) : []), ...(K.rc2 ? SRC_M51_FLAGS.filter(onSrc) : [])];
  if (both.length) throw new Error(`bot-m5: the bot's own M5 model and src m4.flags.${both.join('/m4.flags.')} are both on; that would double-count. Use a stack with ${K.on ? 'on: false' : ''}${K.on && K.rc2 ? ' and ' : ''}${K.rc2 ? 'no rc2' : ''} to run on the src mechanics.`);
}
/** Read-only observers (port addition): they see events and states, never change them. */
export interface RunOpts { start?: GameState; noBuy?: boolean; snapAt?: number[]; snapEveryS?: number;
  /** Every drained batch of sim events, with the run second it happened in. */ onEvents?: (t: number, evs: readonly SimEvent[]) => void;
  /** The state at the end of each run second (after taps, check-in and buys). */ onSecond?: (t: number, s: GameState) => void;
  /** m5p.ts: per-second pressure series (filled in place) and one-charge perturbation at F20 reach (+1 grant / -1 remove; 0 = play identical). */
  series?: Series; pert?: number;
  /** QA seam Q4 (observe-only): called with a deep clone of the state after every action the bot applies (`action` = the action type)
   *  and at every buy check (`buyCheck`, before the buy loop). The clone means the callback cannot alias or mutate the run's state. */
  onObserve?: (kind: 'action' | 'buyCheck', action: string, t: number, s: GameState) => void; }
export function run(bal: B, seed: number, P: Prof, K: Stack, T: number, opt: RunOpts = {}) {
  assertNoDoubleModel(bal, K);
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
  const refillOne = (id: WorkerId, by: 'm' | 'a') => { const rest = { ...X().__rest }; delete rest[id]; s = { ...s, workers: { ...s.workers, [id]: { ...s.workers[id]!, energy: by === 'a' ? Math.max(s.workers[id]!.energy, RC!.autoRestore ?? 100) : 100 } }, __ch: X().__ch - 1, __rest: rest } as any;
    obs('refill:' + by, curT); if (by === 'm') { rm.refM++; if (s.farmLevel >= 10) rm.refM10++; } else { rm.refA++; if (s.farmLevel >= 10) rm.refA10++; } };
  const elig = (id: WorkerId) => { const w = s.workers[id]; return !!w && !w.unpaid && !paused.has(id); };
  const obs = (a: string, t: number) => { if (opt.onObserve) opt.onObserve('action', a, t, structuredClone(s)); };
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
  const drain = (t: number) => { if (opt.onEvents && ev.length) opt.onEvents(t, ev); for (const e of ev) {
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
  let prevT = 0;
  for (let i = 1; i <= n; i++) {
    const t = Math.round(i * dt * 10) / 10; curT = t;
    if (opt.onSecond && i > 1 && Math.abs(prevT - Math.round(prevT)) < 1e-6) opt.onSecond(prevT, s); prevT = t;
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
        if (id === 'grader' && !(s.graderTier > 0)) continue; if ((id === 'market_hand' || id === 'hawker') && t < lockUntil) continue; if (t >= (readyAt[id] ?? 0) && (!K.hold || t < frenzyUntil)) { const cst = RC?.cost ?? 0; if (cst > 0 && (w.energy < cst + 1 || X().__rest?.[id] != null)) continue; readyAt[id] = t + 300; until[id] = t + 30; if (cst > 0) s = { ...s, workers: { ...s.workers, [id]: { ...s.workers[id]!, energy: w.energy - cst } } }; obs('activate:' + id, t); } }
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
    for (let k = 0; k < taps; k++) { s = apply(s, { type: 'collect' }, b, ev); drain(t); obs('collect', t);
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
    s = apply(s, { type: 'sellAll' }, b, ev); drain(t); obs('sellAll', t);
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
    if (RC) { if (RC.manual) { const ids = PRIO.filter(id => elig(id) && eE(id) <= RTH + 1e-9 && (eE(id) <= RC.manAt + 1e-9 || X().__ch >= CAP)); for (const id of ids) if (X().__ch > 0) refillOne(id, 'm'); } }
    else if (s.manageCdS <= 1e-9) {
      const low = (Object.entries(s.workers) as [WorkerId, { energy: number }][]).filter(([id, w]) => !paused.has(id) && w.energy <= b.workers.energy.manage_prompt_threshold * 100).sort((a, c) => a[1].energy - c[1].energy);
      if (low.length) { const a = showManageAll(s.workers, b) && low.length >= b.workers.energy.manage_all_min_workers ? { type: 'manageAll' as const } : { type: 'manage' as const, worker: low[0][0] }; s = apply(s, a, b); obs(a.type, t); }
    }
    if (opt.noBuy) continue;
    if (V.delay()) continue; V.cheapFirst(); if (opt.onObserve) opt.onObserve('buyCheck', 'buyCheck', t, structuredClone(s));
    for (let g = 0; g < 200; g++) { const kind = pickBuy(s, b, 'seller15', false, [...M1_KEYS, 'W1', 'W2', 'W3', 'W4']); if (!kind) break; const nx = apply(s, pickAction(kind), b); if (nx === s) break; s = nx; buys.push(t); obs('buy:' + kind, t);
      if (kind === 'f') { reach.set(s.farmLevel, t); if (opt.snapAt?.includes(s.farmLevel)) snaps.set(s.farmLevel, s); } }
  }
  if (bStart !== null && T - bStart > longestB) { longestB = T - bStart; worst = { ...cur, len: longestB, endKey: 'END' }; } if (mStart !== null && T - mStart > longestM) { longestM = T - mStart; worstM = { ...curM, len: longestM, endKey: 'END' }; }
  if (opt.onSecond && n > 0 && Math.abs(prevT - Math.round(prevT)) < 1e-6) opt.onSecond(prevT, s);
  if (noAffStart !== null) longestNoAff = Math.max(longestNoAff, T - noAffStart); if (noAff30Start !== null) longestNoAff30 = Math.max(longestNoAff30, T - noAff30Start);
  const mech = Object.values(src).reduce((a, x) => a + x, 0);
  return { g4m: { bb5: longestB, strict: longestM, worst, worstM }, rm, tsnaps, ovl, reach, snaps, src, base, mech, baseF, srcF, longestNoAff, longestNoAff30, collTap, collW, final: s };
}

// ---- m5x.ts (window gate) as a function. Output objects and key order are m5x.ts's, so JSON.stringify matches byte for byte.
/** m5x.ts's stacks: `none` = no mechanics, `AssZ` = the full M5.0 stack, `AssZhold` = AssZ holding calls for a Frenzy. */
export const M5X_BASE: Stack = { on: true, streakCap: 0.28, tapShare: 0.03, broody: true, golden: { gapMin: 120, gapMax: 300 }, abil: true, sweep: 'A', sweepMult: 1.15, pause: false, warm: true, ssZero: true };
export const M5X_STACKS: Record<string, Stack> = { none: { ...M5X_BASE, on: false }, AssZ: M5X_BASE, AssZhold: { ...M5X_BASE, hold: true } };
export interface GateOpts { cfgs: string[]; profs: string[]; seeds: number; s0: number; T: number; step: number; stepFrom: number; noWin: boolean; targets: PacingTargets; onResult?: (key: string, o: any) => void;
  /** QA seam Q4: observe-only hook passed to every seed's main run (not the 10-min window runs). Outputs are identical with or without it. */ onObserve?: RunOpts['onObserve'] }
/** m5x.ts env defaults: SEEDS 200, S0 1, T 12000, STEP 300, STEP_FROM 30, CFG AssZ, PROFS optimal,seller15,casual, NOWIN off. */
export function gateOptsFromEnv(env: Record<string, string | undefined>, targets: PacingTargets): GateOpts {
  checkEnv(env, ['STEP_FROM']);
  return { cfgs: (env.CFG ?? 'AssZ').split(','), profs: (env.PROFS ?? 'optimal,seller15,casual').split(','), seeds: +(env.SEEDS ?? 200), s0: +(env.S0 ?? 1),
    T: +(env.T ?? 12000), step: +(env.STEP ?? 300), stepFrom: +(env.STEP_FROM ?? 30), noWin: env.NOWIN === '1', targets };
}
/** The window gate of m5x.ts: every 10-min window from F10 (starts every `step` s), active stack vs the idle bot from the same
 *  state and seed; step ratio from L`stepFrom`; active premium by band. Returns `{ [cfg|prof]: result }` in m5x.ts's order. */
export function windowGate(b: B, g: GateOpts): Record<string, any> {
  const SF = g.stepFrom, NOWIN = g.noWin, NS = g.seeds, S0 = g.s0, T = g.T, STEP = g.step, tg = g.targets, CF = M5X_STACKS;
  const q = (a: number[], p: number) => { const x = a.filter(Number.isFinite); return x.length ? quantile(x, p) : NaN; }, mx = (a: number[]) => Math.max(...a.filter(Number.isFinite));
  const out: Record<string, any> = {};
  for (const ck of g.cfgs) for (const pf of g.profs) {
    const K = own(CF, ck), P = own(PROFS, pf); if (!K || !P) throw new BotUsageError(`windowGate: unknown ${!K ? `CFG ${ck}` : `profile ${pf}`}`);
    const seedMax: number[] = [], all: number[] = [], byBand: Record<string, number[]> = { 'F10-17': [], 'F18-23': [], 'F24-29': [], 'F30+': [] }, step: number[] = [], noAff: number[] = [], reachMax: number[] = [], prem: Record<string, number[]> = { 'F10-19': [], 'F20-29': [], 'F30+': [] };
    for (let i = 0; i < NS; i++) { const seed = S0 + i, r = run(b, seed, P, K, T, { snapEveryS: K.on ? STEP : undefined, onObserve: g.onObserve });
      step.push(maxStepRatio(r.reach, SF, tg.step_ratio_min_prev_s) ?? NaN); noAff.push(r.longestNoAff); reachMax.push(r.reach.has(b.maxLevel) ? 1 : 0);
      let m = 0; if (K.on && !NOWIN) for (const [t, F, st] of r.tsnaps) { const a = run(b, seed * 7919 + Math.round(t), P, K, 600, { start: st, noBuy: true }), z = run(b, seed * 7919 + Math.round(t), PROFS.idle, CF.none, 600, { start: st, noBuy: true });
        const ca = a.final.coinsCents - st.coinsCents, cz = z.final.coinsCents - st.coinsCents; if (!(cz > 0)) continue; const x = ca / cz; all.push(x); m = Math.max(m, x);
        byBand[F < 18 ? 'F10-17' : F < 24 ? 'F18-23' : F < 30 ? 'F24-29' : 'F30+'].push(x); }
      seedMax.push(m);
      if (K.on) for (const bd of Object.keys(prem)) { const keys = Object.keys(r.src).filter(k => k.startsWith(bd + ':')); const mech = keys.reduce((a, k) => a + r.src[k], 0); let base = 0; for (const [F, v] of r.baseF) if ((bd === 'F10-19' && F >= 10 && F < 20) || (bd === 'F20-29' && F >= 20 && F < 30) || (bd === 'F30+' && F >= 30)) base += v; if (base > 0) prem[bd].push(mech / base); }
    }
    const o: any = { cfg: ck, prof: pf, maxLevel: b.maxLevel, reachedMax: reachMax.reduce((a, x) => a + x, 0), G4_noAff_F10_to_max: [+q(noAff, .5).toFixed(1), +q(noAff, .95).toFixed(1), +mx(noAff).toFixed(1)], windows: all.length, stepFrom: SF, stepL30: [+q(step, .95).toFixed(3), +mx(step).toFixed(3)] };
    if (K.on) { o.win = { P95_allWindows: +q(all, .95).toFixed(3), P95_ofSeedMax: +q(seedMax, .95).toFixed(3), worstSeed: +mx(seedMax).toFixed(3), median: +q(all, .5).toFixed(3) };
      o.byBand = Object.fromEntries(Object.entries(byBand).map(([k, v]) => [k, [+q(v, .5).toFixed(2), +q(v, .95).toFixed(2), v.length ? +mx(v).toFixed(2) : null]]));
      o.premium = Object.fromEntries(Object.entries(prem).map(([k, v]) => [k, [+(100 * q(v, .5)).toFixed(1), +(100 * q(v, .95)).toFixed(1)]])); }
    out[ck + '|' + pf] = o; g.onResult?.(ck + '|' + pf, o);
  }
  return out;
}

// ---- m5lx.ts 7123fc25 (M5.1 refill gate, on m5l.ts e930c8c7) as a function. Output objects and key order are m5lx.ts's (artifacts/m51-o1a).
// Not ported: the H2a/H1 plumbing (m5lx L16 sets __clockWage / __payWage on the balance from env CLOCK / PAYWAGE). CLOCK / PAYWAGE are only
// echoed in the output, as m5lx does. Clock wage is src behaviour (the M5.1 src piece, m4.flags.clockWage), so scripts/bot-m5lx.ts refuses CLOCK=1
// on a tree without it.
export interface RefillIO { csv: string; sha: string; log?: (line: string) => void; perSeed?: (path: string, json: string) => void }
/** m5lx.ts driver. Env: AT RES REST WAIVE MANAT COST HOLD(1) NOWIN PROFS SEEDS S0 T STEP CFG WIN REGEN CAP ARES PERSEED (CLOCK, PAYWAGE echoed). */
export function refillGate(b: B, E: Record<string, string | undefined>, tg: PacingTargets, io: RefillIO): Record<string, any> {
  checkEnv(E, ['AT', 'RES', 'MANAT', 'COST', 'REGEN', 'CAP', 'ARES']);
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
  const out: any = { LEV, ARES, csv: io.csv, sha: io.sha, seeds: [S0, S0 + NS - 1], T, STEP, HOLD, COST, MANAT, AUTO, WIN };
  for (const ck of (E.CFG ?? 'base').split(',')) for (const pf of (E.PROFS ?? 'optimal,seller15,casual').split(',')) {
    const K = own(CF, ck), P = own(PROFS, pf); if (!K || !P) throw new BotUsageError(`refillGate: unknown ${!K ? `CFG ${ck}` : `profile ${pf}`}`); const mech = K.on;
    const KW: Record<string, [Stack, any]> = ck === 'off' ? { man: [K, P], idle: [CF.offnone, PROFS.idle] } : { man: [{ ...K, rc2: rcMan }, P], auto: [{ ...K, rc2: rcAuto }, P], idle: [CF.none, PROFS.idle], idleA: [CF.noneA, PROFS.idle] };
    const wk = ck === 'off' ? ['man', 'idle'] : WIN; const W: Record<string, number[]> = {}; const seedMax: Record<string, number[]> = {}; const ratios = ['man/idle', 'auto/idle', 'man/idleA', 'auto/idleA', 'auto/man'];
    for (const r of ratios) { W[r] = []; seedMax[r] = []; }
    const per: any[] = [], unp: number[] = [], unp0: number[] = [], noAff: number[] = [], step: number[] = [], L10: number[] = [], L18: number[] = [], L30: number[] = [], sc8: number[] = [], refM: number[] = [], refA: number[] = [], asl: number[] = [], mhA: number[] = [], restS: number[] = [], inc: number[] = [], prem: Record<string, number[]> = { 'F10-19': [], 'F20-29': [] };
    let SC8T = 0, L17T = 0; const bb5: number[] = [], strict: number[] = [], sc29: number[] = [], sc30: number[] = [], tog: number[] = [], tog10: number[] = [], unpE: number[] = []; let worst: any = null, worstM: any = null, SC29T = 0, T29 = 0;
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
    if (E.PERSEED) io.perSeed?.(E.PERSEED + '.' + ck + '.' + pf + '.json', JSON.stringify({ cols: ['seed', 'bb5', 'strict', 'anyRow', 'sc29', 'sc10plus', 'incF10_29', 'toggles', 'unpaidEntries', 't29'], rows: per }));
    if (mech) o.premium = Object.fromEntries(Object.entries(prem).map(([k, v]) => [k, [+(100 * q(v, .5)).toFixed(1), +(100 * q(v, .95)).toFixed(1)]]));
    if (mech && !NOWIN) o.win = Object.fromEntries(ratios.filter(k => W[k].length).map(k => [k, { n: W[k].length, P95_all: r3(q(W[k], .95)), P95_seedMax: r3(q(seedMax[k], .95)), worstSeed: r3(mx(seedMax[k])), median: r3(q(W[k], .5)), min: r3(mn(W[k])), P5: r3(q(W[k], .05)) }]));
    out[ck + '|' + pf] = o; io.log?.(JSON.stringify(o));
  }
  return out;
}

// ---- m5px.ts c20ad937 (M5.2 pressure-metric driver, on m5p.ts 9eed2879) as a function. Same files, line format and stderr as m5px.ts (artifacts/m52-o1a).
// Not ported: m5px L8 (__clockWage = true; __payWage = false on the balance, H2a/H1 plumbing). Clock wage is src behaviour (M5.1 src piece).
/** m5px.ts stack S (session stack): full M5.0 stack, pause false, warm, ssZero, hold. */
export const M5PX_STACK: Stack = { on: true, streakCap: 0.28, tapShare: 0.03, broody: true, golden: { gapMin: 120, gapMax: 300 }, abil: true, sweep: 'A', sweepMult: 1.15, pause: false, warm: true, ssZero: true, hold: true };
/** m5px.ts RC2 arms: off = flag-off manual (MANAT 32), on = C2 auto-refill only (at 30, reserve 0, rest off, waive0 false). regen/cap unset = 150 s / 2. */
export const M5PX_RC2: Record<'on' | 'off', RC2> = (() => { const off: RC2 = { cost: 10, manual: true, manAt: 32, auto: null }; return { off, on: { ...off, manual: false, auto: { at: 30, reserve: 0, rest: false, waive0: false } } }; })();
const enc = (a: number[]) => String.fromCharCode(...a.map(x => 48 + x));
/** One m5px.ts jsonl row (key order as m5px) plus the run's Asleep<->Unpaid toggle counts (MH + Coop Hand, m5s/m5lx definition). */
export function pressureSeed(b: B, seed: number, pf: string, ck: 'on' | 'off', pert: number, onObserve?: RunOpts['onObserve']) {
  const P = own(PROFS, pf); if (!P) throw new BotUsageError(`pressureSeed: unknown profile ${pf}`);
  const z: Series = { start: -1, st: [], ex: [], el: [], pertT: null };
  const r = run(b, seed, P, { ...M5PX_STACK, rc2: M5PX_RC2[ck] }, 12000, { series: z, pert, onObserve });
  const row = { seed, t10: r.reach.get(10) ?? null, t30: r.reach.get(30) ?? null, start: z.start, st: enc(z.st), ex: enc(z.ex), el: enc(z.el), pertT: z.pertT, sc29: r.rm.t29 > 0 ? r.rm.scT29 / r.rm.t29 : null, bb5: r.g4m.bb5 };
  const rm = r.rm, tog = { seed, tog: rm.tog, tog10: rm.tog10, tAll: +rm.tAll.toFixed(1), t10: +rm.t10.toFixed(1), per30m_all: rm.tAll > 0 ? +(rm.tog / rm.tAll * 1800).toFixed(4) : null, per30m_F10: rm.t10 > 0 ? +(rm.tog10 / rm.t10 * 1800).toFixed(4) : null, unpEnter: rm.unpEnter };
  return { row, tog };
}
export interface PressureIO { reset: (file: string) => void; append: (file: string, line: string) => void; log?: (line: string) => void; tog?: (file: string, json: string) => void }
/** m5px.ts driver. Env: PROFS (optimal,seller15,casual) CFGS (on,off) PERT (0) SEEDS (200) S0 (1) OUT (required) TOG (optional toggle sidecar prefix). */
export function pressureRuns(b: B, E: Record<string, string | undefined>, io: PressureIO) {
  checkEnv(E, ['PERT']); const NS = +(E.SEEDS ?? 200), S0 = +(E.S0 ?? 1), PERT = +(E.PERT ?? 0), OUT = E.OUT; if (!OUT) throw new BotUsageError('pressureRuns: OUT is required');
  for (const pf of (E.PROFS ?? 'optimal,seller15,casual').split(',')) if (!own(PROFS, pf)) throw new BotUsageError(`pressureRuns: unknown profile ${pf}`);
  for (const pf of (E.PROFS ?? 'optimal,seller15,casual').split(',')) for (const ck of (E.CFGS ?? 'on,off').split(',')) {
    if (ck !== 'on' && ck !== 'off') throw new BotUsageError(`pressureRuns: unknown CFGS ${ck}`);
    const f = `${OUT}.${pf}.${ck}.p${PERT}.jsonl`; io.reset(f); const togs: any[] = [];
    for (let i = 0; i < NS; i++) { const { row, tog } = pressureSeed(b, S0 + i, pf, ck, PERT); io.append(f, JSON.stringify(row) + '\n'); togs.push(tog); }
    if (E.TOG) io.tog?.(`${E.TOG}.${pf}.${ck}.p${PERT}.json`, JSON.stringify({ prof: pf, cfg: ck, pert: PERT, d6Bar: 12, def: 'Asleep<->Unpaid mood flips of market_hand + coop_hand per 1800 s of run time (m5s/m5lx rm.tog)', rows: togs }));
    io.log?.([pf, ck, 'p' + PERT, 'done'].join(' '));
  }
}
