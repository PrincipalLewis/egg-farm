// Critic m4b triage, Item A: idle coin drain on a migrated save. Deterministic node repro with the shipped code.
//   npx vite-node --root <qa/scratch/triage-m4b/dd223f5> critic-m4b-triage-a.ts -- <outDir>
import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const R = '/workspace/egg-farm-studio/qa/scratch/triage-m4b';
import { balance as bOld } from '/workspace/egg-farm-studio/qa/scratch/triage-m4b/dd52bfd/src/config/balance';
import { Game as GameOld } from '/workspace/egg-farm-studio/qa/scratch/triage-m4b/dd52bfd/src/game';
import * as FOld from '/workspace/egg-farm-studio/qa/scratch/triage-m4b/dd52bfd/src/config/formulas';
import { SAVE_KEY as SK_OLD } from '/workspace/egg-farm-studio/qa/scratch/triage-m4b/dd52bfd/src/save/save';
import { balance as bNew } from '/workspace/egg-farm-studio/qa/scratch/triage-m4b/dd223f5/src/config/balance';
import { Game as GameNew } from '/workspace/egg-farm-studio/qa/scratch/triage-m4b/dd223f5/src/game';
import * as FNew from '/workspace/egg-farm-studio/qa/scratch/triage-m4b/dd223f5/src/config/formulas';
import { SAVE_KEY, V6_BACKUP_KEY } from '/workspace/egg-farm-studio/qa/scratch/triage-m4b/dd223f5/src/save/save';
import { trackCost, trackLock } from '/workspace/egg-farm-studio/qa/scratch/triage-m4b/dd223f5/src/sim/tracks';
import { mood } from '/workspace/egg-farm-studio/qa/scratch/triage-m4b/dd223f5/src/sim/workers';
const out = process.argv[process.argv.length - 1]; mkdirSync(out, { recursive: true });
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
if (bOld.m4.enabled || !bNew.m4.enabled) throw new Error('flags: expect dd52bfd m4 off, dd223f5 m4 on');
const mkKv = (init?: Map<string, string>) => { const m = new Map(init ?? []); return { m, kv: { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } }; };
const T0 = Date.UTC(2026, 9, 19, 7, 0, 0);
// Bot: tap-collect every 1.5 s, sell all, hire Market Hand at F3, buy Farm, else Collection (and tracks on m4) when cheap.
function playTo(g: any, F: any, b: any, clock: { t: number }, m4: boolean, targetF = 6) {
  let tapCd = 0;
  for (let i = 0; i < 20 * 60 * 10; i++) {
    clock.t += 100; g.frame(); tapCd -= 0.1;
    const s = g.state;
    if (tapCd <= 0) { g.dispatch({ type: 'collect' }); tapCd = 1.5; }
    g.dispatch({ type: 'sellAll' });
    if (!g.state.workers.market_hand && g.state.farmLevel >= 3) g.dispatch({ type: 'hire', worker: 'market_hand' });
    if (g.state.farmLevel < targetF) g.dispatch({ type: 'buyFarm' });
    const fc = F.farmCost(g.state.farmLevel, b) * 100, cc = F.collectionCost(g.state.collectionLevel, b) * 100;
    if (cc < fc / 3 && g.state.coinsCents >= cc) g.dispatch({ type: 'buyCollection' });
    if (m4) for (const t of ['hens', 'eggValue'] as const) if (!trackLock(g.state, t, b) && trackCost(t === 'hens' ? g.state.hensLevel : g.state.eggValueLevel, t, b) * 100 < fc / 3) g.dispatch({ type: 'buyTrack', track: t });
    if (g.state.farmLevel >= targetF && g.state.workers.market_hand) return i;
  }
  throw new Error('bot did not reach target');
}
// Idle: no taps; wall clock advances 100 ms per frame (same path as the browser rAF loop). Per-second samples + event sums.
function idle(g: any, b: any, clock: { t: number }, secs: number, label: string) {
  const rows: any[] = []; let ev: any[] = []; const off = g.on((e: any) => ev.push(e));
  const snap = (sec: number) => { const s = g.state, w = s.workers.market_hand;
    const wage = ev.filter(e => e.type === 'wage').reduce((a, e) => a + e.cents, 0), sold = ev.filter(e => e.type === 'sell').reduce((a, e) => a + e.value, 0);
    const other = ev.filter(e => !['wage', 'sell', 'customer_arrive', 'customer_lost', 'customer_partial', 'customer_served', 'worker_state', 'worker_yawn', 'coop_full'].includes(e.type)).map(e => e.type);
    rows.push({ sec, coinsCents: s.coinsCents, wageCents: wage, saleCents: sold, other, basket: Math.floor(s.basket), coop: Math.floor(s.coop), customers: s.customers.length,
      mh: w ? { energy: Math.round(w.energy * 10) / 10, mood: mood(w, b), cdS: Math.round(w.cdS * 100) / 100 } : null, wageFrac: s.wageFracCents?.market_hand ?? null }); ev = []; };
  snap(0);
  for (let sec = 1; sec <= secs; sec++) { for (let k = 0; k < 10; k++) { clock.t += 100; g.frame(); } snap(sec); }
  off();
  const c0 = rows[0].coinsCents, c1 = rows[rows.length - 1].coinsCents, w = rows.reduce((a, r) => a + r.wageCents, 0), sl = rows.reduce((a, r) => a + r.saleCents, 0);
  const firstNoSale = rows.findIndex((r, i) => i > 0 && r.basket === 0);
  const tail = rows.slice(Math.max(1, firstNoSale)), tailRate = tail.length > 1 ? (tail[tail.length - 1].coinsCents - tail[0].coinsCents) / (tail.length - 1) : null;
  const sum = { label, secs, farmLevel: g.state.farmLevel, mh: !!g.state.workers.market_hand, startCents: c0, endCents: c1, deltaCents: c1 - c0, wageCentsTotal: w, saleCentsTotal: sl,
    unexplainedCents: (c1 - c0) - (sl - w), basketEmptyAtSec: firstNoSale, centsPerSecAfterBasketEmpty: tailRate,
    expectedWageCentsPerSec: g.state.workers.market_hand ? b.workers.market_hand.wage_per_farm_per_min * g.state.farmLevel / 60 * 100 : 0 };
  writeFileSync(`${out}/${label}-idle.json`, JSON.stringify({ summary: sum, rows }, null, 1));
  return sum;
}
const results: any = {};
// 1) dd52bfd save at F6 with Market Hand, written by dd52bfd's own Game/save code (M4 off, shipped pre-m4b build).
const ck = { t: T0 - 3_600_000 }; const A = mkKv();
const gOld = new GameOld(bOld, A.kv, () => ck.t, 11, 'qa-dd52bfd');
const frames = playTo(gOld, FOld, bOld, ck, false);
gOld.save(); const rawOld = A.kv.getItem(SK_OLD)!;
const fx = { id: 'A1-dd52bfd-F6-marketHand', build: 'dd52bfd (M4 off)', bot: `fresh seed 11, ${frames} frames x100 ms`, ls: Object.fromEntries(A.m), savedAt: JSON.parse(rawOld).savedAt, state: JSON.parse(rawOld).state };
writeFileSync(`${out}/A1-dd52bfd-F6-marketHand.json`, JSON.stringify(fx, null, 1));
results.fixture = { file: 'A1-dd52bfd-F6-marketHand.json', mainSha256: sha(rawOld), farmLevel: fx.state.farmLevel, coinsCents: fx.state.coinsCents, workers: fx.state.workers, keys: Object.keys(fx.state) };
// 1b) control (c): the same save idling on dd52bfd itself (pre-m4b behaviour).
{ const c = { t: ck.t }; const K = mkKv(new Map(A.m)); const g = new GameOld(bOld, K.kv, () => c.t, 11, 'qa-dd52bfd'); results.c_dd52bfd_idle = idle(g, bOld, c, 180, 'C-dd52bfd-same-save'); }
// 2) migrated: open the dd52bfd storage in m4b (dd223f5 code, M4 on), commit the tracks migration, then idle.
const cm = { t: ck.t + 5000 }; const M = mkKv(new Map(A.m));
const gM = new GameNew(bNew, M.kv, () => cm.t, 11, 'm3-rc1-pre+246de09');
const mig = await gM.startTracksMigration();
results.migration = { outcome: mig, tracksV7: gM.state.tracksV7, v6BackupId: gM.state.v6BackupId, hasBackup: !!M.kv.getItem(V6_BACKUP_KEY), refund: gM.migrationRefundCents,
  before: { coins: fx.state.coinsCents, workers: fx.state.workers, wageFracCents: fx.state.wageFracCents }, after: { coins: gM.state.coinsCents, workers: gM.state.workers, wageFracCents: gM.state.wageFracCents, hens: gM.state.hensLevel, eggValue: gM.state.eggValueLevel } };
const migRaw = M.kv.getItem(SAVE_KEY)!; writeFileSync(`${out}/A2-migrated-m4b-main.json`, migRaw); results.migration.mainSha256 = sha(migRaw);
results.A_migrated_idle = idle(gM, bNew, cm, 180, 'A-migrated-m4b');
// 3) control (b): same migrated save, Market Hand removed.
{ const c = { t: ck.t + 5000 }; const K = mkKv(new Map(A.m)); const g = new GameNew(bNew, K.kv, () => c.t, 11, 'm3-rc1-pre+246de09'); await g.startTracksMigration();
  const { market_hand, ...rest } = g.state.workers; g.state = { ...g.state, workers: rest }; results.b_migrated_noMH_idle = idle(g, bNew, c, 180, 'B-migrated-m4b-noMarketHand'); }
// 4) control (a): FRESH m4b farm (M4 on from creation) played to F6 with Market Hand, then idle.
{ const c = { t: T0 }; const K = mkKv(); const g = new GameNew(bNew, K.kv, () => c.t, 11, 'm3-rc1-pre+246de09'); const n = playTo(g, FNew, bNew, c, true);
  results.a_fresh = { frames: n, tracksV7: g.state.tracksV7, hasBackup: !!K.kv.getItem(V6_BACKUP_KEY) }; results.a_fresh_idle = idle(g, bNew, c, 180, 'A0-fresh-m4b'); }
writeFileSync(`${out}/summary.json`, JSON.stringify(results, null, 1));
console.log(JSON.stringify(results, null, 1));
