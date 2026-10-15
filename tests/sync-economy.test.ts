import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseEconomyCsv, buildBalance } from '../scripts/sync-economy';
import { balance } from '../src/config/balance';
const csv = readFileSync(new URL('../../product/economy.csv', import.meta.url), 'utf8');
const rows = parseEconomyCsv(csv);
describe('sync-economy (MK-15)', () => {
  it('balance.json is exactly what the CSV generates', () => { expect(buildBalance(rows, balance)).toEqual(balance); });
  it('a consistent CSV change (new cost curve) changes config without code changes', () => {
    const edited = rows.map(r => ({ ...r, farm_cost: Math.floor(200 * 1.4 ** r.level) }));
    const nb = buildBalance(edited, balance); expect(nb.farm.baseCost).toBe(200); expect(nb.farm.costGrowth).toBe(1.4);
  });
  it('fails loudly on a CSV cell no formula explains', () => {
    const edited = rows.map(r => r.level === 7 ? { ...r, hens: r.hens + 1 } : r);
    expect(() => buildBalance(edited, balance)).toThrow(/L7 hens/);
  });
  it('rejects malformed CSV', () => {
    expect(() => parseEconomyCsv(csv.replace(/^1,(\d+),/m, '1,abc,'))).toThrow(/not a number/);
    expect(() => parseEconomyCsv(csv.replace(/^1,(\d+),/m, '1,11.5,'))).toThrow(/integer/);
    expect(() => parseEconomyCsv(csv.replace(/^2,/m, '7,'))).toThrow(/level/);
  });
});
