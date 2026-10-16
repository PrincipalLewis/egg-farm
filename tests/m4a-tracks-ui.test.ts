import { describe, it, expect } from 'vitest';
import { balance } from '../src/config/balance';
import type { Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { balancedStripText, milestoneToast, trackLockText } from '../src/ui/tracks-ui';
const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
const st = (F: number, H: number, V: number) => ({ ...initialState(on), farmLevel: F, hensLevel: H, eggValueLevel: V });
describe('M4-A track copy (art-ux/m4-tracks-copy.md)', () => {
  it('Balanced strip strings', () => {
    expect(balancedStripText(st(3, 2, 1), on)).toBe('Balanced farm 0/5 · next +10% at all ≥ 5');
    expect(balancedStripText(st(12, 10, 11), on)).toBe('Balanced farm 2/5 · next +20% at all ≥ 15');
    expect(balancedStripText(st(30, 28, 25), on)).toBe('Balanced farm 5/5 · +30%');
    expect(balancedStripText(st(12, 10, 11), on, true)).toBe('Balanced farm 2 of 5. Weakest: Hens, level 10 of 15.');
  });
  it('lock and milestone toasts', () => {
    expect(trackLockText(7)).toBe('Needs Farm L8');
    expect(milestoneToast('hens:10', on)).toBe('Hens L10: laying boost ×1.25');
    expect(milestoneToast('grade:20', on)).toBe('Egg value L20: Jumbo ×1.5');
    expect(milestoneToast('balanced:2', on)).toBe('Balanced farm 2/5: +15% income');
  });
});
