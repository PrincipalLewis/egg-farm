// Test-only fake IndexedDB (moved from tests/csr-idb1-mirror.test.ts for reuse; M41-7 D-HOP-2026-10-22-01 adds abortOnCommit).
export type Fail = { cloneOnPut?: boolean; quotaOnPut?: boolean; /** D-HOP-2026-10-22-01 (a): every request succeeds, then the transaction aborts (no commit). */ abortOnCommit?: boolean;
  /** CSR-8 8b (QA's injected delay): the FIRST readwrite transaction holds its commit until release(); every transaction created
   *  after it waits for it first (IndexedDB runs overlapping-scope transactions in creation order). */ holdFirstReadwrite?: boolean };
/** Fake IndexedDB, one store, ordered transactions; log = committed ops `${txId}:${op}:${key}`. */
export function fakeIdb(fail: Fail = {}) {
  const data = new Map<string, unknown>(); const log: string[] = []; const ranges: unknown[] = []; let txN = 0; let chain = Promise.resolve();
  let gate: Promise<void> | null = null, held = false, release = () => {};
  const later = (f: () => void) => setTimeout(f, 0);
  const db: any = { objectStoreNames: { contains: () => true }, createObjectStore() {},
    transaction(_n: string, mode: string) {
      const id = ++txN; const t: any = { mode }; const staged: [string, string, unknown][] = []; let open = 0, bad: any = null;
      t.abort = () => { bad = bad ?? new DOMException('aborted', 'AbortError'); };
      const wait = gate; let hold: Promise<void> | null = null;
      if (fail.holdFirstReadwrite && mode === 'readwrite' && !held) { held = true; hold = gate = new Promise<void>(r => { release = () => { gate = null; r(); }; }); }
      const step = (f: () => void) => { open++; const run = () => later(() => { try { f(); } catch (e) { bad = e; } if (--open === 0) finish(); }); if (wait) void wait.then(run); else run(); };
      const finish = () => hold ? void hold.then(commit) : commit();
      const commit = () => later(() => { if (!bad && fail.abortOnCommit && mode === 'readwrite' && staged.some(([op, k]) => op === 'put' && k.startsWith('corrupt.'))) bad = new DOMException('aborted', 'AbortError'); if (bad) { t.error = bad; (t.onabort ?? t.onerror)?.(); return; }
        for (const [op, k, v] of staged) { if (op === 'put') data.set(k, v); else data.delete(k); log.push(`${id}:${op}:${k}`); } t.oncomplete?.(); });
      const view = () => { const m = new Map(data); for (const [op, k, v] of staged) op === 'put' ? m.set(k, v) : m.delete(k); return m; };
      t.objectStore = () => ({
        get: (k: string) => { const r: any = {}; step(() => { r.result = view().get(k); r.onsuccess?.(); }); return r; },
        getAllKeys: (q?: { lower: string; upper: string }) => { ranges.push(q); const r: any = {}; step(() => { r.result = [...view().keys()].filter(k => !q || (k >= q.lower && k <= q.upper)).sort(); r.onsuccess?.(); }); return r; },
        put: (v: unknown, k: string) => {
          if (fail.cloneOnPut && k.startsWith('corrupt.')) throw new DOMException('x', 'DataCloneError');
          step(() => { if (fail.quotaOnPut && k.startsWith('corrupt.')) throw new DOMException('full', 'QuotaExceededError'); staged.push(['put', k, structuredClone(v)]); }); return {};
        },
        delete: (k: string) => { step(() => staged.push(['del', k, undefined])); return {}; },
      });
      return t;
    } };
  void chain;
  const factory: any = { open: () => { const r: any = {}; later(() => { r.result = db; r.onupgradeneeded?.(); r.onsuccess?.(); }); return r; } };
  return { db, data, log, factory, ranges, release: () => release() };
}
