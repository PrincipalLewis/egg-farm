// L30+ (product/farm/l30plus-spec.md v0.2 + HoP 23:37): data-driven clamps (Farm 50, Hens/Egg value 55), per-row caps
// (F+3 below L40, F+5 from L40), L30-17 extra-level surcharge, L30-18 no near-zero increase. All expected values are read
// from tests/fixtures/l30plus-cand-b.csv (HoP candidate (b), sha256 84bd0b70bf40b8df..., D-HOP-2026-10-19-22; test fixture only,
// the shipping data/economy.csv stays main's 31-row table).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseEconomyCsv, fitM4, farmMaxOf, readEconomyConfig } from '../scripts/sync-economy';
import { balance as live, validateBalance, type Balance } from '../src/config/balance';
import { trackMaxLevel, hensCap, eggValueCap, trackPriceCents, trackEggsPerSec } from '../src/config/formulas';
import { trackLock, trackBuyCost } from '../src/sim/tracks';
import { initialState } from '../src/sim/state';
import { apply } from '../src/sim/actions';
import { fxArrow } from '../src/ui/tracks-ui';
import { fmtMoneyShort, fmtCount } from '../src/ui/format';
const R = parseEconomyCsv(readFileSync(new URL('./fixtures/l30plus-cand-b.csv', import.meta.url), 'utf8'));
const cfg = readEconomyConfig();
const farmMax = farmMaxOf(R, cfg);
// Live params + the L30+ M4 block and Farm prices from the table (full L30+ param fit waits for Economy's merge, D5).
const b: Balance = validateBalance({ ...live, maxLevel: farmMax, m4: { ...fitM4(R, live, cfg)!, enabled: 1 },
  farm: { ...live.farm, costTable: R.slice(0, farmMax + 1).map(r => r.farm_cost) } } as unknown as Balance);
const st = (F: number, H: number, V = 0, coins = 1e15) => ({ ...initialState(b, 1), farmLevel: F, hensLevel: H, eggValueLevel: V, coinsCents: coins, tracksV7: 1 } as any);
const fc = (F: number) => R[F].farm_cost, share = (F: number) => R[F].hv_extra_cost_farm_share;
describe('L30+ D1 clamps from data', () => {
  it('Farm max 50 (config), Hens/Egg value max 55 (CSV rows)', () => {
    expect(R.length).toBe(56); expect(farmMax).toBe(50);
    expect(trackMaxLevel('hens', b)).toBe(R.length - 1); expect(trackMaxLevel('eggValue', b)).toBe(55);
  });
  it('Farm cannot be bought above 50 (rows 51-55 are pricing base only)', () => {
    const s = st(50, 50); expect(apply(s, { type: 'buyFarm' }, b, []).farmLevel).toBe(50);
    expect(apply(st(49, 49), { type: 'buyFarm' }, b, []).farmLevel).toBe(50);
  });
  it('clamp at 55: H/V buyable to 55 at F50, MAX at 55', () => {
    expect(hensCap(50, b)).toBe(55); expect(eggValueCap(50, b)).toBe(55);
    expect(trackLock(st(50, 54), 'hens', b)).toBeNull();
    expect(apply(st(50, 54), { type: 'buyTrack', track: 'hens' } as any, b, []).hensLevel).toBe(55);
    expect(trackLock(st(50, 55), 'hens', b)).toBe('max'); expect(trackLock(st(50, 50, 55), 'eggValue', b)).toBe('max');
  });
  it('live table (31 rows) still clamps at 30', () => { expect(live.maxLevel).toBe(30); expect(trackMaxLevel('hens', live)).toBe(30); });
});
describe('L30-13/17 buy gate', () => {
  it('L39: cap F+3 from the row, no surcharge', () => {
    expect(R[39].hens_cap_over_farm).toBe(3); expect(share(39)).toBe(0);
    expect(trackLock(st(39, 42), 'hens', b)).toBe('cap');
    expect(trackBuyCost(st(39, 41), 'hens', b)).toBe(R[41].hens_cost);
  });
  // Levels derived from the data (S2 caps: F+4 at L40-42, F+5 from L43 in cand (b)), not hard-coded.
  const FS = R.find(r => share(r.level) > 0)!.level, F5 = R.find(r => r.level >= FS && r.hens_cap_over_farm === 5)!.level;
  it('first surcharge row: cap from the row; first extra level = row cost + floor(share x current Farm cost)', () => {
    expect(R[FS].hens_cap_over_farm).toBeGreaterThan(3); expect(share(FS)).toBeGreaterThan(0);
    expect(trackBuyCost(st(FS, FS + 2), 'hens', b)).toBe(R[FS + 2].hens_cost); // within F+3: no surcharge
    expect(trackLock(st(FS, FS + 3), 'hens', b)).toBeNull();
    expect(trackBuyCost(st(FS, FS + 3), 'hens', b)).toBe(R[FS + 3].hens_cost + Math.floor(share(FS) * fc(FS)));
    expect(trackBuyCost(st(FS, 0, FS + 3), 'eggValue', b)).toBe(R[FS + 3].egg_value_cost + Math.floor(share(FS) * fc(FS)));
    expect(trackLock(st(FS, FS + R[FS].hens_cap_over_farm), 'hens', b)).toBe('cap');
  });
  it('+2 level costs 10% more surcharge (first F+5 row); F+5 locks', () => {
    expect(trackBuyCost(st(F5, F5 + 4), 'hens', b)).toBe(R[F5 + 4].hens_cost + Math.floor(share(F5) * fc(F5) * cfg.hvExtraSecondLevelMult!));
    expect(trackLock(st(F5, F5 + 5), 'hens', b)).toBe('cap');
  });
  it('surcharge follows the CURRENT Farm level', () => {
    expect(trackBuyCost(st(45, 48), 'hens', b)).toBe(R[48].hens_cost + Math.floor(share(45) * fc(45)));
    expect(trackBuyCost(st(46, 48), 'hens', b)).toBe(R[48].hens_cost); // F+3 = 49 now
  });
  it('buying charges the surcharged price', () => {
    const s = st(FS, FS + 3, 0, 1e13), after = apply(s, { type: 'buyTrack', track: 'hens' } as any, b, []);
    expect(s.coinsCents - after.coinsCents).toBe(trackBuyCost(s, 'hens', b) * 100);
  });
});
describe('L30-16 sync-economy carries per-row caps and hv_extra_cost_farm_share', () => {
  const m = fitM4(R, live, cfg)!;
  it('per-row columns reach the build', () => {
    expect(m.hens.capOverFarmByFarm).toEqual(R.slice(0, 51).map(r => r.hens_cap_over_farm));
    expect((m as any).extraCostFarmShareByFarm).toEqual(R.slice(0, 51).map(r => r.hv_extra_cost_farm_share));
  });
  it('a changed cap/share in one row needs no code change', () => {
    const m2 = fitM4(R.map(r => r.level === 39 ? { ...r, hens_cap_over_farm: 4, hv_extra_cost_farm_share: 0.2 } : r), live, cfg)!;
    expect(m2.hens.capOverFarmByFarm![39]).toBe(4); expect((m2 as any).extraCostFarmShareByFarm[39]).toBe(0.2);
  });
  it('fails loudly without hvExtraSecondLevelMult', () => { expect(() => fitM4(R, live, { ...cfg, hvExtraSecondLevelMult: undefined })).toThrow(/hvExtraSecondLevelMult/); });
  it('live CSV (constant caps, no share column) produces the unchanged scalar block', () => {
    expect(live.m4!.hens.capOverFarmByFarm).toBeUndefined(); expect((live.m4 as any).extraCostFarmShareByFarm).toBeUndefined();
  });
});
describe('L30-18 no near-zero increase in the UI', () => {
  it('fxArrow hides an increase that formats to zero', () => {
    expect(fxArrow('$1.2M', '$1.2M')).toBe('$1.2M');
    expect(fxArrow('$1.2M', '$1.3M')).toContain('→');
  });
  it('every Egg value / Hens row arrow across L0-55 shows a visible increase or none', () => {
    for (const F of [30, 40, 50]) for (let L = 0; L < 55; L++) {
      for (const [a, z] of [[fmtMoneyShort(trackPriceCents(F, F, L, b)), fmtMoneyShort(trackPriceCents(F, F, L + 1, b))],
                            [fmtCount(trackEggsPerSec(L, b)), fmtCount(trackEggsPerSec(L + 1, b))]]) {
        const html = fxArrow(a, z); const m = html.match(/^(.*) <span class="arrow">→<\/span> (.*)$/);
        if (m) expect(m[1]).not.toBe(m[2]);
        expect(html).not.toMatch(/\+\$?0(\.0+)?(%|\b)/);
      }
    }
  });
});
