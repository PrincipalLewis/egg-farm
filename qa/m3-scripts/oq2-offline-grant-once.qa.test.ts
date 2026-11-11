// @vitest-environment jsdom
// M41-6 OQ-2 (qe-late-e spec v0.3 §3.1): the offline-grant path (pendingOfflineEggs) keeps the default IDB mirror, and the
// grant is credited ONCE through collect / no-collect, reload, reconcile and the IDB mirror, incl. LS failure and the
// explainer's mirrorOnFail:false flag save. Run as tests/oq2-offline-grant-once.qa.test.ts in the candidate worktree.
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { balance as live } from '../src/config/balance';
import { Game } from '../src/game';
import { SAVE_KEY, rankCompare } from '../src/save/save';
import { reconcile } from '../src/save/idb-mirror';
import { showTracksExplainer } from '../src/ui/tracks-explainer';
const Q = '/workspace/egg-farm-studio/qa';
const EXP1 = JSON.parse(readFileSync(`${Q}/m3-recheck/gate4-fixtures/EXP1-committed-unseen-4ccb9fd.json`, 'utf8'));
const M1 = JSON.parse(readFileSync(`${Q}/m3-recheck/gate4-fixtures/M1-midgame-L18-dd52bfd.json`, 'utf8'));
const ON = structuredClone(live); ON.m4!.enabled = 1; const OFF = structuredClone(live); OFF.m4!.enabled = 0;
const GAP = 2 * 3600_000;
// One persistent "browser": LS map + IDB main; LS can fail on eggfarm.save* (armed by a predicate, sticky once tripped).
function browser(ls: Record<string, string>, idb: string | null = null) {
  const m = new Map(Object.entries(ls)); const st = { idb, failAll: false, failWhen: null as null | ((v: string) => boolean), tripped: false, mirrorWrites: [] as string[] };
  const kv = { m, getItem: (k: string) => m.get(k) ?? null, removeItem: (k: string) => void m.delete(k),
    setItem: (k: string, v: string) => { if (k.startsWith('eggfarm.save') && (st.failAll || st.tripped || (st.failWhen && st.failWhen(v)))) { st.tripped = !!st.failWhen || st.tripped; const e: any = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } m.set(k, v); } } as any;
  const mirror = () => ({ write: (r: string) => { st.mirrorWrites.push(r); if (st.idb === null || rankCompare(st.idb, r) <= 0) st.idb = r; }, clear: async () => { st.idb = null; }, newer: null, onNewer: null } as any);
  const boot = (b: typeof ON, t: number) => { const via = reconcile(kv, st.idb, b, t); const g = new Game(b, kv, () => t, 1, 'qa', mirror(), st.idb, { idbBoot: 'ok' }); return { g, via }; };
  const free = () => { st.failAll = false; st.failWhen = null; st.tripped = false; };
  return { kv, st, boot, free };
}
const eggs = (g: Game) => g.state.basket + g.state.pendingOfflineEggs;
const lsState = (kv: any) => JSON.parse(kv.getItem(SAVE_KEY)).state;
const rows: any[] = [];
afterEach(() => { document.body.innerHTML = ''; });
describe('OQ-2 offline grant credited once (pendingOfflineEggs keeps the mirror)', () => {
  for (const [fx, b, ls, idb] of [['EXP1', ON, EXP1.ls, EXP1.idb.main], ['M1-midgame', OFF, M1.ls, null]] as const) {
    const s0 = JSON.parse((ls as any)[SAVE_KEY]); const T0 = s0.savedAt + GAP; const base = { coins: s0.state.coinsCents, eggs: s0.state.basket + (s0.state.pendingOfflineEggs ?? 0) };
    const check = (name: string, g: Game, G: number, extra: any = {}) => { const r = { fx, name, coins: g.state.coinsCents, eggs: eggs(g), expectEggs: base.eggs + G, G, newGrant: g.offline.eggs, ...extra }; rows.push(r);
      expect(g.state.coinsCents, `${name}: coins unchanged by the grant`).toBe(base.coins); expect(eggs(g), `${name}: eggs = base + one grant`).toBe(base.eggs + G); };
    it(`${fx} S1 collect, reload x2 (LS+IDB): one grant`, () => {
      const B = browser(ls as any, idb as any); const a = B.boot(b, T0); const G = a.g.offline.eggs; expect(G).toBeGreaterThan(0); expect(a.g.state.pendingOfflineEggs).toBe(G);
      expect(B.st.idb, 'grant save mirrored').toBe(B.kv.getItem(SAVE_KEY));
      a.g.dispatch({ type: 'collectOffline' }); check('S1 after collect', a.g, G);
      const r1 = B.boot(b, T0 + 5000); expect(r1.g.offline.eggs, 'no second grant on reload').toBe(0); check('S1 reload1', r1.g, G, { via: r1.via });
      const r2 = B.boot(b, T0 + 10_000); expect(r2.g.offline.eggs).toBe(0); check('S1 reload2', r2.g, G, { via: r2.via });
    });
    it(`${fx} S2 tab closed with the modal open (no collect): reload settles pending once, no regrant`, () => {
      const B = browser(ls as any, idb as any); const a = B.boot(b, T0); const G = a.g.offline.eggs;
      const r1 = B.boot(b, T0 + 5000); expect(r1.g.offline.eggs).toBe(0); expect(r1.g.state.pendingOfflineEggs).toBe(0); check('S2 reload1 settled', r1.g, G, { via: r1.via });
      const r2 = B.boot(b, T0 + 10_000); check('S2 reload2', r2.g, G, { via: r2.via });
    });
    it(`${fx} S3 LS full at the grant's load save: the mirror gets it (default save), reload via IDB settles once, no regrant`, () => {
      const B = browser(ls as any, idb as any); B.st.failAll = true; const a = B.boot(b, T0); const G = a.g.offline.eggs; expect(a.g.storageFailed).toBe(true);
      expect(JSON.parse(B.st.idb!).state.pendingOfflineEggs, 'IDB fallback carries the pending grant').toBe((s0.state.pendingOfflineEggs ?? 0) + G);
      B.free(); const r1 = B.boot(b, T0 + 5000); expect(r1.via).toBe('idb'); expect(r1.g.offline.eggs, 'no regrant from the stale LS savedAt').toBe(0); check('S3 reload1 via IDB', r1.g, G, { via: r1.via });
      const r2 = B.boot(b, T0 + 10_000); check('S3 reload2', r2.g, G, { via: r2.via });
    });
    it(`${fx} S4 collect while LS full (mirror fallback), tab dies, reload via IDB: one grant`, () => {
      const B = browser(ls as any, idb as any); const a = B.boot(b, T0); const G = a.g.offline.eggs; B.st.failAll = true;
      a.g.dispatch({ type: 'collectOffline' }); expect(a.g.storageFailed).toBe(true); expect(JSON.parse(B.st.idb!).state.pendingOfflineEggs).toBe(0);
      B.free(); const r1 = B.boot(b, T0 + 5000); expect(r1.g.offline.eggs).toBe(0); check('S4 reload1', r1.g, G, { via: r1.via });
    });
    if (fx === 'EXP1') it('EXP1 S5 grant pending + explainer flag save fails (mirrorOnFail:false) + revert mirrored: one grant, no seen=true in IDB, card once on reload', () => {
      const B = browser(ls as any, idb as any); B.st.failWhen = v => v.includes('"seenTracksExplainer":true');
      const a = B.boot(b, T0); const G = a.g.offline.eggs; expect(G).toBeGreaterThan(0); const n0 = B.st.mirrorWrites.length;
      expect(a.g.tracksMigratedWithBackup).toBe(true); expect(showTracksExplainer(a.g, document, () => a.g.storageFailed), 'no card while the flag write fails').toBeNull();
      const during = B.st.mirrorWrites.slice(n0); expect(during.some(r => r.includes('"seenTracksExplainer":true')), 'no mirror write with seen=true').toBe(false);
      expect(during.length, 'only the revert save reached the mirror').toBe(1); expect(JSON.parse(B.st.idb!).state.pendingOfflineEggs).toBe((s0.state.pendingOfflineEggs ?? 0) + G);
      check('S5 session (pending)', a.g, G, { mirrorWritesDuringFlag: during.length });
      B.free(); const r1 = B.boot(b, T0 + 5000); expect(r1.g.offline.eggs).toBe(0); let shown = 0; if (r1.g.tracksMigratedWithBackup && showTracksExplainer(r1.g, document, () => r1.g.storageFailed)) shown++;
      check('S5 reload1', r1.g, G, { via: r1.via, cards: shown }); expect(shown).toBe(1); expect(lsState(B.kv).seenTracksExplainer).toBe(true);
      document.body.innerHTML = ''; const r2 = B.boot(b, T0 + 10_000); expect(r2.g.tracksMigratedWithBackup && showTracksExplainer(r2.g, document)).toBeFalsy(); check('S5 reload2', r2.g, G, { via: r2.via });
    });
  }
  it('write evidence', () => { if (process.env.OQ2_OUT) writeFileSync(process.env.OQ2_OUT, JSON.stringify(rows, null, 1)); console.log('OQ2_ROWS ' + JSON.stringify(rows)); });
});
