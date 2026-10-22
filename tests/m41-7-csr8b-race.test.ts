// M41-7 CSR-8 case 8b (HoQA Major on dfdf49c, qa/m41/m41-7-dfdf49c/csr/browser-b8-14 B-CSR8b-race-loser-during-idb-copy).
// IndexedDB main corrupt, no valid LS main / .bak. Tab A claims and starts the IDB1-5 corrupt-copy transaction; QA's 3 s delay
// is the fake's held commit. Tab B claims while it is in flight; A's tx still commits put corrupt.* + delete main, so B finds
// NO main. B must never boot silently: IDB1 path = M3 notice, save_corrupt {store:'idb'} once, Export of the corrupt bytes.
// The steps mirror src/main.ts boot(): openForBoot -> claim -> owns() -> bootPreserveIdb(.., owns) -> bootOrphanIdb -> new Game.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { IdbMirror, IDB_KEY, IDB_CORRUPT_PREFIX, bootPreserveIdb, bootOrphanIdb } from '../src/save/idb-mirror';
import { Game } from '../src/game';
import { SAVE_KEY, BAK_KEY, RESET_AT_KEY, resetProgress, serialize } from '../src/save/save';
import { TabLease } from '../src/save/tab-lease';
import { recoveryNotice, exportBytes, type CsrRecovery } from '../src/ui/save-recovery';
import { initialState } from '../src/sim/state';
import { fakeIdb } from './fake-idb';

const ABC = readFileSync(new URL('./fixtures/csr-idb1/IDB1-abc.idb-main.raw', import.meta.url), 'utf8');
const NOW = 1_792_400_000_000;
const mem = (init: Record<string, string> = {}) => { const m = new Map(Object.entries(init)); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } as any; };
const tick = (ms = 20) => new Promise(r => setTimeout(r, ms));
const corruptKeys = (d: Map<string, unknown>) => [...d.keys()].filter(k => k.startsWith(IDB_CORRUPT_PREFIX));
const ev = (g: Game, t: string) => g.telemetry.events().filter((e: any) => e.type === t) as any[];
type Tab = { lease: TabLease; mirror: IdbMirror; boot: Awaited<ReturnType<typeof IdbMirror.openForBoot>> };
async function open(f: ReturnType<typeof fakeIdb>, kv: any, t: number): Promise<Tab> {
  const boot = await IdbMirror.openForBoot(f.factory); return { boot, mirror: boot.mirror!, lease: new TabLease(kv, null, () => {}, () => t) };
}
/** main.ts after the claim: returns 'other-tab' or the Game. */
async function finish(tab: Tab, kv: any, t: number, copyP?: Promise<'none' | 'copied' | 'failed'>) {
  if (!tab.lease.owns()) return 'other-tab' as const;
  const idbIn = { status: tab.boot.status, raw: tab.boot.value, reason: tab.boot.reason }; let idbValue = tab.boot.value;
  let idbCopy = await (copyP ?? bootPreserveIdb(tab.mirror, idbIn, b, t, () => tab.lease.owns()));
  const orphan = idbCopy === 'none' ? await bootOrphanIdb(tab.mirror, idbIn, kv, b) : null;
  if (orphan) { idbValue = orphan.value; idbCopy = 'copied'; }
  if (idbCopy !== 'none' && !tab.lease.owns()) return 'other-tab' as const;
  return new Game(b, kv, () => t, 1, 'test', idbCopy === 'failed' ? null : tab.mirror, idbValue, { idbBoot: tab.boot.status, idbAbsentReason: tab.boot.reason, idbCopy });
}
const assertIdb1 = (g: Game) => {
  const r = g.recovery as CsrRecovery; expect(g.isNewGame).toBe(true);
  expect(r).toMatchObject({ case: 'F', store: 'idb', source: 'none', copy_failed: false });
  expect(r.tried!.map(x => x.source)).toEqual(['bak', 'idb', 'v6_backup']); // -03 order unchanged
  const n = recoveryNotice(r, { storageBlocked: false, now: NOW }); expect(n?.id).toBe('M3');
  expect(ev(g, 'save_corrupt')).toHaveLength(1); expect(ev(g, 'save_corrupt')[0].store).toBe('idb');
  const exp = exportBytes(n, r, true); expect(exp).not.toBeNull(); expect(exp!()).toBe(ABC); // Export = the corrupt IDB bytes
};

describe('CSR-8 8b: B takes the lease while A\'s IDB corrupt-copy transaction is in flight', () => {
  it('A\'s tx commits put + delete after B claimed: B gets M3, save_corrupt {store:idb} once and Export; A shows the other-tab notice', async () => {
    const f = fakeIdb({ holdFirstReadwrite: true }); f.data.set(IDB_KEY, ABC); const kv = mem();
    const A = await open(f, kv, NOW); expect(A.boot.value).toBe(ABC); A.lease.claim();
    const aCopy = bootPreserveIdb(A.mirror, { status: 'ok', raw: A.boot.value }, b, NOW, () => A.lease.owns());
    await tick(); // A's owns() check passed and the put + delete are queued; the commit is held (QA's 3 s delay)
    const Bp = open(f, kv, NOW + 1000); await tick(); // B's boot read is queued behind A's tx (same store)
    f.release(); const B = await Bp; // QA timing: B's read lands after the commit
    expect(B.boot.status).toBe('ok'); expect(B.boot.kind).toBe('none'); // B sees NO main
    B.lease.claim();
    expect(await aCopy).toBe('copied'); expect(f.data.has(IDB_KEY)).toBe(false); expect(corruptKeys(f.data)).toHaveLength(1);
    expect(await finish(A, kv, NOW, Promise.resolve('copied'))).toBe('other-tab');
    const g = await finish(B, kv, NOW + 1000); expect(g).toBeInstanceOf(Game); assertIdb1(g as Game);
    expect(corruptKeys(f.data)).toHaveLength(1); // B moved/copied nothing (the copy stays in its own store, IDB only)
    expect([...kv.m.keys()].some((k: string) => k.startsWith('eggfarm.save.corrupt'))).toBe(false); // never copied into localStorage
  });
  it('B claims before A queues the put: A aborts in-tx (owns() false; no put, no delete), B copies main itself -> same M3 outcome', async () => {
    const f = fakeIdb(); f.data.set(IDB_KEY, ABC); const kv = mem();
    const A = await open(f, kv, NOW); A.lease.claim();
    const B = await open(f, kv, NOW + 1000); B.lease.claim(); // A's lease lost before its tx's synchronous check
    expect(await bootPreserveIdb(A.mirror, { status: 'ok', raw: A.boot.value }, b, NOW, () => A.lease.owns())).toBe('failed');
    expect(f.data.get(IDB_KEY)).toBe(ABC); expect(corruptKeys(f.data)).toHaveLength(0); expect(f.log).toEqual([]);
    const g = await finish(B, kv, NOW + 1000); expect(g).toBeInstanceOf(Game); assertIdb1(g as Game);
    expect(f.data.has(IDB_KEY)).toBe(false); expect(corruptKeys(f.data)).toHaveLength(1);
  });
  it('whatever the timing: B\'s read lands before A\'s tx (sees the corrupt main) -> B dedupes A\'s copy, M3, one corrupt.* entry', async () => {
    const f = fakeIdb(); f.data.set(IDB_KEY, ABC); const kv = mem();
    const A = await open(f, kv, NOW); const B = await open(f, kv, NOW + 1000); A.lease.claim();
    expect(await bootPreserveIdb(A.mirror, { status: 'ok', raw: A.boot.value }, b, NOW, () => A.lease.owns())).toBe('copied');
    B.lease.claim(); expect(await finish(A, kv, NOW, Promise.resolve('copied'))).toBe('other-tab');
    const g = await finish(B, kv, NOW + 1000); assertIdb1(g as Game); expect(corruptKeys(f.data)).toHaveLength(1);
  });
});

describe('CSR-8 8b criterion: no false trigger on old, already surfaced corrupt.* copies', () => {
  const good = (F: number) => serialize({ ...initialState(b, 1), farmLevel: F, coinsCents: 1000 + F, tracksV7: 1 as const, v6BackupId: '00112233aabbccdd' } as any, NOW - 60_000, 5);
  const withCopy = () => { const f = fakeIdb(); f.data.set(`${IDB_CORRUPT_PREFIX}${NOW - 86_400_000}`, ABC); return f; };
  it('surfaced copy + the fresh farm it led to (a main in LS): normal load, no recovery', async () => {
    const f = withCopy(); const kv = mem({ [SAVE_KEY]: good(7) }); const T = await open(f, kv, NOW); T.lease.claim();
    const g = await finish(T, kv, NOW) as Game; expect(g.recovery).toBeNull(); expect(g.state.farmLevel).toBe(7);
  });
  it('only a .bak: the .bak path (M1), never the IndexedDB copy', async () => {
    const f = withCopy(); const kv = mem({ [BAK_KEY]: good(6) }); const T = await open(f, kv, NOW); T.lease.claim();
    expect(await bootOrphanIdb(T.mirror, { status: 'ok', raw: null }, kv, b)).toBeNull();
    const g = await finish(T, kv, NOW) as Game; expect((g.recovery as CsrRecovery).source).toBe('bak');
  });
  it('Settings > Reset after a surfaced copy (main, .bak and IDB main gone, corrupt.* kept): silent fresh farm', async () => {
    const f = withCopy(); const kv = mem({ [SAVE_KEY]: good(7) }); resetProgress(kv, NOW - 1000); expect(kv.getItem(RESET_AT_KEY)).toBe(String(NOW - 1000));
    const T = await open(f, kv, NOW); T.lease.claim();
    const g = await finish(T, kv, NOW) as Game; expect(g.recovery).toBeNull(); expect(g.isNewGame).toBe(true); expect(ev(g, 'save_corrupt')).toHaveLength(0);
  });
  it('a copy made AFTER the last Reset with no main anywhere is unsurfaced: IDB1 path', async () => {
    const f = withCopy(); const kv = mem(); kv.setItem(RESET_AT_KEY, String(NOW - 2 * 86_400_000));
    const T = await open(f, kv, NOW); T.lease.claim(); assertIdb1(await finish(T, kv, NOW) as Game);
  });
  it('IndexedDB not definite (unknown / absent) or the corrupt.* read fails: no orphan (unchanged paths)', async () => {
    const f = withCopy(); const kv = mem(); const m = new IdbMirror(f.db);
    expect(await bootOrphanIdb(m, { status: 'unknown', raw: null }, kv, b)).toBeNull();
    expect(await bootOrphanIdb(m, { status: 'absent', raw: null }, kv, b)).toBeNull();
    expect(await bootOrphanIdb({ readCorrupt: async () => undefined }, { status: 'ok', raw: null }, kv, b)).toBeNull();
    expect((await bootOrphanIdb(m, { status: 'ok', raw: null }, kv, b))?.value).toBe(ABC);
  });
});

describe('CSR-8 8b wiring in src/main.ts (the boot sequence the tests above mirror)', () => {
  it('owns() is passed into the copy tx; the orphan read runs only when nothing was copied and feeds Game as the IndexedDB value', () => {
    const src = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
    expect(src).toMatch(/bootPreserveIdb\(mirror, idbIn, balance, Date\.now\(\), \(\) => lease\.owns\(\)\)/);
    expect(src).toMatch(/idbCopy === 'none' \? await bootOrphanIdb\(mirror, idbIn, localStorage, balance\) : null/);
    expect(src).toMatch(/if \(orphan\) \{ idbValue = orphan\.value; idbCopy = 'copied'; \}\s*\n\s*if \(idbCopy !== 'none'\) \{\s*\n\s*if \(!lease\.owns\(\)\) \{ otherTabModal\(\); return; \}/);
  });
});
