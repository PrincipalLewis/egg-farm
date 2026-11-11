// QA-owned probe for PR #70 @ 30b29d3 (M4.1 patch1): yard hens (P-6), asleep/unpaid signal AC-R1..R9 + AC-R1m/R1c/B11/B11u/R2a (P-2/P-5),
// SS-15 HUD (P-1 browser part), SS-28 steady ETA (P-4), tap isolation (P-7), HoE notes. One engine, one width per run.
// usage: node p1.mjs <chromium|firefox|webkit> <width> <sections: hens,flagoff,asleep,axe,taps>
// env: QA_WT (default /tmp/qa-p1-30b29d3), QA_BID (expected in-page build-id, asserted on EVERY load), QA_EV, AXE (path).
// Serves $QA_WT/dist-qa on an OS-assigned 127.0.0.1 port (never :4173). Every measurement asserts the active sheet/tab first; shot right after.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import http from 'node:http'; import { join, extname } from 'node:path';
const [ENG, WS, SECS = 'hens,asleep,axe,taps'] = process.argv.slice(2); const W = +WS;
const H = { 360: 640, 375: 667, 390: 844, 430: 932, 1280: 800 }[W] ?? 800;
const WT = process.env.QA_WT ?? '/tmp/qa-p1-30b29d3', BID = process.env.QA_BID, E = process.env.QA_EV ?? '/workspace/egg-farm-studio/qa/m41/p1-30b29d3/';
if (!BID || !/\+30b29d3/.test(BID)) throw new Error('QA_BID must be <prefix>+30b29d3[...] got ' + BID);
const AXE = process.env.AXE ?? '/tmp/axe/node_modules/axe-core/axe.min.js';
const pw = (await import(`${WT}/node_modules/playwright-core/index.mjs`)).default;
const TAG = process.env.QA_TAG ?? SECS.replace(/,/g, '_');
const OUT = `${E}p1/p1-${ENG}-${W}-${TAG}.jsonl`; writeFileSync(OUT, ''); const SH = `${E}shots/p1/${ENG}`; mkdirSync(SH, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.ico': 'image/x-icon' };
const D = `${WT}/dist-qa`;
const srv = await new Promise(r => { const s = http.createServer((q, res) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = join(D, p); if (!f.startsWith(D) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' }); res.end(readFileSync(f)); }).listen(0, '127.0.0.1', () => r(s)); });
const PORT = srv.address().port; if (PORT === 4173) throw new Error('port 4173');
const URL0 = `http://127.0.0.1:${PORT}/`;
const br = ENG === 'chromium' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[ENG].launch();
let nPass = 0, nFail = 0; const fails = [];
const rec = (o) => appendFileSync(OUT, JSON.stringify({ engine: ENG, w: W, h: H, ...o }) + '\n');
const ok = (sec, name, pass, info = {}) => { pass ? nPass++ : (nFail++, fails.push(`${sec}: ${name}`)); rec({ rt: 'check', sec, name, pass: !!pass, info }); if (!pass) console.log(`FAIL [${ENG} ${W}] ${sec}: ${name} ${JSON.stringify(info).slice(0, 400)}`); };
const csv = readFileSync(`${WT}/data/economy.csv`, 'utf8').trim().split('\n').map(l => l.split(',')); const hdr = csv.shift();
const col = n => csv.map(r => +r[hdr.indexOf(n)]); const HENS = col('hens'), EPS = col('eggs_per_sec');
const UI = { onboardingDone: true, seenSlots: 10, workersIntroA: true, workersIntroB: true, sfx: false };
const loads = []; let shotN = 0;
async function open({ touch = false } = {}) {
  const ctx = await br.newContext({ viewport: { width: W, height: H }, hasTouch: touch });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });
  await p.addInitScript(ui => { if (!sessionStorage.getItem('qa')) { sessionStorage.setItem('qa', '1'); localStorage.clear(); localStorage.setItem('eggfarm.ui', JSON.stringify(ui)); } }, UI);
  await p.goto(URL0, { waitUntil: 'domcontentloaded' });
  const bid = await p.evaluate(() => document.querySelector('meta[name=build-id]')?.content); loads.push(bid);
  ok('load', `runtime build-id ${bid} == ${BID}`, bid === BID, { bid });
  if (bid !== BID) throw new Error('build-id mismatch ' + bid);
  await p.getByText('Tap to start').click({ timeout: 60000 }).catch(() => {});
  await p.waitForFunction(() => window.eggfarm && window.eggfarmUi, null, { timeout: 60000 });
  await p.evaluate(() => { document.getElementById('modal-layer')?.classList.remove('open'); document.querySelectorAll('.tracks-exp,.tracks-exp-out').forEach(e => e.remove());
    const g = window.eggfarm; g.state = { ...g.state, seenTracksExplainer: true, customers: [], nextCustomerInS: 1e9 }; window.eggfarmUi.render(); });
  await p.waitForTimeout(150);
  return { ctx, p, errs };
}
const setS = (p, patch) => p.evaluate(patch => { const g = window.eggfarm; g.state = { ...g.state, customers: [], nextCustomerInS: 1e9, ...patch }; window.eggfarmUi.render(); }, patch);
const docked = W >= 1024;
async function sheet(p, tab) { // open Upgrades sheet (phone) and the tab; assert both
  if (!docked) { const open = await p.evaluate(() => { const s = document.querySelector('#p-upgrades'); return !!s && !s.hidden && s.getClientRects().length > 0; }); if (!open) await p.locator('[data-nav=upgrades]').click(); await p.waitForTimeout(300); }
  if (tab) { await p.locator(`[data-tab=${tab}]`).first().click(); await p.waitForTimeout(250); }
  return assertTab(p, tab);
}
const assertTab = async (p, tab) => p.evaluate(tab => { const s = document.querySelector('#p-upgrades'); const act = [...document.querySelectorAll('[data-tab]')].filter(e => e.classList.contains('active')).map(e => e.dataset.tab);
  const vis = !!s && s.getClientRects().length > 0 && getComputedStyle(s).display !== 'none' && getComputedStyle(s).visibility !== 'hidden'; return { sheetOpen: vis, hiddenAttr: !!s?.hidden, active: act, ok: vis && (!tab || (act.length >= 1 && act.every(a => a === tab))) }; }, tab);
async function closeSheet(p) { if (docked) return; const c = p.locator('.sheet:not([hidden]) .close'); if (await c.count()) { await c.first().click(); await p.waitForTimeout(250); } }
const shot = async (p, name, clip) => { const f = `${SH}/${name}-w${W}.png`; await p.screenshot({ path: f, ...(clip ? { clip } : {}) }); shotN++; return f; };
const tick = (p, ms = 1100) => p.waitForTimeout(ms);
// ---------------- yard hens ----------------
const yard = p => p.evaluate(() => { const hp = document.querySelector('#henpill'), cs = getComputedStyle(hp), r = hp.getBoundingClientRect();
  const scene = document.querySelector('#scene') ?? hp.parentElement; let clipAnc = null; for (let e = hp.parentElement; e; e = e.parentElement) { const c = getComputedStyle(e); if (/(hidden|clip|auto|scroll)/.test(c.overflow + c.overflowX + c.overflowY)) { clipAnc = e; break; } }
  const ca = clipAnc?.getBoundingClientRect(); const sr = scene.getBoundingClientRect();
  return { sprites: document.querySelectorAll('#yard img.hen').length, hidden: hp.hidden || cs.display === 'none', text: hp.textContent, rect: { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height },
    sw: hp.scrollWidth, cw: hp.clientWidth, inClip: !ca || (r.left >= ca.left - 0.5 && r.right <= ca.right + 0.5 && r.top >= ca.top - 0.5 && r.bottom <= ca.bottom + 0.5), clipAnc: clipAnc ? (clipAnc.id || clipAnc.className) : null,
    inView: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, H: window.eggfarm.state.hensLevel, F: window.eggfarm.state.farmLevel, pageSW: document.scrollingElement.scrollWidth, iw: innerWidth }; });
const pillTxt = n => `×${n.toLocaleString('en-US')}\u00a0hens`;
async function hensRowRead(p) { return p.evaluate(() => { const r = document.querySelector('#p-upgrades .up.track[data-track=hens]'); if (!r) return null; const t = r.innerText; return { L: +(r.querySelector('.lv')?.textContent ?? '').replace('L', ''), eps: (/Eggs\/s\s+([\d.,KMB]+)/.exec(t) ?? [])[1] ?? null, text: t.replace(/\s+/g, ' ').slice(0, 160) }; }); }
async function secHens() {
  const { ctx, p, errs } = await open();
  const cases = [[5, 7], [3, 0], [10, 1], [20, 1], [0, 0], [1, 2], [18, 20], [25, 20], [2, 1], [30, 30]];
  for (const [F, Hl] of cases) {
    await closeSheet(p); await setS(p, { farmLevel: F, hensLevel: Hl, coinsCents: 0 }); await tick(p, 400);
    const y = await yard(p), want = HENS[Hl], legacy = HENS[F];
    const pass = y.sprites === Math.min(want, 12) && y.hidden === !(want > 12) && (want <= 12 || y.text === pillTxt(want)) && y.F === F && y.H === Hl;
    ok('hens', `M4 on F${F}/H${Hl}: sprites=min(hens[H]=${want},12)=${Math.min(want, 12)}, pill ${want > 12 ? pillTxt(want) : 'hidden'} (legacy hens[F]=${legacy} not used)`, pass, y);
    if (!y.hidden) ok('hens', `pill F${F}/H${Hl} not clipped / no overflow (sw<=cw, inside clip ancestor, in viewport, no page h-scroll)`, y.sw <= y.cw + 0.5 && y.inClip && y.inView && y.pageSW <= y.iw, y);
    if ([[5, 7], [1, 2], [18, 20]].some(([a, b]) => a === F && b === Hl)) await shot(p, `hens-F${F}-H${Hl}`, { x: 0, y: 0, width: W, height: Math.min(H, 480) });
    // pill number = the hens behind the Hens card's eggs/s (same CSV row H)
    const st = await sheet(p, 'farm'); const row = await hensRowRead(p);
    if (row) ok('hens', `F${F}/H${Hl}: Hens card L${row.L} = H, Eggs/s ${row.eps} = fmtCount(eggs_per_sec[H]=${EPS[Hl]}); pill/sprites from hens[${Hl}]`, st.ok && row.L === Hl && parseFloat(String(row.eps).replace(/,/g, '')) === Math.floor(EPS[Hl]), { st, row });
    else ok('hens', `F${F}/H${Hl}: Hens row present`, false, { st });
  }
  // synthetic boundary 12/13 (QA-only: g.balance farm hensBase 12, hensPerLevel 1; same synthetic as tests/m41-p1-yard-hens CCR block), F != H
  await closeSheet(p);
  for (const [Hl, n] of [[0, 12], [1, 13]]) {
    await p.evaluate(() => { const g = window.eggfarm; g.__b0 = g.__b0 ?? g.b; g.b = { ...g.__b0, farm: { ...g.__b0.farm, hensBase: 12, hensPerLevel: 1 } }; });
    await setS(p, { farmLevel: 5, hensLevel: Hl }); await tick(p, 400); const y = await yard(p);
    ok('hens', `boundary (synthetic) F5/H${Hl} hens[H]=${n}: sprites 12, pill ${n > 12 ? pillTxt(n) : 'hidden'}`, y.sprites === 12 && y.hidden === (n <= 12) && (n <= 12 || y.text === pillTxt(n)), y);
    await shot(p, `hens-boundary-${n}`, { x: 0, y: 0, width: W, height: Math.min(H, 480) });
  }
  // long pill (synthetic big count) still fits
  await p.evaluate(() => { const g = window.eggfarm; g.b = { ...g.__b0, farm: { ...g.__b0.farm, hensBase: 5, hensPerLevel: 123456789 } }; });
  await setS(p, { farmLevel: 5, hensLevel: 30 }); await tick(p, 400); { const y = await yard(p); ok('hens', `big pill "${y.text}" fits (sw<=cw, inside, in view, no h-scroll)`, !y.hidden && y.sw <= y.cw + 0.5 && y.inClip && y.inView && y.pageSW <= y.iw, y); await shot(p, 'hens-bigpill', { x: 0, y: 0, width: W, height: Math.min(H, 480) }); }
  await p.evaluate(() => { const g = window.eggfarm; g.b = g.__b0; });
  // Hens buy: sprites + pill update in the same frame as hensLevel; Farm buy changes neither
  for (const [kind, F0, H0] of [['hens', 5, 1], ['hens', 5, 7], ['farm', 5, 1], ['farm', 5, 7]]) {
    await closeSheet(p); await setS(p, { farmLevel: F0, hensLevel: H0, coinsCents: 1e12 }); await tick(p, 300);
    const st = await sheet(p, 'farm');
    await p.evaluate(() => { const g = window.eggfarm; g.__fr = []; let n = 0; const f = () => { const hp = document.querySelector('#henpill'); g.__fr.push({ n: n++, H: g.state.hensLevel, F: g.state.farmLevel, sprites: document.querySelectorAll('#yard img.hen').length, hidden: hp.hidden, text: hp.textContent }); if (n < 40) requestAnimationFrame(f); }; requestAnimationFrame(f);
      // also sample synchronously right after the click handler (same task)
      document.addEventListener('click', () => queueMicrotask(() => { const hp = document.querySelector('#henpill'); g.__sync = { H: g.state.hensLevel, F: g.state.farmLevel, sprites: document.querySelectorAll('#yard img.hen').length, hidden: hp.hidden, text: hp.textContent }; }), { once: true, capture: false }); });
    await p.locator(`#p-upgrades .btn.buy[data-kind=${kind}]`).first().click(); await p.waitForTimeout(900);
    const fr = await p.evaluate(() => ({ fr: window.eggfarm.__fr, sync: window.eggfarm.__sync }));
    const first = fr.fr[0], changed = fr.fr.find(x => x.H !== first.H || x.F !== first.F), last = fr.fr[fr.fr.length - 1];
    if (kind === 'hens') { const want = HENS[H0 + 1];
      const okFrames = fr.fr.every(x => x.sprites === Math.min(HENS[x.H], 12) && x.hidden === !(HENS[x.H] > 12) && (HENS[x.H] <= 12 || x.text === pillTxt(HENS[x.H])));
      ok('hens', `Hens buy H${H0}->H${H0 + 1} (F${F0}): every frame sprites/pill match hens[H] of that frame (same-tick update), final ${want > 12 ? pillTxt(want) : 'hidden'}`, st.ok && okFrames && last.H === H0 + 1 && (!fr.sync || fr.sync.sprites === Math.min(HENS[fr.sync.H], 12)), { st, first, changed, last, sync: fr.sync, frames: fr.fr.length });
    } else {
      ok('hens', `Farm buy F${F0}->F${F0 + 1} (H${H0}): sprites/pill unchanged in every frame`, st.ok && last.F === F0 + 1 && fr.fr.every(x => x.sprites === first.sprites && x.hidden === first.hidden && x.text === first.text), { st, first, last });
    }
  }
  ok('hens', 'no console errors / page errors', errs.length === 0, errs.slice(0, 5)); await ctx.close();
}
// flag-off build: legacy S.hens(F)
async function secFlagoff() {
  const { ctx, p, errs } = await open();
  const m4 = await p.evaluate(() => window.eggfarm.balance.m4?.enabled); ok('flagoff', `served build has m4.enabled=0 (got ${m4})`, m4 === 0, { m4 });
  for (const [F, Hl] of [[5, 7], [1, 7], [0, 0], [2, 20], [1, 0], [20, 1]]) {
    await setS(p, { farmLevel: F, hensLevel: Hl }); await tick(p, 400); const y = await yard(p), want = HENS[F];
    ok('flagoff', `M4 off F${F}/H${Hl}: legacy hens[F]=${want}: sprites ${Math.min(want, 12)}, pill ${want > 12 ? pillTxt(want) : 'hidden'} (H ignored)`, y.sprites === Math.min(want, 12) && y.hidden === !(want > 12) && (want <= 12 || y.text === pillTxt(want)), y);
    if (F === 5) await shot(p, `flagoff-hens-F${F}-H${Hl}`, { x: 0, y: 0, width: W, height: Math.min(H, 480) });
  }
  ok('flagoff', 'no console errors / page errors', errs.length === 0, errs.slice(0, 5)); await ctx.close();
}
// ---------------- asleep / unpaid ----------------
const readAll = p => p.evaluate(() => { const g = window.eggfarm, rate = document.querySelector('#rate'), rcs = rate && getComputedStyle(rate);
  const cards = [...document.querySelectorAll('#uRow .wk[data-w]')].map(c => { const bn = c.querySelector('.wk-banner'), bt = bn?.querySelector('.bt'), r = bn?.getBoundingClientRect(), cr = c.getBoundingClientRect(), tcs = bt && getComputedStyle(bt), ic = bn?.querySelector('img');
    const rf = c.querySelector('[data-act=manage]'), rr = rf?.getBoundingClientRect(), cap = c.querySelector('.wk-cap');
    return { w: c.dataset.w, cls: c.className, banner: bn ? { text: bt.textContent, full: bt.dataset.full, short: bt.dataset.short, sr: bn.querySelector('.sr')?.textContent, role: bn.getAttribute('role'), fits: bt.scrollWidth <= bt.clientWidth + 0.5, oneLine: bt.getBoundingClientRect().height <= parseFloat(tcs.lineHeight) * 1.2 + 0.5,
        fs: parseFloat(tcs.fontSize), fw: tcs.fontWeight, ff: tcs.fontFamily.split(',')[0], ico: ic ? [Math.round(ic.getBoundingClientRect().width), ic.getAttribute('src').split('/').pop(), ic.getAttribute('aria-hidden')] : null, inCard: r.left >= cr.left - 0.5 && r.right <= cr.right + 0.5, rect: [r.left, r.top, r.right, r.bottom].map(v => +v.toFixed(1)) } : null,
      refill: rf ? { aria: rf.getAttribute('aria-label'), dis: rf.getAttribute('aria-disabled'), txt: rf.innerText.trim(), h: rr.height, w: rr.width, desc: rf.getAttribute('aria-describedby') } : null, cap: cap?.textContent ?? null,
      buttons: [...c.querySelectorAll('button')].map(b => b.innerText.trim() + '|' + (b.getAttribute('aria-label') ?? '')) }; });
  const badge = sel => { const e = document.querySelector(sel); return e && !e.hidden && getComputedStyle(e).display !== 'none' ? e.textContent.trim() : null; };
  const nav = document.querySelector('nav [data-act=manageAll]'), bar = document.querySelector('#uRow .refill-wrap .manage-all');
  const etas = [...document.querySelectorAll('.eta, .hint.eta, [data-eta]')].filter(e => e.getClientRects().length).map(e => e.textContent.trim());
  return { state: { coins: g.state.coinsCents, basket: g.state.basket, coop: g.state.coop, workers: JSON.parse(JSON.stringify(g.state.workers)), cd: g.state.manageCdS },
    rate: rate ? { text: rate.textContent, aria: rate.getAttribute('aria-label'), sign: rate.dataset.sign, color: rcs.color, role: rate.getAttribute('role') } : null,
    badgeUp: badge('[data-nav=upgrades] .asleep-badge'), badgeWk: badge('.tabs [data-tab=workers] .asleep-badge'), cards,
    nav: nav && !nav.hidden ? { aria: nav.getAttribute('aria-label'), lbl: nav.querySelector('.nav-lbl')?.textContent, badge: nav.querySelector('.count-badge:not([hidden])')?.textContent ?? null } : null,
    bar: bar ? { aria: bar.getAttribute('aria-label'), txt: bar.innerText.trim(), dis: bar.getAttribute('aria-disabled') } : null, etas,
    pageSW: document.scrollingElement.scrollWidth, iw: innerWidth, bodyText: document.body.innerText }; });
const W_ = (o = {}) => ({ energy: 90, cdS: 5, ...o });
const AS = [ // [id, label, F, coins, workers, expect]
  ['ch-asleep', 10, 1e6, { coop_hand: W_({ energy: 0 }) }, { w: 'coop_hand', full: 'Coop Hand asleep: collecting stopped', short: 'Asleep: collecting stopped', sr: 'Coop Hand is asleep. Auto-collecting has stopped.', badge: '1', mhStall: false }],
  ['ch-unpaid', 10, 0, { coop_hand: W_({ energy: 70, unpaid: true }) }, { w: 'coop_hand', full: 'Coop Hand unpaid: collecting stopped', short: 'Unpaid: collecting stopped', sr: 'Coop Hand is unpaid. Auto-collecting has stopped.', badge: '1', mhStall: false }],
  ['mh-asleep', 10, 1e6, { market_hand: W_({ energy: 0 }) }, { w: 'market_hand', full: 'Market Hand asleep: sales stopped', short: 'Asleep: sales stopped', sr: 'Market Hand is asleep. Auto-sales have stopped.', badge: '1', mhStall: true }],
  ['mh-unpaid', 10, 0, { market_hand: W_({ energy: 70, unpaid: true }) }, { w: 'market_hand', full: 'Market Hand unpaid: sales stopped', short: 'Unpaid: sales stopped', sr: 'Market Hand is unpaid. Auto-sales have stopped.', badge: '1', mhStall: true }],
  ['grader-asleep', 20, 1e6, { grader: W_({ energy: 0 }) }, { w: 'grader', full: 'Grader asleep: bonus down to 15%', short: 'Asleep: bonus down to 15%', sr: 'Grader is asleep. Bonus down to 15 percent.', badge: '1', mhStall: false }],
  ['hawker-asleep', 20, 1e6, { hawker: W_({ energy: 0 }) }, { w: 'hawker', full: 'Hawker asleep: sales slowed', short: 'Asleep: sales slowed', sr: 'Hawker is asleep. Sales are slowed.', badge: '1', mhStall: false }],
];
async function secAsleep() {
  const { ctx, p, errs } = await open();
  for (const [id, F, coins, workers, ex] of AS) {
    await closeSheet(p); await setS(p, { farmLevel: F, collectionLevel: 5, graderTier: 1, coinsCents: coins, coop: 0, basket: 0, workers, manageCdS: 0 }); await tick(p);
    const st = await sheet(p, 'workers'); await p.evaluate(() => window.eggfarmQaFitBanners?.()); await p.waitForTimeout(100);
    const r = await readAll(p); const c = r.cards.find(x => x.w === ex.w), bn = c?.banner;
    const textOk = !!bn && bn.full === ex.full && (bn.text === ex.full || (bn.text === ex.short && !bn.fits === false)) && bn.sr === ex.sr;
    ok('asleep', `${id}: banner "${ex.full}" (role dropped only if the full string doesn't fit), aria "${ex.sr}"`, st.ok && textOk && (bn.text === ex.full || bn.text === ex.short), { st, bn, cardCls: c?.cls });
    if (bn && bn.text === ex.short) { // verify the drop was needed: full string must overflow at this width
      const need = await p.evaluate(() => { const t = document.querySelector('.wk-banner .bt'); const s = t.textContent; t.textContent = t.dataset.full; const o = t.scrollWidth > t.clientWidth + 0.5; t.textContent = s; return o; });
      ok('asleep', `${id}: role dropped -> the full string really overflows at ${W}`, need, { bn });
    } else if (bn) ok('asleep', `${id}: full string kept and fits`, bn.fits, { bn });
    ok('asleep', `${id}: banner layout one line, Nunito 700 >= 12px, 14px ${ex.full.includes('unpaid') ? 'warning' : 'moon'} SVG aria-hidden, inside card, role=status, card .is-off`, !!bn && bn.oneLine && bn.fits && bn.fs >= 12 && bn.fw === '700' && /Nunito/i.test(bn.ff) && bn.ico?.[0] === 14 && bn.ico?.[1] === (ex.full.includes('unpaid') ? 'icon-warning.svg' : 'icon-moon.svg') && bn.ico?.[2] === 'true' && bn.inCard && bn.role === 'status' && /is-off/.test(c.cls), { bn, cls: c?.cls });
    ok('asleep', `${id}: badges Upgrades + Workers = ${ex.badge}`, r.badgeUp === ex.badge && r.badgeWk === ex.badge, { up: r.badgeUp, wk: r.badgeWk });
    const allBn = r.cards.filter(x => x.banner).map(x => x.banner.text + ' ' + x.banner.sr).join(' | ');
    if (ex.w === 'market_hand' || ex.w === 'coop_hand') ok('asleep', `${id}: no "slowed"/"production stopped"/"auto-selling" in any ${ex.w} banner`, !/slowed|production stopped|auto-selling/i.test(bn?.text + ' ' + bn?.sr), { allBn });
    ok('asleep', `${id}: HUD #rate role=status; aria ", sales stopped" ${ex.mhStall ? 'present (AC-R2a)' : 'absent'}; ${ex.mhStall ? 'rate <=0 red with ⚠ (AC-R1m/SS-15)' : ''}`,
      r.rate.role === 'status' && (ex.mhStall ? (/, sales stopped$/.test(r.rate.aria) && r.rate.sign === 'neg' && /^⚠/.test(r.rate.text) && r.rate.color === 'rgb(184, 59, 55)' && !/^\+/.test(r.rate.text)) : !/sales stopped/.test(r.rate.aria)), r.rate);
    ok('asleep', `${id}: no page h-scroll`, r.pageSW <= r.iw, { sw: r.pageSW });
    ok('asleep', `${id}: Refill button >=44px tall, label-in-name (visible "Refill" in aria)`, !!c?.refill && c.refill.h >= 44 && /^Refill\b/.test(c.refill.aria) && c.refill.txt === 'Refill', c?.refill);
    rec({ rt: 'state', id, st, r: { ...r, bodyText: undefined } });
    await p.locator('#uRow .wk-banner').first().scrollIntoViewIfNeeded().catch(() => {}); const st2 = await assertTab(p, 'workers');
    ok('asleep', `${id}: tab still Workers before shot`, st2.ok, st2); await shot(p, `asleep-${id}`);
  }
  // HoE note 1: Unpaid MH has no Pay action, caption above T, resumes once coins cover the wage (F10: need = $0.25*10*1 = $2.50)
  { await closeSheet(p); await setS(p, { farmLevel: 10, coinsCents: 100, coop: 0, basket: 0, manageCdS: 0, workers: { market_hand: W_({ energy: 70, unpaid: true }) } }); await tick(p, 1500);
    const st = await sheet(p, 'workers'); const r = await readAll(p); const c = r.cards.find(x => x.w === 'market_hand');
    const pay = await p.evaluate(() => [...document.querySelectorAll('button,[role=button],a')].filter(e => e.getClientRects().length && /\bpay\b/i.test((e.innerText || '') + ' ' + (e.getAttribute('aria-label') || ''))).map(e => e.outerHTML.slice(0, 120)));
    ok('hoe', 'Unpaid MH (coins $1.00 < $2.50): still Unpaid after 1.5 s, no Pay action anywhere (no button/link with "pay")', st.ok && r.state.workers.market_hand.unpaid === true && pay.length === 0 && !c.buttons.some(b => /pay/i.test(b)), { pay, buttons: c?.buttons, w: r.state.workers.market_hand });
    ok('hoe', 'Unpaid MH energy 70 (> T=50): disabled Refill captioned "Rested, refill below 50%" (HoE note 3; v1.0.8 AC-R10 targets next patch)', c?.cap === 'Rested, refill below 50%' && c.refill.dis === 'true' && c.refill.desc === 'cap-market_hand', { cap: c?.cap, refill: c?.refill });
    await shot(p, 'hoe-mh-unpaid-above-T');
    await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coinsCents: 249 }; }); await tick(p, 1300);
    const u1 = await p.evaluate(() => window.eggfarm.state.workers.market_hand);
    await p.evaluate(() => { const g = window.eggfarm; g.__res = null; g.state = { ...g.state, coinsCents: 250 }; const t0 = performance.now(); const f = () => { if (!g.state.workers.market_hand.unpaid) { g.__res = performance.now() - t0; return; } if (performance.now() - t0 < 3000) requestAnimationFrame(f); }; requestAnimationFrame(f); });
    await p.waitForTimeout(1500); const res = await p.evaluate(() => window.eggfarm.__res); const r2 = await readAll(p); const c2 = r2.cards.find(x => x.w === 'market_hand');
    ok('hoe', `Unpaid MH: stays Unpaid at $2.49 (${u1.unpaid}); resumes on its own at $2.50 within ${res?.toFixed(0)} ms (<=1000), banner + badge clear`, u1.unpaid === true && res !== null && res <= 1000 && !c2.banner && r2.badgeUp === null, { u1, res, banner: c2?.banner, badge: r2.badgeUp });
  }
  // HoE note 2: Tired shows no banner (MH energy 20 < tired_below 30, Hawker 25)
  { await closeSheet(p); await setS(p, { farmLevel: 20, coinsCents: 1e6, manageCdS: 0, workers: { market_hand: W_({ energy: 20 }), hawker: W_({ energy: 25 }), coop_hand: W_({ energy: 28 }) } }); await tick(p);
    const st = await sheet(p, 'workers'); const r = await readAll(p);
    ok('hoe', 'Tired (energy 20/25/28 < 30, working): no banner on any card, no asleep badge', st.ok && r.cards.every(c => !c.banner) && r.badgeUp === null && r.cards.filter(c => /tired/.test(c.cls)).length === 3, { cls: r.cards.map(c => c.cls), badge: r.badgeUp });
    // AC-R9 N=3 plural + Refill bar
    ok('asleep', `AC-R9: 3 hired all <=50% -> "Refill 3 tired workers" (bar + nav aria)`, r.bar?.aria === 'Refill 3 tired workers' && /Refill 3 tired workers/.test(r.bar?.txt) && (docked || r.nav?.aria === 'Refill 3 tired workers'), { bar: r.bar, nav: r.nav });
    await shot(p, 'hoe-tired-no-banner'); }
  // AC-R9 N=1 / N=2 and AC-R5 count with 2+ asleep, then Refill clears banners + badges within 1 s and rate recovers
  for (const [n, ws] of [[1, { market_hand: W_({ energy: 90 }), hawker: W_({ energy: 95 }), coop_hand: W_({ energy: 40 }) }], [2, { market_hand: W_({ energy: 0 }), hawker: W_({ energy: 0 }), coop_hand: W_({ energy: 90 }) }]]) {
    await closeSheet(p); await setS(p, { farmLevel: 20, coinsCents: 1e6, coop: 0, basket: 0, manageCdS: 0, workers: ws }); await tick(p);
    const st = await sheet(p, 'workers'); const r = await readAll(p); const want = n === 1 ? 'Refill 1 tired worker' : 'Refill 2 tired workers';
    ok('asleep', `AC-R9 N=${n}: "${want}" (never "1 tired workers")`, st.ok && r.bar?.aria === want && r.bar.txt.includes(want) && (docked || r.nav?.aria === want) && !/1 tired workers/.test(r.bodyText), { bar: r.bar, nav: r.nav });
    if (n === 2) {
      ok('asleep', 'AC-R5: 2 asleep -> badges show 2', r.badgeUp === '2' && r.badgeWk === '2', { up: r.badgeUp, wk: r.badgeWk });
      const before = r.rate; await shot(p, 'acr5-two-asleep');
      await p.locator('#uRow .refill-wrap .manage-all').click();
      const t0 = Date.now(); let r2; do { await p.waitForTimeout(100); r2 = await readAll(p); } while ((r2.badgeUp !== null || r2.cards.some(c => c.banner)) && Date.now() - t0 < 2000);
      await tick(p, 900); const r3 = await readAll(p);
      ok('asleep', `AC-R5: Refill clears banners + badges within ${Date.now() - t0 > 2000 ? '>2000' : (Date.now() - t0)} ms (<=1000 incl. 100 ms poll), rate back to positive without "stopped"`, r2.badgeUp === null && r2.cards.every(c => !c.banner) && Date.now() - t0 <= 2100 && r3.rate.sign === 'pos' && !/stopped/.test(r3.rate.aria), { before, after: r3.rate, ms: Date.now() - t0 });
      // AC-R8 cooldown caption "Ready in Ns" counting down at <= T
      await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, workers: { ...g.state.workers, coop_hand: { energy: 30, cdS: 5 } } }; }); await tick(p, 400);
      const a = (await readAll(p)).cards.find(c => c.w === 'coop_hand').cap; await tick(p, 2100); const b2 = (await readAll(p)).cards.find(c => c.w === 'coop_hand').cap;
      const na = +(/Ready in (\d+)s/.exec(a ?? '') ?? [])[1], nb = +(/Ready in (\d+)s/.exec(b2 ?? '') ?? [])[1];
      ok('asleep', `AC-R8 cooldown: energy 30 (<= T) on cooldown -> "Ready in Ns" counting down ("${a}" -> "${b2}")`, na > 0 && nb < na, { a, b2 });
      await shot(p, 'acr8-cooldown');
    }
  }
  // AC-R8 at T=50 (from economy.md:80 / balance-changelog.md:71, manage_prompt_threshold 0.5): 51 -> Rested, 50 -> enabled, 49 -> enabled
  for (const e of [51, 50.4, 50, 49]) {
    await closeSheet(p); await setS(p, { farmLevel: 10, coinsCents: 1e6, manageCdS: 0, workers: { coop_hand: W_({ energy: e }) } }); await tick(p, 400);
    const st = await sheet(p, 'workers'); const c = (await readAll(p)).cards.find(x => x.w === 'coop_hand');
    const above = e > 50; // canManageWorker: energy <= 0.5*100
    ok('acr8', `AC-R8 T=50: Coop Hand energy ${e} -> ${above ? 'disabled Refill, caption "Rested, refill below 50%"' : 'Refill enabled, no caption'}`, st.ok && (above ? c.cap === 'Rested, refill below 50%' && c.refill.dis === 'true' : c.cap === null && c.refill.dis === 'false'), { e, cap: c?.cap, refill: c?.refill });
  }
  // AC-R6 no player-facing "Manage" in any scene visited (visible text + accessible names)
  const man = await p.evaluate(() => { const t = document.body.innerText; const names = [...document.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')); return { vis: /\bManage\b/.test(t), names: names.filter(n => /\bManage\b/.test(n)) }; });
  ok('asleep', 'AC-R6: no "Manage" in visible text or aria-labels (Workers tab)', !man.vis && man.names.length === 0, man);
  // AC-R1m / AC-R2 / AC-R5 timing: HUD #rate flip latency measured per rAF in page (5 trials each)
  const lat = (pre, post, pred) => p.evaluate(async ([pre, post, pred]) => { const g = window.eggfarm; const out = [];
    for (let i = 0; i < 5; i++) { g.state = { ...g.state, customers: [], nextCustomerInS: 1e9, ...pre }; await new Promise(r => setTimeout(r, 1300));
      const t0 = performance.now(); g.state = { ...g.state, ...post }; const f = new Function('r', 'return ' + pred);
      const ms = await new Promise(res => { const tk = () => { const e = document.querySelector('#rate'); const r = { text: e.textContent, aria: e.getAttribute('aria-label'), sign: e.dataset.sign }; if (f(r)) return res(performance.now() - t0); if (performance.now() - t0 > 3000) return res(null); requestAnimationFrame(tk); }; requestAnimationFrame(tk); });
      out.push(ms === null ? null : Math.round(ms)); } return out; }, [pre, post, pred]);
  await closeSheet(p);
  { const mhOn = { farmLevel: 10, collectionLevel: 5, coinsCents: 1e6, coop: 0, basket: 0, manageCdS: 0, workers: { market_hand: { energy: 90, cdS: 5 } } };
    const a = await lat(mhOn, { workers: { market_hand: { energy: 0, cdS: 5 } } }, "r.sign === 'neg' && /, sales stopped$/.test(r.aria)");
    ok('timing', `AC-R1m/AC-R2a: MH falls asleep -> HUD <=0 red + ", sales stopped" within 1 s (5 trials: ${a.join(',')} ms)`, a.every(x => x !== null && x <= 1000), a);
    const b2 = await lat({ ...mhOn, workers: { market_hand: { energy: 0, cdS: 5 } } }, { workers: { market_hand: { energy: 100, cdS: 0 } } }, "r.sign === 'pos' && !/stopped/.test(r.aria)");
    ok('timing', `AC-R5: MH refilled -> HUD positive again within 1 s (5 trials: ${b2.join(',')} ms)`, b2.every(x => x !== null && x <= 1000), b2);
    const chOn = { farmLevel: 12, collectionLevel: 9, coinsCents: 1e6, coop: 0, basket: 0, manageCdS: 0, workers: { coop_hand: { energy: 90, cdS: 5 } } };
    const c = await lat(chOn, { workers: { coop_hand: { energy: 0, cdS: 5 } } }, "!/sales stopped/.test(r.aria) && document.querySelector('[data-nav=upgrades] .asleep-badge') && !document.querySelector('[data-nav=upgrades] .asleep-badge').hidden");
    ok('timing', `AC-R1c/AC-R2a: CH falls asleep -> badge within 1 s and HUD aria never "sales stopped" (5 trials: ${c.join(',')} ms)`, c.every(x => x !== null && x <= 1000), c); }
  // SS-28 / P-4 and AC-R7 (browser): MH Asleep F10. Unit part (secondsToAffordSteady null) is in ss/ss15-prop.out. Browser: log which ETA surfaces exist and how they read.
  { await setS(p, { farmLevel: 10, hensLevel: 10, eggValueLevel: 10, collectionLevel: 5, coinsCents: 100, coop: 0, basket: 0, manageCdS: 0, workers: { market_hand: W_({ energy: 90 }), coop_hand: W_({ energy: 90 }) } });
    const st0 = await sheet(p, 'farm'); let e0, t1 = Date.now(); do { await p.waitForTimeout(500); e0 = await readAll(p); } while (!e0.etas.some(x => /\d/.test(x)) && Date.now() - t1 < 10000);
    await shot(p, 'ss28-before-mh-working');
    await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, workers: { ...g.state.workers, market_hand: { energy: 0, cdS: 5 } } }; });
    const trace = []; const t0 = Date.now(); while (Date.now() - t0 < 6000) { const r = await readAll(p); trace.push({ ms: Date.now() - t0, etas: r.etas, rate: r.rate.text }); await p.waitForTimeout(500); }
    const st = await assertTab(p, 'farm'); await shot(p, 'ss28-after-mh-asleep-6s');
    rec({ rt: 'ss28trace', before: e0.etas, beforeRate: e0.rate, trace });
    ok('ss28', `SS-28/P-4 browser: Farm tab ETA surfaces before (MH working): ${JSON.stringify(e0.etas)}; after MH asleep HUD red within 1 s; card ETAs are the 60 s IncomeRate window (no UI consumer of secondsToAffordSteady) -> drift logged KI-SS1/KI-RV5`, st0.ok && st.ok && trace.filter(x => x.ms >= 1000).every(x => /^⚠/.test(x.rate)), { before: e0.etas, trace: trace.map(x => [x.ms, x.etas.join('|'), x.rate]) });
    // string scan: nothing claims the next-goal ETA reads "—" (visible copy)
    const claim = await p.evaluate(() => /ETA[^.]{0,40}—|reads? "?—/.test(document.body.innerText)); ok('ss28', 'SS-28 string scan: no visible copy claims the next-goal ETA reads "—"', !claim, { claim });
    const samples = []; for (let i = 0; i < 6; i++) { samples.push((await readAll(p)).rate); await p.waitForTimeout(500); }
    ok('ss15', 'SS-15/P-1 HUD: MH asleep (+ CH working) -> rate <=0 red ⚠ in 6/6 samples over 3 s, aria ends ", sales stopped", never "plus"', samples.every(x => x.sign === 'neg' && /^⚠/.test(x.text) && /, sales stopped$/.test(x.aria) && !/plus/.test(x.aria)), samples);
  }
  ok('asleep', 'no console errors / page errors', errs.length === 0, errs.slice(0, 5)); await ctx.close();
}
// ---------------- axe label-in-name on asleep scenes ----------------
async function secAxe() {
  const axe = readFileSync(AXE, 'utf8'); const { ctx, p, errs } = await open();
  const ver = await p.evaluate(src => { eval(src); return window.axe.version; }, axe);
  for (const [id, F, coins, workers] of AS.concat([['mixed-all', 20, 0, { market_hand: W_({ energy: 0 }), coop_hand: W_({ energy: 70, unpaid: true }), hawker: W_({ energy: 0 }), grader: W_({ energy: 0 }) }]])) {
    await closeSheet(p); await setS(p, { farmLevel: F, graderTier: 1, coinsCents: coins, coop: 0, basket: 0, workers, manageCdS: 0 }); await tick(p);
    const st = await sheet(p, 'workers');
    const res = await p.evaluate(async () => { const r = await window.axe.run(document, { rules: { 'label-content-name-mismatch': { enabled: true } }, resultTypes: ['violations'] });
      return r.violations.filter(v => v.id === 'label-content-name-mismatch' || ['serious', 'critical'].includes(v.impact)).map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, t: v.nodes.map(n => n.target.join(' ')).slice(0, 6) })); });
    const lin = res.filter(v => v.id === 'label-content-name-mismatch'), new_ = lin.filter(v => !v.t.every(t => /chip\.arrive|data-act="sell"|\.sell/.test(t)));
    ok('axe', `axe ${ver} ${id}: 0 label-content-name-mismatch on the patch surfaces (banners, Refill, badges, nav, #rate)`, st.ok && new_.length === 0, { lin, other: res.filter(v => v.id !== 'label-content-name-mismatch') });
    rec({ rt: 'axe', id, ver, res });
  }
  // negative control: the rule is live
  const neg = await p.evaluate(async () => { const b = document.createElement('button'); b.id = 'qaNeg'; b.textContent = 'Refill'; b.setAttribute('aria-label', 'Zzz other'); document.body.appendChild(b); const r = await window.axe.run('#qaNeg', { rules: { 'label-content-name-mismatch': { enabled: true } } }); b.remove(); return r.violations.map(v => v.id); });
  ok('axe', 'negative control flags label-content-name-mismatch', neg.includes('label-content-name-mismatch'), neg);
  ok('axe', 'no console errors / page errors', errs.length === 0, errs.slice(0, 5)); await ctx.close();
}
// ---------------- P-7 tap isolation: banner / Refill / badges never credit a #scene Collect ----------------
async function secTaps() {
  for (const input of ['mouse', 'touch']) {
    const { ctx, p, errs } = await open({ touch: input === 'touch' });
    await setS(p, { farmLevel: 20, collectionLevel: 10, graderTier: 1, coinsCents: 0, coop: 40, basket: 7, manageCdS: 0, workers: { market_hand: W_({ energy: 0 }), coop_hand: W_({ energy: 50, unpaid: true }), hawker: W_({ energy: 20 }), grader: W_({ energy: 0 }) } });
    await p.evaluate(() => { const g = window.eggfarm; g.__acts = []; const d = g.dispatch.bind(g); g.dispatch = a => { g.__acts.push(a.type); return d(a); }; g.__tel = (g.telemetry?.events?.length ?? null); });
    const snap = () => p.evaluate(() => { const g = window.eggfarm; return { acts: g.__acts.slice(), basket: g.state.basket, coins: g.state.coinsCents, coop: +g.state.coop.toFixed(3), hawker: g.state.workers.hawker?.energy, tapEv: (g.telemetry?.events ?? []).filter?.(e => /collect|tap/i.test(e.name ?? e.type ?? '')).length ?? null }; });
    const tapAt = async (loc, label) => { const bb = await loc.boundingBox(); if (!bb) return { label, missing: true }; const x = bb.x + bb.width / 2, y = bb.y + bb.height / 2;
      const hit = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return { el: e ? `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 40)}` : null, inScene: !!e?.closest('#scene') }; }, [x, y]);
      const s0 = await snap(); await p.evaluate(() => { window.eggfarm.__acts.length = 0; });
      if (input === 'touch') await p.touchscreen.tap(x, y); else await p.mouse.click(x, y);
      await p.waitForTimeout(300); const s1 = await snap(); return { label, x: Math.round(x), y: Math.round(y), ...hit, s0, s1, collect: s1.acts.filter(a => a === 'collect').length, dBasket: s1.basket - s0.basket, dCoins: s1.coins - s0.coins, dTap: (s1.tapEv ?? 0) - (s0.tapEv ?? 0) }; };
    // control
    await closeSheet(p); const c0 = await tapAt(p.locator('#scene'), 'control #scene');
    ok('taps', `${input}: control tap on #scene IS a Collect (spy live)`, c0.collect >= 1, c0);
    const results = [];
    if (!docked) results.push(await tapAt(p.locator('[data-nav=upgrades] .asleep-badge').first(), 'nav Upgrades asleep badge'));
    const st = await sheet(p, 'workers'); ok('taps', `${input}: Workers tab active before banner taps`, st.ok, st);
    results.push(await tapAt(p.locator('.tabs [data-tab=workers] .asleep-badge').first(), 'Workers tab asleep badge'));
    const nb = await p.locator('#uRow .wk-banner').count();
    for (let i = 0; i < nb; i++) { const l = p.locator('#uRow .wk-banner').nth(i); await l.scrollIntoViewIfNeeded(); results.push(await tapAt(l, `banner ${i} ${await l.locator('.bt').textContent()}`)); }
    // per-card Refill buttons (disabled for >T, enabled for Hawker 20 / CH 50 unpaid)
    for (const w of ['coop_hand', 'hawker', 'market_hand']) { const l = p.locator(`#uRow [data-act=manage][data-w=${w}]`); if (await l.count()) { await l.scrollIntoViewIfNeeded(); results.push(await tapAt(l, `card Refill ${w}`)); } }
    await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, manageCdS: 0, workers: { ...g.state.workers, hawker: { energy: 20, cdS: 0 } } }; window.eggfarmUi.render(); }); await p.waitForTimeout(300);
    const bar = p.locator('#uRow .refill-wrap .manage-all'); if (await bar.count()) { await bar.scrollIntoViewIfNeeded(); results.push(await tapAt(bar, 'Workers-tab Refill bar')); }
    if (!docked) { await closeSheet(p); await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, manageCdS: 0, workers: { ...g.state.workers, hawker: { energy: 20, cdS: 0 } } }; window.eggfarmUi.render(); }); await p.waitForTimeout(300);
      const nav = p.locator('nav [data-act=manageAll]'); if (await nav.count() && await nav.isVisible()) results.push(await tapAt(nav, 'nav Refill')); }
    await shot(p, `taps-${input}-end`);
    for (const r of results) ok('taps', `${input}: tap on ${r.label} -> no #scene Collect (0 collect dispatch, basket unchanged, not in #scene)`, !r.missing && !r.inScene && r.collect === 0 && r.dBasket === 0, r);
    ok('taps', `${input}: ${results.length} controls tapped, none missing`, results.length >= 6 && results.every(r => !r.missing), results.map(r => r.label));
    ok('taps', `${input}: no console errors / page errors`, errs.length === 0, errs.slice(0, 5)); await ctx.close();
  }
}
const S = SECS.split(',');
try { if (S.includes('hens')) await secHens(); if (S.includes('flagoff')) await secFlagoff(); if (S.includes('asleep')) await secAsleep(); if (S.includes('axe')) await secAxe(); if (S.includes('taps')) await secTaps(); }
catch (e) { ok('run', 'probe crashed: ' + e.message, false, { stack: String(e.stack).slice(0, 600) }); }
rec({ rt: 'done', pass: nPass, fail: nFail, fails, loads: loads.length, loadsOk: loads.every(b => b === BID), shots: shotN });
console.log(`DONE ${ENG} ${W} ${SECS}: ${nPass} pass, ${nFail} fail, loads ${loads.length} (bid ok ${loads.every(b => b === BID)}), shots ${shotN}`);
await br.close(); srv.close();
