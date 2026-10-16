// v3 (HoE): (a) a flag-off build saving a marked save keeps tracksV7 and the track fields byte-for-byte;
// (b) the interim track migration writes a v6 backup exactly once, before the in-place change.
import { describe, it, expect } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { headroomNeed, saveSeqOf, validate, serialize, checksum, migrate, SAVE_KEY, BAK_KEY, V6_BACKUP_KEY, SAVE_VERSION, RESET_KEYS, resetProgress, decodeBackup, encodeBackup, newMigrationId, committedBackupRaw, MIGRATION_ATTEMPTS_KEY, HEADROOM_PROBE_KEY, rankCompare } from '../src/save/save';
import { IdbMirror, IDB_KEY, reconcile, pickNewest } from '../src/save/idb-mirror';
import { Game } from '../src/game';
import { mem } from './helpers';
const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
const off: Balance = { ...balance, m4: { ...balance.m4!, enabled: 0 } };
const raw6 = (st: object) => { const j = JSON.stringify(st); return `{"version":6,"savedAt":1760000000000,"sum":"${checksum(j)}","state":${j}}`; };
const mainState = (F: number, C: number) => { const { hensLevel, eggValueLevel, celebratedMilestones, tracksV7, ...r } = { ...initialState(balance), farmLevel: F, collectionLevel: C, coinsCents: 987654 } as any; void hensLevel; void eggValueLevel; void celebratedMilestones; void tracksV7; return r; };
const settle = () => new Promise(r => setTimeout(r, 5));
/** IndexedDB fake (one store) with add(); fail = which ops abort their transaction. */
function fakeIdb(fail: { add?: boolean; put?: boolean; get?: boolean; open?: 'private' | 'error' | 'slow' | 'blocked' } = {}) {
  const data = new Map<string, unknown>(); let opens = 0;
  const db: any = { objectStoreNames: { contains: () => true }, transaction() { const t: any = {}; let n = 0, bad = false;
    const op = (f: () => void, isBad = false) => { n++; setTimeout(() => { if (isBad) bad = true; else f(); if (--n === 0) setTimeout(() => (bad ? (t.onabort ?? t.onerror)?.() : t.oncomplete?.()), 0); }, 0); };
    t.objectStore = () => ({
      get: (k: string) => { const r: any = {}; op(() => { if (fail.get) { r.error = new Error('read'); r.onerror?.(); bad = true; return; } r.result = data.get(k); r.onsuccess?.(); }); return r; },
      put: (v: unknown, k: string) => { const r: any = {}; op(() => { data.set(k, v); r.onsuccess?.(); }, !!fail.put); return r; },
      add: (v: unknown, k: string) => { op(() => { if (data.has(k)) bad = true; else data.set(k, v); }, !!fail.add); return {}; },
      delete: (k: string) => { op(() => data.delete(k)); return {}; } });
    return t; } };
  const factory: any = { open() { opens++; if (fail.open === 'private') throw new DOMException('private', 'SecurityError'); const r: any = {};
    if (fail.open === 'blocked') setTimeout(() => { r.onblocked?.(); }, 0); if (fail.open !== 'slow' && fail.open !== 'blocked') setTimeout(() => { if (fail.open === 'error') { r.error = new DOMException('x', 'UnknownError'); r.onerror?.(); return; } r.result = db; r.onsuccess?.(); }, 0); return r; } };
  return { db, data, factory, opens: () => opens };
}
const trackPart = (raw: string) => { const s = JSON.parse(raw).state; return JSON.stringify([s.tracksV7, s.hensLevel, s.eggValueLevel, s.celebratedMilestones]); };

describe('(a) flag off keeps a marked v6 save\'s track data byte-for-byte', () => {
  it('SAVE_VERSION stays 6', () => expect(SAVE_VERSION).toBe(6));
  it('validate + serialize with the flag off round-trips tracksV7 / hensLevel / eggValueLevel / milestones', () => {
    const marked = { ...initialState(on), farmLevel: 12, collectionLevel: 9, hensLevel: 11, eggValueLevel: 14, celebratedMilestones: ['hens:10', 'balanced:1'], tracksV7: 1 as const };
    const r = validate(raw6(marked), off); expect(r.ok).toBe(true); if (!r.ok) return;
    const out = serialize(r.file.state, 1760000001000);
    expect(trackPart(out)).toBe(trackPart(raw6(marked)));
    expect(JSON.stringify(JSON.parse(out).state)).toBe(JSON.stringify(marked)); // whole state, byte-for-byte
  });
  it('a flag-off Game loading and saving a marked save keeps the track fields, then a flag-on load does not re-migrate', () => {
    const marked = { ...initialState(on), farmLevel: 12, collectionLevel: 9, hensLevel: 11, eggValueLevel: 14, celebratedMilestones: ['hens:10'], tracksV7: 1 as const };
    const kv = mem() as any; kv.setItem(SAVE_KEY, raw6(marked));
    const g = new Game(off, kv, () => 1760000000500); g.save();
    expect(trackPart(kv.getItem(SAVE_KEY))).toBe(trackPart(raw6(marked)));
    expect(kv.getItem(V6_BACKUP_KEY)).toBeNull(); // flag off never migrates, never backs up
    const g2 = new Game(on, kv, () => 1760000001000);
    expect([g2.state.hensLevel, g2.state.eggValueLevel, g2.state.tracksV7]).toEqual([11, 14, 1]);
    expect(kv.getItem(V6_BACKUP_KEY)).toBeNull(); // marked: no migration, so no backup
  });
  it('flag off: .bak rotation and the IndexedDB mirror/reconcile keep the marker + track fields byte-for-byte', async () => {
    const marked = { ...initialState(on), farmLevel: 12, collectionLevel: 9, hensLevel: 11, eggValueLevel: 14, celebratedMilestones: ['hens:10'], tracksV7: 1 as const };
    const kv = mem() as any; kv.setItem(SAVE_KEY, raw6(marked));
    const { db, data } = fakeIdb(); const m = new IdbMirror(db);
    const g = new Game(off, kv, () => 1760000000500, undefined, 'dev', m); g.save(); await settle();
    expect(trackPart(kv.getItem(BAK_KEY))).toBe(trackPart(raw6(marked)));        // .bak = rotated copy of the marked save
    expect(trackPart(data.get(IDB_KEY) as string)).toBe(trackPart(raw6(marked))); // IDB mirror write
    const kv2 = mem() as any; expect(reconcile(kv2, data.get(IDB_KEY) as string, off)).toBe('idb');
    expect(trackPart(kv2.getItem(SAVE_KEY))).toBe(trackPart(raw6(marked)));       // restored from IDB
  });
});

const ids = (...xs: string[]) => { let i = 0; return () => xs[i++]; };
const ID1 = 'a1b2c3d4e5f60718', ID2 = '0f1e2d3c4b5a6978', ID3 = '1111222233334444';
import { probeHeadroom } from '../src/save/save';
const ev = (g: Game, t: string) => g.telemetry.events().filter((e: any) => e.type === t) as any[];
const kvOf = () => { const kv = mem() as any; kv.removeItem = (k: string) => kv.m.delete(k); return kv; };
const seed = (st: any = mainState(10, 7)) => { const raw = raw6(st); const kv = kvOf(); kv.setItem(SAVE_KEY, raw); return { kv, raw }; };
const T0 = 1760000000500;
const boot = (kv: any, o: any = {}, t = T0, mirror: any = null) => new Game(on, kv, () => t, undefined, 'dev', mirror, null, { idbBoot: 'ok', newId: ids(ID1, ID2, ID3), ...o });
const idbWrites = (m: IdbMirror) => { const w: string[] = []; const orig = m.write.bind(m); (m as any).write = (r: string) => { w.push(r); return orig(r); }; return w; };
describe('(b) m4-design §3c/§3d interim marker path (ADR M4-14..24, spec v1.10): localStorage-only commit', () => {
  it('M4-14 + commit: flag-off v6 until commit, LS-only record, IDB never written until the confirmed read-back, then mirrors the committed save', async () => {
    const { kv, raw } = seed(); const idb = fakeIdb(); const m = new IdbMirror(idb.db); const w = idbWrites(m);
    const g = boot(kv, {}, T0, m);
    expect(g.tracksMigrationPending).toBe(true); expect(g.balance.m4!.enabled).toBe(0);
    g.dispatch({ type: 'buyTrack', track: 'hens' } as any); expect(g.state.hensLevel).toBe(0); // track purchases disabled
    g.save(); const pend = JSON.parse(kv.getItem(SAVE_KEY)).state; expect('hensLevel' in pend || 'tracksV7' in pend || 'v6BackupId' in pend).toBe(false);
    expect(w).toEqual([]); // no IDB writes while pending
    expect(await g.startTracksMigration()).toBe('committed');
    expect(g.balance.m4!.enabled).toBe(1); expect(g.state).toMatchObject({ tracksV7: 1, v6BackupId: ID1, hensLevel: 10 });
    const main = kv.getItem(SAVE_KEY); expect(JSON.parse(main).state.v6BackupId).toBe(ID1);
    expect(decodeBackup(kv.getItem(V6_BACKUP_KEY))).toEqual({ migrationId: ID1, raw });
    expect(w).toEqual([main]); await settle(); expect(idb.data.has('v6_backup')).toBe(false); // no IDB backup in M4-A
    expect(kv.getItem(HEADROOM_PROBE_KEY)).toBeNull(); expect(kv.getItem(MIGRATION_ATTEMPTS_KEY)).toBeNull();
    expect(ev(g, 'save_migrated')).toMatchObject([{ from: 6, to: 6, migration: 'tracksV7_marker', backup_stores: ['ls'] }]);
    expect(committedBackupRaw(kv.getItem(V6_BACKUP_KEY), null, ID1, on)).toBe(raw);
    const g2 = boot(kv, {}, T0 + 1000); expect(g2.tracksMigrationPending).toBe(false); expect(g2.state.v6BackupId).toBe(ID1);
  });
  it('N7: migrationId from save/ (16 hex, injectable)', () => {
    expect(newMigrationId(n => new Uint8Array(n).fill(0xab))).toBe('ab'.repeat(8)); expect(newMigrationId()).toMatch(/^[0-9a-f]{16}$/);
  });
  it('LS backup write fails (quota): abort, stays v6 (no marker), purchase survives a close, no dialog, retry next load with a fresh id', async () => {
    const { kv } = seed(); const set = kv.setItem.bind(kv); let fail = true;
    kv.setItem = (k: string, v: string) => { if (fail && k === V6_BACKUP_KEY) throw new DOMException('full', 'QuotaExceededError'); set(k, v); };
    const g = boot(kv); expect(await g.startTracksMigration()).toBe('aborted');
    const e = ev(g, 'save_migration_aborted'); expect(e).toHaveLength(1); expect(e[0]).toMatchObject({ store: 'ls', reason: 'quota', path: 'tracksV7_marker', attempt_count: 0 });
    expect(g.storageFailed).toBe(false); expect(g.balance.m4!.enabled).toBe(0);
    g.dispatch({ type: 'buyFarm' } as any); g.save();
    const s1 = JSON.parse(kv.getItem(SAVE_KEY)); expect([s1.version, s1.state.tracksV7, s1.state.farmLevel]).toEqual([6, undefined, 11]);
    fail = false; const g2 = boot(kv, { newId: ids(ID2) }, T0 + 1000); expect(g2.state.farmLevel).toBe(11);
    expect(await g2.startTracksMigration()).toBe('committed'); expect(decodeBackup(kv.getItem(V6_BACKUP_KEY))!.migrationId).toBe(ID2);
  });
  it('readback_mismatch: the record read back has another migrationId -> abort, no commit', async () => {
    const { kv } = seed(); const set = kv.setItem.bind(kv);
    kv.setItem = (k: string, v: string) => set(k, k === V6_BACKUP_KEY ? encodeBackup({ migrationId: ID2, raw: 'x' }) : v);
    const g = boot(kv); expect(await g.startTracksMigration()).toBe('aborted');
    expect(ev(g, 'save_migration_aborted')[0]).toMatchObject({ store: 'ls', reason: 'readback_mismatch' });
    expect(JSON.parse(kv.getItem(SAVE_KEY)).state.tracksV7).toBeUndefined();
  });
  it('M4-20: boot IndexedDB read unknown (timeout / error / blocked) -> deferral, counter +1, no LS record, no IDB writes; stuck_on_v6 at 3', async () => {
    const { kv } = seed(); const before = kv.getItem(V6_BACKUP_KEY);
    for (const [n, reason] of [[1, 'idb_timeout'], [2, 'idb_read_error'], [3, 'idb_blocked']] as const) {
      const m = new IdbMirror(fakeIdb().db); const w = idbWrites(m);
      const g = boot(kv, { idbBoot: 'unknown', idbAbsentReason: reason }, T0 + n * 1000, m); g.save();
      expect(await g.startTracksMigration()).toBe('deferred'); g.save();
      const e = ev(g, 'save_migration_aborted').at(-1); expect(e).toMatchObject({ store: 'idb', reason, attempt_count: n });
      expect(!!e.stuck_on_v6).toBe(n >= 3); expect(w).toEqual([]); expect(kv.getItem(V6_BACKUP_KEY)).toBe(before);
      expect(JSON.parse(kv.getItem(SAVE_KEY)).state.tracksV7).toBeUndefined();
    }
    // v0.3.3 (d1): the counter saturates at 3: 4th and 5th deferrals still report 3 + stuck; never forced
    for (const t of [9000, 9500]) { const g4 = boot(kv, { idbBoot: 'unknown', idbAbsentReason: 'idb_timeout' }, T0 + t); expect(await g4.startTracksMigration()).toBe('deferred');
      expect(ev(g4, 'save_migration_aborted').at(-1)).toMatchObject({ reason: 'idb_timeout', attempt_count: 3, stuck_on_v6: true }); expect(kv.getItem(MIGRATION_ATTEMPTS_KEY)).toBe('3'); }
    const g5 = boot(kv, {}, T0 + 10_000); expect(await g5.startTracksMigration()).toBe('committed'); expect(kv.getItem(MIGRATION_ATTEMPTS_KEY)).toBeNull();
    const g6 = new Game(on, (() => { const k = seed().kv; return k; })(), () => T0, undefined, 'dev', null, null, { idbBoot: 'unknown', idbAbsentReason: 'idb_timeout' });
    await g6.startTracksMigration(); const e6 = ev(g6, 'save_migration_aborted').at(-1); expect(e6.attempt_count).toBe(1); expect(e6.stuck_on_v6).toBeUndefined();
  });
  it('IndexedDB definitely absent (no_global / security) -> save_backup_idb_unavailable, commits on localStorage', async () => {
    for (const reason of ['no_global', 'security']) {
      const { kv } = seed(); const g = boot(kv, { idbBoot: 'absent', idbAbsentReason: reason });
      expect(await g.startTracksMigration()).toBe('committed'); expect(ev(g, 'save_backup_idb_unavailable')[0]).toMatchObject({ reason, path: 'tracksV7_marker' });
    }
  });
  it('openForBoot outcomes: no global / SecurityError -> absent; slow open / other error / blocked / failed read -> unknown', async () => {
    expect(await IdbMirror.openForBoot(undefined)).toMatchObject({ status: 'absent', reason: 'no_global' });
    expect(await IdbMirror.openForBoot(fakeIdb({ open: 'private' }).factory)).toMatchObject({ status: 'absent', reason: 'security' });
    expect(await IdbMirror.openForBoot(fakeIdb({ open: 'slow' }).factory, 30)).toMatchObject({ status: 'unknown', reason: 'idb_timeout' });
    expect(await IdbMirror.openForBoot(fakeIdb({ open: 'error' }).factory)).toMatchObject({ status: 'unknown', reason: 'idb_read_error' });
    expect(await IdbMirror.openForBoot(fakeIdb({ open: 'blocked' }).factory, 30)).toMatchObject({ status: 'unknown', reason: 'idb_blocked' });
    expect(await IdbMirror.openForBoot(fakeIdb({ get: true }).factory)).toMatchObject({ status: 'unknown', reason: 'idb_read_error' });
    const ok = fakeIdb(); ok.data.set(IDB_KEY, 'r'); expect(await IdbMirror.openForBoot(ok.factory)).toMatchObject({ status: 'ok', raw: 'r' });
  });
  it('a newer save only in IndexedDB behind a slow open is left completely untouched (deferral session never writes IDB)', async () => {
    const { kv } = seed(); const idb = fakeIdb(); const v7 = '{"version":7,"savedAt":1,"state":{}}'; idb.data.set(IDB_KEY, v7);
    const o = await IdbMirror.openForBoot(fakeIdb({ open: 'slow' }).factory, 30); expect(o.status).toBe('unknown');
    const m = new IdbMirror(idb.db); const g = boot(kv, { idbBoot: o.status, idbAbsentReason: o.reason }, T0, m);
    g.save(); expect(await g.startTracksMigration()).toBe('deferred'); g.save(); await settle();
    expect(idb.data.get(IDB_KEY)).toBe(v7); expect([...idb.data.keys()]).toEqual([IDB_KEY]); expect(kv.getItem(V6_BACKUP_KEY)).toBeNull();
  });
  it('M4-20: LS main changed since boot (another tab) -> deferral ls_main_changed, nothing written', async () => {
    const { kv } = seed(); const g = boot(kv); kv.setItem(SAVE_KEY, raw6(mainState(12, 7)));
    expect(await g.startTracksMigration()).toBe('deferred'); expect(ev(g, 'save_migration_aborted')[0]).toMatchObject({ store: 'ls', reason: 'ls_main_changed' });
    expect(kv.getItem(V6_BACKUP_KEY)).toBeNull();
  });
  it('quota_headroom (spec v1.10 + HoE max rule): trial write fails -> deferral; main/.bak/telemetry untouched; probe removed', async () => {
    const { kv, raw } = seed(); const g = boot(kv); g.save(); const main = kv.getItem(SAVE_KEY), bak = kv.getItem(BAK_KEY);
    const set = kv.setItem.bind(kv); let probe = 0;
    kv.setItem = (k: string, v: string) => { if (k === HEADROOM_PROBE_KEY) { probe = v.length; throw new DOMException('full', 'QuotaExceededError'); } set(k, v); };
    expect(await g.startTracksMigration()).toBe('deferred'); expect(ev(g, 'save_migration_aborted')[0]).toMatchObject({ store: 'ls', reason: 'quota_headroom', attempt_count: 1 });
    const sb = main!.length, bb = encodeBackup({ migrationId: ID1, raw }).length;
    expect(probe).toBeGreaterThanOrEqual(Math.max(on.save.lsHeadroomFactor * (sb + bb), sb + bb + on.save.lsHeadroomMarginBytes)); expect(probe).toBeLessThan(sb + bb + on.save.lsHeadroomMarginBytes + 1024); // small save: the 64 KiB margin term wins
    expect([kv.getItem(SAVE_KEY), kv.getItem(BAK_KEY), kv.getItem(HEADROOM_PROBE_KEY), kv.getItem(V6_BACKUP_KEY)]).toEqual([main, bak, null, null]);
  });
  it('M4-20: IDB main re-read just before commit: outranks the boot copy, or the read fails -> abort idb_main_changed, my record removed', async () => {
    for (const mode of ['newer', 'fail'] as const) {
      const { kv } = seed(); const idb = fakeIdb(); const m = new IdbMirror(idb.db); const g = boot(kv, {}, T0, m);
      if (mode === 'newer') idb.data.set(IDB_KEY, raw6({ ...initialState(on), farmLevel: 13, tracksV7: 1, v6BackupId: ID3 }));
      else (m as any).readStrict = async () => undefined;
      expect(await g.startTracksMigration()).toBe('aborted'); expect(ev(g, 'save_migration_aborted')[0]).toMatchObject({ store: 'idb', reason: 'idb_main_changed' });
      expect(kv.getItem(V6_BACKUP_KEY)).toBeNull(); expect(JSON.parse(kv.getItem(SAVE_KEY)).state.tracksV7).toBeUndefined();
    }
  });
  it('M4-21: commit write fails -> commit_write_failed, old main kept, v6/flag-off, no IDB write, my record removed', async () => {
    const { kv } = seed(); const m = new IdbMirror(fakeIdb().db); const w = idbWrites(m); const g = boot(kv, {}, T0, m); g.save(); const main = kv.getItem(SAVE_KEY);
    const set = kv.setItem.bind(kv); kv.setItem = (k: string, v: string) => { if (k === SAVE_KEY && v.includes('"tracksV7":1')) throw new DOMException('full', 'QuotaExceededError'); set(k, v); };
    expect(await g.startTracksMigration()).toBe('aborted'); expect(ev(g, 'save_migration_aborted')[0]).toMatchObject({ reason: 'commit_write_failed' });
    expect(kv.getItem(SAVE_KEY)).toBe(main); expect(g.balance.m4!.enabled).toBe(0); expect(w).toEqual([]); expect(kv.getItem(V6_BACKUP_KEY)).toBeNull();
    expect(g.storageFailed).toBe(false);
  });
  it('M4-19 ranking: version, then committed, then savedAt', () => {
    const a = raw6({ ...initialState(on), tracksV7: 1, v6BackupId: ID1 }), bNew = JSON.stringify({ version: 6, savedAt: T0 + 5000, state: mainState(1, 1) });
    expect(rankCompare(a, bNew, T0 + 10_000)).toBeGreaterThan(0); // committed beats a newer savedAt
    expect(rankCompare('{"version":5,"savedAt":9,"state":{}}', a)).toBeLessThan(0);
    expect(pickNewest(bNew, a, on, T0 + 10_000)).toBe('idb');
  });
  it('M4-19: the mirror put never overwrites a higher-ranked IDB copy', async () => {
    const idb = fakeIdb(); const committed = raw6({ ...initialState(on), tracksV7: 1, v6BackupId: ID1 }); idb.data.set(IDB_KEY, committed);
    await new IdbMirror(idb.db).write(JSON.stringify({ version: 6, savedAt: T0 + 9, state: mainState(2, 2) })); expect(idb.data.get(IDB_KEY)).toBe(committed);
  });
  it('N2: a leftover record is kept on normal loads; only the migration overwrites it', async () => {
    const { kv } = seed(); const left = encodeBackup({ migrationId: ID3, raw: 'old' }); kv.setItem(V6_BACKUP_KEY, left);
    const g = boot(kv, { idbBoot: 'unknown' }); g.save(); await g.startTracksMigration(); expect(kv.getItem(V6_BACKUP_KEY)).toBe(left);
    const g2 = boot(kv, {}, T0 + 1000); expect(await g2.startTracksMigration()).toBe('committed'); expect(decodeBackup(kv.getItem(V6_BACKUP_KEY))!.migrationId).toBe(ID1);
  });
  it('M4-22: a fresh farm (incl. corrupt-v7 recovery) is committed at creation and never touches v6_backup; .bak restore keeps it too', async () => {
    const rec = encodeBackup({ migrationId: ID3, raw: 'x' });
    const fresh = kvOf(); fresh.setItem(V6_BACKUP_KEY, rec); const gf = boot(fresh);
    expect(gf.state).toMatchObject({ tracksV7: 1, v6BackupId: ID1 }); expect(gf.tracksMigrationPending).toBe(false); gf.save(); expect(fresh.getItem(V6_BACKUP_KEY)).toBe(rec);
    const cv = kvOf(); cv.setItem(SAVE_KEY, '{"version":6,"savedAt":1,"sum":"bad","state":{"x":1}}'); cv.setItem(V6_BACKUP_KEY, rec);
    const gc = boot(cv); expect(gc.recoveryOutcome).toBe('fresh'); expect(gc.state.v6BackupId).toBe(ID1); gc.save(); expect(cv.getItem(V6_BACKUP_KEY)).toBe(rec);
    const bk = kvOf(); bk.setItem(SAVE_KEY, '{"version":6,"savedAt":1,"sum":"bad","state":{"x":1}}'); bk.setItem(BAK_KEY, raw6({ ...initialState(on), farmLevel: 4, tracksV7: 1, v6BackupId: ID3 })); bk.setItem(V6_BACKUP_KEY, rec);
    const gb = boot(bk); expect(gb.recoveryOutcome).toBe('restored'); gb.save(); expect(bk.getItem(V6_BACKUP_KEY)).toBe(rec);
    const v7 = kvOf(); v7.setItem(SAVE_KEY, '{"version":7,"savedAt":1,"state":{}}'); v7.setItem(V6_BACKUP_KEY, rec); const g7 = boot(v7); g7.save(); expect(v7.getItem(V6_BACKUP_KEY)).toBe(rec);
  });
  it('M4-23 + N2 (doc v0.3.2): quota cleanup removes ONLY this session\'s aborted record, never a foreign leftover or the record main\'s v6BackupId points to', async () => {
    // this session aborts (readback ok, IDB changed) but its record removal fails -> leftover with MY id
    const { kv } = seed(); const idb = fakeIdb(); const m = new IdbMirror(idb.db); const g = boot(kv, {}, T0, m);
    const rm = kv.removeItem; kv.removeItem = (k: string) => { if (k !== V6_BACKUP_KEY) rm(k); };
    idb.data.set(IDB_KEY, raw6({ ...initialState(on), farmLevel: 13, tracksV7: 1, v6BackupId: ID3 }));
    expect(await g.startTracksMigration()).toBe('aborted'); kv.removeItem = rm;
    expect(decodeBackup(kv.getItem(V6_BACKUP_KEY))!.migrationId).toBe(ID1);
    const set = kv.setItem.bind(kv); let full = true;
    kv.setItem = (k: string, v: string) => { if (full && k === SAVE_KEY && kv.m.has(V6_BACKUP_KEY)) throw new DOMException('full', 'QuotaExceededError'); set(k, v); };
    g.dispatch({ type: 'buyFarm' } as any); g.save();
    expect(kv.getItem(V6_BACKUP_KEY)).toBeNull(); expect(JSON.parse(kv.getItem(SAVE_KEY)).state.farmLevel).toBe(11); expect(g.storageFailed).toBe(false);
    // a foreign leftover (another session's id) is never removed: the save fails instead
    const f = seed(); const left = encodeBackup({ migrationId: ID3, raw: 'old' }); f.kv.setItem(V6_BACKUP_KEY, left);
    const gf = boot(f.kv, { idbBoot: 'unknown' }); await gf.startTracksMigration(); const fs = f.kv.setItem.bind(f.kv);
    f.kv.setItem = (k: string, v: string) => { if (k === SAVE_KEY) throw new DOMException('full', 'QuotaExceededError'); fs(k, v); };
    gf.save(); expect(f.kv.getItem(V6_BACKUP_KEY)).toBe(left); expect(gf.storageFailed).toBe(true);
    // the committed record (main's v6BackupId) is never removed
    const c = seed(); const gc = boot(c.kv); expect(await gc.startTracksMigration()).toBe('committed'); const crec = c.kv.getItem(V6_BACKUP_KEY);
    const cs = c.kv.setItem.bind(c.kv); c.kv.setItem = (k: string, v: string) => { if (k === SAVE_KEY) throw new DOMException('full', 'QuotaExceededError'); cs(k, v); };
    gc.save(); expect(c.kv.getItem(V6_BACKUP_KEY)).toBe(crec);
  });
  it('N6 (doc v0.3.2): mirror resumes on the NEXT normal save after an abort or a non-IDB-unknown deferral (not at the abort itself); stays off after an IndexedDB-unknown deferral', async () => {
    const run = async (o: any, prep?: (kv: any, idb: any) => void) => {
      const { kv } = seed(); const idb = fakeIdb(); const m = new IdbMirror(idb.db); const w = idbWrites(m); const g = boot(kv, o, T0, m);
      prep?.(kv, idb); const r = await g.startTracksMigration(); const before = w.length; g.save(); return { r, n: w.length, before };
    };
    expect(await run({ idbBoot: 'unknown', idbAbsentReason: 'idb_timeout' })).toEqual({ r: 'deferred', n: 0, before: 0 });
    expect(await run({}, kv => kv.setItem(SAVE_KEY, raw6(mainState(12, 7))))).toEqual({ r: 'deferred', n: 1, before: 0 }); // ls_main_changed
    expect(await run({}, (kv) => { const s = kv.setItem.bind(kv); kv.setItem = (k: string, v: string) => { if (k === HEADROOM_PROBE_KEY) throw new DOMException('f', 'QuotaExceededError'); s(k, v); }; })).toEqual({ r: 'deferred', n: 1, before: 0 });
    { const { kv } = seed(); const m = new IdbMirror(fakeIdb().db); const w = idbWrites(m); const g = boot(kv, {}, T0, m); (m as any).readStrict = async () => undefined;
      expect(await g.startTracksMigration()).toBe('aborted'); g.save(); expect(w).toEqual([]); } // idb_main_changed from a failed re-read = IDB-unknown: stays off
    expect(await run({}, (_kv, idb) => idb.data.set(IDB_KEY, raw6({ ...initialState(on), farmLevel: 13, tracksV7: 1, v6BackupId: ID3 })))).toEqual({ r: 'aborted', n: 1, before: 0 });
  });
  it('N3 (doc v0.3.2): a stale headroom probe is deleted at boot, and the probe key is in RESET_KEYS', () => {
    for (const st of [null, mainState(10, 7)]) {
      const kv = kvOf(); if (st) kv.setItem(SAVE_KEY, raw6(st)); kv.setItem(HEADROOM_PROBE_KEY, 'x'.repeat(100)); boot(kv); expect(kv.getItem(HEADROOM_PROBE_KEY)).toBeNull();
    }
    expect(RESET_KEYS).toContain(HEADROOM_PROBE_KEY);
    const kv = kvOf(); kv.setItem(HEADROOM_PROBE_KEY, 'x'); resetProgress(kv); expect(kv.getItem(HEADROOM_PROBE_KEY)).toBeNull();
  });
  it('HoE headroom: max(factor x (save+backup), save+backup+margin), both from config; probe removed in finally even when the write throws', () => {
    expect(headroomNeed(1000, 1000, { lsHeadroomFactor: 2, lsHeadroomMarginBytes: 65536 })).toBe(67536);
    expect(headroomNeed(100_000, 100_000, { lsHeadroomFactor: 2, lsHeadroomMarginBytes: 65536 })).toBe(400_000);
    expect(on.save.lsHeadroomFactor).toBe(2); expect(on.save.lsHeadroomMarginBytes).toBe(65536);
    const kv = kvOf(); const s0 = kv.setItem.bind(kv); kv.setItem = (k: string, v: string) => { s0(k, v); if (k === HEADROOM_PROBE_KEY) throw new DOMException('f', 'QuotaExceededError'); };
    expect(probeHeadroom(kv, 10)).toBe(false); expect(kv.getItem(HEADROOM_PROBE_KEY)).toBeNull();
  });
  it('HoE ranking: version, then committed migrationId, then saveSeq, then savedAt; saves write saveSeq on main (missing = 0)', () => {
    const mk = (o: any) => JSON.stringify({ version: 6, savedAt: T0, state: mainState(1, 1), ...o });
    expect(rankCompare(mk({ saveSeq: 5, savedAt: T0 - 9000 }), mk({ saveSeq: 4 }), T0 + 1)).toBeGreaterThan(0); // seq beats savedAt
    expect(rankCompare(mk({}), mk({ saveSeq: 1 }), T0 + 1)).toBeLessThan(0); // missing = 0
    expect(rankCompare(mk({ saveSeq: 3, savedAt: T0 - 5 }), mk({ saveSeq: 3 }), T0 + 1)).toBeLessThan(0); // tie -> savedAt
    expect(rankCompare(raw6({ ...initialState(on), tracksV7: 1, v6BackupId: ID1 }), mk({ saveSeq: 99 }), T0 + 1)).toBeGreaterThan(0); // committed beats seq
    expect(rankCompare(mk({ version: 5, saveSeq: 99 }), mk({}), T0 + 1)).toBeLessThan(0); // version first
    expect([saveSeqOf(mk({ saveSeq: 'x' })), saveSeqOf(null), saveSeqOf('{')]).toEqual([0, 0, 0]);
    const { kv } = seed(); const g = boot(kv, { idbBoot: 'unknown' }); const q1 = saveSeqOf(kv.getItem(SAVE_KEY)); g.save();
    expect(q1).toBeGreaterThanOrEqual(1); expect(saveSeqOf(kv.getItem(SAVE_KEY))).toBe(q1 + 1); expect(validate(kv.getItem(SAVE_KEY)!, off).ok).toBe(true);
  });
  it('Head of QA (2): migration_attempts is a plain integer capped by config; non-integers reset to 0', async () => {
    expect(on.save.migrationAttemptsCap).toBe(3);
    for (const bad of ['abc', '1.5', '2.5', '-1', '-2', '', '2x', raw6(mainState(1, 1))]) {
      const { kv } = seed(); kv.setItem(MIGRATION_ATTEMPTS_KEY, bad); const g = boot(kv, { idbBoot: 'unknown' });
      expect(await g.startTracksMigration()).toBe('deferred'); expect(kv.getItem(MIGRATION_ATTEMPTS_KEY)).toBe('1');
      expect(ev(g, 'save_migration_aborted').at(-1).attempt_count).toBe(1);
    }
    const { kv } = seed(); kv.setItem(MIGRATION_ATTEMPTS_KEY, '17'); const g = boot(kv, { idbBoot: 'unknown' });
    expect(await g.startTracksMigration()).toBe('deferred'); expect(ev(g, 'save_migration_aborted').at(-1)).toMatchObject({ attempt_count: 3, stuck_on_v6: true }); expect(kv.getItem(MIGRATION_ATTEMPTS_KEY)).toBe('3');
    expect(kv.getItem(MIGRATION_ATTEMPTS_KEY)).not.toMatch(/version|savedAt|state/);
    const c = { ...on, save: { ...on.save, migrationAttemptsCap: 5 } }; const s2 = seed(); s2.kv.setItem(MIGRATION_ATTEMPTS_KEY, '3');
    const g2 = new Game(c, s2.kv, () => T0, undefined, 'dev', null, null, { idbBoot: 'ok', newId: ids(ID1) }); expect(await g2.startTracksMigration()).toBe('committed');
  });
  it('Head of QA (1): v6_backup read back right before the marker/v7 write; id != state.v6BackupId -> readback_mismatch, v6, no marker', async () => {
    const { kv } = seed(); const idb = fakeIdb(); const m = new IdbMirror(idb.db); const g = boot(kv, {}, T0, m);
    const rs = m.readStrict.bind(m); (m as any).readStrict = async (ms?: number) => { kv.setItem(V6_BACKUP_KEY, encodeBackup({ migrationId: ID3, raw: 'other tab' })); return rs(ms); };
    expect(await g.startTracksMigration()).toBe('aborted'); expect(ev(g, 'save_migration_aborted').at(-1)).toMatchObject({ store: 'ls', reason: 'readback_mismatch' });
    const main = JSON.parse(kv.getItem(SAVE_KEY)); expect([main.version, main.state.tracksV7, main.state.v6BackupId]).toEqual([6, undefined, undefined]);
    expect(g.balance.m4!.enabled).toBe(0); expect(decodeBackup(kv.getItem(V6_BACKUP_KEY))!.migrationId).toBe(ID3); // the other record is not mine: kept
    for (const mode of ['missing', 'throws'] as const) {
      const t = seed(); const m2 = new IdbMirror(fakeIdb().db); const g2 = boot(t.kv, {}, T0, m2); const rs2 = m2.readStrict.bind(m2); const gi = t.kv.getItem.bind(t.kv);
      (m2 as any).readStrict = async (ms?: number) => { if (mode === 'missing') t.kv.m.delete(V6_BACKUP_KEY); else t.kv.getItem = (k: string) => { if (k === V6_BACKUP_KEY) throw new Error('x'); return gi(k); }; return rs2(ms); };
      expect(await g2.startTracksMigration()).toBe('aborted'); t.kv.getItem = gi; expect(ev(g2, 'save_migration_aborted').at(-1).reason).toBe('readback_mismatch');
      expect(JSON.parse(t.kv.getItem(SAVE_KEY)).state.tracksV7).toBeUndefined();
    }
  });
  it('v0.3.3 SQ-1: LS v6 saveSeq 5 @T2 vs IDB v6 saveSeq 7 @T1 -> IDB wins; equal saveSeq -> savedAt', () => {
    const mk = (q: number, t: number) => JSON.stringify({ version: 6, savedAt: t, saveSeq: q, state: mainState(1, 1) });
    expect(rankCompare(mk(7, T0), mk(5, T0 + 100), T0 + 200)).toBeGreaterThan(0); expect(rankCompare(mk(5, T0), mk(5, T0 + 100), T0 + 200)).toBeLessThan(0);
  });
  it('M4-17: a corrupt / out-of-range v6 is never backed up or migrated', async () => {
    const kv = kvOf(); kv.setItem(SAVE_KEY, raw6({ ...mainState(10, 7), farmLevel: 99 }));
    const g = boot(kv); expect(g.tracksMigrationPending).toBe(false); expect(await g.startTracksMigration()).toBe('none'); expect(kv.getItem(V6_BACKUP_KEY)).toBeNull();
  });
  it('Reset: v6_backup + migration_attempts in RESET_KEYS; IDB clear removes main only (§3d: no IDB backup in M4-A)', async () => {
    expect(RESET_KEYS).toEqual(expect.arrayContaining([V6_BACKUP_KEY, MIGRATION_ATTEMPTS_KEY]));
    const kv = kvOf(); kv.setItem(V6_BACKUP_KEY, 'x'); kv.setItem(MIGRATION_ATTEMPTS_KEY, '2'); resetProgress(kv); expect([kv.getItem(V6_BACKUP_KEY), kv.getItem(MIGRATION_ATTEMPTS_KEY)]).toEqual([null, null]);
    const a = fakeIdb(); a.data.set(IDB_KEY, 'y'); await new IdbMirror(a.db).clear(); expect(a.data.size).toBe(0);
  });
  it('n1: migrate() alone never yields a backup payload', () => {
    const f = migrate(JSON.parse(raw6(mainState(10, 7))), on); expect(f.tracksMigrated).toBe(true); expect(f.preTracksRaw).toBeUndefined();
  });
});
