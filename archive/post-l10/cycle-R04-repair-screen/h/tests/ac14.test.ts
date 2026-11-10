// M3-AC14a–f (product/m3-proposal.md) automated parts. AC14b + QA edge cases 1–3: tests/save-hardening.test.ts.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { migrate, load, save, SAVE_KEY, SAVE_VERSION, BAK_KEY, readOnlyKV, serialize } from '../src/save/save';
import { initialState } from '../src/sim/state';
import { Game } from '../src/game';
import { startAutosave } from '../src/save/autosave';
import { guardTabs, type TabBus, type TabMsg } from '../src/save/tab-guard';
import { mem } from './helpers';
const dir = new URL('./fixtures/saves/', import.meta.url);
describe('AC14a real-save migration, field by field', () => {
  for (const f of ['m1-rc2-v4-12min.json', 'm2-rc1-v5-12min.json', 'm2-rc1-v5-40min.json', 'm2-rc1-v5-40min-edge.json']) it(f, () => {
    const raw = readFileSync(new URL(f, dir), 'utf8'), d = JSON.parse(raw); const kv = mem(); kv.setItem(SAVE_KEY, raw); const s = load(kv, b)!.state;
    for (const k of ['coinsCents', 'collectionLevel', 'farmLevel', 'basket', 'coop', 'nextCustomerId', 'pendingOfflineEggs'] as const) expect([k, s[k]]).toEqual([k, d.state[k]]);
    if (d.version >= 5) {
      expect(s.workers).toEqual(d.state.workers); // energy, cooldown (cdS) and Unpaid per worker
      expect([s.graderTier, s.manageCdS]).toEqual([d.state.graderTier, d.state.manageCdS]);
    } else expect([s.workers, s.graderTier, s.manageCdS]).toEqual([{}, 0, 0]);
    expect(s.customers).toEqual(d.state.customers.map((c: any) => ({ filled: 0, ...c })));
  });
  it('the edge fixture really has Unpaid / partial energy / running cooldown', () => {
    const d = JSON.parse(readFileSync(new URL('m2-rc1-v5-40min-edge.json', dir), 'utf8'));
    expect(Object.values(d.state.workers).some((w: any) => w.unpaid)).toBe(true);
    expect(Object.values(d.state.workers).some((w: any) => w.energy > 0 && w.energy < 100)).toBe(true);
  });
  it('synthetic v1, v2, v3 migrate (coins dollars->cents, filled, celebratedTier)', () => {
    const base = { savedAt: 1, state: { coop: 2, basket: 3, collectionLevel: 4, farmLevel: 12, customers: [{ id: 1, demand: 5, waitedS: 2 }], nextCustomerInS: 3, nextCustomerId: 2, rng: 9, pendingOfflineEggs: 0 } };
    const v1 = migrate({ ...structuredClone(base), version: 1, state: { ...base.state, coins: 12.34 } }, b);
    expect([v1.version, v1.state.coinsCents, v1.state.customers[0].filled, v1.state.farmLevel]).toEqual([SAVE_VERSION, 1234, 0, 12]);
    expect(v1.state.celebratedTier).toBeGreaterThan(0);
    const v2 = migrate({ ...structuredClone(base), version: 2, state: { ...base.state, coinsCents: 500 } }, b); expect([v2.state.coinsCents, v2.state.customers[0].filled]).toEqual([500, 0]);
    const v3 = migrate({ ...structuredClone(base), version: 3, state: { ...base.state, coinsCents: 7, customers: [{ id: 1, demand: 5, filled: 2, waitedS: 1 }] } }, b);
    expect([v3.state.customers[0].filled, v3.state.workers]).toEqual([2, {}]);
  });
});
const quota = () => { const e = new Error('full'); e.name = 'QuotaExceededError'; return e; };
describe('AC14c quota / private mode', () => {
  it('setItem throwing: game keeps running, warns once, logs save_failed once', () => {
    const kv = { getItem: () => null, setItem: () => { throw quota(); } };
    const warn = vi.fn(); let t = 0; const g = new Game(b, kv, () => t); g.onStorageFail = warn;
    expect(g.storageFailed).toBe(true); // load-time save already failed (Safari private mode style)
    const g2 = new Game(b, kv, () => t); g2.onStorageFail = warn; for (let i = 0; i < 5; i++) { t += 1000; g2.frame(); g2.save(); }
    expect(warn).toHaveBeenCalledTimes(0); // already flagged at construction; main.ts shows the notice from storageFailed
    const g3 = new Game(b, mem(), () => t); const w3 = vi.fn(); g3.onStorageFail = w3;
    (g3 as any).kv = kv; g3.save(); g3.save(); g3.save(); expect(w3).toHaveBeenCalledTimes(1);
    expect(g3.telemetry.events().filter(e => e.type === 'save_failed')).toHaveLength(1);
    t += 5000; expect(() => g3.frame()).not.toThrow();
  });
});
describe('AC14d two tabs', () => {
  const net = () => { const tabs: ((m: TabMsg) => void)[][] = []; return () => { const mine: ((m: TabMsg) => void)[] = []; tabs.push(mine);
    const bus: TabBus = { post: m => tabs.filter(t => t !== mine).forEach(t => t.forEach(f => f(m))), on: f => mine.push(f), close() {} }; return bus; }; };
  it('first tab owns; second tab is told and goes read-only; first stays writable', () => {
    const mk = net(); const s1 = vi.fn(), s2 = vi.fn();
    const a = guardTabs(mk(), s1, 'a'); const c = guardTabs(mk(), s2, 'c');
    expect([a.second, c.second]).toEqual([false, true]); expect(s1).not.toHaveBeenCalled(); expect(s2).toHaveBeenCalledTimes(1);
  });
  it('read-only tab never writes the save (load-time save, autosave, .bak)', () => {
    const kv = mem(); save(kv, { ...initialState(b), coinsCents: 777 }, 1); const before = kv.getItem(SAVE_KEY);
    const g = new Game(b, readOnlyKV(kv), () => 99_999); g.readOnly = true; g.state = { ...g.state, coinsCents: 1 }; g.save();
    expect(kv.getItem(SAVE_KEY)).toBe(before); expect(kv.getItem(BAK_KEY)).toBeNull(); expect(g.state.coinsCents).toBe(1);
  });
});
describe('AC14e clock tamper', () => {
  const at = (savedAt: number, st = {}) => { const kv = mem(); kv.setItem(SAVE_KEY, serialize({ ...initialState(b), farmLevel: 5, workers: { market_hand: { energy: 60, cdS: 12 } }, manageCdS: 20, ...st } as any, savedAt)); return kv; };
  it('clock set back: 0 offline, no negative timers', () => {
    const g = new Game(b, at(10_000_000), () => 1_000); expect(g.state.pendingOfflineEggs).toBe(0);
    expect(g.state.nextCustomerInS).toBeGreaterThanOrEqual(0); expect(g.state.manageCdS).toBeGreaterThanOrEqual(0);
  });
  it('clock forward a day: offline capped at 2 h; worker energy and cooldown do not advance; cooldown <= 30 s', () => {
    const now = 1e9, g = new Game(b, at(now - 86_400_000), () => now);
    const capped = new Game(b, at(now - b.offline.offlineCapSeconds * 1000), () => now);
    expect(g.state.pendingOfflineEggs).toBe(capped.state.pendingOfflineEggs); expect(b.offline.offlineCapSeconds).toBe(7200);
    expect(g.state.workers.market_hand).toMatchObject({ energy: 60, cdS: 12 }); expect(g.state.manageCdS).toBe(20); expect(g.state.manageCdS).toBeLessThanOrEqual(30);
  });
  it('in-session jump forward simulates at most 60 s, back grants nothing', () => {
    let t = 1e9; const g = new Game(b, mem(), () => t); const c0 = g.state.coop;
    t += 3_600_000; g.frame(); expect(g.state.coop - c0).toBeLessThanOrEqual(60 * 1.0001 * 10); t -= 7_200_000; const c1 = g.state.coop; g.frame(); expect(g.state.coop).toBe(c1);
  });
});
describe('AC14f kill / background right after a purchase (automated part; device force-kill is manual)', () => {
  it('pagehide and visibilitychange->hidden save immediately', () => {
    const ev = () => { const h: Record<string, (() => void)[]> = {}; return { h, addEventListener: (k: string, f: () => void) => { (h[k] ??= []).push(f); }, removeEventListener() {}, visibilityState: 'visible' }; };
    const win = ev(), doc = ev(); const kv = mem(); let t = 1e9; const g = new Game(b, kv, () => t);
    startAutosave(() => g.save(), 3_600_000, win as any, doc as any);
    g.state = { ...g.state, coinsCents: 10_000 }; g.dispatch({ type: 'buyCollection' } as any); const lvl = g.state.collectionLevel; expect(lvl).toBe(1);
    win.h.pagehide.forEach(f => f()); expect(load(kv, b)!.state.collectionLevel).toBe(1);
    g.dispatch({ type: 'buyCollection' } as any); doc.visibilityState = 'hidden'; doc.h.visibilitychange.forEach(f => f()); expect(load(kv, b)!.state.collectionLevel).toBe(2);
  });
});
