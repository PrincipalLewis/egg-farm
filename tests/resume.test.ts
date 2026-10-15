import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { apply } from '../src/sim/actions';
import { initialState } from '../src/sim/state';
import { mem } from './helpers';
const mk = () => { const c = { t: 1_000_000 }; const g = new Game(b, mem(), () => c.t); return { g, c }; };
describe('coop float + whole-egg collect', () => {
  it('keeps fraction after tap; collects only whole eggs', () => {
    const s = apply({ ...initialState(b), coop: 3.7 }, { type: 'collect' }, b);
    expect(s.basket).toBe(3); expect(s.coop).toBeCloseTo(0.7, 9);
    const s2 = apply({ ...initialState(b), coop: 0.9 }, { type: 'collect' }, b); expect(s2.basket).toBe(0); expect(s2.coop).toBeCloseTo(0.9, 9);
  });
});
describe('wall-clock resume', () => {
  it('tick uses wall-clock time, not frame count (throttled frames)', () => {
    const { g, c } = mk(); c.t += 2500; g.frame(); expect(g.state.coop).toBeCloseTo(2.5, 6);
  });
  it('gap < 60s catches up at full online rate', () => {
    const { g, c } = mk(); c.t += 30_000; g.frame(); expect(g.state.coop).toBeCloseTo(30, 6); expect(g.state.pendingOfflineEggs).toBe(0);
  });
  it('gap < 60s catch-up is capped at coop capacity', () => {
    const { g, c } = mk(); c.t += 59_000; g.frame(); expect(g.state.coop).toBe(50); expect(g.state.basket).toBe(0);
  });
  it('in-session gap >= 60s (hidden tab) simulates none and grants nothing; sim frozen', () => {
    const { g, c } = mk(); c.t += 5000; g.frame(); const before = structuredClone(g.state);
    c.t += 600_000; g.frame(); expect(g.state).toEqual(before); expect(g.state.pendingOfflineEggs).toBe(0);
    c.t += 1000; g.frame(); expect(g.state.coop).toBeCloseTo(before.coop + 1, 6); // resumes where it left off
  });
  it('hidden time counts as offline only when the tab is then closed (last save -> next load)', () => {
    const kv = mem(); const c = { t: 0 }; const g = new Game(b, kv, () => c.t); c.t = 2000; g.frame(); g.save(); // e.g. visibilitychange->hidden
    c.t = 2000 + 600_000; const g2 = new Game(b, kv, () => c.t); expect(g2.state.pendingOfflineEggs).toBe(300);
  });
  it('negative wall-clock gap grants nothing', () => {
    const { g, c } = mk(); c.t -= 3_600_000; g.frame(); expect(g.state.coop).toBe(0); expect(g.state.pendingOfflineEggs).toBe(0);
  });
});
