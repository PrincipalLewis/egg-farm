/**
 * v5 #5 Broody Hen nest SIM (product/collection/m5-broody-hen-spec.md v1.3.3 sha1 4441a1d9; gate card #8 BRO-AC1..7).
 * Pure sim, no UI / DOM / sound. Live only with m4.flags.broody = 1 and m4.enabled (R14b, D-C1); flag off = identity everywhere,
 * no field is ever created, so traces and saves stay byte-identical.
 *  - R1 unlock: the first tick a Coop Hand exists (hire, or a hired save's first M5 load) creates the session run, nest 0.
 *  - R4/R5/R6 slots: the UI measures the eligible DRAWN yard slots (0..11) and dispatches `broodySlots{slots}`; the sim keeps a
 *    still-eligible marked/saved index, else draws pickIndex(u, n) from brRng (D-C4; never evRng, never state.rng). An empty list
 *    = no hen marked; the nest keeps filling invisibly and is never lowered. Re-check every BROODY_RECHECK_MS focus ms (+ layout).
 *  - R7 accrual on FOCUS ms only (StepClock.focusFtMs, Σ fT = frame focus): scaled units N = cents x 10^4 + sub;
 *      num = refCents x bp x dtMs + msRem; Δ = floor(num / 1000); msRem = num mod 1000; N = min(N + Δ, max(N, cap)),
 *      cap = refCents x bp x tc_broody_cap_s, bp = broodyBpEff (breeds BR-R14; read-only import, = tc share bp when breeds off).
 *    Number while every operand / product is a safe integer, else BigInt (BROODY_MATH, spy-able; BH-AC3b, BR-AC14).
 *    N is kept split (saved integer cents + session sub-cent) so it stays exact past 2^53 (engineering F-3).
 *  - R7/R11 ready ⇔ N x 10^4 >= readyBp x cap AND N >= 10^4 (1c); sticky within the session (R8a). full ⇔ cap > 0 AND N >= cap.
 *  - R13 tapBroody: pays floor(N / 10^4) once, nest 0, then the hen moves (current slot excluded if another is eligible). Not a
 *    sale, not a credited tap. Refused while not attended (menu freeze, R11 `frozen`, BH-AC9).
 *  - R9: hidden / offline / reload never accrue (no focus ms) and never touch the nest (offline.ts keeps the fields).
 *  - Telemetry (§8) from the sim sink only: collectible_spawned / _collected{skin:"broody_hen"}; Game adds collectible_id.
 *  - Session only (m5Persist SESSION_ONLY_KEYS): broodyRun. Saved (F2, HoP (d)): broodyNestCents, broodyHenIdx.
 */
import type { Balance } from '../config/balance';
import { m4On, tcNum } from '../config/formulas';
import { BP_ONE } from '../config/breeds';
import type { Sink } from './events';
import type { GameState } from './state';
import { refCents } from './income-ref';
import { broodyBpEff } from './breeds-traits';
import { brDraw, ensureEvRng, pickIndex } from './rng';
import { BROODY_NEST_MAX_CENTS, BROODY_SLOTS } from '../save/m5-fields';

/** m4.flags.broody without flagOn (same pattern as goldenOn / incomeRefOn). */
export const broodyOn = (b: Balance) => m4On(b) && b.m4?.flags?.broody === 1;
/** R1: unlocked once a Coop Hand exists (never reverts: rc1 has no fire action). */
export const broodyUnlocked = (s: GameState, b: Balance) => broodyOn(b) && !!s.workers.coop_hand;
/** R4: eligibility re-check every 500 ms of focus time. A code constant (like GOLDEN_RECHECK_S), not a CSV column. */
export const BROODY_RECHECK_MS = 500;
/** Units, not tunables: ms per second; the scaled nest unit is cents x bp (BP_ONE). */
const MS = 1000, MS_N = 1000n, ONE_N = BigInt(BP_ONE);
/** Session-only run state (never saved; a load starts a new run from broodyNestCents, sub 0, msRem 0). */
export interface BroodyRun {
  /** N mod 10^4: the sub-cent part of the scaled nest (cents live in broodyNestCents). */ sub: number;
  /** R7 ms remainder in [0, 1000). */ msRem: number;
  /** R8a sticky ready for this page session. */ ready: boolean;
  /** full at the last tick (cap > 0 and N >= cap). */ full: boolean;
  /** Cap in cents at the last tick (display / nest_fill_share). */ capCents: number;
  /** A slot is marked (R5: false = no eligible slot / not measured yet). */ marked: boolean;
  /** Focus ms to the next R4 check (0 = due). */ checkMs: number;
  /** Focus ms from unlock / load / last payout to ready (interval_s). */ sinceMs: number;
  /** Focus ms of this episode with no marked slot (deferred_ms). */ deferredMs: number;
  /** Focus ms since ready (reaction_ms). */ readyMs: number;
  /** collectible_spawned sent for this ready episode. */ spawned: boolean;
  /** Ready at load (restored:true, interval_s 0). */ restored: boolean;
}
/** The accrual state of one nest: N = cents x 10^4 + sub, plus the ms remainder. */
export interface NestAcc { cents: number; sub: number; msRem: number; }
const capNum = (ref: number, bp: number, capS: number) => ref * bp * capS;
/** capScaled = refCents x bp x tc_broody_cap_s (exact, BigInt). */
export const capScaledOf = (ref: number, bp: number, capS: number): bigint =>
  Number.isInteger(capS) ? BigInt(ref) * BigInt(bp) * BigInt(capS) : BigInt(Math.floor(capNum(ref, bp, capS)));
const split = (N: bigint, msRem: number): NestAcc => {
  const c = N / ONE_N; return c > BigInt(BROODY_NEST_MAX_CENTS) ? { cents: BROODY_NEST_MAX_CENTS, sub: 0, msRem } : { cents: Number(c), sub: Number(N % ONE_N), msRem };
};
/** The two integer paths of one R7 step, on an object so a test can spy which one ran (BH-AC3b spy). */
export const BROODY_MATH = {
  num(n: NestAcc, ref: number, bp: number, dtMs: number, capS: number): NestAcc {
    const N = n.cents * BP_ONE + n.sub, x = ref * bp * dtMs + n.msRem, d = Math.floor(x / MS), N1 = Math.min(N + d, Math.max(N, capNum(ref, bp, capS)));
    return { cents: Math.floor(N1 / BP_ONE), sub: N1 % BP_ONE, msRem: x % MS };
  },
  big(n: NestAcc, ref: number, bp: number, dtMs: number, capS: number): NestAcc {
    const N = BigInt(n.cents) * ONE_N + BigInt(n.sub), x = BigInt(ref) * BigInt(bp) * BigInt(dtMs) + BigInt(n.msRem), cap = capScaledOf(ref, bp, capS);
    const up = N + x / MS_N, N1 = up < (N > cap ? N : cap) ? up : (N > cap ? N : cap);
    return split(N1, Number(x % MS_N));
  },
};
/** One R7 step over dtMs focus ms (integers >= 0). Number path only when every operand and product is a safe integer. */
export function accrueNest(n: NestAcc, ref: number, bp: number, dtMs: number, capS: number): NestAcc {
  if (!(dtMs > 0)) return n;
  const N = n.cents * BP_ONE + n.sub, x = ref * bp * dtMs + n.msRem, cap = capNum(ref, bp, capS);
  const safe = Number.isSafeInteger(N) && Number.isSafeInteger(x) && Number.isSafeInteger(cap) && Number.isSafeInteger(N + Math.floor(x / MS));
  return safe ? BROODY_MATH.num(n, ref, bp, dtMs, capS) : BROODY_MATH.big(n, ref, bp, dtMs, capS);
}
/** Rates read at balance load / per tick: bp = broodyBpEff (BR-R14), readyBp = round(tc_broody_ready_share x 10^4), cap_s. */
const readyBpOf = (b: Balance) => Math.round(tcNum(b, 'broody_ready_share') * BP_ONE);
const capSOf = (b: Balance) => tcNum(b, 'broody_cap_s');
/** R7 ready / full against the cap of this tick (exact comparisons). */
function grade(n: NestAcc, cap: bigint, readyBp: number) {
  const N = BigInt(n.cents) * ONE_N + BigInt(n.sub);
  return { ready: N >= ONE_N && N * ONE_N >= BigInt(readyBp) * cap, full: cap > 0n && N >= cap };
}
const newRun = (): BroodyRun => ({ sub: 0, msRem: 0, ready: false, full: false, capCents: 0, marked: false, checkMs: 0, sinceMs: 0, deferredMs: 0, readyMs: 0, spawned: false, restored: false });
const slotId = (i: number) => `Y${i}`;
/** First ready episode with a marked hen: collectible_spawned once (R11, §8). */
function maybeSpawn(s: GameState, r: BroodyRun, ev?: Sink): BroodyRun {
  if (!r.ready || !r.marked || r.spawned) return r;
  ev?.push({ type: 'collectible_spawned', skin: 'broody_hen', farm_level: s.farmLevel, collection_level: s.collectionLevel, slot_id: slotId(s.broodyHenIdx!),
    interval_s: r.restored ? 0 : Math.floor(r.sinceMs / MS), deferred_ms: r.deferredMs, restored: r.restored });
  return { ...r, spawned: true };
}
/**
 * One tick (TIMER_SYSTEMS, after I_ref): unlock, R7 accrual on focus ms, ready / full, spawn. `ref` defaults to the shared I_ref
 * of this tick (warm-up I_ss after a load / offline return, then the trailing ring). Identity while off or locked.
 */
export function broodyTick(s: GameState, focusS: number, focusMs: number, b: Balance, ev?: Sink, ref = refCents(s, b)): GameState {
  if (!broodyUnlocked(s, b)) return s;
  const bp = broodyBpEff(s, b), capS = capSOf(b), readyBp = readyBpOf(b), cap = capScaledOf(ref, bp, capS), capCents = Number(cap / ONE_N);
  let r = s.broodyRun, o = s;
  if (!r) { // R1 unlock (hire or first load of a hired save): nest = the saved cents (absent = 0); ready now = restored (§8)
    o = { ...ensureEvRng(s), broodyNestCents: s.broodyNestCents ?? 0 };
    const g = grade({ cents: o.broodyNestCents!, sub: 0, msRem: 0 }, cap, readyBp);
    r = { ...newRun(), ready: g.ready, full: g.full, capCents, restored: g.ready };
    return { ...o, broodyRun: r }; // BH-AC2: the unlock tick itself accrues nothing (nest = 0 within 1 tick); no slot is marked yet (R5)
  }
  const dt = focusS > 0 && focusMs > 0 ? focusMs : 0;
  const n = accrueNest({ cents: o.broodyNestCents ?? 0, sub: r.sub, msRem: r.msRem }, ref, bp, dt, capS), g = grade(n, cap, readyBp);
  const wasReady = r.ready;
  r = { ...r, sub: n.sub, msRem: n.msRem, ready: wasReady || g.ready, full: g.full, capCents,
    checkMs: Math.max(0, r.checkMs - dt), sinceMs: wasReady ? r.sinceMs : r.sinceMs + dt, deferredMs: r.marked ? r.deferredMs : r.deferredMs + dt, readyMs: wasReady ? r.readyMs + dt : r.readyMs };
  o = { ...o, broodyNestCents: n.cents };
  return { ...o, broodyRun: maybeSpawn(o, r, ev) };
}
/** The UI's eligible drawn slot ids, sanitised: integers 0..11, first occurrence kept, order kept (the draw indexes into it). */
const clean = (slots: readonly number[]) => slots.filter((x, i) => Number.isInteger(x) && x >= 0 && x < BROODY_SLOTS && slots.indexOf(x) === i);
/** Draw one slot of `from` from brRng (D-C4). */
function draw(s: GameState, from: readonly number[]): GameState {
  const [o, u] = brDraw(ensureEvRng(s)); return { ...o, broodyHenIdx: from[pickIndex(u, from.length)] };
}
/** R4/R5/R6/R19 check: keep a still-eligible index (marked, or the saved one after a load), else re-pick; [] = unmark. */
export function broodySlots(s: GameState, slots: readonly number[], b: Balance, ev?: Sink): GameState {
  const r = s.broodyRun; if (!broodyUnlocked(s, b) || !r) return s;
  const ok = clean(slots), next = { ...r, checkMs: BROODY_RECHECK_MS };
  if (!ok.length) return { ...s, broodyRun: { ...next, marked: false } };
  const o = s.broodyHenIdx !== undefined && ok.includes(s.broodyHenIdx) ? s : draw(s, ok);
  return { ...o, broodyRun: maybeSpawn(o, { ...next, marked: true }, ev) };
}
/** R4: a check is due (unlocked, run live, BROODY_RECHECK_MS of focus elapsed or a layout change). */
export const broodyCheckDue = (s: GameState, b: Balance, layout = false) => broodyUnlocked(s, b) && !!s.broodyRun && (layout || !(s.broodyRun.checkMs > 0));
/** R12/R13 tap: one payout of floor(nest) while ready and marked and attended; nest 0; the hen moves (R4 exclusion). */
export function tapBroody(s: GameState, slots: readonly number[], b: Balance, ev?: Sink, attended = true): GameState {
  const r = s.broodyRun, paid = s.broodyNestCents ?? 0;
  if (!broodyUnlocked(s, b) || !attended || !r || !r.marked || !r.ready || !(paid > 0)) return s;
  ev?.push({ type: 'collectible_collected', skin: 'broody_hen', reaction_ms: r.readyMs, in_warning: false, reward_type: 'broody_cash', reward_value: paid,
    reward_duration_s: 0, farm_level: s.farmLevel, nest_fill_share: r.capCents > 0 ? Math.round(paid / r.capCents * BP_ONE) / BP_ONE : 0 });
  const ok = clean(slots), from = ok.length > 1 ? ok.filter(x => x !== s.broodyHenIdx) : ok;
  const run: BroodyRun = { ...newRun(), msRem: r.msRem, capCents: r.capCents, checkMs: BROODY_RECHECK_MS, marked: from.length > 0 };
  const o: GameState = { ...s, coinsCents: s.coinsCents + paid, broodyNestCents: 0 };
  return { ...(from.length ? draw(o, from) : o), broodyRun: run };
}
/** R20a: collectible_expired{reason:"reset"} once on a save reset / CSR fresh start while the hen is unlocked. */
export function broodyReset(s: GameState, b: Balance, ev: Sink): void {
  if (broodyUnlocked(s, b) && s.broodyRun) ev?.push({ type: 'collectible_expired', skin: 'broody_hen', reason: 'reset', farm_level: s.farmLevel });
}
/** R9 (offline.ts): the offline grant never touches the nest or the hen. Returns `after` with the input's Broody fields. */
const NEST_KEYS = ['broodyNestCents', 'broodyHenIdx', 'broodyRun'] as const;
export function broodyKeepOffline(before: GameState, after: GameState, b: Balance): GameState {
  if (!broodyOn(b) || NEST_KEYS.every(k => after[k] === before[k])) return after;
  const o: any = { ...after }; for (const k of NEST_KEYS) { if (k in before) o[k] = before[k]; else delete o[k]; } return o;
}
/** R11 states for the UI (data-broody-state). `hidden` = unlocked but no slot marked (R5). */
export type BroodyState = 'hidden' | 'brooding' | 'ready' | 'full' | 'frozen';
export interface BroodyView { state: BroodyState; slot: number | null; nestCents: number; capCents: number; tappable: boolean; }
/** Read-only accessor for the yard UI PR: null while off / locked / before the first tick. `frozen` = a menu is open (R11). */
export function broodyView(s: GameState, b: Balance, frozen = false): BroodyView | null {
  const r = s.broodyRun; if (!broodyUnlocked(s, b) || !r) return null;
  const state: BroodyState = !r.marked ? 'hidden' : frozen ? 'frozen' : r.ready ? (r.full ? 'full' : 'ready') : 'brooding';
  return { state, slot: r.marked ? s.broodyHenIdx ?? null : null, nestCents: s.broodyNestCents ?? 0, capCents: r.capCents, tappable: state === 'ready' || state === 'full' };
}
