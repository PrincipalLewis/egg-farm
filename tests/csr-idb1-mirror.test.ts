// CSR-AC-IDB1 (spec m41-final sha256 6131c290…33334d, = v0.3.3 IDB1 ACs; IDB1-1..5): IndexedDB corrupt.<ts>[-n] copies in store `save`,
// non-string main = corrupt (wrong_type), dedupe, cap 3 in one transaction, copy failure -> mirror off, copy awaited before new Game.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { IdbMirror, IDB_KEY, IDB_CORRUPT_PREFIX, IDB_CORRUPT_KEEP, idbCorruptOrder, bootPreserveIdb } from '../src/save/idb-mirror';
import { Game } from '../src/game';
import { SAVE_KEY } from '../src/save/save';
import { mem } from './helpers';
const fx = (f: string) => readFileSync(new URL(`./fixtures/csr-idb1/${f}`, import.meta.url), 'utf8');
const NOW = 1_792_400_000_000;
import { fakeIdb, type Fail } from './fake-idb';
const corruptKeys = (d: Map<string, unknown>) => [...d.keys()].filter(k => k.startsWith(IDB_CORRUPT_PREFIX));

describe('IDB1-1 names / key format / cap', () => {
  it('names: store save, main key, prefix corrupt., cap 3', () => { expect([IDB_KEY, IDB_CORRUPT_PREFIX, IDB_CORRUPT_KEEP]).toEqual(['main', 'corrupt.', 3]); });
  it('corrupt.<ts>, collision -> corrupt.<ts>-1', async () => {
    const f = fakeIdb(); const m = new IdbMirror(f.db);
    expect(await m.preserveCorrupt('a', 1000)).toBe(true); expect(await m.preserveCorrupt('b', 1000)).toBe(true);
    expect(corruptKeys(f.data).sort()).toEqual(['corrupt.1000', 'corrupt.1000-1']);
  });
  it('order by parsed (ts, n), not lexical; seed 3 incl. n = 10 -> oldest evicted in the put transaction', async () => {
    expect(['corrupt.5-10', 'corrupt.5-2', 'corrupt.5', 'corrupt.40'].sort(idbCorruptOrder)).toEqual(['corrupt.5', 'corrupt.5-2', 'corrupt.5-10', 'corrupt.40']);
    const f = fakeIdb(); for (const [k, v] of [['corrupt.900-10', 'x10'], ['corrupt.900-2', 'x2'], ['corrupt.950', 'y']]) f.data.set(k, v);
    const m = new IdbMirror(f.db); expect(await m.preserveCorrupt('new', 1000)).toBe(true);
    expect(corruptKeys(f.data).sort()).toEqual(['corrupt.1000', 'corrupt.900-10', 'corrupt.950']);
    const ops = f.log.filter(l => l.includes('corrupt.')); expect(new Set(ops.map(l => l.split(':')[0])).size).toBe(1);
    expect(ops).toContain(`${ops[0].split(':')[0]}:del:corrupt.900-2`);
  });
  it('enumerates by IDBKeyRange.bound("corrupt.", "corrupt.\\uffff") (no index key); keys outside the range are never touched', async () => {
    const g = globalThis as any, had = 'IDBKeyRange' in g, prev = g.IDBKeyRange;
    g.IDBKeyRange = { bound: (lower: string, upper: string) => ({ lower, upper }) };
    try {
      const f = fakeIdb(); f.data.set('other', 'o'); f.data.set('v6_backup', 'v'); const m = new IdbMirror(f.db);
      expect(await m.preserveCorrupt('a', 1000)).toBe(true);
      expect(f.ranges).toEqual([{ lower: 'corrupt.', upper: 'corrupt.\uffff' }]); expect(f.data.get('other')).toBe('o'); expect(f.data.get('v6_backup')).toBe('v');
    } finally { if (had) g.IDBKeyRange = prev; else delete g.IDBKeyRange; }
  });
  it('preserveCorrupt clears main in the same transaction (the stale corrupt main can never outrank the new farm)', async () => {
    const f = fakeIdb(); f.data.set(IDB_KEY, 'bad'); const m = new IdbMirror(f.db); await m.preserveCorrupt('bad', 1000);
    expect(f.data.has(IDB_KEY)).toBe(false); expect(f.data.get('corrupt.1000')).toBe('bad');
  });
});
describe('IDB1-2 non-string main', () => {
  it('readValue / openForBoot return the raw value plus kind', async () => {
    const obj = JSON.parse(fx('IDB1-nonstring-object.value.json'));
    const f = fakeIdb(); f.data.set(IDB_KEY, obj); const o = await IdbMirror.openForBoot(f.factory);
    expect(o).toMatchObject({ status: 'ok', raw: null, kind: 'nonstring' }); expect(o.value).toEqual(obj);
    const f2 = fakeIdb(); const o2 = await IdbMirror.openForBoot(f2.factory); expect(o2).toMatchObject({ kind: 'none', value: null });
    const f3 = fakeIdb(); f3.data.set(IDB_KEY, 's'); expect(await new IdbMirror(f3.db).readValue()).toEqual({ kind: 'string', value: 's' });
  });
  it('stored structured-cloned as is (deep-equal)', async () => {
    const obj = JSON.parse(fx('IDB1-nonstring-object.value.json')); const f = fakeIdb(); f.data.set(IDB_KEY, obj);
    expect(await bootPreserveIdb(new IdbMirror(f.db), { status: 'ok', raw: obj }, b, NOW)).toBe('copied');
    expect(f.data.get(`corrupt.${NOW}`)).toEqual(obj);
  });
});
describe('IDB1-3 copy failure', () => {
  for (const fail of [{ cloneOnPut: true }, { quotaOnPut: true }] as Fail[]) it(`${Object.keys(fail)[0]} -> failed, main untouched`, async () => {
    const raw = fx('IDB1-abc.idb-main.raw'); const f = fakeIdb(fail); f.data.set(IDB_KEY, raw);
    expect(await bootPreserveIdb(new IdbMirror(f.db), { status: 'ok', raw }, b, NOW)).toBe('failed');
    expect(f.data.get(IDB_KEY)).toBe(raw); expect(corruptKeys(f.data)).toEqual([]);
    // main.ts hands Game no mirror after a failed copy: zero puts to main for the session
    const kv = mem(); const g = new Game(b, kv, () => NOW, 1, 'test', null, raw, { idbBoot: 'ok', idbCopy: 'failed' }); g.save(); g.save();
    await new Promise(r => setTimeout(r, 10)); expect(f.data.get(IDB_KEY)).toBe(raw); expect(f.log.filter(l => l.endsWith(`:put:${IDB_KEY}`))).toEqual([]);
  });
});
describe('IDB1-4 dedupe', () => {
  it('same string twice -> one entry; same object twice -> one; cyclic twice -> two; never more than 3', async () => {
    const f = fakeIdb(); const m = new IdbMirror(f.db);
    await m.preserveCorrupt('abc', 1); await m.preserveCorrupt('abc', 2); expect(corruptKeys(f.data)).toHaveLength(1);
    await m.preserveCorrupt({ a: 1 }, 3); await m.preserveCorrupt({ a: 1 }, 4); expect(corruptKeys(f.data)).toHaveLength(2);
    const f2 = fakeIdb(); const m2 = new IdbMirror(f2.db); const cyc: any = { n: 1 }; cyc.self = cyc;
    await m2.preserveCorrupt(cyc, 1); await m2.preserveCorrupt(cyc, 2); expect(corruptKeys(f2.data)).toHaveLength(2);
    for (let i = 3; i < 8; i++) await m2.preserveCorrupt(cyc, i); expect(corruptKeys(f2.data)).toHaveLength(3);
  });
  it('bootPreserveIdb: valid / absent IDB -> none, no write; repeated IDB1-abc boots -> one copy', async () => {
    const f = fakeIdb(); const m = new IdbMirror(f.db);
    expect(await bootPreserveIdb(m, { status: 'ok', raw: null }, b, NOW)).toBe('none');
    expect(await bootPreserveIdb(m, { status: 'unknown', raw: '{"bad' }, b, NOW)).toBe('none');
    expect(await bootPreserveIdb(null, { status: 'ok', raw: '{"bad' }, b, NOW)).toBe('none');
    expect(f.log).toEqual([]);
    const raw = fx('IDB1-abc.idb-main.raw');
    for (let i = 0; i < 2; i++) { f.data.set(IDB_KEY, raw); await bootPreserveIdb(m, { status: 'ok', raw }, b, NOW + i); }
    expect(corruptKeys(f.data)).toHaveLength(1);
  });
});
describe('IDB1-5 ordering: the copy completes before the first main put of the new farm', () => {
  for (const [name, val] of [['IDB1-truncated', fx('IDB1-truncated.idb-main.raw')], ['IDB1-wrongtype-version-string', fx('IDB1-wrongtype-version-string.idb-main.raw')],
    ['IDB1-nonstring-object', JSON.parse(fx('IDB1-nonstring-object.value.json'))], ['IDB1-abc', fx('IDB1-abc.idb-main.raw')]] as [string, unknown][]) it(name, async () => {
    const f = fakeIdb(); f.data.set(IDB_KEY, val); const m = new IdbMirror(f.db);
    const copy = await bootPreserveIdb(m, { status: 'ok', raw: val }, b, NOW); expect(copy).toBe('copied');
    const kv = mem(); const g = new Game(b, kv, () => NOW, 1, 'test', m, val, { idbBoot: 'ok', idbCopy: copy });
    expect(g.recoveryOutcome).toBe('fresh');
    await new Promise(r => setTimeout(r, 20));
    const iCopy = f.log.findIndex(l => l.includes(':put:corrupt.')), iMain = f.log.findIndex(l => l.endsWith(`:put:${IDB_KEY}`));
    expect(iCopy).toBeGreaterThanOrEqual(0); expect(iMain).toBeGreaterThan(iCopy);
    expect(f.data.get(`corrupt.${NOW}`)).toEqual(val); expect(f.data.get(IDB_KEY)).toBe(kv.getItem(SAVE_KEY)); expect(corruptKeys(f.data)).toHaveLength(1); // IDB1-1: main + exactly one corrupt.<ts>
  });
});
