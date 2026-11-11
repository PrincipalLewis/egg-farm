/** Economy scratch (m4-ac7-bot): M4 buy step for QA's seller15 bots. Farm is replaced by the game's own Farm-tab pick
 *  (src/ui/tracks-ui.ts highlightPick -> econ/best-buy.ts bestPaybackAmong over FARM/HENS/VALUE, 90a9c84). Collection keeps
 *  QA's seller15 rule, measured against the picked row's cost. With m4 off this returns exactly QA's farm/collection choice. */
import type { Balance } from '../src/config/balance';
import type { GameState } from '../src/sim/state';
import { collectionCost, farmCost } from '../src/sim/state';
import { m4On } from '../src/config/formulas';
import { highlightPick } from '../src/ui/tracks-ui';
export type Pick = 'c' | 'f' | 'hens' | 'eggValue' | null;
export function pickM4(s: GameState, b: Balance, cheapFirst: boolean): Pick {
  const cc = s.collectionLevel < b.maxLevel ? collectionCost(s.collectionLevel, b) * 100 : Infinity;
  const cOk = s.coinsCents >= cc;
  if (cheapFirst && cOk) return 'c';
  if (!m4On(b)) { const fc = s.farmLevel < b.maxLevel ? farmCost(s.farmLevel, b) * 100 : Infinity; return s.coinsCents >= fc ? 'f' : cOk && cc <= 0.5 * fc ? 'c' : null; }
  const p = highlightPick(s, b);
  if (p && p.affordable) return p.row === 'farm' ? 'f' : p.row;
  const ref = p ? p.costCents : Infinity;
  return cOk && cc <= 0.5 * ref ? 'c' : null;
}
