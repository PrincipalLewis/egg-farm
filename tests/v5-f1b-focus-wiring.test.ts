// v5 F1b focus wiring (Saves QA V5SCAP gaps 2/3 on #79): which ticks really get focus, observed at the stepTimers() seam.
// The module mock wraps the real stepTimers and records each tick's focus seconds (tickFocusS); behaviour is unchanged.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { balance } from '../src/config/balance';
import type { M5Flag } from '../src/config/flags';
import { initialState } from '../src/sim/state';
import { advance } from '../src/sim/tick';
import { FOCUS_DT_MAX_S, focusFrameMs } from '../src/sim/clock';
import { Game } from '../src/game';
import { mem } from './helpers';

const rec = vi.hoisted(() => ({ f: [] as number[] }));
vi.mock('../src/sim/timers', async (orig) => {
  const m = await orig<typeof import('../src/sim/timers')>(); const c = await import('../src/sim/clock');
  return { ...m, stepTimers: (...a: Parameters<typeof m.stepTimers>) => { rec.f.push(c.tickFocusS(a[1], a[3])); return m.stepTimers(...a); } };
});
const B = (flags?: Partial<Record<M5Flag, number>>) => ({ ...balance, m4: { ...balance.m4!, enabled: 1, ...(flags ? { flags } : {}) } }) as typeof balance;
const sum = (xs: number[]) => xs.reduce((a, x) => a + x, 0);
beforeEach(() => { rec.f.length = 0; });

describe('F1b advance(): D-C3 focus ticks', () => {
  it('[D-C3][F1(b)] a 59 s frame with focusMs 1000 gives focus to exactly the first 10 of 590 ticks (sum 1.0 s), through advance()', () => {
    const b = B({ golden: 1 });
    const r = advance(initialState(b, 9), 59_000, 0, b, undefined, { focusMs: focusFrameMs(59_000, true, 60), nowMs: 1_000_000 });
    expect(r.ticks).toBe(590); expect(rec.f.length).toBe(590);
    expect(rec.f.slice(0, 10).every(f => f > 0)).toBe(true); expect(rec.f.slice(10).every(f => f === 0)).toBe(true);
    expect(sum(rec.f)).toBeCloseTo(FOCUS_DT_MAX_S, 9);
  });
});

describe('F1b Game: focus only on a visible, attended, live frame (flag on)', () => {
  const T0 = Date.UTC(2026, 9, 29, 12);
  const mk = () => { const c = { t: T0 }; const g = new Game(B({ golden: 1 }), mem(), () => c.t, 7); g.setAttendedProbe(() => true); return { g, c }; };
  const frames = (g: Game, c: { t: number }, n = 20) => { for (let i = 0; i < n; i++) { c.t += 500; g.frame(); } };
  it('[F1(b)] visible attended frames: focus > 0 (control)', () => {
    const { g, c } = mk(); frames(g, c); expect(rec.f.length).toBeGreaterThan(0); expect(sum(rec.f)).toBeGreaterThan(0);
  });
  it('[F1(b)][R5c] read-only game: ticks run, focus is 0', () => {
    const { g, c } = mk(); g.readOnly = true; frames(g, c); expect(rec.f.length).toBeGreaterThan(0); expect(sum(rec.f)).toBe(0);
  });
  it('[F1(b)] hidden frames: ticks run, focus is 0', () => {
    const { g, c } = mk(); g.onHidden(c.t); rec.f.length = 0; frames(g, c); expect(rec.f.length).toBeGreaterThan(0); expect(sum(rec.f)).toBe(0);
  });
  it('[F1(b)] settleHiddenPeriod (gap < 60 s, uncovered time simulated): focus is 0', () => {
    const { g, c } = mk(); g.onHidden(c.t); rec.f.length = 0; c.t += 30_000;
    const r = g.settleHiddenPeriod(c.t); expect(r.mode).toBe('online'); expect(rec.f.length).toBeGreaterThan(0); expect(sum(rec.f)).toBe(0);
  });
  it('[F1(b)] debugAdvance: focus is 0', () => {
    const { g } = mk(); g.debugAdvance(5_000); expect(rec.f.length).toBeGreaterThan(0); expect(sum(rec.f)).toBe(0);
  });
});
