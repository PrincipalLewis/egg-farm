// M41-7 CSR-8 case 8b (HoQA Major on dfdf49c, qa/m41/m41-7-dfdf49c/csr/browser-b8-14 B-CSR8b-race-loser-during-idb-copy).
// IndexedDB main corrupt, no valid LS main / .bak. Tab A claims and starts the IDB1-5 corrupt-copy transaction; QA's 3 s delay
// is the fake's held commit. Tab B claims while it is in flight; A's tx still commits put corrupt.* + delete main, so B finds
// NO main. B must never boot silently: IDB1 path = M3 notice, save_corrupt {store:'idb'} once, Export of the corrupt bytes.
// The steps mirror src/main.ts boot(): openForBoot -> claim -> owns() -> bootPreserveIdb(.., owns) -> bootOrphanIdb -> new Game.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { IdbMirror, IDB_KEY, IDB_CORRUPT_PREFIX, IDB_RESET_KEY, bootPreserveIdb, bootOrphanIdb } from '../src/save/idb-mirror';
import { Game } from '../src/game';
import { SAVE_KEY, BAK_KEY, RESET_KEYS, UI_KEY, resetProgress, serialize } from '../src/save/save';
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

/** The real Settings > Reset path (app.ts cReset): resetProgress(localStorage) + Game.clearMirror() -> IdbMirror.clear(). */
const reset = async (kv: any, m: IdbMirror) => { resetProgress(kv); await m.clear(); };
describe('CSR-8 8b criterion: no false trigger on old, already surfaced corrupt.* copies (Arch m1: key membership)', () => {
  const good = (F: number) => serialize({ ...initialState(b, 1), farmLevel: F, coinsCents: 1000 + F, tracksV7: 1 as const, v6BackupId: '00112233aabbccdd' } as any, NOW - 60_000, 5);
  const OLD = `${IDB_CORRUPT_PREFIX}${NOW - 86_400_000}`;
  const withCopy = () => { const f = fakeIdb(); f.data.set(OLD, ABC); return f; };
  it('surfaced copy + the fresh farm it led to (a main in LS): normal load, no recovery', async () => {
    const f = withCopy(); const kv = mem({ [SAVE_KEY]: good(7) }); const T = await open(f, kv, NOW); T.lease.claim();
    const g = await finish(T, kv, NOW) as Game; expect(g.recovery).toBeNull(); expect(g.state.farmLevel).toBe(7);
  });
  it('only a .bak: the .bak path (M1), never the IndexedDB copy', async () => {
    const f = withCopy(); const kv = mem({ [BAK_KEY]: good(6) }); const T = await open(f, kv, NOW); T.lease.claim();
    expect(await bootOrphanIdb(T.mirror, { status: 'ok', raw: null }, kv, b)).toBeNull();
    const g = await finish(T, kv, NOW) as Game; expect((g.recovery as CsrRecovery).source).toBe('bak');
  });
  it('D-HOP-07 (b) AC: Settings > Reset after a surfaced copy (main, .bak and IDB main gone, corrupt.* kept): no dialog, silent fresh farm', async () => {
    const f = withCopy(); f.data.set(IDB_KEY, good(7)); const kv = mem({ [SAVE_KEY]: good(7) });
    await reset(kv, new IdbMirror(f.db)); expect(f.data.has(IDB_KEY)).toBe(false); expect(f.data.get(IDB_RESET_KEY)).toEqual([OLD]); expect(f.data.get(OLD)).toBe(ABC);
    const T = await open(f, kv, NOW); T.lease.claim();
    const g = await finish(T, kv, NOW) as Game; expect(g.recovery).toBeNull(); expect(g.isNewGame).toBe(true); expect(ev(g, 'save_corrupt')).toHaveLength(0);
  });
  it('D-HOP-07 (b) AC: after a reset, a post-reset corrupt IndexedDB main still follows the CSR chain (IDB1, M3)', async () => {
    const f = withCopy(); const kv = mem({ [SAVE_KEY]: 'x' }); await reset(kv, new IdbMirror(f.db)); f.data.set(IDB_KEY, ABC + ' ');
    const T = await open(f, kv, NOW); T.lease.claim(); const g = await finish(T, kv, NOW) as Game;
    expect(g.recovery).toMatchObject({ case: 'F', store: 'idb' }); expect(ev(g, 'save_corrupt')[0].store).toBe('idb');
  });
  it('a copy not recorded by any Reset with no main anywhere is unsurfaced: IDB1 path (also with no Reset ever)', async () => {
    const f = withCopy(); const kv = mem(); const T = await open(f, kv, NOW); T.lease.claim(); assertIdb1(await finish(T, kv, NOW) as Game);
  });
  it('HoQA item 5: clock ahead at Reset, then rolled back; a later orphan copy (stamped before the Reset time) still surfaces as M3 + Export', async () => {
    // Reset at F = T+2h (clock ahead); the clock rolls back to T; the race leaves a copy stamped T+1h < F. A time comparison (even
    // with reset_at clamped to now) hides it -> silent new game. Key membership: corrupt.<T+1h> was not recorded at Reset -> IDB1.
    const T0 = NOW, F = T0 + 2 * 3_600_000; const f = fakeIdb(); const m = new IdbMirror(f.db);
    f.data.set(`${IDB_CORRUPT_PREFIX}${F + 5_000}`, 'pre-reset junk, future-stamped'); f.data.set(IDB_KEY, 'farm');
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(F); const kv = mem({ [SAVE_KEY]: 'farm' }); await reset(kv, m); vi.useRealTimers();
    f.data.set(`${IDB_CORRUPT_PREFIX}${T0 + 3_600_000}`, ABC); // clock rolled back: the race's copy, stamped T+1h
    const T = await open(f, kv, T0 + 3_600_000 + 5_000); T.lease.claim();
    const g = await finish(T, kv, T0 + 3_600_000 + 5_000) as Game; expect(g.isNewGame).toBe(true); assertIdb1(g); // never silent
  });
  it('IndexedDB not definite (unknown / absent) or a read fails: no orphan (unchanged paths); clear() with no corrupt.* drops the record', async () => {
    const f = withCopy(); const kv = mem(); const m = new IdbMirror(f.db);
    expect(await bootOrphanIdb(m, { status: 'unknown', raw: null }, kv, b)).toBeNull();
    expect(await bootOrphanIdb(m, { status: 'absent', raw: null }, kv, b)).toBeNull();
    expect(await bootOrphanIdb({ readCorrupt: async () => undefined, readSurfaced: async () => [] }, { status: 'ok', raw: null }, kv, b)).toBeNull();
    expect(await bootOrphanIdb({ readCorrupt: async () => [{ key: OLD, value: ABC }], readSurfaced: async () => undefined }, { status: 'ok', raw: null }, kv, b)).toBeNull();
    expect((await bootOrphanIdb(m, { status: 'ok', raw: null }, kv, b))?.value).toBe(ABC);
    const e = fakeIdb(); e.data.set(IDB_RESET_KEY, ['corrupt.1']); e.data.set(IDB_KEY, 'x'); await new IdbMirror(e.db).clear(); expect(e.data.size).toBe(0);
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

// Architect review engineering/reviews/pr63-reset-at-b986cd3.md: m1 done above (key membership, HoQA item 5); m2, m3 here.
describe('Reset record (Arch m2, m3)', () => {
  it('m2: the Reset record is not a localStorage key and not in RESET_KEYS; it sits outside the corrupt.* range; a second Reset replaces it', async () => {
    expect((RESET_KEYS as readonly string[]).some(k => k.includes('reset'))).toBe(false);
    expect(IDB_RESET_KEY.startsWith(IDB_CORRUPT_PREFIX)).toBe(false); expect(IDB_RESET_KEY).not.toBe(IDB_KEY);
    const f = fakeIdb(); const m = new IdbMirror(f.db); const kv = mem({ [SAVE_KEY]: 'x' });
    f.data.set('corrupt.1', 'a'); await reset(kv, m); expect([...kv.m.keys()]).toEqual([]); expect(f.data.get(IDB_RESET_KEY)).toEqual(['corrupt.1']);
    expect((await m.readCorrupt())!.map(c => c.key)).toEqual(['corrupt.1']); // readCorrupt never returns the record
    f.data.set('corrupt.2', 'b'); await reset(kv, m); expect(f.data.get(IDB_RESET_KEY)).toEqual(['corrupt.1', 'corrupt.2']);
    expect(await m.preserveCorrupt('c', 3)).toBe(true); expect(f.data.get(IDB_RESET_KEY)).toEqual(['corrupt.1', 'corrupt.2']); // the copy cap never evicts it
  });
  it('m3: resetProgress survives a QuotaExceededError: removals done, no throw, UI prefs trim still runs; all writes refused: still no throw', () => {
    const kv = mem({ [SAVE_KEY]: 'x', [BAK_KEY]: 'y', [UI_KEY]: JSON.stringify({ sfx: false, reducedMotion: true, onboardingDone: true }) });
    let thrown = 0; const set = kv.setItem; kv.setItem = (k: string, v: string) => { if (k !== UI_KEY) { thrown++; throw new DOMException('full', 'QuotaExceededError'); } set(k, v); };
    expect(() => resetProgress(kv)).not.toThrow(); expect(thrown).toBe(0); // Reset writes no other key
    expect([kv.getItem(SAVE_KEY), kv.getItem(BAK_KEY)]).toEqual([null, null]);
    expect(JSON.parse(kv.getItem(UI_KEY))).toEqual({ sfx: false, reducedMotion: true }); // trimmed: FTUE flag dropped
    const all = mem({ [SAVE_KEY]: 'x', [UI_KEY]: '{"sfx":true}' }); all.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); };
    expect(() => resetProgress(all)).not.toThrow(); expect(all.getItem(SAVE_KEY)).toBeNull(); expect(all.getItem(UI_KEY)).toBeNull(); // trim failed -> UI key removed
  });
});
