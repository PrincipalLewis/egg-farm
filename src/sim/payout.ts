/** The one sale-payout function (QA BUG-1/2, Product rule: every money preview == amount credited, to the cent).
 *  sellTo credits it; the Sell all label, '+$X' popup and order cards preview it. */
import type { Balance } from '../config/balance';
import type { GameState } from './state';
import { salePriceCents } from './tracks';
import { graderMult } from './workers';
import { streakSaleFactor } from './streak';
/** v5 (F1c sim/effects.ts SaleCtx shape): who sold, and whether the tick has no focus (timed effects count as 1, D-C3). */
export interface SaleCtx { by: 'player' | 'market_hand'; suspended?: boolean; }
/** Price multipliers applied to a sale, in order: the Grader, then the #2 streak (1 + s) while live (on merge with F1c this
 *  becomes its SALE_EFFECTS entry). ctx absent = a player sale with focus (credits and every UI preview). */
export function saleMultipliers(s: GameState, b: Balance, ctx?: SaleCtx): number[] {
  const g = graderMult(s.workers, s.graderTier, b), k = streakSaleFactor(s, b, ctx?.suspended);
  return k === 1 ? [g] : [g, k];
}
/** Cents credited for selling k eggs now: exact k x price with no multiplier, else round(k x price x mult). */
export function saleValueCents(s: GameState, k: number, b: Balance, ctx?: SaleCtx): number {
  const base = salePriceCents(s, b), m = saleMultipliers(s, b, ctx).reduce((a, x) => a * x, 1);
  return m === 1 ? k * base : Math.round(k * base * m);
}
/** Preview of Sell all: same per-customer walk as the 'sellAll' action. */
export function sellAllPreview(s: GameState, b: Balance): { eggs: number; cents: number } {
  let left = Math.floor(s.basket), eggs = 0, cents = 0;
  for (const c of s.customers) { if (left < 1) break; const k = Math.min(left, c.demand - c.filled); if (k <= 0) continue; left -= k; eggs += k; cents += saleValueCents(s, k, b); }
  return { eggs, cents };
}
