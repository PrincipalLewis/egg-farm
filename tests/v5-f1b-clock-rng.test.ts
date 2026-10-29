// v5 F1b (engineering/m5.0-sizing.md §1 F1(a)(b), §12.1 D-C2/D-C3/D-C4, §13 GE-15): evRng isolation from state.rng,
// focus (attended) clock in step()/advance(), wall-clock timers against an injected now.
import { describe, it, expect } from 'vitest';
import { balance } from '../src/config/balance';
import type { M5Flag } from '../src/config/flags';
import { initialState, mixSeed, nextRand, type GameState } from '../src/sim/state';
import { step, advance } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import { EV_RNG_SALT, BR_RNG_SALT, deriveEvRngState, ensureEvRng, evDraw, brDraw, isRngState, pickIndex } from '../src/sim/rng';
import { FOCUS_DT_MAX_S, focusFrameMs, focusTicks, tickClock, wallRemainingMs, wallReady, tickFocusS } from '../src/sim/clock';
import { stepTimers, type TimerSystem } from '../src/sim/timers';

const B = (flags?: Partial<Record<M5Flag, number>>, enabled = 1) => ({ ...balance, m4: { ...balance.m4!, enabled, ...(flags ? { flags: { ...(balance.m4 as any).flags, ...flags } } : {}) } }) as typeof balance;
/** 10 min of 10 Hz play with collects/sells/buys; returns the customer-facing trace + final state. */
function play(b: ReturnType<typeof B>, seed: number, onTick?: (s: GameState) => GameState) {
  let s: GameState = { ...initialState(b, seed), coinsCents: 5_000_000 }; const ev: any[] = [];
  for (let i = 0; i < 6000; i++) {
    s = step(s, 0.1, b, ev, { focus: i % 2 === 0 });
    if (onTick) s = onTick(s);
    if (i % 3 === 0) s = apply(s, { type: 'collect' }, b, ev);
    if (i % 50 === 0) s = apply(s, { type: 'sellAll' }, b, ev);
    if (i % 97 === 0) s = apply(s, { type: 'buyFarm' }, b, ev);
  }
  return { s, ev };
}
const strip = (s: GameState) => { const { evRngState: _e, brRngState: _b, ...rest } = s; return rest; };

describe('F1b evRng / brRng', () => {
  it('derivation matches D-C2 / GE-AC33 (initialState(b,7) at tick 0)', () => {
    const s0 = initialState(balance, 7);
    expect(deriveEvRngState(s0.rng)).toBe(mixSeed((mixSeed(7) ^ EV_RNG_SALT) >>> 0));
    const s1 = step(s0, 0.1, B({ golden: 1 }));
    // first tick: customers may draw state.rng before stepTimers runs, so the seed uses the post-tick rng
    expect(s1.evRngState).toBe(deriveEvRngState(s1.rng));
    expect(isRngState(s1.evRngState)).toBe(true);
  });
  it('seeded once: later ticks never re-read state.rng', () => {
    const b = B({ golden: 1 }); let s = step(initialState(b, 7), 0.1, b); const seed = s.evRngState;
    for (let i = 0; i < 3000; i++) s = step(s, 0.1, b);
    expect(s.evRngState).toBe(seed); // nothing draws yet in F1b; the seed is stable
  });
  it('isolation: golden/broody on + evRng/brRng drawn every tick leaves the customer sequence byte-identical', () => {
    for (const seed of [1, 7, 42]) {
      const off = play(B(), seed);
      const on = play(B({ golden: 1, broody: 1 }), seed, s => { [s] = evDraw(s); [s] = brDraw(s); return s; });
      expect(on.s.rng).toBe(off.s.rng);
      expect(JSON.stringify(strip(on.s))).toBe(JSON.stringify(off.s));
      expect(JSON.stringify(on.ev)).toBe(JSON.stringify(off.ev));
    }
  });
  it('evDraw is xorshift32 from the seed and never touches rng; brDraw never advances evRngState', () => {
    const s = ensureEvRng(initialState(balance, 7)); const e0 = s.evRngState!;
    const [s1, u1] = evDraw(s);
    expect([s1.evRngState, u1]).toEqual(nextRand(e0)); expect(s1.rng).toBe(s.rng);
    const [s2] = brDraw(s1);
    expect(s2.evRngState).toBe(s1.evRngState); expect(s2.brRngState).toBe(nextRand(mixSeed((s1.evRngState! ^ BR_RNG_SALT) >>> 0))[0]);
    expect(s2.rng).toBe(s.rng);
  });
  it('invalid evRngState (0, negative, NaN, > uint32, float) is re-derived; draws refuse an unseeded state', () => {
    for (const bad of [0, -1, NaN, 2 ** 32, 1.5, undefined]) expect(ensureEvRng({ ...initialState(balance, 3), evRngState: bad as any }).evRngState).toBe(deriveEvRngState(initialState(balance, 3).rng));
    expect(() => evDraw(initialState(balance, 3))).toThrow(); expect(() => brDraw(initialState(balance, 3))).toThrow();
  });
  it('flags off (or only non-RNG flags on): no evRngState is ever created', () => {
    expect('evRngState' in play(B(), 5).s).toBe(false);
    expect('evRngState' in play(B({ streak: 1, abilities: 1 }), 5).s).toBe(false);
    expect('evRngState' in play(B({ golden: 1 }, 0), 5).s).toBe(false); // m4.enabled off wins
  });
  it('pickIndex stays in range', () => { expect(pickIndex(0, 8)).toBe(0); expect(pickIndex(0.999999999, 8)).toBe(7); expect(pickIndex(0.5, 6)).toBe(3); });
});

describe('F1b focus (attended) clock', () => {
  const counter: TimerSystem = (s, _dt, f) => ({ ...s, refWarmS: (s.refWarmS ?? 0) + f });
  it('stepTimers advances an M5 timer only on focus ticks', () => {
    let s = initialState(balance, 1);
    s = stepTimers(s, 0.1, balance, { focus: true }, undefined, [counter]);
    s = stepTimers(s, 0.1, balance, { focus: false }, undefined, [counter]);
    s = stepTimers(s, 0.1, balance, undefined, undefined, [counter]);
    expect(s.refWarmS).toBeCloseTo(0.1, 12);
    expect(tickFocusS(0.1)).toBe(0);
  });
  it('focusFrameMs: clamp to 1.0 s, 0 when not attended, non-positive or >= 60 s (§9.1a)', () => {
    expect(FOCUS_DT_MAX_S).toBe(1);
    expect(focusFrameMs(16, true, 60)).toBe(16);
    expect(focusFrameMs(59_000, true, 60)).toBe(1000);
    expect(focusFrameMs(60_000, true, 60)).toBe(0);
    expect(focusFrameMs(500, false, 60)).toBe(0);
    expect(focusFrameMs(-5, true, 60)).toBe(0);
    expect(focusFrameMs(NaN, true, 60)).toBe(0);
  });
  it('D-C3: a 59 s frame gives exactly the first 10 ticks focus (1.0 s), the other 580 suspended', () => {
    const dtMs = 1000 / balance.tickHz, fc = { focusMs: focusFrameMs(59_000, true, 60), nowMs: 123 };
    const n = focusTicks(fc.focusMs, dtMs); expect(n).toBe(10);
    const rec: number[] = []; const sys: TimerSystem = (st, _d, f) => { rec.push(f); return st; };
    let s = initialState(balance, 1);
    for (let i = 0; i < 590; i++) { const c = tickClock(i, n, fc); expect(c.nowMs).toBe(123); s = stepTimers(s, dtMs / 1000, B({ golden: 1 }), c, undefined, [sys]); }
    expect(rec.reduce((a, x) => a + x, 0)).toBeCloseTo(FOCUS_DT_MAX_S, 9);
    expect(rec.slice(0, 10).every(f => f > 0)).toBe(true); expect(rec.slice(10).every(f => f === 0)).toBe(true);
  });
  it('advance(): focus ticks = ceil(focusMs / tick); state equals the clockless run while M5 timers are inert', () => {
    const b = B({ golden: 1 });
    const a = advance(initialState(b, 9), 59_000, 0, b, undefined, { focusMs: 1000, nowMs: 1_000_000 });
    const c = advance(initialState(b, 9), 59_000, 0, b);
    expect(a.ticks).toBe(590); expect(JSON.stringify(a.state)).toBe(JSON.stringify(c.state));
    expect(focusTicks(150, 100)).toBe(2); expect(focusTicks(100, 100)).toBe(1); expect(focusTicks(0, 100)).toBe(0);
  });
  it('flags off: step with any clock == step without one (byte-identical sim)', () => {
    let x = { ...initialState(balance, 4), coinsCents: 1e6 }, y = x;
    for (let i = 0; i < 2000; i++) { x = step(x, 0.1, balance, undefined, { focus: true, nowMs: i }); y = step(y, 0.1, balance); }
    expect(JSON.stringify(x)).toBe(JSON.stringify(y));
  });
});

describe('F1b wall-clock timers (injected now)', () => {
  it('remaining ms against now, clamped to [0, cap] on every read (abilities E2b)', () => {
    expect(wallRemainingMs(10_000, 4_000, 300_000)).toBe(6_000);
    expect(wallRemainingMs(10_000, 12_000, 300_000)).toBe(0);
    expect(wallRemainingMs(10_000_000, 0, 300_000)).toBe(300_000); // clock went back: capped at one cooldown
    expect(wallRemainingMs(undefined, 0, 300_000)).toBe(0);
    expect(wallRemainingMs(NaN, 0, 300_000)).toBe(0);
    expect(wallReady(5_000, 5_000, 300_000)).toBe(true); expect(wallReady(5_001, 5_000, 300_000)).toBe(false);
  });
});

import { Game } from '../src/game';
import { mem } from './helpers';
describe('F1b Game wiring (attended probe)', () => {
  const T0 = Date.UTC(2026, 9, 29, 12);
  const run = (attended: boolean) => {
    let t = T0, calls = 0; const g = new Game(balance, mem(), () => t, 7);
    g.setAttendedProbe(() => { calls++; return attended; });
    for (let i = 0; i < 120; i++) { t += 500; g.frame(); }
    t += 61_000; g.frame(); // a >= 60 s visible gap: no focus (§9.1a)
    const v = JSON.parse(JSON.stringify(g.state)); delete v.v6BackupId; return { v, calls };
  };
  it('visible frames read the probe; flags off: attended or not, the game state is identical', () => {
    const a = run(true), b = run(false);
    expect(a.calls).toBeGreaterThanOrEqual(120); expect(a.v).toEqual(b.v);
  });
});
