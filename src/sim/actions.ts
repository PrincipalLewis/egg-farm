import type { Balance } from '../config/balance';
import { GameState, eggsPerTap, collectionCost, farmCost, eggPriceCents } from './state';
export type Action =
  | { type: 'collect' } | { type: 'sell'; customerId: number } | { type: 'sellAll' }
  | { type: 'buyCollection' } | { type: 'buyFarm' } | { type: 'collectOffline' };
export const isUpgrade = (a: Action) => a.type === 'buyCollection' || a.type === 'buyFarm';
function sellTo(s: GameState, id: number, b: Balance): GameState {
  const c = s.customers.find(c => c.id === id); const sold = c ? Math.min(Math.floor(s.basket), c.demand) : 0;
  if (!c || sold <= 0) return s;
  return { ...s, basket: s.basket - sold, coinsCents: s.coinsCents + sold * eggPriceCents(s.farmLevel, b), customers: s.customers.filter(x => x.id !== id) };
}
export function apply(s: GameState, a: Action, b: Balance): GameState {
  switch (a.type) {
    case 'collect': { const n = Math.min(Math.floor(s.coop), eggsPerTap(s.collectionLevel, b)); return { ...s, coop: s.coop - n, basket: s.basket + n }; }
    case 'sell': return sellTo(s, a.customerId, b);
    case 'sellAll': return s.customers.reduce((acc, c) => sellTo(acc, c.id, b), s);
    case 'buyCollection': { if (s.collectionLevel >= b.maxLevel) return s; const c = collectionCost(s.collectionLevel, b) * 100;
      return s.coinsCents >= c ? { ...s, coinsCents: s.coinsCents - c, collectionLevel: s.collectionLevel + 1 } : s; }
    case 'buyFarm': { if (s.farmLevel >= b.maxLevel) return s; const c = farmCost(s.farmLevel, b) * 100;
      return s.coinsCents >= c ? { ...s, coinsCents: s.coinsCents - c, farmLevel: s.farmLevel + 1 } : s; }
    case 'collectOffline': return { ...s, basket: s.basket + s.pendingOfflineEggs, pendingOfflineEggs: 0 };
  }
}
