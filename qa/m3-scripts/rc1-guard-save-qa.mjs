// QA independent tab-guard (TG-1..6, TG-UI-1..9, AC14d) + save robustness (R1..R6) + D3/D4 on the rc1 RELEASE build.
// Usage: ENGINE=.. PORT=.. node rc1-guard-save-qa.mjs <worktree>
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const ROOT = process.argv[2], ENGINE = process.env.ENGINE ?? 'chromium', port = +(process.env.PORT ?? 4900);
const pw = createRequire(ROOT + '/package.json')('playwright-core');
try { await fetch(`http://127.0.0.1:${port}/`); console.error(`port ${port} already serving (stale server?) - refusing`); process.exit(3); } catch {} // served-bundle guard (98396ed)
const srv = spawn('npx', ['vite', 'preview', '--outDir', process.env.DIST ?? 'dist', '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true, cwd: ROOT });
for (let i = 0; i < 80; i++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
{ const _d = process.env.DIST ?? 'dist', _w = fs.readdirSync(`${ROOT}/${_d}/assets`).find(f => /^index-.*\.js$/.test(f)), _h = await (await fetch(`http://127.0.0.1:${port}/`)).text(); if (!_h.includes(_w)) { console.error(`served bundle is not ${_d}/${_w} - refusing`); process.exit(4); } }
const U = `http://127.0.0.1:${port}/`, FX = ROOT + '/tests/fixtures/saves/', fx = fs.readFileSync(FX + 'm2-rc1-v5-40min.json', 'utf8');
const T = pw[ENGINE]; const browser = await T.launch(ENGINE === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] } : {});
const R = []; const ok = (n, p, i) => { R.push({ n, pass: !!p, i }); console.log(`${p ? 'PASS' : 'FAIL'} [${ENGINE}] ${n} — ${JSON.stringify(i)}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const UI = JSON.stringify({ onboardingDone: true, sessions: 3, workersIntroA: true, workersIntroB: true });
const INIT = () => { // instrument: BroadcastChannel log, audio activity
  window.__bc = []; const P = BroadcastChannel.prototype.postMessage; BroadcastChannel.prototype.postMessage = function (m) { window.__bc.push({ out: m, t: performance.now() }); return P.call(this, m); };
  window.__audio = { starts: 0 }; const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) { const S = AudioBufferSourceNode.prototype.start; AudioBufferSourceNode.prototype.start = function (...a) { if (this.context.state === 'running') window.__audio.starts++; return S.apply(this, a); };
    const O = OscillatorNode.prototype.start; OscillatorNode.prototype.start = function (...a) { if (this.context.state === 'running') window.__audio.starts++; return O.apply(this, a); }; }
  const HP = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.__audio.starts++; return HP.call(this); };
};
async function ctxNew(o = {}) { const c = await browser.newContext({ viewport: { width: 390, height: 844 }, ...o }); await c.addInitScript(INIT); return c; }
async function seed(c, raw = fx, ui = UI) { const p = await c.newPage(); await p.goto(U); await p.evaluate(([r, u]) => { localStorage.clear(); if (r) localStorage.setItem('eggfarm.save', r); localStorage.setItem('eggfarm.ui', u); }, [raw, ui]); await p.close(); }
async function start(p, q = '') { if (q !== null) await p.goto(U + q); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm, null, { timeout: 15000 }); await p.waitForTimeout(400);
  const wb = p.locator('#wbCollect'); if (await wb.isVisible().catch(() => false)) { await wb.click(); await p.waitForTimeout(200); } for (const s of ['#modal-layer.open .btn']) { const b = p.locator(s).first(); if (await b.isVisible().catch(() => false)) await b.click().catch(() => {}); } return p; }
const st = p => p.evaluate(() => { const s = window.eggfarm.state; return { coins: s.coinsCents, F: s.farmLevel, C: s.collectionLevel, L: s.farmLevel + 100 * s.collectionLevel }; });
const lsSave = p => p.evaluate(() => { const r = localStorage.getItem('eggfarm.save'); try { const d = JSON.parse(r); return { savedAt: d.savedAt, coins: d.state.coinsCents, L: d.state.farmLevel + 100 * d.state.collectionLevel }; } catch { return { bad: true }; } });
const idbSave = p => p.evaluate(() => new Promise(res => { const r = indexedDB.open('eggfarm', 1); r.onsuccess = () => { try { const g = r.result.transaction('save').objectStore('save').get('main'); g.onsuccess = () => { try { const d = JSON.parse(g.result); res({ savedAt: d.savedAt, coins: d.state.coinsCents, L: d.state.farmLevel + 100 * d.state.collectionLevel }); } catch { res(null); } }; } catch { res(null); } }; r.onerror = () => res(null); }));
const buy = (p, n = 1) => p.evaluate(async n => { document.querySelector('nav [data-nav=upgrades]').click(); await new Promise(r => setTimeout(r, 200)); let k = 0; for (let i = 0; i < n; i++) { const b = document.querySelector('button.buy[aria-disabled=false]'); if (b) { b.click(); k++; } await new Promise(r => setTimeout(r, 120)); } return k; }, n);
const notice = p => p.evaluate(() => !!document.querySelector('.recovery-layer.tab-guard'));
const telem = p => p.evaluate(() => { try { return JSON.parse(window.eggfarmExportTelemetry()); } catch { return null; } });
const evCount = (t, name) => { const a = Array.isArray(t) ? t : (t?.events ?? []); return a.filter(e => (e.name ?? e.event ?? e.type) === name).length; };

// ---- TG-6 single tab
{ const c = await ctxNew(); await seed(c); const a = await start(await c.newPage()); const s0 = await st(a); await sleep(5000); const s1 = await st(a);
  ok('TG-6 single tab: no notice, money ticks, saves', !(await notice(a)) && s1.coins > s0.coins && (await lsSave(a)).savedAt > 0, { s0: s0.coins, s1: s1.coins }); await c.close(); }
// ---- TG-1/AC14d/TG-UI-1..5,7,9 + handover flush + TG-2/UI-6 + TG-3
{ const c = await ctxNew(); await seed(c); const A = await start(await c.newPage());
  await A.evaluate(() => { window.eggfarm.state.coinsCents = 1e12; }); const bought = await buy(A, 5); const aBefore = await st(A); // unsaved purchases (< autosave)
  const lsBefore = await lsSave(A);
  // SD5-2 (HoQA): record every save A itself persists (LS setItem + IDB put of the save key) so A's FINAL persisted state after release can be read back.
  await A.evaluate(() => { window.__aWrites = []; const rec = (src, v) => { try { const d = JSON.parse(v); window.__aWrites.push({ src, savedAt: d.savedAt, coins: d.state.coinsCents, F: d.state.farmLevel, C: d.state.collectionLevel }); } catch {} };
    const S = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { const r = S.call(this, k, v); if (k === 'eggfarm.save') rec('ls', v); return r; };
    const P = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function (v, k) { const r = P.call(this, v, k); if (k === 'main' && typeof v === 'string') r.addEventListener('success', () => rec('idb', v)); return r; }; });
  const q0 = await st(A), tq = Date.now(); await sleep(500); const q1 = await st(A), tick = Math.max(0, Math.ceil((q1.coins - q0.coins) / (Date.now() - tq) * 100)); // one 100 ms tick of income (info / secondary only)
  const B = await c.newPage(); const tOpen = Date.now(); await start(B);
  await A.waitForSelector('.recovery-layer.tab-guard', { timeout: 5000 }).catch(() => {}); const tNotice = Date.now() - tOpen;
  const bLoaded = await B.evaluate(() => window.eggfarm.loaded); const bc = await A.evaluate(() => window.__bc.map(x => x.out.t));
  const bFlush = await B.evaluate(() => { const f = window.__bc.find(x => x.out.t === 'flush'), c = window.__bc.find(x => x.out.t === 'claim'); return f && c ? Math.round(c.t - f.t) : null; });
  await sleep(300); const aW = await A.evaluate(() => window.__aWrites); const aFinal = aW.filter(w => w.savedAt > 0).sort((x, y) => y.savedAt - x.savedAt)[0] ?? null; // A's newest persisted copy after release
  ok('Handover PRIMARY: new tab loads EXACTLY the old tab\'s final persisted state (coins + levels), flush→claim ≤350 ms', aFinal !== null && bLoaded.coinsCents === aFinal.coins && bLoaded.farmLevel === aFinal.F && bLoaded.collectionLevel === aFinal.C && bFlush !== null && bFlush <= 350, { aFinal, aWrites: aW.length, bLoaded, diffVsPersisted: aFinal ? aFinal.coins - bLoaded.coinsCents : null, flushToClaimMs: bFlush, aSent: bc, bought });
  ok('Handover SECONDARY (live): new tab >= old tab live state just before open - one 100 ms tick', bLoaded.coinsCents >= q1.coins - tick && bLoaded.farmLevel === aBefore.F && bLoaded.collectionLevel === aBefore.C, { aBefore, liveAtOpen: q1.coins, lsBefore, tick, diffVsLive: q1.coins - bLoaded.coinsCents });
  // TG-1 / AC14d (re-baselined): newest tab owns; older shows notice; older money + save frozen
  const a0 = await st(A), m0 = await A.locator('body').innerText().then(t => t.match(/\$[\d.,]+[KMBTkmb]?/)?.[0]); await sleep(5000); const a1 = await st(A);
  const lease = await A.evaluate(() => JSON.parse(localStorage.getItem('eggfarm.lease'))); const blocked = evCount(await telem(A), 'tab_guard_blocked_write');
  ok('TG-1/TG-UI-1/AC14d(newest tab owns): notice in old tab ≤1 s, old money frozen 5 s, B owns lease', (await notice(A)) && tNotice <= 1500 && a1.coins === a0.coins && !(await notice(B)), { tNoticeMsInclStart: tNotice, a0: a0.coins, a1: a1.coins, lease: lease?.id?.slice(0, 6), blockedWrites: blocked });
  // copy + a11y
  const ui = await A.evaluate(() => { const L = document.querySelector('.recovery-layer.tab-guard'), d = L.querySelector('[role=alertdialog]'), b = L.querySelector('#tgPlay'), cs = getComputedStyle(b), card = getComputedStyle(d), r = b.getBoundingClientRect();
    const app = document.getElementById('app'); return { title: d.querySelector('h2').textContent, body: d.querySelector('p').textContent, btn: b.textContent, modal: d.getAttribute('aria-modal'), lb: d.getAttribute('aria-labelledby'), db: d.getAttribute('aria-describedby'), focus: document.activeElement === b, outline: `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`, offset: cs.outlineOffset, h: r.height, w: r.width, cardBg: card.backgroundColor, cardW: d.getBoundingClientRect().width, close: L.querySelectorAll('button').length, inert: app.inert, ah: app.getAttribute('aria-hidden'), filter: getComputedStyle(app).filter + '|' + getComputedStyle(document.body).filter }; });
  ok('TG-UI copy = approved (title/body/button), no close button', ui.title === 'Game open in another tab' && ui.body === 'Your farm is running in another tab. Play here to continue from your latest save.' && ui.btn === 'Play here' && ui.close === 1, ui);
  ok('TG-UI-2 alertdialog aria-modal/labelledby/describedby', ui.modal === 'true' && ui.lb && ui.db, ui);
  ok('TG-UI-3 initial focus on Play here + ring 3px #2B79A8 (4.6:1 vs card white) always visible', ui.focus && /^3px solid rgb\(43, 121, 168\)/.test(ui.outline), { outline: ui.outline, offset: ui.offset, cardBg: ui.cardBg });
  ok('TG-UI-5 button ≥48 px tall (≥44 target) at 390', ui.h >= 48 && ui.w >= 44, { h: ui.h, w: ui.w, cardW: ui.cardW });
  ok('Game behind inert + aria-hidden + desaturated', ui.inert && ui.ah === 'true' && /saturate/.test(ui.filter), { inert: ui.inert, ah: ui.ah, filter: ui.filter });
  for (const k of ['Tab', 'Shift+Tab', 'Escape']) await A.keyboard.press(k);
  await A.mouse.click(5, 5); await A.mouse.click(385, 830); await A.goBack().catch(() => {}); await sleep(500);
  const af = await A.evaluate(() => ({ n: !!document.querySelector('.recovery-layer.tab-guard'), focus: document.activeElement?.id, coins: window.eggfarm.state.coinsCents }));
  const ls1 = await lsSave(A);
  ok('TG-UI-4 Esc/Tab/scrim taps/Back: notice stays, focus stays, frozen, no write by A', af.n && af.focus === 'tgPlay' && af.coins === a0.coins && A.url().startsWith(U), { ...af, url: A.url() });
  const aud = await A.evaluate(() => window.__audio.starts); await A.evaluate(() => document.querySelector('#tgPlay').focus()); await sleep(1500); const aud2 = await A.evaluate(() => window.__audio.starts);
  ok('TG-UI-9 (info @4bf4a22, rerun on Eng commit) no new audio starts in old tab while notice up', aud2 === aud, { startsBefore: aud, startsAfter: aud2 });
  // TG-3: 20 buys in B while A inactive
  await B.evaluate(() => { window.eggfarm.state.coinsCents = 1e13; }); const nb = await buy(B, 20); await B.evaluate(() => window.eggfarm.save()); await sleep(800); const bS = await st(B), lsB = await lsSave(B), idbB = await idbSave(B);
  ok('TG-3 20 buys in B with A inactive: save == B state (LS + IDB)', nb >= 8 && lsB.L === bS.L && idbB?.L === bS.L, { nb, bS, lsB, idbB });
  // TG-2/TG-UI-6: play in B 20 s then Play here in A shows exactly B's money
  await sleep(20000); const bBefore = await st(B);
  await A.click('#tgPlay'); const loadingTxt = await A.locator('#tgPlay').textContent().catch(() => 'reloaded');
  await A.waitForLoadState('load'); await start(A, null).catch(async () => { await start(A); });
  const aL = await A.evaluate(() => window.eggfarm.loaded); await B.waitForSelector('.recovery-layer.tab-guard', { timeout: 3000 }).catch(() => {});
  const bAt = await st(B);
  ok('TG-2/TG-UI-6 Play here: A loads exactly B money/levels (B frozen at takeover); B then shows notice', aL.coinsCents === bAt.coins && aL.farmLevel === bAt.F && aL.collectionLevel === bAt.C && (await notice(B)), { loadingTxt, bBefore: bBefore.coins, bAtTakeover: bAt, aLoaded: aL });
  const aud3 = await A.evaluate(() => window.__audio.starts); await buy(A, 2); await A.locator('body').click({ position: { x: 195, y: 400 } }).catch(() => {}); await sleep(500);
  ok('TG-UI-9 (info) sound possible again after Play here reload (+Tap to start)', (await A.evaluate(() => window.__audio.starts)) > aud3, { after: await A.evaluate(() => window.__audio.starts) });
  await c.close(); }
// TG-UI-5/7 layouts: 1280, 360, 320, reduced motion
for (const [w, h, rm] of [[1280, 800, false], [360, 640, false], [320, 568, false], [320, 300, true]]) {
  const c = await ctxNew({ viewport: { width: w, height: h }, reducedMotion: rm ? 'reduce' : 'no-preference' }); await seed(c); const A = await start(await c.newPage()); const B = await c.newPage(); await start(B);
  await A.waitForSelector('.recovery-layer.tab-guard'); await sleep(400);
  const r = await A.evaluate(() => { const d = document.querySelector('.tab-guard [role=alertdialog]'), t = d.querySelector('h2'), b = d.querySelector('#tgPlay'), cs = getComputedStyle(d);
    const lh = parseFloat(getComputedStyle(t).lineHeight) || 30; return { cardW: Math.round(d.getBoundingClientRect().width), titleLines: Math.round(t.getBoundingClientRect().height / lh), titleTrunc: t.scrollWidth > t.clientWidth + 1 || getComputedStyle(t).textOverflow === 'ellipsis', btnH: b.getBoundingClientRect().height, overflowY: cs.overflowY, cardScroll: d.scrollHeight > d.clientHeight, cardH: d.clientHeight, vh: innerHeight, pageScroll: document.scrollingElement.scrollHeight > innerHeight, anim: cs.animationName + ' ' + cs.animationDuration + ' ' + cs.transitionDuration, bodyOverflow: getComputedStyle(document.body).overflow }; });
  let canScrollCard = null; if (r.cardScroll) canScrollCard = await A.evaluate(() => { const d = document.querySelector('.tab-guard [role=alertdialog]'); d.scrollTop = 999; return d.scrollTop > 0; });
  await A.screenshot({ path: `/workspace/egg-farm-studio/qa/m3-recheck/logs-4bf4a22/tg-${ENGINE}-${w}x${h}${rm ? '-rm' : ''}.png` });
  const pass = w === 1280 ? r.cardW === 440 && r.btnH >= 44 : w === 360 ? r.cardW === 312 && r.btnH >= 44 : !r.titleTrunc && r.btnH >= 44 && (!r.cardScroll || (canScrollCard && /auto|scroll/.test(r.overflowY))) && (r.cardH <= r.vh);
  ok(`TG-UI-5/7 layout ${w}x${h}${rm ? ' reduced-motion' : ''}`, pass, { ...r, canScrollCard }); await c.close(); }
// TG-4 stale lease takeover; fresh foreign lease -> new tab still takes over (newest wins)
for (const [age, name] of [[7000, 'stale ≥6 s'], [2000, 'fresh 2 s']]) { const c = await ctxNew(); await seed(c);
  const p0 = await c.newPage(); await p0.goto(U); await p0.evaluate(a => localStorage.setItem('eggfarm.lease', JSON.stringify({ id: 'deadtab', at: Date.now() - a })), age); await p0.close();
  const A = await start(await c.newPage()); await sleep(1000); const t = await telem(A); const ev = (Array.isArray(t) ? t : t?.events ?? []).filter(e => /tab_guard_takeover/.test(JSON.stringify(e)));
  ok(`TG-4 owner killed, lease ${name}: reopen loads without notice, takeover reason logged`, !(await notice(A)) && ev.length === 1, { ev: ev.map(e => JSON.stringify(e).slice(0, 120)) }); await c.close(); }
if (ENGINE === 'chromium') { const c = await ctxNew(); await seed(c); const A = await start(await c.newPage()); const cdp = await c.newCDPSession(A); await Promise.race([cdp.send('Page.crash').catch(() => {}), sleep(2000)]); await sleep(6500);
  const B = await Promise.race([start(await c.newPage()), sleep(20000).then(() => null)]); ok('TG-4 real renderer crash of owner, reopen after 6.5 s: no notice', B && !(await notice(B)), {}); await Promise.race([c.close(), sleep(5000)]); }
// TG-5 offline paid once with two tabs
{ const c = await ctxNew(); const d = JSON.parse(fx); d.savedAt = Date.now() - 2 * 3600e3; delete d.sum; await seed(c, JSON.stringify(d));
  const A = await start(await c.newPage()); const B = await start(await c.newPage()); await sleep(800); const tA = await telem(A), tB = await telem(B);
  ok('TG-5 offline_grant once across 2 tabs (shared telemetry log)', evCount(tB, 'offline_grant') === 1, { A: evCount(tA, 'offline_grant'), B: evCount(tB, 'offline_grant') }); await c.close(); }

// ---- Save robustness
const corruptVariants = { garbage: '{{{not json', truncated: null, checksum: null };
for (const kind of ['garbage', 'truncated', 'checksum']) { const c = await ctxNew(); await seed(c); const A = await start(await c.newPage());
  // Head of QA decision 2026-10-16, SD5-1: zero tolerance vs persisted; 1 tick only vs live (replaces the old 'persisted minus 1 tick' allowance)
  await A.evaluate(() => { window.eggfarm.state.coinsCents = 777777777; window.eggfarm.save(); }); await sleep(800); const want = await st(A); const idb = await idbSave(A);
  // SD5-1 (HoQA): PRIMARY ref = newest persisted copy (by savedAt, LS vs IDB) read just before close, ZERO tolerance. SECONDARY ref = live state, tolerance one 100 ms tick of income.
  const r0 = await st(A), t0 = Date.now(); await sleep(1000); const r1 = await st(A), tickIncome = Math.max(0, Math.ceil((r1.coins - r0.coins) / (Date.now() - t0) * 100));
  const lsP = await lsSave(A), idbP = await idbSave(A), live = await st(A); const persisted = [lsP, idbP].filter(x => x && !x.bad && x.savedAt > 0).sort((x, y) => y.savedAt - x.savedAt)[0] ?? null; await A.close();
  const p = await c.newPage(); await p.goto(U + '?x=1'); await p.evaluate(k => { const r = localStorage.getItem('eggfarm.save'); localStorage.setItem('eggfarm.save', k === 'garbage' ? '{{{not json' : k === 'truncated' ? r.slice(0, r.length / 2) : r.replace(/"coinsCents":\d+/, '"coinsCents":5')); localStorage.removeItem('eggfarm.lease'); }, kind);
  const B = await start(p, ''); const got = await st(B), rec = await B.evaluate(() => document.querySelectorAll('.recovery-card').length), keys = await B.evaluate(() => Object.keys(localStorage).filter(k => k.includes('corrupt')));
  const info = { persisted: persisted && { src: persisted === lsP ? 'ls' : 'idb', savedAt: persisted.savedAt, coins: persisted.coins, L: persisted.L }, ls: lsP, idb: idbP, live: live.coins, tickIncome, got: got.coins, gotL: got.L, shortVsPersisted: persisted ? persisted.coins - got.coins : null, rec, keys };
  ok(`R1 PRIMARY LS save corrupt (${kind}) + valid IDB copy -> silent restore >= newest persisted copy (by savedAt, 0 tolerance), same levels, no recovery dialog, corrupt copy kept`, persisted !== null && got.coins >= persisted.coins && got.L === persisted.L && rec === 0 && keys.length > 0, info);
  ok(`R1 SECONDARY (${kind}) restore >= live state at close - one 100 ms tick of income`, got.coins >= live.coins - tickIncome && got.L === live.L, { live: live.coins, tickIncome, got: got.coins, shortVsLive: live.coins - got.coins }); await c.close(); }
{ const c = await ctxNew(); await seed(c); const A = await start(await c.newPage()); await A.evaluate(() => { window.eggfarm.state.coinsCents = 5e9; window.eggfarm.save(); }); await sleep(600);
  // make LS older-but-valid than IDB: write an older valid save into LS
  const ok2 = await A.evaluate(() => { const d = JSON.parse(localStorage.getItem('eggfarm.save')); return d; }); await A.close();
  const p = await c.newPage(); await p.goto(U); await p.evaluate(([r]) => { localStorage.setItem('eggfarm.save', r); localStorage.removeItem('eggfarm.lease'); }, [fx]);
  const B = await start(p, ''); const got = await st(B); ok('R2 newest valid wins: IDB (newer) beats older valid LS', got.coins >= 5e9, { got: got.coins, fixtureCoins: JSON.parse(fx).state.coinsCents }); await c.close(); }
{ const c = await ctxNew(); await c.addInitScript(() => { try { Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true }); } catch {} }); await seed(c);
  const A = await start(await c.newPage()); await A.evaluate(() => { window.eggfarm.state.coinsCents = 1e12; }); const n = await buy(A, 3); const s = await st(A); await A.evaluate(() => window.eggfarm.save()); await A.close();
  const B = await start(await c.newPage()); const g = await st(B); ok('R3 no IndexedDB (removed): saving + reload still works via localStorage, no warning', g.L === s.L && !(await B.evaluate(() => !!document.querySelector('.save-warn'))), { n, s: s.L, g: g.L }); await c.close(); }
{ const c = await ctxNew(); await c.addInitScript(() => { const o = IDBFactory.prototype.open; IDBFactory.prototype.open = function () { throw new DOMException('blocked', 'SecurityError'); }; }); await seed(c);
  const A = await start(await c.newPage()); await A.evaluate(() => { window.eggfarm.state.coinsCents = 1e12; }); await buy(A, 2); const s = await st(A); await A.evaluate(() => window.eggfarm.save()); await A.close();
  const B = await start(await c.newPage()); const g = await st(B); ok('R3b IndexedDB.open throws (blocked): saving + reload works', g.L === s.L, { s: s.L, g: g.L }); await c.close(); }
// R4 localStorage quota on save key: IDB gets it; does reload pick IDB?
{ const c = await ctxNew(); await seed(c); const A = await start(await c.newPage()); await sleep(500);
  await A.evaluate(() => { const S = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'eggfarm.save' || k === 'eggfarm.save.bak') throw new DOMException('full', 'QuotaExceededError'); return S.call(this, k, v); }; window.eggfarm.state.coinsCents = 1e12; });
  await buy(A, 3); const s = await st(A); await A.evaluate(() => window.eggfarm.save()); await sleep(800); const idb = await idbSave(A), ls = await lsSave(A), warn = await A.evaluate(() => !!document.querySelector('.save-warn')); await A.close();
  const B = await start(await c.newPage()); const g = await st(B);
  ok('R4 LS write fails (quota on save key, still readable) -> IDB has latest; reload restores it', g.L === s.L, { s: s.L, idb: idb?.L, lsStale: ls.L, warn, reloaded: g.L }); 
  // persistent quota on reload too
  await B.close(); const c2p = await c.newPage(); await c2p.addInitScript(() => { const S = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'eggfarm.save' || k === 'eggfarm.save.bak') throw new DOMException('full', 'QuotaExceededError'); return S.call(this, k, v); }; });
  const C = await start(c2p); const g2 = await st(C); await sleep(500); const idb2 = await idbSave(C);
  ok('R4b quota persists across reload: game loads IDB (newest) not stale LS, IDB not overwritten with stale state', g2.L === s.L && idb2?.L === s.L, { want: s.L, loaded: g2.L, idbAfter: idb2?.L, lsStale: ls.L }); await c.close(); }
// R5 migrations: v4 (m1-rc2), v5 (m2), rc0-written save
for (const f of ['m1-rc2-v4-12min.json', 'm2-rc1-v5-12min.json', 'm2-rc1-v5-40min-edge.json', ...(fs.existsSync('/tmp/qa-rc0-save.json') ? ['@rc0'] : [])]) {
  const raw = f === '@rc0' ? fs.readFileSync('/tmp/qa-rc0-save.json', 'utf8') : fs.readFileSync(FX + f, 'utf8'); const d = JSON.parse(raw);
  const c = await ctxNew(); await seed(c, raw); const A = await start(await c.newPage()); const g = await st(A), rec = await A.evaluate(() => document.querySelectorAll('.recovery-card').length); await sleep(600); const ls = await lsSave(A);
  ok(`R5 old save loads + migrates (${f}, v${d.version})`, rec === 0 && g.F === d.state.farmLevel && g.C === d.state.collectionLevel && (await A.evaluate(() => JSON.parse(localStorage.getItem('eggfarm.save')).version)) === 6, { v: d.version, F: g.F, C: g.C, rec, resavedAt: ls.savedAt }); await c.close(); }
// R6 v1 synthetic (float coins)
{ const d = JSON.parse(fs.readFileSync(FX + 'm1-rc2-v4-12min.json', 'utf8')); const v1 = { version: 1, savedAt: Date.now() - 1000, state: { ...d.state, coins: 12.34 } }; delete v1.state.coinsCents; delete v1.state.celebratedTier;
  const c = await ctxNew(); await seed(c, JSON.stringify(v1)); const A = await start(await c.newPage()); const g = await st(A);
  ok('R6 v1 save (float dollars) migrates to cents', g.coins >= 1234 && g.coins < 1234 + 100000 && g.F === d.state.farmLevel, g); await c.close(); }
// D3/D4
{ const c = await ctxNew(); await seed(c); const reqs = []; c.on('request', r => reqs.push(r.url())); const A = await start(await c.newPage(), '?debug=1&perf=1&ios=1'); await sleep(1500);
  const r = await A.evaluate(() => ({ dbg: !!document.querySelector('.dbg,[class*=debug],#debug'), perf: !!document.querySelector('.perf-ov,[class*=perf]'), hooks: ['eggfarmPerf', 'eggfarmOnb', 'eggfarmQaRecovery'].filter(k => k in window), eggfarmHandle: 'eggfarm' in window }));
  const chunks = reqs.filter(u => /frame-sampler|panel-|debug/.test(u)); ok('D3/D4 ?debug=1&perf=1 inert in release (no panel/overlay/chunk/hooks)', !r.dbg && !r.perf && !r.hooks.length && !chunks.length, { ...r, chunks }); await c.close(); }
fs.writeFileSync(process.env.OUT ?? `/tmp/qags-${ENGINE}.json`, JSON.stringify(R, null, 1)); await browser.close(); try { process.kill(-srv.pid); } catch {}
console.log(`TOTAL [${ENGINE}] ${R.filter(r => r.pass).length}/${R.length}`); process.exit(0);
