import { describe, it, expect } from 'vitest';
import { fmtGoalEta, fmtTimeToAfford } from '../src/ui/format';

describe('review 5d8a058 #2: hour-boundary rounding carries minutes into hours', () => {
  it('fmtGoalEta never prints 60m', () => {
    for (let h = 1; h <= 3; h++) for (let s = h * 3600 + 3570; s < h * 3600 + 3600; s++) { expect(fmtGoalEta(s)).toBe(`~${h + 1}h`); }
    expect(fmtGoalEta(7170)).toBe('~2h'); expect(fmtGoalEta(3600 + 29 * 60)).toBe('~1h 29m');
  });
  it('fmtTimeToAfford never prints 60 min', () => {
    expect(fmtTimeToAfford(3599)).toBe('~1 h'); expect(fmtTimeToAfford(7170)).toBe('~2 h');
    for (let s = 3570; s < 3600; s++) expect(fmtTimeToAfford(s + 3600)).not.toMatch(/60 min/);
  });
});
