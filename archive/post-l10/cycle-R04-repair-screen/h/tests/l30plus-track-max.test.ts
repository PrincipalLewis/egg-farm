// Saves M1 fix (Leadership: Farm 50, Hens/Egg value to 55 = F+5) and HoP: track level 55 is buyable at F50 and stops there,
// L51-55 raise eggs/s, egg value and offline earnings, big numbers stay finite. Synthetic 56-row table from the live CSV
// (rows 31-55 extend row 30 with rising costs and eggs/s, caps F+3 below L40 / F+5 from L40) until the T3 L30+ data lands.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseEconomyCsv, fitM4, farmMaxOf } from '../scripts/sync-economy';
import { balance as live, type Balance } from '../src/config/balance';
import { trackPriceCents, trackEggsPerSec, hensCost, eggValueCost } from '../src/config/formulas';
import { trackLock } from '../src/sim/tracks';
import { m4OfflineEggs } from '../src/sim/offline';
import { initialState } from '../src/sim/state';
import { apply } from '../src/sim/actions';
import { fmtMoneyShort, fmtCount } from '../src/ui/format';
const R = parseEconomyCsv(readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8'));
for (let L = R.length; L <= 55; L++) { const p = R[L - 1]; R.push({ ...p, level: L, hens: p.hens + 1, eggs_per_sec: p.eggs_per_sec + 1, offline_eggs_per_sec: p.offline_eggs_per_sec + 0.5, offline_max_eggs_2h: p.offline_max_eggs_2h + 1800, hens_cost: Math.floor(p.hens_cost * 1.1) + 1, egg_value_cost: Math.floor(p.egg_value_cost * 1.1) + 1 }); }
R.forEach(r => { r.hens_cap_over_farm = r.level < 40 ? 3 : 5; r.egg_value_cap_over_farm = r.level < 40 ? 3 : 5; });
const cfg = { farmMaxLevel: 50 };
const costTable = Array.from({ length: 51 }, (_, L) => (live.farm as any).costTable?.[L] ?? Math.floor(1e9 * 1.2 ** L));
const b = { ...live, farm: { ...live.farm, costTable }, maxLevel: farmMaxOf(R, cfg), m4: { ...fitM4(R, live, cfg)!, enabled: 1 } } as unknown as Balance;
const st = (F: number, H: number, V = 0) => ({ ...initialState(b, 1), farmLevel: F, hensLevel: H, eggValueLevel: V, coinsCents: 1e17, tracksV7: 1 } as any);
describe('L30+ track max 55, Farm max 50', () => {
  it('Farm buying stops at 50 (no next price)', () => {
    expect(apply(st(50, 50), { type: 'buyFarm' }, b, []).farmLevel).toBe(50);
    expect(apply(st(49, 49), { type: 'buyFarm' }, b, []).farmLevel).toBe(50);
  });
  for (const t of ['hens', 'eggValue'] as const) it(`${t}: 54 -> 55 buyable at F50, then max`, () => {
    const k = t === 'hens' ? 'hensLevel' : 'eggValueLevel';
    const s54 = t === 'hens' ? st(50, 54) : st(50, 50, 54);
    expect(trackLock(s54, t, b)).toBeNull();
    const s55 = apply(s54, { type: 'buyTrack', track: t } as any, b, []); expect(s55[k]).toBe(55);
    expect(trackLock(s55, t, b)).toBe('max'); expect(apply(s55, { type: 'buyTrack', track: t } as any, b, [])[k]).toBe(55);
  });
  it('L51-55 raise eggs/s, egg value and offline earnings', () => {
    for (let L = 51; L <= 55; L++) {
      expect(trackEggsPerSec(L, b)).toBeGreaterThan(trackEggsPerSec(L - 1, b));
      expect(trackPriceCents(50, 50, L, b)).toBeGreaterThan(trackPriceCents(50, 50, L - 1, b));
      expect(m4OfflineEggs(7200, L, b)).toBeGreaterThan(m4OfflineEggs(7200, L - 1, b));
    }
  });
  it('big numbers finite at L55 costs', () => {
    for (const c of [hensCost(55, b), eggValueCost(55, b), hensCost(54, b) * 100, trackPriceCents(50, 55, 55, b)]) {
      expect(Number.isFinite(c)).toBe(true); expect(fmtMoneyShort(c)).not.toMatch(/NaN|—|1000/); expect(fmtCount(c)).not.toMatch(/NaN|—/);
    }
  });
});
