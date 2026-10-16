// v4 (QA Claude evidence qa/claude-qa/save-durability-4a25d0d e3 + f6, Code Reviewer N2/N3).
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { SAVE_KEY, serialize, load } from '../src/save/save';
import { pickNewest, reconcile, restoreSource } from '../src/save/idb-mirror';
import { TabLease, LEASE_KEY, readLease } from '../src/save/tab-lease';
import { initialState } from '../src/sim/state';
import { mem } from './helpers';
const NOW = Date.UTC(2026, 9, 16, 12);
const st = (patch = {}) => ({ ...initialState(b, 1), ...patch });
const withSavedAt = (raw: string, t: unknown) => { const o = JSON.parse(raw); if (t === undefined) delete o.savedAt; else o.savedAt = t; return JSON.stringify(o); };
describe('v4 issue 1: an invalid savedAt ranks as the OLDEST copy in reconcile', () => {
  it('e3 repro: older localStorage save with a FUTURE savedAt does not beat a newer IndexedDB copy', () => {
    const idb = serialize(st({ basket: 15 }), NOW - 1000);
    const lsStale = withSavedAt(serialize(st({ basket: 5 }), NOW - 11000), NOW + 1e10);
    expect(pickNewest(lsStale, idb, b, NOW)).toBe('idb');
    const kv = mem(); kv.setItem(SAVE_KEY, lsStale);
    expect(reconcile(kv, idb, b, NOW)).toBe('idb');
    expect(load(kv, b)!.state.basket).toBe(15);
    expect(restoreSource(lsStale, idb, b, NOW)).toBe('idb');
  });
  it('every offline-invalid savedAt in localStorage loses to a valid IndexedDB copy, and vice versa', () => {
    const good = serialize(st({ basket: 15 }), NOW - 60_000);
    for (const t of [undefined, null, 0, -5, 1000, Date.UTC(2019, 5, 1), NOW + 10 * 60_000, NOW + 1e10]) {
      const bad = withSavedAt(serialize(st({ basket: 5 }), NOW - 120_000), t);
      expect(pickNewest(bad, good, b, NOW), String(t)).toBe('idb');
      expect(pickNewest(good, bad, b, NOW), String(t)).toBe('ls');
    }
  });
  it('small clock skew is still valid; both invalid keeps localStorage', () => {
    const a = serialize(st({ basket: 5 }), NOW - 5000), skew = serialize(st({ basket: 15 }), NOW + 30_000);
    expect(pickNewest(a, skew, b, NOW)).toBe('idb');
    const f1 = serialize(st({ basket: 5 }), NOW + 1e10), f2 = serialize(st({ basket: 15 }), NOW + 2e10);
    expect(pickNewest(f1, f2, b, NOW)).toBe('ls');
  });
  it('pre-2020 floor only applies when the clock is past 2020', () => {
    expect(pickNewest(serialize(st(), 1000), serialize(st({ basket: 3 }), 2000), b, 5000)).toBe('idb');
  });
});
describe('v4 issue 2: a lone tab with localStorage full is not locked out', () => {
  const quotaKv = (prev: object | null) => { const kv = mem(); if (prev) kv.setItem(LEASE_KEY, JSON.stringify(prev));
    kv.setItem = () => { const e = new Error('quota exceeded'); e.name = 'QuotaExceededError'; throw e; }; return kv; };
  for (const prev of [{ id: 'oldsession', at: 0 }, { id: 'oldsession', at: NOW - 1000 }, null])
    it(`f6 repro: claim write throws (prev lease ${JSON.stringify(prev)}) -> owner, storage outcome, never "another tab"`, () => {
      vi.useFakeTimers(); const lost = vi.fn(); const l = new TabLease(quotaKv(prev), null, lost, () => NOW);
      l.claim(); expect(l.storageBlocked).toBe(true); expect(l.owns()).toBe(true);
      vi.advanceTimersByTime(10_000); expect(l.owns()).toBe(true); expect(lost).not.toHaveBeenCalled(); l.stop(); vi.useRealTimers();
    });
  it('silent failed write (read-back mismatch) is detected the same way', () => {
    const kv = mem(); kv.setItem(LEASE_KEY, JSON.stringify({ id: 'old', at: 0 })); kv.setItem = () => {};
    const l = new TabLease(kv, null, () => {}, () => NOW); l.claim(); expect(l.storageBlocked).toBe(true); expect(l.owns()).toBe(true); l.stop();
  });
  it('a real newer tab still takes over a storage-blocked owner via the channel', () => {
    const chs: any[] = []; const mk = () => { const c: any = { onmessage: null, postMessage: (m: any) => chs.filter(x => x !== c).forEach(x => x.onmessage?.({ data: m })), close() {} }; chs.push(c); return c; };
    const kv = mem(); kv.setItem = () => { throw new Error('quota'); };
    const lost = vi.fn(); const a = new TabLease(kv, mk(), lost, () => NOW); a.claim(); expect(a.owns()).toBe(true);
    const c = new TabLease(kv, mk(), () => {}, () => NOW); c.claim(); expect(a.owns()).toBe(false); expect(lost).toHaveBeenCalledTimes(1); a.stop(); c.stop();
  });
  it('a normal claim is not storage-blocked and recovers once storage frees up', () => {
    vi.useFakeTimers(); const kv = mem(); const set = kv.setItem; let full = true; kv.setItem = (k, v) => { if (full) throw new Error('quota'); set(k, v); };
    const l = new TabLease(kv, null, () => {}, () => NOW); l.claim(); expect(l.storageBlocked).toBe(true);
    full = false; vi.advanceTimersByTime(2500); expect(l.storageBlocked).toBe(false); expect(readLease(kv)?.id).toBe(l.id); l.stop(); vi.useRealTimers();
  });
  it('main.ts: storage-blocked lease gives the storage recovery outcome and the save notice', () => {
    const src = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
    expect(src).toMatch(/lease\.storageBlocked[\s\S]{0,200}recoveryOutcome = 'storage'/);
  });
});
describe('v4 issue 3 (Reviewer N3)', () => {
  it('a failed IndexedDB re-read keeps the first read', () => {
    const src = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
    expect(src).toMatch(/r2 === undefined\) \{ idbBoot = 'unknown'.*else if \(r2 !== null\) idbRaw = r2/); // §3d: failed re-read keeps the first read and defers
  });
});
