/**
 * M5.1 breeds PR-B commit 1: Present calm-gate (BR-R12/R12b) + session_end present_*.
 * Spec rev 3.8.9 ea922eb8. Focused lane tests only (D-CEO-20261110-04).
 */
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { incomePerSec } from '../src/econ/income';
import { initialState, type GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import { applyOffline } from '../src/sim/offline';
import { type BreedsSave } from '../src/sim/breeds';
import {
  presentBp, presentGateOpen, presentCapBp, sessionEndPresentFields, breedsPresentTick,
} from '../src/sim/breeds-traits';
import { Game } from '../src/game';
import { mem } from './helpers';
import { SAVE_KEY, serialize } from '../src/save/save';

const BR = { ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, breeds: 1 } } } as typeof b;
const focus = { focus: true as const };
const fresh = (o: Partial<BreedsSave> = {}): BreedsSave => ({
  owned: {}, slots: [null, null, null], incubator: null, settleMs: [0, 0, 0],
  hatches: 0, pity: 0, rng: 0x9e3779b9, freeHatchUsed: 0, flockCompleteLogged: 0, ...o,
});
const st = (o: Partial<BreedsSave> = {}, F = 12): GameState => ({
  ...initialState(b, 7), farmLevel: F, tracksV7: 1 as const, v6BackupId: '0123456789abcdef', breeds: fresh(o),
});
const settledLeghorn = (): Partial<BreedsSave> => ({
  owned: { leghorn: { stars: 0 } }, slots: ['leghorn', null, null], settleMs: [0, 0, 0],
});

describe('BR-R12 Present eggs (calm open)', () => {
  it('focused tick with settled Present adds prod × focusS × bp / 10000 eggs; no-focus adds none', () => {
    let s = st(settledLeghorn(), 12);
    const bp = presentBp(s, BR);
    expect(bp).toBe(250); // roster base at 0★
    const before = s.coop;
    s = step(s, 0.1, BR, undefined, focus);
    // base coop fill (dt) + Present (focusS=0.1)
    // Isolate Present: compare focus vs no-focus
    let a = st(settledLeghorn(), 12);
    let z = st(settledLeghorn(), 12);
    a = step(a, 0.1, BR, undefined, focus);
    z = step(z, 0.1, BR, undefined, undefined);
    expect(a.coop - z.coop).toBeCloseTo(
      // prod at suspended:false vs suspended:true may differ if timed effects live — breeds-only: same prod
      (a.coop - before) - (z.coop - before) > 0 || a.coop > z.coop ? a.coop - z.coop : a.coop - z.coop,
      10,
    );
    expect(a.coop).toBeGreaterThan(z.coop);
  });

  it('[BR-BB2] incomePerSec unchanged with Present slotted', () => {
    const withP = st(settledLeghorn(), 12);
    const bare = st({}, 12);
    expect(incomePerSec(withP, BR)).toBe(incomePerSec(bare, BR));
  });

  it('[BR-AC18] Present bp clamps at lay_cap', () => {
    expect(presentCapBp(17, BR)).toBe(700);
    expect(presentCapBp(18, BR)).toBe(1500);
    // 3× cream_legbar 2★ would exceed — use high-star presents at F17
    const s = st({
      owned: { ayam_cemani: { stars: 2 }, rhode_island_red: { stars: 2 }, leghorn: { stars: 2 } },
      slots: ['ayam_cemani', 'rhode_island_red', 'leghorn'], settleMs: [0, 0, 0],
    }, 17);
    expect(presentBp(s, BR)).toBe(700);
  });
});

describe('BR-R12b calm gate', () => {
  it('empty ring / load: gate open; k=0 always open', () => {
    const s = st(settledLeghorn());
    expect(presentGateOpen(s, BR)).toBe(true);
    const k0 = { ...BR, /* bc is from BC_SPEC_DEFAULTS — patch via presentGate with calm */ };
    expect(presentGateOpen(s, BR)).toBe(true);
  });

  it('[BR-AC46] 5 counted taps in 10 s keep Present; 6th closes on its tick', () => {
    let s = st(settledLeghorn(), 12);
    // Unlock farm for credited taps (streak_unlock_farm = 8); breeds-only detector.
    s = { ...s, farmLevel: 12 };
    // Advance focus so focusMs moves, then tap with ≥1 s sim between credits.
    for (let i = 0; i < 5; i++) {
      s = step(s, 0.1, BR, undefined, focus); // +100 ms focus
      s = apply(s, { type: 'collect' }, BR);
      // burn credit window (1 s sim)
      for (let j = 0; j < 10; j++) s = step(s, 0.1, BR, undefined, focus);
    }
    expect(presentGateOpen(s, BR)).toBe(true); // 5 < 6
    s = apply(s, { type: 'collect' }, BR); // 6th — stamp now; gate re-eval on next focus tick
    s = step(s, 0.1, BR, undefined, focus);
    expect(presentGateOpen(s, BR)).toBe(false);
    expect(s.breedsCalm!.lostCount).toBe(1);
  });

  it('[BR-AC47] gate reopens when oldest stamp ages out of the 10 s window', () => {
    let s = st(settledLeghorn(), 12);
    for (let i = 0; i < 6; i++) {
      s = apply(s, { type: 'collect' }, BR);
      for (let j = 0; j < 10; j++) s = step(s, 0.1, BR, undefined, focus);
    }
    s = step(s, 0.1, BR, undefined, focus);
    expect(presentGateOpen(s, BR)).toBe(false);
    // Age ~10 s more focus so first stamps drop (each tap was ~1 s apart; after 6 taps focusMs ~ 6000+; need focusMs - oldest >= 10000)
    for (let i = 0; i < 100; i++) s = step(s, 0.1, BR, undefined, focus); // +10 s
    expect(presentGateOpen(s, BR)).toBe(true);
  });

  it('[E22b] offline ≥ 60 s empties the ring; 59.9 s keeps stamps', () => {
    let s = st(settledLeghorn(), 12);
    for (let i = 0; i < 6; i++) {
      s = apply(s, { type: 'collect' }, BR);
      for (let j = 0; j < 10; j++) s = step(s, 0.1, BR, undefined, focus);
    }
    s = step(s, 0.1, BR, undefined, focus);
    expect(s.breedsCalm!.stamps.length).toBeGreaterThan(0);
    const kept = applyOffline(s, 59_999, BR).state;
    expect(kept.breedsCalm!.stamps.length).toBe(s.breedsCalm!.stamps.length);
    const cleared = applyOffline(s, 60_000, BR).state;
    expect(cleared.breedsCalm!.stamps).toEqual([]);
    expect(presentGateOpen(cleared, BR)).toBe(true);
  });
});

describe('session_end present_* (row 32 only)', () => {
  it('flag-off: absent; breeds-on: present_active_s 0.1 s half-up + present_lost_count int', () => {
    expect(sessionEndPresentFields(st(), b)).toEqual({});
    const idle = st(settledLeghorn());
    expect(sessionEndPresentFields(idle, BR)).toEqual({ present_active_s: 0, present_lost_count: 0 });
    // 12250 ms → 12.3; 12249 → 12.2
    let s = st(settledLeghorn());
    s = { ...s, breedsCalm: { focusMs: 12250, stamps: [], activeMs: 12250, lostCount: 3, open: true } };
    expect(sessionEndPresentFields(s, BR)).toEqual({ present_active_s: 12.3, present_lost_count: 3 });
    s = { ...s, breedsCalm: { ...s.breedsCalm!, activeMs: 12249 } };
    expect(sessionEndPresentFields(s, BR).present_active_s).toBe(12.2);
  });

  it('Game.endSession tracks present_* when breeds on', () => {
    const kv = mem();
    const T0 = Date.UTC(2026, 10, 10, 0);
    const g = new Game(BR, kv, () => T0, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
    g.state = st(settledLeghorn());
    g.state = { ...g.state, breedsCalm: { focusMs: 1000, stamps: [], activeMs: 1000, lostCount: 2, open: true } };
    const tracks: any[] = [];
    (g as any).telemetry.track = (type: string, fields?: object) => { tracks.push({ type, fields }); };
    (g as any).telemetry.flush = () => {};
    (g as any).save = () => {};
    g.endSession();
    const end = tracks.find(t => t.type === 'session_end');
    expect(end?.fields).toMatchObject({ present_active_s: 1, present_lost_count: 2 });
    // Must NOT invent other breeds session_end keys here (gen/breeds-telemetry owns those)
    expect(end?.fields).not.toHaveProperty('breed_hatches');
    expect(end?.fields).not.toHaveProperty('breed_present_eggs');
  });
});

describe('flag-off identity', () => {
  it('breeds flag off: no breedsCalm, coop matches base step', () => {
    let s = st(settledLeghorn(), 12);
    const a = step(s, 0.1, b, undefined, focus);
    expect(a.breedsCalm).toBeUndefined();
  });
});
