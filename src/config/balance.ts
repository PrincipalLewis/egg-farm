import raw from './balance.json';
export type Balance = typeof raw;
function check(o: any, path: string) {
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith('_')) continue;
    if (v && typeof v === 'object') check(v, `${path}.${k}`);
    else if (v === undefined || typeof v !== 'number' || !isFinite(v) || v < 0) throw new Error(`balance${path}.${k} invalid`);
  }
}
const INTS: [string, (b: any) => number][] = [
  ['tickHz', b => b.tickHz], ['maxLevel', b => b.maxLevel],
  ['customers.queue_max', b => b.customers.queue_max], ['feel.max_flying_eggs', b => b.feel.max_flying_eggs],
];
const POSITIVE: [string, (b: any) => number][] = [
  ['tickHz', b => b.tickHz], ['customers.customer_patience_s', b => b.customers.customer_patience_s],
  ['customers.queue_max', b => b.customers.queue_max], ['feel.tap_combine_window_ms', b => b.feel.tap_combine_window_ms],
  ['feel.max_flying_eggs', b => b.feel.max_flying_eggs], ['save.autosaveIntervalS', b => b.save.autosaveIntervalS],
  ['offline.offlineCapSeconds', b => b.offline.offlineCapSeconds],
];
export function validateBalance(b: Balance): Balance {
  check(b, '');
  for (const [k, f] of INTS) if (!Number.isInteger(f(b))) throw new Error(`balance.${k} must be an integer`);
  for (const [k, f] of POSITIVE) if (!(f(b) > 0)) throw new Error(`balance.${k} must be > 0`);
  if (![0, 1].includes(b.customers.served_customer_ignores_patience)) throw new Error('balance.customers.served_customer_ignores_patience must be 0 or 1');
  for (const k of ['ring_size', 'flush_interval_s', 'tap_batch_ms'] as const) if (!(b.telemetry[k] > 0)) throw new Error(`balance.telemetry.${k} must be > 0`);
  if (b.offline.offlineRateMultiplier > 1) throw new Error('balance.offline.offlineRateMultiplier must be <= 1');
  if (b.save.autosaveIntervalS > 5) throw new Error('balance.save.autosaveIntervalS must be <= 5 (AC8)');
  return b;
}
export const balance: Balance = validateBalance(raw);
