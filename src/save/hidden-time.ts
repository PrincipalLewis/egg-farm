/**
 * S2 hidden-tab time accounting: the ONE game-side entry point for a hidden period (HoE scope, UI #16 codes against it).
 *
 *   accountHiddenPeriod(game, { startAt, endAt }): HiddenPeriodResult | null
 *     Accounts the hidden period that began at `startAt` (the Game.onHidden time recorded via platform/visibility) and
 *     ended at `endAt`. Accounting happens only on show; a hide records startAt and yields no result.
 *     Exactly once per period, keyed by (game, startAt): a replay, a double visible, a shown with no hidden first, or
 *     a startAt that is not the game's open hidden period returns null and changes nothing. Game.onShown calls this.
 *   onHiddenPeriodAccounted(cb): () => void
 *     Subscribe; cb fires once per accounted period (after the game state and save are updated). Returns unsubscribe.
 *
 * Result modes: 'offline-grant' (hidden >= offlineMinSeconds: provisional sim dropped, whole span paid like close+reload),
 * 'online' (shorter span: the <= 60 s hidden sim is kept), 'none' (game inactive/read-only, or the clock went back).
 * capped = the offline cap (offlineCapSeconds, 2 h) or the 60 s hidden-sim budget limited the period.
 */
import type { Game } from '../game';

export interface HiddenPeriodResult {
  startAt: number; endAt: number; elapsedMs: number; simulatedMs: number; grantedMs: number;
  eggsGranted: number; coinsGranted: number; capped: boolean; mode: 'online' | 'offline-grant' | 'none';
}
/** What Game.settleHiddenPeriod reports back (internal contract between Game and this module). */
export interface HiddenSettlement { mode: HiddenPeriodResult['mode']; simulatedMs: number; grantedMs: number; eggs: number; coins: number; capped: boolean }

const accounted = new WeakMap<Game, Set<number>>();
const listeners = new Set<(r: HiddenPeriodResult) => void>();

export function accountHiddenPeriod(game: Game, p: { startAt: number; endAt: number }): HiddenPeriodResult | null {
  let seen = accounted.get(game); if (!seen) accounted.set(game, seen = new Set());
  if (seen.has(p.startAt) || game.hiddenSince !== p.startAt) return null;
  seen.add(p.startAt);
  const s = game.settleHiddenPeriod(p.endAt);
  const r: HiddenPeriodResult = { startAt: p.startAt, endAt: p.endAt, elapsedMs: p.endAt - p.startAt, simulatedMs: s.simulatedMs,
    grantedMs: s.grantedMs, eggsGranted: s.eggs, coinsGranted: s.coins, capped: s.capped, mode: s.mode };
  for (const cb of [...listeners]) { try { cb(r); } catch { /* a listener never breaks accounting */ } }
  return r;
}

export function onHiddenPeriodAccounted(cb: (r: HiddenPeriodResult) => void): () => void {
  listeners.add(cb); return () => { listeners.delete(cb); };
}
