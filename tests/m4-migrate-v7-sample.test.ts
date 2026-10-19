// Saves M1 / D-CEO-20261019-05 (B): a committed pre-M4 v6 sample save loads (SAVE_VERSION stays 6) and migrateTracksV7
// never lands a track above its own max (live 30; 56-row L30+ table: tracks 55, Farm 50).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as live, type Balance } from '../src/config/balance';
import { load, SAVE_VERSION } from '../src/save/save';
import { migrateTracksV7 } from '../src/sim/migrate-v7';
import { parseEconomyCsv, fitM4, farmMaxOf } from '../scripts/sync-economy';
const raw = readFileSync(new URL('./fixtures/saves/m4-pre-v7-F30-C30.json', import.meta.url), 'utf8');
const kvOf = (v: string) => ({ getItem: (k: string) => (k.endsWith('.bak') ? null : v), setItem() {}, removeItem() {} }) as any;
const R = parseEconomyCsv(readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8'));
for (let L = R.length; L <= 55; L++) { const p = R[L - 1]; R.push({ ...p, level: L, hens_cost: Math.floor(p.hens_cost * 1.1) + 1, egg_value_cost: Math.floor(p.egg_value_cost * 1.1) + 1 }); }
const cfg = { farmMaxLevel: 50 };
const big = { ...live, maxLevel: farmMaxOf(R, cfg), m4: { ...fitM4(R, live, cfg)!, enabled: 1 } } as unknown as Balance;
const on = { ...live, m4: { ...live.m4!, enabled: 1 } } as Balance;
describe('migrate-v7 sample save', () => {
  it('SAVE_VERSION stays 6 and the sample loads', () => {
    expect(SAVE_VERSION).toBe(6);
    const f = load(kvOf(raw), live)!; expect(f).not.toBeNull(); expect(f.version).toBe(6);
    expect(f.state.farmLevel).toBe(30); expect(f.state.collectionLevel).toBe(30);
  });
  it('live table: migrated sample stays <= Farm max 30', () => {
    const r = migrateTracksV7(load(kvOf(raw), on)!.state, on);
    expect(r.state.hensLevel).toBeLessThanOrEqual(30); expect(r.state.eggValueLevel).toBeLessThanOrEqual(30);
  });
  it('56-row L30+ table: every F0..50 x C0..50 migration stays <= track max 55 and Farm <= 50', () => {
    const s0 = load(kvOf(raw), big)!.state; let maxH = 0, maxV = 0;
    for (let F = 0; F <= 50; F++) for (let C = 0; C <= 50; C += 5) {
      const r = migrateTracksV7({ ...s0, farmLevel: F, collectionLevel: C }, big); expect(r.state.farmLevel).toBeLessThanOrEqual(50);
      maxH = Math.max(maxH, r.state.hensLevel); maxV = Math.max(maxV, r.state.eggValueLevel);
    }
    expect(maxH).toBeLessThanOrEqual(55); expect(maxV).toBeLessThanOrEqual(55); console.log(`migrate-v7 L30+ max H${maxH} V${maxV}`);
  });
});
