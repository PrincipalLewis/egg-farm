import type { Balance } from '../config/balance';
import { GameState, eggsPerTap, collectionCost, farmCost, eggPriceCents } from './state';
import type { Sink } from './events';
import { WorkerId, hireCostCents, unlockFarm, graderMult, graderTierCostCents, showManageAll, needManage, canManageWorker } from './workers';
export type Action =
  | { type: 'collect' } | { type: 'sell'; customerId: number } | { type: 'sellAll' }
  | { type: 'buyCollection' } | { type: 'buyFarm' } | { type: 'collectOffline' } | { type: 'dismissOffline' } | { type: 'markCelebrated'; tier: number }
  | { type: 'hire'; worker: WorkerId } | { type: 'manage'; worker: WorkerId } | { type: 'manageAll' } | { type: 'buyGraderTier' };
export const isUpgrade = (a: Action) => a.type === 'buyCollection' || a.type === 'buyFarm';
/** Sells k=min(basket, remaining) at the price at sale time (current Farm + Collection level). Removed only when filled. Unknown id => no-op (MK-11). */
export function sellTo(s: GameState, id: number, b: Balance, ev?: Sink, by: 'player' | 'market_hand' = 'player'): GameState {
  const c = s.customers.find(c => c.id === id); if (!c) return s;
  const k = Math.min(Math.floor(s.basket), c.demand - c.filled); if (k <= 0) return s;
  const base = eggPriceCents(s.farmLevel, s.collectionLevel, b), gm = graderMult(s.workers, s.graderTier, b);
  // Grader: sale value = round(k x price x mult) cents (exact k x price when no Grader).
  const price = base, value = gm === 1 ? k * base : Math.round(k * base * gm), filled = c.filled + k, done = filled >= c.demand;
  ev?.push({ type: 'sell', id, k, N: c.demand, price, value, by });
  if (done) ev?.push({ type: 'customer_served', id, N: c.demand, partial: c.filled > 0 });
  const customers = done ? s.customers.filter(x => x.id !== id) : s.customers.map(x => x.id === id ? { ...x, filled } : x);
  return { ...s, basket: s.basket - k, coinsCents: s.coinsCents + value, customers };
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
    case 'hire': {
      const id = a.worker; if (s.workers[id] || s.farmLevel < unlockFarm(id, b)) return s;
      const cost = hireCostCents(id, b); if (s.coinsCents < cost) return s;
      ev?.push({ type: 'worker_hire', worker: id, cost, farm: s.farmLevel });
      return { ...s, coinsCents: s.coinsCents - cost, workers: { ...s.workers, [id]: { energy: b.workers.energy.start_pct, cdS: 0 } }, ...(id === 'grader' ? { graderTier: 1 } : {}) };
    }
    case 'buyGraderTier': {
      if (!s.workers.grader) return apply(s, { type: 'hire', worker: 'grader' }, b, ev);
      const i = s.graderTier, tiers = b.workers.grader.tiers; if (i >= tiers.length || s.farmLevel < tiers[i].farm) return s;
      const cost = graderTierCostCents(i, b); if (s.coinsCents < cost) return s;
      ev?.push({ type: 'grader_tier', tier: i + 1, mult: tiers[i].mult, cost });
      return { ...s, coinsCents: s.coinsCents - cost, graderTier: i + 1 }; // energy unchanged (PM Q6)
    }
    case 'manage': {
      const w = s.workers[a.worker]; if (!w || s.manageCdS > 1e-9 || !canManageWorker(w, b)) return s; // P4: only at <= 40%
      ev?.push({ type: 'worker_manage', worker: a.worker, energyBefore: Math.round(w.energy) });
      return { ...s, workers: { ...s.workers, [a.worker]: { ...w, energy: 100 } }, manageCdS: b.workers.energy.manage_cooldown_s };
    }
    case 'manageAll': { // v1.1 + P4: bulk needs >= manage_all_min_workers hired (sim rule, pending PM/Economy); refills only hired workers <= manage_prompt_threshold (Unpaid stays Unpaid, ruling 2); one shared cooldown.
      const need = needManage(s.workers, b); // ruling 4: nothing below 100% -> disabled, no cooldown started
      if (!showManageAll(s.workers, b) || s.manageCdS > 1e-9 || !need.length) return s;
      const workers = { ...s.workers };
      for (const id of need) workers[id] = { ...workers[id]!, energy: 100 };
      ev?.push({ type: 'worker_manage_all', workers: need, energyBefore: need.map(id => Math.round(s.workers[id]!.energy)) });
      return { ...s, workers, manageCdS: b.workers.energy.manage_cooldown_s };
    }
    case 'markCelebrated': return { ...s, celebratedTier: Math.max(s.celebratedTier, a.tier) };
    // Closing the welcome-back modal without tapping Collect still grants the eggs.
    // S2-3a / MK-22: closing the welcome-back modal brings the first customer on the next tick (deterministic: timer -> 0).
    case 'collectOffline': case 'dismissOffline': return { ...s, basket: s.basket + s.pendingOfflineEggs, pendingOfflineEggs: 0,
      nextCustomerInS: s.pendingOfflineEggs > 0 ? Math.min(s.nextCustomerInS, 0) : s.nextCustomerInS };
  }
}
