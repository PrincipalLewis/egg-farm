// CSR-12 probe (spec m41-final line 75): localStorage throws on READ -> expect the existing v2.2 "Can't save"/storage outcome,
// and NEVER an autosave of a fresh farm over unread data. Saves QA 2026-10-22.
// usage: flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node csr12-ls-throw-probe.mjs <worktree> <port 5961-5964> <outdir> [preview|dev] [expectSha7]
//   preview = serve <worktree>/dist-qa (the realistic build); dev = vite dev server (stack frames map to src/*.ts:line).
// Variants (addInitScript, before any app script): Storage.prototype.getItem throws DOMException (i) SecurityError, (ii) InvalidStateError
// for localStorage only (sessionStorage untouched). Preconditions: (A) valid save in IndexedDB eggfarm/save/main, (B) no save at all.
// Instrumented: every localStorage.setItem/removeItem (allowed through, counted by key) and every IDBObjectStore.put/delete (counted by key).
// Chromium only. Kills only the server it started.
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const [W0, P = '5961', OUT, MODE = 'preview', SHA7 = ''] = process.argv.slice(2); const W = (await import('node:path')).resolve(W0);
if (!['5961', '5962', '5963', '5964'].includes(P)) throw new Error('port must be 5961-5964');
fs.mkdirSync(OUT, { recursive: true });
const VALID = fs.readFileSync('/workspace/egg-farm-studio/qa/m41/csr-fixtures/raw/BAK-valid-F20-seq4-older.json', 'utf8');
const args = MODE === 'dev' ? ['--port', P, '--strictPort', '--host', '127.0.0.1'] : ['preview', '--outDir', 'dist-qa', '--port', P, '--strictPort', '--host', '127.0.0.1'];
const srv = spawn(`${W}/node_modules/.bin/vite`, args, { cwd: W, stdio: 'ignore', detached: true });
const INIT = ({ errName, idbSeed }) => {
  window.__w = { ls: [], idb: [], lsReads: 0, rejections: [], errors: [] };
  window.addEventListener('unhandledrejection', e => window.__w.rejections.push(String(e.reason?.stack ?? e.reason)));
  window.addEventListener('error', e => window.__w.errors.push(String(e.error?.stack ?? e.message)));
  const seed = async () => { if (sessionStorage.getItem('qa.seeded')) return; await new Promise(r => { const d = indexedDB.deleteDatabase('eggfarm'); d.onsuccess = d.onerror = d.onblocked = r; });
    if (idbSeed) { const db = await new Promise((res, rej) => { const r = indexedDB.open('eggfarm', 1); r.onupgradeneeded = () => r.result.createObjectStore('save'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      await new Promise(res => { const t = db.transaction('save', 'readwrite'); t.objectStore('save').put(idbSeed, 'main'); t.oncomplete = res; }); db.close(); }
    sessionStorage.setItem('qa.seeded', '1'); };
  // seeding uses the original IDB methods; instrumentation starts after it (writes before the seed promise resolves are the seed itself)
  window.__seeded = seed().then(() => {
    const put = IDBObjectStore.prototype.put, del = IDBObjectStore.prototype.delete;
    IDBObjectStore.prototype.put = function (v, k) { window.__w.idb.push(`put:${k}:${typeof v === 'string' ? v.length + 'B' : typeof v}`); return put.call(this, v, k); };
    IDBObjectStore.prototype.delete = function (k) { window.__w.idb.push(`delete:${k}`); return del.call(this, k); };
  });
  const ls = window.localStorage; const set = Storage.prototype.setItem, rm = Storage.prototype.removeItem, get = Storage.prototype.getItem;
  Storage.prototype.getItem = function (k) { if (this === ls) { window.__w.lsReads++; const ex = new DOMException('qa: localStorage read blocked', errName); try { Error.captureStackTrace(ex); } catch { /* not supported */ } (window.__w.throwStacks ??= []).push(String(ex.stack).split("\n").slice(0, 7).join(" | ")); throw ex; } return get.call(this, k); };
  Storage.prototype.setItem = function (k, v) { if (this === ls) window.__w.ls.push(`set:${k}:${String(v).length}B`); return set.call(this, k, v); };
  Storage.prototype.removeItem = function (k) { if (this === ls) window.__w.ls.push(`remove:${k}`); return rm.call(this, k); };
};
const res = { mode: MODE, port: P, runs: {} };
try {
  for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${P}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
  const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const errName of ['SecurityError', 'InvalidStateError']) for (const pre of ['idb-valid-save', 'no-save']) {
    const tag = `${errName}-${pre}`; const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
    const consoleLog = []; p.on('console', m => consoleLog.push(`[${m.type()}] ${m.text()}${m.location()?.url ? ` @ ${m.location().url}:${m.location().lineNumber}` : ''}`)); p.on('pageerror', e => consoleLog.push(`[pageerror] ${e.stack ?? e.message}`));
    await p.addInitScript(INIT, { errName, idbSeed: pre === 'idb-valid-save' ? VALID : null });
    const r = (res.runs[tag] = {});
    try {
      await p.goto(`http://127.0.0.1:${P}/`); await p.evaluate(() => window.__seeded);
      r.buildId = await p.evaluate(() => document.querySelector('meta[name="build-id"]')?.content ?? null);
      const startBtn = p.getByText('Tap to start'); r.startScreenShown = await startBtn.waitFor({ timeout: 10000 }).then(() => true, () => false);
      if (r.startScreenShown) await startBtn.click();
      await p.waitForTimeout(12000); // > 2 autosave intervals (balance.save.autosaveIntervalS = 5)
      r.render = await p.evaluate(() => { const L = document.querySelector('.recovery-layer'); const txt = s => document.querySelector(s)?.textContent?.trim() ?? null;
        return { gameHandle: !!window.eggfarm, recoveryLayer: L ? { outcome: L.dataset.outcome ?? null, variant: L.dataset.variant ?? null, title: txt('#rcT'), body: txt('#rcB'), button: txt('#rcGo') } : null,
          startScreenStill: !!document.querySelector('.bar, #start') || /Tap to start/.test(document.body.innerText), collectBtn: /Collect/.test(document.body.innerText), farmLevel: window.eggfarm?.state?.farmLevel ?? null,
          coins: window.eggfarm?.state?.coinsCents ?? null, isNewGame: window.eggfarm?.isNewGame ?? null, bodyText: document.body.innerText.slice(0, 300) }; });
      r.writes = await p.evaluate(() => window.__w); r.idbMainAfter = await p.evaluate(() => new Promise(res => { const q = indexedDB.open('eggfarm', 1); q.onupgradeneeded = () => q.result.createObjectStore('save'); q.onsuccess = () => { const g = q.result.transaction('save').objectStore('save').get('main'); g.onsuccess = () => { const v = g.result; q.result.close(); res(v == null ? null : typeof v === 'string' ? { len: v.length, farmLevel: (() => { try { return JSON.parse(v).state.farmLevel; } catch { return '?'; } })() } : typeof v); }; }; }));
      r.classify = r.render.recoveryLayer?.variant === 'cantsave' || r.render.recoveryLayer?.outcome === 'storage' ? 'CANT-SAVE/STORAGE OUTCOME' : r.render.gameHandle && r.render.isNewGame ? 'FRESH FARM' : r.render.gameHandle ? 'GAME LOADED' : 'CRASH/BLANK (no game; start screen or empty)';
      r.freshFarmWrites = { lsSaveWrites: r.writes.ls.filter(x => /^set:eggfarm\.save(:|\.bak)/.test(x)).length, idbMainPuts: r.writes.idb.filter(x => x.startsWith('put:main')).length };
      await p.screenshot({ path: `${OUT}/${tag}.png`, fullPage: true });
    } catch (e) { r.exception = String(e).slice(0, 400); }
    r.console = consoleLog; fs.writeFileSync(`${OUT}/${tag}.console.log`, consoleLog.join('\n') + '\n' + (r.writes?.rejections ?? []).map(x => `[unhandledrejection] ${x}`).join('\n') + '\n' + (r.writes?.errors ?? []).map(x => `[window.error] ${x}`).join('\n') + '\n');
    console.log(`${tag}: build=${r.buildId} ${r.classify} lsReads=${r.writes?.lsReads} lsWrites=${r.writes?.ls.length} idbWrites=${r.writes?.idb.length} rejections=${r.writes?.rejections.length} ${JSON.stringify(r.freshFarmWrites)}`);
    await ctx.close();
  }
  await br.close();
} finally { try { process.kill(-srv.pid); } catch { /* gone */ } }
fs.writeFileSync(`${OUT}/result.json`, JSON.stringify(res, null, 1)); console.log('DONE');
