// Breeds UI PR-B — family-clamp getters aligned with Saves #126 commit 0 (d4b5fdc, saves/breeds-sim-prB-traits; NOT merged).
// Names, signatures, bc() key names and return shape mirror src/sim/breeds-family.ts + BC_SPEC_DEFAULTS at d4b5fdc; values are
// the spec stand-ins (TODO(Saves #126)) until Saves is in the stack. TDD: written before the adapter change.
import { describe, it, expect } from 'vitest';
import * as ad from '../src/ui/breeds-adapter';
import { familyActiveBp, familyCapBp, familyRawBp, clampFamilyBp, capBc, PRB_CAP_STANDINS, familyClampState, type FamilyClampState, type BreedsCapKey } from '../src/ui/breeds-adapter';
import { presentChipModel, presentClampView } from '../src/ui/breeds-hud';
import { flagOnBalance, flagOffBalance, stateWith, breeds, leghorn312 } from './fixtures/breeds-prB/setup';

const b = flagOnBalance();
const KEYS: BreedsCapKey[] = ['lay_cap_bp_lt18', 'lay_cap_bp', 'lay_cap_farm', 'away_cap_bp', 'broody_cap_bp'];
const legCem = breeds({ owned: { cream_legbar: { stars: 2 }, ayam_cemani: { stars: 2 } }, slots: ['cream_legbar', 'ayam_cemani', null] }); // 600 + 525

describe('bc() cap keys: exact Saves #126 names (lay_cap_farm replaces the Farm-18 stand-in)', () => {
  it('capBc reads exactly the five Saves keys; spec values 700 / 1500 / 18 / 3000 / 2000', () => {
    expect(Object.keys(PRB_CAP_STANDINS).sort()).toEqual([...KEYS].sort());
    expect(KEYS.map(k => capBc(b, k))).toEqual([700, 1500, 18, 3000, 2000]);
  });
  it('no lay-cap stand-ins left under the old PR-B tunables object or the old Present-only getters', () => {
    expect((ad as Record<string, unknown>).PRB_STUB_TUNABLES).toBeUndefined(); // moved to tests/fixtures (Architect nit)
    expect((ad as Record<string, unknown>).presentCapBp).toBeUndefined();
    expect((ad as Record<string, unknown>).presentActiveBp).toBeUndefined();
  });
});

describe('familyCapBp(family, farmLevel, b) — E9 boundary at lay_cap_farm', () => {
  it('present 700 below F18, 1500 from F18; away 3000; broody 2000 (Saves test values)', () => {
    expect(familyCapBp('present', 17, b)).toBe(700); expect(familyCapBp('present', 18, b)).toBe(1500);
    expect(familyCapBp('present', capBc(b, 'lay_cap_farm') - 1, b)).toBe(capBc(b, 'lay_cap_bp_lt18'));
    expect(familyCapBp('away', 10, b)).toBe(3000); expect(familyCapBp('broody', 30, b)).toBe(2000);
  });
  it('clampFamilyBp(raw, family, F, b) = min(raw, cap)', () => {
    expect(clampFamilyBp(1125, 'present', 17, b)).toBe(700); expect(clampFamilyBp(1125, 'present', 18, b)).toBe(1125); expect(clampFamilyBp(5000, 'away', 1, b)).toBe(3000);
  });
});

describe('presentClampView(s, b): PR-A FamilyClampState {rawBp, clampedBp, atCap} (Saves familyClamp shape)', () => {
  it('PR-B adds no second clamp-view name: familyClampOf / FamilyClamp are gone; PR-A familyClampState is the one view', () => {
    expect((ad as Record<string, unknown>).familyClampOf).toBeUndefined();
    expect(typeof familyClampState).toBe('function');
  });
  it('shape is exactly {rawBp, clampedBp, atCap}', () => {
    const v: FamilyClampState = presentClampView(stateWith(b, 10, leghorn312()), b)!;
    expect(Object.keys(v).sort()).toEqual(['atCap', 'clampedBp', 'rawBp']);
    expect(v).toEqual({ rawBp: 312, clampedBp: 312, atCap: false });
  });
  it('uses PR-A familyClampState when it returns a view (clamp-bind); stand-in only while it is the undefined stub', () => {
    const s = stateWith(b, 17, legCem);
    const bound = familyClampState('present', (s as any).breeds, b, s.farmLevel);
    if (bound) expect(presentClampView(s, b)).toEqual(bound); else expect(presentClampView(s, b)).toEqual({ rawBp: 1125, clampedBp: 700, atCap: true });
  });
  it('raw over the cap: clamped to the cap, atCap true; F18 lifts the cap', () => {
    expect(presentClampView(stateWith(b, 17, legCem), b)).toEqual({ rawBp: 1125, clampedBp: 700, atCap: true });
    expect(presentClampView(stateWith(b, 18, legCem), b)).toEqual({ rawBp: 1125, clampedBp: 1125, atCap: false });
  });
  it('raw == cap counts as atCap (Saves: raw ≥ cap && cap > 0)', () => {
    const s = stateWith(b, 17, legCem), raw = familyRawBp(s, b, 'present');
    expect(raw).toBe(1125); expect(presentClampView(s, b)!.atCap).toBe(raw >= familyCapBp('present', 17, b));
  });
  it('other families are independent; flag off → undefined (no chip)', () => {
    expect(familyActiveBp(stateWith(b, 17, legCem), b, 'away')).toBe(0);
    expect(presentClampView(stateWith(flagOffBalance(), 17, legCem), flagOffBalance())).toBeUndefined();
  });
  it('familyActiveBp(s, b, family) === clampFamilyBp(familyRawBp(...)) and matches the Present view (one clamp path)', () => {
    for (const F of [10, 17, 18, 30]) for (const fam of ['present', 'away', 'broody'] as const) {
      const s = stateWith(b, F, legCem); expect(familyActiveBp(s, b, fam)).toBe(clampFamilyBp(familyRawBp(s, b, fam), fam, F, b));
      if (fam === 'present') expect(familyActiveBp(s, b, fam)).toBe(presentClampView(s, b)!.clampedBp);
    }
  });
});

describe('chip reads clampedBp / atCap from the FamilyClampState view', () => {
  it('presentChipModel(view, gateOpen) uses clampedBp and carries atCap; undefined / 0 → no chip', () => {
    const v = presentClampView(stateWith(b, 17, legCem), b), m = presentChipModel(v, true)!;
    expect(m.bp).toBe(700); expect(m.atCap).toBe(true); expect(m.label).toBe('+7%');
    expect(presentChipModel({ rawBp: 0, clampedBp: 0, atCap: false }, true)).toBeNull();
    expect(presentChipModel(undefined, true)).toBeNull();
  });
});
