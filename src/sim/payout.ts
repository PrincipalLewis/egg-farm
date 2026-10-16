/** The one sale-payout function (QA BUG-1/2, Product rule: every money preview == amount credited, to the cent).
 *  sellTo credits it; the Sell all label, '+$X' popup and order cards preview it. */
import type { Balance } from '../config/balance';
import { type GameState, eggPriceCents } from './state';
import { graderMult } from './workers';
/** Price multipliers applied to a sale, in order. M4 adds streak / frenzy entries here (one place for credit + previews). */
export function saleMultipliers(s: GameState, b: Balance): number[] {
  return [graderMult(s.workers, s.graderTier, b)];
}
/** Cents credited for selling k eggs now: exact k x price with no multiplier, else round(k x price x mult). */
export function saleValueCents(s: GameState, k: number, b: Balance): number {
  const base = eggPriceCents(s.farmLevel, s.collectionLevel, b), m = saleMultipliers(s, b).reduce((a, x) => a * x, 1);
  return m === 1 ? k * base : Math.round(k * base * m);
}
/** Preview of Sell all: same per-customer walk as the 'sellAll' action. */
export function sellAllPreview(s: GameState, b: Balance): { eggs: number; cents: number } {
  let left = Math.floor(s.basket), eggs = 0, cents = 0;
  for (const c of s.customers) { if (left < 1) break; const k = Math.min(left, c.demand - c.filled); if (k <= 0) continue; left -= k; eggs += k; cents += saleValueCents(s, k, b); }
  return { eggs, cents };
}
