// Unit tests for the L30+ harness play-equivalence hash/compare and first-buy logic (scripts/l30plus-trace.ts).
import { describe, it, expect } from 'vitest';
import { eventKey, traceHash, compareSeed, summarize, firstBuys, firstTickAt, prefix, snap, type TraceEvent } from '../scripts/l30plus-trace';
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
