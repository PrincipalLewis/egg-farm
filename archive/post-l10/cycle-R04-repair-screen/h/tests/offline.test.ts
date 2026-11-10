import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState, coopCapacity, eggsPerSec } from '../src/sim/state';
import { offlineEggs, applyOffline } from '../src/sim/offline';
import { apply } from '../src/sim/actions';
import { expOffline } from './helpers';
const O = b.offline;
describe('AC11 offline progress (expectations derived from config)', () => {
  it('config tunables', () => { expect(O.offlineCapSeconds).toBe(7200); expect(O.offlineRateMultiplier).toBe(0.25); expect(O.offlineMinSeconds).toBe(60); });
  it('formula floor(min(t,cap)*mult*eps(saved farm L))', () => {
    for (const [t, L] of [[600, 0], [601, 3], [61.5, 0], [3333, 17], [7200, 30]]) {
      expect(offlineEggs(t, L, b)).toBe(Math.floor(Math.min(t, O.offlineCapSeconds) * O.offlineRateMultiplier * eggsPerSec(L, b)));
    }
  });
  it('> cap same as exactly cap', () => { expect(offlineEggs(1e7, 4, b)).toBe(offlineEggs(O.offlineCapSeconds, 4, b)); });
  it('< 60s grants 0; exactly 60s grants', () => { expect(offlineEggs(O.offlineMinSeconds - 0.1, 0, b)).toBe(0); expect(offlineEggs(O.offlineMinSeconds, 0, b)).toBe(expOffline(O.offlineMinSeconds)); expect(expOffline(60)).toBeGreaterThan(0); });
  it('negative gap grants 0', () => { expect(offlineEggs(-3600, 5, b)).toBe(0); expect(applyOffline(initialState(b), -1e6, b).state.pendingOfflineEggs).toBe(0); });
  it('coop unchanged; collect puts eggs in basket ignoring coop cap', () => {
    const s = { ...initialState(b), coop: 12, basket: 2 }; const e = expOffline(O.offlineCapSeconds);
    const r = applyOffline(s, O.offlineCapSeconds * 1000, b); expect(r.state.coop).toBe(12); expect(r.eggs).toBe(e);
    const after = apply(r.state, { type: 'collectOffline' }, b);
    expect(after.basket).toBe(2 + e); expect(after.basket).toBeGreaterThan(coopCapacity(0, b)); expect(after.coop).toBe(12); expect(after.pendingOfflineEggs).toBe(0);
  });
});
