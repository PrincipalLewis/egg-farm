// v5 session-rotation hook: Game calls sim/session.ts resetSessionFields per TEL-AC1 rotation,
// after A1 (session_end, then session_summary), never in a frozen tab (R7), never on a hide < 60 s.
// The visibilitychange path also resets a distinct hide snapshot (the state settleHiddenPeriod
// restores). The R6 bfcache pageshow path calls it once. Extension point for clockWage / Refill.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { balance as b } from '../src/config/balance';
import type { Balance } from '../src/config/balance';
import { Game } from '../src/game';
import * as session from '../src/sim/session';
import { M5_SESSION_FIELDS } from '../src/sim/m5-state';
import { pauseWorker, resumeWorker, pauseSessionEnd, resetPausedSession, pausedDurationS } from '../src/sim/pause';
import type { SimEvent } from '../src/sim/events';
import { sessionEndPresentFields, resetPresentSession } from '../src/sim/breeds-traits';
import { sessionEndBreedsFields } from '../src/telemetry/breeds-session';
import { mem } from './helpers';

const T0 = Date.UTC(2026, 10, 10, 12);
function setup() {
  const kv = mem(); let t = T0; const clock = { get t() { return t; }, set t(v) { t = v; } };
  const g = new Game(b, kv, () => t, 7); g.state = { ...g.state, farmLevel: 15, coop: 51 };
  for (let i = 0; i < 20; i++) { t += 1000; g.frame(); }
  g.save();
  // session_summary is a Generalist producer (optional). Install one so A1 order is observable.
  g.telemetry.sessionSummary = () => ({ counts: {} });
  return { kv, g, clock };
}
const evs = (g: Game) => g.telemetry.events().filter(e => !e.legacy);
const hide = (g: Game, clock: { t: number }, ms: number) => { g.onHidden(clock.t); clock.t += ms; g.frame(); };
const withFlags = (flags: Record<string, number>): Balance =>
  ({ ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, ...flags } } }) as Balance;
const W = (extra: object = {}) => ({ energy: 80, cdS: 1.5, ...extra });

describe('resetSessionFields (session rotation hook)', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('is a no-op on current GameState (flag-off byte-identical; page-lifetime M5_SESSION_FIELDS stay)', () => {
    const { g } = setup();
    const before = { ...g.state, irefRingCents: [1, 2], streakS: 3.5 };
    const snapshot = structuredClone(before);
    session.resetSessionFields(before);
    expect(before).toEqual(snapshot);
    // Page-lifetime fields stay on the strip-on-save registry; this hook must not start wiping them.
    for (const k of ['goldenEgg', 'streakS', 'streakHoldS', 'tapCreditCdS', 'irefRingCents', 'refWarmS', 'broodyNestScaled', 'brRngState'] as const)
      expect(M5_SESSION_FIELDS).toContain(k);
  });

  it('resetSessionFields zeros session pause aggregates and present totals; keeps per-worker duration and page-lifetime fields', () => {
    const { g } = setup();
    const before = { ...g.state, irefRingCents: [1, 2], streakS: 3.5,
      pausedForS: { hawker: 1_000, sumS: 5_000, allS: 2_000 },
      breedsCalm: { focusMs: 9, stamps: [1], pendingCount: 2, activeMs: 8_000, lostCount: 4, open: false } };
    session.resetSessionFields(before);
    expect(before.pausedForS).toEqual({ hawker: 1_000 });
    expect(before.breedsCalm).toEqual({ focusMs: 9, stamps: [1], pendingCount: 2, activeMs: 0, lostCount: 0, open: false });
    expect(before.streakS).toBe(3.5);
    expect(before.irefRingCents).toEqual([1, 2]);
    const ref = before.pausedForS;
    session.resetSessionFields(before); // idempotent: no second subtract, same per-worker object
    expect(before.pausedForS).toBe(ref);
    expect(before.pausedForS).toEqual({ hawker: 1_000 });
    expect(before.breedsCalm).toEqual({ focusMs: 9, stamps: [1], pendingCount: 2, activeMs: 0, lostCount: 0, open: false });
  });

  it('resetPausedSession / resetPresentSession are no-ops when those fields are absent', () => {
    const { g } = setup();
    const s = { ...g.state };
    const snap = structuredClone(s);
    resetPausedSession(s);
    resetPresentSession(s);
    expect(s).toEqual(snap);
  });

  it('resetPausedSession drops pausedForS when only sumS/allS remain', () => {
    const { g } = setup();
    const s = { ...g.state, pausedForS: { sumS: 5_000, allS: 2_000 } };
    resetPausedSession(s);
    expect(s.pausedForS).toBeUndefined();
    resetPausedSession(s);
    expect(s.pausedForS).toBeUndefined();
  });

  it('rotation (hide >= 60 s then shown): called twice on distinct objects, after session_end and session_summary, before session_start{resume}', () => {
    const { g, clock } = setup();
    const orig = session.resetSessionFields;
    const spy = vi.spyOn(session, 'resetSessionFields').mockImplementation((s) => {
      const types = evs(g).map(e => e.type);
      const iEnd = types.lastIndexOf('session_end');
      const iSum = types.lastIndexOf('session_summary');
      expect(iEnd).toBeGreaterThanOrEqual(0);
      expect(iSum).toBe(iEnd + 1);
      expect(evs(g).some(e => e.type === 'session_start' && e.reason === 'resume')).toBe(false);
      orig(s);
    });
    hide(g, clock, 60_000); g.onShown(clock.t);
    expect(spy).toHaveBeenCalledTimes(2);
    const a = spy.mock.calls[0][0];
    const b = spy.mock.calls[1][0];
    expect(a).not.toBe(b);
    // first: provisional pre-grant this.state; second: the hide snapshot settleHiddenPeriod restores.
    const types = evs(g).map(e => e.type);
    const iEnd = types.lastIndexOf('session_end');
    expect(types[iEnd]).toBe('session_end');
    expect(types[iEnd + 1]).toBe('session_summary');
    expect(types[iEnd + 2]).toBe('session_start');
    expect(evs(g)[iEnd + 2]).toMatchObject({ reason: 'resume' });
  });

  it('rotation: the reset reaches the state that survives the offline grant (hide snapshot restored by settleHiddenPeriod)', () => {
    const { g, clock } = setup();
    type Tagged = { __sess?: number };
    vi.spyOn(session, 'resetSessionFields').mockImplementation((s) => { delete (s as Tagged).__sess; });
    g.state = { ...g.state, __sess: 1 } as typeof g.state; // a session-only counter, present at the hide
    hide(g, clock, 120_000); g.onShown(clock.t);
    expect((g.state as Tagged).__sess).toBeUndefined();
  });

  it('hide < 60 s does not call the hook and does not rotate', () => {
    const { g, clock } = setup();
    const spy = vi.spyOn(session, 'resetSessionFields');
    const sid = g.telemetry.clock.sid;
    hide(g, clock, 59_900); g.onShown(clock.t);
    expect(spy).not.toHaveBeenCalled();
    expect(g.telemetry.clock.sid).toBe(sid);
    expect(evs(g).filter(e => e.type === 'session_end')).toHaveLength(0);
  });

  it('R7: a frozen (inactive / read-only / resetting) tab never calls the hook on a long hide', () => {
    for (const freeze of [
      (g: Game) => { g.inactive = true; },
      (g: Game) => { g.readOnly = true; },
      (g: Game) => { g.resetting = true; },
    ]) {
      const { g, clock } = setup();
      const spy = vi.spyOn(session, 'resetSessionFields');
      const sid = g.telemetry.clock.sid;
      freeze(g);
      hide(g, clock, 120_000); g.onShown(clock.t);
      expect(spy).not.toHaveBeenCalled();
      expect(g.telemetry.clock.sid).toBe(sid);
      expect(evs(g).filter(e => e.type === 'session_end')).toHaveLength(0);
      vi.restoreAllMocks();
    }
  });

  it('R6 bfcache: pagehide then pageshow{persisted} calls the hook once (not on pagehide, once on pageshow; a following onShown is a no-op)', () => {
    const { g, clock } = setup();
    const orig = session.resetSessionFields;
    const spy = vi.spyOn(session, 'resetSessionFields').mockImplementation((s) => {
      const types = evs(g).map(e => e.type);
      const iEnd = types.lastIndexOf('session_end');
      const iSum = types.lastIndexOf('session_summary');
      expect(iEnd).toBeGreaterThanOrEqual(0);
      expect(iSum).toBe(iEnd + 1);
      expect(evs(g).some(e => e.type === 'session_start' && e.reason === 'resume')).toBe(false);
      orig(s);
    });
    g.onHidden(clock.t); g.endSession(); // pagehide: session_end{unload} — not a rotation
    expect(spy).not.toHaveBeenCalled();
    clock.t += 5_000;
    g.onPageShow(clock.t); // R6
    expect(spy).toHaveBeenCalledTimes(1);
    g.onShown(clock.t); // visibilitychange visible after pageshow — hiddenAt is already null
    expect(spy).toHaveBeenCalledTimes(1);
    expect(evs(g).filter(e => e.type === 'session_start' && e.reason === 'resume')).toHaveLength(1);
  });

  it('R7: endSession skips a readOnly / frozen tab (no session_end)', () => {
    const cases: [string, (g: Game, clock: { t: number }) => void][] = [
      ['readOnly', (g) => { g.readOnly = true; }],
      ['inactive', (g) => { g.inactive = true; }],
      ['resetting', (g) => { g.resetting = true; }],
      ['held', (g, clock) => { g.holdUntil = clock.t + 10_000; }],
    ];
    for (const [label, freeze] of cases) {
      const { g, clock } = setup();
      for (let i = 0; i < 3; i++) g.dispatch({ type: 'collect' });
      const sid = g.telemetry.clock.sid;
      freeze(g, clock);
      g.endSession();
      expect(evs(g).filter(e => e.type === 'session_end'), label).toHaveLength(0);
      expect(g.telemetry.clock.ended, label).toBe(false);
      expect(g.telemetry.clock.sid, label).toBe(sid);
    }
  });

  it('rotation: every session_end field in session 2 counts only session 2 (hide >= 60 s between sessions)', () => {
    // CCR MAJOR-1 / telemetry-spec L175 per-session counters, L94 reset on rotation: pause, present and
    // the rest of session_end must not carry session 1 totals into sid 2.
    const bb = withFlags({ pause: 1, breeds: 1, streak: 1, tapCoins: 1, rc2Refill: 0 });
    const kv = mem(); let t = T0; const clock = { get t() { return t; }, set t(v) { t = v; } };
    const g = new Game(bb, kv, () => t, 7);
    const workers = { hawker: W(), grader: W(), coop_hand: W() };
    g.state = { ...g.state, farmLevel: 15, coop: 51, workers,
      breedsCalm: { focusMs: 5_000, stamps: [100], pendingCount: 0, activeMs: 5_000, lostCount: 3, open: true } };
    g.state = pauseWorker(g.state, 'hawker', bb);
    g.state = pauseWorker(g.state, 'grader', bb);
    g.state = pauseWorker(g.state, 'coop_hand', bb);
    g.debugAdvance(100_000);
    expect(pauseSessionEnd(g.state, bb)).toEqual({ paused_worker_s: 300, all_paused_s: 100 });
    expect(sessionEndPresentFields(g.state, bb)).toEqual({ present_active_s: 5, present_lost_count: 3 });
    for (let i = 0; i < 4; i++) g.dispatch({ type: 'collect' });

    hide(g, clock, 61_000); g.onShown(clock.t);

    // Session aggregates are zeroed; per-worker pause durations are kept (MAJOR-2).
    expect(pauseSessionEnd(g.state, bb)).toEqual({ paused_worker_s: 0, all_paused_s: 0 });
    expect(g.state.pausedForS?.sumS).toBeUndefined();
    expect(g.state.pausedForS?.allS).toBeUndefined();
    expect(pausedDurationS(g.state, 'hawker')).toBe(100);
    expect(pausedDurationS(g.state, 'grader')).toBe(100);
    expect(pausedDurationS(g.state, 'coop_hand')).toBe(100);
    expect(sessionEndPresentFields(g.state, bb)).toEqual({ present_active_s: 0, present_lost_count: 0 });
    expect(g.state.breedsCalm?.activeMs ?? 0).toBe(0);
    expect(g.state.breedsCalm?.lostCount ?? 0).toBe(0);

    const ends1 = evs(g).filter(e => e.type === 'session_end');
    expect(ends1).toHaveLength(1);
    const e1 = ends1[0]!;
    expect(e1.paused_worker_s).toBeGreaterThanOrEqual(300);
    expect(e1.all_paused_s).toBeGreaterThanOrEqual(100);
    expect(e1.present_lost_count).toBeGreaterThanOrEqual(3);
    expect(e1.taps_total).toBe(4);
    expect(e1.farm_level).toBe(15);
    expect(e1.coop_hand).toBe(true);

    // Session 2: different known activity — one paused worker for 7 s, present 1.0 s / lost 1, 2 taps, F16, no Coop Hand.
    g.state = resumeWorker(g.state, 'grader', bb);
    g.state = resumeWorker(g.state, 'coop_hand', bb);
    const { coop_hand: _ch, ...hired } = g.state.workers;
    const calm = g.state.breedsCalm ?? { focusMs: 0, stamps: [], pendingCount: 0, activeMs: 0, lostCount: 0, open: true };
    g.state = { ...g.state, farmLevel: 16, coop: 10, workers: hired,
      breedsCalm: { ...calm, activeMs: 1_000, lostCount: 1 } };
    g.debugAdvance(7_000);
    expect(pauseSessionEnd(g.state, bb)).toEqual({ paused_worker_s: 7, all_paused_s: 0 });
    expect(sessionEndPresentFields(g.state, bb)).toEqual({ present_active_s: 1, present_lost_count: 1 });
    for (let i = 0; i < 2; i++) g.dispatch({ type: 'collect' });
    clock.t += 4_000;
    const breedsEnd = sessionEndBreedsFields(g.state, bb); // #127: breeds=1 (needed for present_*) also emits breed_*
    g.endSession();

    const ends = evs(g).filter(e => e.type === 'session_end');
    expect(ends).toHaveLength(2);
    const e2 = ends[1]!;
    expect(e2.sid).not.toBe(e1.sid);
    expect(e2).toMatchObject({
      reason: 'unload',
      taps_total: 2,
      taps_moved_eggs: 2,
      farm_level: 16,
      coop_hand: false,
      paused_worker_s: 7,
      all_paused_s: 0,
      present_active_s: 1,
      present_lost_count: 1,
      credited_taps: 1,
      tap_bonus_cents: 5,
      empty_credited: 0,
      fg_ms: 4_000,
      fgMs: 4_000,
    });
    // Cover every emitted session_end field, not just taps_total. Counters (incl. credited_*) are constants, not a live ses snapshot (NIT-2).
    const counters: Record<string, unknown> = {
      taps_total: 2,
      taps_moved_eggs: 2,
      farm_level: 16,
      coop_hand: false,
      paused_worker_s: 7,
      all_paused_s: 0,
      present_active_s: 1,
      present_lost_count: 1,
      credited_taps: 1,
      tap_bonus_cents: 5,
      empty_credited: 0,
      fg_ms: 4_000,
      reason: 'unload',
      ...breedsEnd,
    };
    for (const k of Object.keys(e2)) {
      if (k === 'type' || k === 'ts' || k === 'sid' || k === 'fgMs') continue;
      expect(k in counters, `unexpected session_end field ${k}`).toBe(true);
      expect(e2[k], k).toEqual(counters[k]);
    }
  });

  it('rotation: a pause that spans the rotate reports the full paused_duration_s; session 2 pause fields count only session 2', () => {
    // Rule (cited): paused_duration_s is the per-pause duration, not a session counter
    // (src/sim/events.ts worker_resumed; pausedDurationS, emitted by resumeWorker). It is
    // floorMsToS(pausedForS[id]) of integer sim ms. tickPausedFor increments each
    // still-paused worker's entry and, separately, the session aggregates sumS / allS. Hidden gaps
    // >= offlineMinSeconds are not sim time: settleHiddenPeriod restores the hide snapshot
    // and grantOffline pays the gap, so tickPausedFor does not run on the
    // kept state for that gap (pause.ts: "offline time and hidden gaps >= 60 s are not counted
    // (sim time only)"; AC-P13). Therefore a pause of A s before a hide >= 60 s and B s after
    // show has paused_duration_s == A + B, and session 2's paused_worker_s / all_paused_s == B only.
    const A = 100, B = 7;
    const bb = withFlags({ pause: 1, rc2Refill: 0 });
    const kv = mem(); let t = T0; const clock = { get t() { return t; }, set t(v) { t = v; } };
    const g = new Game(bb, kv, () => t, 7);
    g.state = { ...g.state, farmLevel: 15, workers: { hawker: W() } };
    g.state = pauseWorker(g.state, 'hawker', bb);
    g.debugAdvance(A * 1000);
    expect(pauseSessionEnd(g.state, bb)).toEqual({ paused_worker_s: A, all_paused_s: A });
    expect(pausedDurationS(g.state, 'hawker')).toBe(A);

    hide(g, clock, 61_000); g.onShown(clock.t);

    expect(pauseSessionEnd(g.state, bb)).toEqual({ paused_worker_s: 0, all_paused_s: 0 });
    expect(pausedDurationS(g.state, 'hawker')).toBe(A);

    g.debugAdvance(B * 1000);
    expect(pauseSessionEnd(g.state, bb)).toEqual({ paused_worker_s: B, all_paused_s: B });
    expect(pausedDurationS(g.state, 'hawker')).toBe(A + B);

    const ev: SimEvent[] = [];
    g.state = resumeWorker(g.state, 'hawker', bb, ev);
    expect(ev).toEqual([expect.objectContaining({ type: 'worker_resumed', worker: 'hawker', cause: 'manual', paused_duration_s: A + B })]);

    g.endSession();
    const e2 = evs(g).filter(e => e.type === 'session_end').at(-1)!;
    expect(e2).toMatchObject({ paused_worker_s: B, all_paused_s: B });
  });
});
