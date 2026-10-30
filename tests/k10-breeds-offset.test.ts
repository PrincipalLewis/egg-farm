// Quick checks for the K10 harness (tests/k10-breeds-offset.ts) and its CI trigger (scripts/k10-trigger.mjs). The 200-seed offset test
// itself is tests/k10-breeds-offset.k10.test.ts (`npm run test:k10`).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from '../scripts/sync-economy';
import { validateBalance, type Balance } from '../src/config/balance';
import { loadTargets } from './pacing-guards';
import { b4Gate, b4Stack, bcFromCsv, bcDefaults, hasBreedsCols, Breeds, bsInit, run, PROFS, B4_BASE } from './k10-breeds-offset';
// @ts-expect-error plain .mjs script without types
import { csvMechChanges, k10Reasons } from '../scripts/k10-trigger.mjs';

// Byte copy of Economy's M5.1 draft CSV ad27fe73 (scratch/m51-econ/economy.m51-draft.csv): M5.0 CSV 8dc90e2b + the 32 bc_* columns.
const FIX = new URL('./fixtures/economy-ad27fe73.csv', import.meta.url), FIX_SHA = 'ad27fe73eab91b5ae0005b719d9822fb063f3a2d1561cfc917e853e1f4d7d477';
const csvBalance = (csv: string): Balance => validateBalance(buildBalance(parseEconomyCsv(csv),
  JSON.parse(readFileSync(new URL('../src/config/balance.json', import.meta.url), 'utf8')), readEconomyConfig() as any) as Balance, false);

describe('k10 harness', () => {
  const raw = readFileSync(FIX), csv = raw.toString('utf8');
  it('fixture is the ad27fe73 draft CSV, and its bc_* equal the code defaults (g1csv "changed vs code defaults: none")', () => {
    expect(createHash('sha256').update(raw).digest('hex')).toBe(FIX_SHA);
    expect(hasBreedsCols(csv)).toBe(true);
    expect(bcFromCsv(csv)).toEqual(bcDefaults());
    expect(bcFromCsv(csv.replace(/\n/g, '\r\n'))).toEqual(bcDefaults()); // CRLF-safe
  });
  it('rejects a non-constant bc_* column and more than one incubator', () => {
    const lines = csv.trim().split('\n'), h = lines[0].split(','), i = h.indexOf('bc_settle_s');
    const bad = lines.map((l, r) => { if (r !== 3) return l; const c = l.split(','); c[i] = '301'; return c.join(','); }).join('\n');
    expect(() => bcFromCsv(bad)).toThrow(/bc_settle_s must be constant/);
    const j = h.indexOf('bc_incubators'), two = lines.map((l, r) => { if (!r) return l; const c = l.split(','); c[j] = '2'; return c.join(','); }).join('\n');
    expect(() => bcFromCsv(two)).toThrow(/1 incubator/);
  });
  it('seed 1 equals the scratch harness of record (g1csv.ts -> g1tap/m5tap/breeds 76c07ecf, SEEDS=1, g1max @0.27)', () => {
    const b = csvBalance(csv), cb = bcFromCsv(csv);
    const o = b4Gate(b, b4Stack('g1F', 0.27, cb), 'AssZhold_g1F', { seeds: 1, s0: 1, T: 12000, step: 300, prof: 'optimal', targets: loadTargets() }, cb.env);
    // Captured from the scratch run (stderr result line), 2026-10-30, scratch/k10-breeds/parity/seed1-scratch.txt.
    expect(JSON.stringify(o)).toBe('{"cfg":"AssZhold_g1F","prof":"optimal","windows":5,"hatchesMed":0,"flockCompleteMedMin":null,"flockCompleteN":0,"stepL30":[null,null],"win":{"P95_allWindows":1.794,"P95_ofSeedMax":1.794,"worstSeed":1.794,"median":1.359},"byBand":{"F10-17":[1.79,1.79,1.79],"F18-23":[1.36,1.66,1.66],"F24-29":[1.36,1.36,1.36],"F30+":[null,null,null]},"premium":{"F10-19":[53.11,53.11],"F20-29":[64.52,64.52],"F30+":[60.72,60.72]}}');
  }, 60_000);
  it('steps at exactly 100 ms: a balance with another tickHz is refused', () => {
    const b = csvBalance(csv);
    expect(() => run({ ...b, tickHz: 20 } as Balance, 1, PROFS.optimal, B4_BASE, 1)).toThrow(/tickHz must be 10/);
    const br = new Breeds({ policy: 'farmfirst', loadout: 'present' }), bs = bsInit(1);
    expect(() => br.tick(bs, 0.05, 1, 10)).toThrow(/100 ms/);
  });
  it('incubator counts integer ms: a 60 s hatch reveals on exactly the 600th 100 ms tick, and the reveal slots nothing', () => {
    const br = new Breeds({ policy: 'farmfirst', loadout: 'present' }), bs = bsInit(1); bs.inc = { breed: 'leghorn', remMs: 60_000 };
    for (let i = 1; i < 600; i++) br.tick(bs, 0.1, i / 10, 12);
    expect(bs.inc?.remMs).toBe(100); br.tick(bs, 0.1, 60, 12);
    expect(bs.inc).toBeNull(); expect(bs.owned.leghorn).toBe(0); expect(bs.slots).toEqual([]);
  });
  it('settle: a placed breed gives 0 bp for bc_settle_s, then its full bp; forcedSettle gates each forced slot the same way', () => {
    const br = new Breeds({ policy: 'farmfirst', loadout: 'present' }), bs = bsInit(1);
    bs.owned.leghorn = 0; bs.slots = ['leghorn']; bs.placedAt.leghorn = 100;
    expect(br.fam(bs, 'present', 12, 399.9)).toBe(0); expect(br.fam(bs, 'present', 12, 400)).toBe(250);
    const f = new Breeds({ policy: 'forced', loadout: 'present', forcedSettle: true }), fs = bsInit(1);
    f.tick(fs, 0.1, 50, 10); // slot 1 opens at 50 s (end of tick)
    expect(f.fam(fs, 'present', 10, 349.9)).toBe(0); expect(f.fam(fs, 'present', 10, 350)).toBe(600); // cream_legbar 2* = floor(400 x 1.5); lt18 cap 700
    const nf = new Breeds({ policy: 'forced', loadout: 'present' });
    expect(nf.fam(bsInit(1), 'present', 10, 0)).toBe(f.fam(fs, 'present', 10, 350)); // no-settle = upper bound from the first tick
  });
});

describe('k10 trigger', () => {
  const H = 'level,farm_cost,tc_streak_cap,bc_settle_s\n';
  it('fires on tc_* / bc_* / farm_cost cell, add or remove; not on other columns', () => {
    const a = H + '0,10,0.28,300\n1,20,0.28,300\n';
    expect(csvMechChanges(a, a)).toEqual([]);
    expect(csvMechChanges(a, a.replace('level,farm_cost', 'level,hens_cost'))).toEqual(['economy.csv: column farm_cost removed']);
    expect(csvMechChanges(a, a.replace('1,20,0.28', '1,20,0.27'))).toEqual(['economy.csv: tc_streak_cap changed (row L1: 0.28 -> 0.27)']);
    expect(csvMechChanges(a, a.replace(/,300/g, ',301'))[0]).toMatch(/bc_settle_s changed/);
    expect(csvMechChanges('level,farm_cost\n0,10\n', 'level,farm_cost,bc_x\n0,10,1\n')).toEqual(['economy.csv: column bc_x added']);
    expect(csvMechChanges(a.replace(/\n/g, '\r\n'), a)).toEqual([]); // EOL-only change is not a K10 change
  });
  it('fires on a farm_cost-only diff (D-HOP-23; #92 L27-29 retune flipped B4)', () => {
    const a = H + '0,10,0.28,300\n1,20,0.28,300\n';
    expect(csvMechChanges(a, a.replace('1,20,', '1,25,'))).toEqual(['economy.csv: farm_cost changed (row L1: 20 -> 25)']);
    expect(k10Reasons(['data/economy.csv'], [a, a.replace('1,20,', '1,25,')])).toEqual(['economy.csv: farm_cost changed (row L1: 20 -> 25)']);
    const o = 'level,farm_cost,hens_cost\n0,10,5\n1,20,6\n';
    expect(csvMechChanges(o, o.replace('1,20,6', '1,20,7'))).toEqual([]); // other non-mechanic columns still do not trigger
  });
  it('fires on streak / tap-coins / Broody / golden / breeds code and the harness; not on unrelated files', () => {
    expect(k10Reasons(['src/sim/streak.ts', 'src/sim/breeds.ts', 'src/sim/golden-egg.ts', 'src/ui/broody-chip.ts', 'src/sim/tap-coins.ts', 'tests/k10-breeds-offset.ts'], [null, null])).toHaveLength(6);
    expect(k10Reasons(['src/ui/app.ts', 'README.md', 'src/save/save.ts'], [null, null])).toEqual([]);
  });
});
