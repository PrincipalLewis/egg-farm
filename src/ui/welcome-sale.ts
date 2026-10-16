/** S2-4c (Art & UX 2026-10-16 08:47): the welcome-back card explains eggs the Market Hand sells the moment the offline eggs land.
 *  Dry-run (no state change): apply collectOffline, then step the sim for `windowS` and sum the Market Hand's sales. The sim is
 *  deterministic (rng lives in state), so this is the sale that really happens after Collect. */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import type { SimEvent } from '../sim/events';
import { apply } from '../sim/actions';
import { step } from '../sim/tick';
export function instantSale(s: GameState, b: Balance, windowS = b.workers.market_hand.every_s): { eggs: number; cents: number } {
  if (!s.workers.market_hand || s.pendingOfflineEggs <= 0) return { eggs: 0, cents: 0 };
  let t = apply(s, { type: 'collectOffline' }, b); const ev: SimEvent[] = [];
  for (let i = 0; i < Math.round(windowS * b.tickHz); i++) t = step(t, 1 / b.tickHz, b, ev);
  let eggs = 0, cents = 0;
  for (const e of ev) if (e.type === 'sell' && e.by === 'market_hand') { eggs += e.k; cents += e.value; }
  return { eggs, cents };
}
/** Compact count: 339, 1.2K, 3.4M (floor to 1 decimal so it never overstates). */
export const compact = (n: number) => n < 1000 ? String(Math.floor(n)) : n < 1e6 ? `${(Math.floor(n / 100) / 10).toFixed(1)}K` : `${(Math.floor(n / 1e5) / 10).toFixed(1)}M`;
/** "Market Hand sold 339 right away · +$1,279"; '' (line hidden) when nothing sold. */
export const saleLine = (r: { eggs: number; cents: number }, fc: (n: number) => string, fm: (c: number) => string) =>
  r.eggs > 0 ? `Market Hand sold ${fc(r.eggs)} right away\u00a0· +${fm(r.cents)}` : '';
