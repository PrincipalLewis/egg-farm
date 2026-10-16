// v3 (HoE): (a) a flag-off build saving a marked save keeps tracksV7 and the track fields byte-for-byte;
// (b) the interim track migration writes a v6 backup exactly once, before the in-place change.
import { describe, it, expect } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { validate, serialize, checksum, migrate, SAVE_KEY, BAK_KEY, V6_BACKUP_KEY, SAVE_VERSION, RESET_KEYS, resetProgress, decodeBackup, encodeBackup, newMigrationId, committedBackupRaw, loadSafe } from '../src/save/save';
import { IdbMirror, IDB_V6_BACKUP_KEY, IDB_KEY, reconcile } from '../src/save/idb-mirror';
import { Game } from '../src/game';
import { mem } from './helpers';
const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
const off: Balance = { ...balance, m4: { ...balance.m4!, enabled: 0 } };
const raw6 = (st: object) => { const j = JSON.stringify(st); return `{"version":6,"savedAt":1760000000000,"sum":"${checksum(j)}","state":${j}}`; };
const mainState = (F: number, C: number) => { const { hensLevel, eggValueLevel, celebratedMilestones, tracksV7, ...r } = { ...initialState(balance), farmLevel: F, collectionLevel: C, coinsCents: 987654 } as any; void hensLevel; void eggValueLevel; void celebratedMilestones; void tracksV7; return r; };
const settle = () => new Promise(r => setTimeout(r, 5));
/** IndexedDB fake (one store) with add(); fail = which ops abort their transaction. */
function fakeIdb(fail: { add?: boolean; put?: boolean; get?: boolean; open?: 'private' | 'error' | 'slow' } = {}) {
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
    if (fail.open !== 'slow') setTimeout(() => { if (fail.open === 'error') { r.error = new DOMException('x', 'UnknownError'); r.onerror?.(); return; } r.result = db; r.onsuccess?.(); }, 0); return r; } };
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
const ID1 = 'a1b2c3d4e5f60718', ID2 = '0f1e2d3c4b5a6978';
const ev = (g: Game, t: string) => g.telemetry.events().filter((e: any) => e.type === t) as any[];
const seed = (st = mainState(10, 7)) => { const raw = raw6(st); const kv = mem() as any; kv.removeItem = (k: string) => kv.m.delete(k); kv.setItem(SAVE_KEY, raw); return { kv, raw }; };
const boot = (kv: any, t = 1760000000500) => new Game(on, kv, () => t);
describe('(b) m4-design §3c interim path (ADR M4-12..17 + ruling N1/N2)', () => {
  it('M4-14: an unmarked v6 boots flag-off v6 (no track fields written) until the commit; then M4 rules + committed record', async () => {
    const { kv, raw } = seed(); const idb = fakeIdb(); const g = boot(kv);
    expect(g.tracksMigrationPending).toBe(true); expect(g.balance.m4!.enabled).toBe(0); expect(g.state.hensLevel).toBe(0);
    expect(g.dispatch({ type: 'buyTrack', track: 'hens' } as any) ?? g.state.hensLevel).toBeDefined(); expect(g.state.hensLevel).toBe(0); // track purchases disabled
    g.save(); const pend = JSON.parse(kv.getItem(SAVE_KEY)).state;
    expect(pend.tracksV7).toBeUndefined(); expect('hensLevel' in pend).toBe(false); expect('v6BackupId' in pend).toBe(false);
    expect(kv.getItem(V6_BACKUP_KEY)).toBeNull();
    expect(await g.startTracksMigration(idb.factory, ids(ID1))).toBe('committed');
    expect(g.balance.m4!.enabled).toBe(1); expect(g.state.hensLevel).toBe(10); expect(g.state.v6BackupId).toBe(ID1); // N3
    const live = JSON.parse(kv.getItem(SAVE_KEY)).state; expect(live.tracksV7).toBe(1); expect(live.v6BackupId).toBe(ID1);
    expect(decodeBackup(kv.getItem(V6_BACKUP_KEY))).toEqual({ migrationId: ID1, raw });
    expect(decodeBackup(idb.data.get(IDB_V6_BACKUP_KEY))).toEqual({ migrationId: ID1, raw });
    expect(ev(g, 'save_migrated')).toMatchObject([{ from: 6, to: 6, migration: 'tracksV7_marker' }]);
    expect(committedBackupRaw(kv.getItem(V6_BACKUP_KEY), null, live.v6BackupId, on)).toBe(raw);
    // committed: later loads never touch it
    let w = 0; const set = kv.setItem.bind(kv); kv.setItem = (k: string, v: string) => { if (k === V6_BACKUP_KEY) w++; set(k, v); };
    const g2 = boot(kv, 1760000001000); expect(g2.tracksMigrationPending).toBe(false); expect(g2.state.v6BackupId).toBe(ID1); g2.save(); expect(w).toBe(0);
  });
  it('N7: migrationId comes from save/ (16 hex, injectable rng)', () => {
    expect(newMigrationId(n => new Uint8Array(n).fill(0xab))).toBe('ab'.repeat(8)); expect(newMigrationId()).toMatch(/^[0-9a-f]{16}$/);
  });
  for (const store of ['ls', 'idb'] as const) it(`write failure in ${store}: abort (M4-12), stays v6 with no marker, purchase survives a close, no dialog, next load retries with a fresh id`, async () => {
    const { kv, raw } = seed(); const set = kv.setItem.bind(kv); let failLS = store === 'ls';
    kv.setItem = (k: string, v: string) => { if (failLS && k === V6_BACKUP_KEY) throw new DOMException('full', 'QuotaExceededError'); set(k, v); };
    const idb = fakeIdb({ put: store === 'idb' }); const g = boot(kv);
    expect(await g.startTracksMigration(idb.factory, ids(ID1))).toBe('aborted');
    expect(ev(g, 'save_migration_aborted')).toEqual([expect.objectContaining({ store, reason: store === 'ls' ? 'QuotaExceededError' : 'write_failed', path: 'tracksV7_marker' })]);
    expect(Object.keys(ev(g, 'save_migration_aborted')[0]).filter(k => !['type', 'ts', 'sessionMs'].includes(k)).sort()).toEqual(['path', 'reason', 'store']);
    expect(g.balance.m4!.enabled).toBe(0); expect(g.storageFailed).toBe(false);
    expect(kv.getItem(V6_BACKUP_KEY)).toBeNull(); expect(idb.data.has(IDB_V6_BACKUP_KEY)).toBe(false); // M4-13: no record from this attempt
    g.dispatch({ type: 'buyFarm' } as any); g.save();
    const s1 = JSON.parse(kv.getItem(SAVE_KEY)); expect(s1.version).toBe(6); expect(s1.state.tracksV7).toBeUndefined(); expect(s1.state.farmLevel).toBe(11);
    const g2 = boot(kv, 1760000001000); expect(g2.state.farmLevel).toBe(11); expect(g2.tracksMigrationPending).toBe(true); // page close kept it
    failLS = false; const fresh = fakeIdb();
    expect(await g2.startTracksMigration(fresh.factory, ids(ID2))).toBe('committed');
    expect(decodeBackup(kv.getItem(V6_BACKUP_KEY))!.migrationId).toBe(ID2); expect(g2.state.hensLevel).toBe(11);
    expect(decodeBackup(kv.getItem(V6_BACKUP_KEY))!.raw).not.toBe(raw); // the backup is the retry load's bytes
  });
  it('readback_mismatch: the LS record read back carries another migrationId -> abort, no commit', async () => {
    const { kv } = seed(); const set = kv.setItem.bind(kv);
    kv.setItem = (k: string, v: string) => set(k, k === V6_BACKUP_KEY ? encodeBackup({ migrationId: ID2, raw: 'x' }) : v);
    const g = boot(kv); expect(await g.startTracksMigration(fakeIdb().factory, ids(ID1))).toBe('aborted');
    expect(ev(g, 'save_migration_aborted')[0]).toMatchObject({ store: 'ls', reason: 'readback_mismatch' });
    expect(JSON.parse(kv.getItem(SAVE_KEY)).state.tracksV7).toBeUndefined();
  });
  it('N1: IndexedDB definitely absent (no global / private-mode SecurityError) -> commits on localStorage alone', async () => {
    for (const f of [undefined, fakeIdb({ open: 'private' }).factory]) {
      const { kv } = seed(); const g = boot(kv);
      expect(await g.startTracksMigration(f, ids(ID1))).toBe('committed');
      expect(decodeBackup(kv.getItem(V6_BACKUP_KEY))!.migrationId).toBe(ID1); expect(ev(g, 'save_migrated')[0]).toMatchObject({ idb: 'absent' });
    }
  });
  it('N1: open timeout / other open error / failed read -> no migration this session, nothing written, retry next load', async () => {
    for (const [mode, reason] of [[{ open: 'slow' }, 'idb_timeout'], [{ open: 'error' }, 'idb_read_error'], [{ get: true }, 'idb_read_error']] as const) {
      const { kv, raw } = seed(); const g = boot(kv); g.save(); const before = kv.getItem(SAVE_KEY);
      expect(await g.startTracksMigration(fakeIdb(mode as any).factory, ids(ID1))).toBe('aborted');
      expect(ev(g, 'save_migration_aborted')[0]).toMatchObject({ store: 'idb', reason, path: 'tracksV7_marker' });
      expect(kv.getItem(V6_BACKUP_KEY)).toBeNull(); expect(kv.getItem(SAVE_KEY)).toBe(before); expect(g.balance.m4!.enabled).toBe(0);
      expect(boot(kv, 1760000001000).tracksMigrationPending).toBe(true); void raw;
    }
  }, 20_000);
  it('a newer save only in IndexedDB, behind a slow open, is left completely untouched', async () => {
    const { kv } = seed(); const idb = fakeIdb({ open: 'slow' }); const v7 = '{"version":7,"savedAt":1,"state":{}}'; idb.data.set(IDB_KEY, v7);
    const lsBefore = JSON.stringify([...kv.m]); const g = boot(kv);
    const lsAfterBoot = new Map(kv.m);
    expect(await g.startTracksMigration(idb.factory, ids(ID1))).toBe('aborted');
    expect(idb.data.get(IDB_KEY)).toBe(v7); expect([...idb.data.keys()]).toEqual([IDB_KEY]);
    expect(kv.getItem(V6_BACKUP_KEY)).toBeNull(); expect(new Map(kv.m).get(SAVE_KEY)).toBe(lsAfterBoot.get(SAVE_KEY)); void lsBefore;
    // fast open: the newer IDB copy is seen and refused, nothing written
    const fast = fakeIdb(); fast.data.set(IDB_KEY, v7); const { kv: kv2 } = seed(); const g2 = boot(kv2);
    expect(await g2.startTracksMigration(fast.factory, ids(ID1))).toBe('none'); expect(g2.newerSave).toBe(7);
    expect(kv2.getItem(V6_BACKUP_KEY)).toBeNull(); expect(fast.data.get(IDB_KEY)).toBe(v7); expect(fast.data.has(IDB_V6_BACKUP_KEY)).toBe(false);
  });
  it('N2: a leftover record is never deleted on a normal load; only the migration overwrites it', async () => {
    const { kv } = seed(); const left = encodeBackup({ migrationId: ID2, raw: 'old' }); kv.setItem(V6_BACKUP_KEY, left);
    const g = boot(kv); g.save(); expect(kv.getItem(V6_BACKUP_KEY)).toBe(left);
    expect(await g.startTracksMigration(fakeIdb({ open: 'slow' }).factory, ids(ID1))).toBe('aborted'); expect(kv.getItem(V6_BACKUP_KEY)).toBe(left);
    const g2 = boot(kv, 1760000001000); expect(await g2.startTracksMigration(undefined, ids(ID1))).toBe('committed');
    expect(decodeBackup(kv.getItem(V6_BACKUP_KEY))!.migrationId).toBe(ID1);
  }, 10_000);
  it('N2: corrupt-v7 / newer recovery and .bak restore keep v6_backup', () => {
    const rec = encodeBackup({ migrationId: ID1, raw: 'x' });
    const a = mem() as any; a.removeItem = (k: string) => a.m.delete(k); a.setItem(SAVE_KEY, '{"version":7,"savedAt":1,"state":{}}'); a.setItem(V6_BACKUP_KEY, rec);
    const ga = new Game(on, a, () => 1760000000500); ga.save(); expect(a.getItem(V6_BACKUP_KEY)).toBe(rec);
    const c = mem() as any; c.removeItem = (k: string) => c.m.delete(k); c.setItem(SAVE_KEY, '{"version":6,"savedAt":1,"sum":"bad","state":{"x":1}}');
    c.setItem(BAK_KEY, raw6({ ...initialState(on), farmLevel: 4, tracksV7: 1, v6BackupId: ID1 })); c.setItem(V6_BACKUP_KEY, rec);
    const gc = new Game(on, c, () => 1760000000500); expect(gc.recoveryOutcome).toBe('restored'); gc.save(); expect(c.getItem(V6_BACKUP_KEY)).toBe(rec);
    void loadSafe;
  });
  it('M4-17: a corrupt / out-of-range v6 is never backed up or migrated', async () => {
    const kv = mem() as any; kv.removeItem = (k: string) => kv.m.delete(k);
    kv.setItem(SAVE_KEY, raw6({ ...mainState(10, 7), farmLevel: 99 }));
    const g = boot(kv); expect(g.tracksMigrationPending).toBe(false);
    expect(await g.startTracksMigration(undefined, ids(ID1))).toBe('none'); expect(kv.getItem(V6_BACKUP_KEY)).toBeNull();
  });
  it('real IdbMirror.putV6Backup: confirmed write with read-back; false when the transaction aborts', async () => {
    const a = fakeIdb(); expect(await new IdbMirror(a.db).putV6Backup('r1')).toBe(true); expect(a.data.get(IDB_V6_BACKUP_KEY)).toBe('r1');
    expect(await new IdbMirror(fakeIdb({ put: true }).db).putV6Backup('x')).toBe(false);
    expect(await new IdbMirror({ transaction() { throw new Error('InvalidStateError'); } } as any).putV6Backup('x')).toBe(false);
  });
  it('m4/§3c Reset: v6_backup in RESET_KEYS and IndexedDB clear', async () => {
    expect(RESET_KEYS).toContain(V6_BACKUP_KEY);
    const kv = mem() as any; kv.removeItem = (k: string) => kv.m.delete(k); kv.setItem(V6_BACKUP_KEY, 'x'); resetProgress(kv); expect(kv.getItem(V6_BACKUP_KEY)).toBeNull();
    const a = fakeIdb(); a.data.set(IDB_V6_BACKUP_KEY, 'x'); a.data.set(IDB_KEY, 'y'); await new IdbMirror(a.db).clear(); expect(a.data.size).toBe(0);
  });
  it('n1: migrate() alone never yields a backup payload', () => {
    const f = migrate(JSON.parse(raw6(mainState(10, 7))), on); expect(f.tracksMigrated).toBe(true); expect(f.preTracksRaw).toBeUndefined();
  });
});
