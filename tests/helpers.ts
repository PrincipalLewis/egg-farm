export const mem = () => { const m = new Map<string, string>(); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };
import { balance } from '../src/config/balance';
import { eggsPerSec } from '../src/sim/state';
/** Expected offline eggs straight from config (AC11), so tests survive retunes. */
export const expOffline = (awayS: number, L = 0, b = balance) =>
  awayS < b.offline.offlineMinSeconds || awayS < 0 ? 0 : Math.floor(Math.min(awayS, b.offline.offlineCapSeconds) * b.offline.offlineRateMultiplier * eggsPerSec(L, b));
