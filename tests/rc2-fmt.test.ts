import { describe, it, expect } from 'vitest';
import { fmtCount, fmtMoney, fmtMoneyShort } from '../src/ui/format';
describe('rc2 FMT-1/FMT-2 money + count formatting', () => {
  it('half-up integer rounding at every tier (no float 9.99M)', () => {
    expect(fmtCount(9_995_000)).toBe('10M'); expect(fmtCount(9_985_000)).toBe('9.99M'); expect(fmtCount(9_995e6)).toBe('10B'); expect(fmtCount(9_995e9)).toBe('10T');
    expect(fmtMoney(9_995_000_00)).toBe('$10M'); expect(fmtMoney(9_990_000_00)).toBe('$9.99M');
  });
  it('a tier that rounds to 1000 rolls up', () => { expect(fmtCount(999_950)).toBe('1M'); expect(fmtCount(999_960_000)).toBe('1B'); expect(fmtCount(99_950)).toBe('100K'); });
  it('T tier, thousands separator above it, — for NaN/Infinity', () => {
    expect(fmtCount(2.5e12)).toBe('2.5T'); expect(fmtCount(1e15)).toBe('1,000T'); expect(fmtMoney(1e17)).toBe('$1,000T'); expect(fmtMoneyShort(1e17)).toBe('$1,000T'); expect(fmtMoneyShort(3.45e14)).toBe('$3.4T');
    for (const f of [fmtCount, fmtMoney, fmtMoneyShort]) { expect(f(NaN)).toBe('—'); expect(f(Infinity)).toBe('—'); expect(f(-Infinity)).toBe('—'); }
  });
  it('unchanged below the edges', () => { expect(fmtCount(9_999)).toBe('9,999'); expect(fmtCount(12_345)).toBe('12.3K'); expect(fmtMoney(1_234_500)).toBe('$12.3K'); expect(fmtMoneyShort(123_456)).toBe('$1.2K'); });
});
