// M41-7 corrupt-save recovery (spec product/farm/corrupt-save-recovery-spec.md v0.3.3 FROZEN, sha256 bca075fe…0bae9c):
// loadSafe() single owner of .bak / IDB mirror / v6_backup / fresh (CSR-1..16), CSR-13 defer, CSR-AC-IDB1 (IDB1-1..8), save_restore.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { loadSafe, validate, serialize, checksum, encodeBackup, SAVE_KEY, BAK_KEY, V6_BACKUP_KEY, CORRUPT_PREFIX, CORRUPT_INDEX_KEY, type IdbInput } from '../src/save/save';
import { reconcile } from '../src/save/idb-mirror';
import { Game } from '../src/game';
import { recoveryNotice, recoveryCopy } from '../src/ui/save-recovery';

const NOW = 1_792_400_000_000; // 2026-10-19, after every fixture savedAt
const fx = (f: string) => readFileSync(new URL(`./fixtures/csr-idb1/${f}`, import.meta.url), 'utf8');
type KVM = ReturnType<typeof kvm>;
const kvm = (quota?: (k: string) => boolean) => {
  const m = new Map<string, string>(); const writes: string[] = [];
  return { m, writes, getItem: (k: string) => m.get(k) ?? null, removeItem: (k: string) => { writes.push(`-${k}`); m.delete(k); },
    setItem: (k: string, v: string) => { if (quota?.(k)) { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; } writes.push(k); m.set(k, v); } };
};
const corrupt = (k: KVM) => [...k.m.keys()].filter(x => x.startsWith(CORRUPT_PREFIX) && x !== CORRUPT_INDEX_KEY).map(x => k.m.get(x));
const ID = '00112233aabbccdd';
const st = (F: number, patch: object = {}) => ({ ...initialState(b, 1), farmLevel: F, coinsCents: 1000 + F, tracksV7: 1 as const, v6BackupId: ID, ...patch });
const good = (F: number, seq = 5, at = NOW - 60_000) => serialize(st(F) as any, at, seq);
const v6raw = (F: number, at = NOW - 86_400_000 * 3) => { const s: any = { ...initialState(b, 1), farmLevel: F, coinsCents: 50 }; delete s.hensLevel; delete s.eggValueLevel; delete s.celebratedMilestones; const j = JSON.stringify(s); return `{"version":6,"savedAt":${at},"sum":"${checksum(j)}","state":${j}}`; };
const BAD = '{"version":6,"savedAt":1,"state":{"coins'; // parse
const badLevel = (F: unknown) => { const j = JSON.stringify({ ...st(0), farmLevel: F }); return `{"version":6,"savedAt":${NOW - 1000},"saveSeq":9,"sum":"${checksum(j)}","state":${j}}`; };
const ok = (raw: unknown, reason?: string): IdbInput => ({ status: 'ok', raw, reason });
const unknownIdb = (raw: unknown = null): IdbInput => ({ status: 'unknown', raw, reason: 'idb_timeout' });
const ev = (g: Game, t: string) => g.telemetry.events().filter((e: any) => e.type === t) as any[];

describe('CSR-2 tier order: corrupt main -> tier A (.bak vs IDB by rank, tie .bak) -> v6_backup -> fresh', () => {
  type S = 'valid' | 'invalid' | 'absent';
  const all: S[] = ['valid', 'invalid', 'absent'];
  for (const bak of all) for (const idb of all) for (const v6 of all) it(`.bak ${bak}, IDB ${idb}, v6_backup ${v6}`, () => {
    const k = kvm(); k.setItem(SAVE_KEY, BAD);
    if (bak !== 'absent') k.setItem(BAK_KEY, bak === 'valid' ? good(4, 4) : '{"bak');
    if (v6 !== 'absent') k.setItem(V6_BACKUP_KEY, v6 === 'valid' ? encodeBackup({ migrationId: ID, raw: v6raw(2) }) : 'junk');
    const idbRaw = idb === 'valid' ? good(5, 3) : idb === 'invalid' ? '{"idb' : null;
    const r = loadSafe(k, b, NOW, ok(idbRaw));
    const want = bak === 'valid' ? 'bak' : idb === 'valid' ? 'idb' : v6 === 'valid' ? 'v6_backup' : 'none';
    expect(r.recovery?.source).toBe(want);
    expect(r.outcome).toBe(want === 'none' ? 'fresh' : 'restored');
    const tried = r.recovery!.tried!.map(t => `${t.source}:${t.result}`);
    expect(tried.slice(0, 2)).toEqual([`bak:${bak}`, `idb:${idb}`]);
    if (want === 'bak' || want === 'idb') expect(tried).toHaveLength(2); else expect(tried[2]).toBe(`v6_backup:${v6}`);
    expect(r.recovery).toMatchObject({ store: 'ls', reason: 'parse', restored_from_backup: want !== 'none' });
    if (want !== 'none') expect(r.file).not.toBeNull(); else expect(r.file).toBeNull();
  });
  it('both valid: higher-ranked IDB wins, higher-ranked .bak wins, tie -> .bak', () => {
    const run = (bak: string, idb: string) => { const k = kvm(); k.setItem(SAVE_KEY, BAD); k.setItem(BAK_KEY, bak); return loadSafe(k, b, NOW, ok(idb)).recovery?.source; };
    expect(run(good(4, 4), good(5, 6))).toBe('idb');
    expect(run(good(4, 7), good(5, 6))).toBe('bak');
    expect(run(good(4, 6, NOW - 5000), good(5, 6, NOW - 5000))).toBe('bak');
  });
  it('IDB absent -> tried reason no_global|security; IDB unknown + valid .bak -> .bak, mirror off (CSR-13)', () => {
    const k = kvm(); k.setItem(SAVE_KEY, BAD); k.setItem(BAK_KEY, good(4));
    expect(loadSafe(k, b, NOW, { status: 'absent', raw: null, reason: 'security' }).recovery!.tried![1]).toEqual({ source: 'idb', result: 'absent', reason: 'security' });
    const k2 = kvm(); k2.setItem(SAVE_KEY, BAD); k2.setItem(BAK_KEY, good(4));
    const r = loadSafe(k2, b, NOW, unknownIdb(good(9, 99)));
    expect(r.recovery?.source).toBe('bak'); expect(r.mirrorOff).toBe(true);
    expect(r.recovery!.tried![1]).toEqual({ source: 'idb', result: 'unavailable', reason: 'idb_timeout' });
  });
});

describe('CSR-3: corrupt LS main + valid IDB is a recovery, never silent', () => {
  it('IDB restored, corrupt main preserved, outcome restored, source idb', () => {
    const k = kvm(); k.setItem(SAVE_KEY, BAD);
    const r = loadSafe(k, b, NOW, ok(good(6)));
    expect(r.recovery).toMatchObject({ case: 'R', source: 'idb', store: 'ls' }); expect(r.file!.state.farmLevel).toBe(6);
    expect(corrupt(k)).toEqual([BAD]); expect(r.staleRestore).toBeFalsy();
  });
  it('IDB bytes identical to the corrupt main count as invalid (and are preserved once)', () => {
    const k = kvm(); k.setItem(SAVE_KEY, BAD);
    const r = loadSafe(k, b, NOW, ok(BAD));
    expect(r.recovery!.tried![1]).toMatchObject({ source: 'idb', result: 'invalid' }); expect(r.recovery!.source).toBe('none');
    expect(corrupt(k)).toEqual([BAD]);
  });
  it('reconcile() no longer restores over a corrupt LS main (loadSafe owns it)', () => {
    const k = kvm(); k.setItem(SAVE_KEY, BAD); expect(reconcile(k as any, good(6), b, NOW)).toBe('ls');
    expect(k.getItem(SAVE_KEY)).toBe(BAD); expect(corrupt(k)).toEqual([]);
  });
  it('Game: save_corrupt {recovered_from idb, store ls, tried, migrated:false} once and flushed', () => {
    const k = kvm(); k.setItem(SAVE_KEY, BAD);
    const g = new Game(b, k, () => NOW, 1, 'test', null, good(6), { idbBoot: 'ok' });
    const e = ev(g, 'save_corrupt'); expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ reason: 'parse', recovered_from: 'idb', store: 'ls', restored_from_backup: true, had_backup: false, migrated: false, restored_version: 6 });
    expect(e[0].tried.map((t: any) => t.source)).toEqual(['bak', 'idb']);
    expect(k.getItem('eggfarm.telemetry')).toContain('save_corrupt');
    expect(g.state.farmLevel).toBe(6); expect(g.recoveryOutcome).toBe('restored');
  });
});

describe('save_restore {source:idb}: the silent non-corrupt stale-LS restore (G7, D-HOP-35, IDB1-7)', () => {
  it('valid but older LS main + newer valid IDB -> IDB written into main, no recovery, staleRestore', () => {
    const k = kvm(); k.setItem(SAVE_KEY, good(3, 2));
    const r = loadSafe(k, b, NOW, ok(good(7, 8)));
    expect(r.recovery).toBeNull(); expect(r.staleRestore).toBe(true); expect(r.file!.state.farmLevel).toBe(7); expect(k.getItem(SAVE_KEY)).toBe(good(7, 8));
  });
  it('Game emits save_restore {source:"idb"} exactly once after the loadSafe refactor (LS main missing), never save_restored', () => {
    const k = kvm();
    const g = new Game(b, k, () => NOW, 1, 'test', null, good(7, 8), { idbBoot: 'ok' });
    expect(ev(g, 'save_restore')).toEqual([expect.objectContaining({ source: 'idb' })]);
    expect(ev(g, 'save_restored')).toEqual([]); expect(ev(g, 'save_corrupt')).toEqual([]);
    expect(g.recovery).toBeNull(); expect(g.state.farmLevel).toBe(7);
  });
  it('identical / older IDB copy -> no save_restore', () => {
    const k = kvm(); k.setItem(SAVE_KEY, good(7, 8)); const g = new Game(b, k, () => NOW, 1, 'test', null, good(7, 8), { idbBoot: 'ok' });
    const k2 = kvm(); k2.setItem(SAVE_KEY, good(7, 8)); const g2 = new Game(b, k2, () => NOW, 1, 'test', null, good(3, 2), { idbBoot: 'ok' });
    expect(ev(g, 'save_restore')).toEqual([]); expect(ev(g2, 'save_restore')).toEqual([]);
  });
});

describe('CSR-13 IDB unknown: defer (no v6_backup / fresh commit, no save write)', () => {
  it('.bak invalid + IDB unknown -> case D, outcome deferred, file null, even with a valid v6_backup', () => {
    const k = kvm(); k.setItem(SAVE_KEY, BAD); k.setItem(BAK_KEY, '{"bak'); k.setItem(V6_BACKUP_KEY, encodeBackup({ migrationId: ID, raw: v6raw(2) }));
    const r = loadSafe(k, b, NOW, unknownIdb());
    expect(r).toMatchObject({ file: null, outcome: 'deferred' }); expect(r.recovery).toMatchObject({ case: 'D', source: 'deferred', raw: BAD });
    expect(r.recovery!.tried!.map(t => t.source)).toEqual(['bak', 'idb']);
  });
  it('Game on defer: read-only, no save key written (only corrupt.* + telemetry), save_corrupt recovered_from deferred', () => {
    const k = kvm(); k.setItem(SAVE_KEY, BAD); const before = new Map(k.m); k.writes.length = 0;
    const g = new Game(b, k, () => NOW, 1, 'test', null, null, { idbBoot: 'unknown', idbAbsentReason: 'idb_blocked' });
    expect(g.readOnly).toBe(true); expect(g.recoveryOutcome).toBe('deferred'); expect(g.canPersist).toBe(false); g.save();
    for (const key of [SAVE_KEY, BAK_KEY, V6_BACKUP_KEY]) expect(k.m.get(key)).toBe(before.get(key));
    expect(k.writes.every(w => w.startsWith(CORRUPT_PREFIX) || w === 'eggfarm.telemetry' || w === 'eggfarm.install_id')).toBe(true);
    expect(ev(g, 'save_corrupt')[0]).toMatchObject({ recovered_from: 'deferred', store: 'ls' });
  });
  it('CSR-13b: defer with a quota-failing KV -> deferred, no key changed', () => {
    const k = kvm(() => true); k.m.set(SAVE_KEY, BAD); const before = new Map(k.m);
    const r = loadSafe(k, b, NOW, unknownIdb()); expect(r.outcome).toBe('deferred'); expect(k.m).toEqual(before);
  });
  it('repeated deferred boots with the same corrupt bytes keep one corrupt.* copy (cross-boot dedupe, G6)', () => {
    const k = kvm(); k.setItem(SAVE_KEY, BAD); k.setItem(BAK_KEY, '{"bak');
    for (let i = 0; i < 4; i++) loadSafe(k, b, NOW + i * 10, unknownIdb());
    expect(corrupt(k).sort()).toEqual([BAD, '{"bak'].sort());
  });
  it('M4 notice: final copy, Try again', () => {
    const k = kvm(); k.setItem(SAVE_KEY, BAD); const r = loadSafe(k, b, NOW, unknownIdb());
    expect(recoveryNotice(r.recovery, { storageBlocked: false, now: NOW })).toMatchObject({ id: 'M4' });
    expect(recoveryCopy(r.recovery!)).toMatchObject({ outcome: 'deferred', title: "Couldn't load your farm", button: 'Try again' });
  });
});

describe('CSR-4/5 v6_backup tier', () => {
  it('decodeBackup null (junk / old raw-string format) -> invalid; v6 raw version > 6 -> invalid version, not newer', () => {
    for (const [rec, reason] of [['junk', 'parse'], [JSON.stringify(v6raw(2)), 'parse'], [encodeBackup({ migrationId: ID, raw: '{"version":7,"savedAt":1,"state":{}}' }), 'version']] as const) {
      const k = kvm(); k.setItem(SAVE_KEY, BAD); k.setItem(V6_BACKUP_KEY, rec);
      const r = loadSafe(k, b, NOW, ok(null)); expect(r.newer).toBeUndefined(); expect(r.recovery!.source).toBe('none');
      expect(r.recovery!.tried![2]).toEqual({ source: 'v6_backup', result: 'invalid', reason });
      expect(k.getItem(V6_BACKUP_KEY)).toBe(rec); // CSR-5: never deleted / edited; CSR-7: never copied to corrupt.*
      expect(corrupt(k)).toEqual([BAD]);
    }
  });
  it('valid unmarked v6 raw -> restored, migrated (tracks migration re-runs), record byte-identical on load', () => {
    const k = kvm(); k.setItem(SAVE_KEY, BAD); const rec = encodeBackup({ migrationId: ID, raw: v6raw(12) }); k.setItem(V6_BACKUP_KEY, rec);
    const r = loadSafe(k, b, NOW, ok(null));
    expect(r.recovery).toMatchObject({ source: 'v6_backup', migrated: true, restored_version: 6, restoredLevel: 12 }); expect(r.file!.tracksMigrated).toBe(true);
    const g = new Game(b, k, () => NOW, 1, 'test', null, null, { idbBoot: 'ok' });
    expect(k.getItem(V6_BACKUP_KEY)).toBe(rec); expect(g.tracksMigrationPending).toBe(true); expect(g.recoveryOutcome).toBe('restored');
    expect(ev(g, 'save_corrupt')[0]).toMatchObject({ recovered_from: 'v6_backup', migrated: true });
  });
});

describe('CSR-6/11 fresh only as last resort; every source corrupt', () => {
  it('corrupt main + .bak, IDB, v6_backup all invalid -> fresh F, tried 3 invalid, <= 3 copies, v6_backup kept', () => {
    const k = kvm(); k.setItem(SAVE_KEY, BAD); k.setItem(BAK_KEY, '{"bak'); k.setItem(V6_BACKUP_KEY, 'junk');
    const r = loadSafe(k, b, NOW, ok('{"idb'));
    expect(r.recovery).toMatchObject({ case: 'F', source: 'none' }); expect(r.recovery!.tried!.map(t => t.result)).toEqual(['invalid', 'invalid', 'invalid']);
    expect(corrupt(k).sort()).toEqual([BAD, '{"bak'].sort()); // the IDB copy is kept in IDB (IDB1), not in LS
    expect(k.getItem(V6_BACKUP_KEY)).toBe('junk');
  });
  it('CSR-1: a sanitizeLevel failure (invalid_state) takes the same order', () => {
    for (const F of [null, -1, 'abc', '2.5', true, {}]) {
      const k = kvm(); k.setItem(SAVE_KEY, badLevel(F)); k.setItem(BAK_KEY, good(4));
      const r = loadSafe(k, b, NOW, ok(null)); expect(r.recovery).toMatchObject({ reason: 'invalid_state', source: 'bak' });
    }
  });
  it('missing main + no .bak + no IDB = new game, no recovery; missing main + invalid .bak -> chain', () => {
    expect(loadSafe(kvm(), b, NOW, ok(null))).toMatchObject({ file: null, recovery: null });
    const k = kvm(); k.setItem(BAK_KEY, '{"bak'); const r = loadSafe(k, b, NOW, ok(good(3)));
    expect(r.recovery).toMatchObject({ source: 'idb', store: 'ls' });
  });
});

describe('CSR-7 dedupe / cap', () => {
  it('.bak bytes identical to main are preserved once', () => {
    const k = kvm(); k.setItem(SAVE_KEY, BAD); k.setItem(BAK_KEY, BAD); loadSafe(k, b, NOW, ok(null)); expect(corrupt(k)).toEqual([BAD]);
  });
  it('LS cap 3, oldest evicted (preserveCorrupt unchanged)', () => {
    const k = kvm(); for (let i = 0; i < 5; i++) { k.setItem(SAVE_KEY, `{"bad${i}`); loadSafe(k, b, NOW + i * 10, ok(null)); }
    expect(corrupt(k)).toEqual(['{"bad2', '{"bad3', '{"bad4']);
  });
});

describe('CSR-9a prevLevel / restoredLevel / restoredSavedAt; notice ids', () => {
  const v6 = (main: string, bak?: string, at?: number) => { const k = kvm(); k.setItem(SAVE_KEY, main); if (bak) k.setItem(BAK_KEY, bak); k.setItem(V6_BACKUP_KEY, encodeBackup({ migrationId: ID, raw: v6raw(12, at) })); return loadSafe(k, b, NOW, ok(null)).recovery!; };
  const mainF = (F: unknown) => `{"version":6,"savedAt":1,"sum":"00000000","state":{"farmLevel":${JSON.stringify(F)}}}`;
  it('CSR-9a-1: corrupt main JSON farmLevel 17 -> prevLevel 17, M2 level variant', () => {
    const r = v6(mainF(17)); expect(r.prevLevel).toBe(17); expect(recoveryNotice(r, { storageBlocked: false, now: NOW })).toMatchObject({ id: 'M2', variant: 'level', level: 12 });
  });
  it('CSR-9a-2: main unparseable, .bak bytes carry farmLevel 15 -> prevLevel 15', () => { expect(v6(BAD, mainF(15)).prevLevel).toBe(15); });
  it('CSR-9a-3: none -> unset, age variant from the v6 raw savedAt; invalid savedAt -> fallback', () => {
    const r = v6(BAD); expect(r.prevLevel).toBeUndefined(); expect(recoveryNotice(r, { storageBlocked: false, now: NOW })).toMatchObject({ id: 'M2', variant: 'age', ageMs: 86_400_000 * 3 });
    const r2 = v6(BAD, undefined, -5); expect(r2.restoredSavedAt).toBeUndefined(); expect(recoveryNotice(r2, { storageBlocked: false, now: NOW })).toMatchObject({ variant: 'fallback' });
  });
  it('CSR-9a-4: 12.5, null, -1, "17" rejected (falls to .bak, then unset); 31 accepted', () => {
    for (const F of [12.5, null, -1, '17']) expect(v6(mainF(F)).prevLevel).toBeUndefined();
    expect(v6(mainF(null), mainF(9)).prevLevel).toBe(9); expect(v6(mainF(31)).prevLevel).toBe(31);
  });
  it('level equal to prevLevel -> age variant', () => { expect(recoveryNotice(v6(mainF(12)), { storageBlocked: false, now: NOW })).toMatchObject({ variant: 'age' }); });
  it('M1 / M3 / M5 / storage / cantsave ids', () => {
    const k = kvm(); k.setItem(SAVE_KEY, BAD); k.setItem(BAK_KEY, good(4)); const r = loadSafe(k, b, NOW, ok(null)).recovery;
    expect(recoveryNotice(r, { storageBlocked: false, now: NOW }).id).toBe('M1'); expect(recoveryNotice(r, { storageBlocked: true, now: NOW }).id).toBe('M5');
    const k2 = kvm(); k2.setItem(SAVE_KEY, BAD); expect(recoveryNotice(loadSafe(k2, b, NOW, ok(null)).recovery, { storageBlocked: false, now: NOW }).id).toBe('M3');
    const k3 = kvm(s => s.startsWith(CORRUPT_PREFIX)); k3.m.set(SAVE_KEY, BAD); expect(recoveryNotice(loadSafe(k3, b, NOW, ok(null)).recovery, { storageBlocked: false, now: NOW }).id).toBe('storage');
    expect(recoveryNotice(null, { storageBlocked: true, now: NOW }).id).toBe('cantsave'); expect(recoveryNotice(null, { storageBlocked: false, now: NOW }).id).toBeNull();
  });
  it('legacy AC14b strings still shown for M1/M3 until UI swaps copy', () => {
    const k = kvm(); k.setItem(SAVE_KEY, BAD); k.setItem(BAK_KEY, good(4));
    expect(recoveryCopy(loadSafe(k, b, NOW, ok(null)).recovery!)!.title).toBe('Welcome back!');
  });
});

describe('CSR-AC-IDB1 corrupt IDB copy with nothing valid in LS (IDB1-6 store, IDB1-8 no repair)', () => {
  const nonstring = () => JSON.parse(fx('IDB1-nonstring-object.value.json'));
  const cases: [string, unknown, string][] = [['IDB1-abc', fx('IDB1-abc.idb-main.raw'), 'invalid_state'], ['IDB1-truncated', fx('IDB1-truncated.idb-main.raw'), 'parse'],
    ['IDB1-wrongtype-version-string', fx('IDB1-wrongtype-version-string.idb-main.raw'), 'wrong_type'], ['IDB1-nonstring-object', nonstring(), 'wrong_type']];
  for (const [name, value, reason] of cases) it(`${name}: never a silent new game -> fresh M3, store idb, reason ${reason}`, () => {
    const k = kvm(); k.setItem('eggfarm.ui', '{"onboardingDone":true}');
    const g = new Game(b, k, () => NOW, 1, 'test', null, value, { idbBoot: 'ok', idbCopy: 'copied' });
    expect(g.recoveryOutcome).toBe('fresh'); expect(g.state.coinsCents).toBe(initialState(b).coinsCents);
    const e = ev(g, 'save_corrupt'); expect(e).toHaveLength(1); expect(e[0]).toMatchObject({ store: 'idb', reason, recovered_from: 'none', copy_failed: undefined });
    expect(e[0].tried[1]).toMatchObject({ source: 'idb', result: 'invalid', reason });
    expect(ev(g, 'save_repaired')).toEqual([]); expect(corrupt(k)).toEqual([]); // the copy lives in IDB, not LS
  });
  it('IDB1 with a valid v6_backup -> M2', () => {
    const k = kvm(); k.setItem(V6_BACKUP_KEY, encodeBackup({ migrationId: ID, raw: v6raw(5) }));
    const r = loadSafe(k, b, NOW, ok(fx('IDB1-abc.idb-main.raw'))); expect(r.recovery).toMatchObject({ source: 'v6_backup', store: 'idb' });
  });
  it('IDB1-3: copy failed -> M3 with Export (bytes from memory), copy_failed, mirror off', () => {
    const k = kvm(); const raw = fx('IDB1-abc.idb-main.raw');
    const g = new Game(b, k, () => NOW, 1, 'test', null, raw, { idbBoot: 'ok', idbCopy: 'failed' });
    expect(g.recoveryOutcome).toBe('fresh'); expect(g.recovery!.raw).toBe(raw); expect(ev(g, 'save_corrupt')[0]).toMatchObject({ copy_failed: true, store: 'idb' });
  });
  it('IDB1-6: corrupt LS main (OQ-1 bytes) + IDB1-abc -> store ls, tried idb invalid', () => {
    const k = kvm(); k.setItem(SAVE_KEY, badLevel('abc'));
    const r = loadSafe(k, b, NOW, ok(fx('IDB1-abc.idb-main.raw'))); expect(r.recovery).toMatchObject({ store: 'ls' }); expect(r.recovery!.tried![1]).toMatchObject({ source: 'idb', result: 'invalid' });
  });
  it('IDB unknown with no LS main stays a normal new game (legacy, no IDB1)', () => {
    expect(loadSafe(kvm(), b, NOW, unknownIdb())).toMatchObject({ recovery: null, file: null });
  });
});

describe('CSR-15 no silent zero: random corruptions of a valid main always recover with a save_corrupt', () => {
  it('300 seeded mutations', () => {
    let x = 12345; const rnd = () => ((x = (Math.imul(x, 1103515245) + 12345) >>> 0) / 4294967296);
    const base = good(14, 9); let invalid = 0;
    for (let i = 0; i < 300; i++) {
      const p = Math.floor(rnd() * base.length); const kind = i % 3;
      const raw = kind === 0 ? base.slice(0, p) : kind === 1 ? base.slice(0, p) + String.fromCharCode(33 + Math.floor(rnd() * 90)) + base.slice(p + 1) : badLevel([null, -1, 'x', '1.5'][i % 4]);
      const k = kvm(); k.setItem(SAVE_KEY, raw); const g = new Game(b, k, () => NOW, 1, 'test', null, null, { idbBoot: 'absent' });
      if (validate(raw, b).ok) { expect(g.recovery).toBeNull(); continue; } invalid++; expect(g.recovery).not.toBeNull();
      expect(ev(g, 'save_corrupt')).toHaveLength(1); expect(['fresh', 'storage', 'restored']).toContain(g.recoveryOutcome);
    }
    expect(invalid).toBeGreaterThan(150);
  });
});
