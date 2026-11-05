// K10 breeds offset harness (engineering/decisions.md 2026-10-25 03:52 item (6); D-HOP-2026-10-24-47 B4 offset test).
// Port of Economy's B4 harness of record (scratch/m51-econ, record b4-record.md sha1 0bf46920): ac22/tap/g1csv.ts (sha256 45e403e6...)
// -> g1tap.ts (f7a1138b...) -> m5tap.ts (b7ee9c81...) + h/breeds.ts (76c07ecf...). Breeds do not exist in src on rc/v5, so the breeds
// layer is modelled HERE exactly as the scratch harness models it (Present = extra eggs into the coop on calm-gated sim frames,
// Broody = nest share scale; nothing enters incomePerSec / planner reads, BR-BB2). Test tooling only; not the shipping implementation.
// Port changes vs the scratch files (none changes a number): import paths and strict types; m5tap's process.env reads come from an
// explicit RunEnv argument; breeds.ts's module-level ROSTER / BC0 (mutated in place by g1csv.ts) become a per-run roster and bc block
// read from the CSV's bc_* columns (bcFromCsv), so nothing global is mutated; bc_incubators comes from the CSV instead of env CSV;
// run() refuses to double-model a mechanic whose src m4.flags.* is on (same rule as tests/bot-m5.ts O-3, plus breeds).
// m5tap's own header: real sim (src step/apply) + seller15 pickM4All bot (tests/bot-m4.ts), VAR_DEFAULT check-ins/taps, managed
// (30 s cooldown, refill at <= 50%). M5.0 mechanics are layered here only: credited tap = >= 1.0 s sim time since last credited tap;
// reference income I = trailing 60 s of PASSIVE sale coins; streak cap from the stack; pause recovery 0.25x.
import type { Balance } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import type { SimEvent } from '../src/sim/events';
import { showManageAll, type WorkerId, mood, graderMult } from '../src/sim/workers';
import { farmCost } from '../src/sim/state';
import { SellerVariance, VAR_DEFAULT } from './seller-variance';
import { pickBuy, pickAction, M1_KEYS } from './bot-m4';
import { candidates } from '../src/ui/next-goal';
import { incomePerSec, priceDollars } from '../src/econ/income';
import { prodEggsPerSec, coopCap } from '../src/sim/tracks';
import { maxStepRatio, quantile, type PacingTargets } from './pacing-guards';
import { flagOn, type M5Flag } from '../src/config/flags';
type B = Balance;
/** m5tap.ts env knobs (GATE / CALM_N / CALM_W / CALM_K / BURST_K / BURST_W / TAPX / TAPY), same names and defaults. */
export type RunEnv = Partial<Record<'GATE' | 'CALM_N' | 'CALM_W' | 'CALM_K' | 'BURST_K' | 'BURST_W' | 'TAPX' | 'TAPY', string>>;
/** Same rule as tests/bot-m5.ts assertNoDoubleModel, plus `breeds` when the stack models breeds. */
export const SRC_M5_FLAGS = ['golden', 'streak', 'tapCoins', 'broody', 'abilities', 'pause'] as const satisfies readonly M5Flag[];
export function assertNoDoubleModel(b: B, K: Stack): void {
  const both: string[] = K.on ? SRC_M5_FLAGS.filter(k => flagOn(b, k)) : [];
  if (K.breeds && flagOn(b, 'breeds')) both.push('breeds');
  if (both.length) throw new Error(`k10-breeds-offset models M5 itself; src m4.flags.${both.join('/m4.flags.')} is also on, which would double-count`);
}

// ---- breeds layer (h/breeds.ts 76c07ecf) ----
export type Fam = 'present' | 'away' | 'broody'; type Rar = 'C' | 'R' | 'E' | 'L';
export type Roster = Record<string, [Fam, Rar, number]>;
export const ROSTER: Roster = { leghorn: ['present', 'C', 250], sussex: ['away', 'C', 1500], orpington: ['broody', 'C', 1000],
  rhode_island_red: ['present', 'R', 300], brahma: ['away', 'R', 2000], ayam_cemani: ['present', 'E', 350], cochin: ['broody', 'E', 1500], cream_legbar: ['present', 'L', 400] };
export const BC0 = { unlock: 10, slot2: 14, slot3: 20, rareF: 14, legF: 24, costS: 45, farmShareBp: 10000, minCents: 50000, hatchS: 60, settleS: 300,
  w: { C: 70, R: 22, E: 7, L: 1 } as Record<Rar, number>, pityAfter: 8, starCap: 2, starBp: 2500, layLt18: 700, lay: 1500, away: 3000, broody: 2000 , presentScale: 1, incubators: 1 }; // layLt18 = bc_lay_cap_bp_lt18 (700 per D-HOP-31a and the draft CSV; was 1000)
/** forcedSettle (K10 port addition, Saves tick note f366a945 item 1 / BR-R4): with policy 'forced', each slot's idealised breed applies only
 *  bc_settle_s after that slot first unlocks (slot open time recorded at the end of the tick, in integer ms). Off = the scratch upper bound (parity). */
export type BCfg = { policy: 'none' | 'farmfirst' | 'greedy' | 'forced'; loadout: 'present' | 'g1max'; bc?: Partial<typeof BC0>; forcedSettle?: boolean };
export interface BS { owned: Record<string, number>; slots: string[]; placedAt: Record<string, number>; inc: { breed: string; remMs: number } | null; slotOpenMs?: number[]; hatches: number; pity: number; rng: number; free: boolean; spentC: number; tStart?: number; tComplete?: number; presentEggs: number; hatchTimes: number[] }
export const bsInit = (seed: number): BS => ({ owned: {}, slots: [], placedAt: {}, inc: null, hatches: 0, pity: 0, rng: (seed * 2246822519 + 7) >>> 0, free: false, spentC: 0, presentEggs: 0, hatchTimes: [] });
export const bsClone = (x: BS): BS => JSON.parse(JSON.stringify(x));
export class Breeds {
  bc: typeof BC0; roster: Roster; constructor(public cfg: BCfg, roster: Roster = ROSTER) { this.roster = roster; this.bc = { ...BC0, ...(cfg.bc ?? {}), w: { ...BC0.w, ...((cfg.bc as any)?.w ?? {}) } }; if (this.bc.incubators !== 1) throw new Error(`bc_incubators ${this.bc.incubators}: this model has 1 incubator`); }
  /** forcedSettle: number of forced slots whose 300 s settle has elapsed at t (slots open in order, so the first k are settled). */
  settledForced(bs: BS, F: number, t: number) { const n = this.slotsAt(F), tMs = Math.round(t * 1000), o = bs.slotOpenMs ?? []; let k = 0; while (k < n && o[k] != null && tMs - o[k] >= this.bc.settleS * 1000) k++; return k; }
  slotsAt(F: number) { const c = this.bc; return (F >= c.unlock ? 1 : 0) + (F >= c.slot2 ? 1 : 0) + (F >= c.slot3 ? 1 : 0); }
  trait(id: string, st: number) { return Math.floor(this.roster[id][2] * (10000 + st * this.bc.starBp) / 10000); }
  cap(f: Fam, F: number) { const c = this.bc; return f === 'present' ? (F < 18 ? c.layLt18 : c.lay) : f === 'away' ? c.away : c.broody; }
  /** applied bp per family (settled slotted breeds only; 'forced' = idealised loadout from F, ignores rarity gates and hatch costs: upper bound) */
  fam(bs: BS, f: Fam, F: number, t: number): number {
    if (this.cfg.policy === 'none') return 0;
    if (this.cfg.policy === 'forced') { const n = this.cfg.forcedSettle ? this.settledForced(bs, F, t) : this.slotsAt(F); if (!n) return 0;
      const pres = [this.trait('cream_legbar', 2), this.trait('ayam_cemani', 2), this.trait('rhode_island_red', 2)];
      if (this.cfg.loadout === 'present') return f === 'present' ? Math.min(this.cap('present', F), pres.slice(0, n).reduce((a, x) => a + x, 0)) : 0;
      if ((this.cfg.loadout as string) === 'cochonly') return f === 'broody' ? Math.min(this.cap('broody', F), this.trait('cochin', 2)) : 0; // Econ scratch 2026-10-24: Cochin alone (G1 worst case under the calm gate)
      // g1max: slot 1 = Cochin 2* (2250 -> broody clamp 2000), remaining slots = best Present
      if (f === 'broody') return Math.min(this.cap('broody', F), this.trait('cochin', 2)); if (f === 'present') return Math.min(this.cap('present', F), pres.slice(0, n - 1).reduce((a, x) => a + x, 0)); return 0; }
    let s = 0; for (const id of bs.slots) if (this.roster[id][0] === f && Math.round(t * 1000) - Math.round((bs.placedAt[id] ?? 1e18) * 1000) >= this.bc.settleS * 1000) s += this.trait(id, bs.owned[id]); return Math.min(this.cap(f, F), s);
  }
  private r(bs: BS) { let a = bs.rng = (bs.rng + 0x6D2B79F5) >>> 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }
  eligible(bs: BS, F: number) { const c = this.bc; return Object.keys(this.roster).filter(id => (bs.owned[id] ?? -1) < c.starCap && (this.roster[id][1] === 'C' || (this.roster[id][1] === 'L' ? F >= c.legF : F >= c.rareF))); }
  complete(bs: BS) { return Object.keys(this.roster).every(id => (bs.owned[id] ?? -1) >= this.bc.starCap); }
  roll(bs: BS, F: number): string | null {
    let el = this.eligible(bs, F); if (!el.length) return null;
    if (!bs.free) { const cm = el.filter(id => this.roster[id][1] === 'C'); return cm.length ? cm[Math.floor(this.r(bs) * cm.length)] : null; }
    const rp = el.filter(id => this.roster[id][1] !== 'C'); if (bs.pity >= this.bc.pityAfter - 1 && rp.length) el = rp;
    const byR: Partial<Record<Rar, string[]>> = {}; for (const id of el) (byR[this.roster[id][1]] ??= []).push(id);
    const rs = Object.keys(byR) as Rar[], tot = rs.reduce((a, k) => a + this.bc.w[k], 0); let u = this.r(bs) * tot;
    for (const k of rs) { u -= this.bc.w[k]; if (u <= 0 || k === rs[rs.length - 1]) { const l = byR[k]!; return l[Math.floor(this.r(bs) * l.length)]; } } return null;
  }
  costCents(s: GameState, b: any): number { const c = this.bc; if (!this.cfgHatches()) return Infinity;
    const ref = Math.round(incomePerSec(s, b, { assumeWorking: true }) * 100); const fc = Math.floor((Math.round(farmCost(Math.min(s.farmLevel, b.maxLevel), b) * 100) * c.farmShareBp + 5000) / 10000); // house rounding (spec BR-R5 rev 5, HoE R2)
    return Math.max(c.minCents, Math.min(ref * c.costS, fc)); }
  cfgHatches() { return this.cfg.policy === 'farmfirst' || this.cfg.policy === 'greedy'; }
  /** sim-frame tick, run at the END of the tick after production and sales (Saves note f366a945 item 1): incubator in integer ms
   *  (dtMs = 1000/tickHz = 100, asserted), reveal adds the breed to `owned` only (slotting happens at a check-in), so a reveal changes
   *  no eggs or coins on its own tick. Forced policy: records when each slot first opens (settle clock for forcedSettle). */
  tick(bs: BS, dt: number, t: number, F: number) { const dtMs = Math.round(dt * 1000); if (dtMs !== 100 || Math.abs(dt * 1000 - dtMs) > 1e-9) throw new Error(`k10 breeds: dt must be 1/tickHz = 100 ms, got ${dt * 1000} ms`);
    if (this.cfg.policy === 'forced') { const n = this.slotsAt(F), o = (bs.slotOpenMs ??= []); for (let k = 0; k < n; k++) if (o[k] == null) o[k] = Math.round(t * 1000); }
    if (!bs.inc) return; bs.inc.remMs -= dtMs; if (bs.inc.remMs > 0) return;
    const id = bs.inc.breed; bs.owned[id] = id in bs.owned ? bs.owned[id] + 1 : 0; bs.inc = null; if (this.complete(bs)) bs.tComplete = t; }
  /** check-in: maybe start a hatch (returns cents spent), then re-optimise the loadout */
  checkin(s: GameState, b: any, bs: BS, t: number): number {
    let spent = 0; const F = s.farmLevel;
    if (this.cfgHatches() && F >= this.bc.unlock && !bs.inc && !this.complete(bs)) {
      const cost = bs.free ? this.costCents(s, b) : 0;
      let go = s.coinsCents >= cost;
      if (go && bs.free && this.cfg.policy === 'farmfirst' && F < b.maxLevel) { const inc = incomePerSec(s, b, { assumeWorking: true }) * 100; const eta = (farmCost(F, b) * 100 - s.coinsCents) / Math.max(inc, 1e-9); go = eta > 2 * this.bc.costS; }
      if (go) { const id = this.roll(bs, F); if (id) { if (bs.tStart == null) bs.tStart = t; const wasFree = !bs.free; bs.free = true; spent = wasFree ? 0 : cost; bs.spentC += spent; bs.hatches++; bs.hatchTimes.push(t);
          if (this.roster[id][1] === 'C') bs.pity++; else bs.pity = 0; bs.inc = { breed: id, remMs: this.bc.hatchS * 1000 }; } }
    }
    if (this.cfg.policy !== 'forced' && this.cfg.policy !== 'none') { // loadout: best by objective among owned
      const n = this.slotsAt(F), own = Object.keys(bs.owned);
      const score = (id: string) => { const [f] = this.roster[id]; const v = this.trait(id, bs.owned[id]); return this.cfg.loadout === 'g1max' ? (f === 'broody' ? 1e6 + v : f === 'present' ? v : -1) : (f === 'present' ? v : f === 'broody' ? v / 100 : -1); };
      const want = own.filter(id => score(id) >= 0).sort((a, c) => score(c) - score(a));
      // greedy per family clamp: don't add a breed whose family is already at clamp
      const pick: string[] = []; const sum: Record<string, number> = {}; for (const id of want) { if (pick.length >= n) break; const f = this.roster[id][0]; if ((sum[f] ?? 0) >= this.cap(f, F)) continue; pick.push(id); sum[f] = (sum[f] ?? 0) + this.trait(id, bs.owned[id]); }
      for (const id of pick) if (!bs.slots.includes(id)) bs.placedAt[id] = t; for (const id of bs.slots) if (!pick.includes(id)) delete bs.placedAt[id]; bs.slots = pick;
    }
    return spent;
  }
}

// ---- runner (ac22/tap/m5tap.ts b7ee9c81) ----
export interface Stack { on: boolean; streakCap: number; tapShare: number; broody: boolean; golden: { gapMin: number; gapMax: number } | null; abil: boolean; sweep: 'A' | 'B'; sweepMult: number; pause: boolean; pat?: 'none' | 'yawn' | 'long' | 'fullcoop' | 'wages' | 'stock' | 'bench' | 'grader'; lockoutS?: number; hold?: boolean; ssZero?: boolean; warm?: boolean; breeds?: BCfg; roster?: Roster; }
export interface Prof { tap: 'idle' | 'ac7' | 'burst' | number; checkBase: number; catchP: number; }
export const PROFS: Record<string, Prof> = { slow: { tap: 0.25, checkBase: 60, catchP: 0.4 }, idle: { tap: 'idle', checkBase: 15, catchP: 0 }, optimal: { tap: 3, checkBase: 5, catchP: 1 }, seller15: { tap: 'ac7', checkBase: 15, catchP: 0.75 }, casual: { tap: 0.5, checkBase: 30, catchP: 0.6 }, burst: { tap: 'burst', checkBase: 5, catchP: 1 } };
const rng = (seed: number) => { let a = (seed * 2654435761 + 99) >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const WIDS: WorkerId[] = ['market_hand', 'coop_hand', 'hawker', 'grader'];
export function run(bal: B, seed: number, P: Prof, K: Stack, T: number, opt: { start?: GameState; bstart?: BS; noBuy?: boolean; snapAt?: number[]; snapEveryS?: number } = {}, E: RunEnv = {}) {
  assertNoDoubleModel(bal, K);
  const tsnaps: [number, number, GameState, BS][] = [];
  const BR = K.breeds ? new Breeds(K.breeds, K.roster) : null; const bs: BS = opt.bstart ? bsClone(opt.bstart) : bsInit(seed); const tOff = opt.bstart ? (opt.bstart as any).tNow ?? 0 : 0; const kinds: [number, string][] = [];
  const b = { ...bal, sim_test: { ...bal.sim_test, poisson_arrivals: true } } as B;
  const V = new SellerVariance(VAR_DEFAULT, seed), R = rng(seed);
  let s: GameState = opt.start ?? initialState(b, seed); const dt = 1 / b.tickHz, n = Math.round(T * b.tickHz);
  if (b.tickHz !== 10) throw new Error(`k10-breeds-offset: tickHz must be 10 (100 ms steps), got ${b.tickHz}`); // Saves note f366a945 item 2: dtMs = 100
  const reach = new Map<number, number>([[s.farmLevel, 0]]), snaps = new Map<number, GameState>(), buys: number[] = [];
  const ev: SimEvent[] = []; const present = P.tap !== 'idle';
  // mechanic state
  // CALM-HANDS PRESENT (D-HOP-39, BR-R12b rev.3 sha1 bcf963b3; Economy SCRATCH 2026-10-24). GATE=N: open iff no counted tap on this tick and >= CALM_N focus s since the last counted tap.
  // GATE=R (variant R, rate-gated): open iff counted taps in the trailing CALM_W focus s (t-W, t], incl. this tick's, < CALM_K. Counted tap = streak R2 (<= 1 per 1.0 s). Tap on the tick closes the gate on that tick (BR-R12b (b)).
  // History lives in bs.cnt (absolute times), so G1 window runs inherit it from the window-start snapshot (BR-R12b (c) carry). Fresh session = calm (empty history).
  const GATE = E.GATE ?? (E.CALM_N ? 'N' : ''), CALM_N = +(E.CALM_N ?? 0), CALM_W = +(E.CALM_W ?? 10), CALM_K = +(E.CALM_K ?? 6);
  const cnt: number[] = ((bs as any).cnt ??= []); const lastC = () => cnt.length ? cnt[cnt.length - 1] : -1e9; const calmStat = { calm: 0, tot: 0, counted: 0 };
  const BURST_K = +(E.BURST_K ?? 6), BURST_W = +(E.BURST_W ?? 10); let burstC = 0;
  const TAPX = +(E.TAPX ?? 0), TAPY = +(E.TAPY ?? 0); const nestTaps: number[] = []; const tapStat = { n: 0, sum: 0 };
  const cochinOn = () => { const c: any = BR!.cfg; if (c.fixed) return c.fixed.includes('cochin'); if (c.policy === 'forced') return c.loadout === 'g1max' && (c.forcedSettle ? BR!.settledForced(bs, s.farmLevel, curT + tOff) : BR!.slotsAt(s.farmLevel)) >= 1; return bs.slots.includes('cochin') && curT + tOff - (bs.placedAt.cochin ?? 1e18) >= BR!.bc.settleS; };
  let streak = 0, lastCred = -1e9, lastTap = -1e9, frenzyUntil = -1, nextEgg = Infinity, nest = 0;
  const readyAt: Record<string, number> = {}, until: Record<string, number> = {}; const paused = new Map<WorkerId, number>(); let lockUntil = -1;
  const win: [number, number][] = []; let winSum = 0; const stall = () => { const w = s.workers.market_hand; if (!w || paused.has('market_hand')) return false; const m = mood(w, b); return m === 'asleep' || m === 'unpaid'; };
  const t0 = { v: 0 };
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
    s = step(s, dt, b, ev); drain(t); t0.v = t;
    if (BR) { BR.tick(bs, dt, t + tOff, s.farmLevel); const tA = t + tOff, willTap = P.tap === 'ac7' || P.tap === 'idle' ? t >= tapT && (P.tap === 'ac7' || !s.workers.coop_hand) : t >= fixT, cNow = willTap && tA - lastC() >= 1.0 - 1e-9;
      while (cnt.length > 64 && cnt[0] < tA - Math.max(CALM_W, CALM_N) - 2) cnt.shift();
      let calm = true; if (GATE === 'N') calm = !cNow && tA - lastC() >= CALM_N - 1e-9; else if (GATE === 'R') { let c = cNow ? 1 : 0; for (let j = cnt.length - 1; j >= 0 && cnt[j] > tA - CALM_W + 1e-9; j--) c++; calm = c < CALM_K; } calmStat.tot += dt; if (calm) calmStat.calm += dt; const pb = calm ? BR.fam(bs, 'present', s.farmLevel, t + tOff) : 0; if (pb > 0) { const x = Math.max(0, Math.min(prodEggsPerSec(s, b) * dt * pb / 10000, coopCap(s, b) - s.coop)); if (x > 0) { s = { ...s, coop: s.coop + x }; bs.presentEggs += x; } } }
    if (opt.snapEveryS && s.farmLevel >= 10 && s.farmLevel < b.maxLevel && Math.abs(t / opt.snapEveryS - Math.round(t / opt.snapEveryS)) < 1e-6) tsnaps.push([t, s.farmLevel, s, { ...bsClone(bs), tNow: t + tOff } as any]);
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
        if (id === 'grader' && !(s.graderTier > 0)) continue; if ((id === 'market_hand' || id === 'hawker') && t < lockUntil) continue; if (t >= (readyAt[id] ?? 0) && (!K.hold || t < frenzyUntil)) { readyAt[id] = t + 300; until[id] = t + 30; } }
      // Broody: unlock at first Coop Hand hire; fills 0.05 x I while present, cap 150 s
      // TAP-SCALED COCHIN (D-HOP-37 plan, Economy SCRATCH 2026-10-24): +TAPX bp on the Broody rate per nest tap in the rolling 60 s window, capped at TAPY, only while Cochin is slotted (and settled);
      // outside the family clamp (bc_broody_cap_bp still clamps the static traits). Nest tap = a check-in that collects a non-empty nest. Window history resets at a run/window start (G1 approximation A2).
      if (K.broody && present && s.workers.coop_hand) { while (nestTaps.length && nestTaps[0] <= t - 60) nestTaps.shift(); const tapB = BR && cochinOn() ? Math.min(TAPY, TAPX * nestTaps.length) : 0; if (tapB > 0) tapStat.n++, tapStat.sum += tapB;
        const sh = BR ? Math.floor(500 * (10000 + BR.fam(bs, 'broody', s.farmLevel, t + tOff) + tapB) / 10000) / 10000 : 0.05; nest = Math.min(sh * refI() * 150, nest + sh * refI() * dt); }
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
    else if (P.tap === 'burst') { while (t >= fixT) { taps++; burstC++; if (burstC >= BURST_K - 1) { burstC = 0; fixT += BURST_W - (BURST_K - 2); } else fixT += 1; } } // burst-then-rest: K-1 taps 1 s apart, then rest so the oldest leaves the W window
    else while (t >= fixT) { fixT += 1 / (P.tap as number); taps++; }
    for (let k = 0; k < taps; k++) { if (t + tOff - lastC() >= 1.0 - 1e-9) { cnt.push(t + tOff); calmStat.counted++; } // CALM: counted tap = streak R2 (<= 1 per 1.0 s, eggs or not), any profile
      s = apply(s, { type: 'collect' }, b, ev); drain(t);
      if (K.on && present && s.farmLevel >= 8 && t - lastCred >= 1.0 - 1e-9) { lastCred = t; lastTap = t; streak = Math.min(K.streakCap, streak + 0.01); credit('tapcoins', K.tapShare * refI()); } }
    // affordability (F10..max-1), and F30+ separately
    if (!opt.noBuy && Math.abs(t - Math.round(t)) < 1e-6) {
      const inR = s.farmLevel >= 10 && s.farmLevel < b.maxLevel, aff = !inR || candidates(s, b).some(c => s.coinsCents >= c.costCents);
      if (!aff) { if (noAffStart === null) noAffStart = t; } else if (noAffStart !== null) { longestNoAff = Math.max(longestNoAff, t - noAffStart); noAffStart = null; }
      const in30 = s.farmLevel >= 30 && s.farmLevel < b.maxLevel, aff30 = !in30 || aff;
      if (!aff30) { if (noAff30Start === null) noAff30Start = t; } else if (noAff30Start !== null) { longestNoAff30 = Math.max(longestNoAff30, t - noAff30Start); noAff30Start = null; }
    }
    if (t < sellT) continue;
    sellT = t + V.checkInterval(P.checkBase);
    s = apply(s, { type: 'sellAll' }, b, ev); drain(t);
    if (nest > 0) { credit('broody', nest); nest = 0; nestTaps.push(t); }
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
    if (s.manageCdS <= 1e-9) {
      const low = (Object.entries(s.workers) as [WorkerId, { energy: number }][]).filter(([id, w]) => !paused.has(id) && w.energy <= b.workers.energy.manage_prompt_threshold * 100).sort((a, c) => a[1].energy - c[1].energy);
      if (low.length) s = apply(s, showManageAll(s.workers, b) && low.length >= b.workers.energy.manage_all_min_workers ? { type: 'manageAll' } : { type: 'manage', worker: low[0][0] }, b);
    }
    if (opt.noBuy) continue;
    if (V.delay()) continue; V.cheapFirst();
    if (BR) { const c = BR.checkin(s, b, bs, t + tOff); if (c > 0 || bs.hatchTimes[bs.hatchTimes.length - 1] === t + tOff) { s = { ...s, coinsCents: s.coinsCents - c }; kinds.push([t, 'hatch']); } }
    for (let g = 0; g < 200; g++) { const kind = pickBuy(s, b, 'seller15', false, [...M1_KEYS, 'W1', 'W2', 'W3', 'W4']); if (!kind) break; const nx = apply(s, pickAction(kind), b); if (nx === s) break; s = nx; buys.push(t); kinds.push([t, kind]);
      if (kind === 'f') { reach.set(s.farmLevel, t); if (opt.snapAt?.includes(s.farmLevel)) snaps.set(s.farmLevel, s); } }
  }
  if (noAffStart !== null) longestNoAff = Math.max(longestNoAff, T - noAffStart); if (noAff30Start !== null) longestNoAff30 = Math.max(longestNoAff30, T - noAff30Start);
  const mech = Object.values(src).reduce((a, x) => a + x, 0);
  return { calmStat, tapStat, bs, kinds, tsnaps, ovl, reach, snaps, src, base, mech, baseF, srcF, longestNoAff, longestNoAff30, collTap, collW, final: s };
}

// ---- CSV bc_* -> breeds config (ac22/tap/g1csv.ts 45e403e6, without mutating globals) ----
const BC_COLS: Record<string, string> = { unlock: 'bc_unlock_farm', slot2: 'bc_slot2_farm', slot3: 'bc_slot3_farm', rareF: 'bc_rare_farm', legF: 'bc_legendary_farm', costS: 'bc_hatch_cost_s',
  farmShareBp: 'bc_hatch_farm_share_bp', minCents: 'bc_hatch_min_cents', hatchS: 'bc_hatch_time_s', settleS: 'bc_settle_s', pityAfter: 'bc_pity_rare_after', starCap: 'bc_star_cap',
  starBp: 'bc_star_bonus_bp', layLt18: 'bc_lay_cap_bp_lt18', lay: 'bc_lay_cap_bp', away: 'bc_away_cap_bp', broody: 'bc_broody_cap_bp' };
export interface CsvBreeds { bc: typeof BC0; roster: Roster; env: RunEnv }
/** Code defaults = the bc_* values of M5.1 draft CSV ad27fe73 (g1csv.ts logged "changed vs code defaults: none" on it), calm gate R / 10 s / 6.
 *  Used when the CSV has no bc_* columns yet (rc/v5 data/economy.csv a8c4e268), so a tc_* change still re-runs the offset test. */
export const bcDefaults = (): CsvBreeds => ({ bc: { ...BC0, w: { ...BC0.w } }, roster: Object.fromEntries(Object.entries(ROSTER).map(([k, v]) => [k, [...v]])) as Roster, env: { GATE: 'R', CALM_W: '10', CALM_K: '6' } });
/** Every breeds tunable from the CSV's bc_* columns (each must be present and constant on every row; LF or CRLF). */
export function bcFromCsv(csv: string): CsvBreeds {
  const rows = csv.trim().split(/\r?\n/).map(l => l.split(',')), h = rows[0];
  const get = (c: string) => { const i = h.indexOf(c); if (i < 0) throw new Error('k10: economy.csv is missing ' + c); const v = rows[1][i]; for (const r of rows.slice(1)) if (r[i] !== v) throw new Error(`k10: economy.csv ${c} must be constant`); const x = +v; if (!Number.isFinite(x)) throw new Error(`k10: economy.csv ${c} is not a number`); return x; };
  const bc: any = { ...BC0, w: { ...BC0.w } }; for (const [k, c] of Object.entries(BC_COLS)) bc[k] = get(c);
  bc.w = { C: get('bc_w_common'), R: get('bc_w_rare'), E: get('bc_w_epic'), L: get('bc_w_legendary') }; bc.incubators = get('bc_incubators');
  if (bc.incubators !== 1) throw new Error('k10: harness models 1 incubator');
  const roster: Roster = Object.fromEntries(Object.entries(ROSTER).map(([id, [f, r]]) => [id, [f, r, get(`bc_trait_${id}_bp`)]])) as Roster;
  const k = get('bc_present_calm_k'); const env: RunEnv = k > 0 ? { GATE: 'R', CALM_W: String(get('bc_present_calm_w_s')), CALM_K: String(k) } : { GATE: '' };
  return { bc, roster, env };
}
/** Does the CSV carry the breeds columns at all? (K10 is meaningless without them.) */
export const hasBreedsCols = (csv: string) => csv.slice(0, csv.search(/\r?\n/)).split(',').some(c => c.startsWith('bc_'));

// ---- B4 window gate (ac22/tap/g1tap.ts f7a1138b) ----
export const B4_BASE: Stack = { on: true, streakCap: 0.28, tapShare: 0.03, broody: true, golden: { gapMin: 120, gapMax: 300 }, abil: true, sweep: 'A', sweepMult: 1.15, pause: false, warm: true, ssZero: true };
export type B4Arm = 'nob' | 'presF' | 'g1F';
/** g1tap's AssZhold_<arm> stack: AssZ holding calls for a Frenzy, streak cap `streakCap`, breeds = forced idealised loadout (or none). */
export function b4Stack(arm: B4Arm, streakCap: number, cb: CsvBreeds, forcedSettle = false): Stack {
  const bv: BCfg | undefined = arm === 'nob' ? undefined : { policy: 'forced', loadout: arm === 'presF' ? 'present' : 'g1max', bc: cb.bc, ...(forcedSettle ? { forcedSettle: true } : {}) };
  return { ...B4_BASE, streakCap, hold: true, breeds: bv, roster: cb.roster };
}
export interface B4Opts { seeds: number; s0: number; T: number; step: number; prof: string; targets: PacingTargets }
/** One g1tap.ts config x profile. Output object and key order are g1tap's (o), so JSON.stringify matches its stderr line byte for byte. */
export function b4Gate(b: B, K: Stack, cfgName: string, g: B4Opts, env: RunEnv): any {
  const NS = g.seeds, S0 = g.s0, T = g.T, STEP = g.step, tg = g.targets, pf = g.prof, ck = cfgName, P = PROFS[pf]; if (!P) throw new Error('k10: unknown profile ' + pf);
  const NONE: Stack = { ...B4_BASE, on: false };
  const q = (a: number[], p: number) => { const x = a.filter(Number.isFinite); return x.length ? quantile(x, p) : NaN; }, mx = (a: number[]) => Math.max(...a.filter(Number.isFinite));
  const seedMax: number[] = [], all: number[] = [], byBand: Record<string, number[]> = { 'F10-17': [], 'F18-23': [], 'F24-29': [], 'F30+': [] }, step: number[] = [], prem: Record<string, number[]> = { 'F10-19': [], 'F20-29': [], 'F30+': [] };
  const rs: any[] = [];
  for (let i = 0; i < NS; i++) { const seed = S0 + i, r = run(b, seed, P, K, T, { snapEveryS: K.on ? STEP : undefined }, env); rs.push({ bs: r.bs });
    step.push(maxStepRatio(r.reach as any, 30, tg.step_ratio_min_prev_s) ?? NaN);
    let m = 0; if (K.on) for (const [t, F, st, bst] of r.tsnaps) { const a = run(b, seed * 7919 + Math.round(t), P, K, 600, { start: st, bstart: bst, noBuy: true }, env), z = run(b, seed * 7919 + Math.round(t), PROFS.idle, { ...NONE, breeds: K.breeds, roster: K.roster }, 600, { start: st, bstart: bst, noBuy: true }, env);
      const ca = a.final.coinsCents - st.coinsCents, cz = z.final.coinsCents - st.coinsCents; if (!(cz > 0)) continue; const x = ca / cz; all.push(x); m = Math.max(m, x);
      byBand[F < 18 ? 'F10-17' : F < 24 ? 'F18-23' : F < 30 ? 'F24-29' : 'F30+'].push(x); }
    seedMax.push(m);
    if (K.on) for (const bd of Object.keys(prem)) { const keys = Object.keys(r.src).filter(k => k.startsWith(bd + ':')); const mech = keys.reduce((a, k) => a + r.src[k], 0); let base = 0; for (const [F, v] of r.baseF) if ((bd === 'F10-19' && F >= 10 && F < 20) || (bd === 'F20-29' && F >= 20 && F < 30) || (bd === 'F30+' && F >= 30)) base += v; if (base > 0) prem[bd].push(mech / base); }
  }
  const hs = rs.map(x => x.bs.hatches), tc = rs.map(x => x.bs.tComplete ?? NaN);
  const o: any = { cfg: ck, prof: pf, windows: all.length, hatchesMed: q(hs, .5), flockCompleteMedMin: +(q(tc, .5) / 60).toFixed(1), flockCompleteN: tc.filter(Number.isFinite).length, stepL30: [+q(step, .95).toFixed(3), +mx(step).toFixed(3)] };
  if (K.on) { o.win = { P95_allWindows: +q(all, .95).toFixed(3), P95_ofSeedMax: +q(seedMax, .95).toFixed(3), worstSeed: +mx(seedMax).toFixed(3), median: +q(all, .5).toFixed(3) };
    o.byBand = Object.fromEntries(Object.entries(byBand).map(([k, v]) => [k, [+q(v, .5).toFixed(2), +q(v, .95).toFixed(2), v.length ? +mx(v).toFixed(2) : null]]));
    o.premium = Object.fromEntries(Object.entries(prem).map(([k, v]) => [k, [+(100 * q(v, .5)).toFixed(2), +(100 * q(v, .95)).toFixed(2)]])); }
  return o;
}
export interface K10Result { csvSha256: string; bcSource: 'csv' | 'defaults'; seeds: [number, number]; g1max: any; noBreeds: any; presentOnly: any; premium: { g1max: number; noBreeds: number; presentOnly: number }; pass: boolean }
/** The K10 / B4 offset test (D-HOP-2026-10-24-47): F20-29 median active premium, optimal, g1max at streak 0.27 must be <= the
 *  no-breeds AND the calm-gated Present-only premiums at streak 0.28. */
export function k10(b: B, csv: string, csvSha256: string, g: Omit<B4Opts, 'prof'>, opts: { g1Streak?: number; refStreak?: number; forcedSettle?: boolean } = {}): K10Result {
  const cb = hasBreedsCols(csv) ? bcFromCsv(csv) : bcDefaults(), G = { ...g, prof: 'optimal' }, s1 = opts.g1Streak ?? 0.27, s2 = opts.refStreak ?? 0.28, fs = !!opts.forcedSettle;
  const g1max = b4Gate(b, b4Stack('g1F', s1, cb, fs), 'AssZhold_g1F', G, cb.env), noBreeds = b4Gate(b, b4Stack('nob', s2, cb), 'AssZhold_nob', G, cb.env), presentOnly = b4Gate(b, b4Stack('presF', s2, cb, fs), 'AssZhold_presF', G, cb.env);
  const premium = { g1max: g1max.premium['F20-29'][0], noBreeds: noBreeds.premium['F20-29'][0], presentOnly: presentOnly.premium['F20-29'][0] };
  return { csvSha256, bcSource: hasBreedsCols(csv) ? 'csv' : 'defaults', seeds: [g.s0, g.s0 + g.seeds - 1], g1max, noBreeds, presentOnly, premium, pass: premium.g1max <= premium.noBreeds && premium.g1max <= premium.presentOnly };
}
