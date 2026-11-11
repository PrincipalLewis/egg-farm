// M41-7 CSR intake skeleton (spec m41-final 6131c290…). Saves QA 2026-10-22. Copy into <worktree>/tests/ and run:
//   npx vitest run --maxWorkers=2 --minWorkers=1 tests/csr-m41-7.qa.test.ts
// Writes per-case results to $CSR_OUT (default /workspace/egg-farm-studio/qa/m41/csr-baseline/vitest-<sha7>.json).
// TARGET assertions = the spec. At main dd223f5 most are EXPECTED TO FAIL (negative control); the result file records why.
// The ONLY build-specific piece is boot() below: it mirrors src/main.ts boot order at dd223f5 (openForBoot -> newer check ->
// reconcile -> new Game). At intake, re-derive it from the candidate's main.ts (loadSafe(kv,b,now,{status,raw,reason}),
// IDB corrupt copy awaited before new Game) and record the diff in the report. Nothing else should need editing.
import { describe, it, expect, afterAll, vi } from 'vitest';
import fs from 'node:fs'; import crypto from 'node:crypto'; import { execSync } from 'node:child_process';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import * as SV from '../src/save/save';
import * as IM from '../src/save/idb-mirror';
import * as UI from '../src/ui/save-recovery';
const FX = '/workspace/egg-farm-studio/qa/m41/csr-fixtures/';
const SHA7 = (() => { try { return execSync('git rev-parse --short=7 HEAD', { cwd: __dirname }).toString().trim(); } catch { return 'unknown'; } })();
const OUT = process.env.CSR_OUT ?? `/workspace/egg-farm-studio/qa/m41/csr-baseline/vitest-${SHA7}.json`;
const res: Record<string, any> = {}; afterAll(() => { fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify({ sha7: SHA7, results: res }, null, 1)); });
const rdRef = (base: string, ref: string) => fs.readFileSync(new URL(ref, 'file://' + base).pathname, 'utf8');
// ---- KV with fault injection ----
function kvOf(init: Record<string, string>, o: { throws?: string; quota?: string } = {}) {
  const m = new Map(Object.entries(init)); const writes: string[] = [];
  const err = (n: string) => Object.assign(new Error(n), { name: n });
  const kv: any = { m, writes,
    getItem: (k: string) => { if (o.throws) throw err(o.throws); return m.get(k) ?? null; },
    setItem: (k: string, v: string) => { if (o.throws) throw err(o.throws);
      if (o.quota === 'all-setItem' || (o.quota === 'corrupt.*' && k.startsWith(SV.CORRUPT_PREFIX)) || (o.quota === 'eggfarm.save' && k === SV.SAVE_KEY)) throw err('QuotaExceededError');
      writes.push(k); m.set(k, v); },
    removeItem: (k: string) => { writes.push('-' + k); m.delete(k); } };
  return kv;
}
// ---- fake IndexedDB with a transaction log (getAllKeys/cursor/prefix ranges for the new code) ----
(globalThis as any).IDBKeyRange ??= { bound: (lower: string, upper: string) => ({ lower, upper, includes: (k: string) => k >= lower && k <= upper }) };
function fakeIdb(mode: 'ok' | 'unknown', recs: [string, unknown][], fail?: 'DataCloneError' | 'QuotaExceededError', fx: { throwOnPutKey?: string; abortOnPutKey?: string; throwOnDeleteKey?: string } = {}) {
  // 8694222 (-07(b) AC4): fault hooks for the Reset tx. An exception thrown from a request's success handler aborts the tx (IDB spec), as in real IndexedDB.
  // Transactional fake: each readwrite tx buffers puts/deletes and applies them on complete; an abort discards them.
  const data = new Map<string, unknown>(recs); const log: string[] = []; let txn = 0; const later = (f: () => void) => setTimeout(f, 0);
  const inRange = (q: any, k: string) => q == null || (typeof q === 'string' ? q === k : q.includes ? q.includes(k) : (k >= q.lower && k <= q.upper));
  const db: any = { objectStoreNames: { contains: () => true }, createObjectStore: () => {}, close: () => {},
    transaction() { const id = ++txn; const t: any = { error: null }; let open = 0, aborted = false, finished = false; const pend = new Map<string, unknown>(); const DEL = Symbol('del');
      const view = () => { const m = new Map(data); for (const [k, v] of pend) v === DEL ? m.delete(k) : m.set(k, v); return m; };
      const finish = () => { if (finished) return; finished = true; if (aborted) { log.push(`tx${id}:abort`); t.onabort?.(); return; } for (const [k, v] of pend) v === DEL ? data.delete(k) : data.set(k, v); log.push(`tx${id}:complete`); t.oncomplete?.(); };
      const step = () => { if (--open === 0) later(finish); };
      t.abort = () => { aborted = true; if (open === 0) later(finish); };
      const r = (fn: () => unknown, failIt = false) => { const q: any = {}; open++; later(() => { if (aborted) { step(); return; } if (failIt) { q.error = Object.assign(new Error('fail'), { name: 'UnknownError' }); q.onerror?.(); aborted = true; step(); return; } q.result = fn(); try { q.onsuccess?.(); } catch { log.push(`tx${id}:handler-threw`); aborted = true; } step(); }); return q; };
      t.objectStore = () => ({
        get: (k: string) => r(() => view().get(k), mode === 'unknown'),
        getAllKeys: (q?: any) => r(() => [...view().keys()].filter(k => inRange(q, k)).sort()),
        getAll: (q?: any) => r(() => [...view().entries()].filter(([k]) => inRange(q, k)).sort().map(e => e[1])),
        put: (v: unknown, k: string) => { if (fail === 'DataCloneError' && k.startsWith('corrupt.')) throw Object.assign(new Error('clone'), { name: 'DataCloneError' });
          if (fx.throwOnPutKey === k) { log.push(`tx${id}:put-threw:${k}`); throw Object.assign(new Error('qa throw in reset tx'), { name: 'UnknownError' }); }
          if (fx.abortOnPutKey === k) { log.push(`tx${id}:abort-at-put:${k}`); t.error = Object.assign(new Error('quota'), { name: 'QuotaExceededError' }); t.abort(); }
          log.push(`tx${id}:put:${k}`); if (fail === 'QuotaExceededError' && k.startsWith('corrupt.')) { aborted = true; t.error = Object.assign(new Error('quota'), { name: 'QuotaExceededError' }); }
          return r(() => { pend.set(k, v); return k; }); },
        delete: (k: any) => { if (fx.throwOnDeleteKey === k) { log.push(`tx${id}:delete-threw:${k}`); throw Object.assign(new Error('qa throw in reset tx'), { name: 'UnknownError' }); } log.push(`tx${id}:delete:${k}`); return r(() => { pend.set(k, DEL); }); },
      }); return t; } };
  const factory: any = { open: () => { const q: any = {}; later(() => { q.result = db; q.onupgradeneeded?.(); q.onsuccess?.(); }); return q; } };
  return { factory, data, log };
}
// ---- boot (dd223f5 main.ts order, minus UI; lease always owned unless sc.leaseLost) ----
const NEW_BOOT = typeof (IM as any).bootPreserveIdb === 'function'; // 9cce82d+: no reconcile in main.ts; IDB copy awaited before Game
async function boot(sc: any, prev?: { ls: Map<string, string>; idb: Map<string, unknown> }) {
  const ls: Record<string, string> = {}; for (const [k, v] of Object.entries<any>(sc.ls ?? {})) ls[k] = typeof v === 'string' ? fs.readFileSync(FX + v, 'utf8') : v.value ?? rdRef(FX, v.ref);
  let idbSpec = sc.idb ?? { status: 'ok', records: [] }; let recs: [string, unknown][] = [];
  if (sc.idbManifest || sc.idbManifestRecords) { const man = JSON.parse(rdRef(FX, sc.idbManifest ?? sc.idbManifestRecords)); recs = man.idb.records.map((r: any) => [r.key, r.value]); if (sc.idbManifest) for (const [k, v] of Object.entries<string>(man.localStorage.set)) ls[k] = v; idbSpec = { status: 'ok' }; }
  else if ('main' in idbSpec) { if (idbSpec.main) recs = [['main', fs.readFileSync(FX + idbSpec.main, 'utf8')]]; }
  else recs = (idbSpec.records ?? []).map((r: any) => [r.key, rdRef(FX, r.ref)]);
  const kv = kvOf(prev ? Object.fromEntries(prev.ls) : ls, { throws: sc.lsThrows, quota: sc.lsQuota }); const v6Before = kv.m.get(SV.V6_BACKUP_KEY) ?? null;
  const idb = idbSpec.status === 'absent' ? null : fakeIdb(idbSpec.status === 'unknown' ? 'unknown' : 'ok', prev ? [...prev.idb] : recs, sc.idbFail);
  const idbMainBefore = JSON.stringify(idb?.data.get('main'));
  const bootIdb: any = await IM.IdbMirror.openForBoot(idb ? idb.factory : (undefined as any));
  let g: Game | null = null, err: string | null = null, restored = false, newer: number | null = null, idbCopy: string | undefined;
  try { try { newer = SV.newerStoredVersion(kv, bootIdb.raw); } catch { /* blocked */ }
    if (newer === null) {
      if (NEW_BOOT) { const idbIn = { status: bootIdb.status, raw: bootIdb.value, reason: bootIdb.reason }; idbCopy = await (IM as any).bootPreserveIdb(bootIdb.mirror, idbIn, b, sc.now, () => true);
        // b986cd3+ (CSR-8 8b): orphan IndexedDB corrupt copy when no main anywhere (main.ts:100-101)
        let idbVal: unknown = bootIdb.value; if (idbCopy === 'none' && typeof (IM as any).bootOrphanIdb === 'function') { const o = await (IM as any).bootOrphanIdb(bootIdb.mirror, idbIn, kv, b); if (o) { idbVal = o.value; idbCopy = 'copied'; } }
        g = new Game(b, kv, () => sc.now, 1, 'qa', idbCopy === 'failed' ? null : bootIdb.mirror, idbVal, { idbBoot: bootIdb.status, idbAbsentReason: bootIdb.reason, idbCopy } as any); }
      else { if (bootIdb.mirror) { try { restored = IM.reconcile(kv, bootIdb.raw, b, sc.now) === 'idb'; } catch { /* blocked */ } }
        g = new Game(b, kv, () => sc.now, 1, 'qa', bootIdb.mirror, bootIdb.raw, { idbBoot: bootIdb.status, idbAbsentReason: bootIdb.reason } as any);
        if (restored) g.telemetry.track('save_restore', { source: 'idb' }); } } } catch (e) { err = String(e); }
  await new Promise(r => setTimeout(r, 20));
  if (g && !g.newerSave && !sc.noSave) { try { g.save(); } catch { /* storage */ } } // sc.noSave: tab dies before the first autosave (-07(b) edges) await new Promise(r => setTimeout(r, 30));
  const ev = g ? [...g.telemetry.events()] as any[] : [];
  const corruptLs = [...kv.m.keys()].filter((k: string) => k.startsWith(SV.CORRUPT_PREFIX) && k !== SV.CORRUPT_INDEX_KEY);
  const r: any = { g, err, newer, kv, idb, bootIdb, idbCopy, ev, corruptLs, v6Before, idbMainBefore,
    corrupt: ev.filter(e => e.type === 'save_corrupt'), restoreEv: ev.filter(e => e.type === 'save_restore'), restoredEv: ev.filter(e => e.type === 'save_restored'), noticeEv: ev.filter(e => /^save_recovery_notice/.test(e.type)) };
  r.leaseBlocked = !!sc.leaseBlocked; // main.ts: lease.storageBlocked -> notice M5 (Game not involved)
  if (sc.bootTwice && !prev && idb) { const r2 = await boot({ ...sc, bootTwice: false }, { ls: kv.m, idb: idb.data }); r2.first = r; return r2; }
  return r;
}
const notice = (r: any, now: number) => typeof (UI as any).recoveryNotice === 'function' && r.g?.recovery ? (UI as any).recoveryNotice(r.g.recovery, { storageBlocked: !!r.leaseBlocked, now }) : undefined;
// ---- generic expectation checker: returns [name, pass, got][] ----
function check(sc: any, r: any) {
  const x = sc.expect, out: [string, boolean, unknown][] = []; const c = (n: string, p: boolean, got: unknown) => out.push([n, !!p, got]);
  const sc0 = r.corrupt[0] ?? {}; const rec: any = r.g?.recovery ?? null;
  if (r.err) c('boot without exception', false, r.err.slice(0, 200));
  if (x.recovery === true) c('recovery non-null (no silent new game)', rec !== null, rec && rec.case);
  if (x.recovery === false) c('no recovery', rec === null, rec && rec.case);
  if (x.noSaveCorrupt) c('no save_corrupt', r.corrupt.length === 0, r.corrupt.length);
  if (x.recovery === true || x.recovered_from) c('save_corrupt exactly once', r.corrupt.length === 1, r.corrupt.length);
  if (x.reason) c(`save_corrupt.reason=${x.reason}`, sc0.reason === x.reason, sc0.reason);
  if (x.recovered_from) { c(`save_corrupt.recovered_from=${x.recovered_from}`, sc0.recovered_from === x.recovered_from, sc0.recovered_from); c(`recovery.source=${x.recovered_from}`, rec?.source === x.recovered_from, rec?.source); }
  if (x.store) c(`save_corrupt.store=${x.store}`, sc0.store === x.store, sc0.store);
  if (x.tried) c('tried[] exact', JSON.stringify((sc0.tried ?? []).map((t: any) => [t.source, t.result, ...(t.reason ? [t.reason] : [])])) === JSON.stringify(x.tried), sc0.tried);
  if (x.triedResults) for (const [s, want] of Object.entries<string>(x.triedResults)) { const t = (sc0.tried ?? []).find((y: any) => y.source === s); const walked = !!t;
    // list stops at the winner (Q-2): a source after the winner may be absent from tried
    c(`tried ${s}=${want}`, walked ? t.result === want : (x.recovered_from && x.recovered_from !== s && ['bak', 'idb', 'v6_backup'].indexOf(s) > ['bak', 'idb', 'v6_backup'].indexOf(x.recovered_from)) || x.recovered_from === 'deferred', t?.result ?? 'not listed'); }
  if (x.farmLevel !== undefined) c(`farmLevel=${x.farmLevel}`, r.g?.state.farmLevel === x.farmLevel, r.g?.state.farmLevel);
  if (x.newGame) c('new game', r.g?.isNewGame === true, r.g?.isNewGame);
  if (x.newer !== undefined) c(`newer=${x.newer}`, (r.newer ?? r.g?.newerSave ?? null) === x.newer, r.newer ?? r.g?.newerSave);
  if (x.corruptLsMin !== undefined) c(`LS corrupt.* >= ${x.corruptLsMin}`, r.corruptLs.length >= x.corruptLsMin, r.corruptLs.length);
  if (x.corruptLsMax !== undefined) c(`LS corrupt.* <= ${x.corruptLsMax}`, r.corruptLs.length <= x.corruptLsMax, r.corruptLs.length);
  if (x.corruptLsExact !== undefined) c(`LS corrupt.* == ${x.corruptLsExact}`, r.corruptLs.length === x.corruptLsExact, r.corruptLs.length);
  if (x.v6bUnchanged || x.v6bUnchangedAtBoot) c('v6_backup byte-identical', r.kv.m.get(SV.V6_BACKUP_KEY) === (r.v6Before ?? undefined), r.kv.m.get(SV.V6_BACKUP_KEY) === (r.v6Before ?? undefined));
  if (x.v6bNeverCopied || x.noCorruptValueEquals) c('v6_backup never copied to corrupt.*', !r.corruptLs.some((k: string) => r.kv.m.get(k) === r.v6Before || (r.v6Before && r.kv.m.get(k) === SV.decodeBackup(r.v6Before)?.raw)), r.corruptLs.length);
  if (x.idbPutsAfterAutosave === 0) c('zero IDB puts after a save (mirror null)', r.idb ? r.idb.log.filter((l: string) => l.includes(':put:')).length === 0 : true, r.idb?.log.filter((l: string) => l.includes(':put:')));
  if (x.noSaveWrite) c('no save write (main/.bak/v6_backup/IDB main)', !r.kv.writes.some((k: string) => [SV.SAVE_KEY, SV.BAK_KEY, SV.V6_BACKUP_KEY].includes(k)) && !(r.idb?.log ?? []).some((l: string) => l.endsWith(':put:main')), r.kv.writes);
  if (x.noRestoreEventOrSaveRestore || x.noSaveRestoreEvent) c('no save_restore (corrupt path)', r.restoreEv.length === 0, r.restoreEv.length);
  if (x.saveRestoreIdbCount !== undefined) c(`save_restore{source:idb} x${x.saveRestoreIdbCount}`, r.restoreEv.filter((e: any) => e.source === 'idb').length === x.saveRestoreIdbCount, r.restoreEv.length);
  if (x.saveRestoredCount === 0) c('never save_restored', r.restoredEv.length === 0, r.restoredEv.length);
  if (x.idbCorruptExact !== undefined) { const ks = r.idb ? [...r.idb.data.keys()].filter((k: string) => k.startsWith('corrupt.')) : []; c(`IDB corrupt.* == ${x.idbCorruptExact}`, ks.length === x.idbCorruptExact, ks); }
  if (x.idbCorruptByteEqual) { const ks = r.idb ? [...r.idb.data.keys()].filter((k: string) => k.startsWith('corrupt.')) : []; const before = JSON.parse(r.idbMainBefore ?? 'null'); c('IDB corrupt.* byte/deep-equal to seeded main', ks.some((k: string) => JSON.stringify(r.idb.data.get(k)) === JSON.stringify(before)), ks.length); }
  if (x.corruptPutBeforeFirstMainPut) { const L = r.idb?.log ?? []; const ci = L.findIndex((l: string) => l.includes(':put:corrupt.')), mi = L.findIndex((l: string) => l.endsWith(':put:main')); c('IDB corrupt.* put precedes first main put', ci >= 0 && (mi < 0 || ci < mi), L.slice(0, 6)); }
  if (x.coinsCents === 'initialState') c('fresh farm coins = initialState', r.g?.state.coinsCents === 0, r.g?.state.coinsCents);
  if (x.noSaveRepaired) c('no save_repaired', !r.ev.some((e: any) => e.type === 'save_repaired'), 0);
  if (x.notice !== undefined && x.notice !== null && /^M[1-5]$|^storage$/.test(x.notice)) { const n = notice(r, sc.now); c(`notice=${x.notice}`, n?.id === x.notice, n === undefined ? 'recoveryNotice() not in build' : n?.id); }
  if (x.variant) { const n = notice(r, sc.now); c(`variant=${x.variant}`, n?.variant === x.variant, n?.variant ?? 'n/a'); }
  if (x.prevLevel !== undefined) c(`recovery.prevLevel=${x.prevLevel}`, (rec?.prevLevel ?? null) === x.prevLevel, rec?.prevLevel ?? null);
  if (x.tracksMigrationPending) c('tracks migration pending after v6_backup restore', (r.g as any)?.tracksMigrationPending === true, (r.g as any)?.tracksMigrationPending);
  if (x.triedPairs) c('tried[] [source,result] exact (D-HOP-22-03)', JSON.stringify((sc0.tried ?? []).map((t: any) => [t.source, t.result])) === JSON.stringify(x.triedPairs), (sc0.tried ?? []).map((t: any) => `${t.source}:${t.result}`));
  if (x.idbBytesNotInLs) { const idbVals = r.idb ? [...r.idb.data.entries()].filter(([k]: any) => String(k).startsWith('corrupt.')).map(([, v]: any) => v) : []; const lsVals = r.corruptLs.map((k: string) => r.kv.m.get(k));
    const seeded = JSON.parse(r.idbMainBefore ?? 'null'); c('IDB corrupt bytes kept only in IDB (never also in LS)', !lsVals.includes(seeded), { lsCopies: lsVals.length, idbCopies: idbVals.length }); }
  if (x.recoveryCase) c(`recovery.case=${x.recoveryCase}`, rec?.case === x.recoveryCase, rec?.case ?? null);
  if (x.mainDeleteOnlyInPutTx) { const L = r.idb?.log ?? []; const dels = L.filter((l: string) => l.endsWith(':delete:main')).map((l: string) => l.split(':')[0]); const putTx = L.filter((l: string) => l.includes(':put:corrupt.')).map((l: string) => l.split(':')[0]);
    c('IDB main deleted only in the tx of a committed corrupt.* put', dels.length > 0 && dels.every((t: string) => putTx.includes(t) && L.includes(`${t}:complete`)), L.slice(0, 8)); }
  if (x.noIdbMainDelete) { const L = r.idb?.log ?? []; const committedDel = L.filter((l: string) => l.endsWith(':delete:main')).map((l: string) => l.split(':')[0]).filter((t: string) => L.includes(`${t}:complete`)); c('no committed delete of IDB main', committedDel.length === 0, L.slice(0, 8)); }
  if (x.idbMainUnchanged) c('IDB main byte-identical after boot + save', r.idb ? JSON.stringify(r.idb.data.get('main')) === r.idbMainBefore : true, r.idb ? String(JSON.stringify(r.idb.data.get('main'))).slice(0, 40) : null);
  if (x.idbPutsToMain === 0) c('zero IDB puts to main', !(r.idb?.log ?? []).some((l: string) => l.endsWith(':put:main')), (r.idb?.log ?? []).filter((l: string) => l.endsWith(':put:main')).length);
  if (x.copy_failed) c('save_corrupt.copy_failed === true', sc0.copy_failed === true, sc0.copy_failed);
  if (x.noNotice) c('no notice selected / no dialog', !rec && r.noticeEv.length === 0, rec?.case ?? null);
  if (x.idbEvicted) c(`IDB evicted ${x.idbEvicted}`, r.idb && !r.idb.data.has(x.idbEvicted) && (x.idbKept ?? []).every((k: string) => r.idb.data.has(k)), r.idb ? [...r.idb.data.keys()] : null);
  return out;
}
const scen = fs.readdirSync(FX + 'scenarios').filter(f => f.endsWith('.json')).sort().map(f => JSON.parse(fs.readFileSync(FX + 'scenarios/' + f, 'utf8')));
const matrix = JSON.parse(fs.readFileSync(FX + 'csr2-matrix.json', 'utf8')).cases;
describe('fixture integrity', () => {
  it('SHA256SUMS', () => { const bad = fs.readFileSync(FX + 'SHA256SUMS', 'utf8').trim().split('\n').map(l => l.split('  ')).filter(([h, n]) => crypto.createHash('sha256').update(fs.readFileSync(FX + n)).digest('hex') !== h); expect(bad).toEqual([]); });
  it('raw fixtures validate() as labelled (this build)', () => {
    const want: Record<string, string> = { 'TRIG-empty.txt': 'empty', 'TRIG-whitespace.txt': 'empty', 'TRIG-parse-truncated.raw': 'parse', 'TRIG-wrong_type-array.json': 'wrong_type', 'TRIG-wrong_type-version-string.raw': 'wrong_type', 'TRIG-wrong_type-savedAt-string.json': 'wrong_type', 'TRIG-version-0.json': 'version', 'TRIG-version-1.5.json': 'version', 'TRIG-missing_state.json': 'missing_state', 'TRIG-checksum.json': 'checksum', 'TRIG-invalid_state-coins-neg.json': 'invalid_state', 'MAIN-OQ1-abc.json': 'invalid_state', 'BAK-invalid-neg1.json': 'invalid_state', 'IDB-invalid-truncated.raw': 'parse', 'BAK-L15-badsum.json': 'checksum', 'MAIN-L17-badsum.json': 'checksum',
      'BAK-valid-F20-seq4-older.json': 'ok', 'BAK-valid-F20-seq6.json': 'ok', 'IDB-valid-F17-seq4-T-10m.json': 'ok', 'IDB-valid-F19-tie-with-BAK-F20-seq4.json': 'ok', 'MIG-v1-coins-float.json': 'ok', 'MIG-v2-customers-nofilled.json': 'ok', 'MIG-v3-no-celebratedTier.json': 'ok' };
    const got: Record<string, string> = {}; for (const n of Object.keys(want)) { const v = SV.validate(fs.readFileSync(FX + 'raw/' + n, 'utf8'), b, 1792378840000); got[n] = v.ok ? 'ok' : v.reason; }
    const v6: Record<string, string> = {}; for (const n of fs.readdirSync(FX + 'raw').filter(f => f.startsWith('V6B-'))) { const d = SV.decodeBackup(fs.readFileSync(FX + 'raw/' + n, 'utf8')); v6[n] = !d ? 'undecodable' : ((v => v.ok ? 'ok' : v.reason)(SV.validate(d.raw, b, 1792378840000))); }
    res['fixture-validate'] = { got, v6 }; expect(got).toEqual(want);
    expect(v6).toEqual({ 'V6B-invalid-raw-abc.json': 'invalid_state', 'V6B-invalid-raw-version7.json': 'version', 'V6B-invalid-short-id.json': 'undecodable', 'V6B-invalid-undecodable.txt': 'undecodable', 'V6B-valid-unmarked-F12-T-3h.json': 'ok', 'V6B-valid-unmarked-F12-savedAt-pre2020.json': 'ok', 'V6B-valid-unmarked-F14-T-1d.json': 'ok' });
    expect(SV.rankCompare(fs.readFileSync(FX + 'raw/IDB-valid-F17-seq4-T-10m.json', 'utf8'), fs.readFileSync(FX + 'raw/BAK-valid-F20-seq4-older.json', 'utf8'), 1792378840000)).toBeGreaterThan(0);
    expect(SV.rankCompare(fs.readFileSync(FX + 'raw/BAK-valid-F20-seq6.json', 'utf8'), fs.readFileSync(FX + 'raw/IDB-valid-F17-seq4-T-10m.json', 'utf8'), 1792378840000)).toBeGreaterThan(0);
    expect(SV.rankCompare(fs.readFileSync(FX + 'raw/BAK-valid-F20-seq4-older.json', 'utf8'), fs.readFileSync(FX + 'raw/IDB-valid-F19-tie-with-BAK-F20-seq4.json', 'utf8'), 1792378840000)).toBe(0);
  });
});
const run = (sc: any) => it(sc.id, async () => { const r = await boot(sc); const ch = check(sc, r); const fails = ch.filter(x => !x[1]);
  res[sc.id] = { csr: sc.csr, pass: fails.length === 0, checks: ch.length, fails: fails.map(([n, , g]) => `${n} (got ${JSON.stringify(g)?.slice(0, 120)})`), observed: { case: r.g?.recovery?.case ?? null, outcome: r.g?.recoveryOutcome ?? null, newGame: r.g?.isNewGame, F: r.g?.state.farmLevel, save_corrupt: r.corrupt.length, lsCorrupt: r.corruptLs.length, idbKeys: r.idb ? [...r.idb.data.keys()] : null, idbMainOverwritten: r.idb ? JSON.stringify(r.idb.data.get('main')) !== r.idbMainBefore : null } };
  expect(fails.map(f => f[0])).toEqual([]); });
describe('CSR scenarios (target = spec m41-final)', () => { for (const sc of scen) run(sc); });
describe('CSR-2 matrix (target)', () => { for (const sc of matrix) run(sc); });
describe('CSR-10 notice store (target: passthrough, null when unset, never defaulted to ls)', () => {
  const recs: any[] = [{ case: 'R', reason: 'invalid_state', had_backup: true, restored_from_backup: true, copy_failed: false, raw: 'x', source: 'bak' }, { case: 'F', reason: 'parse', had_backup: false, restored_from_backup: false, copy_failed: false, raw: 'x', source: 'none' }, { case: 'R', reason: 'invalid_state', had_backup: false, restored_from_backup: true, copy_failed: false, raw: 'x', source: 'v6_backup', restoredSavedAt: 1792378780000 }];
  for (const st of ['ls', 'idb', undefined]) for (const rc of recs) it(`store ${st ?? 'unset'} / ${rc.source}`, () => {
    const has = typeof (UI as any).recoveryNotice === 'function' && typeof (UI as any).noticePayload === 'function';
    const rr = { ...rc, ...(st ? { store: st } : {}) }; const n = has ? (UI as any).recoveryNotice(rr, { storageBlocked: false, now: 1792378840000 }) : null; const p = has && n ? (UI as any).noticePayload(n, rr) : null;
    const want = st ?? null; const got = p ? (p.store === undefined ? null : p.store) : 'n/a';
    res[`CSR10-store-${st ?? 'unset'}-${rc.source}`] = { pass: got === want, got, payload: p }; expect(got).toBe(want); });
});
describe('CSR-9 copy M1-M5 incl. M5 secondary Export save file (target)', () => {
  const N = 1792378840000; const base: any = { reason: 'invalid_state', had_backup: false, copy_failed: false, raw: 'x', store: 'ls' };
  const C: [string, any, boolean, string, string, string, string | null][] = [
    ['M1', { ...base, case: 'R', restored_from_backup: true, source: 'bak' }, false, 'Your farm is back!', 'We fixed a hiccup and restored your latest save.', 'Continue', null],
    ['M3', { ...base, case: 'F', restored_from_backup: false, source: 'none' }, false, 'A fresh start', "We couldn't recover your save, so we started a new farm for you.", 'Start farming', 'Export old save file'],
    ['M4', { ...base, case: 'D', restored_from_backup: false, source: 'deferred' }, false, "Couldn't load your farm", "Your save is safe. Let's try that again.", 'Try again', 'Export save file'],
    ['M5', { ...base, case: 'R', restored_from_backup: true, source: 'bak', live: () => '{}' }, true, 'Your farm is back!', 'Saving is paused on this device right now, so progress may not be kept.', 'Continue', 'Export save file']];
  for (const [id, rr, blocked, t, bd, btn, link] of C) it(id, () => { const has = typeof (UI as any).csrCopy === 'function'; const n = has ? (UI as any).recoveryNotice(rr, { storageBlocked: blocked, now: N }) : null; const cp = n ? (UI as any).csrCopy(n, rr) : null;
    const got = { id: n?.id, title: cp?.title, body: cp?.body, button: cp?.button, link: id === 'M1' ? null : cp?.exportLabel ?? null, aria: cp?.exportAria };
    const want = { id, title: t, body: bd, button: btn, link, aria: got.aria };
    const ok = JSON.stringify({ ...got }) === JSON.stringify(want) && (id !== 'M5' || /current farm/.test(String(got.aria)));
    res[`CSR9-copy-${id}`] = { pass: ok, got }; expect(ok ? 'ok' : got).toBe('ok'); });
});
describe('CSR-9b {age} formatter (target)', () => {
  const cases = JSON.parse(fs.readFileSync(FX + 'csr9b-age-cases.json', 'utf8'));
  it('formatter exported', () => { const f = (UI as any).formatAge ?? (UI as any).ageText; res['csr9b-exported'] = { pass: typeof f === 'function', names: Object.keys(UI) }; expect(typeof f).toBe('function'); });
  for (const c of cases.filter((c: any) => !/unit|unreachable/.test(c.text))) it(`${c.ageMs} -> ${c.text}`, () => { const f = (UI as any).formatAge ?? (UI as any).ageText; const got = typeof f === 'function' ? f(c.ageMs) : 'no formatter'; res[`csr9b-${c.ageMs}`] = { pass: got === c.text, got }; expect(got).toBe(c.text); });
});
describe('CSR-15 property: no silent zero (target)', () => {
  const corpus = fs.readFileSync(FX + 'csr15-mutations.jsonl', 'utf8').trim().split('\n').map(l => JSON.parse(l));
  it(`${corpus.length} mutations: invalid main => recovery + save_corrupt x1`, async () => { const silent: string[] = []; let invalid = 0;
    for (const m of corpus) { const v = SV.validate(m.raw, b, 1792378840000); if (v.ok || SV.newerSaveVersion(m.raw) !== null) continue; invalid++; // newer = M4A-31(b) refusal, not corrupt
      const r = await boot({ id: m.id, now: 1792378840000, ls: { 'eggfarm.save': { value: m.raw } }, idb: { status: 'ok', records: [] } });
      if (!r.g?.recovery || r.corrupt.length !== 1) silent.push(m.id); }
    res['CSR15-property'] = { pass: silent.length === 0, invalid, silent: silent.length, sample: silent.slice(0, 10) }; expect(silent).toEqual([]); }, 60_000);
});
describe('known finding KF-IDB-ONLY (negative control at dd223f5: expect the bug)', () => {
  it('IDB-only truncated copy: silent new game and save/main overwritten by the fresh farm', async () => {
    const r = await boot({ id: 'kf', now: 1792378840000, idbManifest: '../../csr/fixtures/idb1/IDB1-truncated.manifest.json' });
    const silent = r.g?.recovery === null && r.g?.isNewGame === true && r.corrupt.length === 0; const overwritten = JSON.stringify(r.idb!.data.get('main')) !== r.idbMainBefore;
    res['KF-IDB-ONLY'] = { reproduces: silent && overwritten, silent, overwritten, idbKeys: [...r.idb!.data.keys()] };
    expect({ silent, overwritten }).toBeDefined(); // informational: the target is the IDB1-* scenarios above
  });
});
// ===================================================================================================================
// RESET_AT -07(b) KEY MEMBERSHIP: D-HOP-2026-10-22-07 (b) as amended by D-HOP-2026-10-23-01 (spec 2fbcd4eb line 28). Saves QA 2026-10-23.
// Settings > Reset = SV.resetProgress(localStorage) + Game.clearMirror() -> IdbMirror.clear(): ONE IDB tx deletes main and writes
// IDB 'reset.surfaced' = the corrupt.* keys present at reset. bootOrphanIdb skips exactly those keys; clock time is never consulted.
// The LS eggfarm.save.reset_at rule is VOID (asserted absent). Result keys keep the 'RESET_AT-' prefix (runner filter).
// AC1 pre-reset copy -> no dialog; AC2 post-reset corrupt main -> CSR chain; AC3 = AC1 with the clock rolled back >= 1 day;
// AC4 aborted reset tx -> (part 1) IDB main, every corrupt.* and reset.surfaced unchanged, (part 2) the next boot equals the pre-reset boot;
// CLK (HoQA item 5): clock ahead at Reset, then rolled back; a post-reset corrupt main still follows the chain.
// Real functions only: SV.preserveCorrupt, IdbMirror.preserveCorrupt, SV.resetProgress, IdbMirror.clear (via openForBoot), boot() = main.ts order.
// ===================================================================================================================
describe('RESET_AT -07(b) key membership reset.surfaced (D-HOP-2026-10-23-01)', () => {
  const RS: string = (IM as any).IDB_RESET_KEY ?? 'reset.surfaced', RA_VOID = 'eggfarm.save.reset_at';
  const rawFx = (n: string) => fs.readFileSync(FX + 'raw/' + n, 'utf8');
  const T = 1792378840000, D = 86400_000, HR = 3600_000, T_OLD = T - 2 * HR, T_POST = T - 600_000;
  const LS_JUNK = rawFx('PRIOR-corrupt-1.raw'), IDB_JUNK = rawFx('IDB-invalid-truncated.raw'), VALID = rawFx('BAK-valid-F20-seq6.json');
  const MAIN_BAD = rawFx('MAIN-OQ1-abc.json'), BAK_BAD = rawFx('BAK-invalid-neg1.json');
  const tick = (ms = 10) => new Promise(r => setTimeout(r, ms));
  const J = (v: unknown) => JSON.stringify(v ?? null);
  async function idbCopy(data: Map<string, unknown>, value: unknown, ts: number) { // real IDB1-5 copy (put corrupt.<ts> + delete main, one tx)
    const f = fakeIdb('ok', [...data, ['main', value]]); const bi: any = await IM.IdbMirror.openForBoot(f.factory);
    const ok = await bi.mirror.preserveCorrupt(value, ts); await tick(); data.clear(); for (const [k, v] of f.data) data.set(k, v); return ok; }
  type H = { ls: Map<string, string>; idb: Map<string, unknown>; lsCorrupt: [string, string][]; idbCorrupt: [string, unknown][]; surfaced: unknown; resetLog: string[]; preIdb: Map<string, unknown>; preLs: Map<string, string>; clearResolved: boolean; clearThrew: string | null };
  async function history(o: { copies?: ('ls' | 'idb')[]; idbCopyTs?: number[]; resetAt?: number; fx?: any; prior?: string[]; noReset?: boolean } = {}): Promise<H> {
    const kv = kvOf({}); const idb = new Map<string, unknown>(); const copies = o.copies ?? ['ls', 'idb'];
    if (copies.includes('ls')) expect(SV.preserveCorrupt(kv, LS_JUNK, T_OLD)).toBe(true);
    if (copies.includes('idb')) for (const [i, ts] of (o.idbCopyTs ?? [T_OLD]).entries()) expect(await idbCopy(idb, IDB_JUNK + ' '.repeat(i), ts)).toBe(true);
    kv.m.set(SV.SAVE_KEY, VALID); kv.m.set(SV.BAK_KEY, VALID); idb.set('main', VALID); if (o.prior) idb.set(RS, o.prior); // the farm the player then played
    const preIdb = new Map(idb), preLs = new Map(kv.m); let resetLog: string[] = [], clearResolved = false, clearThrew: string | null = null;
    if (!o.noReset) { const sp0 = o.resetAt ? vi.spyOn(Date, 'now').mockReturnValue(o.resetAt) : null;
      try { SV.resetProgress(kv); const f = fakeIdb('ok', [...idb], undefined, o.fx ?? {}); const bi: any = await IM.IdbMirror.openForBoot(f.factory);
        try { await bi.mirror.clear(); clearResolved = true; } catch (e) { clearThrew = String(e); } await tick(20);
        idb.clear(); for (const [k, v] of f.data) idb.set(k, v); resetLog = f.log; } finally { sp0?.mockRestore(); } }
    return { ls: kv.m, idb, lsCorrupt: [...kv.m.entries()].filter(([k]) => k.startsWith(SV.CORRUPT_PREFIX) && k !== SV.CORRUPT_INDEX_KEY) as [string, string][],
      idbCorrupt: [...idb.entries()].filter(([k]) => k.startsWith('corrupt.')), surfaced: idb.get(RS), resetLog, preIdb, preLs, clearResolved, clearThrew };
  }
  async function boots(st: { ls: Map<string, string>; idb: Map<string, unknown> }, n: number, sc: any = {}) {
    const out: any[] = []; let prev = { ls: new Map(st.ls), idb: new Map(st.idb) }; const now0 = sc.now0 ?? T;
    for (let i = 0; i < n; i++) { const now = now0 + i * 60_000; const sp = sc.useDateSpy ? vi.spyOn(Date, 'now').mockReturnValue(now) : null;
      try { const r = await boot({ id: 'rs', now, ...sc, noSave: !!(sc.noSaveFirst && i === 0) }, prev); out.push(r); prev = { ls: r.kv.m, idb: r.idb ? r.idb.data : new Map() }; } finally { sp?.mockRestore(); } }
    return out; }
  const kept = (h: H, r: any) => ({ ls: h.lsCorrupt.every(([k, v]) => r.kv.m.get(k) === v), idb: h.idbCorrupt.every(([k, v]) => J(r.idb?.data.get(k)) === J(v)) });
  const evTypes = (r: any) => r.ev.map((e: any) => e.type).filter((t: string) => /^save_|recovery|tab_guard/.test(t)).sort();
  const obs = (r: any) => ({ case: r.g?.recovery?.case ?? null, source: r.g?.recovery?.source ?? null, store: r.corrupt[0]?.store ?? null, save_corrupt: r.corrupt.length, notice: notice(r, T)?.id ?? null,
    newGame: r.g?.isNewGame ?? null, F: r.g?.state.farmLevel ?? null, coins: r.g?.state.coinsCents ?? null, err: r.err, surfaced: r.idb?.data.get(RS) ?? null, lsResetAt: r.kv.m.get(RA_VOID) ?? null, saveRestore: r.restoreEv.length, ev: evTypes(r) });
  const rec = (id: string, pass: boolean | null, x: unknown) => { res[`RESET_AT-${id}`] = { pass, ...(x as any) }; };
  const resetTx = (log: string[]) => { const d = log.find(l => l.endsWith(':delete:main')); return d ? d.split(':')[0] : null; };

  it('RS-pre: Reset deletes IDB main and writes reset.surfaced = the corrupt.* keys present, in ONE committed tx; corrupt.* kept; no LS reset_at', async () => {
    const h = await history(); const keys = h.idbCorrupt.map(e => e[0]); const tx = resetTx(h.resetLog);
    const x = { surfaced: h.surfaced, keys, idbMain: h.idb.has('main'), lsMain: h.ls.has(SV.SAVE_KEY), bak: h.ls.has(SV.BAK_KEY), lsResetAt: h.ls.get(RA_VOID) ?? null, ls: h.lsCorrupt.length,
      oneTx: !!tx && h.resetLog.includes(`${tx}:put:${RS}`) && h.resetLog.includes(`${tx}:complete`), log: h.resetLog };
    rec('RS-pre', J(x.surfaced) === J(keys) && keys.length === 1 && !x.idbMain && !x.lsMain && !x.bak && x.lsResetAt === null && x.ls === 1 && x.oneTx, x);
    expect({ ...x, log: 0 }).toEqual({ ...x, log: 0, surfaced: keys, idbMain: false, lsMain: false, bak: false, lsResetAt: null, ls: 1, oneTx: true }); expect(keys.length).toBe(1);
  });
  // ---------- AC1: a corrupt copy present at reset -> after reset + reload, no dialog (3 boots) ----------
  const AC1: [string, any][] = [['ls+idb', {}], ['idb', { copies: ['idb'] }], ['ls', { copies: ['ls'] }], ['idb-cap3', { copies: ['idb'], idbCopyTs: [T_OLD - 2 * HR, T_OLD - HR, T_OLD] }]];
  for (const [nm, o] of AC1) for (const noSaveFirst of [false, true]) {
    const id = `RS-AC1-pre-reset-${nm}${noSaveFirst ? '-tab-dies-before-1st-save' : ''}`;
    it(`${id}: no dialog, no save_corrupt across 3 boots; corrupt bytes kept; reset.surfaced unchanged`, async () => {
      const h = await history(o); const rs = await boots(h, 3, { noSaveFirst }); const per = rs.map(r => ({ ...obs(r), kept: kept(h, r) }));
      const want = per.map(() => [null, 0, null, true, true, J(h.surfaced), null]); const got = per.map(p => [p.case, p.save_corrupt, p.notice, p.kept.ls, p.kept.idb, J(p.surfaced), p.err]);
      const ok = J(got) === J(want) && rs.every(r => r.noticeEv.length === 0) && (nm === 'ls' ? h.surfaced === undefined : Array.isArray(h.surfaced) && (h.surfaced as any[]).length === h.idbCorrupt.length);
      rec(id, ok, { surfacedAtReset: h.surfaced, per }); expect(got).toEqual(want); expect(ok).toBe(true);
    });
  }
  // ---------- AC2: a corrupt main created after the reset follows the CSR chain (.bak -> IDB -> M3), pre-reset copies kept ----------
  const POST: [string, (h: H) => Promise<void> | void, any][] = [
    ['RS-AC2-post-reset-main-corrupt-bak-valid-M1', h => { h.ls.set(SV.SAVE_KEY, MAIN_BAD); h.ls.set(SV.BAK_KEY, VALID); }, { recovery: true, recovered_from: 'bak', notice: 'M1', store: 'ls' }],
    ['RS-AC2-post-reset-main-corrupt-bak-invalid-idb-valid-M1', h => { h.ls.set(SV.SAVE_KEY, MAIN_BAD); h.ls.set(SV.BAK_KEY, BAK_BAD); h.idb.set('main', rawFx('IDB-valid-F17-seq4-T-10m.json')); }, { recovery: true, recovered_from: 'idb', notice: 'M1', store: 'ls', farmLevel: 17 }],
    ['RS-AC2-post-reset-main-corrupt-nothing-valid-M3', h => { h.ls.set(SV.SAVE_KEY, MAIN_BAD); h.ls.set(SV.BAK_KEY, BAK_BAD); }, { recovery: true, recovered_from: 'none', notice: 'M3', store: 'ls' }],
    ['RS-AC2-post-reset-idb-main-corrupt-IDB1-M3', h => { h.idb.set('main', IDB_JUNK + 'x'); }, { recovery: true, notice: 'M3', store: 'idb' }],
    ['RS-AC2-post-reset-idb-main-same-bytes-as-surfaced-copy-M3', h => { h.idb.set('main', IDB_JUNK); }, { recovery: true, notice: 'M3', store: 'idb' }],
    ['RS-AC2-post-reset-idb-orphan-copy-8b-M3', async h => { expect(await idbCopy(h.idb, IDB_JUNK + 'o', T_POST)).toBe(true); }, { recovery: true, notice: 'M3', store: 'idb' }],
    ['RS-AC2-post-reset-idb-orphan-stamped-1d-BEFORE-the-surfaced-copy-M3', async h => { expect(await idbCopy(h.idb, IDB_JUNK + 'p', T_OLD - D)).toBe(true); }, { recovery: true, notice: 'M3', store: 'idb' }],
  ];
  for (const [id, mut, x] of POST) it(`${id}: follows the chain (${x.recovered_from ?? x.store} / ${x.notice}); next boot no repeat; pre-reset bytes + reset.surfaced kept`, async () => {
    const h = await history(); const s0 = J(h.surfaced); await mut(h); const [r, r2] = await boots(h, 2); const ch = check({ expect: x, now: T }, r); const fails = ch.filter(c => !c[1]);
    const k = kept(h, r); const o2 = obs(r2); const ok = fails.length === 0 && k.ls && k.idb && o2.case === null && o2.notice === null && o2.save_corrupt === 1 && J(r.idb?.data.get(RS)) === s0;
    rec(id, ok, { obs: obs(r), boot2: o2, fails: fails.map(([n, , g]) => `${n} (got ${JSON.stringify(g)?.slice(0, 100)})`), kept: k });
    expect(fails.map(f => f[0])).toEqual([]); expect(k).toEqual({ ls: true, idb: true }); expect([o2.case, o2.notice, o2.save_corrupt]).toEqual([null, null, 1]); expect(J(r.idb?.data.get(RS))).toBe(s0);
  });
  // ---------- AC3: AC1 with the clock rolled back >= 1 day at boot (copy present at reset) ----------
  const AC3: [string, any, number][] = [['rollback-1d', {}, T - D], ['rollback-1d+1min', {}, T - D - 60_000], ['rollback-30d', {}, T - 30 * D],
    ['future-stamped-copy-clock-ahead-1d-at-copy+reset-then-back-1d', { idbCopyTs: [T + D], resetAt: T + D + 5_000 }, T - D],
    ['rollback-1d-before-the-copy-stamp', { idbCopyTs: [T], resetAt: T + 60_000 }, T - D]];
  for (const [nm, o, now0] of AC3) { const id = `RS-AC3-${nm}`;
    it(`${id}: copy present at reset, clock rolled back >= 1 day: no dialog across 3 boots`, async () => {
      const h = await history(o); const copyTs = Math.max(...h.idbCorrupt.map(([k]) => Number(/^corrupt\.(\d+)/.exec(k)?.[1]))); const resetT = o.resetAt ?? Date.now();
      const pre = { copyPresentAtReset: Array.isArray(h.surfaced) && (h.surfaced as string[]).length === h.idbCorrupt.length && h.idbCorrupt.length > 0, rollbackVsCopyMs: copyTs - now0, rollbackVsResetMs: (o.resetAt ?? T) - now0 };
      const rs = await boots(h, 3, { now0, useDateSpy: true }); const per = rs.map(r => ({ ...obs(r), kept: kept(h, r) }));
      const ok = pre.copyPresentAtReset && pre.rollbackVsResetMs >= D && per.every(p => p.case === null && p.save_corrupt === 0 && p.notice === null && p.kept.idb && J(p.surfaced) === J(h.surfaced) && !p.err);
      rec(id, ok, { pre, resetT, now0, per }); expect(pre.copyPresentAtReset).toBe(true); expect(pre.rollbackVsResetMs).toBeGreaterThanOrEqual(D);
      expect(per.map(p => [p.case, p.save_corrupt, p.notice, p.kept.idb])).toEqual(per.map(() => [null, 0, null, true]));
    });
  }
  // ---------- CLK (HoQA item 5): clock ahead at Reset (+2 h), then rolled back to T; a post-reset corrupt main still follows the chain ----------
  const AHEAD = T + 2 * HR;
  const CLK: [string, (h: H) => Promise<void> | void, any][] = [
    ['idb-main-corrupt-copied-at-T-older-than-surfaced-key', h => { h.idb.set('main', IDB_JUNK + 'c'); }, { recovery: true, notice: 'M3', store: 'idb' }],
    ['idb-orphan-8b-stamped-T+1h-before-reset-time', async h => { expect(await idbCopy(h.idb, IDB_JUNK + 'd', T + HR)).toBe(true); }, { recovery: true, notice: 'M3', store: 'idb' }],
    ['ls-main-corrupt-bak-valid-M1', h => { h.ls.set(SV.SAVE_KEY, MAIN_BAD); h.ls.set(SV.BAK_KEY, VALID); }, { recovery: true, recovered_from: 'bak', notice: 'M1', store: 'ls' }],
    ['ls-main-corrupt-nothing-valid-M3', h => { h.ls.set(SV.SAVE_KEY, MAIN_BAD); h.ls.set(SV.BAK_KEY, BAK_BAD); }, { recovery: true, recovered_from: 'none', notice: 'M3', store: 'ls' }]];
  for (const [nm, mut, x] of CLK) { const id = `RS-CLK-ahead2h-at-reset-then-back-${nm}`;
    it(`${id}: no silent new game (${x.notice}); next boot no repeat`, async () => {
      const h = await history({ idbCopyTs: [AHEAD + 5_000], resetAt: AHEAD }); await mut(h); const [r, r2] = await boots(h, 2, { now0: T + HR + 5_000, useDateSpy: true });
      const ch = check({ expect: x, now: T }, r); const fails = ch.filter(c => !c[1]); const o2 = obs(r2);
      rec(id, fails.length === 0 && o2.case === null, { obs: obs(r), boot2: o2, surfacedAtReset: h.surfaced, fails: fails.map(([n, , g]) => `${n} (got ${JSON.stringify(g)?.slice(0, 100)})`) });
      expect(fails.map(f => f[0])).toEqual([]); expect(o2.case).toBeNull();
    });
  }
  // ---------- AC4: the Reset tx aborts -> neither the main delete nor reset.surfaced is applied, and the next boot equals the pre-reset boot ----------
  const PRIOR = ['corrupt.1700000000000'];
  const AC4: [string, any][] = [
    ['throw-inside-reset-tx-at-reset.surfaced-put', { fx: { throwOnPutKey: RS }, prior: PRIOR }],
    ['throw-inside-reset-tx-no-prior-record', { fx: { throwOnPutKey: RS } }],
    ['abort()-quota-stub-at-reset.surfaced-put', { fx: { abortOnPutKey: RS }, prior: PRIOR }],
    ['throw-inside-reset-tx-delete-path-no-idb-copies', { copies: ['ls'], fx: { throwOnDeleteKey: RS }, prior: PRIOR }]];
  for (const [nm, o] of AC4) { const id = `RS-AC4-${nm}`;
    it(`${id}: part 1 IDB main / corrupt.* / reset.surfaced unchanged, no delete applied; part 2 next boot = pre-reset boot`, async () => {
      const h = await history(o); const tx = resetTx(h.resetLog);
      const p1 = { clearResolved: h.clearResolved, clearThrew: h.clearThrew, faultFired: h.resetLog.some(l => /threw|abort-at-put/.test(l)), txAborted: !!tx && h.resetLog.includes(`${tx}:abort`) && !h.resetLog.includes(`${tx}:complete`),
        idbIdentical: J([...h.idb.entries()].sort()) === J([...h.preIdb.entries()].sort()), mainSame: h.idb.get('main') === VALID, surfacedSame: J(h.idb.get(RS)) === J(h.preIdb.get(RS)) };
      // part 2: (a) IDB-rollback isolation (same LS as pre-reset) => identical dialog, state AND events; (b) full cReset (LS cleared before the IDB tx, app.ts:275) => same dialog + state, and emits save_restore{source:'idb'} x1 (see AC4 review gap)
      const [base] = await boots({ ls: h.preLs, idb: h.preIdb }, 1); const [nextIso] = await boots({ ls: h.preLs, idb: h.idb }, 1); const [nextFull] = await boots(h, 1);
      const ob = obs(base), oi = obs(nextIso), of_ = obs(nextFull);
      const p2 = { base: ob, nextIdbIso: oi, nextFullCReset: of_, isoSameDialog: ob.case === oi.case && ob.notice === oi.notice, isoSameState: ob.F === oi.F && ob.coins === oi.coins && ob.newGame === oi.newGame, isoSameEvents: J(ob.ev) === J(oi.ev),
        fullSameDialog: ob.case === of_.case && ob.notice === of_.notice, fullSameState: ob.F === of_.F && ob.coins === of_.coins && ob.newGame === of_.newGame, fullEvents: of_.ev, lsAfterReset: [...h.ls.keys()].sort() };
      const ok1 = p1.clearResolved && !p1.clearThrew && p1.faultFired && p1.txAborted && p1.idbIdentical && p1.mainSame && p1.surfacedSame;
      const ok2 = p2.isoSameDialog && p2.isoSameState && p2.isoSameEvents && p2.fullSameDialog && p2.fullSameState && J(of_.ev) === J(['save_restore']);
      rec(id, ok1 && ok2, { part1: p1, part1Pass: ok1, part2: p2, part2Pass: ok2, log: h.resetLog });
      expect(p1).toEqual({ ...p1, clearResolved: true, clearThrew: null, faultFired: true, txAborted: true, idbIdentical: true, mainSame: true, surfacedSame: true });
      expect({ isoSameDialog: p2.isoSameDialog, isoSameState: p2.isoSameState, isoSameEvents: p2.isoSameEvents, fullSameDialog: p2.fullSameDialog, fullSameState: p2.fullSameState, fullEvents: of_.ev }).toEqual({ isoSameDialog: true, isoSameState: true, isoSameEvents: true, fullSameDialog: true, fullSameState: true, fullEvents: ['save_restore'] });
    });
  }
  it('RS-AC4-control-no-fault: the same history without a fault applies the delete and writes reset.surfaced (proves the fault is the cause)', async () => {
    const h = await history({ prior: PRIOR }); const x = { idbMain: h.idb.has('main'), surfaced: h.surfaced, keys: h.idbCorrupt.map(e => e[0]) };
    rec('RS-AC4-control-no-fault', !x.idbMain && J(x.surfaced) === J(x.keys), x); expect(x.idbMain).toBe(false); expect(x.surfaced).toEqual(x.keys);
  });
  // ---------- persistence / static ----------
  it('RS4-survives-save-load-and-cap: reset.surfaced unchanged over 3 boots + 3 saves each and after 3 post-reset copies (cap eviction)', async () => {
    const h = await history(); const s0 = J(h.surfaced); const rs = await boots(h, 3); const vals: string[] = [];
    for (const r of rs) { for (let i = 0; i < 3; i++) { try { r.g?.save(); } catch { /* */ } } await tick(20); vals.push(J(r.idb?.data.get(RS))); }
    const last = new Map(rs[2].idb!.data); last.delete('main'); for (let i = 0; i < 3; i++) expect(await idbCopy(last, IDB_JUNK + 'q'.repeat(i + 1), T_POST + i)).toBe(true);
    const afterCap = J(last.get(RS)); rec('RS4-survives', vals.every(v => v === s0) && afterCap === s0, { vals, afterCap, s0, corruptKeysAfterCap: [...last.keys()].filter(k => k.startsWith('corrupt.')) });
    expect(vals).toEqual([s0, s0, s0]); expect(afterCap).toBe(s0);
  });
  it('RS4-export-does-not-touch: Export on a post-reset M3 leaves reset.surfaced and every LS key unchanged', async () => {
    const h = await history(); const s0 = J(h.surfaced); h.ls.set(SV.SAVE_KEY, MAIN_BAD); const [r] = await boots(h, 1); const before = J([...r.kv.m.entries()].sort());
    const n = notice(r, T); const fn = typeof (UI as any).exportBytes === 'function' && n ? (UI as any).exportBytes(n, r.g.recovery, true) : null; const bytes = fn ? fn() : null;
    const after = J([...r.kv.m.entries()].sort()); rec('RS4-export', n?.id === 'M3' && before === after && J(r.idb?.data.get(RS)) === s0 && typeof bytes === 'string', { notice: n?.id, bytesLen: bytes?.length ?? null, unchanged: before === after });
    expect(n?.id).toBe('M3'); expect(typeof bytes).toBe('string'); expect(after).toBe(before); expect(J(r.idb?.data.get(RS))).toBe(s0);
  });
  it('RS4-static: no LS reset_at anywhere in src (VOID); the reset.surfaced writer is IdbMirror.clear only; RESET_KEYS does not list it; key outside corrupt.*', () => {
    const files = execSync('git ls-files src', { cwd: __dirname + '/..' }).toString().trim().split('\n').filter(f => /\.(ts|tsx|js|mjs)$/.test(f));
    const hits: Record<string, string[]> = { resetAt: [], rsRefs: [], importPath: [] };
    for (const f of files) { const src = fs.readFileSync(__dirname + '/../' + f, 'utf8'); src.split('\n').forEach((l, i) => { const at = `${f}:${i + 1}`;
      if (/reset_at|RESET_AT_KEY/.test(l)) hits.resetAt.push(at); if (/IDB_RESET_KEY|reset\.surfaced/.test(l)) hits.rsRefs.push(`${at}: ${l.trim()}`);
      if (/type=["']file["']|FileReader|importSave|showOpenFilePicker/.test(l)) hits.importPath.push(at); }); }
    const writers = hits.rsRefs.filter(l => /os\.(put|delete)\([^;]*IDB_RESET_KEY/.test(l)); const keysListIt = ((SV as any).RESET_KEYS ?? []).includes(RS);
    const ok = hits.resetAt.length === 0 && writers.length === 1 && /src\/save\/idb-mirror\.ts/.test(writers[0] ?? '') && !keysListIt && !RS.startsWith('corrupt.');
    rec('RS4-static', ok, { ...hits, writers, keysListIt, importNote: hits.importPath.length ? 'IMPORT PATH EXISTS' : 'no import path in this build (N/A)' });
    expect(hits.resetAt).toEqual([]); expect(writers.length).toBe(1); expect(writers[0]).toMatch(/src\/save\/idb-mirror\.ts/); expect(keysListIt).toBe(false);
  });
  // ---------- INFO (facts only) ----------
  it('INFO-RS5-dedupe-race: post-reset IDB main byte-identical to a surfaced copy, 8b loser tab dedupes into the surfaced key + deletes main; winner boot', async () => {
    const h = await history(); expect(await idbCopy(h.idb, IDB_JUNK, T_POST)).toBe(true); const keys = [...h.idb.keys()].filter(k => k.startsWith('corrupt.'));
    const [r] = await boots(h, 1); rec('INFO-RS5-dedupe-race', null, { corruptKeys: keys, surfaced: h.idb.get(RS), obs: obs(r), silentNewGame: obs(r).case === null && obs(r).newGame === true }); expect(r).toBeDefined();
  });
  for (const [nm, v] of [['string', 'corrupt.1'], ['object', { a: 1 }], ['number', 5], ['null', null], ['array-with-nonstring', [5, null]]] as [string, unknown][]) {
    it(`INFO-RS6-malformed-reset.surfaced-${nm} (INFO): pre-reset orphan copy + malformed record`, async () => {
      const h = await history(); h.idb.set(RS, v); const rs = await boots(h, 2); rec(`INFO-RS6-malformed-${nm}`, null, { per: rs.map(obs) }); expect(rs.length).toBe(2);
    });
  }
});
