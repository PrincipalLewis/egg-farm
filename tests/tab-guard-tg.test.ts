// Single-tab guard TG-1..TG-6 (product/single-tab-guard.md v1.0). Two "tabs" share one localStorage and one channel hub.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { balance as b } from '../src/config/balance';
import { SAVE_KEY, load, save } from '../src/save/save';
import { initialState } from '../src/sim/state';
import { Game } from '../src/game';
import { TabLease, LEASE_KEY, readLease, type LeaseChannel } from '../src/save/tab-lease';
import { mem, expOffline } from './helpers';
const T0 = 1.8e12; // QA BUG-1: savedAt 0 / pre-2020 is invalid now; offline tests use a real epoch
afterEach(() => vi.useRealTimers());
const hub = () => { const chs: LeaseChannel[] = []; return () => { const c: LeaseChannel = { onmessage: null, postMessage: m => chs.filter(x => x !== c).forEach(x => x.onmessage?.({ data: m })), close() {} }; chs.push(c); return c; }; };
/** Boot a tab like main.ts: claim, then load, then gate every save on the lease. */
function tab(kv: ReturnType<typeof mem>, ch: LeaseChannel | null, now: () => number, playHere = false) {
  let g: Game | null = null; const lost = vi.fn(() => g?.deactivate());
  const lease = new TabLease(kv, ch, lost, now); const reason = lease.claim(playHere);
  g = new Game(b, kv, now); g.canWrite = () => lease.owns(); const shown = vi.fn(); g.onInactive = shown;
  return { g, lease, reason, shown };
}
const rich = () => ({ ...initialState(b, 1), coinsCents: 1e12 });
describe('single-tab guard', () => {
  it('TG-1: opening B makes A inactive at once (channel); A\'s money and save stop changing', () => {
    vi.useFakeTimers(); const kv = mem(), h = hub(); let t = 1_000; const now = () => t; save(kv, rich(), t);
    const A = tab(kv, h(), now); A.g.dispatch({ type: 'buyFarm' }); expect(A.g.inactive).toBe(false);
    const B = tab(kv, h(), now); expect(B.reason).toBe('new_tab');
    expect(A.g.inactive).toBe(true); expect(A.shown).toHaveBeenCalledTimes(1);
    const coins = A.g.state.coinsCents, raw = kv.getItem(SAVE_KEY);
    A.g.dispatch({ type: 'buyFarm' }); t += 5000; A.g.frame(); A.g.save(); A.g.endSession();
    expect(A.g.state.coinsCents).toBe(coins); expect(kv.getItem(SAVE_KEY)).toBe(raw);
  });
  it('TG-1 without BroadcastChannel: the lease check before the next save (or heartbeat poll) blocks A', () => {
    vi.useFakeTimers(); const kv = mem(); let t = 1_000; const now = () => t; save(kv, rich(), t);
    const A = tab(kv, null, now); tab(kv, null, now); expect(A.g.inactive).toBe(false);
    const raw = kv.getItem(SAVE_KEY); A.g.dispatch({ type: 'buyFarm' });
    expect(kv.getItem(SAVE_KEY)).toBe(raw); expect(A.g.inactive).toBe(true);
    expect(A.g.telemetry.events().some(e => e.type === 'tab_guard_blocked_write')).toBe(true);
    const C = tab(kv, null, now); const D = tab(kv, null, now); vi.advanceTimersByTime(2000); expect(C.g.inactive).toBe(true); expect(D.g.inactive).toBe(false);
  });
  it('TG-2: after 60 s in B, "Play here" in A loads exactly B\'s money, nothing lost or duplicated', () => {
    vi.useFakeTimers(); const kv = mem(), h = hub(); let t = 1_000; const now = () => t; save(kv, rich(), t);
    const A = tab(kv, h(), now); const B = tab(kv, h(), now);
    for (let i = 0; i < 60; i++) { t += 1000; B.g.frame(); A.g.frame(); vi.advanceTimersByTime(1000); }
    B.g.dispatch({ type: 'buyFarm' }); const bCoins = B.g.state.coinsCents;
    const A2 = tab(kv, h(), now, true); expect(A2.reason).toBe('play_here');
    expect(A2.g.state.coinsCents).toBe(bCoins); expect(A2.g.state.farmLevel).toBe(B.g.state.farmLevel); expect(B.g.inactive).toBe(true);
  });
  it('TG-3: 20 purchases in B while A is inactive leave exactly B\'s state in the save', () => {
    vi.useFakeTimers(); const kv = mem(), h = hub(); let t = 1_000; const now = () => t; save(kv, rich(), t);
    const A = tab(kv, h(), now); const B = tab(kv, h(), now);
    for (let i = 0; i < 20; i++) { t += 100; B.g.dispatch({ type: i % 2 ? 'buyFarm' : 'buyCollection' }); A.g.dispatch({ type: 'buyFarm' }); A.g.save(); }
    A.g.endSession(); const s = load(kv, b)!.state;
    expect([s.farmLevel, s.collectionLevel, s.coinsCents]).toEqual([B.g.state.farmLevel, B.g.state.collectionLevel, B.g.state.coinsCents]);
    expect(s.farmLevel + s.collectionLevel).toBe(20);
  });
  it('TG-4: owner killed (no release) -> after >= 6 s the next load takes over silently ("stale")', () => {
    vi.useFakeTimers(); const kv = mem(); let t = 1_000; const now = () => t;
    const A = tab(kv, null, now); A.lease.stop(); // killed: heartbeat stops, lease stays
    t += 6_000; const B = tab(kv, null, now); expect(B.reason).toBe('stale'); expect(B.g.inactive).toBe(false); expect(B.shown).not.toHaveBeenCalled();
    const kv2 = mem(); const C = tab(kv2, null, now); C.lease.release(); expect(readLease(kv2)!.at).toBe(0); t += 1; expect(tab(kv2, null, now).reason).toBe('stale');
  });
  it('TG-5: returning with two tabs pays offline earnings only once', () => {
    vi.useFakeTimers(); const kv = mem(), h = hub(); save(kv, initialState(b), T0);
    let t = T0 + 600_000; const now = () => t;
    const A = tab(kv, h(), now); expect(A.g.state.pendingOfflineEggs).toBe(expOffline(600));
    t += 50; const B = tab(kv, h(), now); expect(B.g.state.basket + B.g.state.pendingOfflineEggs).toBe(expOffline(600)); // A's grant settled, no second grant
    B.g.dispatch({ type: 'collectOffline' }); A.g.dispatch({ type: 'collectOffline' });
    expect(load(kv, b)!.state.basket).toBe(expOffline(600));
    const C = tab(kv, h(), now, true); expect(C.g.state.basket + C.g.state.pendingOfflineEggs).toBe(expOffline(600));
  });
  it('TG-6: a single tab behaves as before - no notice, every save written, heartbeat keeps the lease fresh', () => {
    vi.useFakeTimers(); const kv = mem(), h = hub(); let t = 1_000; const now = () => t; save(kv, rich(), t);
    const A = tab(kv, h(), now); expect(A.reason).toBe(null);
    const spy = vi.spyOn(kv, 'setItem'); A.g.dispatch({ type: 'buyFarm' }); A.g.dispatch({ type: 'buyCollection' });
    expect(spy.mock.calls.filter(c => c[0] === SAVE_KEY)).toHaveLength(2);
    for (let i = 0; i < 30; i++) { t += 1000; vi.advanceTimersByTime(1000); A.g.frame(); }
    expect(t - readLease(kv)!.at).toBeLessThanOrEqual(2000); expect(A.g.inactive).toBe(false); expect(A.shown).not.toHaveBeenCalled();
    expect(kv.getItem(LEASE_KEY)).toContain(A.lease.id);
  });
  it('hand-over: the new tab asks the owner to flush, so unsaved in-memory progress is not lost', async () => {
    const kv = mem(), h = hub(); let t = 1_000; const now = () => t; save(kv, rich(), t);
    const A = tab(kv, h(), now); A.lease.onFlush = () => A.g.flushForHandover();
    t += 3000; A.g.frame(); A.g.state = { ...A.g.state, coinsCents: A.g.state.coinsCents + 777 }; // unsaved progress
    const lb = new TabLease(kv, h(), () => {}, now); await lb.requestFlush(50);
    expect(load(kv, b)!.state.coinsCents).toBe(A.g.state.coinsCents);
    const frozen = A.g.state.coinsCents; t += 500; A.g.frame(); A.g.dispatch({ type: 'buyFarm' }); expect(A.g.state.coinsCents).toBe(frozen); // held
    lb.claim(); expect(A.g.inactive).toBe(true);
    const solo = new TabLease(mem(), null, () => {}, now); await expect(solo.requestFlush(10)).resolves.toBeUndefined();
  });
});
