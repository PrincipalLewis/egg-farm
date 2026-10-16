/**
 * D2 (rc1): a second, durable copy of the save in IndexedDB. localStorage is written synchronously but the browser
 * flushes it to disk lazily (QA: purchases lost on a browser kill 0.1-3 s later). Each save is also put into IndexedDB in
 * a readwrite transaction with durability 'strict' (the commit waits for the disk flush). On boot the newest valid copy
 * (version + checksum via validate()) wins and is written back to localStorage before the Game loads, so the existing
 * synchronous load, migrations and recovery paths are unchanged. No IndexedDB (private mode, blocked, error, timeout):
 * localStorage only, as in rc0.
 */
import type { Balance } from '../config/balance';
import { SAVE_KEY, validate, preserveCorrupt, newerStoredVersion, newerSaveVersion, savedAtRank, rankCompare, type KV } from './save';
export const IDB_NAME = 'eggfarm', IDB_STORE = 'save', IDB_KEY = 'main';
/** ADR M4-11: IDB copy of the one-time v6 backup (same bytes as localStorage eggfarm.save.v6_backup). */
export type IdbBoot = 'ok' | 'absent' | 'unknown';
/** Spec v1.10: the 1500 ms rule is the OPEN timeout (IDB_OPEN_TIMEOUT_MS). Boot reads keep rc1's existing 1.5 s read
 *  timeout (unchanged behaviour; a boot can't hang on a stuck read); the migration's pre-commit re-read has none. */
export const IDB_BOOT_READ_TIMEOUT_MS = 1500;
/** rc1 D2 mirror open timeout; also the migration-backup open timeout (M4-16 ruling N1). */
export const IDB_OPEN_TIMEOUT_MS = 1500;
/** The subset of IDBFactory we use (lets unit tests pass a fake). */
export type IdbFactory = Pick<IDBFactory, 'open'>;
const req = <T>(r: IDBRequest<T>) => new Promise<T>((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const timeout = <T>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('idb timeout')), ms))]);
export class IdbMirror {
  /** Writes started but not yet committed (tests/diagnostics). */
  pending = 0; failed = false;
  constructor(private db: IDBDatabase) {}
  /** Open (or create) the mirror database; null when IndexedDB is missing, blocked, errors or takes > ms. */
  static async open(factory: IdbFactory | undefined = (globalThis as any).indexedDB, ms = IDB_OPEN_TIMEOUT_MS): Promise<IdbMirror | null> {
    if (!factory) return null;
    try {
      const r = factory.open(IDB_NAME, 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(IDB_STORE)) r.result.createObjectStore(IDB_STORE); };
      const db = await timeout(req(r), ms);
      return new IdbMirror(db);
    } catch { return null; }
  }
  /** m4-design §3d / M4-20: open + read IndexedDB main at boot with a definite outcome for the migration.
   *  'absent' = no indexedDB global, or open throws/rejects SecurityError/InvalidStateError (private mode; M4-16
   *  "security"); 'unknown' = open timeout, blocked, any other error or a failed read (the migration defers);
   *  'ok' = read succeeded (raw may be null = no IDB copy). */
  static async openForBoot(factory: IdbFactory | undefined = (globalThis as any).indexedDB, ms = IDB_OPEN_TIMEOUT_MS): Promise<{ mirror: IdbMirror | null; status: IdbBoot; raw: string | null; reason?: string }> {
    if (!factory) return { mirror: null, status: 'absent', raw: null, reason: 'no_global' };
    const sec = (e: unknown) => ['SecurityError', 'InvalidStateError'].includes((e as any)?.name);
    let db: IDBDatabase, blocked = false;
    try {
      const r = factory.open(IDB_NAME, 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(IDB_STORE)) r.result.createObjectStore(IDB_STORE); };
      (r as any).onblocked = () => { blocked = true; };
      db = await timeout(req(r).catch(e => { throw (r as any).error ?? e; }), ms);
    } catch (e) {
      if (sec(e)) return { mirror: null, status: 'absent', raw: null, reason: 'security' };
      return { mirror: null, status: 'unknown', raw: null, reason: blocked ? 'idb_blocked' : (e as Error)?.message === 'idb timeout' ? 'idb_timeout' : 'idb_read_error' };
    }
    const m = new IdbMirror(db); const v = await m.readStrict(IDB_BOOT_READ_TIMEOUT_MS);
    if (v === undefined) return { mirror: m, status: 'unknown', raw: null, reason: 'idb_read_error' };
    return { mirror: m, status: 'ok', raw: v };
  }
  /** Read IndexedDB main: the string, null (no copy) or undefined (the read failed / timed out). Never throws. */
  async readStrict(ms?: number): Promise<string | null | undefined> {
    try { const g = req(this.tx('readonly').objectStore(IDB_STORE).get(IDB_KEY)); const v = await (ms === undefined ? g : timeout(g, ms)); if (typeof v !== 'string') return null; this.seeNewer(v); return v; }
    catch { return undefined; }
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
      const g = os.get(IDB_KEY); g.onsuccess = () => { if (this.seeNewer(g.result) === null && !(typeof g.result === 'string' && rankCompare(g.result, raw) > 0)) os.put(raw, IDB_KEY); }; // M4-19: never over a higher-ranked copy
      return new Promise(res => { let fin = false; const done = (ok: boolean) => { if (fin) return; fin = true; this.pending--; if (!ok) this.failed = true; res(); }; t.oncomplete = () => done(true); t.onerror = t.onabort = () => done(false); });
    } catch { this.failed = true; return Promise.resolve(); }
  }
  /** Reset save: remove the mirror copy (resolves once committed or failed). */
  clear(): Promise<void> {
    try { const t = this.tx('readwrite'); const os = t.objectStore(IDB_STORE); os.delete(IDB_KEY); return new Promise(res => { t.oncomplete = t.onerror = t.onabort = () => res(); }); }
    catch { return Promise.resolve(); }
  }
}
export type Pick_ = 'ls' | 'idb';
/** Newest valid copy. Ties and an invalid/missing IndexedDB copy keep localStorage. */
export function pickNewest(lsRaw: string | null, idbRaw: string | null, b: Balance, now = Date.now()): Pick_ {
  if (idbRaw === null || idbRaw === lsRaw) return 'ls';
  const iv = validate(idbRaw, b); if (!iv.ok) return 'ls';
  if (lsRaw === null) return 'idb';
  const lv = validate(lsRaw, b); if (!lv.ok) return 'idb';
  // v4 (QA e3, Reviewer N2): a savedAt invalid for offline earnings (missing, null, <= 0, pre-2020, or in the future beyond
  // SAVED_AT_SKEW_MS) is the OLDEST copy and never beats a valid one; both invalid -> tie -> localStorage.
  // M4-19: version, then committed (tracksV7 + v6BackupId), then savedAt as the tie-break only.
  const c = rankCompare(idbRaw, lsRaw, now); if (c !== 0) return c > 0 ? 'idb' : 'ls';
  return savedAtRank(iv.file.savedAt, now) > savedAtRank(lv.file.savedAt, now) ? 'idb' : 'ls';
}
/** Boot step, before `new Game`: write the IndexedDB copy back into localStorage when it is the newest valid one.
 *  A corrupt localStorage save it replaces is preserved first (eggfarm.save.corrupt.<ts>, AC14b). Returns which won. */
export function reconcile(kv: KV, idbRaw: string | null, b: Balance, now = Date.now()): Pick_ {
  const lsRaw = kv.getItem(SAVE_KEY);
  if (newerStoredVersion(kv, idbRaw) !== null) return 'ls'; // M4 save in main, .bak or IndexedDB: never write any copy
  const w = pickNewest(lsRaw, idbRaw, b, now);
  if (w === 'idb') {
    if (lsRaw !== null && !validate(lsRaw, b).ok) preserveCorrupt(kv, lsRaw, now);
    try { kv.setItem(SAVE_KEY, idbRaw!); } catch { /* quota: Game falls back to localStorage as-is */ return 'ls'; }
  }
  return w;
}
/** save_restore telemetry (QA D1): 'idb' only when the IndexedDB copy wins and replaces localStorage; otherwise null
 *  (no copy, identical, or IndexedDB older/one save behind/invalid - the normal tab-close case). */
export function restoreSource(lsRaw: string | null, idbRaw: string | null, b: Balance, now = Date.now()): 'idb' | null {
  return idbRaw !== null && idbRaw !== lsRaw && pickNewest(lsRaw, idbRaw, b, now) === 'idb' ? 'idb' : null;
}
