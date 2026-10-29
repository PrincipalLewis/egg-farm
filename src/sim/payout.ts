/** The one sale-payout function (QA BUG-1/2, Product rule: every money preview == amount credited, to the cent).
 *  sellTo credits it; the Sell all label, '+$X' popup and order cards preview it. */
import type { Balance } from '../config/balance';
import type { GameState } from './state';
import { salePriceCents } from './tracks';
import { graderMult } from './workers';
import { PLAYER_SALE, saleEffectFactors, type SaleCtx } from './effects';
/** Price multipliers applied to a sale: the Grader, then every live timed effect from the F1c registry (sim/effects.ts).
 *  ctx defaults to a player sale with focus (UI previews and player credits); worker sales pass by/suspended. */
export function saleMultipliers(s: GameState, b: Balance, ctx: SaleCtx = PLAYER_SALE): number[] {
  const g = graderMult(s.workers, s.graderTier, b), fx = saleEffectFactors(s, b, ctx);
  return fx.length ? [g, ...fx.map(e => e.factor)] : [g];
}
/** Cents credited for selling k eggs now: exact k x price with no multiplier, else round(k x price x mult) (rounded once, X7). */
export function saleValueCents(s: GameState, k: number, b: Balance, ctx: SaleCtx = PLAYER_SALE): number {
  const base = salePriceCents(s, b), m = saleMultipliers(s, b, ctx).reduce((a, x) => a * x, 1);
  return m === 1 ? k * base : Math.round(k * base * m);
}
/** Preview of Sell all: same per-customer walk as the 'sellAll' action. */
export function sellAllPreview(s: GameState, b: Balance): { eggs: number; cents: number } {
  let left = Math.floor(s.basket), eggs = 0, cents = 0;
  for (const c of s.customers) { if (left < 1) break; const k = Math.min(left, c.demand - c.filled); if (k <= 0) continue; left -= k; eggs += k; cents += saleValueCents(s, k, b); }
  return { eggs, cents };
}
