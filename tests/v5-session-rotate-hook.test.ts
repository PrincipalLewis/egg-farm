// v5 session-rotation hook: Game calls sim/session.ts resetSessionFields exactly once per TEL-AC1
// rotation, after A1 (session_end, then session_summary), never in a frozen tab (R7), never on a
// hide < 60 s; the R6 bfcache pageshow path calls it once. Extension point for clockWage / Refill.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import * as session from '../src/sim/session';
import { M5_SESSION_FIELDS } from '../src/sim/m5-state';
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

  it('rotation (hide >= 60 s then shown): called once, after session_end and session_summary, before session_start{resume}', () => {
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
    expect(spy).toHaveBeenCalledTimes(1);
    // onShown then runs the offline grant, which replaces g.state — the hook saw the pre-grant object.
    const types = evs(g).map(e => e.type);
    const iEnd = types.lastIndexOf('session_end');
    expect(types[iEnd]).toBe('session_end');
    expect(types[iEnd + 1]).toBe('session_summary');
    expect(types[iEnd + 2]).toBe('session_start');
    expect(evs(g)[iEnd + 2]).toMatchObject({ reason: 'resume' });
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
});
