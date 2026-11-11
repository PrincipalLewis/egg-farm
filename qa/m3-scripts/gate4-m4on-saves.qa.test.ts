// GATE 4 (QA, not committed): the 5 M4-on save risks (status.md 14:55 Oct 17) + mid-game v6 -> M4-on migration.
// Copy into <worktree>/tests/ and run: npx vitest run --maxWorkers=2 --minWorkers=1 tests/gate4-m4on-saves.qa.test.ts
// Tests the INVARIANT each original test protects, restated for an M4-on build (live balance must have m4.enabled=1).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { SAVE_KEY, BAK_KEY, V6_BACKUP_KEY, encodeBackup, serialize, saveSeqOf, load } from '../src/save/save';
import { IdbMirror, reconcile } from '../src/save/idb-mirror';
import { m4On } from '../src/config/formulas';
import { initialState } from '../src/sim/state';
const FX = '/workspace/egg-farm-studio/qa/m3-recheck/gate4-fixtures/M1-midgame-L18-dd52bfd.json';
const mem = (init: Record<string, string> = {}) => { const m = new Map(Object.entries(init)); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } as any; };
const v6 = (patch = {}) => { const { hensLevel, eggValueLevel, celebratedMilestones, ...s } = { ...initialState(b, 1), farmLevel: 12, coinsCents: 1e9, ...patch } as any; void hensLevel; void eggValueLevel; void celebratedMilestones; return s; };
const T0 = Date.UTC(2026, 9, 18, 21);
const later = (f: () => void) => setTimeout(f, 0); const flush = () => new Promise(r => setTimeout(r, 10));
function fakeIdb() {
  const data = new Map<string, unknown>(); const stores = new Set<string>();
  const db: any = { objectStoreNames: { contains: (n: string) => stores.has(n) }, createObjectStore: (n: string) => { stores.add(n); },
    transaction() { const t: any = {}; t.objectStore = () => ({
      get: (k: string) => { const r: any = {}; later(() => { r.result = data.get(k); r.onsuccess?.(); t.oncomplete?.(); }); return r; },
      put: (v: unknown, k: string) => { later(() => { data.set(k, v); t.oncomplete?.(); }); return {}; },
      delete: (k: string) => { later(() => { data.delete(k); t.oncomplete?.(); }); return {}; } }); return t; } };
  return { data, factory: { open: () => { const r: any = {}; later(() => { r.result = db; r.onupgradeneeded?.(); r.onsuccess?.(); }); return r; } } as any };
}
it('precondition: live balance is M4 ON', () => expect(m4On(b)).toBe(true));

describe('R1 hidden save + N2 quota retry (own aborted v6 record) under M4 on', () => {
  it('R1a unmigrated v6 farm, aborted migration, hidden, quota: retry removes ONLY own record and writes the hide snapshot', () => {
    const kv = mem({ [SAVE_KEY]: serialize(v6({ coinsCents: 12_345 }), T0 - 120_000) }); let t = T0;
    const w: string[] = []; const g = new Game(b, kv, () => t, 7, 'qa', { write: (r: string) => w.push(r) } as any);
    expect(g.tracksMigrationPending).toBe(true);
    const ID = 'a1b2c3d4e5f60718'; (g as any).abortedMigrationId = ID; (g as any).tracksPending = null; kv.setItem(V6_BACKUP_KEY, encodeBackup({ migrationId: ID, raw: 'old' }));
    t = T0 + 5_000; g.onHidden(t); g.state = { ...g.state, coinsCents: 99_999 }; t += 30_000;
    const set = kv.setItem; let throws = 0; kv.setItem = (k: string, v: string) => { if (k === SAVE_KEY && kv.m.has(V6_BACKUP_KEY)) { throws++; throw new DOMException('full', 'QuotaExceededError'); } set(k, v); };
    g.save();
    expect(throws).toBe(1); expect(kv.getItem(V6_BACKUP_KEY)).toBeNull();
    const p = JSON.parse(kv.getItem(SAVE_KEY)); expect(p.savedAt).toBe(T0 + 5_000); expect(p.state.coinsCents).toBe(12_345); expect(g.storageFailed).toBe(false);
  });
  it('R1b committed M4 farm (tracksV7) + stray record with a DIFFERENT id: never removed; LS fails visibly, mirror gets the hide snapshot (no silent loss)', () => {
    const kv = mem(); let t = T0; const w: string[] = []; const g = new Game(b, kv, () => t, 7, 'qa', { write: (r: string) => w.push(r) } as any);
    expect((g.state as any).tracksV7).toBe(1); g.state = { ...g.state, coinsCents: 12_345 }; g.save();
    kv.setItem(V6_BACKUP_KEY, encodeBackup({ migrationId: 'ffffffffffffffff', raw: 'x' })); (g as any).abortedMigrationId = 'ffffffffffffffff';
    t += 5_000; g.onHidden(t); g.state = { ...g.state, coinsCents: 99_999 }; t += 30_000; w.length = 0;
    const set = kv.setItem; kv.setItem = (k: string, v: string) => { if (k === SAVE_KEY) throw new DOMException('full', 'QuotaExceededError'); set(k, v); };
    g.save();
    expect(kv.getItem(V6_BACKUP_KEY)).not.toBeNull(); expect(g.storageFailed).toBe(true);
    expect(w).toHaveLength(1); const p = JSON.parse(w[0]); expect(p.state.coinsCents).toBe(12_345); expect(p.state.tracksV7).toBe(1);
  });
});

describe('R2 IndexedDB mirror writes under M4 on', () => {
  it('R2a fresh M4 farm: load-time save + purchase save are mirrored byte-exact', () => {
    const w: string[] = []; const kv = mem(); let t = T0; const g = new Game(b, kv, () => t, 1, 'qa', { write: (r: string) => w.push(r), clear: async () => {} } as any);
    expect(w).toHaveLength(1); expect(w[0]).toBe(kv.getItem(SAVE_KEY));
    g.state = { ...g.state, coinsCents: 1e9 }; t += 1000; g.dispatch({ type: 'buyFarm' } as any);
    expect(g.state.farmLevel).toBe(1); expect(w.at(-1)).toBe(kv.getItem(SAVE_KEY));
  });
  it('R2b unmigrated v6 farm: mirror paused while pending (M4-24 by design), resumes after commit; purchase lost from LS is recovered from IDB', async () => {
    const f = fakeIdb(); const m = (await IdbMirror.open(f.factory))!; const kv = mem({ [SAVE_KEY]: serialize(v6(), T0 - 1000) });
    let t = T0; const g = new Game(b, kv, () => t, 1, 'qa', m, null, { idbBoot: 'ok' } as any); await flush();
    expect(g.tracksMigrationPending).toBe(true); expect(f.data.get('main')).toBeUndefined();
    expect(await g.startTracksMigration()).toBe('committed'); t += 1000; g.save(); await flush();
    expect(typeof f.data.get('main')).toBe('string');
    const before = kv.getItem(SAVE_KEY)!; const F = g.state.farmLevel; t += 1000; g.dispatch({ type: 'buyFarm' } as any); await flush();
    expect(g.state.farmLevel).toBe(F + 1);
    kv.setItem(SAVE_KEY, before); reconcile(kv, await m.read(), b, t + 1000);
    const g2 = new Game(b, kv, () => t + 2000); expect(g2.state.farmLevel).toBe(F + 1); expect((g2.state as any).tracksV7).toBe(1);
  });
});

describe('R3 save-majors BUG-2 (newer copy only in IndexedDB) under M4 on', () => {
  it('R3 committed M4 farm: mirror write sees newer v7 in IDB, never puts, Game stops (read-only, no LS writes)', async () => {
    const f = fakeIdb(); const m = (await IdbMirror.open(f.factory))!; const kv = mem(); let t = T0;
    const g = new Game(b, kv, () => t, 1, 'qa', m, null); await flush();
    expect(typeof f.data.get('main')).toBe('string');
    const v7 = JSON.stringify({ version: 7, savedAt: T0, state: {} }); const seen: number[] = []; g.onNewerSave = (v: number) => seen.push(v);
    f.data.set('main', v7); t += 1000; g.save(); await flush();
    expect(f.data.get('main')).toBe(v7); expect(seen).toEqual([7]); expect(g.readOnly).toBe(true);
    const lsBefore = kv.getItem(SAVE_KEY); g.save(); expect(kv.getItem(SAVE_KEY)).toBe(lsBefore);
  });
});

describe('R4 AC8 round-trip under M4 on', () => {
  it('R4 v6 core fields round-trip; extra fields are migration metadata only; written bytes pre-commit = v6 keys only, post-commit add M4 fields', async () => {
    const s = v6({ coinsCents: 4250, coop: 17.3, basket: 9, collectionLevel: 2, farmLevel: 4 }); const raw = serialize(s, T0 - 1000);
    const f = load(mem({ [SAVE_KEY]: raw }), b)!;
    expect(f.tracksMigrated).toBe(true); for (const k of Object.keys(s)) expect((f.v6State as any)[k], "v6State " + k).toEqual((s as any)[k]); // v6State is normalised in memory (H/V 0 defaults); only v6Keys are ever written while pending
    for (const k of ['coinsCents', 'coop', 'basket', 'collectionLevel', 'farmLevel']) expect((f.state as any)[k]).toBe((s as any)[k]);
    expect((f.state as any).hensLevel).toBe(4); expect((f.state as any).tracksV7).toBe(1);
    const kv = mem({ [SAVE_KEY]: raw }); let t = T0; const g = new Game(b, kv, () => t, 1, 'qa');
    const pre = JSON.parse(kv.getItem(SAVE_KEY)).state; expect(Object.keys(pre).sort()).toEqual(Object.keys(s).sort());
    expect(await g.startTracksMigration()).toBe('committed'); t += 1000; g.save();
    const post = JSON.parse(kv.getItem(SAVE_KEY)).state; for (const k of ['hensLevel', 'eggValueLevel', 'tracksV7', 'v6BackupId', 'celebratedMilestones']) expect(post).toHaveProperty(k);
    expect(post.coinsCents).toBe(4250); expect(post.farmLevel).toBe(4);
  });
});

describe('R5 saveSeq carry under M4 on', () => {
  it('R5 every M4-on save carries saveSeq +1, across reload; the IDB copy with higher seq wins over a stale LS copy', async () => {
    const f = fakeIdb(); const m = (await IdbMirror.open(f.factory))!; const kv = mem(); let t = T0;
    const g = new Game(b, kv, () => t, 1, 'qa', m, null); await flush(); const s1 = saveSeqOf(kv.getItem(SAVE_KEY)); expect(s1).toBeGreaterThan(0);
    t += 1000; g.save(); expect(saveSeqOf(kv.getItem(SAVE_KEY))).toBe(s1 + 1);
    const stale = kv.getItem(SAVE_KEY); g.state = { ...g.state, coinsCents: 777 }; t += 1000; g.save(); await flush();
    expect(saveSeqOf(f.data.get('main'))).toBe(s1 + 2);
    kv.setItem(SAVE_KEY, stale); expect(reconcile(kv, f.data.get('main') as string, b, t + 500)).toBe('idb');
    const g2 = new Game(b, kv, () => t + 1000); expect(g2.state.coinsCents).toBe(777); expect(saveSeqOf(kv.getItem(SAVE_KEY))).toBe(s1 + 3);
  });
});

describe('M1 mid-game dd52bfd v6 (L18, M4 off) -> M4-on build', () => {
  it('nothing lost, M4 fields initialised on commit, writable, round-trip', async () => {
    const fx = JSON.parse(readFileSync(FX, 'utf8')), s0 = fx.state; const kv = mem(fx.ls); let t = fx.savedAt + 600_000;
    const g = new Game(b, kv, () => t, 1, 'qa'); expect(g.recovery).toBeNull(); expect(g.tracksMigrationPending).toBe(true);
    for (const k of ['coinsCents', 'farmLevel', 'collectionLevel', 'graderTier', 'celebratedTier', 'coop', 'nextCustomerId']) expect((g.state as any)[k], k).toEqual(s0[k]);
    expect(g.state.workers).toEqual(s0.workers); expect(g.state.customers).toEqual(s0.customers);
    expect(g.state.basket + g.state.pendingOfflineEggs).toBeGreaterThanOrEqual(s0.basket);
    const grant = g.state.pendingOfflineEggs;
    expect(await g.startTracksMigration()).toBe('committed');
    const st: any = g.state; expect(st.tracksV7).toBe(1); expect(typeof st.v6BackupId).toBe('string');
    expect(st.hensLevel).toBe(s0.farmLevel); expect(st.eggValueLevel).toBeGreaterThanOrEqual(0); expect(Array.isArray(st.celebratedMilestones)).toBe(true);
    expect(JSON.parse(kv.getItem(V6_BACKUP_KEY)).raw).toBe(fx.ls[SAVE_KEY]);
    t += 1000; g.save(); const raw = kv.getItem(SAVE_KEY); const seq = saveSeqOf(raw); expect(seq).toBeGreaterThan(0);
    t += 5000; const g2 = new Game(b, kv, () => t, 1, 'qa'); const s2: any = g2.state, j = JSON.parse(raw).state;
    for (const k of ['coinsCents', 'farmLevel', 'collectionLevel', 'hensLevel', 'eggValueLevel', 'tracksV7', 'v6BackupId', 'celebratedMilestones', 'graderTier']) expect(s2[k], 'rt ' + k).toEqual(j[k]);
    expect(s2.basket).toBe(j.basket + j.pendingOfflineEggs); expect(saveSeqOf(kv.getItem(SAVE_KEY))).toBe(seq + 1);
    console.log('M1 ' + JSON.stringify({ grant, H: st.hensLevel, V: st.eggValueLevel, ms: st.celebratedMilestones, seq: [seq, seq + 1], bak: !!kv.getItem(BAK_KEY) }));
  });
});
