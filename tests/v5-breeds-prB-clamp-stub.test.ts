// Breeds UI PR-B: Architect ruling (2026-11-10 ~03:20 CET) keeps the TODO(Saves #126) fallback in presentClampView(), reached ONLY when
// PR-A's familyClampState returns undefined (the stub). This pins that the stub path renders the stand-in chip. The fallback is removed
// when clamp-bind (29edfc8) lands after Saves #126 commit 1.
import { describe, it, expect, vi } from 'vitest';
vi.mock('../src/ui/breeds-adapter', async orig => ({ ...(await orig<typeof import('../src/ui/breeds-adapter')>()), familyClampState: vi.fn(() => undefined) }));
import { familyClampState, familyRawBp, familyCapBp, clampFamilyBp } from '../src/ui/breeds-adapter';
import { presentChipModel, presentClampView } from '../src/ui/breeds-hud';
import { flagOnBalance, stateWith, breeds } from './fixtures/breeds-prB/setup';

describe('presentClampView stub path (familyClampState → undefined)', () => {
  it('renders the TODO(Saves #126) stand-in: raw/clamped/atCap from familyRawBp/familyCapBp/clampFamilyBp, chip "+7%" at cap', () => {
    const b = flagOnBalance(), s = stateWith(b, 17, breeds({ owned: { cream_legbar: { stars: 2 }, ayam_cemani: { stars: 2 } }, slots: ['cream_legbar', 'ayam_cemani', null] }));
    const v = presentClampView(s, b);
    expect(familyClampState).toHaveBeenCalledWith('present', (s as any).breeds, b, s.farmLevel);
    expect(familyClampState).toHaveReturnedWith(undefined);
    const raw = familyRawBp(s, b, 'present');
    expect(v).toEqual({ rawBp: raw, clampedBp: clampFamilyBp(raw, 'present', s.farmLevel, b), atCap: raw >= familyCapBp('present', s.farmLevel, b) });
    expect(v).toEqual({ rawBp: 1125, clampedBp: 700, atCap: true });
    const m = presentChipModel(v, true)!; expect(m.label).toBe('+7%'); expect(m.atCap).toBe(true); expect(m.state).toBe('active');
  });
});
