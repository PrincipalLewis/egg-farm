// v3 (HoE): (a) a flag-off build saving a marked save keeps tracksV7 and the track fields byte-for-byte;
// (b) the interim track migration writes a v6 backup exactly once, before the in-place change.
import { describe, it, expect } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { validate, serialize, checksum, SAVE_KEY, V6_BACKUP_KEY, SAVE_VERSION } from '../src/save/save';
import { Game } from '../src/game';
import { mem } from './helpers';
const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
const off: Balance = { ...balance, m4: { ...balance.m4!, enabled: 0 } };
const raw6 = (st: object) => { const j = JSON.stringify(st); return `{"version":6,"savedAt":1760000000000,"sum":"${checksum(j)}","state":${j}}`; };
const mainState = (F: number, C: number) => { const { hensLevel, eggValueLevel, celebratedMilestones, tracksV7, ...r } = { ...initialState(balance), farmLevel: F, collectionLevel: C, coinsCents: 987654 } as any; void hensLevel; void eggValueLevel; void celebratedMilestones; void tracksV7; return r; };
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
});

describe('(b) v6 backup: exactly once, before the in-place change', () => {
  it('first flag-on load writes the exact pre-migration bytes before main is overwritten', () => {
    const before = raw6(mainState(10, 7)); const kv = mem() as any; kv.setItem(SAVE_KEY, before);
    const order: string[] = []; const set = kv.setItem.bind(kv);
    kv.setItem = (k: string, v: string) => { order.push(k); set(k, v); };
    const g = new Game(on, kv, () => 1760000000500);
    expect(g.state.tracksV7).toBe(1);
    expect(kv.getItem(V6_BACKUP_KEY)).toBe(before);
    expect(JSON.parse(kv.getItem(SAVE_KEY)).state.tracksV7).toBe(1);
    const iB = order.indexOf(V6_BACKUP_KEY), iM = order.indexOf(SAVE_KEY);
    expect(iB).toBeGreaterThanOrEqual(0); expect(iB).toBeLessThan(iM);
    expect(order.filter(k => k === V6_BACKUP_KEY)).toHaveLength(1);
  });
  it('IDB copy: written once via the mirror after the localStorage backup succeeds', () => {
    const before = raw6(mainState(10, 7)); const kv = mem() as any; kv.setItem(SAVE_KEY, before);
    const idb: string[] = []; const mirror: any = { write() {}, clear: async () => {}, writeV6Backup: async (r: string) => { idb.push(r); return true; } };
    const g = new Game(on, kv, () => 1760000000500, undefined, 'dev', mirror); g.save(); g.save();
    expect(idb).toEqual([before]);
  });
  it('later loads and saves never rewrite the backup', () => {
    const before = raw6(mainState(15, 12)); const kv = mem() as any; kv.setItem(SAVE_KEY, before);
    new Game(on, kv, () => 1760000000500).save();
    let writes = 0; const set = kv.setItem.bind(kv); kv.setItem = (k: string, v: string) => { if (k === V6_BACKUP_KEY) writes++; set(k, v); };
    for (let i = 0; i < 3; i++) new Game(on, kv, () => 1760000001000 + i * 1000).save();
    // even a second unmarked save (e.g. main build played in between) keeps the first backup
    kv.setItem(SAVE_KEY, raw6(mainState(16, 12))); new Game(on, kv, () => 1760000010000);
    expect(writes).toBe(0); expect(kv.getItem(V6_BACKUP_KEY)).toBe(before);
  });
  it('backup write fails -> play continues on the migrated state, main keeps the v6 bytes; the next save point retries and commits', () => {
    const before = raw6(mainState(10, 7)); const kv = mem() as any; kv.setItem(SAVE_KEY, before);
    const set = kv.setItem.bind(kv); let fail = true;
    kv.setItem = (k: string, v: string) => { if (fail && k === V6_BACKUP_KEY) throw new DOMException('full', 'QuotaExceededError'); set(k, v); };
    const g = new Game(on, kv, () => 1760000000500); g.save(); g.save();
    expect(g.state.tracksV7).toBe(1); expect(g.state.hensLevel).toBe(10);
    expect(kv.getItem(SAVE_KEY)).toBe(before); expect(kv.getItem(V6_BACKUP_KEY)).toBeNull();
    expect(g.telemetry.events().filter((e: any) => e.type === 'save_migration_aborted')).toHaveLength(1);
    fail = false; g.save();
    expect(kv.getItem(V6_BACKUP_KEY)).toBe(before); expect(JSON.parse(kv.getItem(SAVE_KEY)).state.tracksV7).toBe(1);
  });
});
