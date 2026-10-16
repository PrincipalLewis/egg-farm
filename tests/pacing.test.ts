import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { runBot, median } from './bot';
import { runM2 } from './bot-m2';
// AC7 (core-loop-spec, M1-R1; HoP 23:15 standard, product/ac7-qa-threshold-changes.md): 30 seeds (P95 needs >= 30),
// seller15 + cheapest robustness. Pacing gates: P95 + worst-seed guard; other checks stay medians.
/** HoP P95 standard: nearest-rank P95 needs at least this many seeds */
const MIN_SEEDS_P95 = 30;
const SEEDS = Array.from({ length: MIN_SEEDS_P95 }, (_, i) => i + 1);
/** nearest-rank quantile (q=0.95 -> the P95-high seed, q=0.05 -> the P95-low seed) */
export const quant = (xs: number[], q: number) => { const a = [...xs].sort((p, r) => p - r); return a[Math.min(a.length - 1, Math.max(0, Math.ceil(q * a.length) - 1))]; };
const levelAt = (reach: Map<number, number>, t: number) => Math.max(1, ...[...reach].filter(([, s]) => s <= t).map(([L]) => L));
const seller = SEEDS.map(s => runBot(b, s, 'seller15'));
const cheap = SEEDS.map(s => runBot(b, s, 'cheapest'));
const med = (rs: typeof seller, f: (r: (typeof seller)[number]) => number | null) => median(rs.map(r => f(r) ?? Infinity));
describe('AC7 pacing harness', () => {
  it(`seed count >= ${MIN_SEEDS_P95} (P95 standard)`, () => { expect(SEEDS.length).toBeGreaterThanOrEqual(MIN_SEEDS_P95); });
  it('quant nearest-rank on synthetic data', () => {
    const r30 = Array.from({ length: 30 }, (_, i) => 30 - i); // 30..1, unsorted on purpose
    expect(quant(r30, 0.95)).toBe(29); expect(quant(r30, 0.05)).toBe(2);
    const r20 = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(quant(r20, 0.95)).toBe(19); expect(quant(r20, 0.05)).toBe(1);
  });
});
describe('AC7 pacing bot on the real sim', () => {
  it('report', () => {
    console.log('AC7 seller15:', { first: med(seller, r => r.firstUpgradeS), up5: med(seller, r => r.upgradesAt(300)), f10m: med(seller, r => r.farmAt(600)),
      L10min: med(seller, r => r.farmReachedS(10)) / 60, L18min: med(seller, r => r.farmReachedS(18)) / 60, f30m: med(seller, r => r.farmAt(1800)) },
      'cheapest:', { up5: med(cheap, r => r.upgradesAt(300)), f10m: med(cheap, r => r.farmAt(600)), f30m: med(cheap, r => r.farmAt(1800)) });
  });
  it('first upgrade <= 30 s', () => { expect(med(seller, r => r.firstUpgradeS)).toBeLessThanOrEqual(30); });
  it('>= 9 upgrades by 5 min', () => { expect(med(seller, r => r.upgradesAt(300))).toBeGreaterThanOrEqual(9); });
  it('Farm L10 reached within 8-12 min (P95)', () => {
    const ts = seller.map(r => (r.farmReachedS(10) ?? Infinity) / 60);
    expect(quant(ts, 0.95)).toBeLessThanOrEqual(12); expect(quant(ts, 0.05)).toBeGreaterThanOrEqual(8);
  });
  it('AC7 L18: Farm level at 30:00 in L18-22, no workers (P95-low and P95-high seeds)', () => {
    const lv = SEEDS.map(s => runBot(b, s, 'seller15', 1800).farmAt(1800));
    expect(quant(lv, 0.05)).toBeGreaterThanOrEqual(18); expect(quant(lv, 0.95)).toBeLessThanOrEqual(22);
  });
  // With-workers band L20-24 assumes the F1 economy (qa/m3-test-plan.md:107). On pre-F1 main every seed is L18 at 30:00,
  // so this is soft (warns) until F1 merges; flip WORKERS_GATE to true in the F1 merge PR.
  const WORKERS_GATE = false;
  it('AC7 L18 with workers: Farm level at 30:00 in L20-24 (P95-low and P95-high seeds; gating after F1)', () => {
    const lv = SEEDS.map(s => levelAt(runM2(b, s, { model: 'seller15', T: 1800 }).reach, 1800));
    const lo = quant(lv, 0.05), hi = quant(lv, 0.95);
    if (WORKERS_GATE) { expect(lo).toBeGreaterThanOrEqual(20); expect(hi).toBeLessThanOrEqual(24); }
    else if (lo < 20 || hi > 24) console.warn(`AC7 with-workers SOFT (pre-F1): P95 levels ${lo}-${hi}, want L20-24`);
  });
  it('cheapest-first Farm level >= 70% of seller15 at 10 and 30 min', () => {
    for (const t of [600, 1800]) expect(med(cheap, r => r.farmAt(t))).toBeGreaterThanOrEqual(0.7 * med(seller, r => r.farmAt(t)));
  });
}, 120_000);
