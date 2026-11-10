import type { Balance } from '../config/balance';
import { startHatch, placeBreed } from './breeds-hatch';
import { GameState, eggsPerTap, collectionCost, farmCost } from './state';
import { m4On } from '../config/formulas';
import { Track, salePriceCents, trackLock, trackCost, trackLevel, reachedMilestones } from './tracks';
import type { Sink } from './events';
import { saleValueCents } from './payout';
import { creditTap, streakSaleFactor, addStreakExtra } from './streak';
import { playerSaleCtx } from './effects';
import { incomeRefOn, recordSale } from './income-ref';
import { tapCoinsOn, tapCoinsFor } from './tap-coins';
import { spawnGolden, tapGolden, frenzySale } from './golden';
import { pauseWorker, resumeWorker } from './pause';
import { WorkerId, hireCostCents, unlockFarm, graderTierCostCents, showManageAll, needManage, canManageWorker } from './workers';
import { isPaused, resumeWorker } from './pause';
export type Action =
  | { type: 'collect' } | { type: 'sell'; customerId: number } | { type: 'sellAll' }
  | { type: 'buyCollection' } | { type: 'buyFarm' } | { type: 'collectOffline' } | { type: 'dismissOffline' } | { type: 'markCelebrated'; tier: number }
  | { type: 'hatch' } | { type: 'placeBreed'; slot: number; id: string | null } // M5.1 breeds (no-op unless m4.flags.breeds)
  | { type: 'hire'; worker: WorkerId } | { type: 'manage'; worker: WorkerId } | { type: 'manageAll' } | { type: 'buyGraderTier' }
  | { type: 'buyTrack'; track: Track } | { type: 'markMilestones'; ids: string[] }
  | { type: 'spawnGolden'; spots: readonly string[]; layout?: boolean } | { type: 'tapGolden' } // v5 #1 golden (no-op unless m4.flags.golden)
  | { type: 'pause'; worker: WorkerId } | { type: 'resume'; worker: WorkerId }; // v5 pause toggle (no-op unless m4.flags.pause; rule 1)
/** Sell all preview lives in sim/payout.ts (the one payout fn, #25; M4 sale price via salePriceCents); re-exported for #28 callers. */
export { sellAllPreview } from './payout';
export const isUpgrade = (a: Action) => a.type === 'buyCollection' || a.type === 'buyFarm' || a.type === 'buyTrack';
/** Sells k=min(basket, remaining) at the price at sale time (current Farm + Collection level). Removed only when filled. Unknown id => no-op (MK-11). */
/** v5 F1c: `suspended` = the sale happens on a tick without focus (worker sales under a menu/hide): timed effects count as 1. */
export function sellTo(s: GameState, id: number, b: Balance, ev?: Sink, by: 'player' | 'market_hand' = 'player', suspended = false): GameState {
  const c = s.customers.find(c => c.id === id); if (!c) return s;
  const k = Math.min(Math.floor(s.basket), c.demand - c.filled); if (k <= 0) return s;
  // One payout function (sim/payout.ts) for credit and every UI preview.
  const ctx = by === 'player' ? playerSaleCtx(!suspended) : suspended ? { by, suspended } : { by };
  const price = salePriceCents(s, b), value = saleValueCents(s, k, b, ctx), filled = c.filled + k, done = filled >= c.demand;
  ev?.push({ type: 'sell', id, k, N: c.demand, price, value, by });
  if (done) ev?.push({ type: 'customer_served', id, N: c.demand, partial: c.filled > 0 });
  const customers = done ? s.customers.filter(x => x.id !== id) : s.customers.map(x => x.id === id ? { ...x, filled } : x);
  const o0 = { ...s, basket: s.basket - k, coinsCents: s.coinsCents + value, customers };
  // #3 I_ref (§4.1): the BASE value (price chain x Grader, every timed effect suspended) enters the ring; identity when off.
  const o1 = incomeRefOn(b) ? recordSale(o0, saleValueCents(s, k, b, { by, suspended: true }), b) : o0;
  const o = frenzySale(o1, s, k, value, ctx, b); // #1 frenzy_ended stats (identity unless golden and a live Frenzy)
  return streakSaleFactor(s, b, suspended) === 1 ? o : addStreakExtra(o, value - saleValueCents({ ...s, streakS: 0 }, k, b, ctx)); // #2 extra_coins
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
    case 'collect': { // v5 #2/#3: the only credited-tap source (R3); `credited` only while streak or tapCoins is on
      const n = Math.min(Math.floor(s.coop), eggsPerTap(s.collectionLevel, b)), c = creditTap(s, b);
      // #3 A1 (R14/R15): a credited tap under tapCoins pays floor((refCents x tapBp + 5000) / 10000) to coins (0 allowed, R15)
      const bonus = c.credited && tapCoinsOn(b) ? tapCoinsFor(s, b) : undefined;
      ev?.push(c.credited === undefined ? { type: 'collect', eggs: n } : bonus === undefined ? { type: 'collect', eggs: n, credited: c.credited }
        : { type: 'collect', eggs: n, credited: c.credited, bonus_cents: bonus });
      if (c.started) ev?.push({ type: 'streak_started', farm_level: s.farmLevel, collection_level: s.collectionLevel });
      return { ...c.s, coop: s.coop - n, basket: s.basket + n, ...(bonus ? { coinsCents: c.s.coinsCents + bonus } : {}) };
    }
    case 'sell': return sellTo(s, a.customerId, b, ev, 'player', !attended);
    case 'sellAll': { let r = s; for (const c of s.customers) { if (r.basket < 1) break; r = sellTo(r, c.id, b, ev, 'player', !attended); } return r; }
    case 'buyCollection': return buy(s, 'collection', b, ev);
    case 'buyFarm': return withMilestones(s, buy(s, 'farm', b, ev), b, ev);
    case 'buyTrack': return withMilestones(s, buyTrack(s, a.track, b, ev), b, ev);
    case 'spawnGolden': return spawnGolden(s, a.spots, b, ev, a.layout === true); // #1 R14/R15: the UI's live valid spot ids
    case 'tapGolden': return tapGolden(s, b, ev); // #1 R19/R20 (not a credited tap, R25b)
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
      const r = { ...s, workers: { ...s.workers, [a.worker]: { ...w, energy: 100 } }, manageCdS: b.workers.energy.manage_cooldown_s };
      // Pause rule 8 / AC-P12 (PAU-AC8, audit D1): Manage on a paused worker also ends the pause, through the one Resume path
      // (Market Hand B5 lockout included). isPaused is false with m4.flags.pause off, so flag-off stays byte-identical (E13).
      return isPaused(w, b) ? resumeWorker(r, a.worker, b, ev, 'manage') : r; // emits worker_resumed{cause:"manage"}
    }
    case 'manageAll': { // v1.1 + P4: 3+ hired; refills only hired workers <= manage_prompt_threshold (Unpaid stays Unpaid, ruling 2); one shared cooldown.
      // Pause rule 8 (D1): needManage skips paused workers, so Manage all never refills or resumes them.
      const need = needManage(s.workers, b); // ruling 4: nothing below 100% -> disabled, no cooldown started
      if (!showManageAll(s.workers, b) || s.manageCdS > 1e-9 || !need.length) return s;
      const workers = { ...s.workers };
      for (const id of need) workers[id] = { ...workers[id]!, energy: 100 };
      ev?.push({ type: 'worker_manage_all', workers: need, energyBefore: need.map(id => Math.round(s.workers[id]!.energy)) });
      return { ...s, workers, manageCdS: b.workers.energy.manage_cooldown_s };
    }
    // v5 pause (spec v1.3.17 rule 2: applies in the same tick). The sim functions own every guard (flag, unlock, hired, already paused).
    // Telemetry: worker_paused (Saves) / worker_resumed (#119) emitters are sim-owned and not added here (UI emits nothing).
    case 'pause': return pauseWorker(s, a.worker, b);
    case 'resume': return resumeWorker(s, a.worker, b);
    case 'hatch': return startHatch(s, b);
    case 'placeBreed': return placeBreed(s, b, a.slot, a.id);
    case 'markCelebrated': return { ...s, celebratedTier: Math.max(s.celebratedTier, a.tier) };
    // Closing the welcome-back modal without tapping Collect still grants the eggs.
    // S2-3a / MK-22: closing the welcome-back modal brings the first customer on the next tick (deterministic: timer -> 0).
    case 'collectOffline': case 'dismissOffline': return { ...s, basket: s.basket + s.pendingOfflineEggs, pendingOfflineEggs: 0,
      nextCustomerInS: s.pendingOfflineEggs > 0 ? Math.min(s.nextCustomerInS, 0) : s.nextCustomerInS };
  }
}
