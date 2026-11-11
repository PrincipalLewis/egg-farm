// M41-7 browser cases not in csr-m41-7-browser.mjs: B-CSR8 (two-tab lease, two pages in ONE context), B-CSR14 (M5 via quota-injected
// lease write; case Q preserve-copy quota) and the Art & UX tap-target re-measure (strict CSS px, no tolerance) at 360/375/390.
// Oracle: spec m41-final sha256 cc6b7e23…8817c. Saves QA 2026-10-22.
// usage: flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node csr-m41-7-b8-14.mjs <worktree> <port 5961-5964> <outdir> [sha7] [only=csr8,csr14,remeasure]
// Serves <worktree>/dist-qa with vite preview. Kills only its own server.
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';
const [W0, P = '5961', OUT, SHA7 = '', ONLY = 'csr8,csr14,remeasure'] = process.argv.slice(2); const W = path.resolve(W0); const only = new Set(ONLY.split(','));
if (!['5961', '5962', '5963', '5964'].includes(P)) throw new Error('port must be 5961-5964');
fs.mkdirSync(OUT, { recursive: true });
const FX = '/workspace/egg-farm-studio/qa/m41/csr-fixtures/raw/'; const raw = n => fs.readFileSync(FX + n, 'utf8');
const MAIN_BAD = raw('MAIN-OQ1-abc.json'), BAK_F20 = raw('BAK-valid-F20-seq4-older.json'), BAK_BAD = raw('BAK-invalid-neg1.json'), V6_BAD = raw('V6B-invalid-raw-abc.json');
const NO_STORAGE = "Your browser isn't letting us save right now (low space or private mode), so progress won't be saved.";
const URL = `http://127.0.0.1:${P}/`;
// Seeds LS (+ optional IDB main) once per context; instruments this page's LS/IDB writes; optional setItem fault injection by key regex.
const INIT = ({ ls, idbMain, failKey, failName, seed }) => {
  window.__w = { ls: [], idb: [], errors: [], ti: [], own: null, lost: null }; window.addEventListener('error', e => window.__w.errors.push(String(e.message)));
  const nowAbs = () => performance.timeOrigin + performance.now(); window.__nowAbs = nowAbs;
  // 8694222: lease-loss time = first storage event (another tab) whose lease id differs from this tab's own lease id
  window.addEventListener('storage', e => { if (e.key === 'eggfarm.lease' && window.__w.lost === null) { try { const id = JSON.parse(e.newValue || 'null')?.id; if (id && id !== window.__w.own) window.__w.lost = nowAbs(); } catch { /* */ } } });
  window.addEventListener('unhandledrejection', e => window.__w.errors.push(String(e.reason)));
  const set = Storage.prototype.setItem, rm = Storage.prototype.removeItem;
  window.__seeded = (async () => {
    if (seed && !sessionStorage.getItem('qa.seeded')) {
      localStorage.clear(); for (const [k, v] of Object.entries(ls)) set.call(localStorage, k, v);
      await new Promise(r => { const d = indexedDB.deleteDatabase('eggfarm'); d.onsuccess = d.onerror = d.onblocked = r; });
      if (idbMain) { const db = await new Promise((res, rej) => { const r = indexedDB.open('eggfarm', 1); r.onupgradeneeded = () => r.result.createObjectStore('save'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        await new Promise(res => { const t = db.transaction('save', 'readwrite'); t.objectStore('save').put(idbMain, 'main'); t.oncomplete = res; }); db.close(); }
      sessionStorage.setItem('qa.seeded', '1'); }
    const put = IDBObjectStore.prototype.put, del = IDBObjectStore.prototype.delete;
    IDBObjectStore.prototype.put = function (v, k) { window.__w.idb.push(`put:${k}`); window.__w.ti.push({ t: nowAbs(), op: `put:${k}` }); return put.call(this, v, k); };
    IDBObjectStore.prototype.delete = function (k) { window.__w.idb.push(`delete:${k}`); window.__w.ti.push({ t: nowAbs(), op: `delete:${k}` }); return del.call(this, k); };
    const gak = IDBObjectStore.prototype.getAllKeys; // forced-claim variant: another tab's claim lands exactly when this tab's copy tx starts
    IDBObjectStore.prototype.getAllKeys = function (...a) { if (window.__qaForceClaim && this.transaction.mode === 'readwrite') { window.__qaForceClaim = false; set.call(localStorage, 'eggfarm.lease', JSON.stringify({ id: 'qa-foreign-tab', at: Date.now() })); window.__w.lost = nowAbs(); window.__w.ti.push({ t: nowAbs(), op: 'FORCED-foreign-claim' }); } return gak.apply(this, a); };
  })();
  const re = failKey ? new RegExp(failKey) : null;
  Storage.prototype.setItem = function (k, v) { if (this === localStorage && k === 'eggfarm.lease') { try { window.__w.own = JSON.parse(v).id; } catch { /* */ } } if (this === localStorage) { if (re && re.test(k)) { window.__w.ls.push(`FAILED-set:${k}`); throw new DOMException('qa quota', failName || 'QuotaExceededError'); } window.__w.ls.push(`set:${k}`); } return set.call(this, k, v); };
  Storage.prototype.removeItem = function (k) { if (this === localStorage) window.__w.ls.push(`remove:${k}`); return rm.call(this, k); };
};
const res = { port: P, sha7: SHA7, cases: {} }; let fails = 0;
const mk = tag => { const r = (res.cases[tag] = { checks: [] }); return [r, (n, c, v) => { r.checks.push({ n, pass: !!c, v }); if (!c) fails++; console.log(`${c ? 'PASS' : 'FAIL'} ${tag}: ${n} ${JSON.stringify(v ?? '').slice(0, 180)}`); }]; };
const tel = p => p.evaluate(() => { try { return JSON.parse(window.eggfarmExportTelemetry()).events; } catch { return []; } });
const lsDump = p => p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
const start = async p => { await p.goto(URL); await p.evaluate(() => window.__seeded); await p.getByText('Tap to start').click(); };
const srv = spawn(`${W}/node_modules/.bin/vite`, ['preview', '--outDir', 'dist-qa', '--port', P, '--strictPort', '--host', '127.0.0.1'], { cwd: W, stdio: 'ignore', detached: true });
try {
  for (let i = 0; i < 60; i++) { try { await fetch(URL); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
  const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  // ---------- B-CSR8 (spec line 56: all recovery writes after lease.claim + owns(); a tab that LOSES the claim preserves and writes nothing) ----------
  // The lease is newest-tab-wins (main.ts: requestFlush -> claim). (8a) live owner A loses to a newer tab B: A must stop writing.
  // (8b) race: B claims, then loses to C while its awaited IDB corrupt.* copy is in flight (tx complete delayed 3 s in B only); B must
  //      show 'Game open in another tab' and make no LS save write and no IDB main put; its IDB bytes must survive somewhere.
  const lsSnap = p => p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^eggfarm\.save/.test(k)) o[k] = localStorage.getItem(k).length; } return o; });
  const idbAll = p => p.evaluate(() => new Promise(res => { const r = indexedDB.open('eggfarm', 1); r.onupgradeneeded = () => r.result.createObjectStore('save'); r.onsuccess = () => { const db = r.result, out = {}; const c = db.transaction('save').objectStore('save').openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { out[cur.key] = typeof cur.value === 'string' ? cur.value : JSON.stringify(cur.value); cur.continue(); } else { db.close(); res(out); } }; }; }));
  if (only.has('csr8') || only.has('csr8b')) {
    if (only.has('csr8')) { const [r, ok] = mk('B-CSR8a-owner-loses-to-newer-tab');
      const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
      try {
        const A = await ctx.newPage(); await A.addInitScript(INIT, { ls: { 'eggfarm.save': BAK_F20 }, seed: true }); await start(A);
        await A.waitForFunction(() => window.eggfarm, null, { timeout: 15000 }); r.buildId = await A.evaluate(() => document.querySelector('meta[name="build-id"]')?.content ?? null);
        ok('runtime build-id', !SHA7 || (r.buildId ?? '').endsWith('+' + SHA7), r.buildId); await A.waitForTimeout(1500);
        const B = await ctx.newPage(); await B.addInitScript(INIT, { seed: false }); await B.goto(URL); await B.evaluate(() => window.__seeded);
        const tap = B.getByText('Tap to start'); if (await tap.isVisible().catch(() => false)) await tap.click().catch(() => {});
        await B.waitForFunction(() => window.eggfarm, null, { timeout: 15000 }); await B.waitForTimeout(1000);
        const aMark = (await A.evaluate(() => window.__w)).ls.length, aIdbMark = (await A.evaluate(() => window.__w)).idb.length;
        await A.waitForTimeout(12000);
        const wA = await A.evaluate(() => window.__w); const after = { ls: wA.ls.slice(aMark), idb: wA.idb.slice(aIdbMark) }; r.aWritesAfterTakeover = after;
        ok("A (loser) shows 'Game open in another tab'", /Game open in another tab/.test(await A.evaluate(() => document.body.innerText)), null);
        ok('A: 0 LS eggfarm.save* writes after B took over (12 s, > 2 autosaves)', after.ls.filter(x => /:eggfarm\.save/.test(x)).length === 0, after.ls);
        ok('A: 0 IDB puts/deletes after B took over', after.idb.length === 0, after.idb);
        r.bTelemetry = (await tel(B)).map(e => e.type); ok('B: tab_guard_takeover recorded, B is the live owner', r.bTelemetry.includes('tab_guard_takeover'), r.bTelemetry);
        await A.screenshot({ path: `${OUT}/B-CSR8a-tabA.png` }); await B.screenshot({ path: `${OUT}/B-CSR8a-tabB.png` });
      } catch (e) { ok('no exception', false, String(e).slice(0, 300)); }
      await ctx.close(); }
    const N8B = +(process.env.N8B ?? 5); for (let it8 = 1; it8 <= N8B; it8++) { const [r, ok] = mk(`B-CSR8b-race-loser-during-idb-copy#${it8}`);
      const IDB1 = JSON.parse(fs.readFileSync('/workspace/egg-farm-studio/qa/csr/fixtures/idb1/IDB1-truncated.manifest.json', 'utf8')); const seededMain = IDB1.idb.records.find(x => x.key === 'main').value;
      const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
      try {
        const B = await ctx.newPage(); const bErr = []; B.on('pageerror', e => bErr.push(e.message));
        await B.addInitScript(INIT, { ls: IDB1.localStorage.set, idbMain: seededMain, seed: true });
        await B.addInitScript(() => { const d = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete');
          Object.defineProperty(IDBTransaction.prototype, 'oncomplete', { configurable: true, get() { return d.get.call(this); }, set(f) { const t = this; const delay = window.__qaDelay ?? 0;
            d.set.call(this, f && (this.mode === 'readwrite') && delay ? (e => setTimeout(() => f.call(t, e), delay)) : f); } }); });
        await B.goto(URL); await B.evaluate(() => window.__seeded); await B.evaluate(() => { window.__qaDelay = 3000; });
        await B.getByText('Tap to start').click(); await B.waitForTimeout(600);
        const C = await ctx.newPage(); const cErr = []; C.on('pageerror', e => cErr.push(e.message)); await C.addInitScript(INIT, { seed: false });
        await C.goto(URL); await C.evaluate(() => window.__seeded); const tapC = C.getByText('Tap to start'); if (await tapC.isVisible().catch(() => false)) await tapC.click().catch(() => {});
        await C.waitForTimeout(12000);
        const bText = await B.evaluate(() => document.body.innerText); r.bText = bText.slice(0, 200);
        ok("B (loser) shows 'Game open in another tab'", /Game open in another tab/.test(bText), r.bText);
        ok('B: no Game created (no window.eggfarm)', !(await B.evaluate(() => !!window.eggfarm)), null);
        const wB = await B.evaluate(() => window.__w); r.bWrites = wB;
        ok('B: 0 LS eggfarm.save* writes', wB.ls.filter(x => /:eggfarm\.save/.test(x)).length === 0, wB.ls);
        ok('B: 0 IDB puts to main', wB.idb.filter(x => x === 'put:main').length === 0, wB.idb);
        { const lost = wB.lost; const after = lost === null ? null : wB.ti.filter(x => x.t > lost); r.bLeaseLostAt = lost; r.bIdbTimeline = wB.ti.map(x => ({ dt: lost === null ? null : Math.round(x.t - lost), op: x.op }));
          ok('HARD (8694222): loser B lease loss observed (storage event from C)', lost !== null, lost);
          ok('HARD (8694222): loser B makes NO IDB put/delete after losing the lease', after !== null && after.length === 0, r.bIdbTimeline); }
        r.bIdbOps = wB.idb; ok('B: IDB ops limited to the awaited corrupt.* copy tx (info: main delete in that tx)', wB.idb.every(x => /^(put:corrupt\.|delete:main|delete:corrupt\.)/.test(x)), wB.idb, false);
        const idb = await idbAll(C); r.idbAfter = Object.fromEntries(Object.entries(idb).map(([k, v]) => [k, v.length]));
        const kept = Object.entries(idb).some(([k, v]) => (k === 'main' || k.startsWith('corrupt.')) && v === (typeof seededMain === 'string' ? seededMain : JSON.stringify(seededMain)));
        ok('the seeded corrupt IDB bytes survive (main or corrupt.*) -- never destroyed', kept, r.idbAfter);
        const tC = await tel(C); const scC = tC.filter(e => e.type === 'save_corrupt'); r.c = { dialog: await C.locator('.recovery-layer').isVisible().catch(() => false), notice: await C.evaluate(() => document.querySelector('.recovery-layer')?.dataset.notice ?? null), save_corrupt: scC, isNewGame: await C.evaluate(() => window.eggfarm?.isNewGame ?? null) };
        // HoQA ruling 2026-10-22 21:09 (MAJOR on dfdf49c; CSR-AC-IDB1 'never a silent new game', IDB1-5/CSR-8 'a tab that loses the claim makes no IDB write'): HARD asserts
        const silent = !r.c.dialog && scC.length === 0; ok('HARD: C (winner) never boots silently (dialog or save_corrupt)', !silent, r.c);
        const loserNoIdb = wB.idb.length === 0, winnerM3Idb = r.c.notice === 'M3' && scC.length === 1 && scC[0].store === 'idb';
        ok('HARD: loser B made no IDB put/delete OR winner C shows M3 with save_corrupt{store:idb}', loserNoIdb || winnerM3Idb, { loserIdbOps: wB.idb, winnerNotice: r.c.notice, save_corrupt: scC.map(e => ({ store: e.store, reason: e.reason, recovered_from: e.recovered_from })) });
        ok('no page errors (B, C)', bErr.length + cErr.length === 0, [...bErr, ...cErr].slice(0, 2));
        await B.screenshot({ path: `${OUT}/B-CSR8b-tabB-loser.png` }); await C.screenshot({ path: `${OUT}/B-CSR8b-tabC-winner.png` });
      } catch (e) { ok('no exception', false, String(e).slice(0, 300)); }
      await ctx.close(); }
    for (let itf = 1; itf <= +(process.env.N8BF ?? 3); itf++) { const [r, ok] = mk(`B-CSR8b-forced-claim-inside-copy-tx#${itf}`); // A-side guard: owns() false inside the tx -> abort, nothing put/deleted
      const IDB1 = JSON.parse(fs.readFileSync('/workspace/egg-farm-studio/qa/csr/fixtures/idb1/IDB1-truncated.manifest.json', 'utf8')); const seededMain = IDB1.idb.records.find(x => x.key === 'main').value;
      const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
      try {
        const B = await ctx.newPage(); const bErr = []; B.on('pageerror', e => bErr.push(e.message)); await B.addInitScript(INIT, { ls: IDB1.localStorage.set, idbMain: seededMain, seed: true });
        await B.goto(URL); await B.evaluate(() => window.__seeded); await B.evaluate(() => { window.__qaForceClaim = true; }); await B.getByText('Tap to start').click(); await B.waitForTimeout(2500);
        const wB = await B.evaluate(() => window.__w); r.bTimeline = wB.ti; const bText = await B.evaluate(() => document.body.innerText);
        ok('precondition: the forced foreign claim fired inside B\'s copy tx', wB.ti.some(x => x.op === 'FORCED-foreign-claim'), wB.ti);
        ok("B shows 'Game open in another tab' and creates no Game", /Game open in another tab/.test(bText) && !(await B.evaluate(() => !!window.eggfarm)), bText.slice(0, 120));
        const after = wB.ti.filter(x => x.t > wB.lost && x.op !== 'FORCED-foreign-claim'); ok('HARD: B makes NO IDB put/delete after losing the lease (tx aborted in-tx)', after.length === 0, after);
        const idbB = await idbAll(B); r.idbAfterB = Object.fromEntries(Object.entries(idbB).map(([k, v]) => [k, v.length]));
        const sm = typeof seededMain === 'string' ? seededMain : JSON.stringify(seededMain);
        ok('IDB main still holds the seeded corrupt bytes (no delete applied), no corrupt.* made by B', idbB.main === sm && !Object.keys(idbB).some(k => k.startsWith('corrupt.')), r.idbAfterB);
        const C = await ctx.newPage(); const cErr = []; C.on('pageerror', e => cErr.push(e.message)); await C.addInitScript(INIT, { seed: false });
        await C.goto(URL); await C.evaluate(() => window.__seeded); const tapC = C.getByText('Tap to start'); if (await tapC.isVisible().catch(() => false)) await tapC.click().catch(() => {});
        await C.waitForFunction(() => window.eggfarm, null, { timeout: 15000 }).catch(() => {}); await C.waitForTimeout(2500);
        const tC = await tel(C); const scC = tC.filter(e => e.type === 'save_corrupt'); const nC = await C.evaluate(() => document.querySelector('.recovery-layer')?.dataset.notice ?? null); r.c = { notice: nC, save_corrupt: scC.map(e => e.store) };
        ok('HARD: C (next owner) is never silent: M3 with save_corrupt{store:idb} x1', nC === 'M3' && scC.length === 1 && scC[0].store === 'idb', r.c);
        const idbC = await idbAll(C); ok('C: the corrupt bytes are kept as IDB corrupt.* (IDB1-5 by the owner)', Object.entries(idbC).some(([k, v]) => k.startsWith('corrupt.') && v === sm), Object.keys(idbC));
        ok('no page errors (B, C)', bErr.length + cErr.length === 0, [...bErr, ...cErr].slice(0, 2));
        await B.screenshot({ path: `${OUT}/B-CSR8b-forced-${itf}-tabB.png` }); await C.screenshot({ path: `${OUT}/B-CSR8b-forced-${itf}-tabC.png` });
      } catch (e) { ok('no exception', false, String(e).slice(0, 300)); }
      await ctx.close(); }
  }
  // ---------- B-CSR14 ----------
  if (only.has('csr14')) {
    { const [r, ok] = mk('B-CSR14-M5-lease-quota'); // restored + storage blocked (lease write refused) => M5 + secondary Export (current farm)
      const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      try { await p.addInitScript(INIT, { ls: { 'eggfarm.save': MAIN_BAD, 'eggfarm.save.bak': BAK_F20 }, seed: true, failKey: '^eggfarm\\.lease$' }); await start(p);
        await p.waitForFunction(() => window.eggfarm, null, { timeout: 15000 });
        const dlg = await p.locator('.recovery-layer').waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false); ok('dialog shown', dlg, dlg);
        const t = await p.locator('#rcT').innerText().catch(() => null), b = await p.locator('#rcB').innerText().catch(() => null), g = await p.locator('#rcGo').innerText().catch(() => null); r.copy = { t, b, g };
        ok('M5 title', t === 'Your farm is back!', t); ok('M5 body', b === 'Saving is paused on this device right now, so progress may not be kept.', b); ok('M5 button', g === 'Continue', g);
        const ex = p.locator('#rcExport'); const exText = await ex.innerText().catch(() => null), aria = await ex.getAttribute('aria-label').catch(() => null); r.export = { exText, aria };
        ok("M5 secondary 'Export save file'", exText === 'Export save file', exText); ok('M5 export aria names the CURRENT farm', /current farm/.test(aria ?? ''), aria);
        await p.screenshot({ path: `${OUT}/B-CSR14-M5.png` });
        const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), ex.click().catch(() => {})]);
        let F = null; if (dl) { const fp = `${OUT}/B-CSR14-M5-export${path.extname(dl.suggestedFilename()) || '.json'}`; await dl.saveAs(fp); const s = fs.readFileSync(fp, 'utf8'); try { const j = JSON.parse(s); F = (j.state ?? JSON.parse(j.raw ?? '{}').state)?.farmLevel ?? null; } catch { F = s === MAIN_BAD ? 'CORRUPT-BYTES' : '?'; } r.exportFile = dl.suggestedFilename(); }
        ok('export downloads the current farm (F20), never the corrupt bytes', F === 20, F);
        const tl = await tel(p); const sh = tl.filter(e => e.type === 'save_recovery_notice_shown'); r.shown = sh; ok('notice_shown x1 notice=M5', sh.length === 1 && sh[0].notice === 'M5', sh);
        await p.locator('#rcGo').click().catch(() => {}); const ns = await p.getByText(NO_STORAGE).waitFor({ timeout: 4000 }).then(() => true, () => false); ok('no-storage notice after closing M5', ns, ns);
        await p.screenshot({ path: `${OUT}/B-CSR14-M5-after.png` });
        const di = (await tel(p)).filter(e => e.type === 'save_recovery_notice_dismissed'); ok('notice_dismissed x1 notice=M5', di.length === 1 && di[0].notice === 'M5', di);
        ok('farmLevel=20 (restored from .bak)', (await p.evaluate(() => window.eggfarm.state.farmLevel)) === 20, null); ok('no page errors', errs.length === 0, errs.slice(0, 2));
      } catch (e) { ok('no exception', false, String(e).slice(0, 300)); } await ctx.close(); }
    { const [r, ok] = mk('B-CSR14-Q-preserve-quota'); // the corrupt.* copy write fails (quota) => copy_failed, outcome storage, export from memory = the corrupt bytes
      const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      try { await p.addInitScript(INIT, { ls: { 'eggfarm.save': MAIN_BAD }, seed: true, failKey: '^eggfarm\\.save\\.corrupt' }); await start(p);
        await p.waitForFunction(() => window.eggfarm, null, { timeout: 15000 });
        const dlg = await p.locator('.recovery-layer').waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false); ok('dialog shown', dlg, dlg);
        r.layer = await p.evaluate(() => { const L = document.querySelector('.recovery-layer'); return L ? { outcome: L.dataset.outcome ?? null, variant: L.dataset.variant ?? null, title: document.querySelector('#rcT')?.textContent, body: document.querySelector('#rcB')?.textContent } : null; });
        const tl = await tel(p); const sc0 = tl.filter(e => e.type === 'save_corrupt'); r.save_corrupt = sc0; ok('save_corrupt x1 copy_failed=true', sc0.length === 1 && sc0[0].copy_failed === true, sc0);
        ok('LS corrupt.* write was attempted and refused', (await p.evaluate(() => window.__w.ls)).some(x => /^FAILED-set:eggfarm\.save\.corrupt/.test(x)), null);
        await p.screenshot({ path: `${OUT}/B-CSR14-Q.png` });
        const ex = p.locator('#rcExport'); const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), ex.click().catch(() => {})]);
        let same = null; if (dl) { const fp = `${OUT}/B-CSR14-Q-export.bin`; await dl.saveAs(fp); same = fs.readFileSync(fp, 'utf8') === MAIN_BAD; r.exportFile = dl.suggestedFilename(); }
        ok('export (from memory) = the corrupt main bytes', same === true, same); ok('no page errors', errs.length === 0, errs.slice(0, 2));
      } catch (e) { ok('no exception', false, String(e).slice(0, 300)); } await ctx.close(); }
  }
  // ---------- Art & UX re-measure: strict CSS px (primary >= 48, export link >= 44), no tolerance; M3 card ----------
  if (only.has('remeasure')) for (const vw of [360, 375, 390]) { const [r, ok] = mk(`REMEASURE-M3@${vw}`);
    const ctx = await br.newContext({ viewport: { width: vw, height: 740 } }); const p = await ctx.newPage();
    try { await p.addInitScript(INIT, { ls: { 'eggfarm.save': MAIN_BAD, 'eggfarm.save.bak': BAK_BAD, 'eggfarm.save.v6_backup': V6_BAD }, seed: true }); await start(p);
      await p.locator('.recovery-layer').waitFor({ state: 'visible', timeout: 8000 });
      // settle first (dfdf49c run showed the entrance animation scales the card: 40.8/37.4 px at first paint @360); the immediate sample is kept as info
      r.immediate = await p.evaluate(() => ({ go: document.querySelector('#rcGo')?.getBoundingClientRect().height, ex: document.querySelector('#rcExport')?.getBoundingClientRect().height }));
      await p.evaluate(async () => { const L = document.querySelector('.recovery-layer'); await Promise.race([Promise.all(L.getAnimations({ subtree: true }).filter(a => (a.effect?.getTiming?.().iterations ?? 1) !== Infinity).map(a => a.finished.catch(() => null))), new Promise(r => setTimeout(r, 3000))]); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
      const m = await p.evaluate(() => { const q = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(), cs = getComputedStyle(e); return { w: b.width, h: b.height, minHeight: cs.minHeight }; }; return { card: q('.recovery-card'), go: q('#rcGo'), ex: q('#rcExport'), dpr: devicePixelRatio }; });
      r.m = m; ok(`primary >= 48 CSS px (strict) @${vw}`, (m.go?.h ?? 0) >= 48, m.go); ok(`export link >= 44 CSS px (strict) @${vw}`, (m.ex?.h ?? 0) >= 44, m.ex);
      ok(`card width == min(440, vw-48) @${vw} (info, ±1)`, Math.abs((m.card?.w ?? 0) - Math.min(440, vw - 48)) <= 1, m.card?.w);
      await p.screenshot({ path: `${OUT}/REMEASURE-M3@${vw}.png` });
    } catch (e) { ok('no exception', false, String(e).slice(0, 300)); } await ctx.close(); }
  await br.close();
} finally { try { process.kill(-srv.pid); } catch { /* gone */ } }
res.fails = fails; fs.writeFileSync(`${OUT}/result.json`, JSON.stringify(res, null, 1)); console.log(`DONE fails=${fails}`);
