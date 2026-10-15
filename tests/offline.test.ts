import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState, coopCapacity } from '../src/sim/state';
import { offlineEggs, applyOffline } from '../src/sim/offline';
import { apply } from '../src/sim/actions';
describe('AC11 offline progress', () => {
  it('config tunables', () => { expect(b.offline.offlineCapSeconds).toBe(7200); expect(b.offline.offlineRateMultiplier).toBe(0.5); });
  it('formula floor(min(t,7200)*0.5*eps(saved farm L))', () => {
    expect(offlineEggs(600, 0, b)).toBe(300);       // 600*0.5*1.0
    expect(offlineEggs(601, 3, b)).toBe(Math.floor(601 * 0.5 * 4)); // L3 eps=4
    expect(offlineEggs(61.5, 0, b)).toBe(30);       // floor
  });
  it('> 2h same as exactly 2h', () => { expect(offlineEggs(1e7, 0, b)).toBe(offlineEggs(7200, 0, b)); expect(offlineEggs(7200, 0, b)).toBe(3600); });
  it('< 60s grants 0; exactly 60s grants', () => { expect(offlineEggs(59.9, 0, b)).toBe(0); expect(offlineEggs(60, 0, b)).toBe(30); });
  it('negative gap (clock set back) grants 0', () => { expect(offlineEggs(-3600, 5, b)).toBe(0); expect(applyOffline(initialState(b), -1e6, b).state.pendingOfflineEggs).toBe(0); });
  it('coop unchanged; collect puts eggs in basket ignoring coop cap', () => {
    const s = { ...initialState(b), coop: 12, basket: 2 };
    const r = applyOffline(s, 7200_000, b); expect(r.state.coop).toBe(12); expect(r.eggs).toBe(3600);
    const after = apply(r.state, { type: 'collectOffline' }, b);
    expect(after.basket).toBe(3602); expect(after.basket).toBeGreaterThan(coopCapacity(0, b)); expect(after.coop).toBe(12); expect(after.pendingOfflineEggs).toBe(0);
  });
});
