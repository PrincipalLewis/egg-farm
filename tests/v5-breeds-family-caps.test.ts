/**
 * M5.1 breeds PR-B commit 0: family clamps + familyClamp / familyActiveBp (E8/E9, BR-AC18, §4.3 L365–368).
 * Spec rev 3.8.9 ea922eb8. API names match PR-B UI stubs (HoE 01:04 CET).
 */
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { bc } from '../src/config/breeds';
import { initialState, type GameState } from '../src/sim/state';
import { type BreedsSave } from '../src/sim/breeds';
import {
  familyClamp, familyActiveBp, familyCapBp, familyRawBp, clampFamilyBp,
} from '../src/sim/breeds-family';

const BR = { ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, breeds: 1 } } } as typeof b;
const fresh = (o: Partial<BreedsSave> = {}): BreedsSave => ({
  owned: {}, slots: [null, null, null], incubator: null, settleMs: [0, 0, 0],
  hatches: 0, pity: 0, rng: 0x9e3779b9, freeHatchUsed: 0, flockCompleteLogged: 0, ...o,
});
const st = (o: Partial<BreedsSave> = {}, F = 12): GameState => ({
  ...initialState(b, 7), farmLevel: F, tracksV7: 1 as const, v6BackupId: '0123456789abcdef', breeds: fresh(o),
});

describe('BC_SPEC_DEFAULTS family clamps (§4.3 L365–368)', () => {
  it('matches spec of record via bc() keys (no bc_ prefix)', () => {
    expect(bc(BR, 'lay_cap_bp_lt18')).toBe(700);
    expect(bc(BR, 'lay_cap_bp')).toBe(1500);
    expect(bc(BR, 'away_cap_bp')).toBe(3000);
    expect(bc(BR, 'broody_cap_bp')).toBe(2000);
    expect(bc(BR, 'lay_cap_farm')).toBe(18); // E9 Farm-18 boundary (PR-B stub name)
  });
});

describe('[E9] Present clamp lt18 vs ≥18', () => {
  it('familyCapBp present: 700 below F18, 1500 from F18', () => {
    expect(familyCapBp('present', 17, BR)).toBe(700);
    expect(familyCapBp('present', 18, BR)).toBe(1500);
    expect(familyCapBp('away', 10, BR)).toBe(3000);
    expect(familyCapBp('broody', 30, BR)).toBe(2000);
  });
});

describe('[E8] / [BR-AC18] at cap vs below cap', () => {
  it('[BR-AC18][E8] 3 Present at 2★ (1575) at F24 → raw 1575, clamped 1500, atCap', () => {
    const s = st({
      owned: { cream_legbar: { stars: 2 }, ayam_cemani: { stars: 2 }, rhode_island_red: { stars: 2 } },
      slots: ['cream_legbar', 'ayam_cemani', 'rhode_island_red'], settleMs: [0, 0, 0],
    }, 24);
    expect(familyRawBp(s, BR, 'present')).toBe(1575);
    const v = familyClamp(s, BR, 'present');
    expect(v).toEqual({ rawBp: 1575, clampedBp: 1500, atCap: true });
    expect(familyActiveBp(s, BR, 'present')).toBe(1500);
    expect(v.clampedBp).toBe(clampFamilyBp(v.rawBp, 'present', 24, BR));
  });

  it('[BR-AC18] below cap: Leghorn 2★ alone (375) at F12 → not atCap', () => {
    const s = st({ owned: { leghorn: { stars: 2 } }, slots: ['leghorn', null, null], settleMs: [0, 0, 0] }, 12);
    const v = familyClamp(s, BR, 'present');
    expect(v.rawBp).toBe(375);
    expect(v.clampedBp).toBe(375);
    expect(v.atCap).toBe(false);
  });

  it('[BR-AC18][E9] 975 bp at F17 clamps to 700; at F18 stays 975', () => {
    const base = {
      owned: { ayam_cemani: { stars: 2 }, rhode_island_red: { stars: 2 } },
      slots: ['ayam_cemani', 'rhode_island_red', null] as (string | null)[], settleMs: [0, 0, 0] as [number, number, number],
    };
    expect(familyClamp(st(base, 17), BR, 'present')).toEqual({ rawBp: 975, clampedBp: 700, atCap: true });
    expect(familyClamp(st(base, 18), BR, 'present')).toEqual({ rawBp: 975, clampedBp: 975, atCap: false });
  });

  it('[E8] Away over 3000 clamps; Broody over 2000 clamps', () => {
    const away = st({
      owned: { sussex: { stars: 0 }, brahma: { stars: 0 } },
      slots: ['sussex', 'brahma', null], settleMs: [0, 0, 0],
    }, 14);
    expect(familyClamp(away, BR, 'away')).toEqual({ rawBp: 3500, clampedBp: 3000, atCap: true });
    const broody = st({
      owned: { cochin: { stars: 0 }, orpington: { stars: 0 } },
      slots: ['cochin', 'orpington', null], settleMs: [0, 0, 0],
    }, 20);
    expect(familyClamp(broody, BR, 'broody')).toEqual({ rawBp: 2500, clampedBp: 2000, atCap: true });
  });
});

describe('familyActiveBp shares clamp with familyClamp', () => {
  it('familyActiveBp === familyClamp.clampedBp === clampFamilyBp(raw)', () => {
    const s = st({
      owned: { cream_legbar: { stars: 2 }, ayam_cemani: { stars: 2 }, rhode_island_red: { stars: 2 } },
      slots: ['cream_legbar', 'ayam_cemani', 'rhode_island_red'], settleMs: [0, 0, 0],
    }, 24);
    const v = familyClamp(s, BR, 'present');
    expect(familyActiveBp(s, BR, 'present')).toBe(v.clampedBp);
    expect(clampFamilyBp(v.rawBp, 'present', s.farmLevel, BR)).toBe(v.clampedBp);
  });
});
