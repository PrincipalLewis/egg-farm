import type { Balance } from '../config/balance';
import { GameState, eggsPerTap, collectionCost, farmCost } from './state';
import { m4On } from '../config/formulas';
import { Track, salePriceCents, trackLock, trackCost, trackLevel, reachedMilestones } from './tracks';
import type { Sink } from './events';
import { saleValueCents } from './payout';
import { WorkerId, hireCostCents, unlockFarm, graderTierCostCents, showManageAll, needManage, canManageWorker } from './workers';
export type Action =
  | { type: 'collect' } | { type: 'sell'; customerId: number } | { type: 'sellAll' }
  | { type: 'buyCollection' } | { type: 'buyFarm' } | { type: 'collectOffline' } | { type: 'dismissOffline' } | { type: 'markCelebrated'; tier: number }
  | { type: 'hire'; worker: WorkerId } | { type: 'manage'; worker: WorkerId } | { type: 'manageAll' } | { type: 'buyGraderTier' }
  | { type: 'buyTrack'; track: Track } | { type: 'markMilestones'; ids: string[] };
/** Sell all preview lives in sim/payout.ts (the one payout fn, #25; M4 sale price via salePriceCents); re-exported for #28 callers. */
export { sellAllPreview } from './payout';
export const isUpgrade = (a: Action) => a.type === 'buyCollection' || a.type === 'buyFarm' || a.type === 'buyTrack';
/** Sells k=min(basket, remaining) at the price at sale time (current Farm + Collection level). Removed only when filled. Unknown id => no-op (MK-11). */
/** v5 F1c: `suspended` = the sale happens on a tick without focus (worker sales under a menu/hide): timed effects count as 1. */
export function sellTo(s: GameState, id: number, b: Balance, ev?: Sink, by: 'player' | 'market_hand' = 'player', suspended = false): GameState {
  const c = s.customers.find(c => c.id === id); if (!c) return s;
  const k = Math.min(Math.floor(s.basket), c.demand - c.filled); if (k <= 0) return s;
  // One payout function (sim/payout.ts) for credit and every UI preview.
  const price = salePriceCents(s, b), value = saleValueCents(s, k, b, suspended ? { by, suspended } : by === 'player' ? undefined : { by }), filled = c.filled + k, done = filled >= c.demand;
  ev?.push({ type: 'sell', id, k, N: c.demand, price, value, by });
  if (done) ev?.push({ type: 'customer_served', id, N: c.demand, partial: c.filled > 0 });
  const customers = done ? s.customers.filter(x => x.id !== id) : s.customers.map(x => x.id === id ? { ...x, filled } : x);
  return { ...s, basket: s.basket - k, coinsCents: s.coinsCents + value, customers };
}
function buy(s: GameState, kind: 'collection' | 'farm', b: Balance, ev?: Sink): GameState {
  const L = kind === 'collection' ? s.collectionLevel : s.farmLevel; if (L >= b.maxLevel) return s;
  const cost = (kind === 'collection' ? collectionCost : farmCost)(L, b) * 100; if (s.coinsCents < cost) return s;
  ev?.push({ type: 'upgrade', upgrade: kind, newLevel: L + 1, cost, coinsBefore: s.coinsCents, ...(m4On(b) ? { track: kind } : {}) });
  return { ...s, coinsCents: s.coinsCents - cost, ...(kind === 'collection' ? { collectionLevel: L + 1 } : { farmLevel: L + 1 }) };
}
/** M4-A: buy one Hens / Egg value level; refused at the cap (min(F+3, max)) or when unaffordable. Flag off => no-op. */
function buyTrack(s: GameState, t: Track, b: Balance, ev?: Sink): GameState {
  if (!m4On(b) || trackLock(s, t, b)) return s;
  const L = trackLevel(s, t), cost = trackCost(L, t, b) * 100; if (s.coinsCents < cost) return s;
  ev?.push({ type: 'upgrade', upgrade: t, newLevel: L + 1, cost, coinsBefore: s.coinsCents, track: t === 'hens' ? 'hens' : 'egg_value' });
  return { ...s, coinsCents: s.coinsCents - cost, ...(t === 'hens' ? { hensLevel: L + 1 } : { eggValueLevel: L + 1 }) };
}
/** Emits milestone_reached for ids newly reached by a level change (Farm can unlock Jumbo and Balanced tiers too). */
function withMilestones(before: GameState, after: GameState, b: Balance, ev?: Sink): GameState {
  if (after === before || !ev || !m4On(b)) return after;
  const had = new Set(reachedMilestones(before, b));
  const M = b.m4!.milestones;
  for (const id of reachedMilestones(after, b)) if (!had.has(id)) {
    const [kind, n] = id.split(':'), k = +n; // M4A-34 payloads
    if (kind === 'hens') ev.push({ type: 'milestone_reached', id, track: 'hens', level: k, mult: M.hens.find(m => m.level === k)!.offlineMult });
    else if (kind === 'grade') ev.push({ type: 'milestone_reached', id, track: 'egg_value', level: k, mult: M.grades.find(g => g.level === k)!.mult });
    else ev.push({ type: 'balanced_tier', id, tier: k, min_level: Math.min(after.farmLevel, after.hensLevel, after.eggValueLevel) });
  }
  return after;
}
/** v5 F1c, Q-F1c-1 ruled D-HOP-2026-10-29-06: the Market sheet is a play surface. A player sale is suspended (no Frenzy/streak)
 *  ONLY when the tick's attended probe is false; Game.dispatch passes `attended` from the same probe frame() uses. The UI never
 *  passes suspended for the sheet. Default true keeps every existing caller (tests, bots, verify) unchanged. */
export function apply(s: GameState, a: Action, b: Balance, ev?: Sink, attended = true): GameState {
  switch (a.type) {
    case 'collect': { const n = Math.min(Math.floor(s.coop), eggsPerTap(s.collectionLevel, b)); ev?.push({ type: 'collect', eggs: n }); return { ...s, coop: s.coop - n, basket: s.basket + n }; }
    case 'sell': return sellTo(s, a.customerId, b, ev, 'player', !attended);
    case 'sellAll': { let r = s; for (const c of s.customers) { if (r.basket < 1) break; r = sellTo(r, c.id, b, ev, 'player', !attended); } return r; }
    case 'buyCollection': return buy(s, 'collection', b, ev);
    case 'buyFarm': return withMilestones(s, buy(s, 'farm', b, ev), b, ev);
    case 'buyTrack': return withMilestones(s, buyTrack(s, a.track, b, ev), b, ev);
    case 'markMilestones': { const add = a.ids.filter(id => !s.celebratedMilestones.includes(id)); return add.length ? { ...s, celebratedMilestones: [...s.celebratedMilestones, ...add] } : s; }
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
    case 'manageAll': { // v1.1 + P4: 3+ hired; refills only hired workers <= manage_prompt_threshold (Unpaid stays Unpaid, ruling 2); one shared cooldown.
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
