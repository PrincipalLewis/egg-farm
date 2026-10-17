import raw from './balance.json';
import { validateCostGrowthSegments, validateCostTable, type EconomyParams } from './formulas';
/** TEST-ONLY scenario hooks (m2-proposal §8 item 17, AC-W1 casual). Never in balance.json; rejected in production builds. */
export interface SimTestHooks { poisson_arrivals?: boolean; demand_scale?: number; }
export type Balance = typeof raw & EconomyParams & { sim_test?: SimTestHooks };
function check(o: any, path: string) {
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith('_') || (path === '' && k === 'sim_test') || (path === '.farm' && (k === 'costGrowthSegments' || k === 'costTable'))) continue;
    if (v && typeof v === 'object') check(v, `${path}.${k}`);
    else if (v === undefined || typeof v !== 'number' || !isFinite(v) || v < 0) throw new Error(`balance${path}.${k} invalid`);
  }
}
const pos = (b: any, path: string) => { const v = path.split('.').reduce((o, k) => o?.[k], b); if (!(typeof v === 'number' && v > 0)) throw new Error(`balance.${path} must be > 0`); return v; };
const int = (b: any, path: string) => { const v = pos(b, path); if (!Number.isInteger(v)) throw new Error(`balance.${path} must be an integer`); };
export function validateBalance(b: Balance, prod = !!import.meta.env?.PROD): Balance {
  if (b.sim_test && prod) throw new Error('balance.sim_test hooks are test-only and not allowed in production builds');
  check(b, '');
  if (b.sim_test?.demand_scale !== undefined && !(b.sim_test.demand_scale > 0)) throw new Error('balance.sim_test.demand_scale must be > 0');
  for (const p of ['tickHz', 'maxLevel', 'feel.max_flying_eggs', 'telemetry.ring_size']) int(b, p);
  for (const p of ['feel.tap_combine_window_ms', 'feel.queue_full_cue_min_gap_ms', 'feel.egg_flight_ms', 'feel.served_dwell_ms', 'save.autosaveIntervalS', 'save.lsHeadroomFactor', 'save.lsHeadroomMarginBytes', 'save.migrationAttemptsCap', 'offline.offlineCapSeconds', 'telemetry.flush_interval_s', 'telemetry.tap_batch_ms', 'customers.first_customer_s']) pos(b, p);
  if (b.offline.offlineRateMultiplier > 1) throw new Error('balance.offline.offlineRateMultiplier must be <= 1');
  if (b.save.autosaveIntervalS > 5) throw new Error('balance.save.autosaveIntervalS must be <= 5 (AC8)');
  for (const p of ['collection.baseCost', 'farm.baseCost', 'farm.eggsPerHenPerSec', 'farm.customerIntervalMinS', 'farm.customerIntervalBaseS', 'customers.customer_patience_s']) pos(b, p);
  for (const p of ['customers.queue_max_base', 'customers.queue_max_cap', 'customers.queue_max_step_levels']) int(b, p);
  validateCostGrowthSegments((b.farm as any).costGrowthSegments);
  validateCostTable((b.farm as any).costTable, b.maxLevel);
  for (const [i, t] of b.workers.grader.tiers.entries()) if ((t as any).cost !== undefined && !(Number.isSafeInteger((t as any).cost) && (t as any).cost > 0)) throw new Error(`balance.workers.grader.tiers[${i}].cost must be a positive integer`);
  if (b.collection.costGrowth < 1 || b.farm.costGrowth < 1) throw new Error('balance cost growth must be >= 1');
  if (!(b.farm.customerIntervalDecay > 0 && b.farm.customerIntervalDecay <= 1)) throw new Error('balance.farm.customerIntervalDecay must be in (0,1]');
  if (!(b.farm.demandLoFactor > 0 && b.farm.demandHiFactor >= b.farm.demandLoFactor)) throw new Error('balance.farm demand factors: 0 < lo <= hi');
  if (b.customers.queue_max_cap < b.customers.queue_max_base) throw new Error('balance.customers.queue_max_cap < queue_max_base');
  // M2 workers
  for (const p of ['workers.energy.drain_s_per_pct', 'workers.energy.tired_below_pct', 'workers.energy.manage_cooldown_s', 'workers.energy.start_pct',
    'workers.market_hand.every_s', 'workers.market_hand.tired_every_s', 'workers.coop_hand.every_s', 'workers.coop_hand.tired_every_s',
    'workers.energy.yawn_at_pct', 'workers.energy.manage_all_min_workers', 'workers.energy.unpaid_resume_wage_min',
    'workers.market_hand.hire_cost', 'workers.coop_hand.hire_cost', 'workers.hawker.hire_cost', 'workers.grader.tier_cost_share_of_farm_cost', 'workers.tips.coop_hand_tip_full_s']) pos(b, p);
  const W = b.workers;
  if (W.energy.tired_below_pct > 100 || W.energy.start_pct > 100) throw new Error('balance.workers.energy pct must be <= 100');
  if (W.hawker.demand_mult < W.hawker.tired_demand_mult || W.hawker.tired_demand_mult < 1) throw new Error('balance.workers.hawker: 1 <= tired_demand_mult <= demand_mult');
  if (!W.grader.tiers.length || W.grader.tiers.some((t, i, a) => t.mult <= 1 || (i > 0 && (t.farm <= a[i - 1].farm || t.mult <= a[i - 1].mult))))
    throw new Error('balance.workers.grader.tiers: farm and mult must increase, mult > 1');
  for (const k of ['tired_bonus_share', 'asleep_bonus_share'] as const) if (W.grader[k] > 1) throw new Error(`balance.workers.grader.${k} must be <= 1`);
  if (!Number.isInteger(W.tips.hire_nudge_farm_level) || W.tips.hire_nudge_farm_level < 0) throw new Error('balance.workers.tips.hire_nudge_farm_level must be a non-negative integer (CSV hire_nudge_farm_level or economy-config hireNudgeFarmLevel)');
  // M4-A tracks (flag + costs + caps + milestones)
  if (b.m4) {
    const m = b.m4;
    if (m.enabled !== 0 && m.enabled !== 1) throw new Error('balance.m4.enabled must be 0 or 1');
    for (const t of [m.hens, m.eggValue]) if (t.costs.length < b.maxLevel + 1 || (t.capOverFarmByFarm && (t.capOverFarmByFarm.length !== b.maxLevel + 1 || t.capOverFarmByFarm.some(c => !Number.isInteger(c) || c < 0))) || t.costs.some((c, i, a) => !Number.isInteger(c) || c <= 0 || (i > 0 && c <= a[i - 1]))) throw new Error('balance.m4 track costs must be >= maxLevel+1 (Farm max) rising positive integers; per-row caps one non-negative integer per Farm level');
    if (m.hens.eggsPerSec && (m.hens.eggsPerSec.length !== m.hens.costs.length || m.hens.eggsPerSec.some(x => !(x > 0)))) throw new Error('balance.m4.hens.eggsPerSec must have one positive rate per Hens level');
    for (const p of ['m4.hens.capOverFarm', 'm4.eggValue.capOverFarm']) int(b, p);
    const inc = (xs: { level: number }[], k: string) => { if (xs.some((x, i) => !Number.isInteger(x.level) || (i > 0 && x.level <= xs[i - 1].level))) throw new Error(`balance.m4.milestones.${k}: levels must be increasing integers`); };
    inc(m.milestones.hens, 'hens'); inc(m.milestones.grades, 'grades'); inc(m.milestones.balanced, 'balanced');
    if (m.milestones.hens.some(x => x.coopMult < 1 || x.offlineMult < 1) || m.milestones.grades.some(x => x.mult < 1)) throw new Error('balance.m4.milestones mult must be >= 1');
  }
  return b;
}
export const balance: Balance = validateBalance(raw as Balance);
