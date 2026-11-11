// @vitest-environment jsdom
// M41-7 item 5 (HoQA GO dfdf49c): save/load/migration no-regression vs dd223f5. Run as tests/m41-7-save-noreg.qa.test.ts in BOTH
// worktrees (candidate + dd223f5 control) with NOREG_OUT=<json>; compare with m41-7-save-noreg-compare.mjs.
// Each fixture is booted the way main.ts boots it AT THAT SHA (dd223f5: reconcile, then new Game(idbBoot ok); dfdf49c: no reconcile,
// bootPreserveIdb, then new Game(idbBoot ok, idbCopy)), with a fixed clock, seed 1 and an injected migration id. Captures the state
// after load, the recovery, LS bytes, mirror writes, offline grant, the M4 in-session migration, a save round trip + reload, and
// (for any recovery with an Export button) the bytes the real dialog hands to the downloader.
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { balance as live } from '../src/config/balance';
import { Game } from '../src/game';
import * as SV from '../src/save/save';
import * as IM from '../src/save/idb-mirror';
import * as UI from '../src/ui/save-recovery';
const Q = '/workspace/egg-farm-studio/qa';
const NEW = typeof (IM as any).bootPreserveIdb === 'function';
const sha = (s: unknown) => s == null ? null : createHash('sha256').update(typeof s === 'string' ? s : JSON.stringify(s)).digest('hex');
const ON = structuredClone(live); ON.m4!.enabled = 1; const OFF = structuredClone(live); OFF.m4!.enabled = 0;
type Fx = { id: string; ls: Record<string, string>; idb: unknown; src: string };
const fx: Fx[] = [];
const add = (id: string, src: string, ls: Record<string, string>, idb: unknown = null) => fx.push({ id, src, ls, idb });
const dirs: [string, string][] = [[`${Q}/wt-m41-7-dfdf49c/tests/fixtures/saves`, 'tests/fixtures/saves'], [`${Q}/wt-m41-7-dfdf49c/tests/fixtures/csr-idb1`, 'tests/fixtures/csr-idb1'],
  [`${Q}/csr/fixtures`, 'qa/csr/fixtures'], [`${Q}/m41/csr-fixtures/raw`, 'qa/m41/csr-fixtures/raw'], [`${Q}/m3-fixtures/saves`, 'qa/m3-fixtures/saves'], [`${Q}/m3-recheck/gate4-fixtures`, 'qa/m3-recheck/gate4-fixtures']];
for (const [d, tag] of dirs) {
  if (!existsSync(d)) continue;
  for (const f of readdirSync(d).sort()) {
    if (!/\.(json|raw|txt)$/.test(f) || /SHA256SUMS|README|\.v6_backup\.json$/.test(f)) continue;
    const txt = readFileSync(`${d}/${f}`, 'utf8'); let j: any = undefined; try { j = JSON.parse(txt); } catch { /* raw bytes */ }
    if (tag === 'tests/fixtures/csr-idb1') { add(`${tag}/${f}#idb-only`, tag, {}, f.endsWith('.value.json') ? j : txt); continue; } // IDB main values
    if (j && typeof j === 'object' && j.ls && typeof j.ls === 'object') { add(`${tag}/${f}`, tag, j.ls, j.idb?.main ?? null); continue; }
    add(`${tag}/${f}`, tag, { [SV.SAVE_KEY]: txt });
    const v6 = `${d}/${f.replace(/\.json$/, '.v6_backup.json')}`;
    if (existsSync(v6)) add(`${tag}/${f}+v6_backup`, tag, { [SV.SAVE_KEY]: txt, [SV.V6_BACKUP_KEY]: readFileSync(v6, 'utf8') });
  }
}
// Fallback chain scenarios (5b/5c): corrupt main -> .bak -> IndexedDB -> fresh (export keeps the old bytes).
const R = (f: string) => readFileSync(`${Q}/m41/csr-fixtures/raw/${f}`, 'utf8');
const MAIN = R('MAIN-L17-badsum.json'), BAK = R('BAK-valid-F20-seq6.json'), BADBAK = R('BAK-invalid-neg1.json'), IDB = R('IDB-valid-F17-seq4-T-10m.json');
const TRUNC = R('TRIG-parse-truncated.raw');
add('chain/main-corrupt+bak-valid+idb-valid', 'chain', { [SV.SAVE_KEY]: MAIN, [SV.BAK_KEY]: BAK }, IDB);
add('chain/main-corrupt+bak-valid+idb-absent', 'chain', { [SV.SAVE_KEY]: MAIN, [SV.BAK_KEY]: BAK }, null);
add('chain/main-corrupt+bak-invalid+idb-valid', 'chain', { [SV.SAVE_KEY]: MAIN, [SV.BAK_KEY]: BADBAK }, IDB);
add('chain/main-corrupt+no-bak+idb-valid', 'chain', { [SV.SAVE_KEY]: MAIN }, IDB);
add('chain/main-corrupt+no-bak+no-idb (fresh)', 'chain', { [SV.SAVE_KEY]: MAIN }, null);
add('chain/main-truncated+no-bak+no-idb (fresh)', 'chain', { [SV.SAVE_KEY]: TRUNC }, null);
add('chain/main-corrupt+bak-invalid+no-idb (fresh)', 'chain', { [SV.SAVE_KEY]: MAIN, [SV.BAK_KEY]: BADBAK }, null);
add('chain/valid-main+older-bak', 'chain', { [SV.SAVE_KEY]: R('BAK-valid-F20-seq6.json'), [SV.BAK_KEY]: R('BAK-valid-F20-seq4-older.json') }, null);
add('chain/valid-main-seq4+newer-idb-seq6 (stale LS)', 'chain', { [SV.SAVE_KEY]: R('BAK-valid-F20-seq4-older.json') }, BAK);
const savedAtOf = (raw: string | undefined) => { try { const v = JSON.parse(raw!).savedAt; return typeof v === 'number' && v > 1.6e12 ? v : null; } catch { return null; } };
const DEFAULT_T = 1792400000000;
function browser(ls: Record<string, string>, idb: unknown, opts: { quota?: boolean } = {}) {
  const m = new Map(Object.entries(ls)); const st = { idb, idbCorrupt: [] as unknown[], mirrorWrites: [] as string[], quotaHits: 0 };
  const kv = { m, getItem: (k: string) => m.get(k) ?? null, removeItem: (k: string) => void m.delete(k), key: (i: number) => [...m.keys()][i] ?? null, get length() { return m.size; },
    setItem: (k: string, v: string) => { if (opts.quota && k.startsWith('eggfarm.save')) { st.quotaHits++; const e: any = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } m.set(k, String(v)); } } as any;
  const mirror = () => ({ write: (r: string) => { st.mirrorWrites.push(r); st.idb = r; }, clear: async () => { st.idb = null; }, newer: null, onNewer: null,
    preserveCorrupt: async (v: unknown) => { st.idbCorrupt.push(v); return true; } } as any);
  return { kv, st, mirror };
}
async function boot(B: ReturnType<typeof browser>, b: typeof ON, T: number) {
  const idbRaw = typeof B.st.idb === 'string' ? B.st.idb : null; const mirror = B.mirror(); let via: unknown = null, idbCopy: unknown = 'n/a';
  if (NEW) { idbCopy = await (IM as any).bootPreserveIdb(mirror, { status: 'ok', raw: B.st.idb }, b, T);
    return { g: new Game(b, B.kv, () => T, 1, 'qa', idbCopy === 'failed' ? null : mirror, B.st.idb, { idbBoot: 'ok', idbCopy, newId: () => 'qa-mig-id' } as any), via, idbCopy }; }
  try { via = (IM as any).reconcile(B.kv, idbRaw, b, T); } catch (e) { via = 'throw:' + (e as Error).message; }
  return { g: new Game(b, B.kv, () => T, 1, 'qa', mirror, idbRaw, { idbBoot: 'ok', newId: () => 'qa-mig-id' } as any), via, idbCopy };
}
const lsSnap = (kv: any) => Object.fromEntries([...kv.m.entries()].filter(([k]: [string]) => k.startsWith('eggfarm.save')).map(([k, v]: [string, string]) => [k.replace(/corrupt\.\d+/, 'corrupt.<ts>'), sha(v)]));
const pick = (s: any) => s && ({ coins: s.coinsCents, basket: s.basket, pending: s.pendingOfflineEggs, F: s.farmLevel, C: s.collectionLevel, H: s.hensLevel, V: s.eggValueLevel,
  workers: Object.keys(s.workers ?? {}).sort().join(','), tracksV7: s.tracksV7 ?? null, v6BackupId: s.v6BackupId ?? null, seen: s.seenTracksExplainer ?? null });
async function exportVia(g: Game, T: number) {
  const rec = (g as any).recovery; if (!rec) return null;
  let got: string | null = null; document.body.innerHTML = '';
  const p = (UI.showRecoveryDialog as any)(rec, (f: string) => f, [], undefined, async (raw: string) => { got = raw; return true; }, { now: T, track: () => {} });
  const layer = document.querySelector('.recovery-layer') as HTMLElement | null; const btn = document.querySelector('#rcExport') as HTMLButtonElement | null;
  const out: any = { outcome: layer?.dataset.outcome ?? null, notice: layer?.dataset.notice ?? null, title: document.querySelector('#rcT')?.textContent ?? null, hasExport: !!btn, aria: btn?.getAttribute('aria-label') ?? null, label: btn?.textContent ?? null };
  if (btn) { btn.click(); await new Promise(r => setTimeout(r, 0)); out.exportSha = sha(got); out.exportLen = got === null ? null : (got as string).length; }
  (document.querySelector('#rcGo') as HTMLButtonElement | null)?.click(); await p; document.body.innerHTML = ''; return out;
}
async function run(f: Fx, b: typeof ON, mode: string, quota = false) {
  const main = f.ls[SV.SAVE_KEY]; const T = (savedAtOf(main) ?? savedAtOf(f.ls[SV.BAK_KEY]) ?? DEFAULT_T) + (mode === 'skew' ? -3600_000 : 2 * 3600_000);
  const B = browser(f.ls, f.idb, { quota }); const r: any = { id: f.id, mode, T, inMainSha: sha(main ?? null) };
  try {
    const { g, via, idbCopy } = await boot(B, b, T); const rec = (g as any).recovery;
    r.via = via; r.idbCopy = idbCopy; r.isNewGame = g.isNewGame; r.readOnly = (g as any).readOnly ?? null; r.newerSave = g.newerSave ?? null; r.outcome = (g as any).recoveryOutcome ?? null;
    r.recovery = rec ? { case: rec.case, reason: rec.reason, had_backup: rec.had_backup, restored_from_backup: rec.restored_from_backup, copy_failed: rec.copy_failed, source: rec.source ?? null, store: rec.store ?? null, tried: rec.tried ?? null, rawSha: sha(rec.raw || null) } : null;
    r.stateSha = sha(g.state); r.pick = pick(g.state); r.offline = (g as any).offline ?? null; r.storageFailed = (g as any).storageFailed ?? null; r.pendingMig = !!(g as any).tracksMigrationPending;
    r.lsAfterLoad = lsSnap(B.kv); r.mirrorWritesAtLoad = B.st.mirrorWrites.length; r.mirrorLastSha = sha(B.st.mirrorWrites.at(-1) ?? null); r.idbCorrupt = B.st.idbCorrupt.map(v => sha(typeof v === 'string' ? v : JSON.stringify(v)));
    const corruptKeys = [...B.kv.m.keys()].filter((k: string) => /^eggfarm\.save\.corrupt\.\d/.test(k)); r.corruptLsShas = corruptKeys.map((k: string) => sha(B.kv.m.get(k))).sort();
    r.telemetry = (() => { try { const t = JSON.parse(g.telemetry.snapshotJSON()); return (t.events ?? t.queue ?? []).map((e: any) => e.name ?? e.type ?? e.event); } catch { return 'n/a'; } })();
    r.dialog = await exportVia(g, T);
    if (r.pendingMig) { try { r.mig = await (g as any).startTracksMigration(); } catch (e) { r.mig = 'throw:' + (e as Error).message; } r.pickAfterMig = pick(g.state); r.stateShaAfterMig = sha(g.state); r.v6BackupStored = !!B.kv.getItem(SV.V6_BACKUP_KEY); }
    if (!quota && !r.readOnly && r.newerSave === null) { g.save(); r.savedMainSha = sha(B.kv.getItem(SV.SAVE_KEY)); const r2 = await boot(B, b, T + 1000); r.reload = { stateSha: sha(r2.g.state), pick: pick(r2.g.state), recovery: (r2.g as any).recovery ? (r2.g as any).recovery.case : null, offline: (r2.g as any).offline?.eggs ?? null };
      r.reloadLossless = JSON.stringify(r.reload.pick) === JSON.stringify(pick(g.state)); }
    if (quota) r.quotaHits = B.st.quotaHits;
  } catch (e) { r.error = String((e as Error)?.stack ?? e).slice(0, 400); }
  return r;
}
const out: any[] = [];
afterEach(() => { document.body.innerHTML = ''; });
describe(`M41-7 save no-regression (${NEW ? 'candidate loader' : 'dd223f5 loader'})`, () => {
  it('constants', () => { out.push({ id: '#constants', SAVE_VERSION: SV.SAVE_VERSION, SAVE_KEY: SV.SAVE_KEY, BAK_KEY: SV.BAK_KEY, V6_BACKUP_KEY: SV.V6_BACKUP_KEY, NEW, fixtures: fx.length }); expect(fx.length).toBeGreaterThan(60); });
  for (const f of fx) it(f.id, async () => {
    out.push(await run(f, ON, 'on')); out.push(await run(f, OFF, 'off'));
    if (f.src === 'tests/fixtures/saves' || f.src === 'qa/m3-recheck/gate4-fixtures' || f.src === 'qa/m3-fixtures/saves') { out.push(await run(f, ON, 'skew')); out.push(await run(f, ON, 'quota', true)); }
  }, 30_000);
  it('write output', () => { writeFileSync(process.env.NOREG_OUT ?? '/tmp/noreg.json', JSON.stringify(out, null, 1)); console.log(`NOREG ${NEW ? 'candidate' : 'dd223f5'} rows=${out.length} errors=${out.filter(r => r.error).length}`); });
});
