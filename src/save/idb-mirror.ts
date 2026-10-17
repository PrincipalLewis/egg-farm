/**
 * D2 (rc1): a second, durable copy of the save in IndexedDB. localStorage is written synchronously but the browser
 * flushes it to disk lazily (QA: purchases lost on a browser kill 0.1-3 s later). Each save is also put into IndexedDB in
 * a readwrite transaction with durability 'strict' (the commit waits for the disk flush), except the pagehide/beforeunload
 * write (SD5-1), which is 'relaxed' so it is in the engine before the document goes away (it survives a browser kill once
 * handed to the OS; a power loss right after a tab close can lose it). On boot the newest valid copy
 * (version + checksum via validate()) wins and is written back to localStorage before the Game loads, so the existing
 * synchronous load, migrations and recovery paths are unchanged. No IndexedDB (private mode, blocked, error, timeout):
 * localStorage only, as in rc0.
 */
import type { Balance } from '../config/balance';
import { SAVE_KEY, validate, preserveCorrupt, newerStoredVersion, newerSaveVersion, rankMode, rankCompareIn, type KV, type RankMode } from './save';
export const IDB_NAME = 'eggfarm', IDB_STORE = 'save', IDB_KEY = 'main';
/** SD5-1 option (b): the close-time save's own key (eggfarm/save/unload). Outside the M4 two-slot recovery. */
export const UNLOAD_KEY = 'unload';
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
  private tx(mode: IDBTransactionMode, durability: 'strict' | 'relaxed' = 'strict') { return this.db.transaction(IDB_STORE, mode, { durability } as IDBTransactionOptions); }
  /** SD5-1 m2: raw of the last CLOSE write whose put was issued (its own dedupe key: a stuck normal write never
   *  suppresses it); cleared on failure, on a normal write and on clear(). */
  private lastUnloadRaw: string | null = null;
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
   *  - normal (autosave, purchases, visibilitychange→hidden; the page survives): BUG-2 / M4-19 get + newer-check + put on
   *    `main` in ONE readwrite transaction, durability 'strict', so a newer-build copy is never overwritten.
   *  - `unload` (pagehide / beforeunload / endSession only; SD5-1 option (b), M4-19 rev 3): an unconditional put to its OWN
   *    key `eggfarm/save/unload` plus an explicit commit(), durability 'relaxed', so the transaction is in the engine
   *    before the document goes away (Firefox never completed a get-then-put there). It never touches `main` (nor any
   *    diverged slot), so it can never overwrite a newer copy; boot ranks it like any other copy (rankUnload/bootUnload).
   *  Once this tab has seen a newer-build copy (newer !== null) nothing is written, `unload` included (§3b zero writes).
   *  The promise resolves on complete/abort/error. */
  write(raw: string, opts: { unload?: boolean } = {}): Promise<void> {
    if (this.newer !== null) return Promise.resolve();
    const close = !!opts.unload;
    if (close && raw === this.lastUnloadRaw) return Promise.resolve(); // pagehide + beforeunload of one state
    if (!close) this.lastUnloadRaw = null;
    try {
      const t = this.tx('readwrite', close ? 'relaxed' : 'strict'); const os = t.objectStore(IDB_STORE); this.pending++;
      const p = new Promise<void>(res => { let fin = false; const done = (ok: boolean) => { if (fin) return; fin = true; this.pending--; if (!ok) { this.failed = true; if (this.lastUnloadRaw === raw) this.lastUnloadRaw = null; } res(); }; t.oncomplete = () => done(true); t.onerror = t.onabort = () => done(false); });
      if (close) { os.put(raw, UNLOAD_KEY); this.lastUnloadRaw = raw; (t as IDBTransaction & { commit?: () => void }).commit?.(); }
      else { const g = os.get(IDB_KEY); g.onsuccess = () => { if (this.seeNewer(g.result) === null) os.put(raw, IDB_KEY); }; }
      return p;
    } catch { this.failed = true; if (this.lastUnloadRaw === raw) this.lastUnloadRaw = null; return Promise.resolve(); }
  }
  /** SD5-1 (b): the close-time copy (raw string), or null when missing / not a string / IndexedDB fails. */
  async readUnload(ms = 1500): Promise<string | null> {
    try { const v = await timeout(req(this.tx('readonly').objectStore(IDB_STORE).get(UNLOAD_KEY)), ms); return typeof v === 'string' ? v : null; }
    catch { return null; }
  }
  /** SD5-1 (b) promote: put `raw` into `main` (strict, in-transaction newer check: a newer-build main is never replaced),
   *  read `main` back in a new transaction, and only when it is byte-identical delete `unload` (and only if `unload` still
   *  holds `raw`). Returns true when main verifiably holds `raw`. Any failure keeps `unload`. Idempotent: a crash between
   *  the promote and the delete leaves main === unload, which the next boot resolves as 'promoted' (delete only). */
  async promoteUnload(raw: string, ms = 1500): Promise<boolean> {
    if (this.newer !== null) return false;
    try {
      const cur = await this.read(ms); if (this.newer !== null) return false;
      if (cur !== raw) {
        const ok = await timeout(new Promise<boolean>(res => {
          const t = this.tx('readwrite'); const os = t.objectStore(IDB_STORE); let put = false;
          const g = os.get(IDB_KEY); g.onsuccess = () => { if (this.seeNewer(g.result) === null) { os.put(raw, IDB_KEY); put = true; } };
          t.oncomplete = () => res(put); t.onerror = t.onabort = () => res(false);
        }), ms);
        if (!ok) return false;
        if ((await this.read(ms)) !== raw) return false; // read-back verify
      }
      await timeout(new Promise<void>(res => {
        const t = this.tx('readwrite'); const os = t.objectStore(IDB_STORE);
        const g = os.get(UNLOAD_KEY); g.onsuccess = () => { if (g.result === raw) os.delete(UNLOAD_KEY); };
        t.oncomplete = t.onerror = t.onabort = () => res();
      }), ms);
      return true;
    } catch { return false; }
  }
  /** Reset save: remove the mirror copy (resolves once committed or failed). */
  clear(): Promise<void> {
    this.lastUnloadRaw = null;
    try { const t = this.tx('readwrite'); const os = t.objectStore(IDB_STORE); os.delete(IDB_KEY); os.delete(UNLOAD_KEY); /* reset: the close copy must not bring progress back */ return new Promise(res => { t.oncomplete = t.onerror = t.onabort = () => res(); }); }
    catch { return Promise.resolve(); }
  }
}
export type Pick_ = 'ls' | 'idb';
/** Newest valid copy. Ties and an invalid/missing IndexedDB copy keep localStorage. */
export function pickNewest(lsRaw: string | null, idbRaw: string | null, b: Balance, now = Date.now(), setMode?: RankMode): Pick_ {
  if (idbRaw === null || idbRaw === lsRaw) return 'ls';
  const iv = validate(idbRaw, b); if (!iv.ok) return 'ls';
  if (lsRaw === null) return 'idb';
  const lv = validate(lsRaw, b); if (!lv.ok) return 'idb';
  // v4 (QA e3, Reviewer N2): a savedAt invalid for offline earnings (missing, null, <= 0, pre-2020, or in the future beyond
  // SAVED_AT_SKEW_MS) is the OLDEST copy and never beats a valid one; both invalid -> tie -> localStorage.
  // M4-19 rev 3: ONE rank mode for the whole candidate set. At boot the caller passes bootUnload's mode (computed over
  // all valid copies: LS main, IDB main, unload) so this LS-vs-winner step keeps the same order; without it the mode
  // is computed over these two copies (seq only when both carry a saveSeq).
  const mode = setMode ?? rankMode([idbRaw, lsRaw]);
  return rankCompareIn(mode, { raw: idbRaw, savedAt: iv.file.savedAt }, { raw: lsRaw, savedAt: lv.file.savedAt }, now) > 0 ? 'idb' : 'ls';
}
/** Boot step, before `new Game`: write the IndexedDB copy back into localStorage when it is the newest valid one.
 *  A corrupt localStorage save it replaces is preserved first (eggfarm.save.corrupt.<ts>, AC14b). Returns which won. */
export function reconcile(kv: KV, idbRaw: string | null, b: Balance, now = Date.now(), setMode?: RankMode): Pick_ {
  const lsRaw = kv.getItem(SAVE_KEY);
  if (newerStoredVersion(kv, idbRaw) !== null) return 'ls'; // M4 save in main, .bak or IndexedDB: never write any copy
  const w = pickNewest(lsRaw, idbRaw, b, now, setMode);
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

/** SD5-1 (b) boot verdict for the close-time copy (M4-19 rev 3):
 *  - 'none': no unload copy.
 *  - 'promoted': unload is byte-identical to IndexedDB main (a crash between promote and delete): just delete it.
 *  - 'win': unload is valid and strictly outranks every other valid copy (localStorage main, IndexedDB main) under ONE
 *    rank mode for the whole set (transitive): promote it to main (write + read-back), then delete unload.
 *  - 'diverged': F2-EQ, it ties the best other copy by rank but the bytes differ. Flag off (this build, no M4 diverged
 *    slots): it stays in unload, main is not overwritten. With the M4/SQ-1 flag on it takes the diverged-slot path.
 *  - 'older' / 'corrupt': never overwrites main; left in unload untouched (the next close replaces it).
 *  Equal bytes to localStorage only (IndexedDB main differs) counts as 'win' (promoting identical content is safe). */
export type UnloadVerdict = 'none' | 'promoted' | 'win' | 'diverged' | 'older' | 'corrupt';
/** M4-19 rev 3: the rank mode over ALL valid copies (LS main, IDB main, unload); reused by reconcile at boot. */
export function setRankMode(raws: (string | null)[], b: Balance): RankMode {
  return rankMode([...new Set(raws.filter((r): r is string => r !== null && validate(r, b).ok))]);
}
export function rankUnload(lsRaw: string | null, idbRaw: string | null, unloadRaw: string | null, b: Balance, now = Date.now()): UnloadVerdict {
  if (unloadRaw === null) return 'none';
  if (unloadRaw === idbRaw) return 'promoted';
  const uv = validate(unloadRaw, b); if (!uv.ok) return 'corrupt';
  // Ties use a fixed order LS main > IDB main > unload: a tying unload copy is 'diverged' and never promoted (unless it
  // is byte-identical to LS main, which ranks as LS main).
  const others: { raw: string; savedAt: unknown }[] = [];
  for (const r of [lsRaw, idbRaw]) { if (r === null || r === unloadRaw) continue; const v = validate(r, b); if (v.ok) others.push({ raw: r, savedAt: v.file.savedAt }); }
  const mode = rankMode([unloadRaw, ...others.map(o => o.raw)]);
  const u = { raw: unloadRaw, savedAt: uv.file.savedAt };
  let tie = false;
  for (const o of others) { const c = rankCompareIn(mode, u, o, now); if (c < 0) return 'older'; if (c === 0) tie = true; }
  // An unload copy byte-identical to LS main IS LS main's content, so it takes LS main's tie precedence (LS > IDB main):
  // a tie with IDB main is a win (promote + delete), not 'diverged' (rc0 unloadmirror: unload was left behind forever).
  return tie && unloadRaw !== lsRaw ? 'diverged' : 'win';
}
/** The subset of IdbMirror the boot step needs (tests pass the real mirror on fake-indexeddb). */
export interface UnloadStore { readUnload(): Promise<string | null>; promoteUnload(raw: string): Promise<boolean>; }
/** SD5-1 (b) boot step, BEFORE reconcile: resolve the close-time copy. Returns the IndexedDB raw that reconcile should
 *  use (the unload copy when it won, even if the promote failed: unload is kept and retried next boot) and the verdict.
 *  Callers have already refused a newer-build copy in any key (newerStoredVersion with the unload raw), so nothing here
 *  runs on the §3b refusal path. */
export async function bootUnload(store: UnloadStore, kv: Pick<KV, 'getItem'>, idbRaw: string | null, unloadRaw: string | null, b: Balance, now = Date.now()): Promise<{ idbRaw: string | null; verdict: UnloadVerdict; promoted: boolean; mode: RankMode }> {
  let lsRaw: string | null = null; try { lsRaw = kv.getItem(SAVE_KEY); } catch { /* blocked */ }
  const mode = setRankMode([lsRaw, idbRaw, unloadRaw], b); // pass to reconcile: same order for the LS-vs-winner step
  const verdict = rankUnload(lsRaw, idbRaw, unloadRaw, b, now);
  if (verdict === 'promoted') return { idbRaw, verdict, promoted: await store.promoteUnload(unloadRaw!), mode };
  if (verdict !== 'win') return { idbRaw, verdict, promoted: false, mode };
  const promoted = await store.promoteUnload(unloadRaw!);
  return { idbRaw: unloadRaw, verdict, promoted, mode };
}
