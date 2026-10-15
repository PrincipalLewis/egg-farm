import type { Balance } from '../config/balance';
import { GameState, eggsPerSec } from './state';
/** AC11: eggs = floor(min(away,cap) * mult * eggs_per_sec(saved farm L)); <60s or negative => 0. */
export function offlineEggs(awayS: number, farmLevel: number, b: Balance): number {
  const o = b.offline;
  if (!isFinite(awayS) || awayS < o.offlineMinSeconds) return 0;
  return Math.floor(Math.min(awayS, o.offlineCapSeconds) * o.offlineRateMultiplier * eggsPerSec(farmLevel, b));
}
/** Coop untouched; eggs parked in pendingOfflineEggs until the modal's Collect (bypasses coop cap). */
export function applyOffline(s: GameState, awayMs: number, b: Balance) {
  const eggs = offlineEggs(awayMs / 1000, s.farmLevel, b);
  const awayS = Math.max(0, Math.min(awayMs / 1000, b.offline.offlineCapSeconds));
  return { state: eggs > 0 ? { ...s, pendingOfflineEggs: s.pendingOfflineEggs + eggs } : s, eggs, awayS };
}
