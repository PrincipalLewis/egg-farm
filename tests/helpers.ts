export const mem = () => { const m = new Map<string, string>(); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };
import { balance } from '../src/config/balance';
import { eggsPerSec } from '../src/sim/state';
import { hensOfflineMult } from '../src/config/formulas';
/** Expected offline eggs straight from config, so tests survive retunes.
 *  Flag off: AC11 (min(away,cap) x rate x eggs_per_sec(Farm L)). M4 on (M4A-4, spec v1.14): CSV offline table at the Hens level
 *  H (default 0, i.e. a farm that never bought Hens; milestone mult x1 below H10): floor(min(min(away,cap) x eps[H], max2h[H]) x mult). */
export const expOffline = (awayS: number, L = 0, b = balance, H = 0) => {
  if (awayS < b.offline.offlineMinSeconds || awayS < 0) return 0;
  const t = b.m4?.enabled ? b.m4.offline : undefined;
  if (t) { const mult = hensOfflineMult(H, b); return Math.floor(Math.min(Math.min(awayS, b.offline.offlineCapSeconds) * t.eggsPerSec[H], t.maxEggs2h[H]) * mult); }
  return Math.floor(Math.min(awayS, b.offline.offlineCapSeconds) * b.offline.offlineRateMultiplier * eggsPerSec(L, b));
};
/** Offline grant for an UNMARKED v6 save (e.g. `save(kv, initialState(b), T0)`, no tracksV7) loaded on an M4 build: per ADR M4-14..17
 *  (src/game.ts:57-64) it boots as plain v6 under flag-off rules until the tracks commit, so the grant is AC11 (flag off). */
export const expOfflineV6 = (awayS: number, L = 0, b = balance) => expOffline(awayS, L, { ...b, m4: b.m4 ? { ...b.m4, enabled: 0 } : b.m4 } as typeof b);
