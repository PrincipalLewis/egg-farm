import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import * as S from '../src/sim/state';
import { offlineEggs } from '../src/sim/offline';
const rows = readFileSync(new URL('../../product/economy.csv', import.meta.url), 'utf8').trim().split(/\r?\n/);
const head = rows[0].split(','); const data: Record<string, number>[] = rows.slice(1).map(r => Object.fromEntries(r.split(',').map((v, i: number) => [head[i].trim(), +v])));
describe('AC6 stats match product/economy.csv L0-30', () => {
  it.each(data)('level $level', (r: Record<string, number>) => {
    const L = r.level;
    expect(S.collectionCost(L, b)).toBe(r.collection_cost); expect(S.eggsPerTap(L, b)).toBe(r.eggs_per_tap);
    expect(S.farmCost(L, b)).toBe(r.farm_cost); expect(S.hens(L, b)).toBe(r.hens);
    expect(S.eggsPerSec(L, b)).toBeCloseTo(r.eggs_per_sec, 6); expect(S.coopCapacity(L, b)).toBe(r.coop_capacity);
    expect(S.eggPriceCents(L, b) / 100).toBeCloseTo(r.egg_price, 6);
    expect(S.customerIntervalS(L, b)).toBeCloseTo(r.customer_interval_s, 2);
    expect(S.demandRange(L, b)).toEqual([r.demand_min, r.demand_max]);
    expect(offlineEggs(7200, L, b)).toBe(r.offline_max_eggs_2h);
  });
});
