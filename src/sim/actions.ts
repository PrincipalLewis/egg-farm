import type { Balance } from '../config/balance';
import { GameState, eggsPerTap, collectionCost, farmCost, eggPriceCents } from './state';
import type { Sink } from './events';
export type Action =
  | { type: 'collect' } | { type: 'sell'; customerId: number } | { type: 'sellAll' }
  | { type: 'buyCollection' } | { type: 'buyFarm' } | { type: 'collectOffline' } | { type: 'dismissOffline' } | { type: 'markCelebrated'; tier: number };
export const isUpgrade = (a: Action) => a.type === 'buyCollection' || a.type === 'buyFarm';
/** Sells k=min(basket, remaining) at the price at sale time (current Farm + Collection level). Removed only when filled. Unknown id => no-op (MK-11). */
function sellTo(s: GameState, id: number, b: Balance, ev?: Sink): GameState {
  const c = s.customers.find(c => c.id === id); if (!c) return s;
  const k = Math.min(Math.floor(s.basket), c.demand - c.filled); if (k <= 0) return s;
  const price = eggPriceCents(s.farmLevel, s.collectionLevel, b), filled = c.filled + k, done = filled >= c.demand;
  ev?.push({ type: 'sell', id, k, N: c.demand, price });
  if (done) ev?.push({ type: 'customer_served', id, N: c.demand, partial: c.filled > 0 });
  const customers = done ? s.customers.filter(x => x.id !== id) : s.customers.map(x => x.id === id ? { ...x, filled } : x);
  return { ...s, basket: s.basket - k, coinsCents: s.coinsCents + k * price, customers };
}
function buy(s: GameState, kind: 'collection' | 'farm', b: Balance, ev?: Sink): GameState {
  const L = kind === 'collection' ? s.collectionLevel : s.farmLevel; if (L >= b.maxLevel) return s;
  const cost = (kind === 'collection' ? collectionCost : farmCost)(L, b) * 100; if (s.coinsCents < cost) return s;
  ev?.push({ type: 'upgrade', upgrade: kind, newLevel: L + 1, cost, coinsBefore: s.coinsCents });
  return { ...s, coinsCents: s.coinsCents - cost, ...(kind === 'collection' ? { collectionLevel: L + 1 } : { farmLevel: L + 1 }) };
}
export function apply(s: GameState, a: Action, b: Balance, ev?: Sink): GameState {
  switch (a.type) {
    case 'collect': { const n = Math.min(Math.floor(s.coop), eggsPerTap(s.collectionLevel, b)); ev?.push({ type: 'collect', eggs: n }); return { ...s, coop: s.coop - n, basket: s.basket + n }; }
    case 'sell': return sellTo(s, a.customerId, b, ev);
    case 'sellAll': { let r = s; for (const c of s.customers) { if (r.basket < 1) break; r = sellTo(r, c.id, b, ev); } return r; }
    case 'buyCollection': return buy(s, 'collection', b, ev);
    case 'buyFarm': return buy(s, 'farm', b, ev);
    case 'markCelebrated': return { ...s, celebratedTier: Math.max(s.celebratedTier, a.tier) };
    // Closing the welcome-back modal without tapping Collect still grants the eggs.
    case 'collectOffline': case 'dismissOffline': return { ...s, basket: s.basket + s.pendingOfflineEggs, pendingOfflineEggs: 0 };
  }
}
