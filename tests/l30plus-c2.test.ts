// L30+ fix C2 (HoP 09:02, Features PR; QA qa/m3-recheck/l30fix-C2-1536be49.md): L30 row + L31-55 pack, all values read from data/economy.csv.
// No balance is hand-built here: expectations come from the CSV cells (or from main's CSV via git for the regression case).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { balance as b } from '../src/config/balance';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from '../scripts/sync-economy';
import { tableRow, farmCost, collectionCost, coopCapacity, farmMaxLevel, hvLevelCost } from '../src/config/formulas';
import { initialState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import { serialize, load, SAVE_KEY } from '../src/save/save';
import { mem } from './helpers';
const csvBuf = readFileSync(new URL('../data/economy.csv', import.meta.url));
const R = parseEconomyCsv(csvBuf.toString('utf8'));
const C2 = 'a957b07218591e1d50fde55a1842c73d66151b5bbbedae6225a2b8f60036252b';
const top = R[R.length - 1].level;

describe('L30+ C2 data', () => {
  it('data/economy.csv, staging and vendored copies are the C2 bytes', () => {
    for (const p of ['../data/economy.csv', '../data/staging/economy.f1-m4cols.csv', '../vendor/economy-sim/economy.f1-m4cols.csv'])
      expect(createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex'), p).toBe(C2);
  });
  it('every farm_cost L0..last row equals the CSV; maxLevel = last row; Farm max = CSV farm_max_level', () => {
    expect(b.maxLevel).toBe(top);
    for (const r of R) expect(farmCost(r.level, b), `L${r.level}`).toBe(r.farm_cost);
    expect(farmMaxLevel(b)).toBe(R[0].farm_max_level);
    expect(farmMaxLevel(b)).toBeLessThan(top);
  });
  it('every formula column (demand, coop wing, offline, collection) reproduces the CSV on all rows', () => {
    for (const r of R) { const t = tableRow(r.level, b) as Record<string, number>; for (const c of Object.keys(t)) expect(t[c], `L${r.level} ${c}`).toBeCloseTo(r[c], 9); }
    const w = b.farm.coopWing!; expect(R.find(r => r.coop_capacity !== b.farm.coopCapacityBase + b.farm.coopCapacityPerLevel * r.level)?.level).toBe(w.fromLevel);
    expect(coopCapacity(w.fromLevel - 1, b)).toBe(R[w.fromLevel - 1].coop_capacity);
  });
  it("main's CSV (6dca24cd) still syncs to main's balance.json byte-for-byte (no new params on old data)", () => {
    const mainCsv = execFileSync('git', ['show', 'origin/main:data/economy.csv'], { cwd: new URL('..', import.meta.url).pathname }).toString();
    const mainBal = JSON.parse(execFileSync('git', ['show', 'origin/main:src/config/balance.json'], { cwd: new URL('..', import.meta.url).pathname }).toString());
    const out = buildBalance(parseEconomyCsv(mainCsv), b, readEconomyConfig());
    expect(JSON.stringify(out, null, 2)).toBe(JSON.stringify(mainBal, null, 2));
  });
  it('a CSV whose late demand is not a linear continuation fails loudly', () => {
    const bad = R.map(r => r.level === top ? { ...r, demand_max: r.demand_max + 1 } : r);
    expect(() => buildBalance(bad, b, readEconomyConfig())).toThrow(/demand/);
  });
});

describe('extra-level price rule (Hens / Egg value): max(row cost, share x current Farm cost x (1 + markup x extra))', () => {
  const share = (F: number) => R[F].hv_extra_cost_farm_share, mk = R[0].hv_extra_second_markup, base = R[0].hens_cap_over_farm;
  it('params come from the CSV columns', () => {
    expect(b.hvExtra).toEqual({ shareByFarm: R.map(r => r.hv_extra_cost_farm_share), markup: mk, baseCapOverFarm: base });
  });
  it('matches the rule on every (Farm, track level, track) with share > 0; row cost elsewhere', () => {
    let hits = 0, maxed = 0;
    for (let F = 0; F <= farmMaxLevel(b); F++) for (let L = 0; L < top; L++) for (const col of ['hens_cost', 'egg_value_cost']) {
      const row = R[L][col], over = L - F - base;
      const want = share(F) > 0 && over >= 0 ? Math.max(row, Math.floor(share(F) * R[F].farm_cost * (1 + mk * over))) : row;
      expect(hvLevelCost(row, L, F, b), `F${F} L${L} ${col}`).toBe(want);
      if (want !== row) hits++; if (share(F) > 0 && over >= 0 && want === row) maxed++;
    }
    expect(hits).toBeGreaterThan(0); // the surcharge binds somewhere in C2
    expect(maxed).toBeGreaterThan(0); // and the row cost wins somewhere (max, not replace)
  });
  it('first extra level costs share x Farm cost, second adds the markup once (linear, not compound)', () => {
    const F = R.findIndex(r => r.hv_extra_cost_farm_share > 0), L = F + base;
    expect(hvLevelCost(0, L, F, b)).toBe(Math.floor(share(F) * R[F].farm_cost));
    expect(hvLevelCost(0, L + 1, F, b)).toBe(Math.floor(share(F) * R[F].farm_cost * (1 + mk)));
    expect(hvLevelCost(0, L - 1, F, b)).toBe(0); // inside the base cap: row cost
    expect(hvLevelCost(7, L, F - 1, b)).toBe(7); // share 0 below the first share row
  });
});

describe('saves across the cap lift', () => {
  const saveAt = (L: number) => ({ ...initialState(b, 7), farmLevel: L, collectionLevel: L, coinsCents: 1e12 });
  const roundTrip = (s: any) => { const kv = mem(); kv.setItem(SAVE_KEY, serialize(s, Date.now())); return load(kv, b); };
  for (const L of [29, 30]) it(`L${L} save loads unchanged; next Farm level costs the CSV row`, () => {
    const s = saveAt(L), f = roundTrip(s);
    expect(f).not.toBeNull(); expect(f!.state).toEqual(JSON.parse(JSON.stringify(s)));
    const after = apply(f!.state, { type: 'buyFarm' } as any, b);
    expect(after.farmLevel).toBe(L + 1); expect(s.coinsCents - after.coinsCents).toBe(R[L].farm_cost * 100);
  });
  it('L35 save loads and plays (sim steps, buys Farm and Collection at the CSV costs)', () => {
    const f = roundTrip(saveAt(35)); expect(f).not.toBeNull();
    let s = f!.state; for (let i = 0; i < 600; i++) s = step(s, 0.1, b);
    expect(s.farmLevel).toBe(35);
    const c0 = s.coinsCents; s = apply(s, { type: 'buyFarm' } as any, b); expect(s.farmLevel).toBe(36); expect(c0 - s.coinsCents).toBe(R[35].farm_cost * 100);
    const c1 = s.coinsCents; s = apply(s, { type: 'buyCollection' } as any, b); expect(s.collectionLevel).toBe(36); expect(c1 - s.coinsCents).toBe(collectionCost(35, b) * 100);
  });
  it('Farm and Collection stop at farm_max_level; saves up to the last row still load', () => {
    const M = farmMaxLevel(b), s = saveAt(M);
    expect(apply(s, { type: 'buyFarm' } as any, b)).toBe(s); expect(apply(s, { type: 'buyCollection' } as any, b)).toBe(s);
    expect(roundTrip(saveAt(top))).not.toBeNull(); expect(roundTrip(saveAt(top + 1))).toBeNull();
  });
});

// HoP 09:29 (50/55 split confirmed): Farm and Collection MAX at CSV farm_max_level; load clamp = last row (55).
import { candidates, selectGoal, upgradeCard } from '../src/ui/next-goal';
describe('HoP 50/55 split: Farm and Collection MAX at farm_max_level', () => {
  const M = R[0].farm_max_level;
  const at = (F: number, C: number) => ({ ...initialState(b, 7), farmLevel: F, collectionLevel: C, coinsCents: 1e15 });
  it('farm_max_level is 50 and the track clamp is 55 (from the CSV)', () => { expect(farmMaxLevel(b)).toBe(M); expect(b.maxLevel).toBe(top); expect([M, top]).toEqual([50, 55]); });
  for (const kind of ['farm', 'collection'] as const) {
    it(`${kind}: card shows MAX and "Level ${M} / ${M}" at ${M}; buyable with "/ ${M}" at ${M - 1}`, () => {
      const s = kind === 'farm' ? at(M, 0) : at(0, M);
      expect(upgradeCard(kind, s, b)).toEqual({ level: M, maxLevel: M, max: true, meta: `Level ${M} / ${M}` });
      const s1 = kind === 'farm' ? at(M - 1, 0) : at(0, M - 1);
      expect(upgradeCard(kind, s1, b)).toMatchObject({ max: false, meta: `Level ${M - 1} / ${M}` });
    });
    it(`${kind}: buying L${M + 1} is impossible even with unlimited coins (state unchanged)`, () => {
      const s = at(M, M), t = apply(s, { type: kind === 'farm' ? 'buyFarm' : 'buyCollection' } as any, b);
      expect(t).toBe(s); expect(t.farmLevel).toBe(M); expect(t.collectionLevel).toBe(M);
    });
  }
  it(`next-goal never offers FARM or COLL at ${M} (offers them at ${M - 1})`, () => {
    const keys = (F: number, C: number) => candidates(at(F, C), b).map(c => c.key);
    expect(keys(M, M)).not.toContain('FARM'); expect(keys(M, M)).not.toContain('COLL');
    expect(keys(M - 1, M - 1)).toEqual(expect.arrayContaining(['FARM', 'COLL']));
    const g = selectGoal(at(M, M), b, 0); expect(['FARM', 'COLL']).not.toContain(g.key);
  });
  it(`saves at ${M + 1}..${top} (above Farm max, within the clamp) load cleanly with levels kept; ${top + 1} is rejected`, () => {
    const rt = (s: any) => { const kv = mem(); kv.setItem(SAVE_KEY, serialize(s, Date.now())); return load(kv, b); };
    for (const L of [M + 1, top]) {
      const s = at(L, L), f = rt(s); expect(f, `L${L}`).not.toBeNull(); expect(f!.state).toEqual(JSON.parse(JSON.stringify(s)));
      expect(upgradeCard('farm', f!.state, b).max).toBe(true);
    }
    expect(rt(at(top + 1, 0))).toBeNull(); expect(rt(at(0, top + 1))).toBeNull();
  });
});

// TODO(#12 integration after #31 merges): main has no Hens / Egg value tracks or save fields; enable these on the M4-A base.
describe.skip('Hens / Egg value tracks to 55 (needs M4-A #31)', () => {
  it.todo('Hens and Egg value buyable L51..55 at Farm 50, charged hvLevelCost(row, L, F) (max(row, share x farmCost(F) x (1 + markup x extra)))');
  it.todo('H/V cap = F + hens_cap_over_farm (3) below L40, F + 5 from L40; capped at track max 55; L56 impossible');
  it.todo('best-buy / next-goal / track card use hvLevelCost and show "Level L / 55", MAX at 55');
  it.todo('save with hensLevel / eggValueLevel 55 loads unchanged; 56 rejected (migrate-v7 default track max = 55)');
  it.todo('100-seed TS L30+ bot matches the pinned Python late_curve gate (no test-built balance)');
});
