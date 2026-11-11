// QA probe save-durability 4a25d0d: items 1-6. node probe3.mjs <engine>; env DIST (dist-qa default), PORT
import pw from '/workspace/egg-farm-studio/qa/scratch/sd5-1-5d636d8/node_modules/playwright-core/index.mjs';
import { serveOwn } from '/workspace/egg-farm-studio/qa/scratch/sd5-1-5d636d8/scripts/serve-own.mjs'; import fs from 'node:fs';
const E = process.argv[2] ?? 'chromium', DIST = process.env.DIST ?? 'dist-qa', G = '/workspace/egg-farm-studio/qa/scratch/sd5-1-5d636d8', ONLY = process.env.ONLY;
const srv = await serveOwn(DIST, +(process.env.PORT ?? 6400), G); const U = srv.url;
const br = E === 'chromium' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[E].launch();
const res = []; const ok = (n, p, i = '') => { res.push({ n, p: !!p, i }); console.log(`${p ? 'PASS' : 'FAIL'} [${E} ${DIST}] ${n} — ${typeof i === 'string' ? i : JSON.stringify(i)}`); };
const fxRaw = fs.readFileSync(G + '/tests/fixtures/saves/m2-rc1-v5-12min.json', 'utf8');
const withAt = (sv, raw = fxRaw) => raw.replace(/"savedAt":\d+/, `"savedAt":${sv}`);
const withFarm = (raw, f) => raw.replace(/"farmLevel":\d+/, `"farmLevel":${f}`);
const BUILD = async p => p.evaluate(() => [...document.scripts].map(x => x.src).join(' ') + ' ' + (document.documentElement.innerHTML.match(/[0-9a-f]{7}/g) || []).join(','));
const v7 = () => JSON.stringify({ version: 7, savedAt: Date.now(), state: { coinsCents: 70707, futureField: 1 } });
const UI = JSON.stringify({ onboardingDone: true });
const idbOp = (p, op, v) => p.evaluate(([op, v]) => new Promise(res => { const r = indexedDB.open('eggfarm', 1); r.onupgradeneeded = () => r.result.createObjectStore('save');
  r.onsuccess = () => { const t = r.result.transaction('save', op === 'get' ? 'readonly' : 'readwrite'); const os = t.objectStore('save'); let out = null;
    if (op === 'get') { const g = os.get('main'); g.onsuccess = () => { out = g.result ?? null; }; } else os.put(v, 'main');
    t.oncomplete = () => { r.result.close(); res(out); }; t.onerror = () => res('err'); }; r.onerror = () => res('err'); }), [op, v]);
async function ctxSeed(ls, idb) { const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  await ctx.route('**/__blank', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>b</title>' }));
  const s = await ctx.newPage(); await s.goto(U + '__blank'); if (idb != null) await idbOp(s, 'put', idb);
  await s.evaluate(o => { localStorage.clear(); for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, { 'eggfarm.ui': UI, ...ls }); await s.close(); return ctx; }
const SPY = () => { window.__w = []; window.__flash = [];
  const ss = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { let ver = null; try { ver = JSON.parse(v).version; } catch {} window.__w.push({ k, t: Date.now(), ver }); return ss.call(this, k, v); };
  new MutationObserver(() => { const t = document.body?.innerText ?? ''; if (/another tab/i.test(t)) window.__flash.push(Date.now()); }).observe(document, { subtree: true, childList: true, characterData: true }); };
const boot = async (p, click = true) => { await p.goto(U); await p.getByText('Tap to start').click(); await p.waitForTimeout(1500); };
const st = p => p.evaluate(() => { const j = k => { const r = localStorage.getItem(k); if (r === null) return null; try { return JSON.parse(r); } catch { return 'ERR'; } }; const m = j('eggfarm.save'), b = j('eggfarm.save.bak');
  return { farm: window.eggfarm?.state?.farmLevel, off: window.eggfarm?.offline?.eggs ?? null, main: m && m !== 'ERR' ? { v: m.version, farm: m.state?.farmLevel, savedAt: m.savedAt } : m, bak: b && b !== 'ERR' ? { v: b.version, farm: b.state?.farmLevel } : b,
    corrupt: Object.keys(localStorage).filter(k => k.startsWith('eggfarm.save.corrupt')).map(k => localStorage.getItem(k)),
    rec: document.querySelector('.recovery-layer:not(.newer-save)') ? { t: document.querySelector('#rcT')?.innerText, b: document.querySelector('#rcB')?.innerText, btn: document.querySelector('#rcGo')?.innerText, exp: !!document.querySelector('#rcExport') } : null,
    newer: !!document.querySelector('.newer-save'), welcome: /welcome back/i.test(document.querySelector('.offline-modal, .modal')?.innerText ?? '') || (/welcome back/i.test(document.body.innerText) && !document.querySelector('.recovery-layer')), w: window.__w ?? [], flash: window.__flash ?? [] }; });
const want = s => !ONLY || ONLY.split(',').includes(s);
// ---------- 1 BUG-7
if (want('1')) {
  const bak = withAt(Date.now() - 120e3); const ctx = await ctxSeed({ 'eggfarm.save.bak': bak }, null); const p = await ctx.newPage(); await p.addInitScript(SPY); await boot(p);
  const a = await st(p); ok('BUG-7 main missing (LS+IDB) + valid .bak: restored with banner, farm 10', a.rec && a.rec.t === 'Welcome back!' && (a.farm ?? a.main?.farm) === 10, { rec: a.rec, farm: a.farm, main: a.main, bak: a.bak });
  await p.locator('#rcGo').click().catch(() => {}); const bakSeen = []; const t0 = Date.now();
  while (Date.now() - t0 < 92e3) { await p.waitForTimeout(4000); bakSeen.push((await st(p)).bak?.farm ?? null); }
  const b = await st(p); const idb = await idbOp(p, 'get'); let idbFarm = null; try { idbFarm = JSON.parse(idb).state.farmLevel; } catch {}
  ok('BUG-7: .bak never overwritten by a fresh farm over >=92 s; main/IDB keep farm 10', bakSeen.every(f => f === null || f >= 10) && b.main?.farm >= 10 && idbFarm >= 10, { bakSeen, main: b.main, idbFarm });
  const before = await p.evaluate(() => window.eggfarm.state.farmLevel);
  await p.evaluate(() => { const g = window.eggfarm; g.state.coinsCents = 1e12; g.dispatch({ type: 'buyFarm' }); g.dispatch({ type: 'buyCollection' }); });
  await p.waitForTimeout(12000); const c = await st(p);
  ok('BUG-7: after a purchase, .bak and main never become a fresh farm', c.farm > before && c.main?.farm > before && (c.bak?.farm ?? 0) >= 10, { before, farm: c.farm, main: c.main, bak: c.bak });
  await p.reload(); await p.getByText('Tap to start').click(); await p.waitForTimeout(1500); const d = await st(p);
  ok('BUG-7: reload after restore keeps progress, no second banner', !d.rec && d.farm > before, { farm: d.farm, rec: d.rec }); await ctx.close();
  // bad .bak
  const badRaw = '{"version":6,"savedAt":17,"sta'; const ctx2 = await ctxSeed({ 'eggfarm.save.bak': badRaw }, null); const q = await ctx2.newPage(); await boot(q); const e = await st(q);
  await q.waitForTimeout(10000); const f = await st(q);
  ok('BUG-7: bad .bak (main missing) kept as a corrupt copy, game starts, no page crash', e.corrupt.includes(badRaw) && f.corrupt.includes(badRaw), { atBoot: { rec: e.rec, farm: e.farm, corruptN: e.corrupt.length, bak: e.bak }, after10s: { bak: f.bak, corruptKept: f.corrupt.includes(badRaw) } }); await ctx2.close();
}
// ---------- 2 savedAt
if (want('2')) {
  const now = Date.now();
  const cases = { null: withAt('null'), '0': withAt('0'), '-1': withAt('-1'), '-1e15': withAt('-1e15'), 'pre-2020 (2019-06-01)': withAt(Date.UTC(2019, 5, 1)), 'future (+1 day)': withAt(now + 864e5), 'future (+1 year)': withAt(now + 365 * 864e5),
    missing: (() => { const d = JSON.parse(fxRaw); delete d.savedAt; return JSON.stringify(d); })(), string: withAt('"yesterday"'), 'control valid 1h ago': withAt(now - 3600e3) };
  for (const [name, raw] of Object.entries(cases)) {
    const ctx = await ctxSeed({ 'eggfarm.save': raw }, null); const p = await ctx.newPage(); const t0 = Date.now(); await boot(p); const s1 = await st(p); const rel = [];
    for (let i = 0; i < 2; i++) { await p.reload(); await p.getByText('Tap to start').click(); await p.waitForTimeout(1500); rel.push(await st(p)); }
    const info = { s1: { farm: s1.farm, off: s1.off, welcome: s1.welcome, rec: s1.rec, savedAt: s1.main?.savedAt, dt: s1.main?.savedAt - t0, corrupt: s1.corrupt.length }, rel: rel.map(r => ({ off: r.off, welcome: r.welcome, savedAt: r.main?.savedAt })) };
    if (name === 'string') ok('savedAt string -> corrupt path (copy kept)', s1.rec && s1.corrupt.includes(raw), info);
    else if (name.startsWith('control')) ok('control: valid 1h savedAt grants offline once', s1.welcome && (s1.off ?? 1) > 0 && rel.every(r => !r.welcome), info);
    else ok(`savedAt ${name}: 0 offline, farm 10 kept, re-stamped now, 2 reloads no reward`, !s1.rec && !s1.welcome && (s1.off ?? 0) === 0 && (s1.farm ?? s1.main?.farm) === 10 && Math.abs(s1.main?.savedAt - t0) < 20000 && rel.every(r => !r.welcome && (r.off ?? 0) === 0 && Math.abs(r.main?.savedAt - Date.now()) < 60000), info);
    await ctx.close();
  }
}
// ---------- 3 write guard
if (want('3')) {
  for (const where of ['main', 'bak', 'idb']) {
    const ctx = await ctxSeed({ 'eggfarm.save': withAt(Date.now()) }, null); const p = await ctx.newPage(); await p.addInitScript(SPY); await boot(p); await p.waitForTimeout(6000);
    const V = v7(); const tInj = await p.evaluate(() => Date.now());
    if (where === 'main') await p.evaluate(v => localStorage.setItem('eggfarm.save', v), V);
    else if (where === 'bak') await p.evaluate(v => localStorage.setItem('eggfarm.save.bak', v), V);
    else await idbOp(p, 'put', V);
    await p.waitForTimeout(12000); await p.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide')); }); await p.waitForTimeout(800);
    const s = await st(p); const idb = await idbOp(p, 'get'); const rawMain = await p.evaluate(() => localStorage.getItem('eggfarm.save')), rawBak = await p.evaluate(() => localStorage.getItem('eggfarm.save.bak'));
    const after = s.w.filter(x => x.t > tInj + 5 && /^eggfarm\.save/.test(x.k) && !(x.ver === 7));
    const txt = await p.evaluate(() => document.querySelector('.newer-save')?.innerText ?? '');
    const intact = where === 'main' ? rawMain === V : where === 'bak' ? rawBak === V : idb === V;
    ok(`write guard v7 in ${where} under live tab: newer-save screen, injected copy intact`, s.newer && intact, { newer: s.newer, txt: txt.slice(0, 100), intact, writesAfterInject: after.map(x => `${x.k}@+${x.t - tInj}ms v${x.ver}`), mainVer: s.main?.v, bakVer: s.bak?.v, idbVer: (() => { try { return JSON.parse(idb).version; } catch { return idb; } })() });
    if (where !== 'idb') ok(`write guard ${where}: zero save writes after injection`, after.length === 0, after);
    else ok('write guard idb-only (known gap): localStorage writes after injection documented; IDB copy survives', intact, { lsWritesAfter: after.length, list: after.map(x => `${x.k}@+${x.t - tInj}ms`), mainNowVer: s.main?.v });
    // reload after: should refuse
    await p.reload(); await p.getByText('Tap to start').click().catch(() => {}); await p.waitForTimeout(2500);
    ok(`write guard ${where}: reload refuses (newer-save), injected copy still intact`, await p.evaluate(() => !!document.querySelector('.newer-save')) && (where === 'idb' ? (await idbOp(p, 'get')) === V : (await p.evaluate(k => localStorage.getItem(k), where === 'main' ? 'eggfarm.save' : 'eggfarm.save.bak')) === V), '');
    await ctx.close();
  }
}
// ---------- 4 reset
if (want('4')) {
  const ctx = await ctxSeed({ 'eggfarm.save': withAt(Date.now()) }, null); const p = await ctx.newPage(); await boot(p);
  await p.evaluate(() => { window.eggfarm.save(); }); await p.waitForTimeout(600); await p.evaluate(() => window.eggfarm.save()); await p.waitForTimeout(1500);
  const before = await st(p); const idbB = await idbOp(p, 'get');
  await p.locator('#settings').click({ force: true }); await p.locator('#sReset').click(); await p.locator('#cReset').click(); await p.waitForTimeout(3000);
  const mid = await p.evaluate(() => ({ main: localStorage.getItem('eggfarm.save'), bak: localStorage.getItem('eggfarm.save.bak') })); const idbMid = await idbOp(p, 'get');
  await p.getByText('Tap to start').click().catch(() => {}); await p.waitForTimeout(8000); const after = await st(p); const idbA = await idbOp(p, 'get');
  const f = r => { try { return JSON.parse(r).state.farmLevel; } catch { return r; } };
  ok('Reset clears main, .bak and IDB (no farm-10 copy anywhere)', before.bak?.farm === 10 && f(idbB) === 10 && mid.main === null && mid.bak === null && (idbMid === null || f(idbMid) !== 10) && after.main?.farm !== 10 && after.bak?.farm !== 10 && f(idbA) !== 10,
    { before: { main: before.main?.farm, bak: before.bak?.farm, idb: f(idbB) }, afterResetReload: { main: mid.main && f(mid.main), bak: mid.bak && f(mid.bak), idb: idbMid && f(idbMid) }, after8s: { main: after.main?.farm, bak: after.bak?.farm, idb: f(idbA) } }); await ctx.close();
}
// ---------- 5 reconcile
if (want('5')) {
  const now = Date.now();
  const rcF = () => { const now = Date.now(); return { 'LS valid farm10 vs IDB savedAt 0 farm12': [{ 'eggfarm.save': withAt(now - 60e3) }, withFarm(withAt('0'), 12), 10],
    'LS savedAt null farm12 vs IDB valid farm10': [{ 'eggfarm.save': withFarm(withAt('null'), 12) }, withAt(now - 60e3), 10],
    'LS valid farm10 vs IDB missing savedAt farm12': [{ 'eggfarm.save': withAt(now - 60e3) }, (() => { const d = JSON.parse(withFarm(fxRaw, 12)); delete d.savedAt; return JSON.stringify(d); })(), 10],
    'LS valid farm10 vs IDB pre-2020 farm12': [{ 'eggfarm.save': withAt(now - 60e3) }, withFarm(withAt(Date.UTC(2019, 0, 1)), 12), 10],
    'LS valid farm10 vs IDB FUTURE (+1d) farm12': [{ 'eggfarm.save': withAt(now - 60e3) }, withFarm(withAt(now + 864e5), 12), 10],
    'LS FUTURE (+1d) farm12 vs IDB valid farm10': [{ 'eggfarm.save': withFarm(withAt(now + 864e5), 12) }, withAt(now - 60e3), 10],
    'LS valid farm10 vs IDB FUTURE (+1y) farm12': [{ 'eggfarm.save': withAt(now - 60e3) }, withFarm(withAt(now + 365 * 864e5), 12), 10],
    'LS FUTURE (+1y) farm12 vs IDB valid farm10': [{ 'eggfarm.save': withFarm(withAt(now + 365 * 864e5), 12) }, withAt(now - 60e3), 10],
    'LS valid farm10 vs IDB FUTURE (+3min) farm12': [{ 'eggfarm.save': withAt(now - 60e3) }, withFarm(withAt(now + 180e3), 12), 10],
    'LS FUTURE (+3min) farm12 vs IDB valid farm10': [{ 'eggfarm.save': withFarm(withAt(now + 180e3), 12) }, withAt(now - 60e3), 10],
    'control LS valid farm10 vs IDB +1min (within 2 min skew) farm12': [{ 'eggfarm.save': withAt(now - 60e3) }, withFarm(withAt(now + 60e3), 12), 12],
    'control LS older farm10 vs IDB newer valid farm12': [{ 'eggfarm.save': withAt(now - 120e3) }, withFarm(withAt(now - 30e3), 12), 12] }; };
  for (const n of Object.keys(rcF())) { const [ls, idb, exp] = rcF()[n]; const ctx = await ctxSeed(ls, idb); const p = await ctx.newPage(); await boot(p); await p.waitForTimeout(6000); const s = await st(p); let ifarm = null; try { ifarm = JSON.parse(await idbOp(p, 'get')).state.farmLevel; } catch {}
    ok(`reconcile ${n}: loads farm ${exp}, main+IDB end at farm ${exp} (losing copy never overwrites the winner)`, s.farm === exp && s.main?.farm === exp && ifarm === exp, { farm: s.farm, off: s.off, main: s.main, idbFarm: ifarm }); await ctx.close(); }
}
// ---------- 6 flash
if (want('6')) {
  for (const n of ['new player', 'returning player']) { const ctx = await ctxSeed(n === 'new player' ? {} : { 'eggfarm.save': withAt(Date.now() - 60e3) }, null); const p = await ctx.newPage(); await p.addInitScript(SPY);
    await boot(p); await p.waitForTimeout(3000); await p.reload(); await p.getByText('Tap to start').click(); await p.waitForTimeout(3000); const s = await st(p);
    ok(`no 'open in another tab' flash on normal load + reload (${n})`, s.flash.length === 0, { flash: s.flash.length }); await ctx.close(); }
}
await br.close(); srv.stop(); console.log(`${res.filter(r => r.p).length}/${res.length} passed`); process.exit(0);
