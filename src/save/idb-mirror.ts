/**
 * D2 (rc1): a second, durable copy of the save in IndexedDB. localStorage is written synchronously but the browser
 * flushes it to disk lazily (QA: purchases lost on a browser kill 0.1-3 s later). Each save is also put into IndexedDB in
 * a readwrite transaction with durability 'strict' (the commit waits for the disk flush). On boot the newest valid copy
 * (version + checksum via validate()) wins and is written back to localStorage before the Game loads, so the existing
 * synchronous load, migrations and recovery paths are unchanged. No IndexedDB (private mode, blocked, error, timeout):
 * localStorage only, as in rc0.
 */
import type { Balance } from '../config/balance';
import { SAVE_KEY, validate, preserveCorrupt, newerStoredVersion, newerSaveVersion, type KV } from './save';
export const IDB_NAME = 'eggfarm', IDB_STORE = 'save', IDB_KEY = 'main';
/** The subset of IDBFactory we use (lets unit tests pass a fake). */
export type IdbFactory = Pick<IDBFactory, 'open'>;
const req = <T>(r: IDBRequest<T>) => new Promise<T>((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const timeout = <T>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('idb timeout')), ms))]);
export class IdbMirror {
  /** Writes started but not yet committed (tests/diagnostics). */
  pending = 0; failed = false;
  constructor(private db: IDBDatabase) {}
  /** Open (or create) the mirror database; null when IndexedDB is missing, blocked, errors or takes > ms. */
  static async open(factory: IdbFactory | undefined = (globalThis as any).indexedDB, ms = 1500): Promise<IdbMirror | null> {
    if (!factory) return null;
    try {
      const r = factory.open(IDB_NAME, 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(IDB_STORE)) r.result.createObjectStore(IDB_STORE); };
      const db = await timeout(req(r), ms);
      return new IdbMirror(db);
    } catch { return null; }
  }
  private tx(mode: IDBTransactionMode) { return this.db.transaction(IDB_STORE, mode, { durability: 'strict' } as IDBTransactionOptions); }
  async read(ms = 1500): Promise<string | null> {
    try { const v = await timeout(req(this.tx('readonly').objectStore(IDB_STORE).get(IDB_KEY)), ms); if (typeof v !== 'string') return null; this.seeNewer(v); return v; }
    catch { return null; }
  }
  /** BUG-2: version of a newer-build copy seen in IndexedDB (by read() or by a write's in-transaction check), else null. */
  newer: number | null = null;
  /** Called once when a write finds a newer-build copy in IndexedDB and skips the put. */
  onNewer: ((v: number) => void) | null = null;
  private seeNewer(raw: unknown) { const v = typeof raw === 'string' ? newerSaveVersion(raw) : null; if (v !== null && this.newer === null) { this.newer = v; this.onNewer?.(v); } return v; }
  /** Fire-and-forget durable write; transactions on one store commit in order, so the last save wins. Never throws.
   *  BUG-2: get + check + put run in ONE readwrite transaction, so a newer-build copy is never overwritten (no put). */
  write(raw: string): Promise<void> {
    if (this.newer !== null) return Promise.resolve();
    try {
      const t = this.tx('readwrite'); const os = t.objectStore(IDB_STORE); this.pending++;
      const g = os.get(IDB_KEY); g.onsuccess = () => { if (this.seeNewer(g.result) === null) os.put(raw, IDB_KEY); };
      return new Promise(res => { let fin = false; const done = (ok: boolean) => { if (fin) return; fin = true; this.pending--; if (!ok) this.failed = true; res(); }; t.oncomplete = () => done(true); t.onerror = t.onabort = () => done(false); });
    } catch { this.failed = true; return Promise.resolve(); }
  }
  /** Reset save: remove the mirror copy (resolves once committed or failed). */
  clear(): Promise<void> {
    try { const t = this.tx('readwrite'); t.objectStore(IDB_STORE).delete(IDB_KEY); return new Promise(res => { t.oncomplete = t.onerror = t.onabort = () => res(); }); }
    catch { return Promise.resolve(); }
  }
}
export type Pick_ = 'ls' | 'idb';
/** Newest valid copy. Ties and an invalid/missing IndexedDB copy keep localStorage. */
export function pickNewest(lsRaw: string | null, idbRaw: string | null, b: Balance): Pick_ {
  if (idbRaw === null || idbRaw === lsRaw) return 'ls';
  const iv = validate(idbRaw, b); if (!iv.ok) return 'ls';
  if (lsRaw === null) return 'idb';
  const lv = validate(lsRaw, b); if (!lv.ok) return 'idb';
  // Review minor: a missing/invalid savedAt (NaN after validate) is the OLDEST copy, never beats a valid one.
  const t = (x: number) => Number.isFinite(x) ? x : -Infinity;
  return t(iv.file.savedAt) > t(lv.file.savedAt) ? 'idb' : 'ls';
}
/** Boot step, before `new Game`: write the IndexedDB copy back into localStorage when it is the newest valid one.
 *  A corrupt localStorage save it replaces is preserved first (eggfarm.save.corrupt.<ts>, AC14b). Returns which won. */
export function reconcile(kv: KV, idbRaw: string | null, b: Balance, now = Date.now()): Pick_ {
  const lsRaw = kv.getItem(SAVE_KEY);
  if (newerStoredVersion(kv, idbRaw) !== null) return 'ls'; // M4 save in main, .bak or IndexedDB: never write any copy
  const w = pickNewest(lsRaw, idbRaw, b);
  if (w === 'idb') {
    if (lsRaw !== null && !validate(lsRaw, b).ok) preserveCorrupt(kv, lsRaw, now);
    try { kv.setItem(SAVE_KEY, idbRaw!); } catch { /* quota: Game falls back to localStorage as-is */ return 'ls'; }
  }
  return w;
}
/** save_restore telemetry (QA D1): 'idb' only when the IndexedDB copy wins and replaces localStorage; otherwise null
 *  (no copy, identical, or IndexedDB older/one save behind/invalid - the normal tab-close case). */
export function restoreSource(lsRaw: string | null, idbRaw: string | null, b: Balance): 'idb' | null {
  return idbRaw !== null && idbRaw !== lsRaw && pickNewest(lsRaw, idbRaw, b) === 'idb' ? 'idb' : null;
}
