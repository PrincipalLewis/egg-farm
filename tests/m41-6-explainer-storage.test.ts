// @vitest-environment jsdom
// M41-6: HoQA gate4 explainer cases (qa/m3-scripts/gate4-explainer.qa.test.ts @ 2026-10-19), ported as committed tests.
// Fixtures: tests/fixtures/saves/m4-pre-v7-F30-C30.json (= QA pre-v7-F30-C30-732e70e) and m4-exp1-committed-unseen.json
// (= QA EXP1-committed-unseen-4ccb9fd). QE-LATE-e (mirror refuses the revert write) is closed by Game.save({ mirrorOnFail: false }).
// GATE 4 final: seenTracksExplainer, 3 explainer cases + EXP1 (needs src/ui/tracks-explainer.ts, i.e. explainer F1 e43bc00).
// Mirrors the app.ts wiring: g.onTracksCommitted = () => showTracksExplainer(g); if (g.tracksMigratedWithBackup) showTracksExplainer(g).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { TabLease } from '../src/save/tab-lease';
import { readFileSync } from 'node:fs';
import { balance as live } from '../src/config/balance';
import { Game } from '../src/game';
import { SAVE_KEY } from '../src/save/save';
import { showTracksExplainer } from '../src/ui/tracks-explainer';
import { reconcile } from '../src/save/idb-mirror';
const FX = (n: string) => readFileSync(`${process.cwd()}/tests/fixtures/saves/${n}`, 'utf8');
const PRE = FX('m4-pre-v7-F30-C30.json').trim(), EXP1 = JSON.parse(FX('m4-exp1-committed-unseen.json'));
const ON = structuredClone(live); ON.m4!.enabled = 1;
const mem = (init: Record<string, string> = {}) => { const m = new Map(Object.entries(init)); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } as any; };
const T = JSON.parse(PRE).savedAt + 30_000;
function boot(kv: any, t: number) { const g = new Game(ON, kv, () => t, 1, 'qa'); let shown = 0;
  // D-HOP-2026-10-22-06: seen is saved on dismissal, so the player dismisses each card as it appears.
  const dismiss = (c: HTMLElement | null) => { if (c) { shown++; (c.querySelector('button') as HTMLButtonElement).click(); } };
  g.onTracksCommitted = () => dismiss(showTracksExplainer(g)); if (g.tracksMigratedWithBackup) dismiss(showTracksExplainer(g));
  return { g, count: () => shown }; }
const seen = (kv: any) => JSON.parse(kv.getItem(SAVE_KEY)).state.seenTracksExplainer;
describe('explainer (seenTracksExplainer)', () => {
  it('EXP-a existing save: shows exactly once at the in-session commit, persisted; reloads never show again', async () => {
    const kv = mem({ [SAVE_KEY]: PRE }); const a = boot(kv, T); expect(a.count()).toBe(0); expect(seen(kv)).toBeUndefined();
    expect(await a.g.startTracksMigration()).toBe('committed'); expect(a.count()).toBe(1); expect(seen(kv)).toBe(true);
    for (let i = 1; i <= 3; i++) expect(boot(kv, T + i * 5000).count()).toBe(0);
  });
  it('EXP-b fresh M4 farm (tracksV7 but no backup): never shows, flag never set', async () => {
    const kv = mem(); const a = boot(kv, T); expect(JSON.parse(kv.getItem(SAVE_KEY)).state.tracksV7).toBe(1);
    expect(await a.g.startTracksMigration()).toBe('none'); expect(a.count()).toBe(0); expect(boot(kv, T + 5000).count()).toBe(0); expect(seen(kv)).toBeUndefined();
  });
  it('EXP-c interrupted (pending, no commit) then reload: not shown while pending, shown once when it commits', async () => {
    const kv = mem({ [SAVE_KEY]: PRE }); boot(kv, T); const b = boot(kv, T + 5000); expect(b.g.tracksMigrationPending).toBe(true); expect(b.count()).toBe(0);
    await b.g.startTracksMigration(); expect(b.count()).toBe(1); expect(boot(kv, T + 10_000).count()).toBe(0);
  });
  it('EXP1 canonical fixture (committed, unseen; real 4ccb9fd flow): reload shows exactly once, then never', () => {
    const kv = mem(EXP1.ls); const t0 = JSON.parse(EXP1.ls[SAVE_KEY]).savedAt + 5000;
    const a = boot(kv, t0); expect(a.g.tracksMigratedWithBackup).toBe(true); expect(a.count()).toBe(1); expect(seen(kv)).toBe(true);
    expect(boot(kv, t0 + 5000).count()).toBe(0);
  });
  it('EXP1 lookalike "strip flag + clear backups": treated as fresh (no show), proving the shortcut is NOT equivalent', () => {
    const ls = { ...EXP1.ls }; delete ls['eggfarm.save.v6_backup']; delete ls['eggfarm.save.bak'];
    const kv = mem(ls); const a = boot(kv, JSON.parse(ls[SAVE_KEY]).savedAt + 5000); expect(a.g.tracksMigratedWithBackup).toBe(false); expect(a.count()).toBe(0);
  });
});

// STORAGE-BLOCKED (Major on c11e3a0: canPersist misses lease.storageBlocked). Mirrors main.ts wiring: g.canWrite = () => lease.owns().
// kv refuses every write while blocked (tab lease / quota / private mode). Expect: no card, seenTracksExplainer not set in memory
// nor persisted; after storage frees (heartbeat retry) or a normal reload: shown exactly once, then never.
const blockable = (init: Record<string, string>) => { const kv = mem(init); const set = kv.setItem; const ctl = { blocked: false };
  kv.setItem = (k: string, v: string) => { if (ctl.blocked) { const e: any = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; } set(k, v); }; return { kv, ctl }; };
const SHOW_ARITY3 = showTracksExplainer.length >= 3 || /storageBlocked/.test(String(showTracksExplainer)); // new signature present -> wire like app.ts
const cards = () => document.querySelectorAll('.tracks-exp').length;
describe('explainer while storage is blocked', () => {
  afterEach(() => { vi.useRealTimers(); document.querySelectorAll('.tracks-exp').forEach(e => e.remove()); });
  for (const mode of ['commit-in-session', 'reload-committed-unseen'] as const) it(`EXP-SB ${mode}: no card and no seen flag while blocked; exactly once after unblock`, async () => {
    vi.useFakeTimers(); vi.setSystemTime(T);
    const { kv, ctl } = mode === 'commit-in-session' ? blockable({ [SAVE_KEY]: PRE }) : blockable(EXP1.ls);
    const t0 = JSON.parse(kv.getItem(SAVE_KEY)).savedAt + 5000;
    ctl.blocked = true;
    const lease = new TabLease(kv, null, () => {}, () => Date.now()); lease.claim(); expect(lease.storageBlocked).toBe(true);
    const g = new Game(ON, kv, () => t0, 1, 'qa'); g.canWrite = () => lease.owns(); let shown = 0;
    const sb = () => lease.storageBlocked || (g as any).storageFailed; // 8396ed1 main.ts: mountApp(..., { storageBlocked: () => lease.storageBlocked || g.storageFailed }) -> app.ts arg 3
    const show = () => SHOW_ARITY3 ? (showTracksExplainer as any)(g, document, sb) : showTracksExplainer(g);
    g.onTracksCommitted = () => { if (show()) shown++; };
    if (g.tracksMigratedWithBackup && show()) shown++;
    if (mode === 'commit-in-session') await g.startTracksMigration();
    await vi.advanceTimersByTimeAsync(1500);
    expect(cards(), 'card shown while storage blocked').toBe(0);
    expect(!!g.state.seenTracksExplainer, 'seen flag set in memory while blocked').toBe(false);
    expect(JSON.parse(kv.getItem(SAVE_KEY)).state.seenTracksExplainer, 'seen flag persisted while blocked').toBeFalsy();
    // unblock: heartbeat retry clears storageBlocked; explainer retry (EXP_RETRY_MS) may show in-session
    ctl.blocked = false; await vi.advanceTimersByTimeAsync(5000);
    let total = cards();
    if (total === 0) { document.querySelectorAll('.tracks-exp').forEach(e => e.remove()); lease.stop?.(); // normal reload
      const r = boot(kv, t0 + 10_000); if (r.g.tracksMigrationPending) await r.g.startTracksMigration(); total = r.count(); }
    else lease.stop?.();
    expect(total, 'shown exactly once after unblock/reload').toBe(1);
    document.querySelectorAll('.tracks-exp').forEach(e => (e.querySelector('button') as HTMLButtonElement).click()); // D-HOP-2026-10-22-06: seen is saved on dismissal
    expect(JSON.parse(kv.getItem(SAVE_KEY)).state.seenTracksExplainer).toBe(true);
    expect(boot(kv, t0 + 20_000).count(), 'never again').toBe(0);
  });
});

// EXP-SB-QE (prep for HoE's storageFailed fast-forward on top of c9d7523): lease write OK, but the SAVE write throws a real
// DOMException named QuotaExceededError -> g.storageFailed must be set; explainer must not show; seen flag must not persist.
// After quota frees and a normal reload, shown exactly once, then never. Wiring = app.ts (arg 3 storageBlocked when present).
const QE_MEM: Record<string, boolean> = {};
describe('explainer on real QuotaExceededError (g.storageFailed)', () => {
  afterEach(() => { vi.useRealTimers(); document.querySelectorAll('.tracks-exp').forEach(e => e.remove()); });
  for (const mode of ['commit-in-session', 'reload-committed-unseen'] as const) it(`EXP-SB-QE ${mode}`, async () => {
    vi.useFakeTimers(); vi.setSystemTime(T);
    const kv = mem(mode === 'commit-in-session' ? { [SAVE_KEY]: PRE } : EXP1.ls); const set = kv.setItem; const ctl = { quota: false };
    kv.setItem = (k: string, v: string) => { if (ctl.quota && k.startsWith('eggfarm.save')) throw new DOMException('quota', 'QuotaExceededError'); set(k, v); };
    const t0 = JSON.parse(kv.getItem(SAVE_KEY)).savedAt + 5000;
    const lease = new TabLease(kv, null, () => {}, () => Date.now()); lease.claim(); expect(lease.storageBlocked).toBe(false);
    ctl.quota = true;
    const g = new Game(ON, kv, () => t0, 1, 'qa'); g.canWrite = () => lease.owns(); const sb = () => lease.storageBlocked || (g as any).storageFailed; // = 8396ed1 main.ts
    const show = () => SHOW_ARITY3 ? (showTracksExplainer as any)(g, document, sb) : showTracksExplainer(g); let shown = 0;
    g.onTracksCommitted = () => { if (show()) shown++; };
    g.save(); expect((g as any).storageFailed, 'g.storageFailed after real QuotaExceededError').toBeTruthy();
    if (g.tracksMigratedWithBackup && show()) shown++;
    if (mode === 'commit-in-session') await g.startTracksMigration();
    await vi.advanceTimersByTimeAsync(1500);
    expect(cards(), 'card shown under quota failure').toBe(0);
    QE_MEM[mode] = !!g.state.seenTracksExplainer; // recorded, not asserted (see EXP-SB-QE-LATE)
    expect(JSON.parse(kv.getItem(SAVE_KEY)).state.seenTracksExplainer, 'seen flag persisted').toBeFalsy();
    ctl.quota = false; lease.stop?.(); await vi.advanceTimersByTimeAsync(3000);
    let total = cards() + shown; document.querySelectorAll('.tracks-exp').forEach(e => e.remove());
    if (total === 0) { const r = boot(kv, t0 + 10_000); if (r.g.tracksMigrationPending) await r.g.startTracksMigration(); total = r.count(); }
    expect(total, 'shown exactly once after quota frees').toBe(1);
    expect(JSON.parse(kv.getItem(SAVE_KEY)).state.seenTracksExplainer).toBe(true);
    expect(boot(kv, t0 + 20_000).count(), 'never again').toBe(0);
  });
});

// EXP-SB-QE-LATE (FINDING probe): QE during the show -> seen=true may stay in memory; quota frees in the SAME session; the next
// save (autosave path = g.save()) persists seen=true although no card was ever shown -> reload never shows it.
describe('EXP-SB-QE-LATE', () => {
  afterEach(() => { vi.useRealTimers(); document.querySelectorAll('.tracks-exp').forEach(e => e.remove()); });
  for (const mode of ['commit-in-session', 'reload-committed-unseen'] as const) it(`EXP-SB-QE-LATE ${mode}`, async () => {
    vi.useFakeTimers(); vi.setSystemTime(T);
    const kv = mem(mode === 'commit-in-session' ? { [SAVE_KEY]: PRE } : EXP1.ls); const set = kv.setItem; const ctl = { quota: false };
    kv.setItem = (k: string, v: string) => { if (ctl.quota && k.startsWith('eggfarm.save')) throw new DOMException('quota', 'QuotaExceededError'); set(k, v); };
    const t0 = JSON.parse(kv.getItem(SAVE_KEY)).savedAt + 5000;
    const lease = new TabLease(kv, null, () => {}, () => Date.now()); lease.claim();
    const g = new Game(ON, kv, () => t0, 1, 'qa'); g.canWrite = () => lease.owns(); const sb = () => lease.storageBlocked || (g as any).storageFailed;
    let shown = 0; const show = () => (showTracksExplainer as any)(g, document, sb);
    ctl.quota = true; g.onTracksCommitted = () => { if (show()) shown++; };
    if (g.tracksMigratedWithBackup && show()) shown++;
    if (mode === 'commit-in-session') { const r = await g.startTracksMigration(); (globalThis as any).__r = r; }
    await vi.advanceTimersByTimeAsync(1500);
    document.querySelectorAll('.tracks-exp').forEach(e => (e.querySelector('button') as HTMLButtonElement).click()); // D-HOP-2026-10-22-06: the flag write happens at dismissal, under QE
    const ev: any = { storageFailed: (g as any).storageFailed, mem: !!g.state.seenTracksExplainer, persistedBefore: JSON.parse(kv.getItem(SAVE_KEY)).state.seenTracksExplainer ?? null, cardsDuringQE: cards() + shown };
    ctl.quota = false; g.save(); await vi.advanceTimersByTimeAsync(3000);
    ev.persistedAfterAutosave = JSON.parse(kv.getItem(SAVE_KEY)).state.seenTracksExplainer ?? null; ev.storageFailedAfter = (g as any).storageFailed;
    lease.stop?.(); document.querySelectorAll('.tracks-exp').forEach(e => e.remove());
    const r = boot(kv, t0 + 10_000); if (r.g.tracksMigrationPending) await r.g.startTracksMigration(); ev.cardsOnReload = r.count();
    ev.cardsOnReload2 = boot(kv, t0 + 20_000).count();
    console.log('QE_LATE ' + mode + ' ' + JSON.stringify(ev));
    // D-HOP-2026-10-22-06: shown during QE but its dismissal could not persist seen -> shown once more on reload, then never.
    expect([ev.mem, ev.persistedAfterAutosave === true, ev.cardsOnReload, ev.cardsOnReload2], 'no seen=true without a persisted dismissal').toEqual([false, false, 1, 0]);
  });
});

// EXP-SB-QE-LATE a..f (HoQ MAJOR). Fake IndexedDB mirror = in-memory copy. Quota is "armed" at load: the FIRST failing write is
// the explainer's flag write (value has seenTracksExplainer:true); after that every eggfarm.save* write fails until freed.
// a: freed, autosave LS, reload | b: QE on LS, mirror ok, one more save under QE, reload prefers IDB | c: a + mirror
// d: catch-path mirror write, tab dies (no further save), reload with IDB copy | e: d, but the mirror ALSO fails after its first
// write (revert save cannot reach IDB) | f: d on a pre-v7 save committing IN SESSION (migration + refund path).
// Invariants: card exactly once overall, never again; saveSeq monotonic per store; no newer-save trip (R3); no recovery;
// no double migration/refund (coins, levels, v6BackupId stable; no pending migration after reload).
const seenIn = (raw: string | null) => raw ? (JSON.parse(raw).state.seenTracksExplainer ?? null) : null;
const seqOf = (raw: string) => { try { return JSON.parse(raw).saveSeq ?? null; } catch { return null; } };
describe('EXP-SB-QE-LATE mirror/reload variants', () => {
  afterEach(() => { vi.useRealTimers(); document.querySelectorAll('.tracks-exp').forEach(e => e.remove()); });
  for (const v of ['a', 'b', 'c', 'd', 'e', 'f'] as const) it(`EXP-SB-QE-LATE-${v}`, async () => {
    vi.useFakeTimers(); vi.setSystemTime(T);
    const kv = mem(v === 'f' ? { [SAVE_KEY]: PRE } : EXP1.ls); const set = kv.setItem; const ctl = { mode: 'off' as 'off' | 'armed' | 'full', idbFail: false };
    const lsSeqs: number[] = [], idbSeqs: number[] = [];
    kv.setItem = (k: string, val: string) => { if (k.startsWith('eggfarm.save')) { if (ctl.mode === 'armed' && val.includes('"seenTracksExplainer":true')) ctl.mode = 'full'; if (ctl.mode === 'full') throw new DOMException('quota', 'QuotaExceededError'); } set(k, val); if (k === SAVE_KEY) lsSeqs.push(seqOf(val)); };
    const t0 = JSON.parse(kv.getItem(SAVE_KEY)).savedAt + 5000; const useM = v !== 'a';
    const idb = { raw: null as string | null };
    const mirror = { write: (r: string) => { if (ctl.idbFail) throw new DOMException('quota', 'QuotaExceededError'); idb.raw = r; idbSeqs.push(seqOf(r)); if (v === 'e' && ctl.mode === 'full') ctl.idbFail = true; }, clear: async () => { idb.raw = null; }, newer: null, onNewer: null } as any;
    const mk = async (t: number) => { let src = 'ls'; if (useM && idb.raw) { try { src = reconcile(kv, idb.raw, ON) as any; } catch { src = 'blocked'; } }
      const lease = new TabLease(kv, null, () => {}, () => Date.now()); lease.claim();
      const g = new Game(ON, kv, () => t, 1, 'qa', useM ? mirror : null, useM ? idb.raw : null); g.canWrite = () => lease.owns();
      const sb = () => lease.storageBlocked || (g as any).storageFailed; let n = 0; const show = () => { const c = (showTracksExplainer as any)(g, document, sb); if (c) { n++; c.querySelector('button').click(); } }; // dismissed
      g.onTracksCommitted = show; if (g.tracksMigratedWithBackup) show();
      let mig: any = null; if (g.tracksMigrationPending) mig = await g.startTracksMigration();
      return { g, lease, n: () => n, src, mig, snap: { coins: g.state.coinsCents, F: g.state.farmLevel, H: (g.state as any).hensLevel, V: (g.state as any).eggValueLevel, bid: (g.state as any).v6BackupId, newer: g.newerSave, recovery: g.recovery && g.recovery.case, refund: g.migrationRefundCents, pending: g.tracksMigrationPending } }; };
    const ev: any = { v }; ctl.mode = 'armed';
    const s1 = await mk(t0); await vi.advanceTimersByTimeAsync(1500); const shown = s1.n(); ev.s1 = { mig: s1.mig, ...s1.snap };
    ev.qeHit = (ctl.mode as string) === 'full'; ev.storageFailed = (s1.g as any).storageFailed; ev.mem = !!s1.g.state.seenTracksExplainer; ev.lsAtQE = seenIn(kv.getItem(SAVE_KEY)); ev.idbAtQE = seenIn(idb.raw);
    if (v === 'b') { s1.g.save(); ctl.mode = 'off'; }
    else if (v === 'd' || v === 'e' || v === 'f') { ctl.mode = 'off'; ctl.idbFail = false; } // tab dies: no further save
    else { ctl.mode = 'off'; s1.g.save(); await vi.advanceTimersByTimeAsync(3000); }
    ev.lsAfter = seenIn(kv.getItem(SAVE_KEY)); ev.idbAfter = seenIn(idb.raw); ev.lsSeqAtDeath = seqOf(kv.getItem(SAVE_KEY)); ev.idbSeqAtDeath = idb.raw && seqOf(idb.raw); s1.lease.stop?.();
    const s2 = await mk(t0 + 10_000); ev.reloadSrc = s2.src; ev.reload1 = s2.n(); ev.s2 = { mig: s2.mig, ...s2.snap }; s2.g.save(); s2.lease.stop?.();
    const s3 = await mk(t0 + 20_000); ev.reload2 = s3.n(); ev.s3 = { mig: s3.mig, ...s3.snap }; s3.lease.stop?.();
    ev.lsSeqs = lsSeqs; ev.idbSeqs = idbSeqs; ev.shownDuringQE = shown; ev.total = shown + ev.reload1 + ev.reload2;
    console.log(`QE_LATE_${v} ` + JSON.stringify(ev));
    const mono = (a: number[]) => a.every((x, i) => i === 0 || x >= a[i - 1]);
    expect(ev.qeHit, 'quota hit the flag write').toBe(true);
    // D-HOP-2026-10-22-06: the card shows and its dismissal is the write that hits the quota; seen stays false, so the
    // first reload shows it once more (that dismissal persists), then never.
    expect([shown, ev.mem, ev.reload1, ev.reload2], 'shown until a dismissal persists').toEqual([1, false, 1, 0]);
    expect(mono(lsSeqs), 'LS saveSeq monotonic ' + lsSeqs).toBe(true); expect(mono(idbSeqs), 'IDB saveSeq monotonic ' + idbSeqs).toBe(true);
    for (const s of [ev.s2, ev.s3]) { expect(s.newer, 'R3 newer-save guard must not trip').toBeNull(); expect(s.recovery ?? null, 'no recovery').toBeNull(); expect(s.pending, 'no pending migration').toBeFalsy(); expect(s.mig ?? null, 'no second migration').toBeNull();
      expect([s.coins, s.F, s.H, s.V, s.bid], 'no double migration/refund').toEqual([ev.s1.coins, ev.s1.F, ev.s1.H, ev.s1.V, ev.s1.bid]); }
  });
});
