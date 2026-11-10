/**
 * v5 streak price chips (product/collection/m4-collect-streak-spec.md v0.3 §4.5, S-AC19/S-AC20, kept unchanged by
 * m5-streak-tap-coins-spec.md v1.3.3 b315dea1 §3.5 "Price chips" + ST-AC22; art-ux/m5-combo-tiers.md v0.3 ed4ded1d §4.1: no
 * tier-based change to chips). Every visible egg price (order card price line, Sell value, Sell all) shows a meadow `+N%` chip
 * while the streak uplift applies; with a Frenzy the gold `2×` chip comes first; on overflow at 360 both collapse into one gold
 * `2×+` chip whose aria-label names both bonuses.
 * The chips are derived from sim/effects.ts saleEffectFactors with the SAME SaleCtx the preview/credit uses (Game.playerSaleCtx(),
 * CCR F-2), so a chip shows exactly when that uplift is in the credited price (none while suspended under a menu, R12).
 * Pure: the caller decides `collapse` from the rendered row (scrollWidth > clientWidth at the phone layout).
 */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { PLAYER_SALE, saleEffectFactors, type SaleCtx } from '../sim/effects';
import { pctFloor } from './streak-view';

export interface PriceChip { kind: 'frenzy' | 'streak' | 'combined'; text: string; aria: string }
const fmtMult = (f: number) => `${Number(f.toFixed(2))}×`;
export function priceChips(s: GameState, b: Balance, ctx: SaleCtx = PLAYER_SALE, o: { collapse?: boolean } = {}): PriceChip[] {
  const live = saleEffectFactors(s, b, ctx), fr = live.find(e => e.id === 'frenzy'), sk = live.find(e => e.id === 'streak');
  const out: PriceChip[] = [];
  if (fr) out.push({ kind: 'frenzy', text: fmtMult(fr.factor), aria: `Frenzy ${fmtMult(fr.factor)} price` });
  if (sk) { const n = pctFloor(sk.factor - 1); out.push({ kind: 'streak', text: `+${n}%`, aria: `Streak +${n}% price` }); }
  if (o.collapse && fr && sk) return [{ kind: 'combined', text: `${fmtMult(fr.factor)}+`, aria: `${out[0].aria} and streak ${out[1].text} price` }];
  return out;
}
/** Inline chip markup for a price line ('' when no chip). Text is fixed copy (no user input). */
export const priceChipsHtml = (chips: readonly PriceChip[]) => (chips.length
  ? `<span class="price-chips">${chips.map(c => `<span class="price-chip ${c.kind}" role="img" aria-label="${c.aria}">${c.text}</span>`).join('')}</span>` : '');
