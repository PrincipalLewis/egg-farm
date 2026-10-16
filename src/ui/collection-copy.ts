/** C-AC26 Collection upgrade copy — price first; deltas from balance, never hard-coded. */
import type { Balance } from '../config/balance';
import { collectionPriceBonus, eggsPerTap } from '../config/formulas';

/** Percent points of collection_price_bonus at level L (e.g. L=4 → 48). */
export const priceBonusPct = (L: number, b: Balance) =>
  Math.round(collectionPriceBonus(L, b) * 100);

/** Per-level deltas for the short summary (balance collection.pricePercentPerLevel / eggsPerTapPerLevel). */
export function collectionDeltas(b: Balance): { pricePct: number; tap: number } {
  return {
    pricePct: Math.round(b.collection.pricePercentPerLevel * 100),
    tap: b.collection.eggsPerTapPerLevel,
  };
}

/** Short next-level summary: "+12% egg price · +5/tap". */
export function collectionSummary(b: Balance): string {
  const { pricePct, tap } = collectionDeltas(b);
  return `+${pricePct}% egg price · +${tap}/tap`;
}

/** before→after fx lines, price first (C-AC26). */
export function collectionFxLines(C: number, b: Balance): string[] {
  const a = priceBonusPct(C, b), z = priceBonusPct(C + 1, b);
  const tapA = eggsPerTap(C, b), tapZ = eggsPerTap(C + 1, b);
  return [
    `Egg price +${a}% → +${z}%`,
    `Eggs per tap ${tapA} → ${tapZ}`,
  ];
}

/** True if s is a bare "+N/tap" (or "+N eggs/tap") with no price/income wording. */
export function isBareTapOnly(s: string): boolean {
  const t = s.trim();
  if (/egg price|% income|% price/i.test(t)) return false;
  return /^\+?\d+\s*(\/tap|eggs\/tap)$/i.test(t);
}
