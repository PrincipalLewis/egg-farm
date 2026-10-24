import { describe, it, expect } from 'vitest';
import { fmtCount, fmtMoney, fmtMoneyShort } from '../src/ui/format';
import { orderView } from '../src/ui/orders';
describe('rc2 FMT-1/FMT-2 money + count formatting', () => {
  it('fmtCount half-up at 2 dp (no float 9.99M)', () => {
    expect(fmtCount(9_995_000)).toBe('10M'); expect(fmtCount(9_985_000)).toBe('9.99M');
    expect(fmtCount(9_995e6)).toBe('10B'); expect(fmtCount(9_995e9)).toBe('10T');
  });
  it('fmtCount half-up at 1 dp in every tier (12.35 is 12.3499… as a float)', () => {
    expect(fmtCount(12_350)).toBe('12.4K'); expect(fmtCount(12_350_000)).toBe('12.4M');
    expect(fmtCount(12_350_000_000)).toBe('12.4B'); expect(fmtCount(12_350_000_000_000)).toBe('12.4T');
  });
  it('fmtCount rolls up at every tier edge', () => {
    expect(fmtCount(99_950)).toBe('100K'); expect(fmtCount(999_950)).toBe('1M');
    expect(fmtCount(999_960_000)).toBe('1B'); expect(fmtCount(999_950_000_000)).toBe('1T');
  });
  it('fmtCount just below the edges', () => {
    expect(fmtCount(99_949)).toBe('99.9K'); expect(fmtCount(999_949)).toBe('999.9K'); expect(fmtCount(9_994_999)).toBe('9.99M');
  });
  it('fmtCount exact tier boundaries', () => {
    expect(fmtCount(9_999)).toBe('9,999'); expect(fmtCount(10_000)).toBe('10K'); expect(fmtCount(1_000_000)).toBe('1M');
    expect(fmtCount(1e9)).toBe('1B'); expect(fmtCount(1e12)).toBe('1T');
  });
  it('fmtCount at 1,000T rolls up to Qa (M41-9, number-format-big)', () => {
    expect(fmtCount(2.5e12)).toBe('2.5T'); expect(fmtCount(1e15)).toBe('1Qa'); expect(fmtCount(1.2345e15)).toBe('1.23Qa');
  });
  it('fmtMoney rounding and roll-up', () => {
    expect(fmtMoney(9_995_000_00)).toBe('$10M'); expect(fmtMoney(9_990_000_00)).toBe('$9.99M');
    expect(fmtMoney(99_999_999)).toBe('$1M'); expect(fmtMoney(999_999.6)).toBe('$10K'); expect(fmtMoney(1e17)).toBe('$1Qa');
    expect(fmtMoney(1_234_500)).toBe('$12.3K');
  });
  it('fmtMoneyShort half-up, matching fmtMoney', () => {
    expect(fmtMoneyShort(9_995_000_00)).toBe('$10M'); expect(fmtMoneyShort(125_000)).toBe('$1.3K'); expect(fmtMoneyShort(124_999)).toBe('$1.2K');
    expect(fmtMoneyShort(3.45e14)).toBe('$3.5T'); expect(fmtMoneyShort(123_456)).toBe('$1.2K'); expect(fmtMoneyShort(100_000)).toBe('$1K');
  });
  it('fmtMoneyShort edges and roll-up', () => {
    expect(fmtMoneyShort(99_999)).toBe('$999.99'); expect(fmtMoneyShort(99_999.9)).toBe('$1K');
    expect(fmtMoneyShort(99_995_000)).toBe('$1M'); expect(fmtMoneyShort(99_995_000_000)).toBe('$1B'); expect(fmtMoneyShort(99_995_000_000_000)).toBe('$1T');
    expect(fmtMoneyShort(1e17)).toBe('$1Qa'); expect(fmtMoneyShort(1.2345e17)).toBe('$1.2Qa');
  });
  it('fmtCount: — for NaN/±Infinity', () => { for (const x of [NaN, Infinity, -Infinity]) expect(fmtCount(x)).toBe('—'); });
  it('fmtMoney: — for NaN/±Infinity', () => { for (const x of [NaN, Infinity, -Infinity]) expect(fmtMoney(x)).toBe('—'); });
  it('fmtMoneyShort: — for NaN/±Infinity', () => { for (const x of [NaN, Infinity, -Infinity]) expect(fmtMoneyShort(x)).toBe('—'); });
  it('order card eggs labels at 1Qa (was 1,000T) and in the K band', () => {
    const c = (d: number, f = 0) => ({ id: 1, demand: d, filled: f, waitedS: 0 });
    expect(orderView(c(1e15), 0, 1).line).toMatch(/^0\/1Qa\u00a0eggs · /);
    expect(orderView(c(1e15), 0, 1).button).toBe('Need 1Qa');
    expect(orderView(c(9_999, 1_250), 0, 1).line).toMatch(/^1\.2K\/9\.9K\u00a0eggs/); // Product (#25): line shows delivered (filled) eggs
    expect(orderView(c(12_350), 0, 1).line).toMatch(/^0\/12\.4K\u00a0eggs/);
  });
});
