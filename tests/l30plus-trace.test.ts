// Unit tests for the L30+ harness play-equivalence hash/compare and first-buy logic (scripts/l30plus-trace.ts).
import { describe, it, expect } from 'vitest';
import { eventKey, traceHash, compareSeed, summarize, firstBuys, dceo15Verdicts, firstTickAt, prefix, snap, type TraceEvent } from '../scripts/l30plus-trace';
import { initialState } from '../src/sim/state';
import { balance } from '../src/config/balance';
const ev = (i: number, kind: string, F: number, o: Partial<TraceEvent> = {}): TraceEvent => ({ i, t: i / 10, kind, row: 0, coins: 100 * i, F, C: 0, H: 0, V: 0, workers: '', grader: 0, coop: 0, basket: 0, ...o });
const run = (): TraceEvent[] => [ev(10, 'f', 1), ev(20, 'c', 1, { row: 0, C: 1 }), ev(30, 'f', 30), ev(40, 'hens', 30), ev(50, 'f', 31), ev(60, 'c', 31, { row: 22 })];
describe('l30plus-trace hash/compare', () => {
  it('hash is deterministic and covers every field', () => {
    expect(traceHash(run())).toBe(traceHash(run()));
    for (const k of ['i', 't', 'kind', 'row', 'coins', 'F', 'C', 'H', 'V', 'workers', 'grader', 'coop', 'basket'] as const) {
      const r = run(); (r[1] as any)[k] = typeof r[1][k] === 'string' ? r[1][k] + 'x' : (r[1][k] as number) + 1;
      expect(traceHash(r), k).not.toBe(traceHash(run()));
    }
    expect(eventKey(ev(1, 'f', 1))).not.toBe(eventKey(ev(1, 'f', 1, { coins: 101 })));
  });
  it('order matters', () => { const r = run(); [r[0], r[1]] = [r[1], r[0]]; expect(traceHash(r)).not.toBe(traceHash(run())); });
  it('cuts at the first F31 tick (exclusive), so events after it never count', () => {
    expect(firstTickAt(run(), 31)).toBe(50);
    expect(prefix(run(), 50).map(e => e.i)).toEqual([10, 20, 30, 40]);
    const main = run().slice(0, 4).concat([ev(55, 'eggValue', 30)]); // main CSV: no F31, plays on differently after
    const r = compareSeed(7, run(), main);
    expect(r).toMatchObject({ seed: 7, until: 50, events: 4, match: true });
    expect(r.firstDiff).toBeUndefined();
  });
  it('reports the first differing event (index, tick, both keys)', () => {
    const main = run(); main[2] = ev(31, 'f', 30);
    const r = compareSeed(3, run(), main);
    expect(r.match).toBe(false);
    expect(r.firstDiff).toEqual({ index: 2, tick: 30, cand: eventKey(run()[2]), main: eventKey(main[2]) });
  });
  it('a missing/extra event is a diff (null on the short side)', () => {
    const r = compareSeed(1, run(), run().slice(0, 3));
    expect(r.match).toBe(false);
    expect(r.firstDiff).toMatchObject({ index: 3, tick: 40, main: null });
  });
  it('never reaching F31 compares the whole run (until -1)', () => {
    const c = run().slice(0, 4), r = compareSeed(2, c, c);
    expect(r).toMatchObject({ until: -1, events: 4, match: true });
  });
  it('summarize: PASS only if every seed matches; FAIL names the first failing seed', () => {
    const ok = compareSeed(1, run(), run()), m = run(); m[0] = ev(11, 'f', 1);
    expect(summarize([ok, ok])).toEqual({ verdict: 'PASS', seeds: 2, mismatches: 0 });
    const s = summarize([ok, compareSeed(5, run(), m), compareSeed(6, run(), m)]);
    expect(s).toMatchObject({ verdict: 'FAIL', seeds: 3, mismatches: 2, firstFail: { seed: 5, firstDiff: { index: 0, tick: 10 } } });
  });
  it('snap records the row paid (level before the buy) and the state', () => {
    const s = { ...initialState(balance, 1), farmLevel: 5, collectionLevel: 23, coinsCents: 42, workers: { hawker: {} as any, coop_hand: {} as any } };
    expect(snap(9, 0.9, 'c', s as any)).toMatchObject({ row: 22, F: 5, C: 23, coins: 42, workers: 'coop_hand+hawker' });
    expect(snap(9, 0.9, 'f', s as any).row).toBe(4);
  });
});
describe('l30plus-trace first-buy report', () => {
  it('earliest Farm level across seeds and the count before F31', () => {
    const a = [ev(1, 'c', 28, { row: 22 })], b = [ev(1, 'c', 26, { row: 22 }), ev(2, 'c', 33, { row: 23 })], c: TraceEvent[] = [];
    expect(firstBuys([a, b, c], [22, 23, 24], 31)).toEqual([
      { row: 22, earliestFarm: 26, earliestSeedIdx: 1, seedsBuyingBeforeF31: 2, seeds: 3 },
      { row: 23, earliestFarm: 33, earliestSeedIdx: 1, seedsBuyingBeforeF31: 0, seeds: 3 },
      { row: 24, earliestFarm: null, earliestSeedIdx: -1, seedsBuyingBeforeF31: 0, seeds: 3 },
    ]);
  });
  it('uses each seed\'s FIRST buy of the row only', () => {
    expect(firstBuys([[ev(1, 'c', 32, { row: 22 }), ev(2, 'c', 20, { row: 22 })]], [22])[0]).toMatchObject({ earliestFarm: 32, seedsBuyingBeforeF31: 0 });
  });
});
describe('D-CEO-15 per-row verdicts', () => {
  const fb = (row: number, before: number) => ({ row, earliestFarm: 33, earliestSeedIdx: 0, seedsBuyingBeforeF31: before, seeds: 3 });
  it('PASS needs play-equivalence PASS and zero seeds buying before F31', () => {
    const v = dceo15Verdicts('PASS', [fb(22, 0), fb(23, 1)]);
    expect(v.map(r => [r.row, r.buysToLevel, r.verdict])).toEqual([[22, 23, 'PASS'], [23, 24, 'FROZEN']]);
  });
  it('play-equivalence FAIL freezes every row', () => {
    expect(dceo15Verdicts('FAIL', [fb(22, 0), fb(27, 0)]).every(r => r.verdict === 'FROZEN' && /play-equivalence FAIL/.test(r.reason))).toBe(true);
  });
  it('row 28 is never eligible (info only, always FROZEN)', () => {
    expect(dceo15Verdicts('PASS', [fb(28, 0)])[0]).toMatchObject({ row: 28, buysToLevel: 29, eligible: false, verdict: 'FROZEN' });
  });
});
describe('row convention matches the game (row C = collectionCost(C) = price of C -> C+1)', () => {
  it('buyCollection at C charges collection.costTable[C] and the trace row is C', async () => {
    const { apply } = await import('../src/sim/actions');
    const t = Array.from({ length: balance.maxLevel + 1 }, (_, i) => 1000 + i);
    const b = { ...balance, collection: { ...balance.collection, costTable: t } } as any;
    const s0 = { ...initialState(b, 1), collectionLevel: 22, farmLevel: 25, coinsCents: 10_000_000 };
    const s1 = apply(s0, { type: 'buyCollection' }, b);
    expect(s0.coinsCents - s1.coinsCents).toBe(t[22] * 100);
    expect(snap(1, 0.1, 'c', s1).row).toBe(22);
  });
});
import { isL30PlusBuy, firstL30PlusBuy, compareSeedB, summarizeB, distribution, longestGap, farmAt } from '../scripts/l30plus-trace';
describe('option (b): equivalence up to the first L30+ purchase', () => {
  const base = (): TraceEvent[] => [ev(10, 'f', 28, { row: 27 }), ev(20, 'c', 28, { row: 21, C: 22 }), ev(30, 'hens', 28, { row: 29, H: 30 })];
  it('L30+ purchase = target level (row + 1) > 30 on Farm/Collection/Hens/Egg value; workers never', () => {
    expect(isL30PlusBuy(ev(1, 'hens', 28, { row: 30 }))).toBe(true);   // H30 -> H31
    expect(isL30PlusBuy(ev(1, 'hens', 28, { row: 29 }))).toBe(false);  // H29 -> H30
    expect(isL30PlusBuy(ev(1, 'f', 31, { row: 30 }))).toBe(true);
    expect(isL30PlusBuy(ev(1, 'c', 33, { row: 30 }))).toBe(true);
    expect(isL30PlusBuy(ev(1, 'eggValue', 28, { row: 31 }))).toBe(true);
    expect(isL30PlusBuy(ev(1, 'W2', 40, { row: 99 }))).toBe(false);
    expect(firstL30PlusBuy([...base(), ev(40, 'hens', 28, { row: 30 })])).toEqual({ index: 3, tick: 40, t: 4, track: 'Hens', level: 31 });
    expect(firstL30PlusBuy(base())).toBeNull();
  });
  it('identical through F31 -> PASS (no divergence)', () => {
    const r = compareSeedB(1, base(), base());
    expect(r).toMatchObject({ match: true, pass: true, divergence: null });
  });
  it('diverging AT an L30+ purchase -> PASS, logs tick, farm level and both events', () => {
    const c = [...base(), ev(40, 'hens', 28, { row: 30, H: 31 })], m = [...base(), ev(45, 'c', 28, { row: 22 })];
    const r = compareSeedB(2, c, m);
    expect(r.pass).toBe(true); expect(r.match).toBe(false);
    expect(r.divergence).toEqual({ index: 3, tick: 40, farm: 28, cand: eventKey(c[3]), main: eventKey(m[3]), causeIsL30PlusBuy: true });
  });
  it('diverging at anything else -> FAIL (Collection buy <= 30, hire, coin/timing shift, missing event)', () => {
    const c1 = [...base(), ev(40, 'c', 28, { row: 22 })], m1 = [...base(), ev(40, 'hens', 28, { row: 30 })];
    expect(compareSeedB(3, c1, m1).pass).toBe(false);
    const c2 = base(); c2[1] = { ...c2[1], coins: 1 }; expect(compareSeedB(3, c2, base())).toMatchObject({ pass: false, divergence: { index: 1, causeIsL30PlusBuy: false } });
    expect(compareSeedB(3, [...base(), ev(40, 'hire:hawker', 28)], base()).pass).toBe(false);
    expect(compareSeedB(3, base().slice(0, 2), base()).pass).toBe(false); // candidate missing an event
  });
  it('an L30+ buy AFTER a baseline event at that position is not the cause -> FAIL', () => {
    const c = [...base(), ev(50, 'hens', 28, { row: 30 })], m = [...base(), ev(41, 'c', 28, { row: 22 })];
    expect(compareSeedB(4, c, m)).toMatchObject({ pass: false, divergence: { tick: 41, causeIsL30PlusBuy: false } });
  });
  it('events from the first F31 tick on are not compared', () => {
    const c = [...base(), ev(60, 'f', 31, { row: 30 }), ev(61, 'c', 31, { row: 1 })];
    expect(compareSeedB(5, c, base())).toMatchObject({ until: 60, match: true, pass: true });
  });
  it('summarizeB / distribution / farmAt / longestGap', () => {
    const ok = compareSeedB(1, base(), base()), bad = compareSeedB(7, base().slice(0, 1), base());
    expect(summarizeB([ok, bad])).toMatchObject({ verdict: 'FAIL', seeds: 2, failing: 1, identical: 1, firstFail: { seed: 7 } });
    expect(summarizeB([ok])).toMatchObject({ verdict: 'PASS', failing: 0 });
    expect(distribution([30, 28, 28, 29])).toEqual({ n: 4, min: 28, p50: 28, max: 30, hist: { 28: 2, 29: 1, 30: 1 } });
    expect(farmAt(ev(1, 'f', 29, { row: 28 }))).toBe(28); expect(farmAt(ev(1, 'c', 29))).toBe(29);
    expect(longestGap([ev(100, 'c', 1), ev(150, 'c', 1), ev(400, 'c', 1)], 5, 45)).toBe(25); // t = i/10: 10, 15, 40 -> gaps 5,5,25, tail 5
  });
});
