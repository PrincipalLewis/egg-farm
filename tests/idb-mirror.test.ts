// D2 (rc1): IndexedDB mirror of the save, durability 'strict', newest valid copy wins on boot.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { SAVE_KEY, serialize, CORRUPT_INDEX_KEY, load } from '../src/save/save';
import { IdbMirror, pickNewest, reconcile, restoreSource, IDB_STORE } from '../src/save/idb-mirror';
import { initialState } from '../src/sim/state';
import { Game } from '../src/game';
import { mem } from './helpers';
const fx = (f: string) => readFileSync(new URL(`./fixtures/saves/${f}`, import.meta.url), 'utf8');
const st = (patch = {}) => ({ ...initialState(b, 1), ...patch });
/** Minimal async IndexedDB fake: one database, one store, transactions commit in order on a microtask. */
function fakeIdb(opts: { failOpen?: boolean; hang?: boolean } = {}) {
  const data = new Map<string, unknown>(); const txOpts: any[] = []; let stores = new Set<string>();
  const later = (f: () => void) => setTimeout(f, 0);
  const db: any = {
    objectStoreNames: { contains: (n: string) => stores.has(n) }, createObjectStore: (n: string) => { stores.add(n); },
    transaction(name: string, mode: string, o: any) {
      if (!stores.has(name)) throw new Error('NotFoundError'); txOpts.push({ mode, ...o }); const t: any = {};
      t.objectStore = () => ({
        get: (k: string) => { const r: any = {}; later(() => { r.result = data.get(k); r.onsuccess?.(); t.oncomplete?.(); }); return r; },
        put: (v: unknown, k: string) => { later(() => { data.set(k, v); t.oncomplete?.(); }); return {}; },
        delete: (k: string) => { later(() => { data.delete(k); t.oncomplete?.(); }); return {}; },
      });
      return t;
    },
  };
  const factory: any = { open: () => { const r: any = {}; if (!opts.hang) later(() => { if (opts.failOpen) { r.error = new Error('blocked'); r.onerror?.(); return; } r.result = db; r.onupgradeneeded?.(); r.onsuccess?.(); }); return r; } };
  return { factory, data, txOpts, db };
}
const flush = () => new Promise(r => setTimeout(r, 5));
describe('D2 IndexedDB mirror', () => {
  it('every write uses a readwrite transaction with durability strict; read returns the last write', async () => {
    const f = fakeIdb(); const m = (await IdbMirror.open(f.factory))!;
    await m.write('a'); await m.write('b');
    expect(await m.read()).toBe('b');
    expect(f.txOpts.filter(t => t.mode === 'readwrite').every(t => t.durability === 'strict')).toBe(true);
    expect(f.txOpts.filter(t => t.mode === 'readwrite')).toHaveLength(2);
  });
  it('falls back cleanly: no IndexedDB, open error, open timeout -> null (localStorage only)', async () => {
    expect(await IdbMirror.open(undefined)).toBeNull();
    expect(await IdbMirror.open(fakeIdb({ failOpen: true }).factory)).toBeNull();
    expect(await IdbMirror.open(fakeIdb({ hang: true }).factory, 20)).toBeNull();
    expect(await IdbMirror.open({ open: () => { throw new Error('SecurityError'); } } as any)).toBeNull();
  });
  it('write never throws when the transaction cannot start', async () => {
    const f = fakeIdb(); const m = (await IdbMirror.open(f.factory))!; f.db.transaction = () => { throw new Error('InvalidStateError'); };
    await expect(m.write('x')).resolves.toBeUndefined(); expect(m.failed).toBe(true);
  });
  it('pickNewest: newer valid IndexedDB wins; ties, older, invalid or missing IndexedDB keep localStorage', () => {
    const old = serialize(st({ farmLevel: 3 }), 1000), neu = serialize(st({ farmLevel: 4 }), 2000);
    expect(pickNewest(old, neu, b)).toBe('idb');
    expect(pickNewest(neu, old, b)).toBe('ls');
    expect(pickNewest(neu, neu, b)).toBe('ls');
    expect(pickNewest(serialize(st({ farmLevel: 4 }), 2000), serialize(st({ farmLevel: 5 }), 2000), b)).toBe('ls');
    expect(pickNewest(old, null, b)).toBe('ls');
    expect(pickNewest(old, '{"version":5,"savedAt":9e12,"state":{}', b)).toBe('ls'); // truncated
    const bad = JSON.parse(neu); bad.state.coinsCents += 1; // checksum mismatch
    expect(pickNewest(old, JSON.stringify({ ...bad, savedAt: 9e12 }), b)).toBe('ls');
    expect(pickNewest(old, fx('corrupt-version-99.json'), b)).toBe('ls');
    expect(pickNewest(null, neu, b)).toBe('idb'); // Firefox case: whole localStorage save lost
  });
  it('reconcile writes the IndexedDB copy back to localStorage; a corrupt localStorage save is preserved first', () => {
    const kv = mem(), neu = serialize(st({ farmLevel: 4 }), 2000);
    kv.setItem(SAVE_KEY, serialize(st({ farmLevel: 3 }), 1000));
    expect(reconcile(kv, neu, b)).toBe('idb'); expect(load(kv, b)!.state.farmLevel).toBe(4);
    const kv2 = mem(); kv2.setItem(SAVE_KEY, '{"trunc');
    expect(reconcile(kv2, neu, b, 77)).toBe('idb');
    expect(kv2.getItem('eggfarm.save.corrupt.77')).toBe('{"trunc'); expect(JSON.parse(kv2.getItem(CORRUPT_INDEX_KEY)!)).toEqual(['eggfarm.save.corrupt.77']);
    const kv3 = mem(); expect(reconcile(kv3, null, b)).toBe('ls'); expect(kv3.getItem(SAVE_KEY)).toBeNull();
  });
  it('older saves in IndexedDB still load through migrations (v4 fixture)', () => {
    const kv = mem(); expect(reconcile(kv, fx('m1-rc2-v4-12min.json'), b)).toBe('idb');
    const g = new Game(b, kv, () => 2e12); expect(g.isNewGame).toBe(false); expect(g.state.workers).toEqual({});
  });
  it('Game mirrors every save (load-time save and immediate purchase save) with the exact localStorage bytes', () => {
    const writes: string[] = []; const kv = mem(); kv.setItem(SAVE_KEY, serialize(st({ coinsCents: 1e9 }), 1));
    let t = 10; const g = new Game(b, kv, () => t, 1, 'dev', { write: r => writes.push(r), clear: async () => {} });
    expect(writes).toHaveLength(1); expect(writes[0]).toBe(kv.getItem(SAVE_KEY));
    t = 20; g.dispatch({ type: 'buyFarm' });
    expect(g.state.farmLevel).toBe(1); expect(writes).toHaveLength(2); expect(writes[1]).toBe(kv.getItem(SAVE_KEY));
  });
  it('purchase lost from localStorage (kill before flush) is recovered from the IndexedDB copy on the next boot', async () => {
    const f = fakeIdb(); const m = (await IdbMirror.open(f.factory))!; const kv = mem();
    kv.setItem(SAVE_KEY, serialize(st({ coinsCents: 1e9 }), 1));
    let t = 10; const g = new Game(b, kv, () => t, 1, 'dev', m); const before = kv.getItem(SAVE_KEY)!;
    t = 20; g.dispatch({ type: 'buyFarm' }); await flush();
    kv.setItem(SAVE_KEY, before); // simulate localStorage's lazy flush losing the purchase
    reconcile(kv, await m.read(), b); const g2 = new Game(b, kv, () => 30);
    expect(g2.state.farmLevel).toBe(1);
  });
  it('localStorage quota failure still mirrors the save; second tab (no mirror) writes nothing', () => {
    const writes: string[] = []; const kv = mem(); let full = false; const set = kv.setItem.bind(kv); kv.setItem = (k, v) => { if (full) throw Object.assign(new Error('q'), { name: 'QuotaExceededError' }); set(k, v); };
    const g = new Game(b, kv, () => 5, 1, 'dev', { write: r => writes.push(r), clear: async () => {} });
    full = true; g.save(); expect(writes).toHaveLength(2); expect(JSON.parse(writes[1]).savedAt).toBe(5); expect(g.storageFailed).toBe(true);
  });
  it('Reset save clears the mirror (awaited) so a reload does not restore the old save', async () => {
    const f = fakeIdb(); const m = (await IdbMirror.open(f.factory))!; const g = new Game(b, mem(), () => 5, 1, 'dev', m); await flush();
    expect(f.data.size).toBe(1); await g.clearMirror(); expect(f.data.size).toBe(0); expect(await m.read()).toBeNull();
    await expect(new Game(b, mem(), () => 5).clearMirror()).resolves.toBeUndefined();
  });
  it('store name is stable (save compatibility across builds)', () => { expect(IDB_STORE).toBe('save'); });
  it('save_restore source: idb when the IndexedDB copy is restored, localStorage when it loses, none when nothing differs', () => {
    const old = serialize(st({ farmLevel: 3 }), 1000), neu = serialize(st({ farmLevel: 4 }), 2000);
    expect(restoreSource(old, neu, b)).toBe('idb');
    expect(restoreSource(null, neu, b)).toBe('idb');
    expect(restoreSource('{"trunc', neu, b)).toBe('idb');
    expect(restoreSource(neu, old, b)).toBe('localStorage');
    expect(restoreSource(old, '{"bad', b)).toBe('localStorage');
    expect(restoreSource(old, old, b)).toBeNull();
    expect(restoreSource(old, null, b)).toBeNull();
    expect(restoreSource(null, null, b)).toBeNull();
  });
});
