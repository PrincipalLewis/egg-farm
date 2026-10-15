import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { apply } from '../src/sim/actions';
import { initialState } from '../src/sim/state';
import { mem, expOffline } from './helpers';
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
  it('hidden tab gap >= 60s: simulates the first 60s (coop capped), then freezes; no grant', () => {
    const { g, c } = mk(); c.t += 600_000; g.frame();
    expect(g.state.coop).toBe(50); expect(g.state.pendingOfflineEggs).toBe(0);
    expect(g.state.nextCustomerId).toBe(7); // arrivals at 10..60 s only (6), not 60 over 600 s
    expect(g.state.nextCustomerInS).toBeCloseTo(10, 6); // frozen mid-cycle, resumes from here
    expect(g.state.customers.map(c => c.waitedS)).toEqual([expect.closeTo(20, 6), expect.closeTo(10, 6), expect.closeTo(0, 6)]);
  });
  it('gap exactly 90s with uncapped coop shows 60s of production', () => {
    const { g, c } = mk(); const x = g as any; x.b = structuredClone(x.b); x.b.farm.coopCapacityBase = 10_000;
    g.state = { ...g.state, nextCustomerInS: 1e9 }; c.t += 90_000; g.frame(); expect(g.state.coop).toBeCloseTo(60, 6);
    c.t += 1000; g.frame(); expect(g.state.coop).toBeCloseTo(61, 6);
  });
  it('hidden time counts as offline only when the tab is then closed (last save -> next load)', () => {
    const kv = mem(); const c = { t: 0 }; const g = new Game(b, kv, () => c.t); c.t = 2000; g.frame(); g.save(); // e.g. visibilitychange->hidden
    c.t = 2000 + 600_000; const g2 = new Game(b, kv, () => c.t); expect(g2.state.pendingOfflineEggs).toBe(expOffline(600));
  });
  it('negative wall-clock gap grants nothing', () => {
    const { g, c } = mk(); c.t -= 3_600_000; g.frame(); expect(g.state.coop).toBe(0); expect(g.state.pendingOfflineEggs).toBe(0);
  });
});
