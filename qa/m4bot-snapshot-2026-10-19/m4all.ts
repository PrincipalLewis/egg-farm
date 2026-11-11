/** Port of game 8308417 tests/bot-m4.ts pickM4All (D-HOP-2026-10-19-02): game payback pick over ALL purchasables, wait rule. */
import type { Balance } from '../src/config/balance';
import type { GameState } from '../src/sim/state';
import { candidates } from '../src/ui/next-goal';
import { bestPaybackAmong, type BuyKey } from '../src/econ/best-buy';
export type PickA = 'c' | 'f' | 'hens' | 'eggValue' | 'W1' | 'W2' | 'W3' | 'W4' | null;
const FROM_KEY: Record<BuyKey, Exclude<PickA, null>> = { FARM: 'f', COLL: 'c', HENS: 'hens', VALUE: 'eggValue', W1: 'W1', W2: 'W2', W3: 'W3', W4: 'W4' };
export function pickM4All(s: GameState, b: Balance, keys: readonly BuyKey[]): PickA {
  const offered = candidates(s, b).filter(c => keys.includes(c.key as BuyKey));
  const aff = offered.filter(c => s.coinsCents >= c.costCents).map(c => c.key as BuyKey);
  const p = bestPaybackAmong(s, b, aff.length ? aff : offered.map(c => c.key as BuyKey));
  return p && aff.includes(p.key) ? FROM_KEY[p.key] : null;
}
