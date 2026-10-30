/**
 * v5 F1c: the timed-effects registry (engineering/m5.0-sizing.md §1 F1(c), §4 hotspot 2). ONE place where every M5 uplift
 * enters the money and laying paths, so credit and every preview stay equal to the cent (payout.ts rule):
 *  - SALE_EFFECTS -> saleMultipliers(): streak (1 + s), Frenzy, Rush (Market Hand sales only: `by`), Shout. Golden spec X7.
 *  - LAY_EFFECTS  -> prodEggsPerSec(): Sweep (laying x tc_ability_w2_lay_mult, still capped by the coop).
 * Each feature PR appends ONE entry. An entry is consulted only while its m4.flags.* flag is on, and only when the
 * context is not suspended (D-C3 / golden R23: no timed uplift on ticks without focus, i.e. under a menu or a hide).
 * Inspect is not here: it changes the Grader multiplier itself (abilities spec rule 2), inside graderMult.
 */
import type { Balance } from '../config/balance';
import { flagOn, type M5Flag } from '../config/flags';
import type { GameState } from './state';
/** Who made the sale (SimEvent sell.by). Rush keys on 'market_hand'. */
export type SaleBy = 'player' | 'market_hand';
/** suspended = this sale/tick has no focus time: every timed effect counts as 1 (D-C3, R23). */
export interface SaleCtx { by: SaleBy; suspended?: boolean; }
export interface LayCtx { suspended?: boolean; }
export interface SaleEffect { id: string; flag: M5Flag; factor(s: GameState, b: Balance, ctx: SaleCtx): number; }
export interface LayEffect { id: string; flag: M5Flag; factor(s: GameState, b: Balance): number; }
/** Feature PRs append their entry IN THIS FILE (one line each). Order is documentation only: factors multiply (golden X7).
 *  Typed readonly (CCR nit #80): src cannot mutate them; only tests cast to push a fixture entry and clear it in afterEach. */
export const SALE_EFFECTS: readonly SaleEffect[] = [];
export const LAY_EFFECTS: readonly LayEffect[] = [];
export const PLAYER_SALE: SaleCtx = { by: 'player' };
/** CCR m1 #80: the ONE player-sale context for a given attended value (Q-F1c-1). sellTo credits with it; every preview uses it. */
export const playerSaleCtx = (attended: boolean): SaleCtx => attended ? PLAYER_SALE : { by: 'player', suspended: true };
/** Live sale factors with attribution: [{id, factor}] for entries whose flag is on and that are not neutral (factor !== 1). */
export function saleEffectFactors(s: GameState, b: Balance, ctx: SaleCtx = PLAYER_SALE, effects: readonly SaleEffect[] = SALE_EFFECTS): { id: string; factor: number }[] {
  if (ctx.suspended || !effects.length) return [];
  const out: { id: string; factor: number }[] = [];
  for (const e of effects) if (flagOn(b, e.flag)) { const f = e.factor(s, b, ctx); if (f !== 1) out.push({ id: e.id, factor: f }); }
  return out;
}
/** Product of live laying factors (1 when none). */
export function layFactor(s: GameState, b: Balance, ctx?: LayCtx, effects: readonly LayEffect[] = LAY_EFFECTS): number {
  if (!ctx || ctx.suspended || !effects.length) return 1;
  let m = 1; for (const e of effects) if (flagOn(b, e.flag)) m *= e.factor(s, b);
  return m;
}
