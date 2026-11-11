// B-2 rule D @192f273. node qa-b2d.mjs <engine> <port> <outdir> <part: geo|state>
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const pw = createRequire(process.cwd() + '/package.json')('playwright-core');
const [ENG, PORT, OUT, PART] = process.argv.slice(2); if (+PORT === 4173) process.exit(3);
const srv = spawn('npx', ['vite','preview','--outDir','dist-qa','--port',PORT,'--strictPort','--host','127.0.0.1'], { stdio:'ignore', detached:true });
const kill = () => { try { process.kill(-srv.pid,'SIGTERM'); } catch {} }; process.on('exit', kill);
for (let i = 0; i < 240; i++) { try { await fetch(`http://127.0.0.1:${PORT}/`); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
{ const h = await (await fetch(`http://127.0.0.1:${PORT}/`)).text(); const j = h.match(/assets\/index-[^"]+\.js/)[0]; const bb = await (await fetch(`http://127.0.0.1:${PORT}/` + j)).text(); const id = (bb.match(/m\d+-rc[\w-]*\+[0-9a-f]{7}/) || [])[0]; console.log('served build', id); if (id !== 'm3-rc1-pre+192f273') { console.log('BUILD MISMATCH'); kill(); process.exit(2); } }
const br = await pw[ENG].launch(ENG === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {});
// strict "shown": rect w/h > 0, opacity > 0, visibility != hidden, display chain visible (checkVisibility). offsetParent is always null for position:fixed .coach, so it is replaced by checkVisibility().
const SNAP = () => { const R = e => { const b = e.getBoundingClientRect(); return { l: +b.left.toFixed(1), t: +b.top.toFixed(1), r: +b.right.toFixed(1), b: +b.bottom.toFixed(1) }; };
  const ov = (a, c) => !!(a && c && Math.min(a.r,c.r) > Math.max(a.l,c.l) && Math.min(a.b,c.b) > Math.max(a.t,c.t));
  const shown = c => { const b = c.getBoundingClientRect(), cs = getComputedStyle(c); return b.width > 0 && b.height > 0 && +cs.opacity > 0 && cs.visibility !== 'hidden' && (c.checkVisibility ? c.checkVisibility() : true); };
  const tabs = [...document.querySelectorAll('[role=tablist]')].filter(t => t.getBoundingClientRect().height).map(R);
  const row = document.querySelector('#uRow [data-w=market_hand]'); const rr = row && row.getBoundingClientRect().height ? R(row) : null;
  const nav = document.querySelector('nav'); const nr = nav && nav.getBoundingClientRect().height ? R(nav) : null;
  const T = document.querySelector('.toast'); const tcs = T && getComputedStyle(T); const tr = T && T.getBoundingClientRect().height && +tcs.opacity > 0.05 && tcs.visibility !== 'hidden' ? R(T) : null;
  const body = document.querySelector('#uRow')?.closest('.body'); const br_ = body ? R(body) : null;
  const tipTab = tabs.find(t => rr && t.b <= rr.t + 200 && t.t <= (rr?.t ?? 0)) || tabs[0] || null;
  const tips = [...document.querySelectorAll('.coach')].filter(shown).map(c => { const b = R(c); return { txt: c.textContent.slice(0, 28), ...b,
    gap: rr ? +(b.t - rr.b).toFixed(1) : null, rowBelowTabs: rr && tipTab ? rr.t >= tipTab.b - 0.5 : null, rowInBody: rr && br_ ? rr.t >= br_.t - 0.5 && rr.b <= br_.b + 0.5 : null,
    ovTab: tabs.some(t => ov(b, t)), ovNav: ov(b, nr), ovToast: ov(b, tr), inVp: b.t >= 0 && b.l >= 0 && b.b <= innerHeight && b.r <= innerWidth,
    workersTab: !!document.querySelector('[data-tab=workers].active') }; });
  return { tips, scrollTop: body ? Math.round(body.scrollTop) : null }; };
const ui = p => p.evaluate(() => JSON.parse(localStorage.getItem('eggfarm.ui') || '{}'));
const openWorkers = async p => { await p.evaluate(() => { const n = document.querySelector('[data-nav=upgrades]'); if (n && n.getBoundingClientRect().height && !document.querySelector('[data-tab=workers].active, .sheet:not([hidden]) #uRow')) n.click(); }); await p.waitForTimeout(150); await p.evaluate(() => document.querySelector('[data-tab=workers]').click()); };
const leaveWorkers = async p => { await p.evaluate(() => { const c = document.querySelector('.sheet:not([hidden]) .close'); if (c && c.getBoundingClientRect().height) c.click(); else document.querySelector('[data-tab=farm]').click(); }); };
const start = async (w, h, flags) => { const ctx = await br.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(f => { if (!sessionStorage.qa) { localStorage.setItem('eggfarm.ui', JSON.stringify(f)); sessionStorage.qa = 1; } }, flags);
  await p.goto(`http://127.0.0.1:${PORT}/`, { timeout: 90000 }); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm && window.eggfarm.state, null, { timeout: 30000 }); await p.waitForTimeout(600);
  await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 6, coinsCents: 5e6 }; }); return { ctx, p, errs }; };
const sample = async (p, ms) => { const S = []; const t0 = Date.now(); while (Date.now() - t0 < ms) { S.push({ ms: Date.now() - t0, ...(await p.evaluate(SNAP)) }); await p.waitForTimeout(100); } return S; };
const sizes = [[1280,800],[1280,720],[1280,600],[1024,474],[390,640],[360,740]]; let fails = 0; const res = {};
const log = (ok, key, info) => { if (!ok) fails++; res[key] = { ok, ...info }; console.log(`${ok ? 'PASS' : 'FAIL'} [${ENG}] ${key} ${JSON.stringify(info).slice(0, 700)}`); };
if (PART === 'geo') for (const mode of ['viaHireTip', 'direct']) for (const [w, h] of sizes) {
  const key = `${mode}-${w}x${h}`; const { ctx, p, errs } = await start(w, h, mode === 'direct' ? { onboardingDone: true, workersIntroA: true } : { onboardingDone: true });
  if (mode === 'viaHireTip') { try { await p.locator('#iaOpen').click({ timeout: 8000 }); await p.waitForTimeout(700); } catch (e) { errs.push('no #iaOpen'); } }
  await p.evaluate(() => window.eggfarm.dispatch({ type: 'hire', worker: 'market_hand' }));
  let pre = []; if (mode === 'direct') { pre = (await sample(p, 1500)).flatMap(s => s.tips).filter(t => /tired/.test(t.txt) && !t.workersTab); await openWorkers(p); }
  const S = await sample(p, 9000); let shot = 0;
  const tired = S.flatMap(s => s.tips.filter(t => /tired/.test(t.txt))), man = S.flatMap(s => s.tips.filter(t => /Manage/.test(t.txt)));
  const skip = w === 1024 && h === 474;
  const badT = tired.filter(t => !(t.gap >= 7 && t.gap <= 9) || !t.rowBelowTabs || t.ovTab || t.ovNav || t.ovToast || !t.inVp);
  const badM = man.filter(t => t.ovTab || t.ovNav || t.ovToast || !t.inVp);
  const ok = !errs.length && !pre.length && (skip ? tired.length === 0 && man.length > 0 : tired.length > 0 && !badT.length) && man.length > 0 && !badM.length;
  log(ok, key, { tired: tired.length, man: man.length, preOpen: pre.length, badT: badT.length, badM: badM.length, firstT: tired[0] || null, firstM: man[0] || null, errs, badT0: badT[0] || null, badM0: badM[0] || null });
  await p.screenshot({ path: `${OUT}/${ENG}-${key}-end.png` }).catch(() => {}); await ctx.close();
}
if (PART === 'state') {
  { // seen after a show persists over reload (390x640)
    const { ctx, p, errs } = await start(390, 640, { onboardingDone: true, workersIntroA: true }); await p.evaluate(() => window.eggfarm.dispatch({ type: 'hire', worker: 'market_hand' })); await openWorkers(p);
    const S = await sample(p, 1500); const shownT = S.some(s => s.tips.some(t => /tired/.test(t.txt)));
    await leaveWorkers(p); await p.waitForTimeout(400); // leave before the Manage tip (3.1s) -> come-back check
    const u1 = await ui(p); await openWorkers(p); const S2 = await sample(p, 8000); const manAt = (S2.find(s => s.tips.some(t => /Manage/.test(t.txt))) || {}).ms ?? null; const manBack = S2.some(s => s.tips.some(t => /Manage/.test(t.txt))); const tiredAgain = S2.some(s => s.tips.some(t => /tired/.test(t.txt)));
    await p.waitForTimeout(500); const u2 = await ui(p);
    await p.reload(); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm); await p.waitForTimeout(500); await openWorkers(p); const S3 = await sample(p, 4000);
    const after = S3.flatMap(s => s.tips).length; const afterTxt = [...new Set(S3.flatMap(s => s.tips.map(t => t.txt.slice(0, 14))))]; const u3 = await ui(p);
    log(shownT && u1.tiredSeen && manBack && !tiredAgain && u2.manageSeen && u3.tiredSeen && u3.manageSeen && after === 0 && !errs.length, 'seen-after-show+manage-comeback-390x640', { manAt, afterTipsTxt: afterTxt, shownT, u1: { tiredSeen: u1.tiredSeen, manageSeen: u1.manageSeen }, manBack, tiredAgain, u2manageSeen: u2.manageSeen, afterReloadTips: after, u3: { tiredSeen: u3.tiredSeen, skips: u3.tiredSkips, manageSeen: u3.manageSeen }, errs });
    await ctx.close(); }
  { // 3 skips -> seen, persists (1024x474, where the tip is always skipped); manageSeen cleared each visit to keep visits honest is NOT done: just count skips
    const { ctx, p, errs } = await start(1024, 474, { onboardingDone: true, workersIntroA: true }); await p.evaluate(() => window.eggfarm.dispatch({ type: 'hire', worker: 'market_hand' }));
    const skips = []; let tiredSeenAny = 0;
    for (let v = 0; v < 3; v++) { await openWorkers(p); const S = await sample(p, 2500); tiredSeenAny += S.flatMap(s => s.tips).filter(t => /tired/.test(t.txt)).length; skips.push((await ui(p)).tiredSkips ?? 0); await leaveWorkers(p); await p.waitForTimeout(600); }
    const u = await ui(p); await p.reload(); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm); await p.waitForTimeout(500); const u2 = await ui(p);
    log(tiredSeenAny === 0 && u.tiredSeen === true && u2.tiredSeen === true && !errs.length, 'seen-after-3-skips-1024x474', { skips, tiredShownSamples: tiredSeenAny, before: { tiredSeen: u.tiredSeen, skips: u.tiredSkips }, afterReload: { tiredSeen: u2.tiredSeen, skips: u2.tiredSkips }, errs });
    await ctx.close(); }
  for (const [w, h] of [[1280, 720], [390, 640]]) { // user scrolls during the 1s guard: no programmatic scroll fighting
    const { ctx, p, errs } = await start(w, h, { onboardingDone: true, workersIntroA: true }); await p.evaluate(() => window.eggfarm.dispatch({ type: 'hire', worker: 'market_hand' })); await openWorkers(p); await p.waitForTimeout(120);
    const seq = []; for (let i = 0; i < 8; i++) { const before = await p.evaluate(() => document.querySelector('#uRow').closest('.body').scrollTop);
      await p.evaluate(() => { const b = document.querySelector('#uRow').closest('.body'); b.dispatchEvent(new WheelEvent('wheel', { deltaY: 10, bubbles: true })); b.scrollTop += 10; });
      await p.waitForTimeout(150); const after = await p.evaluate(() => document.querySelector('#uRow').closest('.body').scrollTop); seq.push(Math.round(after - before)); }
    const S = await sample(p, 1500); const fight = seq.filter(d => Math.abs(d - 10) > 12 && d !== 0).length; // 0 = already at end; anything far from our +10 = programmatic jump
    log(fight === 0 && !errs.length, `guard-user-scroll-${w}x${h}`, { deltas: seq, fight, tipsAfter: [...new Set(S.flatMap(s => s.tips.map(t => t.txt.slice(0, 14))))], errs });
    await ctx.close(); }
}
fs.writeFileSync(`${OUT}/b2d-${PART}-${ENG}.json`, JSON.stringify(res, null, 1));
await br.close(); kill(); console.log(`DONE ${PART} ${ENG} fails=${fails} of ${Object.keys(res).length}`); process.exit(0);
