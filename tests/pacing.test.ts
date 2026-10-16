import { describe, it, expect } from 'vitest';
import { rc1Balance as b } from './rc1-balance'; // rc1 economy (main); this branch's CSV is f1-m4cols
import { runBot, median } from './bot';
// AC7 (core-loop-spec, M1-R1): 20 seeds, medians, seller15 + cheapest robustness, ±20% on times.
const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
const seller = SEEDS.map(s => runBot(b, s, 'seller15'));
const cheap = SEEDS.map(s => runBot(b, s, 'cheapest'));
const med = (rs: typeof seller, f: (r: (typeof seller)[number]) => number | null) => median(rs.map(r => f(r) ?? Infinity));
describe('AC7 pacing bot on the real sim', () => {
  it('report', () => {
    console.log('AC7 seller15:', { first: med(seller, r => r.firstUpgradeS), up5: med(seller, r => r.upgradesAt(300)), f10m: med(seller, r => r.farmAt(600)),
      L10min: med(seller, r => r.farmReachedS(10)) / 60, L18min: med(seller, r => r.farmReachedS(18)) / 60, f30m: med(seller, r => r.farmAt(1800)) },
      'cheapest:', { up5: med(cheap, r => r.upgradesAt(300)), f10m: med(cheap, r => r.farmAt(600)), f30m: med(cheap, r => r.farmAt(1800)) });
  });
  it('first upgrade <= 30 s', () => { expect(med(seller, r => r.firstUpgradeS)).toBeLessThanOrEqual(30); });
  it('>= 9 upgrades by 5 min', () => { expect(med(seller, r => r.upgradesAt(300))).toBeGreaterThanOrEqual(9); });
  it('Farm L10 reached within 8-12 min', () => { const m = med(seller, r => r.farmReachedS(10)) / 60; expect(m).toBeGreaterThanOrEqual(8); expect(m).toBeLessThanOrEqual(12); });
  it('Farm L18 reached within 24-36 min', () => {
    const long = SEEDS.slice(0, 8).map(s => runBot(b, s, 'seller15', 2400));
    const m = med(long, r => r.farmReachedS(18)) / 60; expect(m).toBeGreaterThanOrEqual(24); expect(m).toBeLessThanOrEqual(36);
  });
  it('cheapest-first Farm level >= 70% of seller15 at 10 and 30 min', () => {
    for (const t of [600, 1800]) expect(med(cheap, r => r.farmAt(t))).toBeGreaterThanOrEqual(0.7 * med(seller, r => r.farmAt(t)));
  });
}, 120_000);
