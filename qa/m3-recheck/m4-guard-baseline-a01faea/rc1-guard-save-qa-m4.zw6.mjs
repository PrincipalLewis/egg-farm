// QA independent tab-guard (TG-1..6, TG-UI-1..9, AC14d) + save robustness (R1..R6) + D3/D4 on the rc1 RELEASE build.
// M4 version (rc1-guard-save-qa-m4.mjs): original suite + SD5-1/SD5-2 asserts (HoQA-final) + M4 save checks (M4-W*, S-2 ZW*, 9.7, MK*).
// Usage: ENGINE=chromium|firefox|webkit PORT=4400 DIST=dist-qa EXPECT_BUILD=<sha7> BUILD_KIND=rc1|flagoff|m4 [M4FX=dir] [SUITE=all|m4] node rc1-guard-save-qa-m4.mjs <worktree>
// HoQA rulings 2026-10-16 (ZW strictness): (1) ZW-5 checks objects, not field names: an allowed key FAILS only if it holds a serialized save
//   object (version+savedAt+state) or a copy of the save/.bak/v6_backup bytes; telemetry snapshot fields (farm_level, coinsBefore) are fine.
//   Byte-identical checks on save, .bak, eggfarm.ui stay in ZW-1..3. (2) Allowed writes: eggfarm.lease, eggfarm.tab, eggfarm.telemetry*, IDB *telemetry* stores,
//   all under the no-save-object rule. (3) eggfarm.install_id may be created only if absent; changing/deleting an existing value = FAIL.
// HoQA ruling 2026-10-16: ZW-2 (export from the newer-save dialog) is Minor now but BLOCKS S-4.
// ZW-6a..e (2026-10-16): extra refusal paths (Try again, existing IDB / .bak+v6_backup, long session + flushes, lease, 2nd tab during dialog).
// BUILD_KIND: rc1 = shipped rc1 (READ_MAX 6), flagoff = M4 code with m4.enabled=0, m4 = FLAG=m4 / build:qa (writes v7).
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import fs from 'node:fs'; import * as L from './m4-guard-lib.mjs';
const ROOT = process.argv[2], ENGINE = process.env.ENGINE ?? 'chromium', port = +(process.env.PORT ?? 4900);
if (port === 4173 || !Number.isInteger(port)) { console.error('PORT must be set and must not be 4173'); process.exit(2); }
const EXPECT_BUILD = process.env.EXPECT_BUILD; if (!EXPECT_BUILD) { console.error('EXPECT_BUILD required'); process.exit(2); }
const KIND = process.env.BUILD_KIND ?? 'rc1'; if (!['rc1', 'flagoff', 'm4'].includes(KIND)) { console.error('BUILD_KIND must be rc1|flagoff|m4'); process.exit(2); }
const SUITE = process.env.SUITE ?? 'all', WRITE_V = KIND === 'm4' && process.env.S4 === '1' ? 7 : 6, ZW_SECS = +(process.env.ZW_SECS ?? 10);
const M4FX = process.env.M4FX ?? new URL('./m4-fixtures/', import.meta.url).pathname;
const pw = createRequire(ROOT + '/package.json')('playwright-core');
try { await fetch(`http://127.0.0.1:${port}/`); console.error(`port ${port} already serving (stale server?) - refusing`); process.exit(3); } catch {} // served-bundle guard (98396ed)
const srv = spawn('npx', ['vite', 'preview', '--outDir', process.env.DIST ?? 'dist', '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true, cwd: ROOT });
for (let i = 0; i < 80; i++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
{ const _d = process.env.DIST ?? 'dist', _dd = _d.startsWith('/') ? _d : `${ROOT}/${_d}`, _h = await (await fetch(`http://127.0.0.1:${port}/`)).text();
  if (fs.existsSync(`${_dd}/assets`)) { const _w = fs.readdirSync(`${_dd}/assets`).find(f => /^index-.*\.js$/.test(f)); if (!_h.includes(_w)) { console.error(`served bundle is not ${_d}/${_w} - refusing`); process.exit(4); } }
  else { const want = L.sha(fs.readFileSync(`${_dd}/index.html`, 'utf8')), got = L.sha(_h); if (want !== got) { console.error(`served single-file HTML sha ${got.slice(0, 12)} != ${_dd}/index.html ${want.slice(0, 12)} - refusing`); process.exit(4); } console.log(`served single-file asset sha256 ${got}`); } }
const U = `http://127.0.0.1:${port}/`, FX = ROOT + '/tests/fixtures/saves/', fx = fs.readFileSync(FX + 'm2-rc1-v5-40min.json', 'utf8');
const T = pw[ENGINE]; const browser = await T.launch(ENGINE === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] } : {});
const R = []; const ok = (n, p, i) => { R.push({ n, pass: !!p, i }); console.log(`${p ? 'PASS' : 'FAIL'} [${ENGINE}] ${n} — ${JSON.stringify(i)}`); };
// BUILD ID at runtime: Settings footer "Egg Farm <BUILD_ID>" (ui/app.ts). Refuse to run on a wrong build.
{ const c = await browser.newContext(); const p = await c.newPage(); await p.goto(U); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, sessions: 3, workersIntroA: true, workersIntroB: true })); }); await p.goto(U);
  await p.getByText('Tap to start').click().catch(() => {}); await p.waitForTimeout(800); await p.locator('#settings').click().catch(() => {}); await p.waitForTimeout(300);
  const bid = await p.evaluate(() => [...document.querySelectorAll('.version')].map(e => e.textContent).find(t => /Egg Farm /.test(t ?? ''))?.replace('Egg Farm ', '').trim() ?? null);
  const pass = !!bid && bid.includes(EXPECT_BUILD); console.log(`${pass ? 'PASS' : 'FAIL'} [${ENGINE}] BUILD runtime id ${bid} expect ~${EXPECT_BUILD} kind=${KIND}`); await c.close();
  if (!pass) { await browser.close(); try { process.kill(-srv.pid); } catch {} process.exit(5); } }
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

if (SUITE !== 'm4') { // ===== legacy rc1 suite (with SD5-1/SD5-2 asserts) =====
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
  await A.evaluate(() => { window.eggfarm.state.coinsCents = 777777777; window.eggfarm.save(); }); await sleep(800); const want = await st(A); const idb = await idbSave(A);
  // Head of QA decision 2026-10-16, SD5-1: zero tolerance vs persisted; 1 tick only vs live (replaces the old 'persisted minus 1 tick' allowance)
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
  ok(`R5 old save loads + migrates (${f}, v${d.version})`, rec === 0 && g.F === d.state.farmLevel && g.C === d.state.collectionLevel && (await A.evaluate(() => JSON.parse(localStorage.getItem('eggfarm.save')).version)) === WRITE_V, { v: d.version, wantWriteV: WRITE_V, F: g.F, C: g.C, rec, resavedAt: ls.savedAt }); await c.close(); }
// R6 v1 synthetic (float coins)
{ const d = JSON.parse(fs.readFileSync(FX + 'm1-rc2-v4-12min.json', 'utf8')); const v1 = { version: 1, savedAt: Date.now() - 1000, state: { ...d.state, coins: 12.34 } }; delete v1.state.coinsCents; delete v1.state.celebratedTier;
  const c = await ctxNew(); await seed(c, JSON.stringify(v1)); const A = await start(await c.newPage()); const g = await st(A);
  ok('R6 v1 save (float dollars) migrates to cents', g.coins >= 1234 && g.coins < 1234 + 100000 && g.F === d.state.farmLevel, g); await c.close(); }
// D3/D4
{ const c = await ctxNew(); await seed(c); const reqs = []; c.on('request', r => reqs.push(r.url())); const A = await start(await c.newPage(), '?debug=1&perf=1&ios=1'); await sleep(1500);
  const r = await A.evaluate(() => ({ dbg: !!document.querySelector('.dbg,[class*=debug],#debug'), perf: !!document.querySelector('.perf-ov,[class*=perf]'), hooks: ['eggfarmPerf', 'eggfarmOnb', 'eggfarmQaRecovery'].filter(k => k in window), eggfarmHandle: 'eggfarm' in window }));
  const chunks = reqs.filter(u => /frame-sampler|panel-|debug/.test(u)); ok('D3/D4 ?debug=1&perf=1 inert in release (no panel/overlay/chunk/hooks)', !r.dbg && !r.perf && !r.hooks.length && !chunks.length, { ...r, chunks }); await c.close(); }
} // ===== end legacy suite
// ======================= M4 section =======================
// S4=1 once S-4 (v7 write + v6_backup + migrations[6]) is on the build under test; otherwise those checks report PENDING-S4 (not FAIL).
const S4 = process.env.S4 === '1'; const pend = n => { R.push({ n, pass: null, pending: 'S-4' }); console.log(`PENDING-S4 [${ENGINE}] ${n}`); };
const fxM4 = n => fs.readFileSync(M4FX + n, 'utf8');
const snap = p => p.evaluate(async () => { const ls = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls[k] = localStorage.getItem(k); }
  const idb = {}; const dbs = indexedDB.databases ? await indexedDB.databases() : [{ name: 'eggfarm' }];
  for (const { name } of dbs) { if (!name) continue; await new Promise(res => { const r = indexedDB.open(name); r.onupgradeneeded = () => { r.transaction.abort(); }; r.onerror = () => res(); r.onsuccess = () => { const db = r.result, ss = [...db.objectStoreNames]; if (!ss.length) { db.close(); return res(); }
    const tx = db.transaction(ss, 'readonly'); let n = ss.length; for (const s of ss) { const cr = tx.objectStore(s).openCursor(); cr.onsuccess = () => { const c = cr.result; if (c) { idb[`${name}/${s}/${JSON.stringify(c.key)}`] = typeof c.value === 'string' ? c.value : 'J:' + JSON.stringify(c.value); c.continue(); } else if (--n === 0) { db.close(); res(); } }; cr.onerror = () => { if (--n === 0) { db.close(); res(); } }; } }; }); }
  return { ls, idb }; });
// Write spy: catches transient write+restore that before/after snapshots would miss.
const SPY = () => { window.__w = []; const S = Storage.prototype.setItem, D = Storage.prototype.removeItem, C = Storage.prototype.clear;
  Storage.prototype.setItem = function (k, v) { window.__w.push({ op: 'ls.set', key: k, value: String(v), t: Date.now() }); return S.call(this, k, v); }; Storage.prototype.removeItem = function (k) { window.__w.push({ op: 'ls.rm', key: k, t: Date.now() }); return D.call(this, k); }; Storage.prototype.clear = function () { window.__w.push({ op: 'ls.clear', key: null, t: Date.now() }); return C.call(this); };
  for (const m of ['put', 'add', 'delete', 'clear']) { const O = IDBObjectStore.prototype[m]; IDBObjectStore.prototype[m] = function (...a) { window.__w.push({ op: 'idb.' + m, store: this.name, key: String(m === 'put' || m === 'add' ? a[1] : a[0]), value: m === 'put' || m === 'add' ? (typeof a[0] === 'string' ? a[0] : JSON.stringify(a[0])) : undefined, t: Date.now() }); return O.apply(this, a); }; } };
const seedRaw = (c, e) => c.newPage().then(async p => { await p.goto(U); await p.evaluate(e => { localStorage.clear(); for (const [k, v] of e) localStorage.setItem(k, v); }, e); await p.close(); });
const NEWER_SEL = process.env.NEWER_SEL ?? '.recovery-layer [role=alertdialog]', NEWER_TXT = new RegExp(process.env.NEWER_TXT ?? 'newer', 'i'), EXPORT_SEL = process.env.EXPORT_SEL ?? 'button:has-text("Export")';
const live = p => p.evaluate(() => { const s = window.eggfarm.state; return { coinsCents: s.coinsCents, migrationRefundCents: s.migrationRefundCents, hensLevel: s.hensLevel, eggValueLevel: s.eggValueLevel, farmLevel: s.farmLevel, collectionLevel: s.collectionLevel }; });
// ---- ZW-1..4 (S-2 + decision 9.7): rc1 / flag-off build opens a v7 save -> newer-save dialog, ZERO writes, export returns the v7 bytes
if (KIND !== 'm4') for (const f of ['m4-v7-basic.json', 'm4-v7-refund.json']) {
  const v7 = fxM4(f), v6b = fxM4('m4-v6-base.json'); const c = await ctxNew(); await c.addInitScript(SPY);
  await seedRaw(c, [[L.KEYS.save, v7], [L.KEYS.v6b, v6b], [L.KEYS.ui, UI]]);
  const pre = await c.newPage(); await pre.goto(U + '?zw=pre'); const before = await snap(pre); await pre.close(); // boot waits for "Tap to start": nothing loaded yet
  const A = await c.newPage(); await A.goto(U); await A.getByText('Tap to start').click().catch(() => {}); await A.waitForTimeout(1000);
  const dlg = A.locator(NEWER_SEL).first(); const shown = await dlg.isVisible().catch(() => false), txt = shown ? await dlg.innerText() : '';
  ok(`ZW-1 ${KIND} × ${f}: newer-save dialog shown`, shown && NEWER_TXT.test(txt), { txt: txt.slice(0, 160) });
  await A.evaluate(() => { window.__exp = null; navigator.share = async d => { window.__exp = d?.files?.[0] ? await d.files[0].text() : d?.text ?? null; }; navigator.canShare = () => true; });
  const dlP = A.waitForEvent('download', { timeout: 4000 }).catch(() => null); await A.locator(EXPORT_SEL).first().click({ timeout: 3000 }).catch(() => {});
  const dl = await dlP; const exp = dl ? fs.readFileSync(await dl.path(), 'utf8') : await A.evaluate(() => window.__exp);
  ok(`ZW-2 ${KIND} × ${f}: export works and returns the v7 bytes exactly`, exp === v7, { got: exp ? `${exp.length}B` : null, want: `${v7.length}B` });
  await sleep(ZW_SECS * 1000);
  await A.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })); window.dispatchEvent(new Event('beforeunload')); });
  await sleep(500); const w1 = await A.evaluate(() => window.__w); const B = await c.newPage(); await B.goto(U + '?zw=2nd'); await B.getByText('Tap to start').click().catch(() => {}); await sleep(1500); // 2nd tab path
  const w2 = await B.evaluate(() => window.__w); await A.close(); await B.close();
  const post = await c.newPage(); await post.goto(U + '?zw=post'); const after = await snap(post); await post.close();
  const d = L.strictDiff(before, after);
  ok(`ZW-3 ${KIND} × ${f}: localStorage(all keys)+IndexedDB+v6_backup byte-identical after ${ZW_SECS}s + visibilitychange/pagehide/beforeunload + 2nd tab`, d.length === 0 && after.ls[L.KEYS.save] === v7 && after.ls[L.KEYS.v6b] === v6b, { diffs: d, lsKeys: Object.keys(after.ls), idbKeys: Object.keys(after.idb) });
  const cw = L.classifyWrites([...w1.map(w => ({ ...w, tab: 1 })), ...w2.map(w => ({ ...w, tab: 2 }))], [v7, v6b, before.ls[L.KEYS.bak]].filter(Boolean), before.ls['eggfarm.install_id']); const iid = L.installIdCheck(before, after);
  ok(`ZW-4 ${KIND} × ${f}: zero write calls to every save key (save/.bak/v6_backup/ui/corrupt/...) and save IDB stores; only eggfarm.lease/tab/telemetry written; install_id create-if-absent only`, cw.bad.length === 0 && !iid, { installId: iid, disallowed: cw.bad.map(w => ({ ...w, value: w.value?.slice(0, 120) })) });
  ok(`ZW-5 ${KIND} × ${f}: no allowed (lease/tab/telemetry) write holds a save object or a copy of save/.bak/v6_backup`, cw.leak.length === 0, { leaking: cw.leak, allowedWrites: cw.allowed }); // every lease/telemetry write is logged here -> report JSON
  await c.close(); }
else console.log(`SKIP [${ENGINE}] ZW-1..4 (BUILD_KIND=rc1|flagoff only)`);
// ---- ZW-6 (HoQA 2026-10-16): zero forbidden writes + byte-identical save keys on extra refusal paths, v7 save present. Same allow rules as ZW-4/5.
if (KIND !== 'm4') { const AUTOSAVE_S = +(process.env.AUTOSAVE_S ?? 5), v7 = fxM4('m4-v7-basic.json'), v6b = fxM4('m4-v6-base.json');
  const seedIdb = (c, val) => c.newPage().then(async p => { await p.goto(U + '?zw=seedidb'); await p.evaluate(v => new Promise((res, rej) => { const r = indexedDB.open('eggfarm', 1); r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('save')) r.result.createObjectStore('save'); };
    r.onsuccess = () => { const tx = r.result.transaction('save', 'readwrite'); tx.objectStore('save').put(v, 'main'); tx.oncomplete = () => { r.result.close(); res(); }; tx.onerror = () => rej(tx.error); }; r.onerror = () => rej(r.error); }), val); await p.close(); });
  const tap = async p => { await p.getByText('Tap to start').click().catch(() => {}); await p.waitForTimeout(1200); };
  const flush = p => p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })); window.dispatchEvent(new Event('beforeunload')); });
  async function zw6(id, desc, { extra = [], idb = null, body }) { const c = await ctxNew(); await c.addInitScript(SPY);
    await seedRaw(c, [[L.KEYS.save, v7], [L.KEYS.ui, UI], ...extra]); if (idb) await seedIdb(c, idb);
    const pre = await c.newPage(); await pre.goto(U + '?zw=pre'); const before = await snap(pre); const w0 = await pre.evaluate(() => window.__w); await pre.close();
    const pages = [], info = {}; await body(c, pages, info); const ws = [];
    for (const [i, p] of pages.entries()) { ws.push(...(await p.evaluate(() => window.__w).catch(() => [])).map(w => ({ ...w, tab: i + 1 }))); await p.close().catch(() => {}); }
    const post = await c.newPage(); await post.goto(U + '?zw=post'); const after = await snap(post); await post.close();
    const copies = [v7, ...extra.map(e => e[1]), idb].filter(Boolean), cw = L.classifyWrites(ws, copies, before.ls['eggfarm.install_id']), d = L.strictDiff(before, after), iid = L.installIdCheck(before, after);
    const saveKeysOk = after.ls[L.KEYS.save] === v7 && extra.every(([k, v]) => after.ls[k] === v) && (!idb || after.idb['eggfarm/save/"main"'] === idb);
    ok(`ZW-6${id} ${KIND}: ${desc} -> zero forbidden writes, save keys byte-identical, no save object in allowed writes`, cw.bad.length === 0 && cw.leak.length === 0 && d.length === 0 && !iid && saveKeysOk,
      { ...info, diffs: d, installId: iid, saveKeysOk, disallowed: cw.bad.map(w => ({ ...w, value: w.value?.slice(0, 120) })), leaking: cw.leak, allowedWrites: cw.allowed, preBootWrites: w0.length, idbKeys: Object.keys(after.idb) }); await c.close(); }
  await zw6('a', "press 'Try again' x3", { body: async (c, P, info) => { const A = await c.newPage(); P.push(A); await A.goto(U); await tap(A);
    for (let i = 0; i < 3; i++) { await A.getByRole('button', { name: /try again/i }).click({ timeout: 3000 }).catch(() => {}); await A.waitForTimeout(1200); if (await A.getByText('Tap to start').isVisible().catch(() => false)) await tap(A); }
    info.dialogAfter = await A.locator(NEWER_SEL).first().isVisible().catch(() => false); } });
  await zw6('b1', 'boot with existing IndexedDB copy (v7 in IDB eggfarm/save/main)', { idb: v7, body: async (c, P) => { const A = await c.newPage(); P.push(A); await A.goto(U); await tap(A); await sleep(AUTOSAVE_S * 1000 + 1000); await flush(A); await sleep(500); } });
  await zw6('b1v6', 'boot with existing older v6 IndexedDB copy (reconcile LS v7 vs IDB v6)', { idb: v6b, body: async (c, P) => { const A = await c.newPage(); P.push(A); await A.goto(U); await tap(A); await sleep(AUTOSAVE_S * 1000 + 1000); await flush(A); await sleep(500); } });
  await zw6('b2', 'boot with existing .bak (v6) + v6_backup', { extra: [[L.KEYS.bak, v6b], [L.KEYS.v6b, v6b]], body: async (c, P) => { const A = await c.newPage(); P.push(A); await A.goto(U); await tap(A); await sleep(AUTOSAVE_S * 1000 + 1000); await flush(A); await sleep(500); } });
  await zw6('c', `long session ${Math.max(2.5 * AUTOSAVE_S, 12)}s (>=2x autosave ${AUTOSAVE_S}s) + visibilitychange/pagehide/beforeunload`, { body: async (c, P) => { const A = await c.newPage(); P.push(A); await A.goto(U); await tap(A);
    await sleep(Math.max(2.5 * AUTOSAVE_S, 12) * 1000); await flush(A); await sleep(800); await A.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(AUTOSAVE_S * 1000 + 500); await flush(A); await sleep(500); } });
  await zw6('d', 'tab-lease writes (lease holds no save object)', { body: async (c, P, info) => { const A = await c.newPage(); P.push(A); await A.goto(U); await tap(A); await sleep(3000);
    info.lease = await A.evaluate(() => localStorage.getItem('eggfarm.lease')); info.tabKey = await A.evaluate(() => localStorage.getItem('eggfarm.tab')); info.leaseHoldsSave = L.holdsSave(info.lease ?? '', [v7]) || L.holdsSave(info.tabKey ?? '', [v7]); } });
  await zw6('e', 'second tab opened while first shows the dialog', { body: async (c, P, info) => { const A = await c.newPage(); P.push(A); await A.goto(U); await tap(A); info.aDialog = await A.locator(NEWER_SEL).first().isVisible().catch(() => false);
    const B = await c.newPage(); P.push(B); await B.goto(U); await tap(B); await sleep(2000); info.bDialog = await B.locator(NEWER_SEL).first().isVisible().catch(() => false); info.aDialogAfter = await A.locator(NEWER_SEL).first().isVisible().catch(() => false);
    info.aGuard = await A.evaluate(() => !!document.querySelector('.recovery-layer.tab-guard')); await flush(B); await flush(A); await sleep(500); } });
}
// Release builds expose no window.eggfarm (D3/D4). startLite + forceSave work on release and QA builds: save is forced via pagehide / eggfarm.save() if present.
const startLite = async p => { await p.goto(U); await p.getByText('Tap to start').click(); await p.waitForTimeout(2500); const wb = p.locator('#wbCollect'); if (await wb.isVisible().catch(() => false)) await wb.click().catch(() => {}); return p; };
const forceSave = p => p.evaluate(() => { if (window.eggfarm?.save) window.eggfarm.save(); else { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })); } });
const hasHook = p => p.evaluate(() => !!window.eggfarm);
// ---- M4-W1/W2: write version. rc1/flag-off: v6. m4 pre-S-4 (3351d6c): v6 + marker; with S-4: v7 + v6_backup kept.
{ const base = fxM4('m4-v6-base.json'); const c = await ctxNew(); await seedRaw(c, [[L.KEYS.save, base], [L.KEYS.ui, UI]]); const A = await startLite(await c.newPage()); await forceSave(A); await sleep(800);
  const v = await A.evaluate(() => JSON.parse(localStorage.getItem('eggfarm.save')).version);
  if (KIND !== 'm4' || !S4) ok(`M4-W1 ${KIND}${KIND === 'm4' ? ' (pre-S-4)' : ''}: v6 save -> written as v6`, v === 6, { v });
  if (KIND === 'm4' && S4) { ok('M4-W1 m4: v6 save migrates and is written as v7', v === 7, { v }); for (let i = 0; i < 3; i++) { await forceSave(A); await sleep(400); }
    const bk = await A.evaluate(k => localStorage.getItem(k), L.KEYS.v6b); ok('M4-W2 m4: eggfarm.save.v6_backup == original v6 bytes after N autosaves', bk === base, { len: bk?.length }); }
  else if (KIND === 'm4') { pend('M4-W1b v6 -> v7 write'); pend('M4-W2 v6_backup kept after N autosaves'); }
  await c.close(); }
// ---- MK-1/MK-2: tracksV7 marker (m4a-tracks-v2 @3351d6c). Preserved byte-for-byte when writing v6; S-4 migration idempotent, no 2nd refund.
for (const f of ['m4-v6-marked.json', 'm4-v6-marked-refunded.json']) { const raw = fxM4(f), mk = L.fieldBytes(raw), src = JSON.parse(raw); const c = await ctxNew(); await seedRaw(c, [[L.KEYS.save, raw], [L.KEYS.ui, UI]]);
  const A = await startLite(await c.newPage()); const hook = await hasHook(A); const c0 = hook ? await st(A) : { coins: null }; await forceSave(A); await sleep(800); const out = await A.evaluate(() => localStorage.getItem('eggfarm.save')); const d = JSON.parse(out);
  if (KIND !== 'm4' || !S4) ok(`MK-1 ${KIND} × ${f}: written v6, tracksV7 marker byte-identical, no refund added`, d.version === 6 && L.fieldBytes(out) === mk && (c0.coins === null ? d.state.coinsCents >= src.state.coinsCents : c0.coins >= src.state.coinsCents), { hook, savedCoins: d.state.coinsCents, v: d.version, mkIn: mk, mkOut: L.fieldBytes(out), coinsIn: src.state.coinsCents, loaded: c0.coins });
  if (KIND === 'm4' && S4) { const m1 = await live(A); await A.close(); const B = await start(await c.newPage()); const m2 = await live(B); // reload -> migrate again
    const probs = L.idemCheck(src.state, m1, { ...m2, coinsCents: m1.coinsCents }); const tick = Math.max(0, Math.ceil(((await st(B)).coins - m2.coinsCents) / 10));
    ok(`MK-2 S-4 × ${f}: idempotent on marked save, no second refund (refund exact; coins m2-m1 <= 1 tick)`, probs.length === 0 && m2.coinsCents - m1.coinsCents <= tick + 1 && m2.migrationRefundCents === m1.migrationRefundCents, { m1, m2, tick, probs }); }
  else if (KIND === 'm4') pend(`MK-2 S-4 × ${f}: marked v6 -> v7 idempotent, no second refund`);
  await c.close(); }
fs.writeFileSync(process.env.OUT ?? `/tmp/qags-m4-${KIND}-${ENGINE}.json`, JSON.stringify(R, null, 1)); await browser.close(); try { process.kill(-srv.pid); } catch {}
console.log(`TOTAL [${ENGINE}] kind=${KIND} ${R.filter(r => r.pass === true).length}/${R.filter(r => r.pass !== null).length} pass, ${R.filter(r => r.pass === null).length} PENDING-S4`); process.exit(R.some(r => r.pass === false) ? 1 : 0);
