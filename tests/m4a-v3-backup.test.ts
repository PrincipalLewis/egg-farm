// v3 (HoE): (a) a flag-off build saving a marked save keeps tracksV7 and the track fields byte-for-byte;
// (b) the interim track migration writes a v6 backup exactly once, before the in-place change.
import { describe, it, expect } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { validate, serialize, checksum, migrate, save, SAVE_KEY, BAK_KEY, V6_BACKUP_KEY, SAVE_VERSION, RESET_KEYS, resetProgress, pendingTracksBackup, writeV6Backup } from '../src/save/save';
import { IdbMirror, IDB_V6_BACKUP_KEY, IDB_KEY, reconcile } from '../src/save/idb-mirror';
import { Game } from '../src/game';
import { mem } from './helpers';
const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
const off: Balance = { ...balance, m4: { ...balance.m4!, enabled: 0 } };
const raw6 = (st: object) => { const j = JSON.stringify(st); return `{"version":6,"savedAt":1760000000000,"sum":"${checksum(j)}","state":${j}}`; };
const mainState = (F: number, C: number) => { const { hensLevel, eggValueLevel, celebratedMilestones, tracksV7, ...r } = { ...initialState(balance), farmLevel: F, collectionLevel: C, coinsCents: 987654 } as any; void hensLevel; void eggValueLevel; void celebratedMilestones; void tracksV7; return r; };
const settle = () => new Promise(r => setTimeout(r, 5));
/** IndexedDB fake (one store) with add(); fail = which ops abort their transaction. */
function fakeIdb(fail: { add?: boolean; put?: boolean } = {}) {
  const data = new Map<string, unknown>();
  const db: any = { transaction() { const t: any = {}; let n = 0, bad = false;
    const op = (f: () => void, isBad = false) => { n++; setTimeout(() => { if (isBad) bad = true; else f(); if (--n === 0) setTimeout(() => (bad ? (t.onabort ?? t.onerror)?.() : t.oncomplete?.()), 0); }, 0); };
    t.objectStore = () => ({
      get: (k: string) => { const r: any = {}; op(() => { r.result = data.get(k); r.onsuccess?.(); }); return r; },
      put: (v: unknown, k: string) => { op(() => data.set(k, v), !!fail.put); return {}; },
      add: (v: unknown, k: string) => { op(() => { if (data.has(k)) bad = true; else data.set(k, v); }, !!fail.add); return {}; },
      delete: (k: string) => { op(() => data.delete(k)); return {}; } });
    return t; } };
  return { db, data };
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

describe('(b) v6 backup (M4A-31(a)/(f)1): both stores, exactly once, after the guards; abort = plain v6', () => {
  const ok = { idbV6Backup: 'ok' as const };
  it('localStorage + IndexedDB hold the exact pre-migration bytes before main is overwritten; migrated farm saved', async () => {
    const before = raw6(mainState(10, 7)); const kv = mem() as any; kv.setItem(SAVE_KEY, before);
    const { db, data } = fakeIdb(); const m = new IdbMirror(db);
    expect(pendingTracksBackup(kv, on)).toBe(before);
    expect(writeV6Backup(kv, before)).toBe('written'); expect(await m.writeV6Backup(kv.getItem(V6_BACKUP_KEY))).toBe(true); // boot order
    const order: string[] = []; const set = kv.setItem.bind(kv); kv.setItem = (k: string, v: string) => { order.push(k); set(k, v); };
    const g = new Game(on, kv, () => 1760000000500, undefined, 'dev', m, null, ok);
    expect(g.tracksMigrationAborted).toBeNull(); expect(g.state.tracksV7).toBe(1);
    expect(kv.getItem(V6_BACKUP_KEY)).toBe(before); expect(data.get(IDB_V6_BACKUP_KEY)).toBe(before);
    expect(order).not.toContain(V6_BACKUP_KEY); // already written: 'kept', never rewritten
    expect(JSON.parse(kv.getItem(SAVE_KEY)).state.tracksV7).toBe(1);
  });
  it('without a mirror (no IndexedDB) the localStorage backup is written first in the constructor, before main', () => {
    const before = raw6(mainState(10, 7)); const kv = mem() as any; kv.setItem(SAVE_KEY, before);
    const order: string[] = []; const set = kv.setItem.bind(kv); kv.setItem = (k: string, v: string) => { order.push(k); set(k, v); };
    new Game(on, kv, () => 1760000000500);
    expect(kv.getItem(V6_BACKUP_KEY)).toBe(before);
    expect(order.indexOf(V6_BACKUP_KEY)).toBeLessThan(order.indexOf(SAVE_KEY)); expect(order.filter(k => k === V6_BACKUP_KEY)).toHaveLength(1);
  });
  it('later loads and saves never rewrite the backup (m3 accepted risk: first backup kept)', () => {
    const before = raw6(mainState(15, 12)); const kv = mem() as any; kv.setItem(SAVE_KEY, before);
    new Game(on, kv, () => 1760000000500).save();
    let writes = 0; const set = kv.setItem.bind(kv); kv.setItem = (k: string, v: string) => { if (k === V6_BACKUP_KEY) writes++; set(k, v); };
    for (let i = 0; i < 3; i++) new Game(on, kv, () => 1760000001000 + i * 1000).save();
    kv.setItem(SAVE_KEY, raw6(mainState(16, 12))); new Game(on, kv, () => 1760000010000);
    expect(writes).toBe(0); expect(kv.getItem(V6_BACKUP_KEY)).toBe(before);
  });
  for (const store of ['localStorage', 'IndexedDB'] as const) it(`${store} quota failure: migration aborted, session runs + saves plain v6 (no marker), progress survives a close, next load retries`, async () => {
    const before = raw6(mainState(10, 7)); const kv = mem() as any; kv.setItem(SAVE_KEY, before);
    const set = kv.setItem.bind(kv); let failLS = store === 'localStorage';
    kv.setItem = (k: string, v: string) => { if (failLS && k === V6_BACKUP_KEY) throw new DOMException('full', 'QuotaExceededError'); set(k, v); };
    const { db, data } = fakeIdb({ add: store === 'IndexedDB' }); const m = new IdbMirror(db);
    // boot: LS first, then IDB with the stored bytes
    const lsRes = writeV6Backup(kv, before);
    const idb = lsRes !== 'failed' && await m.writeV6Backup(kv.getItem(V6_BACKUP_KEY)!) ? 'ok' as const : 'failed' as const;
    expect(idb).toBe('failed');
    const g = new Game(on, kv, () => 1760000000500, undefined, 'dev', m, null, { idbV6Backup: idb });
    expect(g.tracksMigrationAborted).toBe(store === 'localStorage' ? 'ls' : 'idb');
    expect(g.telemetry.events().find((e: any) => e.type === 'save_migration_aborted')).toMatchObject({ store: store === 'localStorage' ? 'ls' : 'idb', reason: 'backup_write_failed' });
    expect(g.balance.m4!.enabled).toBe(0);
    expect(g.state.tracksV7).toBeUndefined(); expect(g.state.hensLevel).toBe(0); expect(g.state.farmLevel).toBe(10);
    expect(g.telemetry.events().filter((e: any) => e.type === 'save_migration_aborted')).toHaveLength(1);
    expect(g.storageFailed).toBe(false); // the normal v6 save worked: no Can't-save notice
    g.dispatch({ type: 'buyFarm' } as any); g.save(); await settle();
    const saved = JSON.parse(kv.getItem(SAVE_KEY)); expect(saved.version).toBe(6); expect(saved.state.tracksV7).toBeUndefined();
    expect(saved.state.farmLevel).toBe(11); // progress kept (v6 save, page close = nothing else needed)
    expect(data.get(IDB_V6_BACKUP_KEY)).toBeUndefined();
    // reload with the same failure: still v6, progress still there
    const g2 = new Game(on, kv, () => 1760000001000, undefined, 'dev', m, null, { idbV6Backup: idb });
    expect(g2.state.farmLevel).toBe(11); expect(g2.state.tracksV7).toBeUndefined();
    // storage recovers: the next load retries and migrates
    failLS = false; const latest = kv.getItem(SAVE_KEY);
    const g3 = new Game(on, kv, () => 1760000002000, undefined, 'dev', null, null, ok);
    expect(g3.tracksMigrationAborted).toBeNull(); expect(g3.state.tracksV7).toBe(1); expect(g3.state.hensLevel).toBe(11);
    expect(kv.getItem(V6_BACKUP_KEY)).toBe(store === 'localStorage' ? latest : before);
  });
  it('never mid-session: a session that aborted keeps running v6 even after storage recovers', () => {
    const before = raw6(mainState(10, 7)); const kv = mem() as any; kv.setItem(SAVE_KEY, before);
    const set = kv.setItem.bind(kv); let fail = true;
    kv.setItem = (k: string, v: string) => { if (fail && k === V6_BACKUP_KEY) throw new DOMException('full', 'QuotaExceededError'); set(k, v); };
    const g = new Game(on, kv, () => 1760000000500); fail = false; g.save(); g.save();
    expect(g.state.tracksV7).toBeUndefined(); expect(kv.getItem(V6_BACKUP_KEY)).toBeNull();
    expect(JSON.parse(kv.getItem(SAVE_KEY)).state.tracksV7).toBeUndefined();
  });
  it('real IdbMirror.writeV6Backup: write-once, true when kept, false when the transaction aborts', async () => {
    const a = fakeIdb(); const m = new IdbMirror(a.db);
    expect(await m.writeV6Backup('one')).toBe(true); expect(await m.writeV6Backup('two')).toBe(true); expect(a.data.get(IDB_V6_BACKUP_KEY)).toBe('one');
    expect(await new IdbMirror(fakeIdb({ add: true }).db).writeV6Backup('x')).toBe(false);
    expect(await new IdbMirror({ transaction() { throw new Error('InvalidStateError'); } } as any).writeV6Backup('x')).toBe(false);
  });
  it('m1: the backup is never written when a newer save is stored (refusal comes first)', () => {
    const kv = mem() as any; kv.setItem(SAVE_KEY, raw6(mainState(10, 7))); kv.setItem(BAK_KEY, '{"version":7,"savedAt":1,"state":{}}');
    const g = new Game(on, kv, () => 1760000000500);
    expect(g.newerSave).toBe(7); expect(kv.getItem(V6_BACKUP_KEY)).toBeNull();
  });
  it('m4: Reset clears v6_backup (localStorage key list + IndexedDB clear)', async () => {
    expect(RESET_KEYS).toContain(V6_BACKUP_KEY);
    const kv = mem() as any; kv.removeItem = (k: string) => kv.m.delete(k); kv.setItem(V6_BACKUP_KEY, 'x'); resetProgress(kv); expect(kv.getItem(V6_BACKUP_KEY)).toBeNull();
    const a = fakeIdb(); a.data.set(IDB_V6_BACKUP_KEY, 'x'); a.data.set(IDB_KEY, 'y'); await new IdbMirror(a.db).clear(); expect(a.data.size).toBe(0);
  });
  it('n1: migrate() alone never yields a backup payload (only validate() attaches the raw bytes)', () => {
    const f = migrate(JSON.parse(raw6(mainState(10, 7))), on); expect(f.tracksMigrated).toBe(true); expect(f.preTracksRaw).toBeUndefined();
    void save;
  });
});
