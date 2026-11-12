/**
 * v5 Wave A #1 (slice 1): golden-egg rewards + the Frenzy timer (product/collection/m5-golden-egg-spec.md v1.3.2 §3.5 R22/R23/X7,
 * §4 #2-#3; GE-AC7/8/9/9b/10/10b). Pure sim: the reward roll is a pure function of one evRng draw (the caller draws, Q4 rule 1),
 * grants are applied by grantGolden. Integer money (HoE money-math ruling 2):
 *   baseScaled = Math.round(E x P_cents x 100)  (1/100 cent; E = goldenEEggsPerSec, P = priceDollars: Grader in, streak/Frenzy out)
 *   reward     = floor((baseScaled x bp + 500000) / 1000000), bp = Math.round(seconds x 10000), BigInt above MAX_SAFE_INTEGER.
 * Frenzy: frenzyRemainingS counts down on FOCUS seconds only (frozen under menus / hidden, R23); the x tc_frenzy_price_mult enters
 * saleMultipliers() through the 'frenzy' entry in sim/effects.ts (R22), which already pays 1x on suspended sales (D-C3).
 * Slice 2 (Architect contracts arch-golden-slice2-contracts-20261105; Product D-HOP-2026-11-05-11):
 *  - R1/R2 unlock + first spawn (tc_first_spawn_s of focus time), R3 gap at resolve, all on FOCUS seconds (goldenTick).
 *  - spawn = the `spawnGolden{spots}` action: the UI passes the live valid spot ids (R14), the sim draws pickIndex(u, n) from
 *    evRng (sizing §12.2). Empty list = R15 deferral: no egg, no draw, retry after GOLDEN_RECHECK_S of focus (or a layout change).
 *  - `tapGolden` (R19 grace, R20 one grant, R25b not a credited tap) rolls the reward. evRng order: gap -> slot -> reward.
 *  - Session only, never saved (R10a): goldenEgg, goldenPending {intervalS, deferS, recheckS}, frenzyRun (frenzy_ended stats).
 *  - goldenUnload(reason) is the reload / takeover / reset seam Game calls before the pagehide save (R10b/R10c).
 *  - collectible_id is added by Game when forwarding (events.ts note); the sim events carry none.
 * Live only with m4.flags.golden (default 0, needs m4.enabled). No UI, sound or telemetry transport here.
 */
import type { Balance } from '../config/balance';
import { m4On, tcNum } from '../config/formulas';
import type { GoldenReward, Sink } from './events';
import type { GameState } from './state';
import { goldenEEggsPerSec } from './tracks';
import { priceDollars } from '../econ/income';
import { frenzyFactor, type SaleCtx } from './effects';
import { ensureEvRng, evDraw, pickIndex } from './rng';
import { saleValueCents } from './payout';
import { flagOn } from '../config/flags';
import { goldenFrozen } from './golden-frozen';
export { frenzyFactor, goldenFrozen };
export const goldenOn = (b: Balance) => m4On(b) && b.m4?.flags?.golden === 1;
/** Units of §4 #2 (bp = seconds x 10^4; baseScaled in 10^-4 $ -> cents / 10^6), not tunables. */
const SEC_BP = 10_000, DENOM = 1_000_000, HALF = DENOM / 2, DENOM_N = BigInt(DENOM), HALF_N = BigInt(HALF);
export const cashBp = (b: Balance) => Math.round(tcNum(b, 'egg_cash_s') * SEC_BP);
export const eggsBp = (b: Balance) => Math.round(tcNum(b, 'egg_eggs_s') * SEC_BP);
/** E x P in 1/100 cent, read once at tap time (GE-AC8). */
export const baseScaled = (s: GameState, b: Balance) => Math.round(goldenEEggsPerSec(s, b) * (priceDollars(s, b) * 100) * 100);
/** The two integer paths, on an object so a test can spy which one ran (GE-AC9b). */
export const GOLDEN_MATH = {
  num: (x: number, bp: number) => Math.floor((x * bp + HALF) / DENOM),
  big: (x: number, bp: number) => Number((BigInt(x) * BigInt(bp) + HALF_N) / DENOM_N),
};
/** floor((baseScaled x bp + 500000) / 1000000) for integer inputs >= 0; the float overflow test is exact (see tap-coins.ts). */
export function rewardCents(x: number, bp: number): number {
  if (!(x > 0) || !(bp > 0)) return 0;
  return x * bp + HALF > Number.MAX_SAFE_INTEGER ? GOLDEN_MATH.big(x, bp) : GOLDEN_MATH.num(x, bp);
}
/** §3.5 table order: [0, w_cash) cash, [w_cash, w_cash + w_frenzy) frenzy, the rest eggs (F < tc_egg_eggs_as_cash_from_farm) or eggs_cash. */
export function rollReward(u: number, farmLevel: number, b: Balance): GoldenReward {
  const wc = tcNum(b, 'egg_w_cash'), wf = wc + tcNum(b, 'egg_w_frenzy');
  return u < wc ? 'cash' : u < wf ? 'frenzy' : farmLevel >= tcNum(b, 'egg_eggs_as_cash_from_farm') ? 'eggs_cash' : 'eggs';
}
/** Apply one reward (R20: the caller grants once per egg). Identity when golden is off. */
export function grantGolden(s: GameState, r: GoldenReward, b: Balance): GameState {
  if (!goldenOn(b)) return s;
  switch (r) {
    case 'cash': return { ...s, coinsCents: s.coinsCents + rewardCents(baseScaled(s, b), cashBp(b)) };
    case 'eggs_cash': return { ...s, coinsCents: s.coinsCents + rewardCents(baseScaled(s, b), eggsBp(b)) };
    case 'eggs': return { ...s, basket: s.basket + Math.floor(tcNum(b, 'egg_eggs_s') * goldenEEggsPerSec(s, b)) }; // coop untouched, cap ignored
    case 'frenzy': return { ...s, frenzyRemainingS: tcNum(b, 'frenzy_s'), frenzyRun: s.frenzyRun ?? newRun() }; // R23: reset to 30 s, never stacked; one run
  }
}
const r12 = (x: number) => Math.round(x * 1e12) / 1e12, EPS = 1e-9;
/** Session stats of the live Frenzy (frenzy_ended, §8 / GE-AC12). Never saved: a Frenzy resumed after a reload counts from 0. */
export interface FrenzyRun { extraCents: number; eggsSold: number; byPlayer: number; byWorkers: number; }
const newRun = (): FrenzyRun => ({ extraCents: 0, eggsSold: 0, byPlayer: 0, byWorkers: 0 });
/** R23: counts down on focus seconds only; at 0 the field is removed and frenzy_ended{timeout} carries the run. */
export function frenzyTick(s: GameState, focusS: number, b: Balance, ev?: Sink): GameState {
  const f = s.frenzyRemainingS; if (!goldenOn(b) || f === undefined || !(focusS > 0)) return s;
  if (goldenFrozen(s, b)) return s; // R5g c: frozen time is accumulated in goldenTick; no frenzy_ended
  const left = r12(f - focusS);
  if (left > EPS) return { ...s, frenzyRemainingS: left };
  const { frenzyRemainingS: _x, frenzyRun: run, ...o } = s, r = run ?? newRun();
  ev?.push({ type: 'frenzy_ended', extra_coins: r.extraCents, eggs_sold: r.eggsSold, sold_by_player: r.byPlayer, sold_by_workers: r.byWorkers, reason: 'timeout' });
  const se = sess(o as GameState);
  return { ...(o as GameState), goldenSession: { ...se, frenzyExtraCents: se.frenzyExtraCents + r.extraCents } };
}
/** sellTo hook: a sale that paid the Frenzy factor (live, not suspended) adds its extra cents and eggs to the run. */
export function frenzySale(o: GameState, before: GameState, k: number, value: number, ctx: SaleCtx, b: Balance): GameState {
  if (!goldenOn(b) || ctx.suspended || frenzyFactor(before, b) === 1) return o;
  const r = o.frenzyRun ?? newRun(), extra = value - saleValueCents({ ...before, frenzyRemainingS: undefined }, k, b, ctx);
  return { ...o, frenzyRun: { extraCents: r.extraCents + extra, eggsSold: r.eggsSold + k, byPlayer: r.byPlayer + (ctx.by === 'player' ? k : 0), byWorkers: r.byWorkers + (ctx.by === 'player' ? 0 : k) } };
}

// ---- slice 2: spawn / lifetime / tap ----
/** R15: re-check a deferred spawn every 500 ms of focus time. A code constant (Architect ruling 2), not a CSV column. */
export const GOLDEN_RECHECK_S = 0.5;
/** The countdown that led to the next spawn (session only): intervalS = drawn gap or tc_first_spawn_s (telemetry interval_s,
 *  excludes deferral), deferS = focus seconds since the countdown hit 0 (deferred_ms), recheckS = focus seconds to the next R15 retry. */
export interface GoldenPending { intervalS: number; deferS: number; recheckS: number; }
/** Session-only GE-AC45 counters. Never saved. frenzyExtraCents is completed runs; a live run is added at emit. */
export interface GoldenSession { spawned: number; collected: number; cents: number; frenzyExtraCents: number; frozenS: number; }
const emptySess = (): GoldenSession => ({ spawned: 0, collected: 0, cents: 0, frenzyExtraCents: 0, frozenS: 0 });
const sess = (s: GameState): GoldenSession => s.goldenSession ?? emptySess();
const pending = (intervalS: number): GoldenPending => ({ intervalS, deferS: 0, recheckS: 0 });

/** session_end golden fields (T-AC9 helper: returns the fields object; Game spreads it outside the literal).
 *  Flag-off: {}. golden_frozen_s only when pause is also on (TEL-14), rounded to 0.1 s. */
export function sessionEndGoldenFields(s: GameState, b: Balance): {
  golden_spawned?: number; golden_collected?: number; golden_cents?: number; frenzy_extra_cents?: number; golden_frozen_s?: number;
} {
  if (!goldenOn(b)) return {};
  const g = sess(s), extra = g.frenzyExtraCents + (s.frenzyRun?.extraCents ?? 0);
  const out = { golden_spawned: g.spawned, golden_collected: g.collected, golden_cents: g.cents, frenzy_extra_cents: extra };
  if (!flagOn(b, 'pause')) return out;
  return { ...out, golden_frozen_s: Math.round(g.frozenS * 10) / 10 };
}
/** Fields for worker_paused (GE-AC45). The emitter is Saves-owned; this is the shared snapshot. */
export const goldenWorkerPausedFields = (s: GameState): { golden_on_screen: boolean; frenzy_active: boolean } => ({
  golden_on_screen: s.goldenEgg != null, frenzy_active: (s.frenzyRemainingS ?? 0) > 0,
});
/** R3: a fresh gap U[tc_egg_gap_min_s, tc_egg_gap_max_s) from ONE evRng draw (never state.rng). */
export function drawGap(s: GameState, b: Balance): GameState {
  const [e, u] = evDraw(ensureEvRng(s)), lo = tcNum(b, 'egg_gap_min_s'), hi = tcNum(b, 'egg_gap_max_s');
  return { ...e, nextSpawnRemainingS: lo + u * (hi - lo) };
}
/** An egg resolved (tap, timeout, offline, reload, takeover): the next gap is drawn now (draw order: gap at resolve). */
const resolve = (s: GameState, b: Balance): GameState => { const o = drawGap(s, b); return { ...o, goldenPending: pending(o.nextSpawnRemainingS!) }; };
/** The countdown is at 0, no egg is on screen and the R15 retry wait is over: Game measures the valid spots and dispatches spawnGolden. */
export const spawnDue = (s: GameState, b: Balance, layout = false) => goldenOn(b) && !goldenFrozen(s, b) && !s.goldenEgg && s.nextSpawnRemainingS === 0 && (layout || !((s.goldenPending?.recheckS ?? 0) > EPS)); // R15: a layout change re-checks at once; v1.3.3: not while frozen
/** One tick on focus seconds f (TimerSystem). R1/R2 start, countdown, R15 deferral, R18 lifetime + timeout expiry. */
export function goldenTick(s: GameState, f: number, b: Balance, ev?: Sink): GameState {
  if (!goldenOn(b)) return s;
  // R2: first-spawn countdown starts on unlock even while frozen; it then holds (R5g a).
  if (!s.goldenEgg && s.nextSpawnRemainingS === undefined) {
    if (s.farmLevel < tcNum(b, 'egg_unlock_farm')) return s;
    const first = tcNum(b, 'first_spawn_s'); s = { ...s, nextSpawnRemainingS: first, goldenPending: pending(first) };
  }
  if (goldenFrozen(s, b)) {
    if (!(f > 0)) return s;
    const se = sess(s);
    return { ...s, goldenSession: { ...se, frozenS: r12(se.frozenS + f) } };
  }
  const g = s.goldenEgg;
  if (g) {
    if (!(f > 0)) return s;
    const age = r12(g.ageS + f);
    if (age < tcNum(b, 'egg_despawn_s') - EPS) return { ...s, goldenEgg: { ...g, ageS: age } };
    const { goldenEgg: _g, ...o } = s; ev?.push({ type: 'collectible_expired', skin: 'golden_egg', reason: 'timeout', farm_level: s.farmLevel });
    return resolve(o as GameState, b);
  }
  const n = s.nextSpawnRemainingS!;
  const p = s.goldenPending ?? pending(n); // after a reload the drawn gap is unknown: interval_s = the restored countdown
  if (!(f > 0)) return s.goldenPending ? s : { ...s, goldenPending: p };
  if (n > EPS) {
    const left = r12(n - f);
    return left > EPS ? { ...s, nextSpawnRemainingS: left, goldenPending: p } : { ...s, nextSpawnRemainingS: 0, goldenPending: { ...p, deferS: Math.max(0, r12(p.deferS - left)) } };
  }
  return { ...s, goldenPending: { ...p, deferS: r12(p.deferS + f), recheckS: Math.max(0, r12(p.recheckS - f)) } };
}
/** spawnGolden{spots}: the UI's live valid spot ids (R14). Identity unless spawnDue. Empty list -> R15 deferral. */
export function spawnGolden(s: GameState, spots: readonly string[], b: Balance, ev?: Sink, layout = false): GameState {
  if (!spawnDue(s, b, layout)) return s;
  const p = s.goldenPending ?? pending(0);
  if (!spots.length) return { ...s, goldenPending: { ...p, recheckS: GOLDEN_RECHECK_S } };
  const [e, u] = evDraw(ensureEvRng(s)), slotId = spots[pickIndex(u, spots.length)];
  ev?.push({ type: 'collectible_spawned', skin: 'golden_egg', farm_level: s.farmLevel, collection_level: s.collectionLevel, slot_id: slotId, interval_s: p.intervalS, deferred_ms: Math.round(p.deferS * 1000) });
  const { goldenPending: _p, ...o } = e; const se = sess(o as GameState);
  return { ...(o as GameState), goldenEgg: { ageS: 0, slotId, intervalS: p.intervalS }, goldenSession: { ...se, spawned: se.spawned + 1 } };
}
/** tapGolden: R19 grace (focus age >= tc_spawn_grace_ms), R20 one grant, then resolve. Not a credited tap (R25b). */
export function tapGolden(s: GameState, b: Balance, ev?: Sink): GameState {
  const g = s.goldenEgg; if (!goldenOn(b) || !g) return s;
  if (goldenFrozen(s, b)) return s; // R5g b: no collect, no evRng, no event (UI on-hold bubble is parked)
  if (g.ageS < tcNum(b, 'spawn_grace_ms') / 1000 - EPS || g.ageS >= tcNum(b, 'egg_despawn_s') - EPS) return s;
  const [e, u] = evDraw(ensureEvRng(s)), forced = e.goldenForceReward, r = forced ?? rollReward(u, s.farmLevel, b);
  const { goldenEgg: _g, goldenForceReward: _f, ...base } = e, o = grantGolden(base as GameState, r, b);
  const mult = tcNum(b, 'frenzy_price_mult'), dur = tcNum(b, 'frenzy_s');
  const value = r === 'frenzy' ? mult : r === 'eggs' ? o.basket - base.basket : o.coinsCents - base.coinsCents;
  ev?.push({ type: 'collectible_collected', skin: 'golden_egg', reaction_ms: Math.round(g.ageS * 1000), in_warning: g.ageS >= tcNum(b, 'warn_at_s') - EPS,
    reward_type: r, reward_value: value, reward_duration_s: r === 'frenzy' ? dur : 0, farm_level: s.farmLevel });
  if (r === 'frenzy') ev?.push({ type: 'frenzy_started', mult, duration_s: dur, farm_level: s.farmLevel, grader_tier: s.graderTier });
  const resolved = resolve(o, b), se = sess(resolved), cents = (r === 'cash' || r === 'eggs_cash') ? (o.coinsCents - base.coinsCents) : 0;
  return { ...resolved, goldenSession: { ...se, collected: se.collected + 1, cents: se.cents + cents } };
}
/** R8/R10b/R10c, Architect persist A (2026-11-05 21:29): remove an on-screen egg with no reward and make exactly ONE live drawGap.
 *  Idempotent: no egg (or golden off) -> the same object, no event, no draw. The ONE helper for offline (m5Offline), reload
 *  (Game.endSession, before save), takeover and save reset. m5Persist's own copy-draw (B) is Saves-owned. */
export function goldenUnload(s: GameState, b: Balance, ev: Sink, reason: 'offline' | 'reload' | 'takeover' | 'reset'): GameState {
  if (!goldenOn(b) || !s.goldenEgg) return s;
  const { goldenEgg: _g, ...o } = s; ev?.push({ type: 'collectible_expired', skin: 'golden_egg', reason, farm_level: s.farmLevel });
  return resolve(o as GameState, b);
}
