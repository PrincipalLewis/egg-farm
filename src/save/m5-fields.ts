/**
 * v5 F2 (engineering/m5.0-sizing.md §1 F2, §9.1/§9.1a, §12.1 D-C2/D-C5, §13 AB-1): the M5 save fields and their
 * offline/clock rules. Optional GameState fields, NO SAVE_VERSION bump (tracksV7 pattern). Every rule is gated by its
 * item flag `balance.m4.flags.<item>` (default 0, needs m4.enabled); with every flag off each function returns its input
 * object unchanged, so saves and the sim stay byte-identical to the base. sim/offline.ts is untouched by design.
 * Cooldowns: `abilities.{id}.readyAt` is epoch ms in memory and in the save, checked against an injected now and clamped
 * to [0, tc_ability_cd_s] on every read (F1b sim/clock.ts wallRemainingMs), so wall-clock time (offline, reload, a hidden or
 * visible gap) elapses with no subtraction here; a load clamps the stored value to [now, now + cd] (E2, clock tamper).
 */
import type { Balance } from '../config/balance';
import { m4On, tcNum } from '../config/formulas';
import { type GameState, mixSeed, nextRand } from '../sim/state';
import type { SimEvent } from '../sim/events';
import { WORKERS } from '../sim/workers';
import { streakAfter, endStreak } from '../sim/streak';
export { streakAfter };
export type M5Flag = 'golden' | 'streak' | 'tapCoins' | 'broody' | 'abilities' | 'pause';
/** D-C1 (= F1a config/flags.ts flagOn): on only when m4.flags[k] === 1 and m4.enabled. */
export const m5Flag = (b: Balance, k: M5Flag) => m4On(b) && b.m4?.flags?.[k] === 1;
const anyFlag = (b: Balance) => (['golden', 'streak', 'tapCoins', 'broody', 'abilities'] as const).some(k => m5Flag(b, k));
const tc = tcNum; // throws on a missing tc_* key (validateBalance rejects it at load while the flag is on)
/** D-C2 salt (ASCII "evRn"), as F1b sim/rng.ts. */
export const EV_RNG_SALT = 0x6576526e;
/** D-C5: the Broody nest clamp (fmtMoneyExact limit) and the yard slot range 0..11. */
export const BROODY_NEST_MAX_CENTS = 1e15; export const BROODY_SLOTS = 12;
/** Never saved (F1a M5_SESSION_FIELDS: golden R10a on-screen egg, streak R11 s, I_ref ring, Broody nestScaled/brRng). */
export const M5_SESSION_KEYS = ['goldenEgg', 'streakS', 'streakHoldS', 'tapCreditCdS', 'streakRun', 'irefRingCents', 'refWarmS', 'broodyNestScaled', 'brRngState'] as const;
const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const isU32 = (v: unknown) => Number.isInteger(v) && (v as number) > 0 && (v as number) <= 0xffffffff;
/** D-C2: the event RNG position, taken once from state.rng when absent/invalid (never reads state.rng after). */
export const ensureEvRng = (s: GameState): GameState => isU32(s.evRngState) ? s : { ...s, evRngState: mixSeed((s.rng ^ EV_RNG_SALT) >>> 0) };
/** Golden R3: a fresh gap U[tc_egg_gap_min_s, tc_egg_gap_max_s] from ONE evRng draw (never state.rng). #1 reuses it. */
export function drawGap(s: GameState, b: Balance): GameState {
  const e = ensureEvRng(s), [x, u] = nextRand(e.evRngState!), lo = tc(b, 'egg_gap_min_s'), hi = tc(b, 'egg_gap_max_s');
  return { ...e, evRngState: x, nextSpawnRemainingS: lo + u * (hi - lo) };
}
/** The save shape: session-only keys dropped. The same object (so the same bytes) when none is present. */
export function m5Persist(s: GameState): GameState {
  if (!M5_SESSION_KEYS.some(k => k in s)) return s;
  const o: any = { ...s }; for (const k of M5_SESSION_KEYS) delete o[k]; return o;
}
/** End every running call with cause `offline` (AB-1: effect_s = tc_ability_s - activeS, the focus seconds it ran). */
function endCalls(o: any, b: Balance, ev: SimEvent[]) {
  const dur = tc(b, 'ability_s');
  for (const id of WORKERS) { const a = o.abilities[id]; if (!a || typeof a !== 'object' || !('activeS' in a)) continue;
    const { activeS, ...rest } = a; o.abilities[id] = rest;
    if (fin(activeS) && activeS > 0) ev.push({ type: 'ability_ended', worker: id, cause: 'offline', effect_s: dur - Math.min(activeS, dur) }); }
}
/** Load (a reload counts as a gap of 60 s or more, AB-1): sanitise the fields of every flag that is on (D-C5), clamp readyAt
 *  to [now, now + cd] (non-finite = ready), end a call that spanned the reload once. Fields of an off flag are untouched. */
export function m5Load(s: GameState, b: Balance, now: number, ev: SimEvent[]): GameState {
  if (!anyFlag(b)) return s;
  const o: any = { ...m5Persist(s) }; // hand-edited session keys never load
  const num = (k: string, hi: number) => { if (!(k in o)) return; if (!fin(o[k])) delete o[k]; else o[k] = clamp(o[k], 0, hi); };
  if (m5Flag(b, 'golden')) { num('nextSpawnRemainingS', tc(b, 'egg_gap_max_s')); num('frenzyRemainingS', tc(b, 'frenzy_s')); delete o.frenzyEndAt; } // v1.0 wall-clock name, replaced (R23)
  if ((m5Flag(b, 'golden') || m5Flag(b, 'broody')) && 'evRngState' in o && !isU32(o.evRngState)) delete o.evRngState; // re-derived per D-C2
  if (m5Flag(b, 'broody')) {
    num('broodyNestCents', BROODY_NEST_MAX_CENTS); if ('broodyNestCents' in o) o.broodyNestCents = Math.floor(o.broodyNestCents);
    if ('broodyHenIdx' in o && !(Number.isInteger(o.broodyHenIdx) && o.broodyHenIdx >= 0 && o.broodyHenIdx < BROODY_SLOTS)) delete o.broodyHenIdx; // #5 re-picks (R6)
  }
  if (m5Flag(b, 'abilities')) {
    for (const k of ['abilitiesUnlocked', 'abilitiesCoachSeen']) if (k in o && typeof o[k] !== 'boolean') delete o[k];
    if ('abilities' in o && (!o.abilities || typeof o.abilities !== 'object' || Array.isArray(o.abilities))) delete o.abilities;
    else if (o.abilities) { o.abilities = { ...o.abilities }; const cdMs = tc(b, 'ability_cd_s') * 1000;
      for (const id of WORKERS) { const a = o.abilities[id]; if (a === undefined) continue; if (!a || typeof a !== 'object') { delete o.abilities[id]; continue; }
        const { readyAt, ...rest } = a; o.abilities[id] = fin(readyAt) ? { ...rest, readyAt: clamp(readyAt, now, now + cdMs) } : rest; }
      endCalls(o, b, ev); }
  }
  return o;
}
/** A hidden-tab or visible frame gap of 60 s or more (§9.1/§9.1a), applied to the state AT THE START of the gap: calls end
 *  (`offline`), an on-screen egg expires (`collectible_expired{reason:"offline"}`, no reward, fresh R3 gap that runs on the
 *  focus clock, so it starts once welcome-back closes), streak s = 0, Frenzy frozen, Broody nest kept with no accrual.
 *  Cooldowns need nothing: readyAt is wall clock. The streak run ends with streak_peak{reason:"offline"} if s > 0 (#2, R11). */
export function m5Offline(s: GameState, b: Balance, ev: SimEvent[]): GameState {
  if (!anyFlag(b)) return s;
  let o: any = { ...s };
  if (m5Flag(b, 'abilities') && o.abilities && typeof o.abilities === 'object') { o.abilities = { ...o.abilities }; endCalls(o, b, ev); }
  if (m5Flag(b, 'golden') && o.goldenEgg) {
    delete o.goldenEgg; ev.push({ type: 'collectible_expired', skin: 'golden_egg', reason: 'offline', farm_level: o.farmLevel }); o = drawGap(o, b);
  }
  if (m5Flag(b, 'streak') && 'streakS' in o) o = endStreak(o, 'offline', b, ev);
  return o;
}
/** A hidden gap under 60 s: the streak grace/decay in one step over the gap's focus time, which is 0 while hidden
 *  (D-HOP-08 #2, streak R10/K8: 5 s hidden at 0.28 returns 0.28). Egg, Frenzy and calls stay frozen (R7, AB-10). */
export function m5ShortGap(s: GameState, b: Balance): GameState {
  if (!m5Flag(b, 'streak') || !fin(s.streakS)) return s;
  const r = streakAfter(s.streakS, fin(s.streakHoldS) ? s.streakHoldS : 0, 0, b);
  return r.s === s.streakS && r.holdS === (s.streakHoldS ?? 0) ? s : { ...s, streakS: r.s, streakHoldS: r.holdS };
}
