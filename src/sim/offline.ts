import type { Balance } from '../config/balance';
import { GameState, eggsPerSec } from './state';
import { prodEggsPerSec, offlineMult } from './tracks';
import { m4On, clampL } from '../config/formulas';
import { breedsOffline } from './breeds';
import { breedsCalmClearRing } from './breeds-traits';
/** spec v1.14 M4A-4 (M4 on): floor(min(min(away, cap) x CSV offline_eggs_per_sec[H], CSV offline_max_eggs_2h[H]) x Hens milestone mult).
 *  Rate and cap are read from data (balance.m4.offline via sync-economy), never derived from rate x eps. Flag off: unchanged (AC11). */
export function m4OfflineEggs(awayS: number, hensLevel: number, b: Balance, mult = 1): number {
  const o = b.offline, t = b.m4!.offline!; if (!isFinite(awayS) || awayS < o.offlineMinSeconds) return 0;
  const L = clampL(hensLevel, b);
  return Math.floor(Math.min(Math.min(awayS, o.offlineCapSeconds) * t.eggsPerSec[L], t.maxEggs2h[L]) * mult);
}
/** AC11: eggs = floor(min(away,cap) * mult * eggs_per_sec(saved farm L)); <60s or negative => 0. */
/** `eps` overrides the Farm curve (M4-A: the Hens track rate). */
export function offlineEggs(awayS: number, farmLevel: number, b: Balance, eps = eggsPerSec(farmLevel, b), mult = 1): number {
  const o = b.offline;
  if (!isFinite(awayS) || awayS < o.offlineMinSeconds) return 0;
  return Math.floor(Math.min(awayS, o.offlineCapSeconds) * o.offlineRateMultiplier * eps * mult);
}
/** Coop untouched; eggs parked in pendingOfflineEggs until the modal's Collect (bypasses coop cap). */
/** D-HOP-2026-11-06-01 (a) / Pause v1.3.15: the egg grant depends on hen state, the eligible gap, and the cap.
 *  Pause, hire, and m4.flags.pause do not change it. */
export function applyOffline(s: GameState, awayMs: number, b: Balance) {
  const eggs = m4On(b) && b.m4?.offline ? m4OfflineEggs(awayMs / 1000, s.hensLevel, b, offlineMult(s, b))
    : offlineEggs(awayMs / 1000, s.farmLevel, b, prodEggsPerSec(s, b), offlineMult(s, b));
  const awayS = Math.max(0, Math.min(awayMs / 1000, b.offline.offlineCapSeconds));
  const br = breedsOffline(s, awayMs, b); // M5.1 BR-R18: same capped gap, even when the grant is 0 eggs; identity when flag off
  // E22b / BR-AC49: hide ≥ offlineMinSeconds empties the Present calm ring (gate open on return).
  let state = br.state;
  if (m4On(b) && b.m4?.flags?.breeds === 1 && awayMs >= b.offline.offlineMinSeconds * 1000) state = breedsCalmClearRing(state);
  return { state: eggs > 0 ? { ...state, pendingOfflineEggs: state.pendingOfflineEggs + eggs } : state, eggs, awayS, reveal: br.reveal };
}
