// usage (in worktree): vite-node browser-b.mjs <root> <dist> <port> <engine> <expectBuild>
const [root, dist, port, engine, expect] = process.argv.slice(2);
const S = await import(root + '/src/save/save.ts'); const { balance } = await import(root + '/src/config/balance.ts'); const { initialState } = await import(root + '/src/sim/state.ts');
const { chromium, firefox, webkit } = await import('playwright-core');
const http = await import('node:http'), fs = await import('node:fs'), path = await import('node:path');
const srv = http.createServer((q, r) => { let p = path.join(dist, decodeURIComponent(q.url.split('?')[0])); if (p.endsWith('/')) p += 'index.html';
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : p.endsWith('.css') ? 'text/css' : 'application/octet-stream' }); r.end(d); }); }).listen(+port, '127.0.0.1');
const off = { ...balance, m4: { ...balance.m4, enabled: 0 } }; const now = Date.now();
const base = { ...initialState(off) }; for (const k of ['hensLevel', 'eggValueLevel', 'celebratedMilestones', 'tracksV7']) delete base[k];
const mk = (c, t, q) => { const sj = JSON.stringify({ ...base, coinsCents: c }); return `{"version":6,"savedAt":${t},${q ? `"saveSeq":${q},` : ''}"sum":"${S.checksum(sj)}","state":${sj}}`; };
const L = engine === 'webkit' ? webkit : engine === 'firefox' ? firefox : chromium;
const br = await L.launch(engine === 'chromium' ? { executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {});
const out = { engine, port };
const page = await (await br.newContext()).newPage(); const url = `http://127.0.0.1:${port}/`;
await page.goto(url); await page.waitForTimeout(1500);
out.buildIdInLoadedScript = await page.evaluate(async (e) => { const s = [...document.scripts].map(x => x.src).filter(Boolean); for (const u of s) { if ((await (await fetch(u)).text()).includes(e)) return u.split('/').pop(); } return null; }, expect);
const idb = (op, raw) => page.evaluate(([op, raw]) => new Promise((res, rej) => { const r = indexedDB.open('eggfarm', 1); r.onupgradeneeded = () => r.result.createObjectStore('save');
  r.onsuccess = () => { const tx = r.result.transaction('save', op === 'get' ? 'readonly' : 'readwrite'); const st = tx.objectStore('save'); const q = op === 'get' ? st.get('main') : st.put(raw, 'main'); q.onsuccess = () => { const v = q.result; r.result.close(); res(op === 'get' ? v ?? null : true); }; q.onerror = () => rej(String(q.error)); }; r.onerror = () => rej(String(r.error)); }), [op, raw]);
const coins = s => s ? JSON.parse(s).state.coinsCents : null; const keys4 = s => s ? ['saveSeq', 'hensLevel', 'eggValueLevel', 'celebratedMilestones'].filter(k => s.includes('"' + k + '"')) : null;
// exact case (b): seq-5 copy 1000 coins (stale, in IDB + .bak), flag-off LS save 999,999 (no seq), reload
const stale = mk(1000, now - 600000, 5), fresh = mk(99999900, now - 2000);
await page.evaluate(([s, f]) => { localStorage.clear(); localStorage.setItem('eggfarm.save', f); }, [stale, fresh]); await idb('put', stale);
await page.reload(); await page.waitForTimeout(4000);
const ls = await page.evaluate(() => localStorage.getItem('eggfarm.save')); const ib = await idb('get');
out.b_lsCoinsAfterReload = coins(ls); out.b_idbCoinsAfterReload = coins(ib); out.b_pass = coins(ls) >= 99999900; out.b_lsM4keys = keys4(ls); out.b_idbM4keys = keys4(ib);
// flag-off main save round-trip in browser: no M4 keys in LS / .bak / IDB after boot+autosave
const main = fs.readFileSync(process.argv[7] ?? '', 'utf8').trim();
await page.evaluate(m => { localStorage.clear(); localStorage.setItem('eggfarm.save', m); }, main); await idb('put', main);
await page.reload(); await page.waitForTimeout(12000); await page.reload(); await page.waitForTimeout(6000);
const ls2 = await page.evaluate(() => [localStorage.getItem('eggfarm.save'), localStorage.getItem('eggfarm.save.bak')]); const ib2 = await idb('get');
out.rt_lsM4keys = keys4(ls2[0]); out.rt_bakM4keys = keys4(ls2[1]); out.rt_idbM4keys = keys4(ib2); out.rt_lsRewritten = ls2[0] !== main;
out.rt_inputStateKeysKept = Object.keys(JSON.parse(main).state).every(k => k in JSON.parse(ls2[0]).state); out.rt_keyOrderSame = JSON.stringify(Object.keys(JSON.parse(main).state)) === JSON.stringify(Object.keys(JSON.parse(ls2[0]).state));
console.log(JSON.stringify(out)); await br.close(); srv.close(); process.exit(0);
