// QA probe save-durability 2959ba0: B1 variants, minors, BUG-6. node probe.mjs <engine> ; env DIST, PORT
import pw from '/workspace/qa-sd3/game/node_modules/playwright-core/index.mjs';
import { serveOwn } from '/workspace/qa-sd3/game/scripts/serve-own.mjs';
import fs from 'node:fs';
const ENGINE = process.argv[2] ?? 'chromium', DIST = process.env.DIST ?? 'dist', port = +(process.env.PORT ?? 5730);
const G = '/workspace/qa-sd3/game';
const srv = await serveOwn(DIST, port, G); const U = srv.url;
const br = ENGINE === 'chromium' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[ENGINE].launch();
const NEWER = 'This save is from a newer version of Egg Farm. Open the newer build to keep playing.';
const res = []; const ok = (n, p, i = '') => res.push({ n, p: !!p, i });
const SPY = () => { window.__w = [];
  const ss = Storage.prototype.setItem, rm = Storage.prototype.removeItem, cl = Storage.prototype.clear;
  Storage.prototype.setItem = function (k, v) { window.__w.push('ls:' + k); return ss.call(this, k, v); };
  Storage.prototype.removeItem = function (k) { window.__w.push('rm:' + k); return rm.call(this, k); };
  Storage.prototype.clear = function () { window.__w.push('clear'); return cl.call(this); };
  const put = IDBObjectStore.prototype.put, del = IDBObjectStore.prototype.delete;
  IDBObjectStore.prototype.put = function (...a) { window.__w.push('idb:put:' + a[1]); return put.apply(this, a); };
  IDBObjectStore.prototype.delete = function (...a) { window.__w.push('idb:del:' + a[0]); return del.apply(this, a); };
  window.__bc = []; if (window.BroadcastChannel) { const pm = BroadcastChannel.prototype.postMessage; BroadcastChannel.prototype.postMessage = function (m) { window.__bc.push(m?.t); return pm.call(this, m); }; } };
const idbGet = p => p.evaluate(() => new Promise(res => { const r = indexedDB.open('eggfarm', 1); r.onupgradeneeded = () => r.result.createObjectStore('save');
  r.onsuccess = () => { const g = r.result.transaction('save').objectStore('save').get('main'); g.onsuccess = () => { res(g.result ?? null); r.result.close(); }; }; r.onerror = () => res('err'); }));
const idbPut = (p, v) => p.evaluate(v => new Promise(res => { const r = indexedDB.open('eggfarm', 1); r.onupgradeneeded = () => r.result.createObjectStore('save');
  r.onsuccess = () => { const t = r.result.transaction('save', 'readwrite'); t.objectStore('save').put(v, 'main'); t.oncomplete = () => { r.result.close(); res(true); }; }; }), v);
async function ctxSeed(ls, idb) { const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/__blank', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>b</title>' }));
  const s = await ctx.newPage(); await s.goto(U + '__blank'); if (idb != null) await idbPut(s, idb);
  await s.evaluate(o => { localStorage.clear(); for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, ls); await s.close(); return ctx; }
const dump = p => p.evaluate(() => { const o = {}; for (const k of Object.keys(localStorage)) o[k] = localStorage.getItem(k); return o; });
const v7 = JSON.stringify({ version: 7, savedAt: Date.now(), state: { coinsCents: 70707, futureField: 1 } });
const fx = JSON.parse(fs.readFileSync(G + '/tests/fixtures/saves/m2-rc1-v5-12min.json', 'utf8'));
// ---- refusal cases
async function refuse(name, ls, idb) {
  const ctx = await ctxSeed(ls, idb); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.addInitScript(SPY);
  await p.goto(U); await p.getByText('Tap to start').click();
  const shown = await p.waitForSelector('.recovery-layer.newer-save', { timeout: 10000 }).then(() => true, () => false);
  await p.waitForTimeout(4000); await p.evaluate(() => { window.dispatchEvent(new Event('pagehide')); document.dispatchEvent(new Event('visibilitychange')); }); await p.waitForTimeout(500);
  const st = await p.evaluate(() => ({ w: window.__w, bc: window.__bc, txt: document.querySelector('.newer-save')?.innerText ?? '', ver: document.querySelector('.newer-save')?.dataset.version, collect: !!document.querySelector('#collect'), rec: !!document.querySelector('.recovery-layer:not(.newer-save)') }));
  const after = await dump(p), idbAfter = await idbGet(p);
  const saveW = st.w.filter(x => /eggfarm\.(save|lease)|idb:|clear/.test(x));
  const lsSame = JSON.stringify(Object.fromEntries(Object.entries(after).filter(([k]) => /^eggfarm\.(save|lease)/.test(k)))) === JSON.stringify(ls);
  ok(`${name}: refused (.newer-save v7), exact text, no game, no recovery`, shown && st.ver === '7' && st.txt.includes(NEWER) && !st.collect && !st.rec, JSON.stringify({ shown, ver: st.ver, txt: st.txt.slice(0, 120), collect: st.collect, rec: st.rec }));
  ok(`${name}: no save/.bak/corrupt/lease/IDB write, no BC msg, save keys byte-identical, IDB byte-identical`, saveW.length === 0 && st.bc.length === 0 && lsSame && idbAfter === (idb ?? null), JSON.stringify({ saveW, bc: st.bc, allWrites: st.w, keysAfter: Object.keys(after), idbSame: idbAfter === (idb ?? null) }));
  ok(`${name}: no page errors`, errs.length === 0, errs.join('|')); await ctx.close();
}
await refuse('B1 v7 ONLY in IDB, localStorage empty', {}, v7);
await refuse('v7 ONLY in localStorage main', { 'eggfarm.save': v7 }, null);
await refuse('v7 ONLY in .bak', { 'eggfarm.save.bak': v7 }, null);
await refuse('m2 corrupt main + v7 .bak', { 'eggfarm.save': '{"version":6,"sav', 'eggfarm.save.bak': v7 }, null);
// ---- non-integer versions -> corrupt path
for (const ver of ['7.5', '6.5', '"7"']) {
  const raw = `{"version":${ver},"savedAt":1,"state":{"coinsCents":1}}`;
  const ctx = await ctxSeed({ 'eggfarm.save': raw }, null); const p = await ctx.newPage(); await p.goto(U); await p.getByText('Tap to start').click(); await p.waitForTimeout(2500);
  const st = await p.evaluate(() => ({ newer: !!document.querySelector('.newer-save'), rec: !!document.querySelector('.recovery-layer:not(.newer-save)'), corrupt: Object.keys(localStorage).filter(k => k.startsWith('eggfarm.save.corrupt')).map(k => localStorage.getItem(k)) }));
  ok(`version ${ver}: corrupt path (recovery shown, copy preserved byte-identical), not refused`, !st.newer && st.rec && st.corrupt.includes(raw), JSON.stringify({ newer: st.newer, rec: st.rec, n: st.corrupt.length }));
  await ctx.close();
}
// ---- BUG-6
const base = JSON.stringify(fx);
const mk = { missing: () => { const d = JSON.parse(base); delete d.savedAt; return JSON.stringify(d); }, null: () => base.replace(/"savedAt":\d+/, '"savedAt":null'),
  '1e999': () => base.replace(/"savedAt":\d+/, '"savedAt":1e999'), NaN: () => base.replace(/"savedAt":\d+/, '"savedAt":NaN'), 'string': () => base.replace(/"savedAt":\d+/, '"savedAt":"yesterday"'),
  'valid-1h-ago (control)': () => base.replace(/"savedAt":\d+/, `"savedAt":${Date.now() - 3600e3}`) };
const offState = p => p.evaluate(() => { let s = null; try { s = JSON.parse(localStorage.getItem('eggfarm.save')); } catch {}
  return { savedAt: s?.savedAt ?? 'ERR', ver: s?.version, welcome: /welcome back/i.test(document.body.innerText), qaOff: window.eggfarm?.offline?.eggs, rec: !!document.querySelector('.recovery-layer:not(.newer-save)'), corrupt: Object.keys(localStorage).filter(k => k.startsWith('eggfarm.save.corrupt')).length,
    grants: (localStorage.getItem('eggfarm.telemetry') ?? '').split('offline_grant').length - 1 }; });
for (const [name, f] of Object.entries(mk)) {
  const raw = f(); const ctx = await ctxSeed({ 'eggfarm.save': raw, 'eggfarm.ui': JSON.stringify({ onboardingDone: true }) }, null); const p = await ctx.newPage();
  const t0 = Date.now(); await p.goto(U); await p.getByText('Tap to start').click(); await p.waitForTimeout(1200);
  const s1 = await offState(p); const rel = [];
  for (let i = 0; i < 2; i++) { await p.reload(); await p.getByText('Tap to start').click(); await p.waitForTimeout(1200); rel.push(await offState(p)); }
  const info = JSON.stringify({ s1, rel, t0 });
  if (name === 'string' || name === 'NaN' || name === 'null') ok(`BUG-6 savedAt ${name}: path`, true, (s1.rec ? 'CORRUPT PATH ' : 'LOADED ') + info);
  if (name === 'string') ok('BUG-6 savedAt string -> corrupt path', s1.rec && s1.corrupt >= 1 && !s1.welcome, info);
  else if (name.startsWith('valid')) ok('BUG-6 control: valid 1 h old savedAt grants offline once, not on reloads', s1.welcome && !rel[0].welcome && !rel[1].welcome, info);
  else ok(`BUG-6 savedAt ${name}: 0 offline, saved at once with savedAt=now, 2 reloads no reward`, !s1.rec && !s1.welcome && (s1.qaOff ?? 0) === 0 && typeof s1.savedAt === 'number' && Math.abs(s1.savedAt - t0) < 15000 && rel.every(r => !r.welcome && (r.qaOff ?? 0) === 0 && Number.isFinite(r.savedAt)), info);
  await ctx.close();
}
await br.close(); srv.stop();
for (const r of res) console.log(`${r.p ? 'PASS' : 'FAIL'} [${ENGINE} ${DIST}] ${r.n} — ${r.i}`);
console.log(`${res.filter(r => r.p).length}/${res.length} passed`); process.exit(0);
