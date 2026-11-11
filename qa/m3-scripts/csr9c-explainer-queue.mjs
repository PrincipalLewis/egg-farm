// CSR-9c explainer gate (D-HOP-2026-10-22-06; Art & UX Major M-1 on dfdf49c, art-ux/reviews/m41-pr63-dfdf49c.md). Saves QA 2026-10-22.
// After an M1 or M2 restore of a pre-M4 save (no seenTracksExplainer, tracks migration commits in session):
//  (1) the tracks explainer (.tracks-exp) NEVER shows while .recovery-layer (or the 'Welcome back!' #modal-layer.open) is present (every-frame sampler + MutationObserver);
//  (2) it does NOT auto-dismiss: still visible N=12 s after it appears (> EXP_MS 8 s);
//  (3) seen stays false in memory, localStorage and IndexedDB until the player's dismiss click (all writes carrying seen=true are timestamped);
//  (4) a reload BEFORE dismissal shows it again; (5) after dismissal, a reload shows 0.
// HoQA 21:35: -06 applies ONLY to M1/M2 restores. Every other path = m4a-spec §17 as built (D-HOP-2026-10-19-11): seen set on show, 8 s auto-close.
// D-HOP-2026-10-22-07 (a) (CSR spec 073fafd3 line 28; HoQA 22:1x): CONFIRMED. M1/M2 restore boots: seen ONLY on dismiss + waits for .recovery-layer.
//   Normal commit, Welcome-back and reload paths: seen set at show, the 8 s auto-hide COUNTS (seen=true without a dismiss), reload -> 0. All HARD.
// HARD: (a) -06 (1)-(5) for M1-preM4 / M2-preM4; (b) §17 M4A-EXP-B2 AC(2): no card while #modal-layer.open (Welcome back!), card after it closes;
//       (c) M4A-EXP-B1 AC(1)-(5) regression on the normal show path (B1-4 'M4 off' is compile-time: N/A in browser, unit gate4-explainer).
//       (d) -07(a) HARD: Welcome-back auto-close + seen-on-show + no seen while the modal is open + 3 reloads show 0; EXPB1-1/-2 and
//           EXPB1-AH (normal commit, never dismissed): auto-hide without a click, seen=true (mem+LS) set at show, every reload shows 0.
// INFO: M3/fresh 0 cards; IDB seen after autosave on the -07 as-built paths; PROBE: on the Welcome-back path can seen=true be set while the card is hidden/covered
//       (modal, hidden tab, settings overlay)? Every seen=true write records the page state at that instant and 2 frames later.
// usage: flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node csr9c-explainer-queue.mjs <worktree> <port 5961-5964> <outdir> [sha7] [N_seconds=12]
//        node csr9c-explainer-queue.mjs --dry-run   (prints the case plan, checks fixtures, starts nothing)
//        ONLY=<comma list of case-id prefixes>, e.g. ONLY=EXPB1 (just the (c) set)
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';
const DRY = process.argv.includes('--dry-run');
const [W0, P = '5961', OUT, SHA7 = '', NS = '12'] = process.argv.slice(2).filter(a => a !== '--dry-run'); const N = Number(NS) * 1000;
const FX = '/workspace/egg-farm-studio/qa/m41/csr-fixtures/raw/'; const raw = n => fs.readFileSync(FX + n, 'utf8');
const PRE = fs.readFileSync('/workspace/egg-farm-studio/qa/m3-recheck/gate4-fixtures/pre-v7-F30-C30-732e70e.json', 'utf8').trim(); // v6, no tracksV7, no seenTracksExplainer, F30
const PRE_SAVED = JSON.parse(PRE).savedAt; // clock pinned to savedAt + 5 s => no 'Welcome back!' (normal show path)
const EXP1 = JSON.parse(fs.readFileSync('/workspace/egg-farm-studio/qa/m3-recheck/gate4-fixtures/EXP1-committed-unseen-4ccb9fd.json', 'utf8')); // committed tracksV7, unseen, matching v6_backup
const CASES = [
  // (a) D-HOP-2026-10-22-06, HARD
  { id: 'M1-preM4', mode: 'r06', dialog: 'M1', ls: { 'eggfarm.save': raw('MAIN-OQ1-abc.json'), 'eggfarm.save.bak': PRE } },
  { id: 'M2-preM4', mode: 'r06', dialog: 'M2', ls: { 'eggfarm.save': raw('MAIN-L17-badsum.json'), 'eggfarm.save.v6_backup': raw('V6B-valid-unmarked-F12-T-3h.json') } },
  // (b) §17 M4A-EXP-B2 AC(2) Welcome back! queueing, HARD; auto-close / seen-on-show INFO; + PROBE variants (INFO)
  { id: 'WELCOME-preM4', mode: 'welcome', ls: { 'eggfarm.save': PRE } },
  { id: 'PROBE-welcome-hidden-tab', mode: 'welcome', probe: 'hidden', ls: { 'eggfarm.save': PRE } },
  { id: 'PROBE-welcome-settings-overlay', mode: 'welcome', probe: 'settings', ls: { 'eggfarm.save': PRE } },
  // (c) M4A-EXP-B1 AC(1)-(5) regression on the normal show path, HARD
  { id: 'EXPB1-1-unmarked-v6-commit', mode: 'b1', ac: 1, clock: PRE_SAVED + 5000, ls: { 'eggfarm.save': PRE } },
  { id: 'EXPB1-AH-commit-autohide-3-reloads', mode: 'b1', ac: 1, reloads: 3, clock: PRE_SAVED + 5000, ls: { 'eggfarm.save': PRE } }, // -07(a) hard: normal commit -> auto-hide -> reload x3 shows 0
  { id: 'EXPB1-2-committed-unseen-reload', mode: 'b1', ac: 2, ls: EXP1.ls, idbMain: EXP1.idb?.main ?? null },
  { id: 'EXPB1-3-new-m4-farm', mode: 'b1', ac: 3, ls: {} },
  { id: 'EXPB1-4-m4-off', mode: 'na', note: 'M4 on/off is compile-time (balance m4.enabled); not reachable in a dist-qa browser build. Covered by unit: game tests/m4-exp1-explainer.test.ts:64 "M4 off: never shown, and a stored seenTracksExplainer is kept on load and save" (run by m41-7-delta.sh csr9c step).' },
  { id: 'EXPB1-5-deferred-load', mode: 'b1', ac: 5, clock: PRE_SAVED + 5000, idbHang: true, ls: { 'eggfarm.save': PRE } },
  // INFO: M3/fresh
  { id: 'M3-fresh', mode: 'm3', dialog: 'M3', ls: { 'eggfarm.save': raw('MAIN-OQ1-abc.json'), 'eggfarm.save.bak': raw('BAK-invalid-neg1.json'), 'eggfarm.save.v6_backup': raw('V6B-invalid-raw-abc.json') } },
].filter(c => !process.env.ONLY || process.env.ONLY.split(',').some(x => c.id.startsWith(x)));
const FLOWS = ['dismiss-then-reload', 'reload-before-dismiss']; // (5) and (4)
const flowsOf = c => c.mode === 'r06' ? FLOWS : ['single'];
if (DRY) { for (const c of CASES) console.log(`DRY ${c.id}: mode=${c.mode} dialog=${c.dialog ?? '-'} probe=${c.probe ?? '-'} clock=${c.clock ?? 'live'} idbHang=${!!c.idbHang} flows=${flowsOf(c).join(',')} lsKeys=${Object.keys(c.ls ?? {}).join(',')} bytes=${Object.values(c.ls ?? {}).map(v => v.length).join('/')}${c.note ? ' NOTE ' + c.note : ''}`); console.log(`DRY N=${N}ms OK`); process.exit(0); }
if (!['5961', '5962', '5963', '5964'].includes(P)) throw new Error('port must be 5961-5964');
const { chromium } = await import('playwright-core'); const W = path.resolve(W0); fs.mkdirSync(OUT, { recursive: true });
const INIT = ({ ls, idbMain, idbHang }) => {
  const set = Storage.prototype.setItem; const now = () => Math.round(performance.now());
  if (!sessionStorage.getItem('qa.seeded')) { localStorage.clear(); for (const [k, v] of Object.entries(ls)) set.call(localStorage, k, v); sessionStorage.setItem('qa.seeded', '1'); window.__wipeIdb = true; }
  const wipe = () => new Promise(r => { const d = indexedDB.deleteDatabase('eggfarm'); d.onsuccess = d.onerror = d.onblocked = () => r(); });
  const seedIdb = async () => { if (!idbMain) return; const db = await new Promise((res, rej) => { const r = indexedDB.open('eggfarm', 1); r.onupgradeneeded = () => r.result.createObjectStore('save'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    await new Promise(res => { const t = db.transaction('save', 'readwrite'); t.objectStore('save').put(idbMain, 'main'); t.oncomplete = res; }); db.close(); };
  window.__seeded = window.__wipeIdb ? wipe().then(seedIdb) : Promise.resolve();
  if (idbHang) { const f = IDBFactory.prototype, o = f.open; f.open = function (n, v) { if (n === 'eggfarm' && sessionStorage.getItem('qa.idbHang') !== 'off') return {}; return o.call(this, n, v); }; }
  // visibility override (PROBE hidden tab): window.__qaHidden toggles document.visibilityState/hidden; caller dispatches visibilitychange
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.__qaHidden ? 'hidden' : 'visible' });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => !!window.__qaHidden });
  const q = window.__q = { load: +(sessionStorage.getItem('qa.loads') ?? 0) + 1, cardInserts: 0, violations: [], firstCardVisible: null, cardGone: null, seenTrue: { mem: null, ls: null, idb: null }, dismissAt: null, frames: 0, seenCtx: null, modalViolations: [] };
  sessionStorage.setItem('qa.loads', String(q.load));
  Storage.prototype.setItem = function (k, v) { if (this === localStorage && String(k).startsWith('eggfarm.save') && String(v).includes('"seenTracksExplainer":true') && q.seenTrue.ls === null) { q.seenTrue.ls = now(); const ctx = () => { const c = document.querySelector('.tracks-exp'); let hit = null, vis = false; if (c) { const b = c.getBoundingClientRect(); vis = b.width > 0 && b.height > 0; const e = document.elementFromPoint(b.left + b.width / 2, b.top + Math.min(20, b.height / 2)); hit = !!e && c.contains(e); }
      return { t: now(), visibility: document.visibilityState, modalOpen: !!document.querySelector('#modal-layer.open'), recoveryLayer: !!document.querySelector('.recovery-layer'), cardPresent: !!c, cardVisible: vis, cardOnTop: hit }; };
    q.seenCtx = { atWrite: ctx() }; requestAnimationFrame(() => requestAnimationFrame(() => { q.seenCtx.after2Frames = ctx(); })); } return set.call(this, k, v); };
  const put = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function (v, k) { if (k === 'main' && typeof v === 'string' && v.includes('"seenTracksExplainer":true') && q.seenTrue.idb === null) q.seenTrue.idb = now(); return put.call(this, v, k); };
  const state = () => { const card = document.querySelector('.tracks-exp'), layer = document.querySelector('.recovery-layer'), modal = document.querySelector('#modal-layer.open');
    if (card && (layer || modal)) q.violations.push({ t: now(), layer: !!layer, modal: !!modal, notice: layer?.dataset.notice ?? null });
    if (card && modal) q.modalViolations.push(now());
    if (card && !layer && !modal && q.firstCardVisible === null) { const r = card.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && getComputedStyle(card).visibility !== 'hidden') q.firstCardVisible = now(); }
    if (!card && q.firstCardVisible !== null && q.cardGone === null) q.cardGone = now();
    if (q.seenTrue.mem === null && window.eggfarm?.state?.seenTracksExplainer === true) q.seenTrue.mem = now(); };
  new MutationObserver(muts => { for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1 && (n.matches?.('.tracks-exp') || n.querySelector?.('.tracks-exp'))) q.cardInserts++; state(); })
    .observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  const tick = () => { q.frames++; state(); requestAnimationFrame(tick); }; requestAnimationFrame(tick);
};
const lsSeen = p => p.evaluate(() => { const r = localStorage.getItem('eggfarm.save'); try { return r ? (JSON.parse(r).state.seenTracksExplainer ?? null) : 'no-save'; } catch { return 'unparsable'; } });
const idbSeen = p => p.evaluate(() => new Promise(res => { const r = indexedDB.open('eggfarm', 1); r.onupgradeneeded = () => r.result.createObjectStore('save'); r.onsuccess = () => { const g = r.result.transaction('save').objectStore('save').get('main'); g.onsuccess = () => { const v = g.result; r.result.close(); try { res(typeof v === 'string' ? (JSON.parse(v).state.seenTracksExplainer ?? null) : v == null ? 'no-main' : 'nonstring'); } catch { res('unparsable'); } }; }; }));
const memSeen = p => p.evaluate(() => window.eggfarm?.state?.seenTracksExplainer ?? null);
const srv = spawn(`${W}/node_modules/.bin/vite`, ['preview', '--outDir', 'dist-qa', '--port', P, '--strictPort', '--host', '127.0.0.1'], { cwd: W, stdio: 'ignore', detached: true });
const res = { port: P, N, cases: {} }; let fails = 0;
try {
  for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${P}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
  const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const c of CASES) for (const flow of flowsOf(c)) {
    const tag = `${c.id}--${flow}`; const r = (res.cases[tag] = { mode: c.mode, checks: [] });
    // severity: HARD (counts as fail) | INFO (logged, never fails)
    const ok = (n, v, x, hard = true) => { r.checks.push({ n, pass: !!v, x, hard }); if (!v && hard) fails++; console.log(`${v ? 'PASS' : hard ? 'FAIL' : 'INFO'} ${tag}: ${n} ${JSON.stringify(x ?? '').slice(0, 240)}`); };
    if (c.mode === 'na') { console.log(`N/A  ${tag}: ${c.note}`); r.checks.push({ n: 'N/A', pass: null, x: c.note }); continue; }
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); if (c.clock) await ctx.clock.install({ time: c.clock });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    const start = async () => { await p.evaluate(() => window.__seeded); const t = p.getByText('Tap to start'); if (await t.isVisible().catch(() => false)) await t.click(); await p.waitForFunction(() => window.eggfarm, null, { timeout: 15000 }); };
    const Q = () => p.evaluate(() => window.__q);
    const collectWelcome = async (shot) => { const wb = await p.locator('#modal-layer.open #wbCollect').waitFor({ state: 'visible', timeout: 6000 }).then(() => true, () => false);
      if (wb) { await p.waitForTimeout(2000); if (shot) await p.screenshot({ path: `${OUT}/${tag}-${shot}.png` }); await p.locator('#wbCollect').click(); await p.waitForFunction(() => !document.querySelector('#modal-layer.open'), null, { timeout: 5000 }).catch(() => {}); } return wb; };
    try {
      await p.addInitScript(INIT, { ls: c.ls, idbMain: c.idbMain ?? null, idbHang: !!c.idbHang }); await p.goto(`http://127.0.0.1:${P}/`); await start();
      if (!res.buildId) { res.buildId = await p.evaluate(() => document.querySelector('meta[name="build-id"]')?.content ?? null); console.log(`build-id ${res.buildId}`); }
      if (c.mode === 'r06' || c.mode === 'm3') { // ----- (a) D-HOP-22-06 for M1/M2 (HARD); M3/fresh (INFO)
        const hard = c.mode === 'r06';
        const shown = await p.locator('.recovery-layer').waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false);
        ok(`${c.dialog} recovery dialog shown (precondition)`, shown, await p.evaluate(() => document.querySelector('.recovery-layer')?.dataset.notice ?? null));
        await p.waitForTimeout(3000); r.cardUnderDialog = await p.evaluate(() => !!document.querySelector('.tracks-exp'));
        await p.screenshot({ path: `${OUT}/${tag}-1-dialog-open${r.cardUnderDialog ? '-CARD-UNDER' : ''}.png` });
        await p.locator('#rcGo').click().catch(() => {}); await p.waitForFunction(() => !document.querySelector('.recovery-layer'), null, { timeout: 5000 }).catch(() => {});
        r.welcome = await collectWelcome('2-welcome-open');
        if (c.mode === 'm3') { await p.waitForTimeout(4000); const q = await Q(); ok('M3/fresh: no card under the dialog', q.violations.length === 0, q.violations[0], false); ok('M3/fresh: 0 cards (fresh M4 farm)', q.cardInserts === 0, q.cardInserts, false); }
        else {
          const cardNow = await p.waitForSelector('.tracks-exp', { timeout: 8000 }).then(() => true, () => false); await p.waitForTimeout(200); let q = await Q();
          ok('(1) never under the recovery dialog / Welcome back (every frame)', q.violations.length === 0, { violations: q.violations.length, first: q.violations[0], frames: q.frames });
          ok('card shown after the dialog closed', cardNow && q.firstCardVisible !== null, { inserts: q.cardInserts, firstVisible: q.firstCardVisible });
          await p.screenshot({ path: `${OUT}/${tag}-3-card.png` });
          // -07(a) (spec 2fbcd4eb:28, tracks-explainer.ts:32-33,59,69): on M1/M2 restore boots the 8 s timer starts when the card appears;
          // if it auto-hides without a click, seen stays false and reload shows it again (reload-before-dismiss flow). In dismiss-then-reload,
          // check the card is still up at 3 s (< EXP_MS 8 s) with seen false, then dismiss it and check seen=true + reload 0.
          if (flow === 'reload-before-dismiss') {
            await p.waitForTimeout(N); const gone = await p.evaluate(() => !document.querySelector('.tracks-exp'));
            q = await Q(); const dt = q.cardGone !== null && q.firstCardVisible !== null ? q.cardGone - q.firstCardVisible : null;
            ok('-07(a): 8 s timer started when the card appeared (auto-hid at ~8 s after appear, not while under the dialog)', gone && dt !== null && dt >= 7500 && dt <= 9000, { dt, firstVisible: q.firstCardVisible, cardGone: q.cardGone });
            const pre = { mem: await memSeen(p), ls: await lsSeen(p), idb: await idbSeen(p), seenTrueAt: q.seenTrue }; r.seenAfterAutoHide = pre;
            ok('-07(a) (3): after the 8 s auto-hide (no dismiss click), seen is STILL false in mem, LS and IDB (auto-hide does NOT count on M1/M2)', pre.mem !== true && pre.ls !== true && pre.idb !== true && Object.values(q.seenTrue).every(v => v === null), pre);
            ok('exactly 1 card inserted this load (never re-shown in the same session)', q.cardInserts === 1, q.cardInserts);
            await p.reload(); await start(); const again = await p.waitForSelector('.tracks-exp', { timeout: 8000 }).then(() => true, () => false);
            q = await Q(); ok('(4) reload after auto-hide (no player dismissal) shows the card again', again && q.cardInserts === 1, { again, inserts: q.cardInserts, load: q.load });
            ok('(1) after reload: never under a dialog/modal', q.violations.length === 0, q.violations[0]); await p.screenshot({ path: `${OUT}/${tag}-4-reload-card-again.png` });
          } else {
            await p.waitForTimeout(3000); const still = await p.evaluate(() => { const e = document.querySelector('.tracks-exp'); return !!e && e.getBoundingClientRect().height > 0; });
            q = await Q(); ok('(2) card still visible 3 s after it appeared (< 8 s EXP_MS)', still && q.cardGone === null, { still, cardGone: q.cardGone });
            const pre = { mem: await memSeen(p), ls: await lsSeen(p), idb: await idbSeen(p), seenTrueAt: q.seenTrue }; r.seenBeforeDismiss = pre;
            ok('(3) seen still false in mem, LS and IDB before the dismiss click', pre.mem !== true && pre.ls !== true && pre.idb !== true && Object.values(q.seenTrue).every(v => v === null), pre);
            ok('exactly 1 card inserted this load', q.cardInserts === 1, q.cardInserts);
            await p.evaluate(() => { window.__q.dismissAt = Math.round(performance.now()); });
            const present = await p.locator('.tracks-exp').count(); ok('card still present for the player to dismiss', present > 0, { present });
            if (present) { await p.locator('.tracks-exp button').first().click({ timeout: 5000 }).catch(() => p.locator('.tracks-exp').click({ timeout: 5000 })); }
            await p.waitForFunction(() => !document.querySelector('.tracks-exp'), null, { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(800);
            q = await Q(); const post = { mem: await memSeen(p), ls: await lsSeen(p), idb: await idbSeen(p) }; r.seenAfterDismiss = { ...post, seenTrueAt: q.seenTrue, dismissAt: q.dismissAt };
            ok('(3) seen=true written only AFTER the dismiss click (mem/LS timestamps >= click)', [q.seenTrue.mem, q.seenTrue.ls].every(t => t !== null && t >= q.dismissAt) && (q.seenTrue.idb === null || q.seenTrue.idb >= q.dismissAt), r.seenAfterDismiss);
            ok('after dismiss: seen=true in mem and LS', post.mem === true && post.ls === true, post);
            await p.waitForTimeout(5500); ok('after dismiss + autosave: seen=true in IDB main', (await idbSeen(p)) === true, await idbSeen(p));
            await p.reload(); await start(); await p.waitForTimeout(4000); q = await Q();
            if (present) ok('(5) after dismissal, a reload shows 0 cards', q.cardInserts === 0, { inserts: q.cardInserts, load: q.load });
            else { console.log(`N/E  ${tag}: (5) not evaluable: the card was gone before any player dismissal (reload inserts=${q.cardInserts})`); r.checks.push({ n: '(5)', pass: null, x: 'not evaluable: no player dismissal' }); }
            await p.screenshot({ path: `${OUT}/${tag}-5-reload-none.png` });
          }
        }
      } else if (c.mode === 'welcome') { // ----- (b) §17 M4A-EXP-B2 AC(2), HARD; as-built behaviour + probe INFO
        const wbShown = await p.locator('#modal-layer.open #wbCollect').waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false);
        ok("'Welcome back!' modal appeared (precondition)", wbShown, wbShown);
        await p.waitForTimeout(2500); await p.screenshot({ path: `${OUT}/${tag}-1-welcome-open.png` });
        let q = await Q(); r.seenWhileModal = { mem: await memSeen(p), ls: await lsSeen(p) };
        ok(`${c.probe ? 'PROBE' : '-07(a)'}: seen not set while the Welcome back! modal is open (no card under it)`, r.seenWhileModal.mem !== true && r.seenWhileModal.ls !== true, r.seenWhileModal, !c.probe);
        if (c.probe === 'hidden') { // collect, then the tab goes hidden in the same frame; visible again after 3 s
          await p.evaluate(() => { document.querySelector('#wbCollect').click(); window.__qaHidden = true; document.dispatchEvent(new Event('visibilitychange')); });
          await p.waitForTimeout(3000); q = await Q(); r.whileHidden = { cards: q.cardInserts, seenTrue: q.seenTrue, seenCtx: q.seenCtx, mem: await memSeen(p), ls: await lsSeen(p) };
          ok('PROBE hidden tab: no card and seen not set while hidden', r.whileHidden.cards === 0 && r.whileHidden.mem !== true && r.whileHidden.ls !== true, r.whileHidden, false);
          await p.evaluate(() => { window.__qaHidden = false; document.dispatchEvent(new Event('visibilitychange')); });
        } else if (c.probe === 'settings') { // collect, then open Settings immediately (another overlay)
          await p.evaluate(() => { document.querySelector('#wbCollect').click(); }); await p.waitForTimeout(50); await p.locator('#settings').click({ timeout: 3000 }).catch(() => {});
          await p.waitForTimeout(3000); q = await Q(); r.whileSettings = { settingsOpen: await p.evaluate(() => !!document.querySelector('#modal-layer.open [aria-label=Settings]')), cards: q.cardInserts, seenCtx: q.seenCtx, mem: await memSeen(p), ls: await lsSeen(p) };
          await p.screenshot({ path: `${OUT}/${tag}-2-settings-open.png` });
          ok('PROBE settings overlay: no card and seen not set while Settings is open', !(r.whileSettings.settingsOpen && (r.whileSettings.cards > 0 || r.whileSettings.mem === true || r.whileSettings.ls === true)), r.whileSettings, false);
          await p.keyboard.press('Escape').catch(() => {}); await p.locator('#modal-layer.open button:has-text("Close"), #modal-layer.open .close').first().click({ timeout: 1500 }).catch(() => {});
        } else { await p.locator('#wbCollect').click(); }
        await p.waitForFunction(() => !document.querySelector('#modal-layer.open'), null, { timeout: 8000 }).catch(() => {});
        const card = await p.waitForSelector('.tracks-exp', { timeout: 8000 }).then(() => true, () => false); await p.waitForTimeout(300); q = await Q();
        ok('(b) §17 B2: no card while #modal-layer is open (every frame)', q.modalViolations.length === 0, { frames: q.modalViolations.length, first: q.modalViolations[0] }, !c.probe);
        ok('(b) card shown after the modal closed, exactly once', card && q.cardInserts === 1, { card, inserts: q.cardInserts }, !c.probe);
        await p.screenshot({ path: `${OUT}/${tag}-3-card.png` });
        r.seenCtx = q.seenCtx; const sc = q.seenCtx;
        ok('PROBE: at the seen=true write the tab was visible, no modal/recovery layer (as built, the card is built right after)', !!sc && sc.atWrite.visibility === 'visible' && !sc.atWrite.modalOpen && !sc.atWrite.recoveryLayer, sc?.atWrite ?? null, false);
        ok('PROBE: 2 frames after the seen=true write the card is present, visible and on top (elementFromPoint)', !!sc?.after2Frames && sc.after2Frames.cardPresent && sc.after2Frames.cardVisible && sc.after2Frames.cardOnTop, sc?.after2Frames ?? null, false);
        await p.waitForTimeout(9000); q = await Q();
        const H07 = !c.probe; const tag07 = H07 ? '-07(a) HARD' : 'PROBE INFO';
        ok(`${tag07} (§17 B5): card auto-closed by the 8 s timer, no dismiss click`, q.cardGone !== null && q.dismissAt === null, { cardGone: q.cardGone, firstVisible: q.firstCardVisible, dismissAt: q.dismissAt }, H07);
        ok(`${tag07} (§17 B10): seen set on show (LS write <= first visible + 50 ms)`, q.seenTrue.ls !== null && q.firstCardVisible !== null && q.seenTrue.ls <= q.firstCardVisible + 50, { seenTrue: q.seenTrue, firstVisible: q.firstCardVisible }, H07);
        const wAfter = { mem: await memSeen(p), ls: await lsSeen(p) }; ok(`${tag07}: after auto-hide seen=true in mem and LS (auto-hide counts)`, wAfter.mem === true && wAfter.ls === true, wAfter, H07);
        await p.waitForTimeout(5500); const wIdb = await idbSeen(p); ok('INFO: seen=true in IDB main after autosave', wIdb === true, wIdb, false); r.welcomeSeen = { ...wAfter, idb: wIdb };
        r.reloadInserts = []; for (let k = 1; k <= (H07 ? 3 : 1); k++) { await p.reload(); await start(); await p.waitForTimeout(4000); q = await Q(); r.reloadInserts.push(q.cardInserts);
          ok(`${tag07}: reload ${k} shows 0 cards`, q.cardInserts === 0, q.cardInserts, H07); }
      } else if (c.mode === 'b1') { // ----- (c) M4A-EXP-B1 AC(1)-(5) regression, HARD
        const wb = await collectWelcome('0-welcome'); r.welcome = wb;
        if (c.ac === 1 || c.ac === 2) {
          if (c.ac === 1) ok('B1 precondition: no Welcome back! (clock pinned, normal show path)', !wb, wb);
          const card = await p.waitForSelector('.tracks-exp', { timeout: 10000 }).then(() => true, () => false); await p.waitForTimeout(300); let q = await Q();
          r.flags = await p.evaluate(() => ({ tracksV7: window.eggfarm.state.tracksV7, seen: window.eggfarm.state.seenTracksExplainer }));
          ok(`B1 AC(${c.ac}): card ${c.ac === 1 ? 'appears at the in-session commit' : 'shown on the load after an unshown commit'}, once`, card && q.cardInserts === 1 && r.flags.tracksV7 === 1, { card, inserts: q.cardInserts, flags: r.flags });
          ok(`B1 AC(${c.ac}): never under a modal/dialog`, q.violations.length === 0, q.violations[0]);
          await p.screenshot({ path: `${OUT}/${tag}-1-card.png` }); await p.waitForTimeout(9000); q = await Q();
          // -07(a) HARD: the normal (commit / reload-fallback) path keeps §17 as built: the 8 s auto-hide counts, seen set at show
          ok(`-07(a) B1 AC(${c.ac}): auto-hide closed the card with no dismiss click`, q.cardGone !== null && q.dismissAt === null, { cardGone: q.cardGone, firstVisible: q.firstCardVisible });
          ok(`-07(a) B1 AC(${c.ac}): seen set at show (LS write <= first visible + 50 ms)`, q.seenTrue.ls !== null && q.firstCardVisible !== null && q.seenTrue.ls <= q.firstCardVisible + 50, { seenTrue: q.seenTrue, firstVisible: q.firstCardVisible });
          const sAH = { mem: await memSeen(p), ls: await lsSeen(p) }; ok(`-07(a) B1 AC(${c.ac}): seen=true in mem and LS after auto-hide (no dismiss)`, sAH.mem === true && sAH.ls === true, sAH);
          await p.waitForTimeout(5500); sAH.idb = await idbSeen(p); ok(`B1 AC(${c.ac}): seen=true in IDB main after autosave`, sAH.idb === true, sAH.idb, false); r.seenAfterAutoHide = sAH;
          r.reloadInserts = []; for (let k = 1; k <= (c.reloads ?? 1); k++) { await p.reload(); await start(); await p.waitForTimeout(4000); q = await Q(); r.reloadInserts.push(q.cardInserts);
            ok(`B1 AC(${c.ac}): reload ${k} -> not shown`, q.cardInserts === 0, q.cardInserts); }
        } else if (c.ac === 3) {
          await p.waitForTimeout(4000); let q = await Q(); const n1 = q.cardInserts; await p.reload(); await start(); await p.waitForTimeout(4000); q = await Q();
          ok('B1 AC(3): new M4 farm -> never shown, on any load (2 loads)', n1 === 0 && q.cardInserts === 0, { load1: n1, load2: q.cardInserts });
          ok('B1 AC(3): seen not set on a new farm', (await lsSeen(p)) !== true, await lsSeen(p));
        } else if (c.ac === 5) {
          await p.waitForTimeout(5000); const q = await Q(); r.flags = await p.evaluate(() => ({ tracksV7: window.eggfarm.state.tracksV7 ?? null, pending: window.eggfarm.tracksMigrationPending ?? null }));
          ok('B1 AC(5) precondition: migration deferred (IDB unknown), tracksV7 not committed', r.flags.tracksV7 !== 1, r.flags);
          ok('B1 AC(5): deferred load -> not shown', q.cardInserts === 0, q.cardInserts); ok('B1 AC(5): seen not set', (await lsSeen(p)) !== true, await lsSeen(p));
          await p.screenshot({ path: `${OUT}/${tag}-1.png` });
        }
      }
      ok('no page errors', errs.length === 0, errs.slice(0, 2));
    } catch (e) { ok('no exception', false, String(e).slice(0, 300)); await p.screenshot({ path: `${OUT}/${tag}-EXC.png` }).catch(() => {}); }
    await ctx.close();
  }
  await br.close();
} finally { try { process.kill(-srv.pid); } catch { /* gone */ } }
const want = SHA7 ? new RegExp(`^(m3-rc1-pre|m4\\.1)\\+${SHA7}$`) : /^(m3-rc1-pre|m4\.1)\+[0-9a-f]{7}$/; if (!want.test(res.buildId ?? '')) { fails++; console.log(`FAIL runtime build-id ${res.buildId} (want +${SHA7}, no +dirty)`); }
res.fails = fails; fs.writeFileSync(`${OUT}/result.json`, JSON.stringify(res, null, 1)); console.log(`CSR9C_EXPLAINER ${fails ? 'FAIL' : 'PASS'} fails=${fails} build=${res.buildId}`); process.exit(fails ? 1 : 0);
