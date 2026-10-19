// UI M1 (D-CEO-20261019-05, HoQA big-number gate): T tier present (PR #22 f035594/7ed1ef2 already in lineage), 999.95 rolls
// over at every tier switch (never '1000X'), NaN/Infinity -> '—'. L30+ max reachable single price: collection_cost L55
// $1,684,996,666,696 (~$1.68T, CSV 625452d4); offline 2h cap <= 100,800 eggs x $3.75. All within the T tier.
import { describe, it, expect } from 'vitest';
import { fmtCount, fmtMoneyShort, fmtMoney } from '../src/ui/format';
describe('big numbers', () => {
  it('fmtCount B/T edges', () => {
    expect(fmtCount(999.94e9)).toBe('999.9B'); expect(fmtCount(999.95e9)).toBe('1T'); expect(fmtCount(1.68e12)).toBe('1.68T');
    expect(fmtCount(1_684_996_666_696)).toBe('1.68T');
  });
  it('fmtMoneyShort B/T edges (cents)', () => {
    expect(fmtMoneyShort(999.94e11)).toBe('$999.9B'); expect(fmtMoneyShort(999.95e11)).toBe('$1T');
    expect(fmtMoneyShort(1_684_996_666_696 * 100)).toBe('$1.7T');
  });
  for (const [base, from, to] of [[1e3, 'K', 'M'], [1e6, 'M', 'B'], [1e9, 'B', 'T']] as const) it(`999.95${from} -> 1${to}, never 1000${from}`, () => {
    expect(fmtCount(999.95 * base)).toBe(`1${to}`); expect(fmtCount(999.94 * base)).not.toMatch(/^1000/);
    expect(fmtMoneyShort(999.95 * base * 100)).toBe(`$1${to}`); expect(fmtMoney(999.95 * base * 100)).toBe(`$1${to}`);
    for (const s of [fmtCount(999.95 * base), fmtMoneyShort(999.95 * base * 100)]) expect(s).not.toMatch(/1000|NaN/);
  });
  it('NaN / Infinity', () => { for (const f of [fmtCount, fmtMoneyShort, fmtMoney]) for (const x of [NaN, Infinity, -Infinity]) expect(f(x)).toBe('—'); });
});
