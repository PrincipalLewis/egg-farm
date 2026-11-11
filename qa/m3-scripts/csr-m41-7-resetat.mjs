// M41-7 -07(b) browser gate, KEY MEMBERSHIP (D-HOP-2026-10-22-07 (b) as amended by D-HOP-2026-10-23-01; spec 2fbcd4eb line 28). Saves QA 2026-10-23.
// Real UI Reset (#settings -> #sReset -> #cReset) = resetProgress(localStorage) + IdbMirror.clear(): ONE IDB tx deletes main and writes
// 'reset.surfaced' = the corrupt.* keys present. Real IndexedDB. HARD unless tagged INFO.
//  AC1 pre-reset copy -> no dialog x loads; AC2 post-reset corrupt main -> chain (M1/M3 + Export bytes); AC3 = AC1 with the clock rolled back
//  >= 1 day (Date shim, page clock only); AC4 forced abort of the Reset tx (throw inside the tx / tx.abort() quota stub / delete path)
//  -> part 1 IDB main, corrupt.* and reset.surfaced unchanged (dumped before the next boot runs), part 2 next boot = the pre-reset boot;
//  CLK clock ahead (+2 h) at Reset, then rolled back: post-reset corrupt main still follows the chain. LS eggfarm.save.reset_at must never appear (VOID).
// usage: flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node csr-m41-7-resetat.mjs <worktree> <port 5961-5964> <outdir> [sha7] [engine]
//        node csr-m41-7-resetat.mjs --dry-run       ONLY=<case-id prefixes>
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';
const DRY = process.argv.includes('--dry-run');
const [W0, P = '5961', OUT, SHA7 = '', E = 'chromium'] = process.argv.slice(2).filter(a => a !== '--dry-run');
const FX = '/workspace/egg-farm-studio/qa/m41/csr-fixtures/raw/'; const raw = n => fs.readFileSync(FX + n, 'utf8');
const RS = 'reset.surfaced', RA = 'eggfarm.save.reset_at', CP = 'eggfarm.save.corrupt.', CIDX = 'eggfarm.save.corrupt.index';
const LS_JUNK = raw('PRIOR-corrupt-1.raw'), IDB_JUNK = raw('IDB-invalid-truncated.raw'), VALID = raw('BAK-valid-F20-seq6.json'), MAIN_BAD = raw('MAIN-OQ1-abc.json'), BAK_BAD = raw('BAK-invalid-neg1.json');
const H = 3600_000, D = 86400_000, PRIOR = ['corrupt.1700000000000'];
const ac1 = t0 => ({ ls: { 'eggfarm.save': VALID, [CP + (t0 - 2 * H)]: LS_JUNK, [CIDX]: JSON.stringify([CP + (t0 - 2 * H)]) }, idb: { main: VALID, ['corrupt.' + (t0 - 2 * H)]: IDB_JUNK } });
const clk = t0 => ({ ls: { 'eggfarm.save': VALID }, idb: { main: VALID, ['corrupt.' + (t0 + 5000)]: IDB_JUNK } }); // t0 = page clock (+2 h ahead) at seed
// post(t0r): applied by the init script on the load AFTER the post-reset fresh-farm load (t0r = real clock); {ls:{k:v|null}, idb:{k:v|null}}
const CASES = [
  { id: 'BRS-AC1-ui-reset-ls+idb-copy', seed: ac1, loads: 3 },
  { id: 'BRS-AC1-ui-reset-3-idb-copies', seed: t0 => ({ ls: { 'eggfarm.save': VALID }, idb: { main: VALID, ['corrupt.' + (t0 - 3 * H)]: IDB_JUNK, ['corrupt.' + (t0 - 2 * H)]: IDB_JUNK + ' ', ['corrupt.' + (t0 - H)]: IDB_JUNK + '  ' } }), loads: 3 },
  { id: 'BRS-AC1-ui-reset-no-copies', seed: () => ({ ls: { 'eggfarm.save': VALID }, idb: { main: VALID } }), loads: 2, noCopies: true },
  { id: 'BRS-AC3-rollback-1d', seed: ac1, offAfter: -D - 60_000, loads: 3 },
  { id: 'BRS-AC3-rollback-30d', seed: ac1, offAfter: -30 * D, loads: 3 },
  { id: 'BRS-AC3-clock-ahead-1d-at-copy+reset-then-back-1d', offSeed: D, seed: t0 => ({ ls: { 'eggfarm.save': VALID }, idb: { main: VALID, ['corrupt.' + (t0 - 60_000)]: IDB_JUNK } }), offAfter: -D, loads: 3 },
  { id: 'BRS-AC2-post-reset-idb-orphan-8b-M3-export', seed: ac1, post: t => ({ ls: { 'eggfarm.save': null, 'eggfarm.save.bak': null }, idb: { main: null, ['corrupt.' + (t - 10 * 60_000)]: IDB_JUNK + 'x' } }), want: 'M3', exportWant: IDB_JUNK + 'x' },
  { id: 'BRS-AC2-post-reset-ls-main-corrupt-bak-valid-M1', seed: ac1, post: () => ({ ls: { 'eggfarm.save': MAIN_BAD, 'eggfarm.save.bak': VALID }, idb: { main: null } }), want: 'M1' },
  { id: 'BRS-CLK-ahead2h-reset-back-idb-main-corrupt-M3-export', offSeed: 2 * H, seed: clk, offAfter: 0, post: () => ({ ls: { 'eggfarm.save': null, 'eggfarm.save.bak': null }, idb: { main: IDB_JUNK + 'y' } }), want: 'M3', exportWant: IDB_JUNK + 'y' },
  { id: 'BRS-CLK-ahead2h-reset-back-idb-orphan-T+1h-M3-export', offSeed: 2 * H, seed: clk, offAfter: 0, post: t => ({ ls: { 'eggfarm.save': null, 'eggfarm.save.bak': null }, idb: { main: null, ['corrupt.' + (t + H)]: IDB_JUNK + 'z' } }), want: 'M3', exportWant: IDB_JUNK + 'z' },
  { id: 'BRS-CLK-ahead2h-reset-back-ls-main-corrupt-bak-valid-M1', offSeed: 2 * H, seed: clk, offAfter: 0, post: () => ({ ls: { 'eggfarm.save': MAIN_BAD, 'eggfarm.save.bak': VALID }, idb: { main: null } }), want: 'M1' },
  { id: 'BRS-CLK-ahead2h-reset-back-ls-main-corrupt-nothing-valid-M3', offSeed: 2 * H, seed: clk, offAfter: 0, post: () => ({ ls: { 'eggfarm.save': MAIN_BAD, 'eggfarm.save.bak': BAK_BAD }, idb: { main: null } }), want: 'M3' },
  { id: 'BRS-AC4-throw-inside-reset-tx', seed: t0 => ({ ...ac1(t0), idb: { ...ac1(t0).idb, [RS]: PRIOR } }), fault: 'throwPut' },
  { id: 'BRS-AC4-abort()-quota-stub-at-reset.surfaced-put', seed: t0 => ({ ...ac1(t0), idb: { ...ac1(t0).idb, [RS]: PRIOR } }), fault: 'abortPut' },
  { id: 'BRS-AC4-throw-delete-path-no-idb-copies', seed: () => ({ ls: { 'eggfarm.save': VALID }, idb: { main: VALID, [RS]: PRIOR } }), fault: 'throwDel' },
  { id: 'BRS-AC4-control-no-fault', seed: t0 => ({ ...ac1(t0), idb: { ...ac1(t0).idb, [RS]: PRIOR } }), fault: 'control' },
].filter(c => !process.env.ONLY || process.env.ONLY.split(',').some(x => c.id.startsWith(x)));
if (DRY) { const t0 = Date.now(); for (const c of CASES) { const s = c.seed(t0 + (c.offSeed ?? 0)); console.log(`DRY ${c.id}: want=${c.want ?? '-'} fault=${c.fault ?? '-'} offSeed=${c.offSeed ?? 0} offAfter=${c.offAfter ?? 0} post=${!!c.post} ls=${Object.keys(s.ls).map(k => k.replace(/\d{13}/, '<ts>')).join(',')} idb=${Object.keys(s.idb).map(k => k.replace(/\d{13}/, '<ts>')).join(',')}`); } console.log('DRY OK'); process.exit(0); }
if (!['5961', '5962', '5963', '5964'].includes(P)) throw new Error('port must be 5961-5964');
const pw = await import('playwright-core'); const W = path.resolve(W0); fs.mkdirSync(OUT, { recursive: true });
const INIT = ({ ls, idb, offSeed }) => {
  const set = Storage.prototype.setItem, RD = Date;
  if (offSeed && !sessionStorage.getItem('qa.off.set')) { sessionStorage.setItem('qa.off', String(offSeed)); sessionStorage.setItem('qa.off.set', '1'); }
  const off = +(sessionStorage.getItem('qa.off') ?? 0); if (off) { class QD extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } } window.Date = QD; }
  const openDb = () => new Promise((res, rej) => { const r = indexedDB.open('eggfarm', 1); r.onupgradeneeded = () => r.result.createObjectStore('save'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const dumpIdb = async () => { const db = await openDb(); const out = {}; await new Promise(res => { const c = db.transaction('save').objectStore('save').openCursor(); c.onsuccess = () => { const k = c.result; if (k) { out[k.key] = k.value; k.continue(); } else res(); }; c.onerror = () => res(); }); db.close(); return out; };
  window.__dumpIdb = dumpIdb;
  const apply = async (m) => { for (const [k, v] of Object.entries(m.ls ?? {})) v === null ? localStorage.removeItem(k) : set.call(localStorage, k, v);
    const ks = Object.keys(m.idb ?? {}); if (!ks.length) return; const db = await openDb(); await new Promise(res => { const t = db.transaction('save', 'readwrite'); for (const k of ks) m.idb[k] === null ? t.objectStore('save').delete(k) : t.objectStore('save').put(m.idb[k], k); t.oncomplete = res; t.onerror = res; }); db.close(); };
  const first = !sessionStorage.getItem('qa.seeded');
  window.__seeded = (async () => {
    if (first) { localStorage.clear(); for (const [k, v] of Object.entries(ls)) set.call(localStorage, k, v); sessionStorage.setItem('qa.seeded', '1');
      await new Promise(r => { const d = indexedDB.deleteDatabase('eggfarm'); d.onsuccess = d.onerror = d.onblocked = () => r(); }); await apply({ idb }); }
    const pend = sessionStorage.getItem('qa.post'); if (pend) { sessionStorage.removeItem('qa.post'); await apply(JSON.parse(pend)); }
    window.__initDump = await dumpIdb(); window.__initLs = Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]));
  })();
  // AC4 fault hooks: active only while sessionStorage qa.fault is set; touch only the reset.surfaced key (written only by IdbMirror.clear)
  const put = IDBObjectStore.prototype.put, del = IDBObjectStore.prototype.delete; window.__ops = [];
  IDBObjectStore.prototype.put = function (v, k) { window.__ops.push(`put:${k}`); const f = sessionStorage.getItem('qa.fault');
    if (k === 'reset.surfaced' && f === 'throwPut') { window.__ops.push('FAULT:throw'); sessionStorage.setItem('qa.faultFired', 'throwPut'); throw new DOMException('qa throw inside reset tx', 'UnknownError'); }
    if (k === 'reset.surfaced' && f === 'abortPut') { window.__ops.push('FAULT:abort'); sessionStorage.setItem('qa.faultFired', 'abortPut'); this.transaction.abort(); return undefined; }
    return put.call(this, v, k); };
  IDBObjectStore.prototype.delete = function (k) { window.__ops.push(`delete:${k}`); const f = sessionStorage.getItem('qa.fault');
    if (k === 'reset.surfaced' && f === 'throwDel') { window.__ops.push('FAULT:throwDel'); sessionStorage.setItem('qa.faultFired', 'throwDel'); throw new DOMException('qa throw inside reset tx', 'UnknownError'); }
    return del.call(this, k); };
  const q = window.__q = { dialogs: [] }; sessionStorage.setItem('qa.loads', String(+(sessionStorage.getItem('qa.loads') ?? 0) + 1));
  new MutationObserver(() => { const L = document.querySelector('.recovery-layer'); if (L && !q.dialogs.includes(L)) { q.dialogs.push(L); sessionStorage.setItem('qa.dialogs', (sessionStorage.getItem('qa.dialogs') ?? '') + (L.dataset.notice ?? '?') + ','); } }).observe(document, { childList: true, subtree: true });
};
const srv = spawn(`${W}/node_modules/.bin/vite`, ['preview', '--outDir', 'dist-qa', '--port', P, '--strictPort', '--host', '127.0.0.1'], { cwd: W, stdio: 'ignore', detached: true });
const res = { port: P, engine: E, cases: {} }; let fails = 0; const J = v => JSON.stringify(v ?? null);
try {
  for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${P}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
  const br = await pw[E].launch(E === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : E === 'firefox' ? { executablePath: '/home/box/.cache/ms-playwright/firefox-1555/firefox/firefox' } : { executablePath: '/home/box/.cache/ms-playwright/webkit-2370/pw_run.sh' });
  for (const c of CASES) {
    const tag = c.id; const r = (res.cases[tag] = { checks: [], loads: [] });
    const ok = (n, v, x, hard = true) => { r.checks.push({ n, pass: !!v, x, hard }); if (!v && hard) fails++; console.log(`${v ? 'PASS' : hard ? 'FAIL' : 'INFO'} ${tag}: ${n} ${J(x).slice(0, 300)}`); };
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    const t0 = Date.now() + (c.offSeed ?? 0); const s = c.seed(t0);
    const start = async () => { await p.evaluate(() => window.__seeded); const t = p.getByText('Tap to start'); if (await t.isVisible().catch(() => false)) await t.click(); await p.waitForFunction(() => window.eggfarm, null, { timeout: 15000 }); };
    const welcome = async () => { const wb = await p.locator('#modal-layer.open #wbCollect').waitFor({ state: 'visible', timeout: 4000 }).then(() => true, () => false); if (wb) { await p.locator('#wbCollect').click(); await p.waitForFunction(() => !document.querySelector('#modal-layer.open'), null, { timeout: 5000 }).catch(() => {}); } return wb; };
    const dialogNow = async () => { const v = await p.locator('.recovery-layer').waitFor({ state: 'visible', timeout: 6000 }).then(() => true, () => false); return v ? await p.evaluate(() => document.querySelector('.recovery-layer')?.dataset.notice ?? '?') : null; };
    const closeDialog = async () => { await p.locator('#rcGo').click({ timeout: 3000 }).catch(() => {}); await p.waitForFunction(() => !document.querySelector('.recovery-layer'), null, { timeout: 5000 }).catch(() => {}); };
    const tel = () => p.evaluate(() => { try { return JSON.parse(window.eggfarmExportTelemetry()).events.map(e => e.type); } catch { return []; } });
    let evMark = 0; const bootObs = async (L) => { const d = await dialogNow(); const ev = await tel(); const mine = ev.slice(evMark).filter(t => /^(save_corrupt|save_restore|save_restored|save_recovery_notice)/.test(t)).sort(); evMark = ev.length;
      const st = await p.evaluate(() => ({ F: window.eggfarm?.state.farmLevel ?? null, newGame: window.eggfarm?.isNewGame ?? null, recovery: window.eggfarm?.recovery?.case ?? null }));
      const o = { L, dialog: d, ...st, ev: mine, lsResetAt: await p.evaluate(k => localStorage.getItem(k), RA), initDump: await p.evaluate(() => Object.keys(window.__initDump ?? {}).sort()) }; r.loads.push(o); return o; };
    const reset = async () => { await p.locator('#settings').click({ timeout: 5000 }); await p.locator('#sReset').click({ timeout: 5000 });
      await Promise.all([p.waitForEvent('load', { timeout: 10000 }).catch(() => null), p.locator('#cReset').click({ timeout: 5000 })]); };
    const idbNow = () => p.evaluate(() => window.__dumpIdb());
    try {
      await p.addInitScript(INIT, { ls: s.ls, idb: s.idb, offSeed: c.offSeed ?? 0 });
      await p.goto(`http://127.0.0.1:${P}/`); await start();
      if (!res.buildId) { res.buildId = await p.evaluate(() => document.querySelector('meta[name="build-id"]')?.content ?? null); console.log(`build-id ${res.buildId}`); }
      const o1 = await bootObs(1); ok('precondition: the seeded valid farm boots without a dialog', o1.dialog === null, o1); await welcome();
      const seededCorrupt = Object.keys(s.idb).filter(k => k.startsWith('corrupt.')).sort();
      if (c.fault) { // ---------- AC4 ----------
        await p.waitForTimeout(1500); await p.reload(); await start(); const base = await bootObs(2); await welcome(); await p.waitForTimeout(800);
        if (c.fault !== 'control') await p.evaluate(f => sessionStorage.setItem('qa.fault', f), c.fault);
        const pre = await idbNow(); const opsMark = await p.evaluate(() => window.__ops.length);
        await reset(); await p.evaluate(() => window.__seeded); const post = await p.evaluate(() => window.__initDump); // dumped by the init script BEFORE this boot can write
        await p.evaluate(() => sessionStorage.removeItem('qa.fault')); const fired = await p.evaluate(() => sessionStorage.getItem('qa.faultFired'));
        r.pre = Object.fromEntries(Object.entries(pre).map(([k, v]) => [k, typeof v === 'string' ? v.length : v])); r.post = Object.fromEntries(Object.entries(post).map(([k, v]) => [k, typeof v === 'string' ? v.length : v]));
        if (c.fault === 'control') { ok('control: no fault -> main deleted and reset.surfaced = corrupt.* keys present', !('main' in post) && J(post[RS]) === J(seededCorrupt), { post: r.post }); }
        else {
          ok(`AC4 precondition: the fault fired inside the Reset tx (${c.fault})`, fired === c.fault, fired);
          ok('AC4 part 1: IDB main byte-identical (no delete applied)', typeof pre.main === 'string' && post.main === pre.main, { pre: pre.main?.length, post: post.main?.length ?? 'ABSENT' });
          ok('AC4 part 1: every corrupt.* key and value unchanged', J(Object.entries(pre).filter(([k]) => k.startsWith('corrupt.'))) === J(Object.entries(post).filter(([k]) => k.startsWith('corrupt.'))), { pre: Object.keys(pre), post: Object.keys(post) });
          ok('AC4 part 1: reset.surfaced unchanged (prior record kept, not replaced)', J(post[RS]) === J(pre[RS]) && J(pre[RS]) === J(PRIOR), { pre: pre[RS], post: post[RS] });
          ok('AC4 part 1: whole IDB store identical before/after the aborted Reset', J(Object.entries(pre).sort()) === J(Object.entries(post).sort()), { pre: r.pre, post: r.post });
          await start(); const nx = await bootObs(3); r.lsAfterReset = Object.keys(await p.evaluate(() => window.__initLs)).sort();
          ok('AC4 part 2: next boot shows the same dialog as the pre-reset boot', nx.dialog === base.dialog && nx.recovery === base.recovery, { base: base.dialog, next: nx.dialog });
          ok('AC4 part 2: next boot has the same farm state (farmLevel, isNewGame)', nx.F === base.F && nx.newGame === base.newGame, { base: [base.F, base.newGame], next: [nx.F, nx.newGame] });
          ok('AC4 part 2: next boot after full cReset emits save_restore{idb} x1 and 0 save_corrupt (LS cleared by resetProgress before the aborted IDB tx; IDB main untouched)', J(nx.ev) === J(['save_restore']), { preResetBootEv: base.ev, nextAfterAbortedCResetEv: nx.ev });
          ok('INFO AC4: LS keys after the aborted Reset (resetProgress runs before, outside the IDB tx)', true, r.lsAfterReset, false);
        }
      } else { // ---------- AC1 / AC2 / AC3 / CLK ----------
        await p.waitForTimeout(800); if (c.offAfter !== undefined) await p.evaluate(o => sessionStorage.setItem('qa.off', String(o)), c.offAfter);
        await reset(); await p.evaluate(() => window.__seeded); const dump = await p.evaluate(() => window.__initDump);
        r.afterReset = { idbKeys: Object.keys(dump).sort(), surfaced: dump[RS] ?? null };
        ok('Reset: IDB main deleted', !('main' in dump), r.afterReset.idbKeys);
        ok(c.noCopies ? 'Reset: no corrupt.* -> no reset.surfaced record' : 'Reset: reset.surfaced = exactly the corrupt.* keys present at reset', c.noCopies ? !(RS in dump) : J(dump[RS]) === J(seededCorrupt), { surfaced: dump[RS] ?? null, want: c.noCopies ? 'absent' : seededCorrupt });
        ok('Reset: every seeded corrupt.* kept (LS + IDB)', seededCorrupt.every(k => dump[k] === s.idb[k]) && Object.entries(s.ls).filter(([k]) => k.startsWith(CP) && k !== CIDX).every(([k, v]) => true), seededCorrupt);
        if (c.offAfter !== undefined) { const skew = await p.evaluate(() => Date.now() - performance.timeOrigin - performance.now()); ok(`precondition: page clock rolled to ${c.offAfter} ms vs real`, Math.abs(skew - c.offAfter) < 5000, skew); }
        await start(); const ra = await bootObs(2);
        if (c.post) { ok('post-reset fresh farm boot: no dialog', ra.dialog === null, ra); await welcome(); await p.waitForTimeout(1500);
          await p.evaluate(m => sessionStorage.setItem('qa.post', m), J(c.post(Date.now())));
          await p.reload(); await start(); const o = await bootObs(3); ok(`AC2/CLK: post-reset corrupt main follows the chain: ${c.want}`, o.dialog === c.want, o);
          if (c.exportWant && o.dialog) { const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), p.locator('#rcExport').click({ timeout: 3000 }).catch(() => {})]);
            const bytes = dl ? fs.readFileSync(await dl.path()).toString('utf8') : null; ok('Export downloads the post-reset corrupt bytes', bytes === c.exportWant, { len: bytes?.length ?? null }); }
          await p.screenshot({ path: `${OUT}/${tag}-post-${o.dialog}.png` }); await closeDialog(); await welcome(); await p.waitForTimeout(6000);
          const sAfter = (await idbNow())[RS] ?? null; ok('reset.surfaced unchanged by the recovery', J(sAfter) === J(r.afterReset.surfaced), { sAfter });
          await p.reload(); await start(); const o4 = await bootObs(4); ok('next load: no repeat dialog', o4.dialog === null, o4);
        } else {
          for (let L = 2; L <= (c.loads ?? 3) + 1; L++) { const o = L === 2 ? ra : (await p.reload(), await start(), await bootObs(L));
            ok(`AC1/AC3 load ${L - 1} after Reset: no recovery dialog`, o.dialog === null, o); await p.screenshot({ path: `${OUT}/${tag}-load${L}.png` });
            const now = await idbNow(); ok(`load ${L - 1}: corrupt.* bytes kept and reset.surfaced unchanged`, seededCorrupt.every(k => now[k] === s.idb[k]) && J(now[RS] ?? null) === J(r.afterReset.surfaced), { keys: Object.keys(now) });
            await welcome(); await p.waitForTimeout(1500); }
        }
      }
      const raSeen = r.loads.filter(o => o.lsResetAt !== null); ok('LS eggfarm.save.reset_at never written (rule VOID)', raSeen.length === 0, raSeen.map(o => o.lsResetAt));
      ok('no page errors', errs.filter(e => !/qa throw inside reset tx/.test(e)).length === 0, errs.slice(0, 3));
    } catch (e) { ok('no exception', false, String(e).slice(0, 300)); await p.screenshot({ path: `${OUT}/${tag}-EXC.png` }).catch(() => {}); }
    await ctx.close();
  }
  await br.close();
} finally { try { process.kill(-srv.pid); } catch { /* gone */ } }
const want = SHA7 ? new RegExp(`^(m3-rc1-pre|m4\\.1)\\+${SHA7}$`) : /^(m3-rc1-pre|m4\.1)\+[0-9a-f]{7}$/; if (!want.test(res.buildId ?? '')) { fails++; console.log(`FAIL runtime build-id ${res.buildId} (want +${SHA7}, no +dirty)`); }
res.fails = fails; fs.writeFileSync(`${OUT}/result.json`, JSON.stringify(res, null, 1)); console.log(`CSR_RESET_AT ${fails ? 'FAIL' : 'PASS'} fails=${fails} build=${res.buildId} engine=${E}`); process.exit(fails ? 1 : 0);
