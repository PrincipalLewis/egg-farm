// pacing-x1-stack (v5 manifest row 1): pinned inputs, the data-source switch, table coverage and the verdict rules.
// Fast: no 200-seed runs here (the CI job runs those). Every input is a committed fixture with a sha256 assert (D-HOE-20261030-05).
import { describe, it, expect } from 'vitest';
import { X1_DATA, X1_SOURCES } from './pacing-x1/source';
import { evaluate, verdictOf, nums, inBand, isPauseRow, HANDLED, NOT_WIRED, type Shard, type Gate } from './pacing-x1/compare';
import { X1_PRED, pinned, parsePred, x1Balance, x1Stacks } from './pacing-x1/harness';
import { M5X_STACKS, assertNoDoubleModel } from './bot-m5';

const rows = () => parsePred(pinned(X1_PRED.fixture, X1_PRED.sha256).toString('utf8'));

describe('pacing-x1-stack: pinned inputs and data source', () => {
  it('every fixture of every source matches its sha256 pin and builds a valid L0-30 balance with all src M5 flags off', () => {
    for (const k of Object.keys(X1_SOURCES) as (keyof typeof X1_SOURCES)[]) {
      const { b } = x1Balance(k); expect(b.maxLevel).toBe(30);
      expect(() => assertNoDoubleModel(b, x1Stacks(k).N)).not.toThrow(); // bot models M5; src flags must stay off in the fixture
    }
  });
  it('the switch names a known source; the fallback runs streak and pause off, 8dc90e2b runs the AssZ stack unchanged', () => {
    expect(Object.keys(X1_SOURCES)).toContain(X1_DATA);
    const fb = x1Stacks('rcv5-b48be8a4-nostreak'); expect(fb.N.streakCap).toBe(0); expect(fb.N.pause).toBe(false); expect(fb.H.hold).toBe(true); expect(fb.toggles.streak).toBe('n/a');
    const hop = x1Stacks('v5hop1-8dc90e2b'); expect(hop.N).toEqual(M5X_STACKS.AssZ); expect({ ...hop.H }).toEqual(M5X_STACKS.AssZhold);
    expect(Object.keys(hop.toggles).sort()).toEqual(['abilities', 'broody', 'golden', 'streak', 'tapCoins']);
  });
  it('the §13.2a table parses to 105 rows, 72 blocking, and every row is handled, NOT-WIRED, or a G5-P pause row', () => {
    const r = rows(); expect(r.length).toBe(105); expect(r.filter(x => x.blocks_merge.startsWith('Y')).length).toBe(72);
    for (const x of r) expect(isPauseRow(x) || HANDLED.has(+x.source_line) || +x.source_line in NOT_WIRED, `L${x.source_line} ${x.metric}`).toBe(true);
    expect(r.filter(isPauseRow).length).toBe(24);
  });
});

describe('pacing-x1-stack: verdict rules', () => {
  it('parses predicted cells and applies the ×0.8–1.2 band inclusively', () => {
    expect(nums('+61.3 / +64.8 / +64.9%')).toEqual([61.3, 64.8, 64.9]); expect(nums('2.407 (\u22120.58)')).toEqual([2.407]); expect(nums('84 / 160 / 234')).toEqual([84, 160, 234]);
    expect(inBand(1.2, 1)).toBe(true); expect(inBand(0.8, 1)).toBe(true); expect(inBand(1.2001, 1)).toBe(false); expect(inBand(0.7999, 1)).toBe(false);
  });
  const gate = (o: Partial<Gate> & { p95?: number; worst?: number }): Gate => ({ G4_noAff_F10_to_max: [84, 160, 234], windows: 900, stepL30: [2.407, 2.608], reachedMax: 200,
    win: { P95_allWindows: o.p95 ?? 1.755, P95_ofSeedMax: 1.791, worstSeed: o.worst ?? 1.917, median: 1.656 }, byBand: { 'F10-17': [1.6, 1.75, 1.8], 'F18-23': [1.6, 1.77, 1.8], 'F24-29': [1.6, 1.74, 1.8] },
    premium: { 'F10-19': [61.3, 70], 'F20-29': [64.8, 70], 'F30+': [64.9, 70] }, ...o });
  const shard = (N: Gate): Shard => ({ profile: 'optimal', source: 'v5hop1-8dc90e2b', seeds: [1, 200], T: 4000, csvSha256: '', balanceSha256: '', l10P95Min: 11.05, l30MedianMin: 34.4,
    gate: { none: gate({ stepL30: [2.989, 3.453], G4_noAff_F10_to_max: [129, 260, 381], win: undefined }), N, H: gate({ G4_noAff_F10_to_max: [84, 166, 272], stepL30: [2.435, 2.634] }) },
    toggles: { golden: gate({ p95: 1.6 }), streak: 'n/a' } });
  const opt = () => rows().filter(r => r.profile === 'optimal');
  it('the predicted optimal values pass every handled optimal row; pause rows are EXCLUDED, never PASS', () => {
    const o = evaluate(opt(), { optimal: shard(gate({})) });
    expect(o.filter(x => x.status === 'FAIL')).toEqual([]);
    expect(o.filter(x => x.line >= 906).every(x => x.status === 'EXCLUDED')).toBe(true);
    expect(o.filter(x => NOT_WIRED[x.line] != null).every(x => x.status === 'NOT-WIRED')).toBe(true);
  });
  it('a blocking row outside the band FAILS even when its absolute gate holds; above the absolute gate FAILS too', () => {
    const low = evaluate(opt(), { optimal: shard(gate({ p95: 1.3 })) }); // 1.3 < 0.8 x 1.755, still <= 2.00
    expect(low.find(x => x.line === 879)!.status).toBe('FAIL'); expect(verdictOf(low)).toBe('FAIL');
    const high = evaluate(opt(), { optimal: shard(gate({ worst: 2.3 })) }); // in band of 1.917 (<= 2.300) but > 2.25
    expect(high.find(x => x.line === 883)!.status).toBe('FAIL');
  });
  it('a non-blocking row outside the band only WARNS; a missing profile shard fails its blocking rows', () => {
    const o = evaluate(opt(), { optimal: shard(gate({ premium: { 'F10-19': [10, 0], 'F20-29': [10, 0], 'F30+': [10, 0] } })) });
    expect(o.find(x => x.line === 888)!.status).toBe('WARN'); expect(verdictOf(o)).toBe('PASS');
    expect(verdictOf(evaluate(opt(), {}))).toBe('FAIL');
  });
});
