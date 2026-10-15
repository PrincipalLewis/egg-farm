import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { save, load } from '../src/save/save';
import { initialState } from '../src/sim/state';
import { mem, expOffline } from './helpers';
describe('welcome-back modal & one grant per load', () => {
  it('closing the modal without Collect still grants', () => {
    const kv = mem(); save(kv, initialState(b), 0); const g = new Game(b, kv, () => 600_000);
    expect(g.state.pendingOfflineEggs).toBe(expOffline(600)); g.dispatch({ type: 'dismissOffline' });
    expect(g.state.basket).toBe(expOffline(600)); expect(g.state.pendingOfflineEggs).toBe(0); expect(load(kv, b)!.state.basket).toBe(expOffline(600));
  });
  it('closing the tab with the modal open: next load settles old grant + at most one new', () => {
    const kv = mem(); save(kv, initialState(b), 0);
    new Game(b, kv, () => 600_000);
    const g2 = new Game(b, kv, () => 720_000);
    expect(g2.state.basket).toBe(expOffline(600)); expect(g2.state.pendingOfflineEggs).toBe(expOffline(120));
  });
  it('gap < 60s between save and load: no grant', () => {
    const kv = mem(); save(kv, initialState(b), 0); expect(new Game(b, kv, () => 59_999).state.pendingOfflineEggs).toBe(0);
  });
  it('reloading immediately after a grant does not grant again', () => {
    const kv = mem(); save(kv, initialState(b), 0); const g = new Game(b, kv, () => 7_200_000); g.dispatch({ type: 'collectOffline' });
    const g2 = new Game(b, kv, () => 7_200_500); expect(g2.state.pendingOfflineEggs).toBe(0); expect(g2.state.basket).toBe(expOffline(7200));
  });
  it('offline gap freezes customers (no arrivals/timeouts), timers resume', () => {
    const kv = mem(); const s = { ...initialState(b), customers: [{ id: 1, demand: 5, filled: 0, waitedS: 20 }], nextCustomerInS: 3 };
    save(kv, s, 0); const g = new Game(b, kv, () => 3_600_000);
    expect(g.state.customers).toEqual(s.customers); expect(g.state.nextCustomerInS).toBe(3);
  });
});
