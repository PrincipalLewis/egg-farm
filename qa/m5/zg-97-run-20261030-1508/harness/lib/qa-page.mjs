// [zg-97-run copy 2026-10-30] only change vs harness-rc-next: serve() listens on $QA_PORT (lane uiqa-zg97, 5291+) instead of port 0.
// [v5-ui harness, NEW 2026-10-29] Shared page helpers for the NEW v5 probes (p2, zg, ss1617, art-set). Same conventions as the proven
// p1.mjs: own OS-assigned 127.0.0.1 port (never :4173), build-id read from <meta name=build-id> on EVERY load and asserted == $QA_BID
// (no hard-coded prefix; must contain +$QA_SHA7), QA UI flags preset, explainer/modal cleared, state injected via window.eggfarm.
// Every measurement: assertTab() first, shot() right after; each shot writes a sidecar record (for the screenshot manifest).
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import http from 'node:http'; import { join, extname, dirname } from 'node:path'; import { createHash } from 'node:crypto';
export const env = () => { const e = { WT: process.env.QA_WT, BID: process.env.QA_BID, S7: process.env.QA_SHA7, EV: process.env.QA_EV, DIST: process.env.QA_DIST ?? 'dist-qa', VARIANT: process.env.QA_VARIANT ?? 'default' };
  if (!e.WT || !e.BID || !e.S7 || !e.EV) throw new Error('QA_WT, QA_BID, QA_SHA7, QA_EV env required'); if (!e.BID.includes('+' + e.S7)) throw new Error(`QA_BID ${e.BID} lacks +${e.S7}`); return e; };
export const AXE = process.env.AXE ?? new URL('../../tools/axe-core-4.14.0/axe.min.js', import.meta.url).pathname;
export const SIZES = { 360: [360, 640], 375: [375, 667], 390: [390, 844], 430: [430, 932], 1280: [1280, 800], '959x600': [959, 600], '960x600': [960, 600], '1024x474': [1024, 474], '1024x1366': [1024, 1366], '1280x720': [1280, 720], '1366x768': [1366, 768], '375x844': [375, 844], '360x800': [360, 800] };
export const size = s => SIZES[s] ?? (String(s).includes('x') ? String(s).split('x').map(Number) : [+s, 800]);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.ico': 'image/x-icon' };
export async function serve(dir) { const srv = await new Promise(r => { const s = http.createServer((q, res) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = join(dir, p); if (!f.startsWith(dir) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' }); res.end(readFileSync(f)); }).listen(+(process.env.QA_PORT || 0), '127.0.0.1', () => r(s)); });
  if (srv.address().port === 4173) throw new Error('port 4173'); return srv; }
export async function harness(name, ENG, SZ, { tag = '' } = {}) {
  const E = env(); const [W, H] = size(SZ); const pw = (await import(`${E.WT}/node_modules/playwright-core/index.mjs`)).default;
  const srv = await serve(`${E.WT}/${E.DIST}`); const URL0 = `http://127.0.0.1:${srv.address().port}/`;
  const br = ENG === 'chromium' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[ENG].launch();
  const OD = `${E.EV}${name}/`; const SH = `${E.EV}shots/${name}/${ENG}/`; mkdirSync(OD, { recursive: true }); mkdirSync(SH, { recursive: true });
  const OUT = `${OD}${name}-${E.VARIANT}-${ENG}-${W}x${H}${tag ? '-' + tag : ''}.jsonl`; writeFileSync(OUT, ''); const SIDE = `${E.EV}shots/sidecar-${name}-${E.VARIANT}-${ENG}-${W}x${H}${tag ? '-' + tag : ''}.jsonl`; writeFileSync(SIDE, '');
  const st = { pass: 0, fail: 0, unv: 0, fails: [], loads: [], shots: 0 };
  const rec = o => appendFileSync(OUT, JSON.stringify({ engine: ENG, w: W, h: H, variant: E.VARIANT, build_id: E.BID, ...o }) + '\n');
  const ok = (sec, nm, pass, info = {}) => { if (pass === 'UNVERIFIED') st.unv++; else if (pass) st.pass++; else { st.fail++; st.fails.push(`${sec}: ${nm}`); console.log(`FAIL [${ENG} ${W}x${H}] ${sec}: ${nm} ${JSON.stringify(info).slice(0, 300)}`); } rec({ rt: 'check', sec, name: nm, pass: pass === 'UNVERIFIED' ? 'UNVERIFIED-UNTIL-RC' : !!pass, info }); return pass === true || (pass && pass !== 'UNVERIFIED'); };
  const UI = { onboardingDone: true, seenSlots: 10, workersIntroA: true, workersIntroB: true, sfx: false };
  const docked = W >= 1024 && H <= 800 ? true : W >= 1024 && H > W ? false : W >= 960;
  async function open({ touch = false, reducedMotion, before, raw = false, url, bid: wantBid } = {}) { // url/bid: optional second build (e.g. ZG_BASE_URL + ZG_BASE_BID) - default unchanged // before(p): extra init scripts (run after the QA LS reset); raw: keep modals/welcome-back
 const ctx = await br.newContext({ viewport: { width: W, height: H }, hasTouch: touch, ...(reducedMotion ? { reducedMotion } : {}) }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });
    await p.addInitScript(ui => { if (!sessionStorage.getItem('qa')) { sessionStorage.setItem('qa', '1'); localStorage.clear(); localStorage.setItem('eggfarm.ui', JSON.stringify(ui)); } }, UI); if (before) await before(p);
    await p.goto(url ?? URL0, { waitUntil: 'domcontentloaded' }); const bid = await p.evaluate(() => document.querySelector('meta[name=build-id]')?.content); st.loads.push(bid);
    const WB = wantBid ?? E.BID; ok('load', `runtime build-id ${bid} == ${WB}`, bid === WB, { bid }); if (bid !== WB) throw new Error('build-id mismatch ' + bid);
    await p.getByText('Tap to start').click({ timeout: 60000 }).catch(() => {}); await p.waitForFunction(() => window.eggfarm && window.eggfarmUi, null, { timeout: 60000 });
    if (!raw) await p.evaluate(() => { document.getElementById('modal-layer')?.classList.remove('open'); document.querySelectorAll('.tracks-exp,.tracks-exp-out').forEach(e => e.remove()); const g = window.eggfarm; g.state = { ...g.state, seenTracksExplainer: true, customers: [], nextCustomerInS: 1e9 }; window.eggfarmUi.render(); });
    await p.waitForTimeout(150); return { ctx, p, errs }; }
  const setS = (p, patch) => p.evaluate(patch => { const g = window.eggfarm; g.state = { ...g.state, customers: [], nextCustomerInS: 1e9, ...patch }; window.eggfarmUi.render(); }, patch);
  const isSheetDocked = async p => p.evaluate(() => { const s = document.querySelector('#p-upgrades'); return !!s && getComputedStyle(s).position !== 'fixed' && !document.querySelector('[data-nav=upgrades]')?.getClientRects().length; });
  const assertTab = (p, tab) => p.evaluate(tab => { const s = document.querySelector('#p-upgrades'); const act = [...document.querySelectorAll('[data-tab]')].filter(e => e.classList.contains('active')).map(e => e.dataset.tab);
    const vis = !!s && s.getClientRects().length > 0 && getComputedStyle(s).display !== 'none' && getComputedStyle(s).visibility !== 'hidden'; return { sheetOpen: vis, active: act, ok: tab === 'farm-screen' ? true : vis && (!tab || (act.length >= 1 && act.every(a => a === tab))) }; }, tab);
  // (k) RC-11: raw DOM facts for lib/farm-view.mjs farmViewOk (game breakpoint: 22eac98 src/ui/app.ts:118, styles.css:158-164)
  const farmFacts = p => p.evaluate(() => { const vis = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
    const s = document.querySelector('#p-upgrades'), pl = document.querySelector('#panel-layer'), c = s?.querySelector('.close');
    return { mq: matchMedia('(min-width:960px) and (orientation:landscape)').matches, farmVisible: vis(document.querySelector('#yard')), panelLayerPosition: pl ? getComputedStyle(pl).position : null,
      modal: { ariaModalVisible: [...document.querySelectorAll('[aria-modal=true]')].some(vis), modalLayerOpen: !!document.getElementById('modal-layer')?.classList.contains('open') },
      sheet: { rendered: vis(s), hiddenAttr: !!s?.hasAttribute('hidden'), position: s ? getComputedStyle(s).position : null, inPanelLayer: !!(s && pl && pl.contains(s)), ariaModal: s?.getAttribute('aria-modal') === 'true', closeVisible: vis(c) },
      active: [...document.querySelectorAll('[data-tab]')].filter(e => e.classList.contains('active')).map(e => e.dataset.tab) }; });
  async function sheet(p, tab) { const navVis = await p.evaluate(() => !!document.querySelector('[data-nav=upgrades]')?.getClientRects().length);
    const open = await p.evaluate(() => { const s = document.querySelector('#p-upgrades'); return !!s && !s.hidden && s.getClientRects().length > 0 && getComputedStyle(s).visibility !== 'hidden'; }); if (!open && navVis) { await p.locator('[data-nav=upgrades]').click(); await p.waitForTimeout(300); }
    if (tab) { await p.locator(`[data-tab=${tab}]`).first().click(); await p.waitForTimeout(250); } return assertTab(p, tab); }
  async function closeSheet(p) { const c = p.locator('.sheet:not([hidden]) .close'); if (await c.count() && await c.first().isVisible()) { await c.first().click(); await p.waitForTimeout(250); } }
  async function shot(p, id, meta = {}, clip) { const f = `${SH}${id}-${E.VARIANT}-${W}x${H}.png`; await p.screenshot({ path: f, ...(clip ? { clip } : {}) }); st.shots++;
    const sha = createHash('sha256').update(readFileSync(f)).digest('hex'); appendFileSync(SIDE, JSON.stringify({ id, engine: ENG, width: W, height: H, variant: E.VARIANT, build_id: E.BID, file: f.replace(E.EV, ''), sha256: sha, t: new Date().toISOString(), ...meta }) + '\n'); return f; }
  // accessible name (Playwright accname, every engine) + visible text in DOM order excluding aria-hidden / invisible nodes
  async function nameAndText(p, sel) { const l = p.locator(sel).first(); if (!(await l.count())) return null; const vis = await l.isVisible().catch(() => false); if (!vis) return { visible: false };
    const snap = await l.ariaSnapshot().catch(() => ''); const m = /^- \w[\w-]*(?: "((?:[^"\\]|\\.)*)")?/.exec(snap.split('\n')[0] ?? ''); const name = m?.[1]?.replace(/\\"/g, '"') ?? '';
    const text = await l.evaluate(el => { const out = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { let a = n.parentElement, hid = false; while (a && a !== el.parentElement) { if (a.getAttribute('aria-hidden') === 'true' || getComputedStyle(a).display === 'none' || getComputedStyle(a).visibility === 'hidden' || a.hidden) { hid = true; break; } a = a.parentElement; } if (!hid && n.textContent.trim()) out.push(n.textContent.trim()); } return out.join(' '); });
    const aria = await l.getAttribute('aria-label'); return { visible: true, name, text, aria, snap: snap.split('\n')[0] }; }
  const norm = s => String(s ?? '').toLowerCase().replace(/[\u00a0\s]+/g, ' ').replace(/[^\p{L}\p{N} ]/gu, '').replace(/ +/g, ' ').trim();
  const startsWithVisible = r => !!r && r.visible && norm(r.name).startsWith(norm(r.text)) && norm(r.text).length > 0;
  async function axeRun(p, opts = {}) { const src = readFileSync(AXE, 'utf8'); await p.evaluate(src => { if (!window.axe) eval(src); }, src);
    return p.evaluate(async o => { const r = await window.axe.run(o.ctx ?? document, { rules: { 'label-content-name-mismatch': { enabled: true } }, resultTypes: ['violations'], ...(o.runOnly ? { runOnly: o.runOnly } : {}) }); return { ver: window.axe.version, v: r.violations.map(v => ({ id: v.id, impact: v.impact, t: v.nodes.map(n => n.target.join(' ')) })) }; }, opts); }
  async function done() { rec({ rt: 'done', pass: st.pass, fail: st.fail, unverified: st.unv, fails: st.fails, loads: st.loads.length, loadsOk: st.loads.every(b => b === E.BID), shots: st.shots });
    console.log(`DONE ${name} ${E.VARIANT} ${ENG} ${W}x${H}: ${st.pass} pass, ${st.fail} fail, ${st.unv} unverified, loads ${st.loads.length} (bid ok ${st.loads.every(b => b === E.BID)}), shots ${st.shots}`); await br.close(); srv.close(); }
  return { E, ENG, W, H, docked, br, open, setS, sheet, closeSheet, assertTab, farmFacts, shot, ok, rec, nameAndText, startsWithVisible, norm, axeRun, done, st };
}
export const W_ = (o = {}) => ({ energy: 90, cdS: 5, ...o });
// The 7 QA asleep scenes (qa/m41/p1-30b29d3.md, same as p1.mjs AS + mixed-all)
export const SCENES = [
  ['ch-asleep', 10, 1e6, { coop_hand: W_({ energy: 0 }) }], ['ch-unpaid', 10, 0, { coop_hand: W_({ energy: 70, unpaid: true }) }],
  ['mh-asleep', 10, 1e6, { market_hand: W_({ energy: 0 }) }], ['mh-unpaid', 10, 0, { market_hand: W_({ energy: 70, unpaid: true }) }],
  ['grader-asleep', 20, 1e6, { grader: W_({ energy: 0 }) }], ['hawker-asleep', 20, 1e6, { hawker: W_({ energy: 0 }) }],
  ['mixed-all', 20, 0, { market_hand: W_({ energy: 0 }), coop_hand: W_({ energy: 70, unpaid: true }), hawker: W_({ energy: 0 }), grader: W_({ energy: 0 }) }]];
export const tel = p => p.evaluate(() => (window.eggfarm.telemetry?.events?.() ?? []).map(e => ({ type: e.type ?? e.name, ...(e.props ?? e.data ?? e) })));
