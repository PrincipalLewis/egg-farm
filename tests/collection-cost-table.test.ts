// M4.1 D-HOP-23: per-level Collection cost table (balance.collection.costTable) behind economy-config collectionCostFromCsv
// (default OFF). Same pattern as F1 farmCostFromCsv / farm.costTable (tests/cost-segments.test.ts, tests/m4a-sync.test.ts).
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { collectionCost, type EconomyParams } from '../src/config/formulas';
import { balance, validateBalance } from '../src/config/balance';
import { parseEconomyCsv, buildBalance, readEconomyConfig, collectionTableConflicts } from '../scripts/sync-economy';
const rows = parseEconomyCsv(readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8'));
const cfg = readEconomyConfig();
const formula = (C: number, p: EconomyParams) => Math.floor(p.collection.baseCost * p.collection.costGrowth ** Math.max(0, Math.min(C, p.maxLevel)));
const json = (o: unknown) => JSON.stringify(o, null, 2) + '\n';

describe('collectionCostFromCsv (flag)', () => {
  it('default OFF: shipping config has no flag, balance.json has no collection.costTable, and collectionCost is the formula', () => {
    expect(cfg.collectionCostFromCsv).toBeUndefined();
    expect((balance.collection as any).costTable).toBeUndefined();
    for (let L = 0; L <= balance.maxLevel + 2; L++) expect(collectionCost(L, balance)).toBe(formula(L, balance));
    // flag off reproduces the committed balance.json byte for byte
    expect(json(buildBalance(rows, balance, cfg))).toBe(readFileSync(new URL('../src/config/balance.json', import.meta.url), 'utf8'));
  });
  it('flag ON via sync: costTable = the CSV collection_cost column, costs identical to the formula on every row, nothing else changes', () => {
    const off = buildBalance(rows, balance, cfg), on = buildBalance(rows, balance, { ...cfg, collectionCostFromCsv: true });
    expect(on.collection.costTable).toEqual(rows.map(r => r.collection_cost));
    expect(on.collection.costGrowth).toBe(off.collection.costGrowth); // informational, kept
    const { costTable: _t, ...onColl } = on.collection as any; expect(json({ ...on, collection: onColl })).toBe(json(off));
    validateBalance(on as any, false);
    for (let L = 0; L <= on.maxLevel + 2; L++) expect(collectionCost(L, on as any), `L${L}`).toBe(collectionCost(L, off as any));
  });
  it('flag ON with a table equal to today\'s formula on rows 0-50: byte-identical costs (incl. clamp above maxLevel)', () => {
    const p50: EconomyParams = { ...balance, maxLevel: 50 } as any;
    const table = Array.from({ length: 51 }, (_, L) => formula(L, p50));
    const withT: EconomyParams = { ...p50, collection: { ...p50.collection, costTable: table } };
    const a = Array.from({ length: 56 }, (_, L) => collectionCost(L, withT)), b = Array.from({ length: 56 }, (_, L) => collectionCost(L, p50));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(collectionCost(-3, withT)).toBe(table[0]);
  });
  it('a table value wins over the formula (the table path is really used)', () => {
    const t = rows.map(r => r.collection_cost + 1);
    const p: EconomyParams = { ...balance, collection: { ...balance.collection, costTable: t } } as any;
    for (let L = 0; L <= balance.maxLevel; L++) expect(collectionCost(L, p)).toBe(t[L]);
  });
  it('mutual exclusion: flag + any fit/segment option throws', () => {
    const seg = [{ from: 6, to: 14, growth: 1.25 }];
    expect(() => buildBalance(rows, balance, { ...cfg, collectionCostFromCsv: true, farmCostGrowthSegments: seg, farmCostFromCsv: false })).toThrow(/collectionCostFromCsv and farmCostGrowthSegments are mutually exclusive/);
    expect(() => buildBalance(rows, balance, { ...cfg, collectionCostFromCsv: true, collectionCostGrowthSegments: seg } as any)).toThrow(/collectionCostFromCsv and collectionCostGrowthSegments are mutually exclusive/);
    expect(() => buildBalance(rows, balance, { ...cfg, collectionCostFromCsv: true, collectionCostGrowth: 1.6 } as any)).toThrow(/mutually exclusive/);
    expect(collectionTableConflicts({ ...cfg, collectionCostFromCsv: true })).toEqual([]); // empty farmCostGrowthSegments [] is not an option in use
  });
  it('validateBalance rejects a malformed collection.costTable', () => {
    const bad = (t: unknown) => () => validateBalance({ ...balance, collection: { ...balance.collection, costTable: t } } as any, false);
    expect(bad([1, 2])).toThrow(/collection.costTable must have maxLevel\+1/);
    expect(bad(rows.map((r, i) => i === 3 ? 1.5 : r.collection_cost))).toThrow(/collection.costTable\[3\] must be a positive integer/);
  });
});

describe('TS vs Python parity on the table path (scripts/collection_cost_table.py)', () => {
  const py = (b: unknown, probe: number): number[] => {
    const d = mkdtempSync(join(tmpdir(), 'ccost-')), f = join(d, 'balance.json'); writeFileSync(f, JSON.stringify(b));
    return JSON.parse(execFileSync('python3', [new URL('../scripts/collection_cost_table.py', import.meta.url).pathname, f, String(probe)], { encoding: 'utf8' }));
  };
  it('a non-formula table: Python ccost == TS collectionCost on every level 0..maxLevel and clamps above', () => {
    const t = rows.map((r, i) => r.collection_cost * 3 + i); // deliberately off the formula
    const b = { ...balance, collection: { ...balance.collection, costTable: t } };
    const probe = balance.maxLevel + 3;
    expect(py(b, probe)).toEqual(Array.from({ length: probe + 1 }, (_, L) => collectionCost(L, b as any)));
  });
  it('flag-on sync output (table == CSV): Python == TS == CSV', () => {
    const on = buildBalance(rows, balance, { ...cfg, collectionCostFromCsv: true });
    expect(py(on, on.maxLevel)).toEqual(rows.map(r => r.collection_cost));
  });
  it('no table (flag off): Python falls back to the sim formula, equal to TS on 0..maxLevel', () => {
    expect(py(balance, balance.maxLevel)).toEqual(Array.from({ length: balance.maxLevel + 1 }, (_, L) => collectionCost(L, balance)));
  });
});
