import raw from './balance.json';
import type { EconomyParams } from './formulas';
export type Balance = typeof raw & EconomyParams;
function check(o: any, path: string) {
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith('_')) continue;
    if (v && typeof v === 'object') check(v, `${path}.${k}`);
    else if (v === undefined || typeof v !== 'number' || !isFinite(v) || v < 0) throw new Error(`balance${path}.${k} invalid`);
  }
}
const pos = (b: any, path: string) => { const v = path.split('.').reduce((o, k) => o?.[k], b); if (!(typeof v === 'number' && v > 0)) throw new Error(`balance.${path} must be > 0`); return v; };
const int = (b: any, path: string) => { const v = pos(b, path); if (!Number.isInteger(v)) throw new Error(`balance.${path} must be an integer`); };
export function validateBalance(b: Balance): Balance {
  check(b, '');
  for (const p of ['tickHz', 'maxLevel', 'feel.max_flying_eggs', 'telemetry.ring_size']) int(b, p);
  for (const p of ['feel.tap_combine_window_ms', 'feel.queue_full_cue_min_gap_ms', 'feel.egg_flight_ms', 'save.autosaveIntervalS', 'offline.offlineCapSeconds', 'telemetry.flush_interval_s', 'telemetry.tap_batch_ms', 'customers.first_customer_s']) pos(b, p);
  if (b.offline.offlineRateMultiplier > 1) throw new Error('balance.offline.offlineRateMultiplier must be <= 1');
  if (b.save.autosaveIntervalS > 5) throw new Error('balance.save.autosaveIntervalS must be <= 5 (AC8)');
  for (const p of ['collection.baseCost', 'farm.baseCost', 'farm.eggsPerHenPerSec', 'farm.customerIntervalMinS', 'farm.customerIntervalBaseS', 'customers.customer_patience_s']) pos(b, p);
  for (const p of ['customers.queue_max_base', 'customers.queue_max_cap', 'customers.queue_max_step_levels']) int(b, p);
  if (b.collection.costGrowth < 1 || b.farm.costGrowth < 1) throw new Error('balance cost growth must be >= 1');
  if (!(b.farm.customerIntervalDecay > 0 && b.farm.customerIntervalDecay <= 1)) throw new Error('balance.farm.customerIntervalDecay must be in (0,1]');
  if (!(b.farm.demandLoFactor > 0 && b.farm.demandHiFactor >= b.farm.demandLoFactor)) throw new Error('balance.farm demand factors: 0 < lo <= hi');
  if (b.customers.queue_max_cap < b.customers.queue_max_base) throw new Error('balance.customers.queue_max_cap < queue_max_base');
  return b;
}
export const balance: Balance = validateBalance(raw as Balance);
