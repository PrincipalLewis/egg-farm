/**
 * S2 hidden-tab time accounting: the ONE game-side entry point for a hidden period (HoE scope, UI #16 codes against it).
 *
 *   accountHiddenPeriod(game, { startAt, endAt }): HiddenPeriodResult | null
 *     Accounts the hidden period that began at `startAt` (the Game.onHidden time recorded via platform/visibility) and
 *     ended at `endAt`. Accounting happens only on show; a hide records startAt and yields no result.
 *     Exactly once per period, keyed by (game, periodId): a replay, a double visible, a shown with no hidden first, or
 *     a startAt that is not the game's open hidden period returns null and changes nothing. Game.onShown calls this.
 *     periodId is a monotonic counter assigned in onHidden, so a reused startAt ms can never leave the game stuck hidden.
 *   onHiddenPeriodAccounted(cb): () => void
 *     Subscribe; cb fires once per accounted period (after the game state and save are updated). Returns unsubscribe.
 *
 * Result modes: 'offline-grant' (hidden >= offlineMinSeconds: provisional sim dropped, whole span paid like close+reload),
 * 'online' (shorter span: the <= 60 s hidden sim is kept, including uncovered gap with no frames), 'none'
 * (game inactive/read-only, or the clock went back).
 * capped = the offline cap (offlineCapSeconds, 2 h) or the 60 s hidden-sim budget limited the period.
 */
import type { Game } from '../game';

export interface HiddenPeriodResult {
  startAt: number; endAt: number; elapsedMs: number; simulatedMs: number; grantedMs: number;
  eggsGranted: number; coinsGranted: number; capped: boolean; mode: 'online' | 'offline-grant' | 'none';
  /** Monotonic id of this hidden period (assigned in onHidden). Extra field for callers; UI keeps using startAt etc. */
  periodId: number;
}
/** What Game.settleHiddenPeriod reports back (internal contract between Game and this module). */
export interface HiddenSettlement { mode: HiddenPeriodResult['mode']; simulatedMs: number; grantedMs: number; eggs: number; coins: number; capped: boolean }

/** Last accounted periodId per Game (bounded: only the last id is kept). */
const accounted = new WeakMap<Game, number>();
const listeners = new Set<(r: HiddenPeriodResult) => void>();

export function accountHiddenPeriod(game: Game, p: { startAt: number; endAt: number }): HiddenPeriodResult | null {
  const open = game.openHiddenPeriod;
  if (!open || open.at !== p.startAt) return null;
  if (accounted.get(game) === open.periodId) return null;
  accounted.set(game, open.periodId);
  const periodId = open.periodId;
  const s = game.settleHiddenPeriod(p.endAt);
  const r: HiddenPeriodResult = { startAt: p.startAt, endAt: p.endAt, elapsedMs: p.endAt - p.startAt, simulatedMs: s.simulatedMs,
    grantedMs: s.grantedMs, eggsGranted: s.eggs, coinsGranted: s.coins, capped: s.capped, mode: s.mode, periodId };
  for (const cb of [...listeners]) { try { cb(r); } catch { /* a listener never breaks accounting */ } }
  return r;
}

export function onHiddenPeriodAccounted(cb: (r: HiddenPeriodResult) => void): () => void {
  listeners.add(cb); return () => { listeners.delete(cb); };
}
