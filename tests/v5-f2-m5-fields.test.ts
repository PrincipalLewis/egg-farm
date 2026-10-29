// v5 F2 (m5.0-sizing.md §1 F2, §9.1, §12.1 D-C2/D-C5, §13 AB-1): sanitisers, persist shape, both settle paths, flag-off identity.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState, mixSeed, nextRand, type GameState } from '../src/sim/state';
import { serialize, checksum, SAVE_VERSION } from '../src/save/save';
import { m5Load, m5Persist, m5Offline, m5ShortGap, m5Flag, streakAfter, drawGap, ensureEvRng, EV_RNG_SALT, M5_SESSION_KEYS } from '../src/save/m5-fields';
import type { SimEvent } from '../src/sim/events';
import { ON } from './v5-f2-helpers';
const NOW = Date.UTC(2026, 9, 29, 12), tc = b.m4!.tc!, CD = tc.ability_cd_s * 1000;
const only = (k: string) => ({ ...b, m4: { ...b.m4!, flags: { [k]: 1 } } }) as typeof b;
const base = (): GameState => ({ ...initialState(b, 7), farmLevel: 12 });
const M5 = (): any => ({ ...base(), nextSpawnRemainingS: 87, frenzyRemainingS: 12, evRngState: 123456789, broodyNestCents: 4321, broodyHenIdx: 3, abilitiesUnlocked: true,
  abilities: { market_hand: { readyAt: NOW + 120_000 }, coop_hand: { readyAt: NOW - 5_000, activeS: 18 } } });
const egg = { ageS: 12, slotId: 'S3', intervalS: 150 };

describe('F2 flags (D-C1): m4.flags.<item> === 1 and m4.enabled', () => {
  it('shipping balance has no m4.flags: every M5 flag off; SAVE_VERSION stays 6', () => {
    expect(b.m4!.flags).toBeUndefined(); for (const k of ['golden', 'streak', 'tapCoins', 'broody', 'abilities', 'pause'] as const) expect(m5Flag(b, k)).toBe(false);
    expect(m5Flag({ ...ON, m4: { ...ON.m4!, enabled: 0 } }, 'golden')).toBe(false); expect(m5Flag(only('golden'), 'golden')).toBe(true);
    expect(m5Flag({ ...b, m4: { ...b.m4!, flags: { golden: true as any } } }, 'golden')).toBe(false); expect(SAVE_VERSION).toBe(6);
  });
  it('flags off: m5Load / m5Offline / m5ShortGap return the SAME object, no events (byte-identical to the base)', () => {
    const s = { ...M5(), nextSpawnRemainingS: -1, streakS: 0.2, goldenEgg: egg }, ev: SimEvent[] = [];
    expect(m5Load(s, b, NOW, ev)).toBe(s); expect(m5Offline(s, b, ev)).toBe(s); expect(m5ShortGap(s, b)).toBe(s); expect(ev).toEqual([]);
  });
  it('m5Persist: no session key -> same object, so serialize writes exactly the base bytes (an M5 saved shape too)', () => {
    for (const s of [base(), M5()]) { expect(m5Persist(s)).toBe(s); const st = JSON.stringify(s); expect(serialize(s, NOW)).toBe(`{"version":6,"savedAt":${NOW},"sum":"${checksum(st)}","state":${st}}`); }
  });
});
describe('F2 sanitisers on load (D-C5, AB-1, E2/E2b)', () => {
  const load = (s: any, bb = ON, now = NOW) => { const ev: SimEvent[] = []; return { s: m5Load(s, bb, now, ev) as any, ev }; };
  it('valid values kept; a call spanning the reload ends once (offline, effect_s = tc_ability_s - activeS); activeS cleared', () => {
    const { s, ev } = load(M5());
    expect(s).toMatchObject({ nextSpawnRemainingS: 87, frenzyRemainingS: 12, evRngState: 123456789, broodyNestCents: 4321, broodyHenIdx: 3, abilitiesUnlocked: true });
    expect(s.abilities).toEqual({ market_hand: { readyAt: NOW + 120_000 }, coop_hand: { readyAt: NOW } });
    expect(ev).toEqual([{ type: 'ability_ended', worker: 'coop_hand', cause: 'offline', effect_s: tc.ability_s - 18 }]);
    expect(load(s).ev).toEqual([]); // cleared: never logged twice
  });
  it.each([
    ['nextSpawnRemainingS', -1, undefined], ['nextSpawnRemainingS', 1e9, tc.egg_gap_max_s], ['nextSpawnRemainingS', null, undefined], ['nextSpawnRemainingS', '87', undefined],
    ['frenzyRemainingS', 999, tc.frenzy_s], ['frenzyRemainingS', -0.5, undefined], ['broodyNestCents', 12.9, 12], ['broodyNestCents', 5e16, 1e15], ['broodyNestCents', -3, undefined],
    ['broodyHenIdx', 12, undefined], ['broodyHenIdx', 2.5, undefined], ['broodyHenIdx', 11, 11], ['evRngState', 0, undefined], ['evRngState', 2 ** 32, undefined],
    ['evRngState', -4, undefined], ['evRngState', 0xffffffff, 0xffffffff], ['abilitiesCoachSeen', 'yes', undefined], ['abilitiesUnlocked', false, false],
  ])('%s = %s -> %s', (k, v, want) => { const { s } = load({ ...base(), [k]: v }); expect(s[k]).toBe(want); if (want === undefined) expect(k in s).toBe(false); });
  it('readyAt clamped to [now, now + tc_ability_cd_s]; non-finite -> ready (absent); a clock rolled back a day loads at most one cooldown', () => {
    const r = (a: any, now = NOW) => load({ ...base(), abilities: { market_hand: a } }, ON, now).s.abilities.market_hand.readyAt;
    expect(r({ readyAt: NOW + 3_600_000 })).toBe(NOW + CD); expect(r({ readyAt: NOW - 3_600_000 })).toBe(NOW);
    expect(r({ readyAt: null })).toBeUndefined(); expect(r({ readyAt: 'x' })).toBeUndefined(); expect(r({})).toBeUndefined();
    expect(r({ readyAt: NOW + 60_000 }, NOW - 86_400_000)).toBe(NOW - 86_400_000 + CD);
  });
  it('activeS > tc_ability_s clamps (effect_s 0); non-finite / <= 0 is no call (no event); junk containers dropped', () => {
    expect(load({ ...base(), abilities: { grader: { readyAt: NOW, activeS: 99 } } }).ev).toEqual([{ type: 'ability_ended', worker: 'grader', cause: 'offline', effect_s: 0 }]);
    for (const a of [-1, 0, null, 'x']) { const x = load({ ...base(), abilities: { grader: { activeS: a } } }); expect(x.ev).toEqual([]); expect(x.s.abilities.grader).toEqual({}); }
    expect('abilities' in load({ ...base(), abilities: [1] }).s).toBe(false); expect(load({ ...base(), abilities: { hawker: 5 } }).s.abilities).toEqual({});
  });
  it('only the fields of a flag that is on are touched (flag off then on: kept, not read; abilities spec E7)', () => {
    const s = { ...M5(), nextSpawnRemainingS: -1, broodyNestCents: -1 };
    const g = load(s, only('golden')).s; expect('nextSpawnRemainingS' in g).toBe(false); expect(g.broodyNestCents).toBe(-1); expect(g.abilities).toEqual(s.abilities);
    const a = load(s, only('abilities')); expect(a.s.nextSpawnRemainingS).toBe(-1); expect(a.ev).toHaveLength(1);
  });
  it('session-only keys in a hand-edited save never load; legacy v1.0 frenzyEndAt dropped (R23 uses frenzyRemainingS)', () => {
    const { s } = load({ ...base(), goldenEgg: egg, streakS: 0.3, streakHoldS: 2, irefRingCents: [1], frenzyEndAt: NOW + 9000 });
    for (const k of ['goldenEgg', 'streakS', 'streakHoldS', 'irefRingCents', 'frenzyEndAt']) expect(k in s).toBe(false);
  });
});
describe('F2 persist (save shape)', () => {
  it('every session key is dropped (F1a M5_SESSION_FIELDS); saved fields and activeS kept (E2); input not mutated', () => {
    const s: any = { ...M5(), abilities: { market_hand: { readyAt: NOW + 42_500, activeS: 7 } }, ...Object.fromEntries(M5_SESSION_KEYS.map(k => [k, 1])) };
    const p: any = m5Persist(s); for (const k of M5_SESSION_KEYS) { expect(k in p).toBe(false); expect(s[k]).toBe(1); }
    expect(p.abilities).toEqual({ market_hand: { readyAt: NOW + 42_500, activeS: 7 } }); expect(JSON.parse(serialize(s, NOW)).state).toEqual(p);
  });
});
describe('F2 settle: a gap of 60 s or more (§9.1 / §9.1a)', () => {
  const live = (): any => ({ ...base(), evRngState: 99, nextSpawnRemainingS: 50, frenzyRemainingS: 11, broodyNestCents: 700, broodyHenIdx: 2, broodyNestScaled: 7_000_123,
    goldenEgg: egg, streakS: 0.28, streakHoldS: 2, abilities: { market_hand: { readyAt: NOW + 200_000, activeS: 10 }, coop_hand: { readyAt: NOW + 50_000 } } });
  it('egg expires (offline, fresh evRng gap), calls end at the gap start, s = 0; Frenzy frozen, nest kept, readyAt (wall clock) untouched', () => {
    const ev: SimEvent[] = [], s: any = m5Offline(live(), ON, ev), [x, u] = nextRand(99);
    expect(ev).toEqual([
      { type: 'ability_ended', worker: 'market_hand', cause: 'offline', effect_s: tc.ability_s - 10 },
      { type: 'collectible_expired', skin: 'golden_egg', reason: 'offline', farm_level: 12 }]);
    expect(s.abilities).toEqual({ market_hand: { readyAt: NOW + 200_000 }, coop_hand: { readyAt: NOW + 50_000 } });
    expect('goldenEgg' in s).toBe(false); expect(s.evRngState).toBe(x); expect(s.nextSpawnRemainingS).toBe(tc.egg_gap_min_s + u * (tc.egg_gap_max_s - tc.egg_gap_min_s));
    expect(s).toMatchObject({ frenzyRemainingS: 11, broodyNestCents: 700, broodyHenIdx: 2, broodyNestScaled: 7_000_123, streakS: 0, streakHoldS: 0, rng: base().rng });
  });
  it('no egg on screen: the countdown is kept, not re-drawn (golden R8, review fix B1); evRng not advanced', () => {
    const { goldenEgg, ...noEgg } = live(); void goldenEgg; const s: any = m5Offline(noEgg, ON, []); expect(s.nextSpawnRemainingS).toBe(50); expect(s.evRngState).toBe(99);
  });
  it('D-C2: drawGap with no evRngState seeds mixSeed(state.rng ^ 0x6576526E) once and never touches state.rng', () => {
    const s0 = base(); const e = ensureEvRng(s0); expect(e.evRngState).toBe(mixSeed((s0.rng ^ EV_RNG_SALT) >>> 0)); expect(ensureEvRng(e)).toBe(e);
    const g = drawGap(s0, ON); expect(g.rng).toBe(s0.rng); expect(g.evRngState).toBe(nextRand(e.evRngState!)[0]);
  });
});
describe('F2 settle: a hidden gap under 60 s', () => {
  it('streak grace/decay in one step over 0 focus seconds: 5 s hidden at 0.28 returns 0.28 (K8); same object, nothing else moves', () => {
    const s: any = { ...base(), streakS: 0.28, streakHoldS: 2, nextSpawnRemainingS: 50, goldenEgg: egg, abilities: { market_hand: { readyAt: NOW, activeS: 5 } } };
    expect(m5ShortGap(s, ON)).toBe(s);
  });
  it('streakAfter: hold 3 s then 0.03/s, 0 at 12.33 s from 0.28 (ST-AC5); dt < 0 counts as 0', () => {
    expect(streakAfter(0.28, 3, 2.9, ON)).toEqual({ s: 0.28, holdS: expect.closeTo(0.1, 9) });
    expect(streakAfter(0.28, 3, 8, ON).s).toBeCloseTo(0.28 - tc.streak_decay_per_s * 5, 9); expect(streakAfter(0.28, 3, 12.34, ON).s).toBe(0); expect(streakAfter(0.28, 3, -9, ON)).toEqual({ s: 0.28, holdS: 3 });
  });
});
