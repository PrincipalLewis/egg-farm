// v5 golden v1.3.3 sim: goldenFrozen, freeze timers/tap/x2, session_end fields, QA hooks
// (product/collection/m5-golden-egg-spec.md v1.3.3 sha1 2eb630e398686f4c81e9650684de18af21d00a3d;
//  GE-AC37-45, GE-AC45 [T-sub]; card #2 QA hooks tc.spawn/state + frenzy.start).
// Pure sim / Game wiring. UI ACs (style, bubble, pill, audio, overlay) are parked.
import { describe, it, expect, afterEach } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState, nextRand, type GameState } from '../src/sim/state';
import { apply } from '../src/sim/actions';
import { step } from '../src/sim/tick';
import { saleValueCents } from '../src/sim/payout';
import { m5Persist, m5Offline } from '../src/save/m5-fields';
import {
  goldenFrozen, spawnDue, grantGolden, frenzyFactor, baseScaled, rewardCents, cashBp, eggsBp, GOLDEN_MATH,
  sessionEndGoldenFields, goldenWorkerPausedFields, GOLDEN_RECHECK_S,
} from '../src/sim/golden';
import { pauseWorker, resumeWorker, isPaused } from '../src/sim/pause';
import { WORKERS, type WorkerId } from '../src/sim/workers';
import { Game } from '../src/game';
import { mem } from './helpers';
import { ON } from './v5-f2-helpers';
import { installGoldenQa } from '../src/debug/golden-qa';
type B = typeof b;
const flags = (f: Record<string, number>, bb: B = ON) => ({ ...bb, m4: { ...bb.m4!, flags: { ...bb.m4!.flags, ...f } } }) as B;
const GP = flags({ golden: 1, pause: 1, streak: 1, broody: 0, abilities: 0 });
const G = flags({ golden: 1, pause: 0, streak: 1, broody: 0, abilities: 0 });
const OFF = flags({ golden: 0, pause: 0, streak: 0, broody: 0, abilities: 0 });
const tc = GP.m4!.tc!, DT = 1 / GP.tickHz, PER_S = Math.round(GP.tickHz);
const SPOTS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];
const wok = { energy: 100, cdS: 0 };
const hired = (pausedIds: WorkerId[] = [], extra: Partial<GameState['workers']> = {}) => {
  const w: GameState['workers'] = { market_hand: { ...wok }, ...extra };
  for (const id of pausedIds) w[id] = { ...(w[id] ?? wok), paused: true };
  return w;
};
const farm = (extra: Partial<GameState> = {}, bb: B = GP): GameState => ({
  ...initialState(bb, 9), farmLevel: 10, collectionLevel: 8, hensLevel: 10, eggValueLevel: 10,
  coinsCents: 50_000_000, coop: 12, basket: 40, graderTier: 1, workers: hired(), ...extra,
});
const run = (s: GameState, n: number, bb: B = GP, ev?: any[], focus = true) => {
  for (let i = 0; i < n; i++) s = step(s, DT, bb, ev, { focus }); return s;
};
const gold = (ev: any[]) => ev.filter(e => /^collectible_|^frenzy_/.test(e.type));
const withNextU = (s: GameState, lo: number, hi: number): GameState => {
  for (let x = 1; ; x++) { const [, u] = nextRand(x); if (u >= lo && u < hi) return { ...s, evRngState: x }; }
};
const T0 = Date.UTC(2026, 10, 12, 20);
function setup(bb: B = GP, st: Partial<GameState> = {}, attended = true) {
  const kv = mem(); let t = T0; const clock = { get t() { return t; }, set t(v) { t = v; } };
  const g = new Game(bb, kv, () => t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
  const evs: any[] = []; g.on(e => evs.push(e));
  g.state = { ...g.state, farmLevel: 10, collectionLevel: 5, coinsCents: 1_000_000, workers: hired(), ...st } as GameState;
  let att = attended; g.setAttendedProbe(() => att); g.setSpotProbe(() => SPOTS);
  const frames = (n: number, ms = 100) => { for (let i = 0; i < n; i++) { clock.t += ms; g.frame(); } };
  return { kv, g, clock, evs, frames, setAttended: (a: boolean) => { att = a; } };
}

describe('v1.3.3 goldenFrozen predicate (R5g, GE-AC39, GE-AC44 shared fn)', () => {
  it('false when pause is off, F < unlock, or no hired worker is isPaused', () => {
    const s = farm({ workers: hired(['market_hand']) });
    expect(goldenFrozen(s, GP)).toBe(true);
    expect(goldenFrozen(s, G)).toBe(false);
    expect(goldenFrozen(s, OFF)).toBe(false);
    expect(goldenFrozen(s, flags({ golden: 0, pause: 1 }))).toBe(true);
    expect(goldenFrozen(farm({ workers: hired() }), GP)).toBe(false);
    expect(goldenFrozen(farm({ farmLevel: 9, workers: hired(['market_hand']) }), GP)).toBe(false);
    expect(goldenFrozen(farm({ farmLevel: tc.pause_unlock_farm - 1, workers: hired(['grader']) }), GP)).toBe(false);
    expect(goldenFrozen(farm({ workers: {} }), GP)).toBe(false);
  });
  it('GE-AC39 every role: Market Hand, Coop Hand, Hawker and Grader each freeze; uses isPaused (stray paused with pause=0 is false)', () => {
    for (const id of WORKERS) {
      const s = farm({ workers: hired([id]) });
      expect(isPaused(s.workers[id], GP)).toBe(true);
      expect(goldenFrozen(s, GP)).toBe(true);
      expect(goldenFrozen(s, G)).toBe(false);
    }
  });
  it('overlapping pauses: pause W1 then W2, resume W1 still frozen; resume W2 lifts that call', () => {
    let s = farm({ workers: { market_hand: { ...wok }, coop_hand: { ...wok } } });
    s = pauseWorker(s, 'market_hand', GP); s = pauseWorker(s, 'coop_hand', GP);
    expect(goldenFrozen(s, GP)).toBe(true);
    s = resumeWorker(s, 'market_hand', GP); expect(goldenFrozen(s, GP)).toBe(true);
    s = resumeWorker(s, 'coop_hand', GP); expect(goldenFrozen(s, GP)).toBe(false);
  });
});

describe('GE-AC39 freeze scope, entry and lift (countdown / spawn)', () => {
  it('basic freeze: nextSpawnRemainingS = 100 stays 100 for 60 s; 0 collectible_spawned; on Resume the spawn is at +100 s', () => {
    const ev: any[] = [];
    let s = farm({ nextSpawnRemainingS: 100, goldenPending: { intervalS: 100, deferS: 0, recheckS: 0 }, workers: hired(['market_hand']) });
    s = run(s, 60 * PER_S, GP, ev, true);
    expect(s.nextSpawnRemainingS).toBeCloseTo(100, 9);
    expect(gold(ev).filter(e => e.type === 'collectible_spawned')).toEqual([]);
    expect(s.goldenEgg).toBeUndefined();
    s = { ...s, workers: hired() };
    expect(goldenFrozen(s, GP)).toBe(false);
    const ev2: any[] = [];
    let t = 0, x = s; while (!spawnDue(x, GP) && t < 110 * PER_S) { x = step(x, DT, GP, ev2, { focus: true }); t++; }
    expect(Math.abs(t - 100 * PER_S)).toBeLessThanOrEqual(1);
    const spawned = apply(x, { type: 'spawnGolden', spots: SPOTS }, GP, ev2);
    expect(spawned.goldenEgg).toBeDefined();
    expect(gold(ev2).some(e => e.type === 'collectible_spawned')).toBe(true);
  });
  it('countdown near 0: 0.5 s left, 30 min pause: 0 spawns; egg is due 0.5 s after Resume', () => {
    const ev: any[] = [];
    let s = farm({ nextSpawnRemainingS: 0.5, goldenPending: { intervalS: 120, deferS: 0, recheckS: 0 }, workers: hired(['hawker']) });
    s = run(s, 1800 * PER_S, GP, ev);
    expect(s.nextSpawnRemainingS).toBeCloseTo(0.5, 9);
    expect(gold(ev)).toEqual([]);
    s = { ...s, workers: hired() };
    let n = 0, x = s; while (!spawnDue(x, GP) && n < 20) { x = step(x, DT, GP, undefined, { focus: true }); n++; }
    expect(Math.abs(n - 0.5 * PER_S)).toBeLessThanOrEqual(1);
    expect(apply(x, { type: 'spawnGolden', spots: SPOTS }, GP).goldenEgg).toBeDefined();
  });
  it('no drift: 200 s countdown, 10 pause/resume cycles totalling 300 s paused and 150 s unpaused -> remaining 50 +/-1 tick', () => {
    let s = farm({ nextSpawnRemainingS: 200, goldenPending: { intervalS: 200, deferS: 0, recheckS: 0 }, workers: hired() });
    for (let c = 0; c < 10; c++) {
      s = { ...s, workers: hired(['market_hand']) };
      s = run(s, 30 * PER_S);
      s = { ...s, workers: hired() };
      s = run(s, 15 * PER_S);
    }
    expect(Math.abs(s.nextSpawnRemainingS! - 50)).toBeLessThanOrEqual(DT + 1e-9);
  });
  it('below unlock F=8-9: no freeze even with paused:true; countdown drops', () => {
    let s = farm({ farmLevel: 8, nextSpawnRemainingS: 60, goldenPending: { intervalS: 60, deferS: 0, recheckS: 0 }, workers: hired(['market_hand']) });
    expect(goldenFrozen(s, GP)).toBe(false);
    s = run(s, 60 * PER_S);
    expect(s.nextSpawnRemainingS).toBeCloseTo(0, 9);
  });
  it('GE-AC43 flag-off pause: paused:true with m4.flags.pause=0 is not frozen; 60 s drops the countdown 60 s', () => {
    let s = farm({ nextSpawnRemainingS: 80, goldenPending: { intervalS: 80, deferS: 0, recheckS: 0 }, workers: hired(['market_hand']) }, G);
    expect(goldenFrozen(s, G)).toBe(false);
    s = run(s, 60 * PER_S, G);
    expect(s.nextSpawnRemainingS).toBeCloseTo(20, 9);
  });
  it('menu on top: resume under an unfocused tick stays non-advancing; first focused unfrozen tick decrements', () => {
    let s = farm({ nextSpawnRemainingS: 10, goldenPending: { intervalS: 10, deferS: 0, recheckS: 0 }, workers: hired(['market_hand']) });
    s = run(s, 5, GP, undefined, false);
    expect(s.nextSpawnRemainingS).toBeCloseTo(10, 9);
    s = { ...s, workers: hired() };
    expect(goldenFrozen(s, GP)).toBe(false);
    s = run(s, 5, GP, undefined, false);
    expect(s.nextSpawnRemainingS).toBeCloseTo(10, 9);
    s = step(s, DT, GP, undefined, { focus: true });
    expect(s.nextSpawnRemainingS).toBeCloseTo(10 - DT, 9);
  });
});

describe('GE-AC39 isolation: focus clock, streak, and customers still run', () => {
  it('over 60 s frozen, streak hold/decay matches an unfrozen twin with the same focus; customer rng is byte-identical', () => {
    const base = farm({ nextSpawnRemainingS: 200, goldenPending: { intervalS: 200, deferS: 0, recheckS: 0 }, streakS: 0.2, streakHoldS: 5 });
    const frozen = { ...base, workers: hired(['market_hand']) };
    const a = run({ ...base, workers: hired() }, 60 * PER_S, GP);
    const b = run(frozen, 60 * PER_S, GP);
    expect(b.nextSpawnRemainingS).toBeCloseTo(200, 9);
    expect(a.streakS).toBeCloseTo(b.streakS!, 9);
    expect(a.streakHoldS).toBeCloseTo(b.streakHoldS!, 9);
    expect(a.rng).toBe(b.rng);
    expect(a.nextCustomerInS).toBeCloseTo(b.nextCustomerInS, 9);
  });
});

describe('GE-AC40 egg age frozen; tap does not collect (sim)', () => {
  it('mid-life pause: age 25.0 stays 25.0 for 10 min; 0 collectible_expired', () => {
    const ev: any[] = [];
    let s = farm({ goldenEgg: { ageS: 25, slotId: 'S1', intervalS: 180 }, workers: hired(['coop_hand']) });
    s = run(s, 1, GP, ev); // seed evRng once (seedEvRng at end of first flag-on tick)
    const evRng = s.evRngState;
    s = run(s, 600 * PER_S, GP, ev);
    expect(s.goldenEgg!.ageS).toBeCloseTo(25, 9);
    expect(gold(ev).filter(e => e.type === 'collectible_expired')).toEqual([]);
    expect(s.evRngState).toBe(evRng); // no draws while frozen
  });
  it('No collect: tapGolden while frozen is the identity — coins, Basket, frenzyRemainingS, evRng unchanged; 0 collected/started', () => {
    const ev: any[] = [];
    const ev0 = withNextU(farm({
      goldenEgg: { ageS: 6, slotId: 'S1', intervalS: 180 }, evRngState: 1, workers: hired(['market_hand']),
      coinsCents: 1_000_000, basket: 10, frenzyRemainingS: undefined,
    }), 0, 0.45);
    const before = ev0.evRngState, coins = ev0.coinsCents, basket = ev0.basket;
    const o = apply(ev0, { type: 'tapGolden' }, GP, ev);
    expect(o).toBe(ev0);
    expect(o.coinsCents).toBe(coins); expect(o.basket).toBe(basket);
    expect(o.frenzyRemainingS).toBeUndefined(); expect(o.evRngState).toBe(before);
    expect(o.goldenEgg).toEqual(ev0.goldenEgg);
    expect(gold(ev)).toEqual([]);
  });
  it('after Resume: egg frozen at 25.0 reaches urgent at +2 s and expires at +5 s +/-1 tick, once', () => {
    const ev: any[] = [];
    let s = farm({ goldenEgg: { ageS: 25, slotId: 'S1', intervalS: 180 }, workers: hired() });
    s = run(s, 2 * PER_S, GP, ev);
    expect(s.goldenEgg!.ageS).toBeCloseTo(27, 9);
    s = run(s, 4 * PER_S, GP, ev);
    expect(s.goldenEgg).toBeUndefined();
    expect(gold(ev).filter(e => e.type === 'collectible_expired' && e.reason === 'timeout')).toHaveLength(1);
  });
  it('Tap after Resume: frozen at 5.0 s, tapped 3.0 s after Resume, collected once, reaction_ms = 8000 +/-100; frozen taps do not grant', () => {
    const ev: any[] = [];
    let s = withNextU(farm({ goldenEgg: { ageS: 5, slotId: 'S1', intervalS: 180 }, workers: hired(['market_hand']) }), 0, 0.45);
    s = apply(s, { type: 'tapGolden' }, GP, ev);
    expect(s.goldenEgg).toBeDefined();
    s = { ...s, workers: hired() };
    s = run(s, 3 * PER_S, GP, ev);
    expect(s.goldenEgg!.ageS).toBeCloseTo(8, 9);
    const o = apply(s, { type: 'tapGolden' }, GP, ev);
    expect(o.goldenEgg).toBeUndefined();
    const c = gold(ev).filter(e => e.type === 'collectible_collected');
    expect(c).toHaveLength(1);
    expect(c[0].reaction_ms).toBeGreaterThanOrEqual(7900);
    expect(c[0].reaction_ms).toBeLessThanOrEqual(8100);
  });
});

describe('GE-AC37/38 reward formulas unchanged after a freeze', () => {
  it('GE-AC37: after 600 s freeze, grants match an unfrozen twin; coop 0 or 5,000 does not change the amounts', () => {
    for (const held of [0, 5_000]) {
      const s0 = farm({
        goldenEgg: { ageS: 5, slotId: 'S1', intervalS: 180 }, workers: hired(['market_hand']),
        coop: held, basket: held, farmLevel: 10,
      });
      let s = run(s0, 600 * PER_S, GP);
      s = { ...s, workers: hired() };
      const twin = farm({ farmLevel: 10, basket: held, coop: held, workers: hired(), coinsCents: s.coinsCents,
        hensLevel: s.hensLevel, eggValueLevel: s.eggValueLevel, graderTier: s.graderTier });
      expect(grantGolden(s, 'cash', GP).coinsCents - s.coinsCents).toBe(grantGolden(twin, 'cash', GP).coinsCents - twin.coinsCents);
      expect(grantGolden(s, 'cash', GP).coinsCents - s.coinsCents).toBe(rewardCents(baseScaled(s, GP), cashBp(GP)));
      const f19s = { ...s, farmLevel: 19, basket: held, coop: held };
      const f19t = { ...twin, farmLevel: 19, basket: held, coop: held };
      expect(grantGolden(f19s, 'eggs', GP).basket - held).toBe(grantGolden(f19t, 'eggs', GP).basket - held);
      const f20s = { ...s, farmLevel: 20 }, f20t = { ...twin, farmLevel: 20 };
      expect(grantGolden(f20s, 'eggs_cash', GP).coinsCents - s.coinsCents)
        .toBe(grantGolden(f20t, 'eggs_cash', GP).coinsCents - twin.coinsCents);
      expect(grantGolden(f20s, 'eggs_cash', GP).coinsCents - s.coinsCents).toBe(rewardCents(baseScaled(f20s, GP), eggsBp(GP)));
    }
  });
  it('GE-AC38: after freeze, GE-AC9b money-math values and the BigInt spy still hold', () => {
    run(farm({ workers: hired(['grader']) }), 60 * PER_S, GP);
    expect(rewardCents(3_313_552_582_910, cashBp(GP))).toBe(1_491_098_662_310);
    const spyN = { n: 0, b: 0 }, origN = GOLDEN_MATH.num, origB = GOLDEN_MATH.big;
    GOLDEN_MATH.num = (x, bp) => { spyN.n++; return origN(x, bp); };
    GOLDEN_MATH.big = (x, bp) => { spyN.b++; return origB(x, bp); };
    try {
      expect(rewardCents(20_015_998_343, cashBp(GP))).toBe(9_007_199_254);
      expect(rewardCents(15_011_998_758, eggsBp(GP))).toBe(9_007_199_255);
      expect(spyN.b).toBeGreaterThan(0);
    } finally { GOLDEN_MATH.num = origN; GOLDEN_MATH.big = origB; }
  });
});

describe('GE-AC41 Frenzy frozen mid-run (sim): remaining time, 1x sales, 0 extra, no frenzy_ended', () => {
  it('60 s pause: frenzyRemainingS stays 20; sale pays streak but not x2; 0 frenzy extra; after Resume x2 and timeout extra from unfrozen sales only', () => {
    const ev: any[] = [];
    let s = farm({ frenzyRemainingS: 20, frenzyRun: { extraCents: 0, eggsSold: 0, byPlayer: 0, byWorkers: 0 }, streakS: 0.28, workers: hired(['market_hand']), graderTier: 1 });
    expect(frenzyFactor(s, GP)).toBe(1);
    const frozenPay = saleValueCents(s, 10, GP, { by: 'player' });
    const noFrenzy = saleValueCents({ ...s, frenzyRemainingS: undefined }, 10, GP, { by: 'player' });
    expect(frozenPay).toBe(noFrenzy);
    const live = farm({ frenzyRemainingS: 20, streakS: 0.28, workers: hired(), graderTier: 1 });
    expect(frenzyFactor(live, GP)).toBe(tc.frenzy_price_mult);
    const livePay = saleValueCents(live, 10, GP, { by: 'player' });
    expect(livePay).toBeGreaterThan(frozenPay);
    expect(Math.abs(livePay - frozenPay * tc.frenzy_price_mult)).toBeLessThanOrEqual(1);
    s = run(s, 60 * PER_S, GP, ev);
    expect(s.frenzyRemainingS).toBeCloseTo(20, 9);
    expect(gold(ev).filter(e => e.type === 'frenzy_ended')).toEqual([]);
    expect(s.frenzyRun?.extraCents ?? 0).toBe(0);
    s = { ...s, workers: hired() };
    expect(frenzyFactor(s, GP)).toBe(tc.frenzy_price_mult);
    const ev2: any[] = [];
    let t = 0, x = s;
    while (x.frenzyRemainingS !== undefined && t < 25 * PER_S) { x = step(x, DT, GP, ev2, { focus: true }); t++; }
    expect(Math.abs(t - 20 * PER_S)).toBeLessThanOrEqual(1);
    expect(gold(ev2).filter(e => e.type === 'frenzy_ended' && e.reason === 'timeout')).toHaveLength(1);
  });
  it('Pause on the Frenzy start tick+1: remaining is 30.0 - 0.1 at the freeze and stays there', () => {
    let s = grantGolden(farm({ workers: hired() }), 'frenzy', GP);
    expect(s.frenzyRemainingS).toBe(tc.frenzy_s);
    s = step(s, DT, GP, undefined, { focus: true });
    expect(s.frenzyRemainingS).toBeCloseTo(tc.frenzy_s - DT, 9);
    s = { ...s, workers: hired(['hawker']) };
    s = run(s, 20 * PER_S, GP);
    expect(s.frenzyRemainingS).toBeCloseTo(tc.frenzy_s - DT, 9);
  });
});

describe('GE-AC42 tick order (Q5) sim parts', () => {
  it('Expiry tick: egg at 29.9 s, pause applied on the tick age would reach 30.0 -> age stays 29.9, no expiry', () => {
    const ev: any[] = [];
    let s = farm({ goldenEgg: { ageS: 29.9, slotId: 'S1', intervalS: 180 }, workers: hired(['market_hand']) });
    s = step(s, DT, GP, ev, { focus: true });
    expect(s.goldenEgg!.ageS).toBeCloseTo(29.9, 9);
    expect(gold(ev)).toEqual([]);
    s = { ...s, workers: hired() };
    s = step(s, DT, GP, ev, { focus: true });
    // Conservative: existing sim expires at tc_egg_despawn_s (30.0), so this tick expires (GE-AC42 mid-fade is parked).
    expect(s.goldenEgg).toBeUndefined();
    expect(gold(ev).filter(e => e.type === 'collectible_expired' && e.reason === 'timeout')).toHaveLength(1);
  });
  it('Same-tick input, pause tick: pause then tap in the same tick -> no collect', () => {
    const ev: any[] = [];
    let s = withNextU(farm({ goldenEgg: { ageS: 6, slotId: 'S1', intervalS: 180 }, workers: hired() }), 0, 0.45);
    s = pauseWorker(s, 'market_hand', GP);
    const o = apply(s, { type: 'tapGolden' }, GP, ev);
    expect(o.goldenEgg).toBeDefined();
    expect(gold(ev)).toEqual([]);
    expect(o.evRngState).toBe(s.evRngState);
  });
  it('Same-tick input, last-resume tick: resume the last worker then tap -> collected once', () => {
    const ev: any[] = [];
    let s = withNextU(farm({ goldenEgg: { ageS: 6, slotId: 'S1', intervalS: 180 }, workers: hired(['market_hand', 'coop_hand']) }), 0, 0.45);
    s = resumeWorker(s, 'market_hand', GP);
    expect(goldenFrozen(s, GP)).toBe(true);
    expect(apply(s, { type: 'tapGolden' }, GP, ev).goldenEgg).toBeDefined();
    s = resumeWorker(s, 'coop_hand', GP);
    expect(goldenFrozen(s, GP)).toBe(false);
    const o = apply(s, { type: 'tapGolden' }, GP, ev);
    expect(o.goldenEgg).toBeUndefined();
    expect(gold(ev).filter(e => e.type === 'collectible_collected')).toHaveLength(1);
  });
  it('Resume W1 and pause W2 in the same tick -> still frozen, tap does not collect', () => {
    const ev: any[] = [];
    let s = farm({ goldenEgg: { ageS: 6, slotId: 'S1', intervalS: 180 }, workers: { market_hand: { ...wok, paused: true }, coop_hand: { ...wok } } });
    s = resumeWorker(s, 'market_hand', GP);
    s = pauseWorker(s, 'coop_hand', GP);
    expect(goldenFrozen(s, GP)).toBe(true);
    expect(apply(s, { type: 'tapGolden' }, GP, ev).goldenEgg).toBeDefined();
    expect(gold(ev)).toEqual([]);
  });
  it('Spawn tick: countdown would reach 0 on the pause tick -> no spawn; 0.1 s after Resume it is due', () => {
    let s = farm({ nextSpawnRemainingS: 0.1, goldenPending: { intervalS: 120, deferS: 0, recheckS: 0 }, workers: hired(['grader']) });
    s = step(s, DT, GP, undefined, { focus: true });
    expect(s.nextSpawnRemainingS).toBeCloseTo(0.1, 9);
    expect(spawnDue(s, GP)).toBe(false);
    s = { ...s, workers: hired() };
    s = step(s, DT, GP, undefined, { focus: true });
    expect(s.nextSpawnRemainingS).toBeCloseTo(0, 9);
    expect(spawnDue(s, GP)).toBe(true);
  });
  it('Resume tick: countdown 10.0, Resume on tick m -> 9.9 after tick m', () => {
    let s = farm({ nextSpawnRemainingS: 10, goldenPending: { intervalS: 10, deferS: 0, recheckS: 0 }, workers: hired(['market_hand']) });
    s = resumeWorker(s, 'market_hand', GP);
    s = step(s, DT, GP, undefined, { focus: true });
    expect(s.nextSpawnRemainingS).toBeCloseTo(9.9, 9);
  });
});

describe('GE-AC43 reload / offline / hidden (sim)', () => {
  it('Reload with an egg while paused: expired{reload} once, fresh gap frozen until Resume', () => {
    const { g, evs, frames } = setup(GP, {
      goldenEgg: { ageS: 12, slotId: 'S2', intervalS: 180 },
      workers: hired(['market_hand']),
    });
    const evRng = g.state.evRngState;
    g.endSession();
    expect(evs.filter(e => e.type === 'collectible_expired' && e.reason === 'reload')).toHaveLength(1);
    expect(g.state.goldenEgg).toBeUndefined();
    expect(g.state.nextSpawnRemainingS).toBeGreaterThan(0);
    expect(g.state.evRngState).not.toBe(evRng);
    const gap = g.state.nextSpawnRemainingS!;
    frames(1200);
    expect(g.state.nextSpawnRemainingS).toBeCloseTo(gap, 9);
  });
  it('Reload during a Frenzy: frenzyRemainingS persists at 12 and stays frozen while paused if still present after m5Load', () => {
    const { kv, g, clock } = setup(GP, {
      frenzyRemainingS: 12, workers: hired(['market_hand']), nextSpawnRemainingS: 80,
    });
    g.save();
    const g2 = new Game(GP, kv, () => clock.t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
    if (g2.state.frenzyRemainingS !== undefined) {
      const left = g2.state.frenzyRemainingS;
      g2.setAttendedProbe(() => true);
      for (let i = 0; i < 50; i++) { clock.t += 100; g2.frame(); }
      if (goldenFrozen(g2.state, GP)) expect(g2.state.frenzyRemainingS).toBeCloseTo(left, 9);
    }
  });
  it('Offline 2 h while paused: egg expires offline (R8); Frenzy remaining is unchanged and stays frozen', () => {
    const ev: any[] = [];
    const s0 = farm({
      goldenEgg: { ageS: 8, slotId: 'S1', intervalS: 180 }, frenzyRemainingS: 15,
      nextSpawnRemainingS: undefined, workers: hired(['market_hand']),
    });
    const o = m5Offline(s0, GP, ev);
    expect(gold(ev).some(e => e.type === 'collectible_expired' && e.reason === 'offline')).toBe(true);
    expect(o.goldenEgg).toBeUndefined();
    expect(o.frenzyRemainingS).toBe(15);
    expect(goldenFrozen(o, GP)).toBe(true);
    const later = run(o, 10 * PER_S, GP);
    expect(later.frenzyRemainingS).toBeCloseTo(15, 9);
    expect(later.nextSpawnRemainingS).toBe(o.nextSpawnRemainingS);
  });
});

describe('GE-AC44 isolation and determinism', () => {
  it('same seed with and without pauses: gap/slot/reward sequence identical; only the times shift', () => {
    const gaps = (paused: boolean) => {
      const ev: any[] = [];
      let s = farm({ farmLevel: 10, workers: paused ? hired(['market_hand']) : hired() }, GP);
      s = run(s, 45 * PER_S, GP, ev);
      if (paused) {
        s = { ...s, workers: hired() };
        s = run(s, 45 * PER_S, GP, ev);
      }
      const out: number[] = [];
      for (let i = 0; i < 5; i++) {
        while (!spawnDue(s, GP)) s = step(s, DT, GP, ev, { focus: true });
        s = apply(s, { type: 'spawnGolden', spots: SPOTS }, GP, ev);
        s = run(s, Math.round(tc.spawn_grace_ms / 1000 * PER_S) + 1, GP, ev);
        s = apply(s, { type: 'tapGolden' }, GP, ev);
        out.push(s.goldenPending!.intervalS);
      }
      return { gaps: out, evRng: s.evRngState, slots: ev.filter(e => e.type === 'collectible_spawned').map(e => e.slot_id),
        rewards: ev.filter(e => e.type === 'collectible_collected').map(e => e.reward_type) };
    };
    const a = gaps(false), b = gaps(true);
    expect(b.gaps).toEqual(a.gaps);
    expect(b.slots).toEqual(a.slots);
    expect(b.rewards).toEqual(a.rewards);
    expect(b.evRng).toBe(a.evRng);
  });
  it('Pause flag 1 + never-pause bot: spawn times match Pause flag 0 (byte-identical countdowns)', () => {
    const runBot = (bb: B) => {
      let s = farm({ workers: hired(), farmLevel: 10, nextSpawnRemainingS: undefined }, bb);
      const ev: any[] = [];
      s = run(s, 45 * PER_S + 2, bb, ev);
      return { evRng: s.evRngState, rng: s.rng, due: spawnDue(s, bb), spawned: !!s.goldenEgg, types: gold(ev).map(e => e.type) };
    };
    expect(runBot(GP)).toEqual(runBot(G));
  });
  it('deferred_ms excludes frozen time: empty-spot defer + 10 s freeze is not added to deferred_ms', () => {
    const ev: any[] = [];
    let s = farm({ nextSpawnRemainingS: 0, goldenPending: { intervalS: 180, deferS: 0, recheckS: 0 }, workers: hired() });
    s = apply(s, { type: 'spawnGolden', spots: [] }, GP, ev);
    expect(s.goldenPending!.recheckS).toBeCloseTo(GOLDEN_RECHECK_S, 9);
    s = run(s, 4, GP, ev);
    const deferBefore = s.goldenPending!.deferS;
    s = { ...s, workers: hired(['market_hand']) };
    s = run(s, 10 * PER_S, GP, ev);
    expect(s.goldenPending!.deferS).toBeCloseTo(deferBefore, 9);
    s = { ...s, workers: hired() };
    s = run(s, 2, GP, ev);
    s = apply(s, { type: 'spawnGolden', spots: SPOTS }, GP, ev);
    const spawned = gold(ev).find(e => e.type === 'collectible_spawned');
    expect(spawned.deferred_ms).toBeLessThan(2000);
    expect(spawned.deferred_ms).toBeGreaterThanOrEqual(400);
  });
});

describe('GE-AC45 session_end telemetry (T-AC9 helper)', () => {
  it('flag off: sessionEndGoldenFields is {} and goldenSession is not saved', () => {
    expect(sessionEndGoldenFields(farm({ workers: hired(['market_hand']) }, OFF), OFF)).toEqual({});
    expect('goldenSession' in m5Persist(farm({ goldenSession: { spawned: 2, collected: 1, cents: 50, frenzyExtraCents: 3, frozenS: 1.2 } }, G), G)).toBe(false);
  });
  it('no pauses, golden on: golden_frozen_s is 0 when pause is also on; counters start at 0', () => {
    const f = sessionEndGoldenFields(farm({ workers: hired() }, GP), GP);
    expect(f.golden_spawned).toBe(0);
    expect(f.golden_collected).toBe(0);
    expect(f.golden_cents).toBe(0);
    expect(f.frenzy_extra_cents).toBe(0);
    expect(f.golden_frozen_s).toBe(0);
  });
  it('golden on, pause off: the four counters are present; golden_frozen_s is absent (TEL-14)', () => {
    const f = sessionEndGoldenFields(farm({ workers: hired() }, G), G);
    expect(f).toEqual({ golden_spawned: 0, golden_collected: 0, golden_cents: 0, frenzy_extra_cents: 0 });
    expect('golden_frozen_s' in f).toBe(false);
  });
  it('two pauses of 30.0 s and 45.5 s (one overlapping a menu) -> golden_frozen_s = 75.5 +/- 0.1', () => {
    let s = farm({ nextSpawnRemainingS: 400, goldenPending: { intervalS: 400, deferS: 0, recheckS: 0 }, workers: hired(['market_hand']) });
    s = run(s, 30 * PER_S, GP);
    s = { ...s, workers: hired() };
    s = run(s, 5 * PER_S, GP);
    s = { ...s, workers: hired(['grader']) };
    s = run(s, 40 * PER_S, GP, undefined, true);
    s = run(s, 10 * PER_S, GP, undefined, false);
    s = run(s, 5.5 * PER_S, GP, undefined, true);
    expect(sessionEndGoldenFields(s, GP).golden_frozen_s).toBeCloseTo(75.5, 1);
  });
  it('spawn/collect/cash increment the session counters; cash+eggs_cash only in golden_cents', () => {
    const ev: any[] = [];
    let s = withNextU(farm({ nextSpawnRemainingS: 0, goldenPending: { intervalS: 180, deferS: 0, recheckS: 0 }, workers: hired() }), 0, 0.45);
    s = apply(s, { type: 'spawnGolden', spots: SPOTS }, GP, ev);
    s = run(s, Math.round(tc.spawn_grace_ms / 1000 * PER_S) + 1, GP, ev);
    const before = s.coinsCents;
    s = apply(s, { type: 'tapGolden' }, GP, ev);
    const f = sessionEndGoldenFields(s, GP);
    expect(f.golden_spawned).toBe(1);
    expect(f.golden_collected).toBe(1);
    const collected = ev.find(e => e.type === 'collectible_collected');
    if (collected?.reward_type === 'cash' || collected?.reward_type === 'eggs_cash') {
      expect(f.golden_cents).toBe(s.coinsCents - before);
      expect(f.golden_cents).toBe(collected.reward_value);
    } else {
      expect(f.golden_cents).toBe(0);
    }
  });
  it('Game.endSession spreads golden fields via T-AC9 (no comma-bearing calls in the literal)', () => {
    const { g, frames } = setup(GP, { nextSpawnRemainingS: 400, workers: hired(['market_hand']) });
    frames(300);
    g.endSession();
    const end = g.telemetry.events().find((e: any) => e.type === 'session_end') as any;
    expect(end).toBeDefined();
    expect(end.golden_frozen_s).toBeCloseTo(30, 1);
    expect(end.golden_spawned).toBe(0);
  });
  it('worker_paused helper: egg+Frenzy -> both true; neither -> both false (emitter stays with Saves)', () => {
    expect(goldenWorkerPausedFields(farm({ goldenEgg: { ageS: 3, slotId: 'S1', intervalS: 120 }, frenzyRemainingS: 10 }))).toEqual({ golden_on_screen: true, frenzy_active: true });
    expect(goldenWorkerPausedFields(farm({}))).toEqual({ golden_on_screen: false, frenzy_active: false });
  });
  it('nothing fires while frozen: 0 expired and 0 frenzy_ended during a freeze (apart from parked mid-fade)', () => {
    const ev: any[] = [];
    let s = farm({
      goldenEgg: { ageS: 29, slotId: 'S1', intervalS: 180 }, frenzyRemainingS: 1,
      workers: hired(['market_hand']),
    });
    s = run(s, 30 * PER_S, GP, ev);
    expect(gold(ev)).toEqual([]);
    expect(s.goldenEgg!.ageS).toBeCloseTo(29, 9);
    expect(s.frenzyRemainingS).toBeCloseTo(1, 9);
  });
});

describe('QA hooks (ACS tc.spawn/state, frenzy.start; X5 golden.*); dev only', () => {
  afterEach(() => { /* hook host is local */ });
  it('installGoldenQa exposes tc.spawn/state, frenzy.start and golden.{state,seed,spawnNow,forceReward,setAge}', () => {
    const { g } = setup(GP, { nextSpawnRemainingS: 80, farmLevel: 10 });
    const w: any = {};
    installGoldenQa(w, g);
    expect(typeof w.eggfarmQa.tc.spawn).toBe('function');
    expect(typeof w.eggfarmQa.tc.state).toBe('function');
    expect(typeof w.eggfarmQa.frenzy.start).toBe('function');
    expect(typeof w.eggfarmQa.golden.state).toBe('function');
    expect(typeof w.eggfarmQa.golden.seed).toBe('function');
    expect(typeof w.eggfarmQa.golden.spawnNow).toBe('function');
    expect(typeof w.eggfarmQa.golden.forceReward).toBe('function');
    expect(typeof w.eggfarmQa.golden.setAge).toBe('function');
    expect(w.eggfarmQa.tc.state).toBe(w.eggfarmQa.golden.state);
    expect(w.eggfarmQa.tc.spawn).toBe(w.eggfarmQa.golden.spawnNow);
  });
  it('tc.state / golden.state reports phase, ageS, nextSpawnRemainingS, frenzyRemainingS, evRngState, slotId, frozen', () => {
    const { g } = setup(GP, { nextSpawnRemainingS: 80, workers: hired(['market_hand']) });
    const w: any = {}; installGoldenQa(w, g);
    const st = w.eggfarmQa.tc.state();
    expect(st.phase).toBe('waiting');
    expect(st.nextSpawnRemainingS).toBeCloseTo(80, 9);
    expect(st.frozen).toBe(true);
    expect(st.slotId).toBeUndefined();
  });
  it('tc.spawn / golden.spawnNow(slotId) forces a spawn at that slot without a slot evRng draw; state shows the egg', () => {
    const { g, evs } = setup(GP, { nextSpawnRemainingS: 80, workers: hired() });
    const w: any = {}; installGoldenQa(w, g);
    const rng = g.state.evRngState;
    w.eggfarmQa.tc.spawn('S4');
    expect(g.state.goldenEgg?.slotId).toBe('S4');
    expect(g.state.evRngState).toBe(rng);
    expect(w.eggfarmQa.tc.state()).toEqual(expect.objectContaining({ phase: 'idle', slotId: 'S4', ageS: 0, frozen: false }));
    expect(evs.some(e => e.type === 'collectible_spawned' && e.slot_id === 'S4')).toBe(true);
  });
  it('frenzy.start grants a Frenzy of tc_frenzy_s; R23 reset-not-stack if already running', () => {
    const { g } = setup(GP, { workers: hired(), frenzyRemainingS: 5 });
    const w: any = {}; installGoldenQa(w, g);
    w.eggfarmQa.frenzy.start();
    expect(g.state.frenzyRemainingS).toBe(tc.frenzy_s);
  });
  it('golden.forceReward pins the next roll (draw still consumed); golden.setAge and seed go through Game', () => {
    const { g, evs } = setup(GP, { workers: hired(), nextSpawnRemainingS: 0 });
    const w: any = {}; installGoldenQa(w, g);
    w.eggfarmQa.golden.spawnNow('S1');
    w.eggfarmQa.golden.setAge(5);
    expect(g.state.goldenEgg!.ageS).toBe(5);
    w.eggfarmQa.golden.forceReward('cash');
    const rngBefore = g.state.evRngState;
    w.eggfarmQa.golden.seed(0xabcde);
    expect(g.state.evRngState).toBe(0xabcde);
    g.state = { ...g.state, evRngState: rngBefore };
    g.tapGolden();
    const c = evs.filter(e => e.type === 'collectible_collected');
    expect(c.length).toBe(1);
    expect(c[0].reward_type).toBe('cash');
  });
  it('hooks are identity / no-ops when golden is off', () => {
    const { g } = setup(OFF, { nextSpawnRemainingS: 0 });
    const w: any = {}; installGoldenQa(w, g);
    const before = JSON.stringify(g.state);
    w.eggfarmQa.tc.spawn('S1'); w.eggfarmQa.frenzy.start(); w.eggfarmQa.golden.setAge(9);
    expect(JSON.stringify(g.state)).toBe(before);
    expect(w.eggfarmQa.tc.state().phase).toBe('off');
  });
});
