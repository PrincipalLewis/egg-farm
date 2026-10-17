import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { runBot, median } from './bot';
import TARGETS from '../data/pacing-targets.json';
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
  // 'Farm L18 reached within 24-36 min' is retired: decisions.md:47 (HoP Oct 16 02:18) replaces it with AC7 = Farm level at 30:00.
  it('AC7 (decisions.md:47): Farm level at 30:00 within the targets band', () => {
    const { min, max, at_s } = TARGETS.ac7_level_at_30min, m = med(seller, r => r.farmAt(at_s));
    expect(m).toBeGreaterThanOrEqual(min); expect(m).toBeLessThanOrEqual(max);
  });
  it('sanity, NON-GATING (decisions.md:111): L18 time within +-tolerance of the F1 time', () => {
    const { center, tolerance_share: t } = TARGETS.l18_minutes_sanity, lo = center * (1 - t), hi = center * (1 + t);
    const m = med(seller, r => r.farmReachedS(18)) / 60;
    if (m < lo || m > hi) console.warn(`pacing sanity (non-gating): L18 at ${m.toFixed(2)} min, want ${lo.toFixed(1)}-${hi.toFixed(1)}`);
  });
  it('cheapest-first Farm level >= 70% of seller15 at 10 and 30 min', () => {
    for (const t of [600, 1800]) expect(med(cheap, r => r.farmAt(t))).toBeGreaterThanOrEqual(0.7 * med(seller, r => r.farmAt(t)));
  });
}, 120_000);
