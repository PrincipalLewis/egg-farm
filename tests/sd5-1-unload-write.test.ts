// SD5-1 (QA aaaa91a, Firefox R1): the IndexedDB save queued on visibilitychange→hidden / pagehide never committed because
// the transaction was still waiting for its get when the page was torn down. Unload writes put at once, 'relaxed', commit().
import { describe, it, expect, vi } from 'vitest';
import { balance as b } from '../src/config/balance';
import { IdbMirror, IDB_KEY } from '../src/save/idb-mirror';
import { startAutosave } from '../src/save/autosave';
import { Game } from '../src/game';
import { mem } from './helpers';
/** IndexedDB fake with page teardown: teardown() aborts every transaction that has not issued its put yet (the Firefox
 *  behaviour the probe showed: the get never answers, the transaction neither completes nor commits). */
function teardownIdb() {
  const data = new Map<string, unknown>(); const txs: any[] = []; let dead = false;
  const later = (f: () => void) => setTimeout(() => { if (!dead) f(); }, 0);
  const db: any = {
    objectStoreNames: { contains: () => true }, createObjectStore: () => {},
    transaction(_n: string, mode: string, o: any) {
      const t: any = { mode, durability: o?.durability, put: false, committed: false, state: 'active' }; txs.push(t);
      const finish = () => { if (t.state !== 'active') return; t.state = 'complete'; t.oncomplete?.(); };
      t.commit = () => { t.committed = true; };
      t.objectStore = () => ({
        get: (k: string) => { const r: any = {}; later(() => { r.result = data.get(k); r.onsuccess?.(); if (!t.put) finish(); }); return r; },
        // a put issued before teardown reaches the engine and lands (the request is already queued)
        put: (v: unknown, k: string) => { t.put = true; setTimeout(() => { data.set(k, v); finish(); }, 0); return {}; },
        delete: (k: string) => { later(() => { data.delete(k); finish(); }); return {}; },
      });
      return t;
    },
  };
  const factory: any = { open: () => { const r: any = {}; setTimeout(() => { r.result = db; r.onsuccess?.(); }, 0); return r; } };
  const teardown = () => { dead = true; for (const t of txs) if (t.state === 'active' && !t.put) { t.state = 'abort'; t.onabort?.(); } };
  return { factory, data, txs, teardown };
}
const tick = () => new Promise(r => setTimeout(r, 5));
describe('SD5-1 unload-safe IndexedDB write', () => {
  it('rc1 behaviour reproduced: a normal (get+put) write torn down before its get answers is aborted, the old copy stays', async () => {
    const f = teardownIdb(); const m = (await IdbMirror.open(f.factory))!;
    await m.write('old'); expect(f.data.get(IDB_KEY)).toBe('old');
    const p = m.write('new'); f.teardown(); await p;
    expect(f.data.get(IDB_KEY)).toBe('old'); expect(m.failed).toBe(true); expect(m.pending).toBe(0);
  });
  it('unload write: put issued synchronously, durability relaxed, commit() called, lands despite teardown; promise resolves on complete', async () => {
    const f = teardownIdb(); const m = (await IdbMirror.open(f.factory))!;
    await m.write('old');
    let done = false; const p = m.write('new', { unload: true }).then(() => { done = true; });
    const t = f.txs.at(-1); expect(t.put).toBe(true); expect(t.committed).toBe(true); expect(t.durability).toBe('relaxed');
    f.teardown(); expect(done).toBe(false); await p; expect(done).toBe(true);
    expect(f.data.get(IDB_KEY)).toBe('new'); expect(m.failed).toBe(false);
    expect(f.txs.slice(0, -1).every(x => x.durability === 'strict')).toBe(true); // only the unload write is relaxed
  });
  it('dedupe: identical raw is not written twice (hidden + pagehide + beforeunload of the same state); an aborted write is retried', async () => {
    const f = teardownIdb(); const m = (await IdbMirror.open(f.factory))!;
    await m.write('a', { unload: true }); await m.write('a', { unload: true });
    expect(f.txs.filter(t => t.mode === 'readwrite')).toHaveLength(1);
    await m.write('a'); expect(f.txs).toHaveLength(2); // a normal write is never deduped (BUG-2 in-transaction newer check)
    const f2 = teardownIdb(); const m2 = (await IdbMirror.open(f2.factory))!;
    const p = m2.write('b'); f2.teardown(); await p; // aborted
    const n = f2.txs.length; void m2.write('b', { unload: true }); expect(f2.txs.length).toBe(n + 1); // not deduped after a failure
  });
  it('a newer-build copy seen by the mirror still blocks unload writes', async () => {
    const f = teardownIdb(); const m = (await IdbMirror.open(f.factory))!; m.newer = 99;
    await m.write('x', { unload: true }); expect(f.txs).toHaveLength(0);
  });
  it('Game: saveForUnload and endSession write the mirror with unload; plain save does not', () => {
    const calls: any[] = []; const mirror = { write: (r: string, o?: any) => { calls.push(o); }, clear: async () => {} };
    const g = new Game(b, mem(), () => 1.8e12, undefined, 'test', mirror, null); calls.length = 0;
    g.save(); g.saveForUnload(); g.endSession();
    expect(calls.map(c => !!c?.unload)).toEqual([false, true, true]);
  });
  it('autosave: interval uses doSave; hidden, pagehide and beforeunload use onHide', () => {
    vi.useFakeTimers();
    const mk = () => { const h: Record<string, (() => void)[]> = {}; return { visibilityState: 'visible', addEventListener: (t: string, f: () => void) => void (h[t] ??= []).push(f), removeEventListener: () => {}, fire: (t: string) => (h[t] ?? []).forEach(f => f()) }; };
    const w = mk(), d = mk(), s = vi.fn(), u = vi.fn(); startAutosave(s, 5000, w, d, u);
    vi.advanceTimersByTime(5000); d.visibilityState = 'hidden'; d.fire('visibilitychange'); w.fire('pagehide'); w.fire('beforeunload');
    expect(s).toHaveBeenCalledTimes(1); expect(u).toHaveBeenCalledTimes(3); vi.useRealTimers();
  });
});
