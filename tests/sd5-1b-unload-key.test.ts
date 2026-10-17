// SD5-1 option (b) (HoE + Architect, M4-19 rev 3): the close-time save goes to its own IndexedDB key eggfarm/save/unload,
// boot ranks it like any other copy, promotes a winner with read-back and only then deletes unload. Real IndexedDB
// (fake-indexeddb).
import { describe, it, expect } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { balance as b } from '../src/config/balance';
import { SAVE_KEY, SAVE_VERSION, serialize, rankMode, rankCompareIn, validate } from '../src/save/save';
import { initialState } from '../src/sim/state';
import { IdbMirror, IDB_NAME, IDB_STORE, IDB_KEY, UNLOAD_KEY, rankUnload, bootUnload, pickNewest, reconcile } from '../src/save/idb-mirror';
import { startAutosave } from '../src/save/autosave';
import { Game } from '../src/game';
import { mem } from './helpers';
const T = 1.8e12;
const sv = (coins: number, at: number, seq?: number) => { const r = serialize({ ...initialState(b, 1), coinsCents: coins }, at); return seq ? r.replace(`{"version":${SAVE_VERSION},`, `{"version":${SAVE_VERSION},"saveSeq":${seq},`) : r; };
const get = (f: IDBFactory, key: string) => new Promise<unknown>((res, rej) => { const o = f.open(IDB_NAME, 1); o.onsuccess = () => { const g = o.result.transaction(IDB_STORE).objectStore(IDB_STORE).get(key); g.onsuccess = () => { res(g.result); o.result.close(); }; g.onerror = () => rej(g.error); }; o.onerror = () => rej(o.error); });
const put = (f: IDBFactory, key: string, v: string) => new Promise<void>((res, rej) => { const o = f.open(IDB_NAME, 1); o.onupgradeneeded = () => o.result.createObjectStore(IDB_STORE); o.onsuccess = () => { const t = o.result.transaction(IDB_STORE, 'readwrite'); t.objectStore(IDB_STORE).put(v, key); t.oncomplete = () => { o.result.close(); res(); }; t.onerror = () => rej(t.error); }; o.onerror = () => rej(o.error); });
const settle = () => new Promise(r => setTimeout(r, 30));
const page = () => { const h: Record<string, (() => void)[]> = {}; return { visibilityState: 'visible', addEventListener: (t: string, fn: () => void) => void (h[t] ??= []).push(fn), removeEventListener: () => {}, fire: (t: string) => (h[t] ?? []).forEach(fn => fn()) }; };
/** One boot like main.ts: read main + unload, bootUnload, then the IndexedDB raw reconcile would use. */
async function boot(f: IDBFactory, kv = mem(), now = T + 1e6) { const m = (await IdbMirror.open(f))!; const idb = await m.read(); const u = await m.readUnload(); return { m, ...(await bootUnload(m, kv, idb, u, b, now)) }; }

describe('SD5-1 (b) close save -> eggfarm/save/unload', () => {
  it('pagehide / beforeunload / endSession write unload only; visibilitychange->hidden is the normal checked write to main', async () => {
    const f = new IDBFactory(); const a = (await IdbMirror.open(f))!; const kv = mem(); let t = T;
    const g = new Game(b, kv, () => t, undefined, 'test', a, null); g.canWrite = () => true; await settle();
    const mainAfterLoad = await get(f, IDB_KEY); expect(await get(f, UNLOAD_KEY)).toBeUndefined();
    const w = page(), d = page(); startAutosave(() => g.save(), 60_000, w, d, () => g.saveForUnload());
    t += 1000; d.visibilityState = 'hidden'; d.fire('visibilitychange'); await settle();
    const mainAfterHide = await get(f, IDB_KEY); expect(mainAfterHide).not.toBe(mainAfterLoad); expect(await get(f, UNLOAD_KEY)).toBeUndefined();
    t += 1000; g.state = { ...g.state, coinsCents: 4242 }; w.fire('pagehide'); w.fire('beforeunload'); g.endSession(); await settle();
    expect(await get(f, IDB_KEY)).toBe(mainAfterHide); // main untouched by the close
    expect(validate(String(await get(f, UNLOAD_KEY)), b).ok).toBe(true); expect(String(await get(f, UNLOAD_KEY))).toContain('"coinsCents":4242');
  });
  it('unload-newer: boot promotes it to main (read-back), then deletes unload', async () => {
    const f = new IDBFactory(); const old = sv(100, T), nw = sv(999, T + 5000);
    await put(f, IDB_KEY, old); await put(f, UNLOAD_KEY, nw); const kv = mem(); kv.setItem(SAVE_KEY, old);
    const r = await boot(f, kv); expect(r.verdict).toBe('win'); expect(r.promoted).toBe(true); expect(r.idbRaw).toBe(nw);
    expect(await get(f, IDB_KEY)).toBe(nw); expect(await get(f, UNLOAD_KEY)).toBeUndefined();
  });
  it('main-newer: an older unload copy never overwrites main and is left in unload', async () => {
    const f = new IDBFactory(); const nw = sv(999, T + 5000), old = sv(100, T);
    await put(f, IDB_KEY, nw); await put(f, UNLOAD_KEY, old);
    const r = await boot(f); expect(r.verdict).toBe('older'); expect(r.idbRaw).toBe(nw);
    expect(await get(f, IDB_KEY)).toBe(nw); expect(await get(f, UNLOAD_KEY)).toBe(old);
  });
  it('corrupt unload (bad checksum / truncated) never overwrites main', async () => {
    for (const bad of [sv(999, T + 5000).replace('"coinsCents":999', '"coinsCents":998'), sv(999, T + 5000).slice(0, 40)]) {
      const f = new IDBFactory(); const m0 = sv(100, T); await put(f, IDB_KEY, m0); await put(f, UNLOAD_KEY, bad);
      const r = await boot(f); expect(r.verdict).toBe('corrupt'); expect(r.idbRaw).toBe(m0); expect(await get(f, IDB_KEY)).toBe(m0); expect(await get(f, UNLOAD_KEY)).toBe(bad);
    }
  });
  it('F2-EQ (flag off): equal rank, different bytes -> diverged; unload kept, main not overwritten', async () => {
    const f = new IDBFactory(); const m0 = sv(100, T), u = sv(200, T); await put(f, IDB_KEY, m0); await put(f, UNLOAD_KEY, u);
    const r = await boot(f); expect(r.verdict).toBe('diverged'); expect(r.idbRaw).toBe(m0); expect(await get(f, IDB_KEY)).toBe(m0); expect(await get(f, UNLOAD_KEY)).toBe(u);
  });
  it('crash between promote and delete is idempotent: main === unload -> delete only, main byte-identical', async () => {
    const f = new IDBFactory(); const nw = sv(999, T + 5000); await put(f, IDB_KEY, nw); await put(f, UNLOAD_KEY, nw);
    const r = await boot(f); expect(r.verdict).toBe('promoted'); expect(r.promoted).toBe(true);
    expect(await get(f, IDB_KEY)).toBe(nw); expect(await get(f, UNLOAD_KEY)).toBeUndefined();
    const r2 = await boot(f); expect(r2.verdict).toBe('none'); expect(await get(f, IDB_KEY)).toBe(nw);
  });
  it('promote fails (main read-back mismatch) -> unload kept', async () => {
    const f = new IDBFactory(); const old = sv(100, T), nw = sv(999, T + 5000); await put(f, IDB_KEY, old); await put(f, UNLOAD_KEY, nw);
    const m = (await IdbMirror.open(f))!; let reads = 0; const rd = m.read.bind(m); m.read = async () => (++reads >= 2 ? 'garbage' : rd());
    const r = await bootUnload(m, mem(), old, nw, b, T + 1e6); expect(r.verdict).toBe('win'); expect(r.promoted).toBe(false);
    expect(await get(f, UNLOAD_KEY)).toBe(nw);
  });
  it('promote never replaces a newer-build main (in-transaction check)', async () => {
    const f = new IDBFactory(); const NEWER = JSON.stringify({ version: SAVE_VERSION + 1, savedAt: 1.9e12, state: {} }); const nw = sv(999, T + 5000);
    const m = (await IdbMirror.open(f))!; await put(f, IDB_KEY, NEWER); await put(f, UNLOAD_KEY, nw);
    expect(await m.promoteUnload(nw)).toBe(false); expect(await get(f, IDB_KEY)).toBe(NEWER); expect(await get(f, UNLOAD_KEY)).toBe(nw);
  });
  it('a pre-fix build (normal main writes only) leaves unload untouched; reset clears both keys', async () => {
    const f = new IDBFactory(); const u = sv(5, T); await put(f, UNLOAD_KEY, u);
    const m = (await IdbMirror.open(f))!; await m.write(sv(6, T + 1)); await m.write(sv(7, T + 2));
    expect(await get(f, UNLOAD_KEY)).toBe(u);
    await m.clear(); expect(await get(f, UNLOAD_KEY)).toBeUndefined(); expect(await get(f, IDB_KEY)).toBeUndefined();
  });
  it('M1: a newer-build copy only in IDB main survives hide AND close byte for byte; the refused tab writes nothing to unload', async () => {
    const f = new IDBFactory(); const a = (await IdbMirror.open(f))!; const kv = mem();
    const g = new Game(b, kv, () => T, undefined, 'test', a, await a.read()); g.canWrite = () => true; await settle();
    const NEWER = JSON.stringify({ version: SAVE_VERSION + 1, savedAt: 1.9e12, saveSeq: 41, state: { coinsCents: 1 } });
    await put(f, IDB_KEY, NEWER);
    const w = page(), d = page(); startAutosave(() => g.save(), 60_000, w, d, () => g.saveForUnload());
    d.visibilityState = 'hidden'; d.fire('visibilitychange'); await settle(); expect(g.newerSave).toBe(SAVE_VERSION + 1);
    w.fire('pagehide'); w.fire('beforeunload'); g.endSession(); await settle();
    expect(await get(f, IDB_KEY)).toBe(NEWER); expect(await get(f, UNLOAD_KEY)).toBeUndefined();
  });
});
describe('M4-19 rev 3: transitive ranking over 3+ copies', () => {
  const A = sv(1, T + 1000, 5), B = sv(2, T + 2000), C = sv(3, T + 3000, 3);
  it('mixed seq/no-seq set ranks all by savedAt (no cycle): C > B > A in every order', () => {
    expect(rankMode([A, B, C])).toBe('savedAt');
    const at = (r: string) => (validate(r, b) as any).file.savedAt; const c = (x: string, y: string) => rankCompareIn('savedAt', { raw: x, savedAt: at(x) }, { raw: y, savedAt: at(y) }, T + 1e6);
    expect(c(C, B)).toBe(1); expect(c(B, A)).toBe(1); expect(c(C, A)).toBe(1); // transitive
    for (const [ls, idb, u] of [[A, B, C], [B, A, C]]) expect(rankUnload(ls, idb, u, b, T + 1e6)).toBe('win');
    expect(rankUnload(C, B, A, b, T + 1e6)).toBe('older'); expect(rankUnload(A, C, B, b, T + 1e6)).toBe('older');
  });
  it('mixed set, all 6 placements of 3 copies: unload wins iff it is the newest savedAt (C)', () => {
    const perms: [string, string, string][] = [[A, B, C], [A, C, B], [B, A, C], [B, C, A], [C, A, B], [C, B, A]];
    for (const [ls, idb, u] of perms) expect(rankUnload(ls, idb, u, b, T + 1e6)).toBe(u === C ? 'win' : 'older');
  });
  it('unload byte-identical to LS main ties IDB main: ranks as LS main (win), not diverged', () => {
    const L = sv(5, T + 4000); // I2: same rank (savedAt, no seq), different bytes
    const I2 = serialize({ ...initialState(b, 1), coinsCents: 5, basket: 1 }, T + 4000);
    expect(rankUnload(L, I2, L, b, T + 1e6)).toBe('win');
    expect(rankUnload(I2, L, sv(6, T + 4000), b, T + 1e6)).toBe('diverged'); // a genuine tie with distinct bytes still diverges
  });
  it('all with a seq: seq first, then savedAt', () => {
    const X = sv(1, T + 9000, 2), Y = sv(2, T, 7);
    expect(rankMode([X, Y])).toBe('seq'); expect(rankUnload(X, null, Y, b, T + 1e6)).toBe('win'); expect(pickNewest(Y, X, b, T + 1e6)).toBe('ls');
  });
  it('Architect m2: reconcile reuses bootUnload\'s whole-set mode (IDB main without saveSeq -> savedAt mode end to end)', async () => {
    const LS = sv(1, T + 1000, 5), IDBM = sv(2, T + 2000), U = sv(3, T + 3000, 3); // pairwise LS vs U would be seq mode: LS wins
    const f = new IDBFactory(); await put(f, IDB_KEY, IDBM); await put(f, UNLOAD_KEY, U); const kv = mem(); kv.setItem(SAVE_KEY, LS);
    const r = await boot(f, kv); expect(r.mode).toBe('savedAt'); expect(r.verdict).toBe('win'); expect(r.promoted).toBe(true);
    expect(pickNewest(LS, U, b, T + 1e6)).toBe('ls'); // the stale pairwise mode would keep LS
    expect(reconcile(kv, r.idbRaw, b, T + 1e6, r.mode)).toBe('idb'); expect(kv.getItem(SAVE_KEY)).toBe(U);
    expect(await get(f, IDB_KEY)).toBe(U); expect(await get(f, UNLOAD_KEY)).toBeUndefined();
  });
});
