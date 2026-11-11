// GATE 4 add (HoQ 04:21): v7 marker (tracksV7 + v6BackupId), migrate-once, interrupted load, explainer predicate, rollback
// (M4 off, incl. L31+), F50/H55, flag-off byte identity, and the CANONICAL EXP1 fixture by the real commit flow.
// Run from a worktree: cp to tests/, npx vitest run --maxWorkers=2 --minWorkers=1 tests/gate4-marker.qa.test.ts
// Env: EXP1_OUT=<path> writes the EXP1 fixture (only from the 4ccb9fd worktree). QA_TAG labels the result lines.
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { balance as live } from '../src/config/balance';
import { Game } from '../src/game';
import { SAVE_KEY, BAK_KEY, V6_BACKUP_KEY, serialize, saveSeqOf, load, validate, decodeBackup } from '../src/save/save';
import { IdbMirror } from '../src/save/idb-mirror';
const G4 = '/workspace/egg-farm-studio/qa/m3-recheck/gate4-fixtures', TAG = process.env.QA_TAG ?? 'wt';
const PRE = readFileSync(`${G4}/pre-v7-F30-C30-732e70e.json`, 'utf8').trim(), M1 = JSON.parse(readFileSync(`${G4}/M1-midgame-L18-dd52bfd.json`, 'utf8'));
const ON = structuredClone(live); ON.m4!.enabled = 1; const OFF = structuredClone(live); OFF.m4!.enabled = 0;
const mem = (init: Record<string, string> = {}) => { const m = new Map(Object.entries(init)); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } as any; };
const later = (f: () => void) => setTimeout(f, 0); const flush = () => new Promise(r => setTimeout(r, 10));
function fakeIdb() { const data = new Map<string, unknown>(); const stores = new Set<string>();
  const db: any = { objectStoreNames: { contains: (n: string) => stores.has(n) }, createObjectStore: (n: string) => { stores.add(n); },
    transaction() { const t: any = {}; t.objectStore = () => ({ get: (k: string) => { const r: any = {}; later(() => { r.result = data.get(k); r.onsuccess?.(); t.oncomplete?.(); }); return r; },
      put: (v: unknown, k: string) => { later(() => { data.set(k, v); t.oncomplete?.(); }); return {}; }, delete: (k: string) => { later(() => { data.delete(k); t.oncomplete?.(); }); return {}; } }); return t; } };
  return { data, factory: { open: () => { const r: any = {}; later(() => { r.result = db; r.onupgradeneeded?.(); r.onsuccess?.(); }); return r; } } as any }; }
const T = JSON.parse(PRE).savedAt + 30_000; // < 60 s after the save: no offline grant, so coins compare exactly
const CAPPED = process.env.QA_PROFILE === 'capped'; // D-CEO-09: farm max 30 -> F50/H55 cases are N/A BY RULING (reported, not skipped silently)
const out: any = {}; const note = (k: string, v: unknown) => { out[k] = v; };
const withState = (raw: string, patch: any, savedAt?: number) => { const j = JSON.parse(raw); return serialize({ ...j.state, ...patch }, savedAt ?? j.savedAt, j.saveSeq); };

describe(`[${TAG}] 1 migration runs exactly once`, () => {
  it('commit once; reloads never re-migrate; nothing refunded twice', async () => {
    const kv = mem({ [SAVE_KEY]: PRE }); let t = T; const g = new Game(ON, kv, () => t, 1, 'qa');
    expect(g.tracksMigrationPending).toBe(true); const c0 = g.state.coinsCents;
    expect(await g.startTracksMigration()).toBe('committed'); const s1: any = g.state, rec1 = kv.getItem(V6_BACKUP_KEY);
    expect(s1.tracksV7).toBe(1); expect(decodeBackup(rec1)!.migrationId).toBe(s1.v6BackupId); expect(decodeBackup(rec1)!.raw).toBe(PRE);
    note('once', { coinsBefore: c0, coinsAfterCommit: s1.coinsCents, H: s1.hensLevel, V: s1.eggValueLevel, id: s1.v6BackupId });
    for (let i = 0; i < 3; i++) { t += 5_000; const r = new Game(ON, kv, () => t, 1, 'qa'); const s: any = r.state;
      expect(r.tracksMigrationPending).toBe(false); expect(await r.startTracksMigration()).toBe('none');
      expect(s.coinsCents).toBe(s1.coinsCents); expect([s.hensLevel, s.eggValueLevel, s.v6BackupId]).toEqual([s1.hensLevel, s1.eggValueLevel, s1.v6BackupId]);
      expect(kv.getItem(V6_BACKUP_KEY)).toBe(rec1); expect(load(kv, ON)!.tracksMigrated).toBeUndefined(); }
  });
});
describe(`[${TAG}] 2 interrupted load stays pending, then migrates once`, () => {
  it('pending session saves v6-only bytes, no backup; reload still pending; commit once = same result as an uninterrupted run', async () => {
    const kv = mem({ [SAVE_KEY]: PRE }); let t = T; const g = new Game(ON, kv, () => t, 1, 'qa'); expect(g.tracksMigrationPending).toBe(true);
    t += 2_000; g.save(); const mid = JSON.parse(kv.getItem(SAVE_KEY)); expect(mid.state.tracksV7).toBeUndefined(); expect(mid.state.v6BackupId).toBeUndefined(); expect(kv.getItem(V6_BACKUP_KEY)).toBeNull();
    // "tab killed" here: no commit. Reload:
    t += 2_000; const g2 = new Game(ON, kv, () => t, 1, 'qa'); expect(g2.tracksMigrationPending).toBe(true);
    expect(await g2.startTracksMigration()).toBe('committed'); const s: any = g2.state;
    t += 2_000; const g3 = new Game(ON, kv, () => t, 1, 'qa'); expect(g3.tracksMigrationPending).toBe(false); expect((g3.state as any).v6BackupId).toBe(s.v6BackupId);
    note('interrupted', { coins: s.coinsCents, H: s.hensLevel, V: s.eggValueLevel, saveSeqMid: mid.saveSeq });
    expect(s.coinsCents).toBe(out.once?.coinsAfterCommit ?? s.coinsCents); expect([s.hensLevel, s.eggValueLevel]).toEqual([out.once?.H ?? s.hensLevel, out.once?.V ?? s.eggValueLevel]);
  });
});
describe(`[${TAG}] 3 explainer (seenTracksExplainer)`, () => {
  it('3a feature presence in src (report only)', () => {
    const src = ['src/game.ts', 'src/ui/app.ts', 'src/save/save.ts', 'src/sim/state.ts'].map(f => existsSync(f) ? readFileSync(f, 'utf8') : '').join('\n');
    note('explainer', { seenTracksExplainerInSrc: src.includes('seenTracksExplainer'), onTracksCommittedWiredInUi: (existsSync('src/ui/app.ts') ? readFileSync('src/ui/app.ts', 'utf8') : '').includes('onTracksCommitted') });
  });
  it('3b EXP1 predicate (tracksV7 && v6_backup.migrationId === v6BackupId) separates migrated vs fresh farm, survives reload', async () => {
    const pred = (kv: any) => { const s = JSON.parse(kv.getItem(SAVE_KEY)).state; return s.tracksV7 === 1 && !!s.v6BackupId && decodeBackup(kv.getItem(V6_BACKUP_KEY))?.migrationId === s.v6BackupId && !s.seenTracksExplainer; };
    const kvF = mem(); new Game(ON, kvF, () => T, 1, 'qa'); expect(JSON.parse(kvF.getItem(SAVE_KEY)).state.tracksV7).toBe(1); expect(pred(kvF)).toBe(false); // fresh: marker but no backup
    const kv = mem({ [SAVE_KEY]: PRE }); let t = T; const g = new Game(ON, kv, () => t, 1, 'qa'); expect(pred(kv)).toBe(false);
    await g.startTracksMigration(); expect(pred(kv)).toBe(true); t += 5000; new Game(ON, kv, () => t, 1, 'qa'); expect(pred(kv)).toBe(true); // EXP1: reload after commit, unseen
    // seen flag is preserved by load/save if a build sets it (optional field, SAVE_VERSION 6)
    const j = JSON.parse(kv.getItem(SAVE_KEY)); kv.setItem(SAVE_KEY, serialize({ ...j.state, seenTracksExplainer: true }, j.savedAt, j.saveSeq));
    t += 5000; const g2 = new Game(ON, kv, () => t, 1, 'qa'); g2.save(); expect(JSON.parse(kv.getItem(SAVE_KEY)).state.seenTracksExplainer).toBe(true); expect(pred(kv)).toBe(false);
    t += 5000; const g3 = new Game(OFF, kv, () => t, 1, 'qa'); g3.save(); expect(JSON.parse(kv.getItem(SAVE_KEY)).state.seenTracksExplainer).toBe(true);
  });
});
describe(`[${TAG}] 4 rollback: marked save loads with M4 OFF`, () => {
  const committed = async (patch: any = {}) => { const kv = mem({ [SAVE_KEY]: PRE }); const g = new Game(ON, kv, () => T, 1, 'qa'); await g.startTracksMigration();
    if (Object.keys(patch).length) { const j = JSON.parse(kv.getItem(SAVE_KEY)); kv.setItem(SAVE_KEY, serialize({ ...j.state, ...patch }, j.savedAt, j.saveSeq)); } return kv; };
  for (const [name, patch] of [['F30 (732e70e)', {}], ['L31+ F40 C35 H40 V32', { farmLevel: 40, collectionLevel: 35, hensLevel: 40, eggValueLevel: 32 }]] as const)
    it(`4 ${name}`, async () => {
      const kv = await committed(patch); const s0 = JSON.parse(kv.getItem(SAVE_KEY)).state; const v = validate(kv.getItem(SAVE_KEY), OFF);
      const g = new Game(OFF, kv, () => T + 10_000, 1, 'qa'); const s: any = g.state;
      const r = { validateOk: v.ok, reason: (v as any).reason ?? null, recovery: g.recovery, isNewGame: g.isNewGame, F: s.farmLevel, C: s.collectionLevel, H: s.hensLevel, V: s.eggValueLevel, coins: s.coinsCents, marker: s.tracksV7, id: s.v6BackupId };
      note(`rollback ${name}`, r);
      expect(g.recovery).toBeNull(); expect(g.isNewGame).toBe(false);
      expect([s.farmLevel, s.collectionLevel, s.coinsCents]).toEqual([s0.farmLevel, s0.collectionLevel, s0.coinsCents]);
      g.save(); const w = JSON.parse(kv.getItem(SAVE_KEY)).state; expect([w.tracksV7, w.v6BackupId, w.hensLevel, w.eggValueLevel]).toEqual([1, s0.v6BackupId, s0.hensLevel, s0.eggValueLevel]);
      const back = new Game(ON, kv, () => T + 20_000, 1, 'qa'); expect(back.tracksMigrationPending).toBe(false); expect((back.state as any).hensLevel).toBe(s0.hensLevel);
    });
});
describe(`[${TAG}] 5 farm 50 with tracks 55${CAPPED ? ' [N/A BY RULING D-CEO-09: capped profile]' : ''}`, () => {
  it.skipIf(CAPPED)('5a pre-v7 F50 loads, migrates once, round-trips (M4 on)', async () => {
    const raw = withState(PRE, { farmLevel: 50, collectionLevel: 50 }); const kv = mem({ [SAVE_KEY]: raw }); let t = T; const g = new Game(ON, kv, () => t, 1, 'qa');
    const r: any = { recovery: g.recovery, isNewGame: g.isNewGame, F: g.state.farmLevel, pending: g.tracksMigrationPending };
    if (g.tracksMigrationPending) r.commit = await g.startTracksMigration(); const s: any = g.state; Object.assign(r, { H: s.hensLevel, V: s.eggValueLevel, coins: s.coinsCents, coinsNaN: !Number.isFinite(s.coinsCents) });
    t += 5000; g.save(); const g2 = new Game(ON, kv, () => t + 5000, 1, 'qa'); r.rt = { F: g2.state.farmLevel, H: (g2.state as any).hensLevel, V: (g2.state as any).eggValueLevel, rec: g2.recovery };
    note('F50 pre-v7', r);
    expect(g.recovery).toBeNull(); expect(g.state.farmLevel).toBe(50); expect(r.commit).toBe('committed'); expect(Number.isFinite(s.coinsCents)).toBe(true);
    expect(r.rt).toEqual({ F: 50, H: s.hensLevel, V: s.eggValueLevel, rec: null });
  });
  it.skipIf(CAPPED)('5b marked F50 H55 V55 loads and round-trips (M4 on)', () => {
    const raw = withState(PRE, { farmLevel: 50, collectionLevel: 50, hensLevel: 55, eggValueLevel: 55, tracksV7: 1, v6BackupId: '0123456789abcdef' });
    const kv = mem({ [SAVE_KEY]: raw }); const g = new Game(ON, kv, () => T, 1, 'qa'); const s: any = g.state;
    note('F50 H55', { recovery: g.recovery, isNewGame: g.isNewGame, F: s.farmLevel, H: s.hensLevel, V: s.eggValueLevel });
    expect(g.recovery).toBeNull(); expect([s.farmLevel, s.hensLevel, s.eggValueLevel]).toEqual([50, 55, 55]);
    g.save(); const g2 = new Game(ON, kv, () => T + 5000, 1, 'qa'); expect([(g2.state as any).hensLevel, (g2.state as any).eggValueLevel, g2.state.farmLevel]).toEqual([55, 55, 50]);
  });
});
describe(`[${TAG}] 6 flag off: saves byte-identical`, () => {
  it('6 dd52bfd-written M1 save re-saved by this build with M4 off at the same time = identical bytes', () => {
    const kv = mem(M1.ls); let t = M1.savedAt; const g = new Game(OFF, kv, () => t, 1, 'qa'); g.save();
    const got = kv.getItem(SAVE_KEY), want = M1.ls[SAVE_KEY]; const gj = JSON.parse(got), wj = JSON.parse(want);
    note('flagoff bytes', { identical: got === want, seq: [wj.saveSeq ?? null, gj.saveSeq ?? null], stateEqual: JSON.stringify(gj.state) === JSON.stringify(wj.state), len: [want.length, got.length] });
    expect(JSON.stringify(gj.state)).toBe(JSON.stringify(wj.state)); expect(Object.keys(gj)).toEqual(Object.keys(wj)); expect(gj.saveSeq).toBeUndefined();
  });
});
describe(`[${TAG}] EXP1 canonical fixture (real flow)`, () => {
  it('pre-v7 -> Game M4 on with IDB mirror -> commit -> snapshot LS + IDB before any explainer', async () => {
    const f = fakeIdb(); const m = (await IdbMirror.open(f.factory))!; const kv = mem({ [SAVE_KEY]: PRE }); let t = T;
    const g = new Game(ON, kv, () => t, 1, 'qa-exp1', m, null, { idbBoot: 'ok' } as any); await flush();
    let snap: any = null; g.onTracksCommitted = () => { snap = { ls: Object.fromEntries(kv.m) }; };
    t += 1000; expect(await g.startTracksMigration()).toBe('committed'); await flush();
    expect(snap).not.toBeNull(); snap.idb = { main: f.data.get('main') ?? null };
    const st = JSON.parse(snap.ls[SAVE_KEY]).state, rec = decodeBackup(snap.ls[V6_BACKUP_KEY])!;
    const fx = { id: 'EXP1-committed-unseen-4ccb9fd', how: 'real flow: 732e70e pre-v7 F30/C30 loaded by 4ccb9fd Game (M4 on, IDB mirror boot ok), startTracksMigration committed; LS captured in onTracksCommitted (before any UI), IDB after the post-commit mirror write',
      ls: snap.ls, idb: snap.idb, notes: { tracksV7: st.tracksV7, v6BackupId: st.v6BackupId, backupSlotKey: V6_BACKUP_KEY, backupMigrationId: rec.migrationId, backupRawIsOriginalPre: rec.raw === PRE, seenTracksExplainer: st.seenTracksExplainer ?? 'absent', bak: !!snap.ls[BAK_KEY], idbEqualsLs: snap.idb.main === snap.ls[SAVE_KEY], saveSeq: saveSeqOf(snap.ls[SAVE_KEY]) } };
    note('EXP1', fx.notes);
    expect(rec.migrationId).toBe(st.v6BackupId); expect(fx.notes.idbEqualsLs).toBe(true);
    if (process.env.EXP1_OUT) writeFileSync(process.env.EXP1_OUT, JSON.stringify(fx, null, 1));
  });
});
it('report', () => console.log(`QA_MARKER[${TAG}] ` + JSON.stringify(out)));
