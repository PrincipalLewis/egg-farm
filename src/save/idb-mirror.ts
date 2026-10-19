/**
 * D2 (rc1): a second, durable copy of the save in IndexedDB. localStorage is written synchronously but the browser
 * flushes it to disk lazily (QA: purchases lost on a browser kill 0.1-3 s later). Each save is also put into IndexedDB in
 * a readwrite transaction with durability 'strict' (the commit waits for the disk flush). On boot the newest valid copy
 * (version + checksum via validate()) wins and is written back to localStorage before the Game loads, so the existing
 * synchronous load, migrations and recovery paths are unchanged. No IndexedDB (private mode, blocked, error, timeout):
 * localStorage only, as in rc0.
 */
import type { Balance } from '../config/balance';
import { SAVE_KEY, validate, newerStoredVersion, newerSaveVersion, rankCompare, pickNewest, type KV, type IdbInput } from './save';
export { pickNewest } from './save';
export const IDB_NAME = 'eggfarm', IDB_STORE = 'save', IDB_KEY = 'main';
/** CSR-AC-IDB1 IDB1-1 (spec v0.3.3): corrupt copies live in the SAME store as `main`, keys corrupt.<ts> / corrupt.<ts>-<n>
 *  (the localStorage collision suffix, save.ts preserveCorrupt), no index key (enumerated by prefix), cap 3 per store. */
export const IDB_CORRUPT_PREFIX = 'corrupt.', IDB_CORRUPT_KEEP = 3;
export type IdbValueKind = 'string' | 'nonstring' | 'none';
const corruptParts = (k: string): [number, number] => { const m = /^corrupt\.(\d+)(?:-(\d+))?$/.exec(k); return m ? [Number(m[1]), m[2] ? Number(m[2]) : 0] : [Infinity, Infinity]; };
/** Oldest first by parsed (ts, n), never lexical (corrupt.5-10 is newer than corrupt.5-2). */
export const idbCorruptOrder = (a: string, b: string) => { const [ta, na] = corruptParts(a), [tb, nb] = corruptParts(b); return ta - tb || na - nb; };
/** IDB1-4: dedupe fingerprint; null = can't be compared (cyclic, BigInt, ...): no dedupe, the cap bounds it. */
const fingerprint = (v: unknown): string | null => { if (typeof v === 'string') return `s:${v}`; try { const j = JSON.stringify(v); return j === undefined ? null : `${typeof v}:${j}`; } catch { return null; } };
const kindOf = (v: unknown): IdbValueKind => v === undefined || v === null ? 'none' : typeof v === 'string' ? 'string' : 'nonstring';
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
  static async openForBoot(factory: IdbFactory | undefined = (globalThis as any).indexedDB, ms = IDB_OPEN_TIMEOUT_MS): Promise<{ mirror: IdbMirror | null; status: IdbBoot; raw: string | null; reason?: string; value: unknown; kind: IdbValueKind }> {
    if (!factory) return { mirror: null, status: 'absent', raw: null, reason: 'no_global', value: null, kind: 'none' };
    const sec = (e: unknown) => ['SecurityError', 'InvalidStateError'].includes((e as any)?.name);
    let db: IDBDatabase, blocked = false;
    try {
      const r = factory.open(IDB_NAME, 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(IDB_STORE)) r.result.createObjectStore(IDB_STORE); };
      (r as any).onblocked = () => { blocked = true; };
      db = await timeout(req(r).catch(e => { throw (r as any).error ?? e; }), ms);
    } catch (e) {
      if (sec(e)) return { mirror: null, status: 'absent', raw: null, reason: 'security', value: null, kind: 'none' };
      return { mirror: null, status: 'unknown', raw: null, reason: blocked ? 'idb_blocked' : (e as Error)?.message === 'idb timeout' ? 'idb_timeout' : 'idb_read_error', value: null, kind: 'none' };
    }
    const m = new IdbMirror(db); const v = await m.readValue(IDB_BOOT_READ_TIMEOUT_MS);
    if (v === undefined) return { mirror: m, status: 'unknown', raw: null, reason: 'idb_read_error', value: null, kind: 'none' };
    return { mirror: m, status: 'ok', raw: v.kind === 'string' ? v.value as string : null, value: v.value, kind: v.kind };
  }
  /** Read IndexedDB main: the string, null (no copy) or undefined (the read failed / timed out). Never throws. */
  async readStrict(ms?: number): Promise<string | null | undefined> {
    try { const g = req(this.tx('readonly').objectStore(IDB_STORE).get(IDB_KEY)); const v = await (ms === undefined ? g : timeout(g, ms)); if (typeof v !== 'string') return null; this.seeNewer(v); return v; }
    catch { return undefined; }
  }

  /** IDB1-2: the raw value at save/main plus its kind (a non-string is corrupt, never "no copy"); undefined = read failed. */
  async readValue(ms?: number): Promise<{ kind: IdbValueKind; value: unknown } | undefined> {
    try { const g = req(this.tx('readonly').objectStore(IDB_STORE).get(IDB_KEY)); const v = await (ms === undefined ? g : timeout(g, ms)); if (typeof v === 'string') this.seeNewer(v); return { kind: kindOf(v), value: v ?? null }; }
    catch { return undefined; }
  }
  /** IDB1-1..4: keep a corrupt save/main value as corrupt.<ts>[-n] in this store, structured-cloned as is, deduped against every
   *  existing corrupt.* value, oldest by (ts, n) evicted beyond IDB_CORRUPT_KEEP and `main` deleted, all in ONE readwrite
   *  transaction (so the stale corrupt main can't outrank the new farm's first write, idb-mirror write() rank guard). Resolves
   *  true once committed (or already kept), false on DataCloneError / QuotaExceededError / abort (IDB1-3). Never throws. */
  preserveCorrupt(value: unknown, ts: number): Promise<boolean> {
    return new Promise(res => {
      let done = false; const fin = (ok: boolean) => { if (!done) { done = true; res(ok); } };
      try {
        const t = this.tx('readwrite'), os = t.objectStore(IDB_STORE);
        t.oncomplete = () => fin(true); t.onerror = t.onabort = () => fin(false);
        const fp = fingerprint(value), kr = os.getAllKeys();
        kr.onsuccess = () => {
          try {
            const keys = (kr.result as IDBValidKey[]).filter((k): k is string => typeof k === 'string' && k.startsWith(IDB_CORRUPT_PREFIX)).sort(idbCorruptOrder);
            const vals: unknown[] = []; let left = keys.length;
            const next = () => {
              if (fp !== null && vals.some(v => fingerprint(v) === fp)) { os.delete(IDB_KEY); return; } // already kept
              let key = `${IDB_CORRUPT_PREFIX}${ts}`; for (let n = 1; keys.includes(key); n++) key = `${IDB_CORRUPT_PREFIX}${ts}-${n}`;
              os.put(value, key); os.delete(IDB_KEY);
              const all = [...keys, key].sort(idbCorruptOrder); while (all.length > IDB_CORRUPT_KEEP) os.delete(all.shift()!);
            };
            if (left === 0) { next(); return; }
            keys.forEach((k, i) => { const g = os.get(k); g.onsuccess = () => { try { vals[i] = g.result; if (--left === 0) next(); } catch { try { t.abort(); } catch { /* */ } fin(false); } }; });
          } catch { try { t.abort(); } catch { /* already finished */ } fin(false); }
        };
      } catch { fin(false); }
    });
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
   *  BUG-2: get + check + put run in ONE readwrite transaction, so a newer-build copy is never overwritten (no put).
   *  CCR m3 (ADR M4-19, accepted): if a main (pre-saveSeq) session's every mirror write fails, IndexedDB keeps this build's
   *  older copy with seq N while localStorage holds main's newer unsequenced save; this build's next boot then prefers the
   *  stale IDB copy. Needs a total IDB write failure across a whole session plus a downgrade/upgrade; unlikely, accepted. */
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
/** Stale-LS step (M41-7: loadSafe owns this; kept for callers/tests): write the IndexedDB copy back into localStorage when it is
 *  the newest valid one. Spec v0.3.3 CSR-3: it never touches a CORRUPT localStorage main (that is a recovery: loadSafe). */
export function reconcile(kv: KV, idbRaw: string | null, b: Balance, now = Date.now()): Pick_ {
  const lsRaw = kv.getItem(SAVE_KEY);
  if (newerStoredVersion(kv, idbRaw) !== null) return 'ls'; // M4 save in main, .bak or IndexedDB: never write any copy
  if (lsRaw !== null && !validate(lsRaw, b).ok) return 'ls';
  const w = pickNewest(lsRaw, idbRaw, b, now);
  if (w === 'idb') { try { kv.setItem(SAVE_KEY, idbRaw!); } catch { /* quota: Game falls back to localStorage as-is */ return 'ls'; } }
  return w;
}
/** CSR-AC-IDB1 IDB1-5: boot step after lease.claim + owns() and BEFORE `new Game`: an invalid save/main value (corrupt string or
 *  any non-string) is copied into corrupt.* and the transaction awaited, so the new farm's first save can never destroy it.
 *  'none' = nothing to keep (no mirror, IDB not definite, no copy, or a valid copy); 'failed' => main.ts hands Game NO mirror. */
export async function bootPreserveIdb(mirror: Pick<IdbMirror, 'preserveCorrupt'> | null, idb: IdbInput, b: Balance, now = Date.now()): Promise<'none' | 'copied' | 'failed'> {
  if (!mirror || idb.status !== 'ok' || idb.raw === null || idb.raw === undefined) return 'none';
  if (typeof idb.raw === 'string' && validate(idb.raw, b).ok) return 'none';
  return (await mirror.preserveCorrupt(idb.raw, now)) ? 'copied' : 'failed';
}
/** save_restore telemetry (QA D1): 'idb' only when the IndexedDB copy wins and replaces localStorage; otherwise null
 *  (no copy, identical, or IndexedDB older/one save behind/invalid - the normal tab-close case). */
export function restoreSource(lsRaw: string | null, idbRaw: string | null, b: Balance, now = Date.now()): 'idb' | null {
  return idbRaw !== null && idbRaw !== lsRaw && pickNewest(lsRaw, idbRaw, b, now) === 'idb' ? 'idb' : null;
}
