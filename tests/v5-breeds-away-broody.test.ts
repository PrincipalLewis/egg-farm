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

  it('[E8] Away raw 3500 clamps to 3000 before the offline rate term', () => {
    const over = st({
      owned: { sussex: { stars: 0 }, brahma: { stars: 0 } },
      slots: ['sussex', 'brahma', null], settleMs: [0, 0, 0],
    }, 14, 12);
    expect(awayBp(over, BR)).toBe(3000);
    expect(familyActiveBp(over, BR, 'away')).toBe(3000);
    const mult = offlineMult(over, BR);
    const uncapped = m4OfflineEggs(3600, 12, BR, mult, 3500);
    const capped = m4OfflineEggs(3600, 12, BR, mult, 3000);
    expect(applyOffline(over, 3600_000, BR).eggs).toBe(capped);
    expect(capped).toBeLessThan(uncapped);
  });

describe('F4 BR-R13 float order', () => {
  it('[F4][BR-R13] m4OfflineEggs matches floor(min(min(a,cap)×rate×(1e4+bp)/1e4, max)×mult) over H×bp×a×mult', () => {
    const o = BR.offline, tbl = BR.m4!.offline!; let n = 0, bad = 0; const ex: unknown[] = [];
    for (let H = 0; H < tbl.eggsPerSec.length; H++) for (const mult of [1, 1.1, 1.25, 1.5, 2]) for (let bp = 0; bp <= 3000; bp += 25)
      for (let a = 60; a <= 7300; a += 7) {
        const spec = Math.floor(Math.min(Math.min(a, o.offlineCapSeconds) * tbl.eggsPerSec[H] * (10000 + bp) / 10000, tbl.maxEggs2h[H]) * mult);
        const got = m4OfflineEggs(a, H, BR, mult, bp); n++;
        if (got !== spec) { bad++; if (ex.length < 5) ex.push({ H, mult, bp, a, spec, got }); }
      }
    expect(bad, `mismatches ${bad}/${n} e.g. ${JSON.stringify(ex)}`).toBe(0);
  });
});
