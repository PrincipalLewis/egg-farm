/**
 * M5 unpaid_trickle (product/workers/m5-unpaid-trickle-spec.md v1.0.2, sha1 9e2acfe985887ff3543745fd80c7066f313c5f2b).
 * Behind m4.flags.unpaidTrickle (default 0). Flag off or k = 0: identity — same object, no credit, no events, no new fields (AC-T1).
 * Legal k is {0} ∪ [0.5, 1.0] (Q2, D-HOP-2026-11-14-10). Rate from workers.energy.unpaid_trickle, never a magic number.
 */
import type { Balance } from '../config/balance';
import { flagOn } from '../config/flags';
import { CENTS_PER_DOLLAR } from '../config/breeds';
import type { Sink } from './events';
import { isPaused } from './pause';
import type { GameState } from './state';
import { unpaidResumeAtCents, type Worker, type WorkerId, type Workers } from './workers';

/** Unit scale: wage_per_farm_per_min → per-second (not a CSV tunable). */
export const SECONDS_PER_MINUTE = 60;

export type WageHand = 'market_hand' | 'coop_hand';
const HANDS = ['market_hand', 'coop_hand'] as const;
const trickleHands = (n: number) => (n >= HANDS.length ? HANDS.length : 1);

/** Feature is live: flag on AND k > 0 (shipping k = 0 is a no-op even if the flag is 1). */
export const unpaidTrickleOn = (b: Balance): boolean =>
  flagOn(b, 'unpaidTrickle') && (b.workers.energy.unpaid_trickle ?? 0) > 0;

export const unpaidTrickleK = (b: Balance): number => b.workers.energy.unpaid_trickle ?? 0;

/** §2.1 "in the sum": hired wage-hand, Unpaid, not paused, not Asleep. Unpaid at energy 0 is Unpaid (counts). */
export function isContributing(w: Worker | undefined, b: Balance): boolean {
  return !!w && w.unpaid === true && !isPaused(w, b);
}

export function contributingHands(ws: Workers, b: Balance): WageHand[] {
  return HANDS.filter(id => isContributing(ws[id], b));
}

export function lastContributingHand(ws: Workers, b: Balance): WageHand | null {
  const hs = contributingHands(ws, b);
  return hs.length ? hs[hs.length - 1] : null;
}

/** Exact trickle rate in cents per second: k × Σ(wage_per_farm_per_min × F) × 100 / 60. 0 when the feature is off or the sum is empty. */
export function unpaidTrickleRateCentsPerSec(ws: Workers, farm: number, b: Balance): number {
  if (!unpaidTrickleOn(b)) return 0;
  const k = unpaidTrickleK(b);
  let sum = 0;
  for (const id of contributingHands(ws, b)) sum += b.workers[id].wage_per_farm_per_min * farm;
  return k * sum * CENTS_PER_DOLLAR / SECONDS_PER_MINUTE;
}

/** Dollars per second, for the HUD income/s display only (Q3, D-HOP-2026-11-14-15). Not a sim input. */
export const unpaidTrickleDollarsPerSec = (s: GameState, b: Balance): number =>
  unpaidTrickleRateCentsPerSec(s.workers, s.farmLevel, b) / CENTS_PER_DOLLAR;

/** T-R9 (§2.4, SIGNED): with the flag on, k > 0 and the sum > 0, R9 runs only when coins cover the last contributing hand's unpaidResumeAtCents. Otherwise today's R9. The reserve formula is unchanged. */
export function shouldRunR9(s: GameState, b: Balance): boolean {
  if (!unpaidTrickleOn(b)) return true;
  const last = lastContributingHand(s.workers, b);
  if (!last) return true;
  const at = unpaidResumeAtCents(s.workers, s.farmLevel, b, last);
  if (at === null) return true;
  return s.coinsCents >= at;
}

const EPS = 1e-9;

function creditCents(s: GameState, cents: number, frac: number): GameState {
  if (cents <= 0 && frac === (s.unpaidTrickleFrac ?? 0)) return s;
  const out: GameState = { ...s, coinsCents: s.coinsCents + cents };
  if (frac > EPS) out.unpaidTrickleFrac = frac;
  else if ('unpaidTrickleFrac' in out) { const { unpaidTrickleFrac: _f, ...rest } = out; return rest as GameState; }
  return out;
}

function addSession(s: GameState, cents: number, dtS: number): GameState {
  const ms = Math.round(dtS * 1000);
  if (cents <= 0 && ms <= 0) return s;
  return {
    ...s,
    unpaidTrickleSessionMs: (s.unpaidTrickleSessionMs ?? 0) + Math.max(0, ms),
    unpaidTrickleSessionCents: (s.unpaidTrickleSessionCents ?? 0) + Math.max(0, cents),
    unpaidTrickleEp: s.unpaidTrickleEp
      ? { ...s.unpaidTrickleEp, ms: s.unpaidTrickleEp.ms + Math.max(0, ms), coins: s.unpaidTrickleEp.coins + Math.max(0, cents) }
      : s.unpaidTrickleEp,
  };
}

function startEpisode(s: GameState, b: Balance, ev?: Sink): GameState {
  const hs = contributingHands(s.workers, b);
  if (!hs.length) return s;
  const rate = unpaidTrickleRateCentsPerSec(s.workers, s.farmLevel, b);
  ev?.push({ type: 'unpaid_trickle_started', farm: s.farmLevel, hands: trickleHands(hs.length), rate_cents_per_s: Math.floor(rate + EPS) });
  return { ...s, unpaidTrickleWasOn: true, unpaidTrickleEp: { ms: 0, coins: 0, farm: s.farmLevel, hands: trickleHands(hs.length) } };
}

function endEpisode(s: GameState, b: Balance, cause: 'resumed' | 'zero_sum' | 'flag_off', ev?: Sink): GameState {
  const ep = s.unpaidTrickleEp;
  const farm = ep?.farm ?? s.farmLevel;
  const duration_s = typeof ep?.ms === 'number' && Number.isFinite(ep.ms) && ep.ms > 0 ? Math.floor(ep.ms / 1000) : 0;
  const coins_cents = ep?.coins ?? 0;
  ev?.push({ type: 'unpaid_trickle_ended', farm, duration_s, coins_cents, cause });
  const { unpaidTrickleEp: _e, unpaidTrickleWasOn: _w, ...rest } = s;
  return rest as GameState;
}

/** Live tick: start/stop telemetry around the current sum, then credit dt at the pre-R9 rate (wageCharge-style carry). Call BEFORE R9. */
export function applyUnpaidTrickleLive(s: GameState, dt: number, b: Balance, ev?: Sink): GameState {
  const on = unpaidTrickleOn(b);
  const sum = on ? contributingHands(s.workers, b).length : 0;
  const was = !!s.unpaidTrickleWasOn;
  if (!on) {
    // flag_off edge (test-config): close an open episode
    if (was) return endEpisode(s, b, 'flag_off', ev);
    return s;
  }
  let out = s;
  if (sum > 0 && !was) out = startEpisode(out, b, ev);
  if (sum === 0 && was) return endEpisode(out, b, 'zero_sum', ev);
  if (!(sum > 0) || !(dt > 0) || !Number.isFinite(dt)) return out;
  const rate = unpaidTrickleRateCentsPerSec(out.workers, out.farmLevel, b);
  if (!(rate > 0)) return out;
  const due = rate * dt + (out.unpaidTrickleFrac ?? 0);
  const cents = Math.floor(due + EPS);
  const frac = Math.max(0, due - cents);
  out = creditCents(out, cents, frac);
  out = addSession(out, cents, dt);
  return { ...out, unpaidTrickleWasOn: true };
}

/** After the R9 pass: if the last contributing hand just resumed, close the episode with cause "resumed". */
export function noteUnpaidTrickleAfterR9(s: GameState, b: Balance, ev?: Sink): GameState {
  if (!s.unpaidTrickleWasOn) return s;
  if (unpaidTrickleOn(b) && contributingHands(s.workers, b).length > 0) return s;
  if (!unpaidTrickleOn(b)) return endEpisode(s, b, 'flag_off', ev);
  return endEpisode(s, b, 'resumed', ev);
}

/** Seconds until this contributing hand's (T-R9: the set's) unpaidResumeAtCents is met at the current rate. null if not running. */
export function trickleResumeInS(s: GameState, b: Balance, id: WorkerId): number | null {
  if (!unpaidTrickleOn(b) || !isContributing(s.workers[id], b)) return null;
  const last = lastContributingHand(s.workers, b);
  // T-R9: both contributing cards show the combined need (last hand's at).
  const atId = last ?? (id as WageHand);
  const at = unpaidResumeAtCents(s.workers, s.farmLevel, b, atId);
  if (at === null) return null;
  const rate = unpaidTrickleRateCentsPerSec(s.workers, s.farmLevel, b);
  if (!(rate > 0)) return null;
  return Math.max(0, (at - s.coinsCents) / rate);
}

/** Offline coin credit (§2.5): only while the sum > 0, only min(away, cap), 0 if gap < min or non-finite/negative. Hands stay Unpaid; credit stops at the T-R9 instant. Eggs are untouched (caller). */
export function applyUnpaidTrickleOffline(s: GameState, awayMs: number, b: Balance): GameState {
  if (!unpaidTrickleOn(b)) return s;
  const o = b.offline;
  if (!Number.isFinite(awayMs) || awayMs < 0) return s;
  if (awayMs < o.offlineMinSeconds * 1000) return s;
  let left = Math.min(awayMs / 1000, o.offlineCapSeconds);
  if (!(left > 0)) return s;
  const rate = unpaidTrickleRateCentsPerSec(s.workers, s.farmLevel, b);
  if (!(rate > 0)) return s;
  const last = lastContributingHand(s.workers, b);
  const at = last ? unpaidResumeAtCents(s.workers, s.farmLevel, b, last) : null;
  if (at !== null && s.coinsCents >= at) return s; // already at the T-R9 instant; no further credit; R9 on return
  let dt = left;
  if (at !== null && at > s.coinsCents) dt = Math.min(left, (at - s.coinsCents) / rate);
  if (!(dt > 0)) return s;
  const due = rate * dt + (s.unpaidTrickleFrac ?? 0);
  const cents = Math.floor(due + EPS);
  const frac = Math.max(0, due - cents);
  let out = creditCents(s, cents, frac);
  out = addSession(out, cents, dt);
  if (contributingHands(out.workers, b).length && !out.unpaidTrickleWasOn) {
    out = { ...out, unpaidTrickleWasOn: true, unpaidTrickleEp: out.unpaidTrickleEp ?? { ms: Math.round(dt * 1000), coins: cents, farm: out.farmLevel, hands: trickleHands(contributingHands(out.workers, b).length) } };
  }
  return out;
}

export function unpaidTrickleSessionEnd(s: GameState, b: Balance): { unpaid_trickle_s?: number; unpaid_trickle_coins?: number } {
  if (!flagOn(b, 'unpaidTrickle')) return {};
  const floorS = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v / 1000) : 0;
  return { unpaid_trickle_s: floorS(s.unpaidTrickleSessionMs), unpaid_trickle_coins: s.unpaidTrickleSessionCents ?? 0 };
}

/** Session rotate: drop session accumulators in place (idempotent). Flag-off with no keys: same object. */
export function resetUnpaidTrickleSession(s: GameState): GameState {
  if (!('unpaidTrickleSessionMs' in s) && !('unpaidTrickleSessionCents' in s) && !('unpaidTrickleEp' in s) && !('unpaidTrickleWasOn' in s) && !('unpaidTrickleFrac' in s)) return s;
  delete (s as { unpaidTrickleSessionMs?: number }).unpaidTrickleSessionMs;
  delete (s as { unpaidTrickleSessionCents?: number }).unpaidTrickleSessionCents;
  delete (s as { unpaidTrickleEp?: unknown }).unpaidTrickleEp;
  delete (s as { unpaidTrickleWasOn?: unknown }).unpaidTrickleWasOn;
  delete (s as { unpaidTrickleFrac?: number }).unpaidTrickleFrac;
  return s;
}
