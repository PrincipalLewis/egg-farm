// Claude QA4 repro on 7d52952. node qa4r.mjs <engine> <outdir> [part=cards|seed|tut]
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const pw = createRequire(process.cwd() + '/package.json')('playwright-core');
const [ENG, OUT, PART] = process.argv.slice(2);
const sv = (dir, port) => spawn('npx', ['vite','preview','--outDir',dir,'--port',String(port),'--strictPort','--host','127.0.0.1'], { stdio:'ignore', detached:true });
const srvs = [sv('dist-qa', 4351), sv('dist', 4352)]; const kill = () => srvs.forEach(s => { try { process.kill(-s.pid,'SIGTERM'); } catch {} }); process.on('exit', kill);
for (const p of [4351, 4352]) for (let i = 0; i < 240; i++) { try { await fetch(`http://127.0.0.1:${p}/`); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
const br = await pw[ENG].launch(ENG === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {});
const DONE = JSON.stringify({ onboardingDone: true, sessions: 3, seenSlots: 99, workersIntroA: true, workersIntroB: true });
const R = {}; const log = (k, v) => { R[k] = v; console.log(k, JSON.stringify(v).slice(0, 900)); };
async function open(w, h, { ui = DONE, port = 4351, q = '' } = {}) { const ctx = await br.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); const con = []; p.on('console', m => con.push(m.type() + ': ' + m.text())); p.on('pageerror', e => con.push('pageerror: ' + e));
  await p.addInitScript(u => { if (!sessionStorage.qa) { localStorage.clear(); if (u) localStorage.setItem('eggfarm.ui', u); sessionStorage.qa = 1; } }, ui);
  await p.goto(`http://127.0.0.1:${port}/${q}`, { timeout: 90000 }); await p.getByText('Tap to start').click(); await p.waitForTimeout(900); return { ctx, p, con }; }
if (!PART || PART === 'cards') for (const w of [320, 360, 375, 390, 430, 1280]) {
  for (const [name, o] of [['b999', { basket: 999.9e9, customers: [{ id: 1, demand: 999.9e9, filled: 0, waitedS: 0 }, { id: 2, demand: 1.2e12, filled: 5e11, waitedS: 0 }] }], ['t1500', { basket: 1.5e15, customers: [{ id: 3, demand: 1e18, filled: 0, waitedS: 0 }] }], ['k12960', { basket: 12960, customers: [{ id: 4, demand: 20000, filled: 0, waitedS: 0 }] }]]) {
    const a = await open(w, w > 900 ? 720 : 740); await a.p.evaluate(o => { const g = window.eggfarm; g.state = { ...g.state, nextCustomerInS: 999, ...o }; }, o);
    if (w < 960) await a.p.locator('[data-nav=market]').click().catch(() => {}); await a.p.waitForTimeout(600);
    const r = await a.p.evaluate(() => ({ rows: [...document.querySelectorAll('#mRows .order')].map(o => { const l = o.querySelector('.l1'), b = o.querySelector('.btn.sell, button[data-id]'); return { l1: l?.textContent, sw: l?.scrollWidth, cw: l?.clientWidth, clipped: l ? l.scrollWidth > l.clientWidth + 1 : null, to: l ? getComputedStyle(l).textOverflow : null, btn: b?.textContent, btnAria: b?.getAttribute('aria-label'), btnSw: b?.scrollWidth, btnCw: b?.clientWidth }; }), sellAll: document.querySelector('#sellAll')?.textContent }));
    await a.p.screenshot({ path: `${OUT}/${ENG}-${name}-w${w}.png` }); log(`${ENG} cards ${name} w${w}`, r); await a.ctx.close(); } }
if (!PART || PART === 'seed') { const res = {};
  for (const [lab, q] of [['seed7-a', '?marketSeed=7'], ['seed7-b', '?marketSeed=7'], ['noseed-a', ''], ['noseed-b', '']]) { const a = await open(390, 844, { port: 4352, q }); await a.p.waitForTimeout(12000);
    const s = await a.p.evaluate(() => { try { const f = JSON.parse(localStorage.getItem('eggfarm.save')); const st = f.state; return { rng: st.rng, customers: st.customers?.map(c => c.demand), nextIn: st.nextCustomerInS, id: document.documentElement.innerHTML.match(/m\d-rc[\w-]*\+[0-9a-f]{7}/)?.[0] || null, eggfarmGlobal: typeof window.eggfarm }; } catch (e) { return String(e); } });
    const bundleId = await (async () => { const h = await (await fetch('http://127.0.0.1:4352/')).text(); const j = h.match(/assets\/index-[^"]+\.js/)[0]; const b = await (await fetch('http://127.0.0.1:4352/' + j)).text(); return { id: (b.match(/m\d+-rc[\w-]*\+[0-9a-f]{7}/) || [])[0], hasMarketSeed: b.includes('marketSeed') }; })();
    res[lab] = { ...s, bundleId, console: a.con }; await a.p.screenshot({ path: `${OUT}/${ENG}-marketseed-${lab}.png` }); await a.ctx.close(); }
  fs.writeFileSync(`${OUT}/${ENG}-marketseed-console.log`, Object.entries(res).map(([k, v]) => `## ${k}\n` + (v.console || []).join('\n')).join('\n'));
  log(`${ENG} seed`, Object.fromEntries(Object.entries(res).map(([k, v]) => [k, { rng: v.rng, customers: v.customers, nextIn: v.nextIn, bundleId: v.bundleId, eggfarmGlobal: v.eggfarmGlobal }]))); }
if (!PART || PART === 'tut') for (const [w, h] of [[360, 740], [375, 700], [1280, 720]]) {
  const a = await open(w, h, { ui: null }); const P = a.p; const cap = () => P.evaluate(() => { const r = e => { const b = e?.getBoundingClientRect(); return b && b.width ? [b.left|0, b.top|0, b.right|0, b.bottom|0] : null; }; return { cap: document.querySelector('.onb-cap')?.textContent, hand: r(document.querySelector('.onb-hand')), ring: r(document.querySelector('.onb-ring')), sheet: !!document.querySelector('.sheet:not([hidden])'), basket: window.eggfarm.state.basket, coins: window.eggfarm.state.coinsCents }; });
  const out = { start: await cap() };
  await P.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, customers: [{ id: 801, demand: 3, filled: 0, waitedS: 0 }] }; }); await P.waitForTimeout(400);
  await P.locator('#queue .chip:not(.empty), #mRows button[data-id]').first().click({ timeout: 3000 }).catch(e => out.tapErr = String(e).slice(0, 120)); await P.waitForTimeout(600); out.afterCustomerTapStep1 = await cap(); await P.screenshot({ path: `${OUT}/${ENG}-tut-custtap-step1-${w}x${h}.png` });
  await P.locator('.sheet:not([hidden]) .close').click().catch(() => {}); await P.waitForTimeout(300);
  await P.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coop: 30 }; }); for (let i = 0; i < 3; i++) { await P.locator('#collect').click().catch(() => {}); await P.waitForTimeout(150); }
  out.afterCollect = await cap(); await P.locator('#queue .chip:not(.empty), #mRows button[data-id]').first().click({ timeout: 3000 }).catch(() => {}); await P.waitForTimeout(600); out.afterCustomerTapStep2 = await cap();
  await P.locator('#mRows button[data-id]').first().click({ timeout: 3000 }).catch(() => {}); await P.waitForTimeout(600); out.afterSell = await cap(); await P.screenshot({ path: `${OUT}/${ENG}-tut-aftersell-${w}x${h}.png` });
  out.errors = a.con.filter(c => /error/.test(c)); log(`${ENG} tut ${w}x${h}`, out); await a.ctx.close(); }
fs.writeFileSync(`${OUT}/qa4-${ENG}-${PART || 'all'}.json`, JSON.stringify(R, null, 1)); await br.close(); kill(); console.log('DONE', ENG, PART); process.exit(0);
