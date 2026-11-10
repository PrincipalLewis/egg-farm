/**
 * M5.1 breeds PR-B commit 2: Away (BR-R13) + Broody bp_eff (BR-R14).
 * Spec rev 3.8.9 ea922eb8. Focused lane tests (D-CEO-20261110-04).
 */
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { m4OfflineEggs, applyOffline } from '../src/sim/offline';
import { type BreedsSave } from '../src/sim/breeds';
import { awayBp, broodyBreedBp, broodyBaseBp, broodyBpEff } from '../src/sim/breeds-traits';
import { familyActiveBp } from '../src/sim/breeds-family';
import { BP_ONE, bc } from '../src/config/breeds';
import { offlineMult } from '../src/sim/tracks';

const BR = { ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, breeds: 1 } } } as typeof b;
const fresh = (o: Partial<BreedsSave> = {}): BreedsSave => ({
  owned: {}, slots: [null, null, null], incubator: null, settleMs: [0, 0, 0],
  hatches: 0, pity: 0, rng: 0x9e3779b9, freeHatchUsed: 0, flockCompleteLogged: 0, ...o,
});
const st = (o: Partial<BreedsSave> = {}, F = 12, H = 12): GameState => ({
  ...initialState(b, 7), farmLevel: F, hensLevel: H, tracksV7: 1 as const, v6BackupId: '0123456789abcdef', breeds: fresh(o),
});

describe('BR-R13 Away', () => {
  it('awayBp sums settled Away breeds; 0 while settling or flag-off', () => {
    const s = st({ owned: { sussex: { stars: 0 } }, slots: ['sussex', null, null], settleMs: [0, 0, 0] }, 12);
    expect(awayBp(s, BR)).toBe(1500);
    const settling = st({ owned: { sussex: { stars: 0 } }, slots: ['sussex', null, null], settleMs: [1000, 0, 0] }, 12);
    expect(awayBp(settling, BR)).toBe(0);
    expect(awayBp(s, b)).toBe(0);
  });

  it('m4OfflineEggs applies (10000+awayBp)/10000 before the 2h cap', () => {
    const H = 12;
    const none = m4OfflineEggs(3600, H, BR, 1, 0);
    const withAway = m4OfflineEggs(3600, H, BR, 1, 1500);
    expect(withAway).toBeGreaterThan(none);
    // Formula check: rate term only (under cap)
    const o = BR.offline, t = BR.m4!.offline!;
    const L = Math.min(H, t.eggsPerSec.length - 1);
    const rate = t.eggsPerSec[L];
    const raw0 = Math.min(3600, o.offlineCapSeconds) * rate;
    const rawA = Math.min(3600, o.offlineCapSeconds) * rate * (BP_ONE + 1500) / BP_ONE;
    if (raw0 <= t.maxEggs2h[L] && rawA <= t.maxEggs2h[L]) {
      expect(none).toBe(Math.floor(raw0));
      expect(withAway).toBe(Math.floor(rawA));
    }
  });

  it('applyOffline with Sussex slotted grants more eggs than without', () => {
    const base = st({}, 12, 12);
    const away = st({ owned: { sussex: { stars: 0 } }, slots: ['sussex', null, null], settleMs: [0, 0, 0] }, 12, 12);
    const g0 = applyOffline(base, 3600_000, BR).eggs;
    const g1 = applyOffline(away, 3600_000, BR).eggs;
    expect(g1).toBeGreaterThan(g0);
  });
});

describe('BR-R14 Broody bp_eff', () => {
  it('broodyBaseBp = round(tc_broody_income_share × 10000) (= 500)', () => {
    expect(broodyBaseBp(BR)).toBe(500);
  });

  it('Orpington 0★ (1000 bp) → broodyBp_eff = floor(500 × 11000/10000) = 550', () => {
    const s = st({ owned: { orpington: { stars: 0 } }, slots: ['orpington', null, null], settleMs: [0, 0, 0] }, 12);
    expect(broodyBreedBp(s, BR)).toBe(1000);
    expect(broodyBpEff(s, BR)).toBe(550);
  });

  it('Cochin family clamp at bc_broody_cap_bp = 2000 → 500 → 600', () => {
    expect(bc(BR, 'broody_cap_bp')).toBe(2000);
    // Cochin 0★ = 1500; Orpington 0★ = 1000 → sum 2500 → clamp 2000 → eff floor(500*12000/10000)=600
    const s = st({
      owned: { cochin: { stars: 0 }, orpington: { stars: 0 } },
      slots: ['cochin', 'orpington', null], settleMs: [0, 0, 0],
    }, 20);
    expect(familyActiveBp(s, BR, 'broody')).toBe(2000);
    expect(broodyBpEff(s, BR)).toBe(600);
  });
});
