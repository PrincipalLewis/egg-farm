import { describe, it, expect, vi, afterEach } from 'vitest';
import { balance as b } from '../src/config/balance';
import { save, load, SAVE_KEY, SAVE_VERSION } from '../src/save/save';
import { startAutosave } from '../src/save/autosave';
import { initialState } from '../src/sim/state';
import { Game } from '../src/game';
import { mem } from './helpers';
describe('save/load + migrations', () => {
  it('AC8 round-trips coins, coop, basket, levels', () => {
    const kv = mem(); const s = { ...initialState(b), coinsCents: 4250, coop: 17.3, basket: 9, collectionLevel: 2, farmLevel: 4 };
    save(kv, s, 123); expect(load(kv, b)).toEqual({ version: SAVE_VERSION, savedAt: 123, state: s });
  });
  it('null on empty, corrupt, or newer-version save', () => {
    const kv = mem(); expect(load(kv, b)).toBeNull();
    kv.setItem(SAVE_KEY, '{oops'); expect(load(kv, b)).toBeNull();
    kv.setItem(SAVE_KEY, JSON.stringify({ version: 99, savedAt: 0, state: {} })); expect(load(kv, b)).toBeNull();
  });
  it('migrates v1 (float dollars) -> v2 (cents) and fills new fields', () => {
    const kv = mem(); kv.setItem(SAVE_KEY, JSON.stringify({ version: 1, savedAt: 5, state: { coins: 12.34, coop: 3, basket: 1, collectionLevel: 1, farmLevel: 2 } }));
    const f = load(kv, b)!; expect(f.version).toBe(2); expect(f.state).toMatchObject({ coinsCents: 1234, farmLevel: 2, customers: [], pendingOfflineEggs: 0 });
  });
});
describe('autosave', () => {
  afterEach(() => vi.useRealTimers());
  const ev = () => { const h: Record<string, (() => void)[]> = {}; return { h, visibilityState: 'visible',
    addEventListener: (t: string, f: () => void) => void (h[t] ??= []).push(f), removeEventListener: (t: string, f: () => void) => { h[t] = (h[t] ?? []).filter(x => x !== f); },
    fire(t: string) { (h[t] ?? []).forEach(f => f()); } }; };
  it('saves every 5 s (from config)', () => {
    vi.useFakeTimers(); const fn = vi.fn(); const stop = startAutosave(fn, b.save.autosaveIntervalS * 1000, ev(), ev());
    expect(b.save.autosaveIntervalS).toBeLessThanOrEqual(5);
    vi.advanceTimersByTime(4999); expect(fn).toHaveBeenCalledTimes(0); vi.advanceTimersByTime(1); expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10_000); expect(fn).toHaveBeenCalledTimes(3); stop(); vi.advanceTimersByTime(10_000); expect(fn).toHaveBeenCalledTimes(3);
  });
  it('saves on visibilitychange→hidden (not visible), pagehide, beforeunload', () => {
    const w = ev(), d = ev(), fn = vi.fn(); startAutosave(fn, 5000, w, d);
    d.fire('visibilitychange'); expect(fn).toHaveBeenCalledTimes(0);
    d.visibilityState = 'hidden'; d.fire('visibilitychange'); expect(fn).toHaveBeenCalledTimes(1);
    w.fire('pagehide'); w.fire('beforeunload'); expect(fn).toHaveBeenCalledTimes(3);
  });
  it('saves immediately on every upgrade purchase', () => {
    const kv = mem(); let t = 1000; const g = new Game(b, kv, () => t);
    g.state = { ...g.state, coinsCents: 100_00 }; const spy = vi.spyOn(kv, 'setItem');
    g.dispatch({ type: 'collect' }); expect(spy).not.toHaveBeenCalled();
    g.dispatch({ type: 'buyCollection' }); expect(spy).toHaveBeenCalledTimes(1); expect(load(kv, b)!.state.collectionLevel).toBe(1);
    g.dispatch({ type: 'buyFarm' }); expect(spy).toHaveBeenCalledTimes(2); expect(load(kv, b)!.state.farmLevel).toBe(1);
  });
  it('offline modal not granted twice for one absence', () => {
    const kv = mem(); save(kv, initialState(b), 0);
    const g1 = new Game(b, kv, () => 600_000); expect(g1.state.pendingOfflineEggs).toBe(300);
    g1.dispatch({ type: 'collectOffline' });
    const g2 = new Game(b, kv, () => 600_010); expect(g2.state.pendingOfflineEggs).toBe(0); expect(g2.state.basket).toBe(300);
  });
});
