// SD5-1 review M1/M2: data-loss properties of the unload write against a REAL IndexedDB implementation (fake-indexeddb),
// no fake mirror. A newer build's copy that exists only in IndexedDB (its localStorage write was refused) and that the old
// tab's lease did not stop must survive the old tab being hidden and closed, byte for byte.
import { describe, it, expect } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { balance as b } from '../src/config/balance';
import { SAVE_VERSION } from '../src/save/save';
import { IdbMirror, IDB_NAME, IDB_STORE, IDB_KEY } from '../src/save/idb-mirror';
import { startAutosave } from '../src/save/autosave';
import { Game } from '../src/game';
import { mem } from './helpers';
const NEWER = JSON.stringify({ version: SAVE_VERSION + 1, savedAt: 1.9e12, saveSeq: 41, state: { coinsCents: 123456789, m4: { exotic: [1, 2, 3] } } });
const raw = async (f: IDBFactory) => new Promise<unknown>((res, rej) => { const o = f.open(IDB_NAME, 1); o.onsuccess = () => { const g = o.result.transaction(IDB_STORE).objectStore(IDB_STORE).get(IDB_KEY); g.onsuccess = () => { res(g.result); o.result.close(); }; g.onerror = () => rej(g.error); }; o.onerror = () => rej(o.error); });
const settle = () => new Promise(r => setTimeout(r, 30));
/** Tab B (newer build): writes straight to IndexedDB (its localStorage write threw), through its own connection. */
const newerTabWrites = async (f: IDBFactory) => { const mb = (await IdbMirror.open(f))!; await mb.write(NEWER); return mb; };
const page = () => { const h: Record<string, (() => void)[]> = {}; return { visibilityState: 'visible', addEventListener: (t: string, fn: () => void) => void (h[t] ??= []).push(fn), removeEventListener: () => {}, fire: (t: string) => (h[t] ?? []).forEach(fn => fn()) }; };

describe('SD5-1 M1/M2: unload write never overwrites a newer-build IndexedDB copy (real IndexedDB)', () => {
  it('mirror: unload write after a newer copy appeared (not cached) is rolled back; newer copy survives byte for byte', async () => {
    const f = new IDBFactory(); const a = (await IdbMirror.open(f))!; expect(await a.read()).toBeNull(); expect(a.newer).toBeNull();
    await newerTabWrites(f); expect(a.newer).toBeNull(); // A's cache is stale: the old guard would let the put through
    let seen: number | null = null; a.onNewer = v => { seen = v; };
    await a.write('{"version":6,"old":true}', { unload: true });
    expect(await raw(f)).toBe(NEWER); expect(seen).toBe(SAVE_VERSION + 1); expect(a.newer).toBe(SAVE_VERSION + 1);
    expect(a.failed).toBe(false); expect(a.pending).toBe(0);
  });
  it('Game + autosave: old tab (lease not stopping it) is hidden, then closed; the newer copy survives and the tab is refused', async () => {
    const f = new IDBFactory(); const kv = mem(); const a = (await IdbMirror.open(f))!;
    const g = new Game(b, kv, () => 1.8e12, undefined, 'test', a, await a.read()); g.canWrite = () => true; // lease: storageBlocked / pre-takeover
    let refused: number | null = null; g.onNewerSave = v => { refused = v; };
    const w = page(), d = page(); startAutosave(() => g.save(), 60_000, w, d, () => g.saveForUnload());
    await newerTabWrites(f);
    d.visibilityState = 'hidden'; d.fire('visibilitychange'); await settle(); // hidden: normal strict checked write
    expect(await raw(f)).toBe(NEWER); expect(refused).toBe(SAVE_VERSION + 1);
    w.fire('pagehide'); w.fire('beforeunload'); g.endSession(); await settle(); // refused tab: no further writes
    expect(await raw(f)).toBe(NEWER);
  });
  it('Game: close without a prior hide (pagehide only) also leaves the newer copy intact', async () => {
    const f = new IDBFactory(); const a = (await IdbMirror.open(f))!;
    const g = new Game(b, mem(), () => 1.8e12, undefined, 'test', a, await a.read()); g.canWrite = () => true;
    await newerTabWrites(f); g.endSession(); g.saveForUnload(); await settle();
    expect(await raw(f)).toBe(NEWER);
  });
  it('contention: newer tab put and old tab unload put race in flight (same tick, both orders); newer copy survives', async () => {
    for (const order of ['newerFirst', 'oldFirst'] as const) {
      const f = new IDBFactory(); const a = (await IdbMirror.open(f))!; const bm = (await IdbMirror.open(f))!;
      await a.write('{"version":6,"n":0}'); // an older copy exists
      const ps = order === 'newerFirst' ? [bm.write(NEWER), a.write('{"version":6,"n":1}', { unload: true })] : [a.write('{"version":6,"n":1}', { unload: true }), bm.write(NEWER)];
      await Promise.all(ps);
      expect(await raw(f), order).toBe(NEWER);
      // further unload + normal writes from the old tab are now refused by the cached result or the in-tx check
      await a.write('{"version":6,"n":2}', { unload: true }); await a.write('{"version":6,"n":3}'); expect(await raw(f), order).toBe(NEWER);
    }
  });
  it('no newer copy: the unload write lands (relaxed) and the following normal writes are strict', async () => {
    const f = new IDBFactory(); const a = (await IdbMirror.open(f))!;
    await a.write('{"version":6,"n":1}', { unload: true }); expect(await raw(f)).toBe('{"version":6,"n":1}');
    await a.write('{"version":6,"n":2}'); expect(await raw(f)).toBe('{"version":6,"n":2}'); expect(a.failed).toBe(false);
  });
  it('m2: a normal write still in flight never suppresses an unload write of the same bytes', async () => {
    const f = new IDBFactory(); const a = (await IdbMirror.open(f))!; const s = '{"version":6,"n":9}';
    const tx = (a as any).tx.bind(a); let n = 0; (a as any).tx = (...x: any[]) => { n++; return tx(...x); };
    const p1 = a.write(s); const p2 = a.write(s, { unload: true }); expect(n).toBe(2); // own dedupe key
    await a.write(s, { unload: true }); expect(n).toBe(2); await Promise.all([p1, p2]); // unload burst of one state: deduped
    expect(await raw(f)).toBe(s);
  });
});
