/**
 * ===== STUB of the Saves module (fix/hidden-tab-offline, src/save/hidden-time.ts; SHA due Sat 2026-10-17 08:00) =====
 * Same path, names and types as the final interface Saves published, so the swap is: take their file, delete this one.
 * The stub only exists so offline popup v2 (C-AC36) can be built and tested before the real module lands.
 *  - Game calls accountHiddenPeriod itself when the tab is shown again (Game.endHidden); it fires on show only.
 *  - Idempotent by startAt: a second call for the same period returns null and notifies nobody.
 *  - The popup only subscribes via onHiddenPeriodAccounted and does no accounting of its own.
 */
import type { Game } from '../game';
export interface HiddenPeriodResult { periodId: number; startAt: number; endAt: number; elapsedMs: number; simulatedMs: number; grantedMs: number; eggsGranted: number; coinsGranted: number; capped: boolean; mode: 'online' | 'offline-grant' | 'none'; }
const subs = new Set<(r: HiddenPeriodResult) => void>();
const done = new Set<number>(); let nextPeriodId = 1; // monotonic (Saves interface update, ~Sat 07:00)
export function onHiddenPeriodAccounted(cb: (r: HiddenPeriodResult) => void): () => void { subs.add(cb); return () => { subs.delete(cb); }; }
/** STUB accounting: >= offlineMinSeconds -> one offline grant (same path as close-and-reload); shorter -> simulated online
 *  on the next frame; another tab owns the save / nothing granted -> 'none'. */
export function accountHiddenPeriod(game: Game, p: { startAt: number; endAt: number }): HiddenPeriodResult | null {
  if (done.has(p.startAt)) return null; done.add(p.startAt);
  const b = game.balance, elapsedMs = Math.max(0, p.endAt - p.startAt), capMs = b.offline.offlineCapSeconds * 1000;
  const online = elapsedMs < b.offline.offlineMinSeconds * 1000, eggs = game.resumeFromHidden(elapsedMs);
  const mode: HiddenPeriodResult['mode'] = eggs > 0 ? 'offline-grant' : online && !game.inactive ? 'online' : 'none';
  const r: HiddenPeriodResult = { periodId: nextPeriodId++, startAt: p.startAt, endAt: p.endAt, elapsedMs, simulatedMs: mode === 'online' ? elapsedMs : 0,
    grantedMs: mode === 'offline-grant' ? Math.min(elapsedMs, capMs) : 0, eggsGranted: eggs, coinsGranted: 0, capped: mode === 'offline-grant' && elapsedMs >= capMs, mode };
  subs.forEach(f => f(r)); return r;
}
/** Test-only: forget accounted periods and subscribers. */
export function __resetHiddenTimeStub() { subs.clear(); done.clear(); }
