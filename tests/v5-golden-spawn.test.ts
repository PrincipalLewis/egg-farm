// v5 Wave A #1 (slice 2): golden-egg spawn / lifetime / tap / Frenzy events (product/collection/m5-golden-egg-spec.md v1.3.2.2
// R1-R4, R8, R10a/R10c, R15, R19/R20, R22/R23, §8; Architect contracts engineering/reviews/arch-golden-slice2-contracts-20261105.md;
// Product D-HOP-2026-11-05-11). Pure sim: UI passes valid spot ids into `spawnGolden`; evRng order gap -> slot -> reward.
import { describe, it, expect } from 'vitest';
import { balance as b, validateBalance } from '../src/config/balance';
import { M5_TC_KEYS } from '../src/config/formulas';
import { initialState, nextRand, type GameState } from '../src/sim/state';
import { apply, sellTo } from '../src/sim/actions';
import { step } from '../src/sim/tick';
import { saleValueCents } from '../src/sim/payout';
import { ensureEvRng, pickIndex } from '../src/sim/rng';
import { m5Offline, m5Persist, m5Load } from '../src/save/m5-fields';
import { GOLDEN_RECHECK_S, spawnDue, goldenUnload, rollReward, baseScaled, rewardCents, cashBp, grantGolden } from '../src/sim/golden';
import { ON } from './v5-f2-helpers';
type B = typeof b;
const flags = (f: Record<string, number>, bb: B = ON) => ({ ...bb, m4: { ...bb.m4!, flags: { ...bb.m4!.flags, ...f } } }) as B;
const withTc = (t: Record<string, number>, bb: B = ON) => ({ ...bb, m4: { ...bb.m4!, tc: { ...bb.m4!.tc!, ...t } } }) as B;
const G = flags({ golden: 1, streak: 1, broody: 0, abilities: 0 }), OFF = flags({ golden: 0, broody: 0, abilities: 0 });
const tc = G.m4!.tc!, DT = 1 / G.tickHz, PER_S = Math.round(G.tickHz);
const SPOTS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];
const farm = (extra: Partial<GameState> = {}, bb: B = G): GameState => ({ ...initialState(bb, 9), farmLevel: 10, collectionLevel: 8, hensLevel: 10, eggValueLevel: 10,
  coinsCents: 50_000_000, coop: 12, basket: 0, graderTier: 0, workers: {}, ...extra });
const run = (s: GameState, n: number, bb: B = G, ev?: any[], focus = true) => { for (let i = 0; i < n; i++) s = step(s, DT, bb, ev, { focus }); return s; };
/** Focus ticks until spawnDue (or the cap); returns [state, ticks]. */
const untilDue = (s: GameState, bb: B = G, cap = 400 * PER_S): [GameState, number] => { let t = 0; while (!spawnDue(s, bb) && t < cap) { s = step(s, DT, bb, undefined, { focus: true }); t++; } return [s, t]; };
const golden = (ev: any[]) => ev.filter(e => /^collectible_|^frenzy_/.test(e.type));
/** A state whose NEXT evRng draw lands in [lo, hi). */
const withNextU = (s: GameState, lo: number, hi: number): GameState => { for (let x = 1; ; x++) { const [, u] = nextRand(x); if (u >= lo && u < hi) return { ...s, evRngState: x }; } };
const spawned = (s: GameState, bb: B = G) => { const [d] = untilDue(s, bb); return apply(d, { type: 'spawnGolden', spots: SPOTS }, bb); };

describe('#1 slice 2: flag and unlock (R1/R2, GE-AC1, GE-AC34)', () => {
  it('flag off: 30 focus min at F10 adds no golden field or event; spawnGolden / tapGolden are the identity', () => {
    const ev: any[] = []; const s = run(farm({}, OFF), 1800 * PER_S, OFF, ev);
    expect(golden(ev)).toEqual([]); expect('nextSpawnRemainingS' in s || 'goldenEgg' in s || 'goldenPending' in s).toBe(false);
    const s0 = farm({ nextSpawnRemainingS: 0 }, OFF);
    expect(apply(s0, { type: 'spawnGolden', spots: SPOTS }, OFF)).toBe(s0);
    const s1 = farm({ goldenEgg: { ageS: 5, slotId: 'S1', intervalS: 45 } }, OFF); expect(apply(s1, { type: 'tapGolden' }, OFF)).toBe(s1);
  });
  it('GE-AC1: F < tc_egg_unlock_farm for 30 focus min: no countdown, no spawn', () => {
    const ev: any[] = []; const s = run(farm({ farmLevel: tc.egg_unlock_farm - 1 }), 1800 * PER_S, G, ev);
    expect(golden(ev)).toEqual([]); expect(s.nextSpawnRemainingS).toBeUndefined(); expect(spawnDue(s, G)).toBe(false);
    expect(apply(s, { type: 'spawnGolden', spots: SPOTS }, G)).toBe(s);
  });
  it('GE-AC2/R2: reaching F8 starts tc_first_spawn_s (45) of focus time; due at 45 s +- 1 tick; interval_s 45', () => {
    let s = run(farm({ farmLevel: 8 }), 1); expect(s.nextSpawnRemainingS).toBeCloseTo(tc.first_spawn_s, 9);
    const [d, t] = untilDue(s); expect(Math.abs(t - 45 * PER_S)).toBeLessThanOrEqual(1);
    const ev: any[] = []; s = apply(d, { type: 'spawnGolden', spots: SPOTS }, G, ev);
    expect(s.goldenEgg).toMatchObject({ ageS: 0, intervalS: 45 }); expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ type: 'collectible_spawned', skin: 'golden_egg', farm_level: 8, collection_level: 8, interval_s: 45, slot_id: s.goldenEgg!.slotId });
    expect(ev[0].deferred_ms).toBeLessThanOrEqual(Math.ceil(DT * 1000));
  });
  it('R1 never re-locks: a running countdown keeps going if F drops below 8', () => {
    const s = run(farm({ farmLevel: 5, nextSpawnRemainingS: 10 }), 5 * PER_S); expect(s.nextSpawnRemainingS).toBeCloseTo(5, 6);
  });
});

describe('#1 slice 2: focus clock (R5/R7, GE-AC13, GE-AC21)', () => {
  it('unfocused ticks move neither the countdown nor an on-screen egg', () => {
    const a = run(farm({ nextSpawnRemainingS: 87 }), 40 * PER_S, G, undefined, false); expect(a.nextSpawnRemainingS).toBe(87);
    const e = run(farm({ goldenEgg: { ageS: 25, slotId: 'S2', intervalS: 200 } }), 40 * PER_S, G, undefined, false); expect(e.goldenEgg!.ageS).toBe(25);
    const ev: any[] = []; let t = 0, s = e; while (s.goldenEgg && t < 10 * PER_S) { s = step(s, DT, G, ev, { focus: true }); t++; }
    expect(Math.abs(t - 5 * PER_S)).toBeLessThanOrEqual(1); expect(golden(ev).map(x => x.reason)).toEqual(['timeout']);
  });
  it('GE-AC21: dt <= 0 changes nothing golden', () => {
    const s = farm({ nextSpawnRemainingS: 50, goldenEgg: undefined }); const o = step(s, 0, G, undefined, { focus: true }); expect(o.nextSpawnRemainingS).toBe(50);
  });
});

describe('#1 slice 2: spawn (R4, R14/R15, GE-AC4, GE-AC16, sizing §12.2)', () => {
  it('slot = spots[pickIndex(u, n)] from ONE evRng draw; the UI list order is the index space', () => {
    const [d] = untilDue(run(farm({ farmLevel: 8 }), 1)); const [x, u] = nextRand(d.evRngState!);
    const o = apply(d, { type: 'spawnGolden', spots: ['S3', 'S7', 'S1'] }, G);
    expect(o.goldenEgg!.slotId).toBe(['S3', 'S7', 'S1'][pickIndex(u, 3)]); expect(o.evRngState).toBe(x);
  });
  it('GE-AC4: no second egg while one is on screen; not due -> no spawn', () => {
    const s = spawned(run(farm({ farmLevel: 8 }), 1)); expect(apply(s, { type: 'spawnGolden', spots: SPOTS }, G)).toBe(s);
    const n = farm({ nextSpawnRemainingS: 30 }); expect(apply(n, { type: 'spawnGolden', spots: SPOTS }, G)).toBe(n);
  });
  it('R15: an empty list defers (no egg, no lifetime, no draw); recheck every 500 ms of focus; deferred_ms counts focus time only', () => {
    expect(GOLDEN_RECHECK_S).toBe(0.5);
    let [s] = untilDue(run(farm({ farmLevel: 8 }), 1)); const rng0 = s.evRngState;
    s = apply(s, { type: 'spawnGolden', spots: [] }, G); expect(s.goldenEgg).toBeUndefined(); expect(s.evRngState).toBe(rng0); expect(spawnDue(s, G)).toBe(false);
    let t = 0; while (!spawnDue(s, G)) { s = step(s, DT, G, undefined, { focus: true }); t++; } expect(Math.abs(t - 0.5 * PER_S)).toBeLessThanOrEqual(1);
    for (let i = 0; i < 19; i++) { s = apply(s, { type: 'spawnGolden', spots: [] }, G); s = run(s, 0.5 * PER_S); } // ~10 s deferred
    s = run(s, 30 * PER_S, G, undefined, false); // a hidden 30 s adds no deferral
    const ev: any[] = []; s = apply(s, { type: 'spawnGolden', spots: ['S5'] }, G, ev);
    expect(s.goldenEgg).toMatchObject({ slotId: 'S5', ageS: 0, intervalS: 45 }); expect(Math.abs(ev[0].deferred_ms - 10_000)).toBeLessThanOrEqual(Math.ceil(DT * 1000) + 1);
    expect(ev[0].interval_s).toBe(45); expect('goldenPending' in s).toBe(false);
  });
});

describe('#1 slice 2: lifetime and expiry (R3, GE-AC3, GE-AC5)', () => {
  it('GE-AC5: an untouched egg expires once at focus age tc_egg_despawn_s +- 1 tick; no reward; fresh R3 gap from evRng', () => {
    const s0 = spawned(run(farm({ farmLevel: 8, coop: 0 }), 1)); const [, u] = nextRand(s0.evRngState!);
    let s = s0, t = 0; const ev: any[] = []; while (s.goldenEgg && t < 40 * PER_S) { s = step(s, DT, G, ev, { focus: true }); t++; }
    expect(Math.abs(t - tc.egg_despawn_s * PER_S)).toBeLessThanOrEqual(1);
    expect(golden(ev)).toEqual([{ type: 'collectible_expired', skin: 'golden_egg', reason: 'timeout', farm_level: 8 }]);
    const gap = tc.egg_gap_min_s + u * (tc.egg_gap_max_s - tc.egg_gap_min_s);
    expect(s.goldenPending!.intervalS).toBe(gap); expect(s.nextSpawnRemainingS).toBe(gap); // drawn on the expiry tick, counts from the next one
  });
  it('GE-AC3: 200 seeded resolutions: every gap in [120, 300), mean 210 +- 15; same seed same gaps; customer arrivals identical golden on vs off', () => {
    const gaps = (seed: number) => { let s = { ...farm(), evRngState: undefined, rng: seed } as GameState, out: number[] = [];
      s = run(s, 1); for (let i = 0; i < 200; i++) { [s] = untilDue(s, G, 400 * PER_S); s = apply(s, { type: 'spawnGolden', spots: SPOTS }, G);
        s = run(s, Math.round(tc.spawn_grace_ms / 1000 * PER_S) + 1); s = apply(s, { type: 'tapGolden' }, G); out.push(s.goldenPending!.intervalS); } return out; };
    const a = gaps(11); expect(a.every(g => g >= 120 && g < 300)).toBe(true); expect(Math.abs(a.reduce((x, y) => x + y, 0) / a.length - 210)).toBeLessThan(15);
    expect(gaps(11)).toEqual(a);
    const arrivals = (bb: B) => { const ev: any[] = []; let s = farm({ farmLevel: 8, coop: 0 }, bb);
      for (let i = 0; i < 1200 * PER_S; i++) { s = step(s, DT, bb, ev, { focus: true }); if (spawnDue(s, bb)) s = apply(s, { type: 'spawnGolden', spots: SPOTS }, bb, ev); }
      return ev.filter(e => e.type === 'customer_arrive'); };
    const on = arrivals(G); expect(on.length).toBeGreaterThan(10); expect(on).toEqual(arrivals(OFF));
  });
});

describe('#1 slice 2: tap (R19/R20, GE-AC6, GE-AC18, GE-AC33, GE-AC35)', () => {
  const ready = (u: [number, number], extra: Partial<GameState> = {}) => withNextU(farm({ goldenEgg: { ageS: 3, slotId: 'S4', intervalS: 150 }, ...extra }), u[0], u[1]);
  it('R19: a tap before tc_spawn_grace_ms of focus age is ignored (identity)', () => {
    const s = farm({ goldenEgg: { ageS: tc.spawn_grace_ms / 1000 - 0.01, slotId: 'S1', intervalS: 45 } }); expect(apply(s, { type: 'tapGolden' }, G)).toBe(s);
  });
  it('GE-AC6/AC8: cash tap grants exactly once; collectible_collected matches the state change; egg resolved with a fresh gap', () => {
    const s = ready([0, 0.4]), ev: any[] = []; const o = apply(s, { type: 'tapGolden' }, G, ev), cents = rewardCents(baseScaled(s, G), cashBp(G));
    expect(o.coinsCents - s.coinsCents).toBe(cents); expect(o.goldenEgg).toBeUndefined();
    expect(ev).toEqual([{ type: 'collectible_collected', skin: 'golden_egg', reaction_ms: 3000, in_warning: false, reward_type: 'cash', reward_value: cents, reward_duration_s: 0, farm_level: 10 }]);
    expect(o.nextSpawnRemainingS! >= 120 && o.nextSpawnRemainingS! < 300).toBe(true); expect(o.goldenPending!.intervalS).toBe(o.nextSpawnRemainingS);
    expect(apply(o, { type: 'tapGolden' }, G)).toBe(o); // GE-AC18: a second tap does nothing
  });
  it('in_warning from tc_warn_at_s; eggs reward_value = eggs added (F < 20); eggs_cash at F >= 20', () => {
    const e = ready([0.9, 1], { farmLevel: 12, goldenEgg: { ageS: tc.warn_at_s, slotId: 'S1', intervalS: 45 } }), ev: any[] = []; const o = apply(e, { type: 'tapGolden' }, G, ev);
    expect(ev[0]).toMatchObject({ reward_type: 'eggs', reward_value: o.basket - e.basket, in_warning: true, reward_duration_s: 0 }); expect(o.basket).toBeGreaterThan(e.basket);
    const c = ready([0.9, 1], { farmLevel: 20 }), ev2: any[] = []; const o2 = apply(c, { type: 'tapGolden' }, G, ev2);
    expect(ev2[0]).toMatchObject({ reward_type: 'eggs_cash', reward_value: o2.coinsCents - c.coinsCents });
  });
  it('frenzy tap: reward_value = tc_frenzy_price_mult, duration tc_frenzy_s; frenzy_started follows collectible_collected', () => {
    const s = ready([0.5, 0.7], { graderTier: 1 }), ev: any[] = []; const o = apply(s, { type: 'tapGolden' }, G, ev);
    expect(o.frenzyRemainingS).toBe(tc.frenzy_s);
    expect(ev.map(e => e.type)).toEqual(['collectible_collected', 'frenzy_started']);
    expect(ev[0]).toMatchObject({ reward_type: 'frenzy', reward_value: tc.frenzy_price_mult, reward_duration_s: tc.frenzy_s });
    expect(ev[1]).toEqual({ type: 'frenzy_started', mult: tc.frenzy_price_mult, duration_s: tc.frenzy_s, farm_level: 10, grader_tier: 1 });
  });
  it('GE-AC35: a golden tap is not a credited tap: streak, tap window and coop unchanged', () => {
    const s = ready([0, 0.4], { streakS: 0.1, streakHoldS: 1, tapCreditCdS: 0, coop: 12 }); const o = apply(s, { type: 'tapGolden' }, G);
    expect([o.streakS, o.streakHoldS, o.tapCreditCdS, o.coop, o.basket]).toEqual([0.1, 1, 0, 12, s.basket]);
  });
  it('GE-AC33: from initialState(b, 7) the draws follow xorshift32(evRng seed) in order gap at resolve -> slot -> reward (first-spawn uses tc_first_spawn_s, so this cycle starts at slot)', () => {
    let s = { ...initialState(G, 7), farmLevel: 8 } as GameState; s = step(s, DT, G, undefined, { focus: true });
    let x = ensureEvRng({ ...initialState(G, 7) }).evRngState!; const us: number[] = []; for (let i = 0; i < 6; i++) { let u; [x, u] = nextRand(x); us.push(u); }
    let d: GameState; [d] = untilDue(s); d = apply(d, { type: 'spawnGolden', spots: SPOTS }, G);
    expect(d.goldenEgg!.slotId).toBe(SPOTS[pickIndex(us[0], 8)]);
    d = run(d, PER_S); const ev: any[] = []; d = apply(d, { type: 'tapGolden' }, G, ev); expect(ev[0].reward_type).toBe(rollReward(us[1], 8, G));
    expect(d.goldenPending!.intervalS).toBeCloseTo(tc.egg_gap_min_s + us[2] * (tc.egg_gap_max_s - tc.egg_gap_min_s), 9);
  });
});

describe('#1 slice 2: Frenzy run counters (§8 frenzy_ended, GE-AC12; session only)', () => {
  it('GE-AC12: frenzy_ended{timeout}: extra_coins = sum(frenzy - non-frenzy value), eggs_sold = by_player + by_workers', () => {
    let s = grantGolden(farm({ basket: 100, customers: [{ id: 1, demand: 7, filled: 0, waitedS: 0 }, { id: 2, demand: 5, filled: 0, waitedS: 0 }] }), 'frenzy', G);
    const v1 = saleValueCents(s, 7, G, { by: 'player' }) - saleValueCents({ ...s, frenzyRemainingS: undefined }, 7, G, { by: 'player' });
    const v2 = saleValueCents(s, 5, G, { by: 'market_hand' }) - saleValueCents({ ...s, frenzyRemainingS: undefined }, 5, G, { by: 'market_hand' });
    s = sellTo(s, 1, G, undefined, 'player'); s = sellTo(s, 2, G, undefined, 'market_hand');
    s = { ...s, customers: [{ id: 3, demand: 4, filled: 0, waitedS: 0 }] }; s = sellTo(s, 3, G, undefined, 'market_hand', true); // suspended: 1x, not counted
    const ev: any[] = []; let t = 0; while (s.frenzyRemainingS !== undefined && t < 40 * PER_S) { s = step({ ...s, customers: [] }, DT, G, ev, { focus: true }); t++; }
    const end = ev.filter(e => e.type === 'frenzy_ended'); expect(v1).toBeGreaterThan(0);
    expect(end).toEqual([{ type: 'frenzy_ended', extra_coins: v1 + v2, eggs_sold: 12, sold_by_player: 7, sold_by_workers: 5, reason: 'timeout' }]);
    expect('frenzyRun' in s).toBe(false);
  });
  it('a re-granted Frenzy resets the time and keeps one run (no frenzy_ended in between)', () => {
    let s = grantGolden(farm(), 'frenzy', G); s = run(s, 10 * PER_S); const ev: any[] = []; s = run(grantGolden(s, 'frenzy', G), 25 * PER_S, G, ev);
    expect(ev.filter(e => e.type === 'frenzy_ended')).toEqual([]); expect(s.frenzyRemainingS).toBeCloseTo(5, 6);
  });
});

describe('#1 slice 2: offline / reload / save (R8, R10a, R10c; Saves contract)', () => {
  it('m5Offline with an egg: expired{offline}, no reward, fresh gap; Frenzy frozen (kept)', () => {
    const s = farm({ goldenEgg: { ageS: 9, slotId: 'S1', intervalS: 45 }, frenzyRemainingS: 12 }), ev: any[] = []; const o = m5Offline(s, G, ev);
    expect(golden(ev)).toEqual([{ type: 'collectible_expired', skin: 'golden_egg', reason: 'offline', farm_level: 10 }]);
    expect(o.goldenEgg).toBeUndefined(); expect(o.coinsCents).toBe(s.coinsCents); expect(o.frenzyRemainingS).toBe(12);
    expect(o.nextSpawnRemainingS! >= 120 && o.nextSpawnRemainingS! < 300).toBe(true); expect(o.goldenPending!.intervalS).toBe(o.nextSpawnRemainingS);
  });
  it('goldenUnload(reload): the pagehide seam: expired{reload} + fresh gap; identity without an egg or with the flag off', () => {
    const s = farm({ goldenEgg: { ageS: 9, slotId: 'S1', intervalS: 45 } }), ev: any[] = []; const o = goldenUnload(s, G, ev, 'reload');
    expect(ev).toEqual([{ type: 'collectible_expired', skin: 'golden_egg', reason: 'reload', farm_level: 10 }]); expect(o.nextSpawnRemainingS! >= 120).toBe(true);
    const n = farm({ nextSpawnRemainingS: 87 }); expect(goldenUnload(n, G, [], 'reload')).toBe(n); expect(goldenUnload(s, OFF, [], 'reload')).toBe(s);
  });
  it('R10a: the egg, the pending-spawn record and the Frenzy run are never saved; reload resumes the saved countdown (GE-AC14b)', () => {
    let s = grantGolden(spawned(run(farm({ farmLevel: 8 }), 1)), 'frenzy', G); s = run(s, PER_S);
    const p: any = m5Persist(s); for (const k of ['goldenEgg', 'goldenPending', 'frenzyRun']) expect(k in p).toBe(false);
    const r = m5Load({ ...farm(), nextSpawnRemainingS: 87, frenzyRemainingS: 12 } as GameState, G, 0, []);
    const [, t] = untilDue(r); expect(Math.abs(t - 87 * PER_S)).toBeLessThanOrEqual(1);
  });
});

describe('#1 slice 2: validateBalance (D-HOP-2026-11-05-11, golden tc keys)', () => {
  it('tc_frenzy_all_sales must be 1 (0 is invalid, no alternate branch)', () => {
    expect(() => validateBalance(withTc({ frenzy_all_sales: 0 }, G))).toThrow(/frenzy_all_sales/);
    expect(() => validateBalance(withTc({ frenzy_all_sales: 0 }, OFF))).toThrow(/frenzy_all_sales/);
    expect(() => validateBalance(withTc({ frenzy_all_sales: 2 }, G))).toThrow(/frenzy_all_sales/);
    expect(() => validateBalance(G)).not.toThrow();
  });
  it('golden on requires the slice-2 keys (first_spawn_s, egg_unlock_farm, egg_despawn_s, spawn_grace_ms, warn_at_s, frenzy_all_sales)', () => {
    for (const k of ['first_spawn_s', 'egg_unlock_farm', 'egg_despawn_s', 'spawn_grace_ms', 'warn_at_s', 'frenzy_all_sales']) {
      const t = { ...G.m4!.tc! } as any; delete t[k]; expect(() => validateBalance({ ...G, m4: { ...G.m4!, tc: t } } as B)).toThrow(new RegExp(k));
    }
  });

  it('M5_TC_KEYS.abilities stays a real entry (Architect M1 / cannot vanish into golden EOL comment)', () => {
    expect([...M5_TC_KEYS.abilities]).toEqual(['ability_s', 'ability_cd_s']);
    expect(M5_TC_KEYS.golden).toEqual([
      'egg_gap_min_s', 'egg_gap_max_s', 'frenzy_s', 'frenzy_price_mult', 'egg_cash_s', 'egg_eggs_s',
      'egg_eggs_as_cash_from_farm', 'egg_w_cash', 'egg_w_frenzy', 'egg_w_eggs',
      'first_spawn_s', 'egg_unlock_farm', 'egg_despawn_s', 'spawn_grace_ms', 'warn_at_s', 'frenzy_all_sales',
    ]);
    // abilities:1 requires ability_s / ability_cd_s via validateBalance
    const A = flags({ abilities: 1, golden: 0 });
    expect(() => validateBalance(A)).not.toThrow();
    for (const k of ['ability_s', 'ability_cd_s'] as const) {
      const t = { ...A.m4!.tc! } as any; delete t[k];
      expect(() => validateBalance({ ...A, m4: { ...A.m4!, tc: t } } as B)).toThrow(new RegExp(k));
    }
  });

});
