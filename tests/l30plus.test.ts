// L30+ (product/farm/l30plus-spec.md v0.2 + HoP 23:37): data-driven clamps (Farm 50, Hens/Egg value 55), per-row caps
// (F+3 below L40, F+5 from L40), L30-17 extra-level surcharge, L30-18 no near-zero increase. All expected values are read
// from data/staging/economy.l30plus.csv (shipping: product/economy.l30plus-polish.csv sha256 b59c4e0d...; 3e3d61fd retired 00:28).
// Extra-level price = max(row, floor(share x farm_cost(F) x (1 + markup x (extra-1)))), late_curve.py ab928dc96d1c:71.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseEconomyCsv, fitM4, farmMaxOf, readEconomyConfig } from '../scripts/sync-economy';
import { balance as live, validateBalance, type Balance } from '../src/config/balance';
import { floorSafe, trackExtraCost, trackMaxLevel, hensCap, eggValueCap, trackPriceCents, trackEggsPerSec } from '../src/config/formulas';
import { trackLock, trackBuyCost, prodEggsPerSec } from '../src/sim/tracks';
import { m4OfflineEggs } from '../src/sim/offline';
import { initialState } from '../src/sim/state';
import { apply } from '../src/sim/actions';
import { fxArrow } from '../src/ui/tracks-ui';
import { fmtMoneyShort, fmtCount } from '../src/ui/format';
function suite(file: string) {
const R = parseEconomyCsv(readFileSync(new URL(`../data/staging/${file}`, import.meta.url), 'utf8'));
const cfg = readEconomyConfig();
const farmMax = farmMaxOf(R, cfg);
// Live params + the L30+ M4 block and Farm prices from the table (full L30+ param fit waits for Economy's merge, D5).
const b: Balance = validateBalance({ ...live, maxLevel: farmMax, m4: { ...fitM4(R, live, cfg)!, enabled: 1 },
  farm: { ...live.farm, costOverrides: Object.fromEntries(R.slice(0, farmMax + 1).map(r => [r.level, r.farm_cost])) } } as Balance);
const st = (F: number, H: number, V = 0, coins = 1e15) => ({ ...initialState(b, 1), farmLevel: F, hensLevel: H, eggValueLevel: V, coinsCents: coins, tracksV7: 1 } as any);
const fc = (F: number) => R[F].farm_cost, share = (F: number) => R[F].hv_extra_cost_farm_share;
const xp = (F: number, L: number, col: string) => Math.max(R[L][col], Math.floor(share(F) * fc(F) * (1 + R[0].hv_extra_second_markup * (L - F - 3))));
describe(`${file}: L30+ D1 clamps from data`, () => {
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
describe(`${file}: L30-13/17 buy gate`, () => {
  it('L39: cap F+3 from the row, no surcharge', () => {
    expect(R[39].hens_cap_over_farm).toBe(3); expect(share(39)).toBe(0);
    expect(trackLock(st(39, 42), 'hens', b)).toBe('cap');
    expect(trackBuyCost(st(39, 41), 'hens', b)).toBe(R[41].hens_cost);
  });
  it('L40: cap F+5; first extra level = max(row, floor(share x current Farm cost))', () => {
    expect(R[40].hens_cap_over_farm).toBe(5); expect(share(40)).toBe(0.15);
    expect(trackBuyCost(st(40, 42), 'hens', b)).toBe(R[42].hens_cost); // within F+3: no surcharge
    expect(trackLock(st(40, 43), 'hens', b)).toBeNull();
    expect(trackBuyCost(st(40, 43), 'hens', b)).toBe(xp(40, 43, 'hens_cost'));
    expect(trackBuyCost(st(40, 0, 43), 'eggValue', b)).toBe(xp(40, 43, 'egg_value_cost'));
  });
  it('+2 level = additive markup 1 + 0.10 x (extra-1); F+5 locks', () => {
    expect(trackBuyCost(st(40, 44), 'hens', b)).toBe(xp(40, 44, 'hens_cost'));
    expect(trackLock(st(40, 45), 'hens', b)).toBe('cap');
  });
  it('surcharge follows the CURRENT Farm level', () => {
    expect(trackBuyCost(st(45, 48), 'hens', b)).toBe(xp(45, 48, 'hens_cost'));
    expect(trackBuyCost(st(46, 48), 'hens', b)).toBe(R[48].hens_cost); // F+3 = 49 now
  });
  it('buying charges the surcharged price', () => {
    const s = st(40, 43, 0, 1e13), after = apply(s, { type: 'buyTrack', track: 'hens' } as any, b, []);
    expect(s.coinsCents - after.coinsCents).toBe(trackBuyCost(s, 'hens', b) * 100);
  });
});
describe(`${file}: L30-16 sync-economy carries per-row caps and hv_extra_cost_farm_share`, () => {
  const m = fitM4(R, live, cfg)!;
  it('per-row columns reach the build', () => {
    expect(m.hens.capOverFarmByFarm).toEqual(R.slice(0, 51).map(r => r.hens_cap_over_farm));
    expect((m as any).extraCostFarmShareByFarm).toEqual(R.slice(0, 51).map(r => r.hv_extra_cost_farm_share));
  });
  it('a changed cap/share in one row needs no code change', () => {
    const m2 = fitM4(R.map(r => r.level === 39 ? { ...r, hens_cap_over_farm: 4, hv_extra_cost_farm_share: 0.2 } : r), live, cfg)!;
    expect(m2.hens.capOverFarmByFarm![39]).toBe(4); expect((m2 as any).extraCostFarmShareByFarm[39]).toBe(0.2);
  });
  it('farm_max_level / hv_extra_second_markup CSV columns win over config when present', () => {
    const R2 = R.map(r => ({ ...r, farm_max_level: 48, hv_extra_second_markup: 0.2 }) as Record<string, number>);
    expect(farmMaxOf(R2, cfg)).toBe(48); expect((fitM4(R2, live, cfg) as any).extraSecondLevelMult).toBe(1.2);
    expect(farmMaxOf(R, cfg)).toBe(cfg.farmMaxLevel); expect((fitM4(R, live, cfg) as any).extraSecondLevelMult).toBe(cfg.hvExtraSecondLevelMult);
    expect(() => farmMaxOf(R2.map(r => r.level === 3 ? { ...r, farm_max_level: 47 } : r), cfg)).toThrow(/farm_max_level must be constant/);
  });
  it('fails loudly without hvExtraSecondLevelMult', () => { expect(() => fitM4(R.map(({ hv_extra_second_markup: _m, ...r }) => r as any), live, { ...cfg, hvExtraSecondLevelMult: undefined })).toThrow(/hvExtraSecondLevelMult/); });
  it('live CSV (constant caps, no share column) produces the unchanged scalar block', () => {
    expect(live.m4!.hens.capOverFarmByFarm).toBeUndefined(); expect((live.m4 as any).extraCostFarmShareByFarm).toBeUndefined();
  });
});
describe(`${file}: Hens production from data, never gated by Farm (HoP 23:49)`, () => {
  it('L51-55 (and every level) produce at their own CSV row', () => {
    for (let H = 0; H <= 55; H++) expect(trackEggsPerSec(H, b)).toBe(R[H].eggs_per_sec);
    for (const H of [51, 52, 53, 54, 55]) expect(prodEggsPerSec(st(50, H), b)).toBe(R[H].eggs_per_sec);
    expect(R[55].eggs_per_sec).toBeGreaterThan(R[50].eggs_per_sec);
  });
  it('Farm level does not change production or offline at a given Hens level', () => {
    for (const F of [0, 10, 39, 40, 50]) {
      expect(prodEggsPerSec(st(F, 53), b)).toBe(R[53].eggs_per_sec);
      expect(m4OfflineEggs(3600, 53, b)).toBe(Math.floor(Math.min(3600 * R[53].offline_eggs_per_sec, R[53].offline_max_eggs_2h)));
    }
  });
});
describe(`${file}: L30-18 no near-zero increase in the UI`, () => {
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
describe(`${file}: integer-safe floor (PR #12)`, () => {
  it('exact-integer product never loses a coin (0.29 x 100 = 29, not 28)', () => {
    expect(Math.floor(0.29 * 100)).toBe(28); expect(floorSafe(0.29 * 100)).toBe(29); expect(floorSafe(28.9)).toBe(28);
    const RR = R.map(r => r.level === 40 ? { ...r, hv_extra_cost_farm_share: 0.29 } : r);
    const bb = { ...b, m4: { ...b.m4!, ...fitM4(RR, live, cfg)!, enabled: 1 }, farm: { ...b.farm, costOverrides: { ...b.farm.costOverrides, 40: 100 } } } as unknown as Balance;
    expect(trackExtraCost('hens', 43, 40, bb)).toBe(29);
  });
});
describe(`${file}: Economy 00:04 data checks`, () => {
  const S = parseEconomyCsv(readFileSync(new URL('./fixtures/economy.f1-m4cols-86f0e80e.csv', import.meta.url), 'utf8'));
  it('rows L0-29 equal staging rev 86f0e80e exactly (every staging column)', () => {
    for (let L = 0; L < 30; L++) for (const c of Object.keys(S[0])) expect(R[L][c], `L${L} ${c}`).toBe(S[L][c]);
  });
  it('collection_cost = floor(10 x 1.6^L), strictly rising through L55', () => {
    R.forEach((r, L) => { expect(r.collection_cost).toBe(Math.floor(10 * 1.6 ** L)); if (L) expect(r.collection_cost).toBeGreaterThan(R[L - 1].collection_cost); });
    expect(R.length - 1).toBe(55);
  });
  it('Hens L51-55 have real rates (rising, > L50)', () => { for (let L = 51; L <= 55; L++) expect(R[L].eggs_per_sec).toBeGreaterThan(R[L - 1].eggs_per_sec); });
  it('farm_max_level and hv_extra_second_markup are read from the CSV (no config needed)', () => {
    expect(farmMaxOf(R, {})).toBe(50); expect(R[0].farm_max_level).toBe(50);
    expect((fitM4(R, live, { hvExtraSecondLevelMult: 9 }) as any).extraSecondLevelMult).toBe(1 + R[0].hv_extra_second_markup);
    expect(R[0].hv_extra_second_markup).toBe(0.1);
  });
  it('no extra-level price is below its row cost: 0 of 44 cells (F40-50 x extra 1-2 x Hens/Egg value)', () => {
    let n = 0, below = 0;
    for (let F = 40; F <= 50; F++) for (const k of [1, 2]) for (const [t, col] of [['hens', 'hens_cost'], ['eggValue', 'egg_value_cost']] as const) {
      const L = F + 3 + k - 1, s = t === 'hens' ? st(F, L) : st(F, 0, L); n++;
      expect(trackLock(s, t, b)).toBeNull();
      const p = trackBuyCost(s, t, b); if (p < R[L][col]) below++; expect(p).toBe(xp(F, L, col));
    }
    expect(n).toBe(44); expect(below).toBe(0);
  });
  it('exact values match late_curve.py ab928dc96d1c:71 (floored)', () => {
    const want: [number, number, 'hens' | 'eggValue', number][] = [
      [40, 43, 'hens', 143835], [40, 43, 'eggValue', 260165], [40, 44, 'hens', 156667], [40, 44, 'eggValue', 265369],
      [45, 48, 'hens', 353630], [45, 49, 'eggValue', 388993], [50, 53, 'hens', 640141], [50, 54, 'eggValue', 704155]];
    for (const [F, L, t, v] of want) expect(trackBuyCost(t === 'hens' ? st(F, L) : st(F, 0, L), t, b), `F${F} ${t} L${L}`).toBe(v);
  });
});
}
suite('economy.l30plus.csv');
