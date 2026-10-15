/**
 * MK-15: fit balance.json economy params from product/economy.csv, verify EVERY row/column is reproduced by
 * src/config/formulas.ts, then write. Hand-set blocks (tickHz, save, feel, telemetry, offline cap/min) are preserved.
 * Usage: npm run sync-economy [-- --check]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from 'node:url';
import { tableRow, type EconomyParams } from '../src/config/formulas';
const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
export const CSV_PATH = here('../../product/economy.csv');
export const OUT_PATH = here('../src/config/balance.json');
type Row = Record<string, number>;
const INT_COLS = ['level', 'collection_cost', 'eggs_per_tap', 'farm_cost', 'hens', 'coop_capacity', 'demand_min', 'demand_max', 'offline_max_eggs_2h', 'queue_max'];
export function parseEconomyCsv(text: string): Row[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const head = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map((line, i) => {
    const cells = line.split(',').map(c => c.trim());
    if (cells.length !== head.length) throw new Error(`economy.csv row ${i + 2}: expected ${head.length} cells, got ${cells.length}`);
    const row: Row = {};
    head.forEach((h, j) => {
      const v = Number(cells[j]); if (cells[j] === '' || !Number.isFinite(v)) throw new Error(`economy.csv row ${i + 2} ${h}: "${cells[j]}" is not a number`);
      if (INT_COLS.includes(h) && !Number.isInteger(v)) throw new Error(`economy.csv row ${i + 2} ${h} must be an integer`);
      row[h] = v;
    });
    if (row.level !== i) throw new Error(`economy.csv row ${i + 2}: level ${row.level}, expected ${i}`);
    return row;
  });
}
const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
/** Search a grid of candidates for the first value that makes `ok` true. */
function fit(name: string, guess: number, step: number, span: number, ok: (v: number) => boolean): number {
  const n = Math.round(span / step);
  for (let i = 0; i <= n; i++) for (const s of i ? [1, -1] : [1]) { const v = r4(guess + s * i * step); if (v > 0 && ok(v)) return v; }
  throw new Error(`sync-economy: could not fit ${name} from economy.csv (formula changed? update src/config/formulas.ts)`);
}
export function fitParams(rows: Row[], prev: any): EconomyParams {
  const R = rows, n = R.length - 1, all = (f: (r: Row) => boolean) => R.every(f);
  const lin = (col: string) => ({ base: R[0][col], per: r4(R[1][col] - R[0][col]) });
  const tap = lin('eggs_per_tap'), hn = lin('hens'), cap = lin('coop_capacity');
  const p: EconomyParams = {
    maxLevel: n,
    collection: { baseCost: R[0].collection_cost, costGrowth: 0, eggsPerTapBase: tap.base, eggsPerTapPerLevel: tap.per, pricePercentPerLevel: r4(R[1].collection_price_bonus ?? 0) },
    farm: {
      baseCost: R[0].farm_cost, costGrowth: 0, hensBase: hn.base, hensPerLevel: hn.per, eggsPerHenPerSec: r4(R[0].eggs_per_sec / R[0].hens),
      coopCapacityBase: cap.base, coopCapacityPerLevel: cap.per,
      eggPriceCentsBase: Math.round(R[0].egg_price * 100), eggPriceCentsPerLevel: Math.round((R[1].egg_price - R[0].egg_price) * 100),
      customerIntervalBaseS: R[0].customer_interval_s, customerIntervalDecay: 0, customerIntervalMinS: Math.min(...R.map(r => r.customer_interval_s)),
      demandLoFactor: 0, demandHiFactor: 0,
    },
    customers: {
      customer_patience_s: R[0].customer_patience_s, first_customer_s: R[0].first_customer_s,
      queue_max_base: R[0].queue_max, queue_max_cap: Math.max(...R.map(r => r.queue_max)),
      queue_max_step_levels: (R.find(r => r.queue_max > R[0].queue_max)?.level ?? n + 1) - 0,
    },
    offline: { ...prev.offline, offlineRateMultiplier: r4(R[0].offline_eggs_per_sec / R[0].eggs_per_sec) },
  };
  const col = (c: string) => (q: EconomyParams) => all(r => (tableRow(r.level, q) as any)[c] === r[c]);
  p.collection.costGrowth = fit('collection costGrowth', (R[n].collection_cost / R[0].collection_cost) ** (1 / n), 0.0001, 0.05, v => col('collection_cost')({ ...p, collection: { ...p.collection, costGrowth: v } }));
  p.farm.costGrowth = fit('farm costGrowth', (R[n].farm_cost / R[0].farm_cost) ** (1 / n), 0.0001, 0.05, v => col('farm_cost')({ ...p, farm: { ...p.farm, costGrowth: v } }));
  p.farm.customerIntervalDecay = fit('customerIntervalDecay', R[1].customer_interval_s / R[0].customer_interval_s, 0.0001, 0.02, v => col('customer_interval_s')({ ...p, farm: { ...p.farm, customerIntervalDecay: v } }));
  const k0 = R[0].eggs_per_sec * R[0].customer_interval_s;
  p.farm.demandLoFactor = fit('demandLoFactor', R[0].demand_min / k0, 0.01, 1, v => col('demand_min')({ ...p, farm: { ...p.farm, demandLoFactor: v, demandHiFactor: 99 } }));
  p.farm.demandHiFactor = fit('demandHiFactor', R[0].demand_max / k0, 0.01, 2, v => col('demand_max')({ ...p, farm: { ...p.farm, demandHiFactor: v } }));
  verify(rows, p);
  return p;
}
/** Every CSV cell must equal the formula output (floats to 1e-9). */
export function verify(rows: Row[], p: EconomyParams) {
  for (const r of rows) {
    const t = tableRow(r.level, p) as Record<string, number>;
    for (const [c, v] of Object.entries(r)) {
      if (!(c in t)) continue;
      if (Math.abs(t[c] - v) > 1e-9) throw new Error(`sync-economy: economy.csv L${r.level} ${c}=${v} but formula gives ${t[c]}`);
    }
  }
}
export function buildBalance(rows: Row[], prev: any) {
  const p = fitParams(rows, prev);
  const { levels: _drop, collection: _c, farm: _f, customers: _cu, offline: _o, maxLevel: _m, ...rest } = prev;
  return { ...rest, _source: 'economy params GENERATED from product/economy.csv by scripts/sync-economy.ts (verified on every row); edit the CSV, not these blocks', ...p };
}
