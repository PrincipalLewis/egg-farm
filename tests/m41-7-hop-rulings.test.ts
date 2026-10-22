// M41-7 rework (PR #63 @ 9cce82d), HoP D-HOP-2026-10-22-01 (a)-(d). Spec of record corrupt-save-recovery-spec.m41-final.md
// sha256 6131c290bf0a6878026ad6c53a9ed71754f00fdf9b2e9c09ee8afc242433334d (CSR-1, CSR-2 tier A, CSR-AC-IDB1).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { IdbMirror, IDB_KEY, IDB_CORRUPT_PREFIX, bootPreserveIdb } from '../src/save/idb-mirror';
import { Game } from '../src/game';
import { SAVE_KEY, BAK_KEY, serialize, loadSafe, rankCompare } from '../src/save/save';
import { initialState } from '../src/sim/state';
import { mem } from './helpers';
import { fakeIdb, type Fail } from './fake-idb';

const fx = (f: string) => readFileSync(new URL(`./fixtures/csr-idb1/${f}`, import.meta.url), 'utf8');
const NOW = 1_792_400_000_000;
const ID = '00112233aabbccdd';
const good = (F: number, seq = 5, at = NOW - 60_000) => serialize({ ...initialState(b, 1), farmLevel: F, coinsCents: 1000 + F, tracksV7: 1 as const, v6BackupId: ID } as any, at, seq);
const corruptKeys = (d: Map<string, unknown>) => [...d.keys()].filter(k => k.startsWith(IDB_CORRUPT_PREFIX));
const ev = (g: Game, t: string) => g.telemetry.events().filter((e: any) => e.type === t) as any[];
const tick = (ms = 20) => new Promise(r => setTimeout(r, ms));
const tx = (l: string) => l.split(':')[0];
const ABC = fx('IDB1-abc.idb-main.raw');
/** One autosave, one purchase and one pagehide save (CSR-13a / ruling (c) AC). */
const playAndSave = (g: Game) => { g.save(); g.state = { ...g.state, coinsCents: 10_000_000 }; g.dispatch({ type: 'buyCollection' } as any); g.endSession(); };

describe('(a) save/main is deleted only in the same transaction as a successful corrupt.* put', () => {
  it('copy: put corrupt.* and delete main commit in ONE transaction', async () => {
    const f = fakeIdb(); f.data.set(IDB_KEY, ABC); expect(await new IdbMirror(f.db).preserveCorrupt(ABC, NOW)).toBe(true);
    const put = f.log.find(l => l.includes(':put:corrupt.'))!, del = f.log.find(l => l.endsWith(`:del:${IDB_KEY}`))!;
    expect(put).toBeDefined(); expect(del).toBeDefined(); expect(tx(del)).toBe(tx(put));
  });
  it('already kept (dedupe): main is still only deleted alongside a corrupt.* put in that transaction, no new entry', async () => {
    const f = fakeIdb(); f.data.set(`${IDB_CORRUPT_PREFIX}${NOW - 5}`, ABC); f.data.set(IDB_KEY, ABC);
    expect(await new IdbMirror(f.db).preserveCorrupt(ABC, NOW)).toBe(true);
    const del = f.log.find(l => l.endsWith(`:del:${IDB_KEY}`))!; expect(del).toBeDefined();
    expect(f.log.some(l => tx(l) === tx(del) && l.includes(':put:corrupt.'))).toBe(true);
    expect(corruptKeys(f.data)).toEqual([`${IDB_CORRUPT_PREFIX}${NOW - 5}`]); expect(f.data.get(`${IDB_CORRUPT_PREFIX}${NOW - 5}`)).toBe(ABC);
  });
  for (const fail of [{ cloneOnPut: true }, { quotaOnPut: true }, { abortOnCommit: true }] as Fail[]) {
    const name = Object.keys(fail)[0];
    it(`${name}: nothing deleted, save/main byte-identical, no corrupt.*, 'failed'`, async () => {
      const f = fakeIdb(fail); f.data.set(IDB_KEY, ABC);
      expect(await bootPreserveIdb(new IdbMirror(f.db), { status: 'ok', raw: ABC }, b, NOW)).toBe('failed');
      expect(f.data.get(IDB_KEY)).toBe(ABC); expect(corruptKeys(f.data)).toEqual([]); expect(f.log.filter(l => l.includes(':del:'))).toEqual([]);
    });
    it(`${name} on a dedupe boot: nothing deleted, main byte-identical`, async () => {
      const f = fakeIdb(fail); const k = `${IDB_CORRUPT_PREFIX}${NOW - 5}`; f.data.set(k, ABC); f.data.set(IDB_KEY, ABC);
      expect(await new IdbMirror(f.db).preserveCorrupt(ABC, NOW)).toBe(false);
      expect(f.data.get(IDB_KEY)).toBe(ABC); expect([...f.data.keys()].sort()).toEqual([k, IDB_KEY].sort());
    });
  }
  it('copy failure: main.ts hands Game no mirror (for the session), also when the LS main is valid', () => {
    const src = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
    expect(src).toMatch(/bootPreserveIdb\(mirror, idbIn, balance, Date\.now\(\)\)/);
    expect(src).toMatch(/idbCopy === 'failed' \? null : mirror/);
  });
  it('IDB1-1 after the new farm\'s first commit: main (= the new farm) plus exactly one corrupt.*', async () => {
    const f = fakeIdb(); f.data.set(IDB_KEY, ABC); const m = new IdbMirror(f.db);
    const copy = await bootPreserveIdb(m, { status: 'ok', raw: ABC }, b, NOW); expect(copy).toBe('copied');
    const kv = mem(); const g = new Game(b, kv, () => NOW, 1, 'test', m, ABC, { idbBoot: 'ok', idbCopy: copy }); await tick();
    expect(f.log.some(l => l.endsWith(`:put:${IDB_KEY}`))).toBe(true); // the first commit landed
    expect([...f.data.keys()].sort()).toEqual([`${IDB_CORRUPT_PREFIX}${NOW}`, IDB_KEY].sort());
    expect(f.data.get(IDB_KEY)).toBe(kv.getItem(SAVE_KEY)); expect(f.data.get(`${IDB_CORRUPT_PREFIX}${NOW}`)).toBe(ABC); void g;
  });
});

describe('(b) valid LS main: only an INVALID IDB main is copied; silent; deduped and capped', () => {
  it('invalid IDB main -> copied, no save_corrupt, no dialog, no recovery', async () => {
    const f = fakeIdb(); f.data.set(IDB_KEY, ABC); const m = new IdbMirror(f.db); const kv = mem(); kv.setItem(SAVE_KEY, good(7));
    const copy = await bootPreserveIdb(m, { status: 'ok', raw: ABC }, b, NOW); expect(copy).toBe('copied');
    const g = new Game(b, kv, () => NOW, 1, 'test', m, ABC, { idbBoot: 'ok', idbCopy: copy });
    expect(g.recovery).toBeNull(); expect(g.recoveryOutcome).toBeNull(); expect(ev(g, 'save_corrupt')).toEqual([]); expect(ev(g, 'save_restore')).toEqual([]);
    expect(g.state.farmLevel).toBe(7); expect(corruptKeys(f.data)).toEqual([`${IDB_CORRUPT_PREFIX}${NOW}`]);
  });
  it('valid IDB main is never copied (older or newer-ranked): none, zero corrupt.* puts', async () => {
    for (const idb of [good(3, 2), good(9, 99)]) {
      const f = fakeIdb(); f.data.set(IDB_KEY, idb);
      expect(await bootPreserveIdb(new IdbMirror(f.db), { status: 'ok', raw: idb }, b, NOW)).toBe('none');
      expect(f.log).toEqual([]); expect(f.data.get(IDB_KEY)).toBe(idb);
    }
  });
  it('deduped across boots and counted toward the cap of 3', async () => {
    const f = fakeIdb(); const m = new IdbMirror(f.db);
    for (let i = 0; i < 3; i++) { f.data.set(IDB_KEY, ABC); await bootPreserveIdb(m, { status: 'ok', raw: ABC }, b, NOW + i); }
    expect(corruptKeys(f.data)).toHaveLength(1);
    for (const [i, v] of ['{"a', '{"b', '{"c'].entries()) { f.data.set(IDB_KEY, v); expect(await bootPreserveIdb(m, { status: 'ok', raw: v }, b, NOW + 10 + i)).toBe('copied'); }
    expect(corruptKeys(f.data)).toHaveLength(3); expect([...f.data.values()]).not.toContain(ABC); // oldest (IDB1-abc copy) evicted
  });
});

describe('(c) no LS main, no .bak, IndexedDB unknown: fresh farm (CSR-1), no dialog, mirror null', () => {
  it('loadSafe: no recovery, mirrorOff', () => {
    const r = loadSafe(mem(), b, NOW, { status: 'unknown', raw: null, reason: 'idb_timeout' });
    expect(r.file).toBeNull(); expect(r.recovery).toBeNull(); expect(r.outcome).toBeNull(); expect(r.mirrorOff).toBe(true);
  });
  it('AC: zero IDB puts after an autosave, a purchase and a pagehide save', async () => {
    const f = fakeIdb(); const m = new IdbMirror(f.db); const kv = mem();
    const g = new Game(b, kv, () => NOW, 1, 'test', m, null, { idbBoot: 'unknown', idbAbsentReason: 'idb_timeout' });
    expect(g.isNewGame).toBe(true); expect(g.recoveryOutcome).toBeNull(); expect(ev(g, 'save_corrupt')).toEqual([]);
    playAndSave(g); await tick();
    expect(g.state.collectionLevel).toBeGreaterThan(0); expect(kv.getItem(SAVE_KEY)).not.toBeNull();
    expect(f.log.filter(l => l.includes(':put:'))).toEqual([]);
  });
});

describe('(d) no LS main, valid .bak and valid IDB: CSR-2 tier A (rankCompare, tie -> .bak), silent', () => {
  const run = (bak: string, idb: string) => {
    const kv = mem(); kv.setItem(BAK_KEY, bak);
    const g = new Game(b, kv, () => NOW, 1, 'test', null, idb, { idbBoot: 'ok' }); return { g, kv };
  };
  it('IDB newer -> IDB, save_restore {source:idb} once, silent', () => {
    const bak = good(4, 5), idb = good(9, 9); expect(rankCompare(idb, bak, NOW)).toBeGreaterThan(0);
    const { g } = run(bak, idb);
    expect(g.state.farmLevel).toBe(9); expect(g.recovery).toBeNull(); expect(ev(g, 'save_corrupt')).toEqual([]);
    expect(ev(g, 'save_restore')).toEqual([expect.objectContaining({ source: 'idb' })]);
  });
  it('.bak newer -> .bak, no save_restore, silent', () => {
    const bak = good(4, 9), idb = good(9, 5); expect(rankCompare(idb, bak, NOW)).toBeLessThan(0);
    const { g } = run(bak, idb);
    expect(g.state.farmLevel).toBe(4); expect(g.recovery).toBeNull(); expect(ev(g, 'save_corrupt')).toEqual([]); expect(ev(g, 'save_restore')).toEqual([]);
  });
  it('tie -> .bak, no save_restore, silent', () => {
    const bak = good(4, 5, NOW - 60_000), idb = good(9, 5, NOW - 60_000); expect(rankCompare(idb, bak, NOW)).toBe(0);
    const { g } = run(bak, idb);
    expect(g.state.farmLevel).toBe(4); expect(g.recovery).toBeNull(); expect(ev(g, 'save_restore')).toEqual([]);
  });
  it('savedAt breaks a (version, committed, saveSeq) tie: newer savedAt IDB wins', () => {
    const bak = good(4, 5, NOW - 120_000), idb = good(9, 5, NOW - 60_000); expect(rankCompare(idb, bak, NOW)).toBeGreaterThan(0);
    expect(run(bak, idb).g.state.farmLevel).toBe(9);
  });
});
