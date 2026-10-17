// M4A-27 load clamp reads the max level from data (economy.csv -> balance.json maxLevel via sync-economy); never a hard-coded 30.
import { describe, it, expect } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { validate, serialize } from '../src/save/save';
import { migrateTracksV7 } from '../src/sim/migrate-v7';
import { initialState } from '../src/sim/state';
const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
const pad = (a: number[], n: number) => [...a, ...Array(Math.max(0, n + 1 - a.length)).fill(a[a.length - 1])];
const withMax = (n: number): Balance => ({ ...on, maxLevel: n, m4: { ...on.m4!, hens: { ...on.m4!.hens, costs: pad(on.m4!.hens.costs, n) }, eggValue: { ...on.m4!.eggValue, costs: pad(on.m4!.eggValue.costs, n) } } } as Balance);
const raw = (F: number) => serialize({ ...initialState(balance), farmLevel: F, collectionLevel: 0 }, 1760000000000);
describe('M4A-27 max level from data', () => {
  it('balance.maxLevel comes from the data (current economy.csv rows)', () => { expect(Number.isInteger(balance.maxLevel)).toBe(true); expect(balance.maxLevel).toBeGreaterThan(0); });
  it('a non-30 max (40): F35 loads and migrates with H clamped to 40, not 30', () => {
    const b = withMax(40); expect(validate(raw(35), b).ok).toBe(true); expect(validate(raw(41), b).ok).toBe(false);
    const r = migrateTracksV7({ ...initialState(b), farmLevel: 35 }, b); expect(r.state.hensLevel).toBe(35);
    expect(migrateTracksV7({ ...initialState(b), farmLevel: 35 }, b, {}).state.hensLevel).toBeLessThanOrEqual(b.maxLevel);
  });
  it('a smaller max (20): F25 is rejected at load', () => { expect(validate(raw(25), withMax(20)).ok).toBe(false); expect(validate(raw(20), withMax(20)).ok).toBe(true); });
});
