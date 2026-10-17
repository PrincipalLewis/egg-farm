import { describe, it, expect } from 'vitest';
import { toastTop } from '../src/ui/toast-place';
describe('rc2 item 1: toastTop never overlaps the New helper! banner (pure)', () => {
  it('docked, no banner -> default slide (null)', () => { expect(toastTop(140, 0, true)).toBeNull(); });
  it('docked, banner bottom 120 -> 128', () => { expect(toastTop(140, 120, true)).toBe(128); });
  it('not docked, strip 90, no banner -> 98', () => { expect(toastTop(90, 0, false)).toBe(98); });
  it('not docked, banner lower than the strip -> below the banner', () => { expect(toastTop(90, 140, false)).toBe(148); });
  it('not docked, strip lower than the banner -> below the strip', () => { expect(toastTop(150, 120, false)).toBe(158); });
  it('nothing measured -> null; fractional edges round', () => { expect(toastTop(0, 0, false)).toBeNull(); expect(toastTop(90.4, 0, false)).toBe(98); });
});
