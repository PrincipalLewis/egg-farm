/**
 * S2-8 / S2-9: values the UI can read (Art & UX owns the visuals, on m3/rc1-ui). Pure; mirrors the sim exactly.
 * Wages are charged per action (tick.ts workerActions): wageCents(id, F, interval) rounded, once every `interval`.
 */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { queueMax } from '../sim/state';
import { mood, isOff, wageCents } from '../sim/workers';
export type WageWorker = 'market_hand' | 'coop_hand';
export const WAGE_WORKERS: WageWorker[] = ['market_hand', 'coop_hand'];
/** Actual wage drain of one worker right now, cents/s (0 if not hired, Asleep or Unpaid). */
export function wageCentsPerSec(id: WageWorker, s: GameState, b: Balance): number {
  const w = s.workers[id]; const m = mood(w, b); if (!w || isOff(m)) return 0;
  const interval = m === 'working' ? b.workers[id].every_s : b.workers[id].tired_every_s;
  return wageCents(id, s.farmLevel, interval, b) / interval;
}
/** Wage the hire card / worker panel shows ("Wage $X/s"): at Working pace for the current Farm level. */
export const listedWageCentsPerSec = (id: WageWorker, s: GameState, b: Balance) =>
  wageCents(id, s.farmLevel, b.workers[id].every_s, b) / b.workers[id].every_s;
export const totalWageCentsPerSec = (s: GameState, b: Balance) => WAGE_WORKERS.reduce((a, id) => a + wageCentsPerSec(id, s, b), 0);
/** Net money rate (income from sales minus wages), cents/s. Negative = the header shows it in red. */
export const netCentsPerSec = (incomeCentsPerSec: number, s: GameState, b: Balance) => incomeCentsPerSec - totalWageCentsPerSec(s, b);
/** S2-9: queue at capacity (drives a Market-tab badge/pulse; the sheet never opens by itself). */
export const queueFull = (s: GameState, b: Balance) => s.customers.length >= queueMax(s.farmLevel, b);
/** S2-9: a queue tap opens Market only if the finger went down on that same customer chip, already on screen
 *  for >= minAgeMs (a chip that arrives / reflows under a tap aimed elsewhere must not open the sheet). */
export const queueTapOpens = (downChip: unknown, upChip: unknown, chipAgeMs: number, minAgeMs = 250) =>
  !!downChip && downChip === upChip && chipAgeMs >= minAgeMs;
