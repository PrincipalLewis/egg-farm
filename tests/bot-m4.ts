/** D-HOP-2026-10-19-01: HENS and VALUE join the AC7/pacing bots' best-buy set with the same ROI rule as the other rows.
 *  Flag off: returns exactly the old Farm/Collection choice (goldens and Python parity untouched).
 *  Flag on, seller15: Farm/Hens/Egg value by the game's own payback pick (src/ui/tracks-ui.ts:53 highlightPick ->
 *  src/econ/best-buy.ts bestPaybackAmong, the Farm-tab highlight rule); Collection keeps seller15's 50 % rule against the
 *  picked row's cost. Same rule as Economy's scratch/m4-ac7-bot/tree/m4bot/m4buy.ts (read-only reference).
 *  Flag on, cheapest: the cheapest affordable row among Collection/Farm/Hens/Egg value (its old rule, extended).
 *  Pure function of state + balance: deterministic. */
import type { Balance } from '../src/config/balance';
import { collectionCost, farmCost, type GameState } from '../src/sim/state';
import { m4On } from '../src/config/formulas';
import { highlightPick } from '../src/ui/tracks-ui';
import { trackLock, trackCost } from '../src/sim/tracks';
export type Pick = 'c' | 'f' | 'hens' | 'eggValue' | null;
export const pickAction = (k: Exclude<Pick, null>) => k === 'f' ? { type: 'buyFarm' as const } : k === 'c' ? { type: 'buyCollection' as const } : { type: 'buyTrack' as const, track: k };
export function pickBuy(s: GameState, b: Balance, model: 'seller15' | 'cheapest', cheapFirst: boolean): Pick {
  const cc = s.collectionLevel < b.maxLevel ? collectionCost(s.collectionLevel, b) * 100 : Infinity;
  const fc = s.farmLevel < b.maxLevel ? farmCost(s.farmLevel, b) * 100 : Infinity;
  const cOk = s.coinsCents >= cc, fOk = s.coinsCents >= fc;
  if (model === 'seller15' && cheapFirst && cOk) return 'c';
  if (!m4On(b)) {
    if (model === 'seller15') return fOk ? 'f' : cOk && cc <= 0.5 * fc ? 'c' : null;
    return cOk && fOk ? (cc <= fc ? 'c' : 'f') : cOk ? 'c' : fOk ? 'f' : null;
  }
  if (model === 'seller15') {
    const p = highlightPick(s, b);
    if (p && p.affordable) return p.row === 'farm' ? 'f' : p.row;
    return cOk && cc <= 0.5 * (p ? p.costCents : Infinity) ? 'c' : null;
  }
  const opts: [Exclude<Pick, null>, number][] = [['c', cc], ['f', fc]];
  for (const t of ['hens', 'eggValue'] as const) if (!trackLock(s, t, b)) opts.push([t, Math.round(trackCost(t === 'hens' ? s.hensLevel : s.eggValueLevel, t, b) * 100)]);
  const aff = opts.filter(([, c]) => s.coinsCents >= c).sort((x, y) => x[1] - y[1]); // stable: ties keep C > F > H > V order
  return aff.length ? aff[0][0] : null;
}
