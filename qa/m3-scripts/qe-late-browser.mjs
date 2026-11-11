// QE-LATE-e real-browser gate (qe-late-e spec v0.3 c6a37023, QEL-12 i–iii + QEL-13). v2 (M41-6 intake 1682a0c); v1 backed up in qa/scratch/.
// usage: node qe-late-browser.mjs <worktree> <engine> <port 5961|5962> <outdir> [expectSha7]
// Serves <worktree>/dist-qa (vite preview, strictPort). Each scenario runs in a fresh context. "Welcome back!" (old fixtures)
// must appear and be CLOSED (Collect) before the card is counted, so no case passes vacuously. Cards are counted with a
// MutationObserver across the whole tab session (sessionStorage), not by sampling.
import { chromium, firefox, webkit } from 'playwright-core'; import { spawn } from 'node:child_process'; import { readFileSync, writeFileSync } from 'node:fs';
const [W, E = 'chromium', P = '5961', OUT, SHA7 = ''] = process.argv.slice(2);
if (!['5961', '5962'].includes(P)) throw new Error('port must be 5961 or 5962');
const G4 = '/workspace/egg-farm-studio/qa/m3-recheck/gate4-fixtures';
const EXP1 = JSON.parse(readFileSync(`${G4}/EXP1-committed-unseen-4ccb9fd.json`, 'utf8')).ls;
const PRE = { 'eggfarm.save': readFileSync(`${G4}/pre-v7-F30-C30-732e70e.json`, 'utf8').trim() };
const srv = spawn(`${W}/node_modules/.bin/vite`, ['preview', '--outDir', 'dist-qa', '--port', P, '--strictPort', '--host', '127.0.0.1'], { cwd: W, stdio: 'ignore', detached: true });
const res = { engine: E, port: P, scenarios: {}, checks: [] }; let fails = 0;
const ok = (name, cond, val) => { res.checks.push({ name, pass: !!cond, val }); if (!cond) fails++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(val ?? '')}`); };
const br = await { chromium, firefox, webkit }[E].launch(E === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {});
for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${P}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
// init: seed LS once per tab; card counter; visibility override; optional faults (phase in sessionStorage: 'e' = LS quota on the
// first seen=true write then every eggfarm.save* write + IndexedDB put aborts (async, like prod), 'free' = no faults).
const INIT = ({ ls, faults }) => {
  if (!sessionStorage.getItem('qa.seeded')) { localStorage.clear(); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v); sessionStorage.setItem('qa.seeded', '1'); sessionStorage.setItem('qa.phase', faults); sessionStorage.setItem('qa.cards', '0'); sessionStorage.setItem('qa.idbPutsSeenTrue', '0'); }
  window.__vis = 'visible';
  for (const k of ['visibilityState', 'hidden']) Object.defineProperty(Document.prototype, k, { configurable: true, get() { return k === 'hidden' ? window.__vis === 'hidden' : window.__vis; } });
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList?.contains('tracks-exp')) sessionStorage.setItem('qa.cards', String(+sessionStorage.getItem('qa.cards') + 1)); })
    .observe(document, { childList: true, subtree: true });
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (v, k) { if (typeof v === 'string' && v.includes('"seenTracksExplainer":true')) sessionStorage.setItem('qa.idbPutsSeenTrue', String(+sessionStorage.getItem('qa.idbPutsSeenTrue') + 1));
    if (window.__idbFail && window.__acceptOne) { window.__acceptOne = false; return put.call(this, v, k); }
    if (window.__idbFail) throw new DOMException('qa: mirror refuses writes', 'QuotaExceededError'); return put.call(this, v, k); };
  const ph = sessionStorage.getItem('qa.phase'); if (ph === 'e' || ph === 'e1') { const set = Storage.prototype.setItem; window.__tripped = false;
    Storage.prototype.setItem = function (k, v) { if (this === localStorage && String(k).startsWith('eggfarm.save') && (window.__tripped || String(v).includes('"seenTracksExplainer":true'))) { if (!window.__tripped && ph === 'e1') window.__acceptOne = true; window.__tripped = true; window.__idbFail = true; throw new DOMException('quota', 'QuotaExceededError'); } return set.call(this, k, v); }; }
};
const url = `http://127.0.0.1:${P}/`;
const start = async p => { await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm); };
const cards = p => p.evaluate(() => +sessionStorage.getItem('qa.cards'));
const lsSeen = p => p.evaluate(() => { const r = localStorage.getItem('eggfarm.save'); return r ? (JSON.parse(r).state.seenTracksExplainer ?? null) : 'no-save'; });
const idbMain = p => p.evaluate(() => new Promise(res => { const r = indexedDB.open('eggfarm', 1); r.onsuccess = () => { try { const g = r.result.transaction('save', 'readonly').objectStore('save').get('main'); g.onsuccess = () => { const v = g.result; res(typeof v === 'string' ? { seen: JSON.parse(v).state.seenTracksExplainer ?? null, seq: JSON.parse(v).saveSeq ?? null, sha: null } : null); }; g.onerror = () => res('err'); } catch (e) { res('err:' + e.message); } }; r.onerror = () => res('open-err'); }));
const lsSeq = p => p.evaluate(() => { const r = localStorage.getItem('eggfarm.save'); return r ? JSON.parse(r).saveSeq ?? null : null; });
async function welcome(p, tag, sc) { // the offline modal must appear; screenshot; close via Collect; must be closed
  const shown = await p.locator('#modal-layer.open #wbCollect').waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false);
  sc.welcomeShown = shown; sc.cardsWhileModal = await cards(p); await p.screenshot({ path: `${OUT}/${tag}-1-welcome-open.png` });
  if (shown) { await p.locator('#wbCollect').click(); await p.waitForFunction(() => !document.querySelector('#modal-layer.open'), null, { timeout: 5000 }).catch(() => {}); }
  sc.welcomeClosed = await p.evaluate(() => !document.querySelector('#modal-layer.open')); await p.screenshot({ path: `${OUT}/${tag}-2-welcome-closed.png` });
  ok(`${tag}: 'Welcome back!' modal appeared`, shown); ok(`${tag}: modal closed`, sc.welcomeClosed); ok(`${tag}: no card while the modal was open`, sc.cardsWhileModal === 0, sc.cardsWhileModal);
}
async function scenario(tag, ls, faults, body) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(INIT, { ls, faults }); const sc = (res.scenarios[tag] = {});
  try { await p.goto(url); await start(p);
    if (!res.buildId) { res.buildId = await p.evaluate(() => ({ meta: document.querySelector('meta[name="build-id"]')?.content, app: document.getElementById('app')?.dataset.buildId, tele: (() => { try { const t = JSON.parse(window.eggfarmExportTelemetry()); const ev = (t.events ?? t.queue ?? []).filter(e => (e.name ?? e.type ?? e.event) === 'session_start').at(-1); return ev?.props?.build ?? ev?.build ?? ev?.data?.build ?? null; } catch { return 'n/a'; } })() })); }
    await body(p, sc); } catch (e) { ok(`${tag}: no exception`, false, String(e).slice(0, 300)); }
  const real = errs.filter(m => !m.startsWith('qa: mirror refuses writes')); sc.pageErrors = errs; sc.injectedIdbAborts = errs.length - real.length; ok(`${tag}: no page errors (injected IDB aborts excluded: ${errs.length - real.length})`, real.length === 0, real); await ctx.close();
}
const waitCard = (p, ms = 4000) => p.waitForSelector('.tracks-exp', { timeout: ms }).then(() => true, () => false);
try {
  // QEL-12 (i): variant e. e = mirror refuses every write after the LS trip; e1 = mirror accepts the FIRST write after the trip
  // (on dd223f5 that is the flag save's seen=true fallback = the spec §1.2 repro), then refuses the rest. LS fails on the flag write, mirror refuses writes from then on, tab dies, quota frees, reload.
  for (const [tag, ph] of [['qel12-i-variant-e', 'e'], ['qel12-i-variant-e1-mirror-accepts-first', 'e1']]) await scenario(tag, EXP1, ph, async (p, sc) => {
    await welcome(p, tag, sc); await p.waitForTimeout(3500);
    sc.during = await p.evaluate(() => ({ tripped: !!window.__tripped, storageFailed: window.eggfarm.storageFailed, mem: !!window.eggfarm.state.seenTracksExplainer, card: !!document.querySelector('.tracks-exp') }));
    sc.cardsDuring = await cards(p); sc.lsSeenAtDeath = await lsSeen(p); sc.lsSeqAtDeath = await lsSeq(p); sc.idbAtDeath = await idbMain(p); sc.idbPutsSeenTrue = await p.evaluate(() => +sessionStorage.getItem('qa.idbPutsSeenTrue'));
    await p.screenshot({ path: `${OUT}/${tag}-3-during-quota.png` });
    ok(`${ph}: quota tripped by the flag write`, sc.during.tripped && sc.during.storageFailed, sc.during); ok(`${ph}: 0 cards while quota fails`, sc.cardsDuring === 0 && !sc.during.card, sc.cardsDuring);
    ok(`${ph}: seen flag reverted in memory`, sc.during.mem === false); ok(`${ph}: LS at death seen=false/absent`, sc.lsSeenAtDeath === null || sc.lsSeenAtDeath === false, sc.lsSeenAtDeath);
    ok(`${ph}: IDB at death seen=false/absent`, sc.idbAtDeath && sc.idbAtDeath.seen !== true, sc.idbAtDeath); ok(`${ph}: zero IDB puts carrying seen=true`, sc.idbPutsSeenTrue === 0, sc.idbPutsSeenTrue);
    await p.evaluate(() => sessionStorage.setItem('qa.phase', 'free')); // tab dies (no successful write possible) -> quota frees
    await p.reload(); await start(p); sc.reload1Card = await waitCard(p); await p.waitForTimeout(1500); sc.cardsAfterReload1 = await cards(p);
    sc.reload1Modal = await p.evaluate(() => !!document.querySelector('#modal-layer.open')); await p.screenshot({ path: `${OUT}/${tag}-4-reload1-card.png` });
    sc.lsSeenAfterReload1 = await lsSeen(p); sc.idbAfterReload1 = await idbMain(p);
    ok(`${ph}: reload1 shows the card`, sc.reload1Card); ok(`${ph}: exactly 1 card after reload1`, sc.cardsAfterReload1 === 1, sc.cardsAfterReload1); ok(`${ph}: flag confirmed in LS after the card`, sc.lsSeenAfterReload1 === true, sc.lsSeenAfterReload1);
    await p.reload(); await start(p); await p.waitForTimeout(3500); sc.total = await cards(p); await p.screenshot({ path: `${OUT}/${tag}-5-reload2-none.png` });
    ok(`${ph}: exactly once overall (session + 2 reloads)`, sc.total === 1, sc.total);
  });
  // QEL-12 (iii): hidden tab at the trigger point (the modal's close is the trigger: the explainer waits for it).
  await scenario('qel12-iii-hidden', EXP1, 'free', async (p, sc) => {
    const shown = await p.locator('#modal-layer.open #wbCollect').waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false);
    sc.welcomeShown = shown; await p.screenshot({ path: `${OUT}/qel12-iii-hidden-1-welcome-open.png` }); ok("iii: 'Welcome back!' modal appeared", shown);
    await p.evaluate(() => { window.__vis = 'hidden'; document.dispatchEvent(new Event('visibilitychange')); });
    sc.canPersistHidden = await p.evaluate(() => window.eggfarm.canPersist);
    await p.locator('#wbCollect').click(); sc.welcomeClosed = await p.evaluate(() => !document.querySelector('#modal-layer.open'));
    await p.screenshot({ path: `${OUT}/qel12-iii-hidden-2-welcome-closed.png` }); ok('iii: modal closed (while hidden)', sc.welcomeClosed);
    await p.waitForTimeout(4000);
    sc.hidden = { cards: await cards(p), mem: await p.evaluate(() => !!window.eggfarm.state.seenTracksExplainer), ls: await lsSeen(p), idb: await idbMain(p) };
    await p.screenshot({ path: `${OUT}/qel12-iii-hidden-3-hidden-no-card.png` });
    ok('iii: canPersist false while hidden', sc.canPersistHidden === false, sc.canPersistHidden); ok('iii: no card while hidden', sc.hidden.cards === 0, sc.hidden.cards);
    ok('iii: no flag while hidden (memory, LS, IDB)', !sc.hidden.mem && sc.hidden.ls !== true && sc.hidden.idb?.seen !== true, sc.hidden);
    await p.evaluate(() => { window.__vis = 'visible'; document.dispatchEvent(new Event('visibilitychange')); });
    sc.cardOnVisible = await waitCard(p); await p.waitForTimeout(1500); sc.cardsVisible = await cards(p); sc.lsAfterVisible = await lsSeen(p);
    await p.screenshot({ path: `${OUT}/qel12-iii-hidden-4-visible-card.png` });
    ok('iii: card shows once when visible', sc.cardOnVisible && sc.cardsVisible === 1, sc.cardsVisible); ok('iii: flag persisted after showing', sc.lsAfterVisible === true, sc.lsAfterVisible);
    await p.reload(); await start(p); await p.waitForTimeout(3500); sc.total = await cards(p); ok('iii: never again on reload (total 1)', sc.total === 1, sc.total);
  });
  // QEL-13: working LS + IDB. EXP1 (committed, unseen) and a pre-v7 save that commits in session: card exactly once, never again.
  for (const [tag, ls] of [['qel13-exp1', EXP1], ['qel13-pre-v7-commit', PRE]]) await scenario(tag, ls, 'free', async (p, sc) => {
    await welcome(p, tag, sc); sc.card = await waitCard(p, 8000); await p.waitForTimeout(1500); sc.cards = await cards(p); sc.ls = await lsSeen(p); sc.idb = await idbMain(p);
    sc.flags = await p.evaluate(() => ({ canPersist: window.eggfarm.canPersist, newerSave: window.eggfarm.newerSave, storageFailed: window.eggfarm.storageFailed, tracksV7: window.eggfarm.state.tracksV7 }));
    await p.screenshot({ path: `${OUT}/${tag}-3-card.png` });
    ok(`${tag}: card exactly once after closing the modal`, sc.card && sc.cards === 1, sc.cards); ok(`${tag}: flag in LS`, sc.ls === true, sc.ls);
    ok(`${tag}: no false newer/hidden/storage reading`, sc.flags.newerSave === null && sc.flags.storageFailed === false, sc.flags);
    await p.reload(); await start(p); await p.waitForTimeout(3500); sc.total = await cards(p); sc.idbAfter = await idbMain(p); ok(`${tag}: never again (total 1)`, sc.total === 1, sc.total);
    ok(`${tag}: IDB main carries seen=true after the confirmed write`, sc.idbAfter?.seen === true, sc.idbAfter);
  });
  // EXP-b no-regression: a fresh M4 farm (no save) never shows the card and never sets the flag.
  await scenario('fresh-no-save', {}, 'free', async (p, sc) => { await p.waitForTimeout(4000); sc.cards = await cards(p); sc.ls = await lsSeen(p); await p.screenshot({ path: `${OUT}/fresh-no-save.png` });
    ok('fresh: 0 cards, flag not set (EXP-b)', sc.cards === 0 && sc.ls !== true, sc); });
} finally { await br.close(); try { process.kill(-srv.pid); } catch {} }
const bid = res.buildId ?? {}; const want = SHA7 ? new RegExp(`^(m3-rc1-pre|m4\\.1)\\+${SHA7}$`) : /^(m3-rc1-pre|m4\.1)\+[0-9a-f]{7}$/;
ok('runtime build-id meta == #app == expected, not dirty', want.test(bid.meta ?? '') && bid.meta === bid.app, bid);
res.fails = fails; writeFileSync(`${OUT}/qe-late-browser-${E}.json`, JSON.stringify(res, null, 1));
console.log(`QE_LATE_BROWSER ${E} ${fails === 0 ? 'PASS' : 'FAIL'} checks=${res.checks.length} fails=${fails} buildId=${JSON.stringify(bid)}`); process.exit(fails ? 1 : 0);
