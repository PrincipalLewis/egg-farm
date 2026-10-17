// rc0 browser checks + screenshots. Needs a QA build (?ios= flag): npm run build:qa && node scripts/rc0-browser.mjs
// Engine: CLI arg `node scripts/rc0-browser.mjs webkit` or ENGINE=chromium|webkit|firefox (default chromium; CLI wins). HEADED=1.
import { chromium, webkit, firefox } from 'playwright-core';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
const ENGINE = process.argv[2] ?? process.env.ENGINE ?? 'chromium';
if (!['chromium', 'webkit', 'firefox'].includes(ENGINE)) { console.error(`rc0-browser: unknown engine ${ENGINE}`); process.exit(2); }
const headless = !process.env.HEADED;
// PORT: was a fixed 4181, which collided with parallel worktrees
const port = +(process.env.PORT ?? 4300 + Math.floor(Math.random() * 600)); const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
const killSrv = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch { } };
for (let i = 0; i < 240; i++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
const SHOTS = process.env.SHOTS ?? '../engineering/screenshots'; mkdirSync(SHOTS, { recursive: true });
const shot = ENGINE === 'chromium' && headless; // screenshots once, from headless Chromium
const browser = ENGINE === 'webkit' ? await webkit.launch({ headless }) : ENGINE === 'firefox' ? await firefox.launch({ headless }) : await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', headless, args: ['--no-sandbox'] });
const results = []; const ok = (name, pass, info = '') => { results.push({ name, pass: !!pass, info }); if (!pass) process.exitCode = 1; };
const URL0 = `http://127.0.0.1:${port}/`;
const fx = f => readFileSync(new URL(`../tests/fixtures/saves/${f}`, import.meta.url), 'utf8');
async function open({ w = 390, h = 844, ls = {}, q = '', touch = false, dsf = 1 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, acceptDownloads: true, deviceScaleFactor: dsf });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(o => { if (sessionStorage.getItem('seeded')) return; for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); }, ls);
  await page.goto(URL0 + q, { waitUntil: 'domcontentloaded' }); await page.getByText('Tap to start').click(); await page.waitForFunction(() => window.eggfarm);
  await page.waitForTimeout(150);
  return { ctx, page, errors };
}
const NEWER_TEXT = 'This save is from a newer version of Egg Farm. Open the newer build to keep playing.';
const only = (process.env.ONLY ?? '').split(',').filter(Boolean), want = n => !only.length || only.includes(n);
const sections = {};
export { };
// ---------- PT1-8 desktop tab hit areas ----------
sections.tabs = async () => {
  for (const [w, h] of [[1280, 720], [960, 600]]) {
    const { ctx, page } = await open({ w, h, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true }) } });
    const r = await page.$$eval('.tabs button', bs => bs.map(x => { const a = x.getBoundingClientRect(); return { w: a.width, h: a.height, l: a.left, r: a.right }; }));
    ok(`PT1-8 tabs >=44x44 at ${w}x${h}`, r.length === 3 && r.every(x => x.w >= 44 && x.h >= 44), JSON.stringify(r.map(x => [Math.round(x.w), x.h])));
    ok(`PT1-8 tab hit areas don't overlap at ${w}`, r.every((x, i) => i === 0 || x.l >= r[i - 1].r - 0.5));
    await ctx.close();
  }
};
// ---------- rc1 tap areas >=44px at phone widths (D5 next-goal button, nav, Collect, settings) ----------
sections.taps = async () => {
  for (const [w, h] of [[360, 640], [390, 844]]) {
    const { ctx, page } = await open({ w, h, ls: { 'eggfarm.ui': DONE } });
    const r = await page.evaluate(() => [...document.querySelectorAll('button.goal, nav.actions button:not([hidden]), #collect, #settings')].map(e => { const a = e.getBoundingClientRect(); return { k: e.id || e.dataset.nav || e.className, w: a.width, h: a.height }; }));
    ok(`rc1 tap areas >=44px incl. button.goal (${w}x${h})`, r.length >= 5 && r.some(x => x.k === 'goal') && r.every(x => x.w >= 44 && x.h >= 44), JSON.stringify(r.map(x => [x.k, Math.round(x.w), Math.round(x.h)])));
    const g = await page.evaluate(() => { const q = s => document.querySelector(s).getBoundingClientRect(); return { hit: q('#goal').height, pill: q('#goal .goal-pill').height, gap: Math.round(q('#collect').top - q('#goal').bottom) }; });
    ok(`D5 goal hit 44 / pill 40 / gap below 4 (row 48) (${w})`, g.hit === 44 && g.pill === 40 && g.gap === 4, JSON.stringify(g));
    await ctx.close();
  }
};
// ---------- S2-6 Queue full tag on the strip's top edge, no overlap (360/375/390) ----------
sections.qtag = async () => {
  for (const [w, h] of [[360, 640], [375, 667], [375, 812], [390, 844]]) {
    const { ctx, page } = await open({ w, h, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true, seenSlots: 10 }) } });
    for (const [F, n] of [[0, 6], [15, 9], [0, 4]]) { // full 6/6 at F0 and 9/9 at F15 (QA s2-7-bd0dc66), 4/6 not full
      await page.evaluate(([F, n]) => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: F, customers: Array.from({ length: n }, (_, i) => ({ id: 500 + i, demand: 5, filled: 0, waitedS: 0 })), nextCustomerInS: 1e9 }; }, [F, n]); await page.waitForTimeout(2300);
      const r = await page.evaluate(() => { const t = document.querySelector('.qtag'); if (!t) return { tag: null }; const a = t.getBoundingClientRect(), q = document.querySelector('#queue').getBoundingClientRect(), f = document.querySelector('.farm').getBoundingClientRect();
        const hits = [...document.querySelectorAll('#queue .chip')].map(c => c.getBoundingClientRect()).filter(c => !(a.right <= c.left || c.right <= a.left || a.bottom <= c.top || c.bottom <= a.top)).length;
        return { tag: t.innerText.trim(), hits, straddle: a.top < q.top && a.bottom > q.top, clipped: a.top < f.top }; });
      if (n !== 4) ok(`S2-6 ${n}/${n} tag on strip top edge, no chip/+N overlap, "${w < 380 ? 'Full' : 'Queue full'}" (${w}x${h})`, r.tag === (w < 380 ? 'Full' : 'Queue full') && r.hits === 0 && r.straddle && !r.clipped, JSON.stringify(r));
      else ok(`S2-6 no tag when not full (${w}x${h})`, r.tag === null, JSON.stringify(r));
      if (n === 9 && shot && (h === 667 || h === 844)) await page.screenshot({ path: `${SHOTS}/rc1-s2-6-qtag-9of9-${w}.png`, clip: { x: 0, y: 0, width: w, height: 200 } });
    }
    await ctx.close();
  }
};
// ---------- S2-3b "+N" chip pulse on a queue step (reduced motion: colour flash), no slot grow-in ----------
sections.s23b = async () => {
  for (const reducedMotion of [false, true]) {
    const { ctx, page } = await open({ w: 390, h: 844, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true, seenSlots: 8, reducedMotion }) } });
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 14, celebratedTier: 3, coinsCents: 1e15, customers: Array.from({ length: 8 }, (_, i) => ({ id: 700 + i, demand: 5, filled: 0, waitedS: 0 })), nextCustomerInS: 1e9 }; });
    await page.waitForTimeout(400); await page.evaluate(() => window.eggfarm.dispatch({ type: 'buyFarm' })); await page.waitForTimeout(150);
    const r = await page.evaluate(() => { const c = document.querySelector('#queue .chip.more'); return { cls: c?.className, anim: c && getComputedStyle(c).animationName, unlock: document.querySelectorAll('.chip.unlock').length, ui: JSON.parse(localStorage.getItem('eggfarm.ui')).seenSlots }; });
    ok(`S2-3b queue step 8->9: "+N" chip ${reducedMotion ? 'colour flash' : 'pulse'} once, no slot grow-in`, r.anim === (reducedMotion ? 'qflash' : 'qpulse') && r.unlock === 0 && r.ui === 9, JSON.stringify(r));
    await ctx.close();
  }
};
// ---------- S2-1 coop tiers swap at F4->5, F9->10, F19->20; toast above the open Upgrades sheet ----------
sections.s21 = async () => {
  const { ctx, page } = await open({ w: 390, h: 844, ls: { 'eggfarm.ui': DONE } });
  await page.locator('[data-nav=upgrades]').click(); await page.locator('[data-tab=farm]').click();
  for (const [F, sprite] of [[4, 'coop-l5.svg'], [9, 'coop-l10.svg'], [19, 'coop-l20.svg']]) {
    await page.evaluate(F => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: F, celebratedTier: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1][F] ?? 2, coinsCents: 1e15 }; }, F); await page.waitForTimeout(300);
    await page.evaluate(() => window.eggfarm.dispatch({ type: 'buyFarm' })); await page.waitForTimeout(300);
    const r = await page.evaluate(() => { const t = document.querySelector('.toast'), tr = t.getBoundingClientRect(), pz = +getComputedStyle(document.querySelector('#panel-layer')).zIndex;
      return { src: document.querySelector('#coop').getAttribute('src').split('/').pop(), sheet: !document.querySelector('#p-upgrades').hidden, text: t.textContent, vis: getComputedStyle(t).visibility, z: +getComputedStyle(t).zIndex, pz, inView: tr.top >= 0 && tr.bottom <= innerHeight }; });
    ok(`S2-1 F${F}->${F + 1}: ${sprite}, "Coop upgraded!" visible above the open sheet`, r.src === sprite && r.sheet && r.text === 'Coop upgraded!' && r.vis === 'visible' && r.z > r.pz && r.inView, JSON.stringify(r));
    if (shot) await page.screenshot({ path: `${SHOTS}/rc1-s2-1-toast-over-sheet-F${F + 1}-390.png` });
    await page.locator('.sheet:not([hidden]) .close').click(); await page.waitForTimeout(150);
    const bounce = await page.evaluate(() => document.querySelector('#coop').classList.contains('bounce'));
    ok(`S2-1 F${F + 1}: coop bounce plays once the sheet closes`, bounce);
    if (shot) await page.screenshot({ path: `${SHOTS}/rc1-s2-1-${sprite.replace('.svg', '')}-390.png` });
    await page.waitForTimeout(2600); await page.locator('[data-nav=upgrades]').click(); await page.locator('[data-tab=farm]').click();
  }
  await ctx.close();
};
// ---------- AC14b save-recovery dialog v1.2: alertdialog, outside tap / Esc / Back inert, Export button 44px ----------
sections.ac14b = async () => {
  for (const w of [360, 960]) {
    const { ctx, page } = await open({ w, h: w > 900 ? 600 : 640, ls: { 'eggfarm.save': fx('corrupt-truncated.json'), 'eggfarm.ui': DONE } });
    const card = page.locator('.recovery-card');
    const role = await card.getAttribute('role');
    await page.mouse.click(5, 5); await page.keyboard.press('Escape'); await page.goBack().catch(() => {}); await page.waitForTimeout(300);
    const still = await card.count();
    const ex = await page.evaluate(() => { const e = document.querySelector('#rcExport'); const r = e?.getBoundingClientRect(); return e && { tag: e.tagName, type: e.getAttribute('type'), text: e.textContent, w: r.width, h: r.height }; });
    ok(`AC14b (${w}): role=alertdialog; outside tap, Esc and Back don't close; Export old save <button> >=44px`, role === 'alertdialog' && still === 1 && ex && ex.tag === 'BUTTON' && ex.type === 'button' && ex.text === 'Export old save' && ex.w >= 44 && ex.h >= 44, JSON.stringify({ role, still, ex }));
    if (shot) await page.screenshot({ path: `${SHOTS}/rc1-ac14b-f-${w}.png` });
    await page.locator('#rcGo').click(); await page.waitForTimeout(200);
    ok(`AC14b (${w}): primary button closes it`, (await card.count()) === 0);
    await ctx.close();
  }
};
// ---------- S2-4c welcome-back "Market Hand sold N right away" line: real numbers, hidden when nothing sold ----------
sections.s24c = async () => {
  for (const mh of [true, false]) {
    const sv = JSON.stringify({ version: 5, savedAt: Date.now() - 2 * 3600e3, state: { coinsCents: 1e9, coop: 0, basket: 0, collectionLevel: 10, farmLevel: 10, customers: [{ id: 1, demand: 200, filled: 0, waitedS: 0 }, { id: 2, demand: 139, filled: 0, waitedS: 0 }],
      nextCustomerInS: 1e9, nextCustomerId: 9, rng: 5, pendingOfflineEggs: 0, celebratedTier: 2, workers: mh ? { market_hand: { energy: 100, cdS: 0 } } : {}, graderTier: 0, manageCdS: 0, coopFullS: 0 } });
    const { ctx, page } = await open({ w: 390, h: 844, ls: { 'eggfarm.save': sv, 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true }) } });
    await page.waitForTimeout(200);
    const line = await page.evaluate(() => document.querySelector('#wbSold')?.textContent ?? null);
    const css = await page.evaluate(() => { const e = document.querySelector('#wbSold'); return e && [getComputedStyle(e).fontSize, getComputedStyle(e).color]; });
    if (mh && shot) await page.screenshot({ path: `${SHOTS}/rc1-s2-4c-welcome-sold-390.png` });
    const b0 = await page.evaluate(() => window.eggfarm.state.basket + window.eggfarm.state.pendingOfflineEggs);
    if (mh && await page.locator('#wbCollect').count()) {
      // S2-10 (main e57bf4f): #basket must update in the same task as the Collect click (no RenderPump wait).
      const sync = await page.evaluate(() => {
        const before = document.querySelector('#basket')?.textContent ?? '';
        const pending = window.eggfarm.state.pendingOfflineEggs;
        document.querySelector('#wbCollect').click();
        return { before, after: document.querySelector('#basket')?.textContent ?? '', pending, pendingAfter: window.eggfarm.state.pendingOfflineEggs, basket: window.eggfarm.state.basket };
      });
      ok('S2-10 welcome Collect updates #basket in the same task', sync.pending > 0 && sync.pendingAfter === 0 && sync.after !== sync.before && sync.basket === sync.pending, JSON.stringify(sync));
    } else if (await page.locator('#wbCollect').count()) {
      await page.locator('#wbCollect').click();
    }
    await page.waitForTimeout(3000);
    const sold = await page.evaluate(() => JSON.parse(window.eggfarmExportTelemetry()).events.filter(e => e.type === 'sale' || e.type === 'sell').length);
    // 366 = queue demand 200+139 plus MK-22 (main 16d0fe3): collectOffline sets nextCustomerInS=0 so one more customer arrives in the Market Hand window.
    if (mh) ok('S2-4c line "Market Hand sold 366 right away · +$…", 14px #6B5D52', line && /^Market Hand sold 366 right away\u00a0· \+\$/.test(line) && css[0] === '14px' && css[1] === 'rgb(107, 93, 82)', JSON.stringify({ line, css, b0, sold }));
    else ok('S2-4c no Market Hand -> line hidden', line === null, JSON.stringify({ line }));
    await ctx.close();
  }
};
// ---------- QA bd0dc66 particle fragment at the top-left (375): particles stay in the safe area and none remain ----------
sections.fx = async () => {
  const { ctx, page } = await open({ w: 375, h: 667, ls: { 'eggfarm.ui': DONE } });
  await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coop: 200, coinsCents: 1e6 }; });
  const r = await page.evaluate(async () => {
    const g = window.eggfarm, bad = []; let maxLive = 0; const end = performance.now() + 1500;
    for (let i = 0; i < 6; i++) document.querySelector('#collect').click();
    g.state = { ...g.state, customers: [{ id: 1, demand: 5, filled: 0, waitedS: 0 }] }; g.dispatch({ type: 'sellAll' }); g.dispatch({ type: 'buyCollection' }); // Market closed: Sell all is hidden
    while (performance.now() < end) { await new Promise(r => requestAnimationFrame(r)); const kids = [...document.querySelectorAll('#fx-layer > *')]; maxLive = Math.max(maxLive, kids.length);
      for (const k of kids) { const b = k.getBoundingClientRect(); if (b.width && getComputedStyle(k).opacity !== '0' && (b.right < 8 || b.bottom < 8 || (b.left < 0 && b.top < 8))) bad.push([k.className, Math.round(b.left), Math.round(b.top)]); } }
    await new Promise(r => setTimeout(r, 1000));
    const coin = document.querySelector('.pill.coins img').getBoundingClientRect();
    return { bad: bad.slice(0, 5), maxLive, left: document.querySelectorAll('#fx-layer > *').length, coin: [Math.round(coin.left + coin.width / 2), Math.round(coin.top + coin.height / 2)] };
  });
  ok('FX particles never in the top-left corner (375x667), none left 1 s after the animations', r.bad.length === 0 && r.maxLive > 0 && r.left === 0, JSON.stringify(r));
  await ctx.close();
};
// ---------- S2-8 header net rate / wage lines, S2-9 Market queue-full dot ----------
sections.s289 = async () => {
  const UI = JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true });
  { const { ctx, page } = await open({ w: 390, h: 844, ls: { 'eggfarm.ui': UI } });
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 6, coinsCents: 1e6, customers: [], nextCustomerInS: 1e9, workers: { market_hand: { energy: 90, cdS: 5 }, coop_hand: { energy: 90, cdS: 5 } } }; });
    await page.waitForTimeout(400);
    // Reviewer m2: drive the real rateView -> headerRateText path (no injected text). P1q wages << income, so the live negative case is 'production stopped' (asleep worker).
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, workers: { ...g.state.workers, market_hand: { ...g.state.workers.market_hand, energy: 0 } } }; });
    await page.waitForFunction(() => document.querySelector('#rate')?.dataset.sign === 'neg', null, { timeout: 4000 }).catch(() => {});
    const r = await page.evaluate(() => { const e = document.querySelector('#rate'), cs = getComputedStyle(e); return { text: e.textContent, aria: e.getAttribute('aria-label'), sign: e.dataset.sign, color: cs.color, size: cs.fontSize, weight: cs.fontWeight }; });
    ok('S2-8/FIX3 real path: asleep worker -> header "⚠ ▼ $0.00/s" (no hyphen), sign neg, 11px/700 #B83B37, aria "... production stopped"', r.text === '\u26A0 \u25BC $0.00/s' && !/-/.test(r.text) && r.sign === 'neg' && r.color === 'rgb(184, 59, 55)' && r.size === '11px' && r.weight === '700' && /production stopped$/.test(r.aria ?? ''), JSON.stringify(r));
    if (shot) await page.screenshot({ path: `${SHOTS}/rc1-s2-8-rate-negative-390.png`, clip: { x: 0, y: 0, width: 390, height: 120 } });
    await page.locator('[data-nav=upgrades]').click(); await page.locator('[data-tab=workers]').click(); await page.waitForTimeout(400);
    const wl = await page.evaluate(() => [...document.querySelectorAll('#uRow .wk .wage')].map(e => e.textContent));
    ok('S2-8 wage lines on worker and hire cards', wl.length >= 2 && wl.every(t => /^Wage \$[\d.]+\/(s|min)$/.test(t)), JSON.stringify(wl));
    if (shot) await page.screenshot({ path: `${SHOTS}/rc1-s2-8-hire-card-wage-390.png` });
    await ctx.close(); }
  { const { ctx, page } = await open({ w: 390, h: 844, ls: { 'eggfarm.ui': UI } });
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 0, customers: Array.from({ length: 6 }, (_, i) => ({ id: 600 + i, demand: 5, filled: 0, waitedS: 0 })), nextCustomerInS: 1e9 }; });
    await page.waitForTimeout(400);
    const dotPaint = await page.evaluate(() => { const e = document.querySelector('.qdot'), cs = getComputedStyle(e); return { box: [e.offsetWidth, e.offsetHeight], /* layout box; the rect is scaled mid-pulse */ bg: cs.backgroundColor, bw: cs.borderTopWidth, bc: cs.borderTopColor, shadow: cs.boxShadow, outline: cs.outlineStyle, content: [getComputedStyle(e, '::before').content, getComputedStyle(e, '::after').content] }; });
    ok('Review #3: Market dot = 10px #B83B37 fill inside a 2px white ring, 14px box, nothing else painted', dotPaint.box.join() === '14,14' && dotPaint.bg === 'rgb(184, 59, 55)' && dotPaint.bw === '2px' && dotPaint.bc === 'rgb(255, 255, 255)' && dotPaint.shadow === 'none' && dotPaint.outline === 'none' && dotPaint.content.every(c => c === 'none' || c === 'normal'), JSON.stringify(dotPaint));
    const a = await page.evaluate(() => ({ dot: !document.querySelector('.qdot').hidden, aria: document.querySelector('[data-nav=market]').getAttribute('aria-label'), sheet: !document.querySelector('#p-market').hidden }));
    if (shot) await page.screenshot({ path: `${SHOTS}/rc1-s2-9-market-dot-390.png`, clip: { x: 0, y: 0, width: 390, height: 844 } });
    await page.locator('[data-nav=market]').click(); await page.waitForTimeout(200); await page.locator('.sheet:not([hidden]) .close').click(); await page.waitForTimeout(200);
    const b2 = await page.evaluate(() => ({ dot: !document.querySelector('.qdot').hidden, aria: document.querySelector('[data-nav=market]').getAttribute('aria-label') }));
    ok('S2-9 queue full: dot + "Market, queue full", sheet stays closed; dot clears once Market opened', a.dot && a.aria === 'Market, queue full' && !a.sheet && !b2.dot && b2.aria === 'Market', JSON.stringify({ a, b2 }));
    await ctx.close(); }
};
// ---------- PT1-4 / PT1-5 / PT1-6 ----------
sections.pt1 = async () => {
  { // PT1-4: corrupt save + old "done" flags -> FTUE runs again on the fresh farm
    const { ctx, page } = await open({ ls: { 'eggfarm.save': fx('corrupt-truncated.json'), 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false }) } });
    await page.locator('#rcGo').click(); await page.waitForTimeout(200);
    const ui = await page.evaluate(() => JSON.parse(localStorage.getItem('eggfarm.ui')));
    ok('PT1-4 fresh fallback resets onboarding + Workers-tip flags', (await page.locator('.onb').count()) === 1 && !ui.onboardingDone && !ui.workersIntroA && !ui.workersIntroB && ui.sfx === false, JSON.stringify(ui));
    await ctx.close();
  }
  { // PT1-5: reload mid-onboarding logs onboarding_abandon {atStep}
    const { ctx, page } = await open();
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coop: 40 }; }); await page.locator('#collect').click(); await page.waitForTimeout(150);
    await page.evaluate(() => window.eggfarm.save()); await page.reload(); await page.getByText('Tap to start').click(); await page.waitForFunction(() => window.eggfarm); await page.waitForTimeout(150);
    const ev = await page.evaluate(() => JSON.parse(window.eggfarmExportTelemetry()).events.filter(e => e.type === 'onboarding_abandon'));
    ok('PT1-5 reload mid-onboarding logs onboarding_abandon', ev.length === 1 && ev[0].atStep >= 1, JSON.stringify(ev));
    ok('PT1-5 overlay not left half-running after reload', (await page.locator('.onb').count()) === 0);
    await ctx.close();
  }
  { // PT1-6: axe serious/critical on farm, onboarding, sheets
    const axe = readFileSync('/tmp/axe/node_modules/axe-core/axe.min.js', 'utf8');
    const run = async (page, tag) => { await page.addScriptTag({ content: axe }); return (await page.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'] })).violations.map(v => ({ id: v.id, impact: v.impact, t: v.nodes[0]?.target?.join(' ') })))).map(v => ({ ...v, tag })); };
    const { ctx, page } = await open(); let v = await run(page, 'onboarding');
    await page.locator('.onb-skip').click(); v = v.concat(await run(page, 'farm'));
    await page.locator('[data-nav=upgrades]').click(); v = v.concat(await run(page, 'upgrades'));
    const bad = v.filter(x => x.impact === 'serious' || x.impact === 'critical'), target = bad.filter(x => /queue|scene|onb-cap/.test(x.t ?? '') || ['aria-prohibited-attr', 'label-content-name-mismatch', 'aria-dialog-name'].includes(x.id));
    ok('PT1-6 axe: no serious issue on #queue/#scene/onboarding dialog', target.length === 0, JSON.stringify(target));
    ok('PT1-6 axe: page-has-heading-one fixed', !v.some(x => x.id === 'page-has-heading-one'));
    results.push({ name: 'axe other serious/critical (info)', pass: true, info: JSON.stringify(bad.filter(x => !target.includes(x))) });
    await ctx.close();
  }
};
const DONE = JSON.stringify({ onboardingDone: true });
// ---------- B1 hire banner ----------
sections.b1 = async () => {
  const { ctx, page } = await open({ ls: { 'eggfarm.ui': DONE } });
  await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 3, coinsCents: 1e7 }; }); await page.waitForTimeout(200);
  const before = await page.locator('.intro-a').count();
  await page.evaluate(() => window.eggfarm.dispatch({ type: 'hire', worker: 'market_hand' })); await page.waitForTimeout(200);
  await page.evaluate(() => window.eggfarm.debugAdvance(30_000)); await page.waitForTimeout(300);
  ok('B1 "New helper!" banner shows before hiring and is gone after hiring (+30 s)', before === 1 && (await page.locator('.intro-a').count()) === 0, `before=${before}`);
  await ctx.close();
};

// ---------- B2 Farm L5 toast ----------
sections.b2 = async () => {
  for (const [w, banner] of [[360, true], [390, true], [1280, true], [1280, false]]) {
    const { ctx, page } = await open({ w, h: w > 900 ? 800 : 844, ls: { 'eggfarm.ui': banner ? DONE : JSON.stringify({ ...JSON.parse(DONE), workersIntroA: true }) } });
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 4, coinsCents: 1e9 }; g.dispatch({ type: 'buyFarm' }); });
    await page.waitForTimeout(300); const shown = await page.locator('.toast').evaluate(e => { const r = e.getBoundingClientRect(); return { top: r.top, vis: getComputedStyle(e).visibility, text: e.textContent, ia: document.querySelector('.intro-a:not([hidden])')?.getBoundingClientRect().bottom ?? 0 }; });
    await page.waitForTimeout(1900); const mid = await page.locator('.toast').evaluate(e => getComputedStyle(e).visibility); // 2.2 s: still up (COOP_TOAST_MS 2.5 s)
    await page.waitForTimeout(800);
    const qb = await page.locator('#queue').evaluate(e => e.getBoundingClientRect().bottom); const ia = shown.ia; /* banner measured at toast show time (review ac4ec56 #2) */ const below = w < 960 || ia > 0, where = ia > 0 ? '8px below the New helper! banner' : below ? 'below strip' : 'docked, no banner: slides off the top', edge = Math.max(w < 960 ? qb : 0, ia);
    const after = await page.locator('.toast').evaluate(e => { const r = e.getBoundingClientRect(); return { bottom: r.bottom, vis: getComputedStyle(e).visibility, op: getComputedStyle(e).opacity }; });
    // QA precheck-2fae4c4 §1: width-aware. <960: sits 8px below the queue strip (F1) and fades in place; docked: slides off the top.
    // rc2 item 1: a visible 'New helper!' banner (.intro-a) also pushes the toast 8px below it (any width) and it fades in place.
    ok(`B2 L5 toast shows ${where}, then is fully gone (${w})`, shown.vis === 'visible' && mid === 'visible' && /Coop upgraded/.test(shown.text) && after.vis === 'hidden' && after.op === '0'
      && (banner ? ia > 0 && shown.top >= ia + 7 : ia === 0) && (below ? Math.abs(shown.top - (edge + 8)) <= 1 : (shown.top >= 0 && after.bottom <= 0)), JSON.stringify({ shown, mid, after, qb, ia }));
    await ctx.close();
  }
};

// ---------- toast-v3: first toast after load is at its settled top from frame 1, never over the banner/strip mid-fade ----------
sections.toastfirst = async () => {
  const TS = process.env.TOAST_SHOTS ?? `${SHOTS}/toast-v3`; mkdirSync(TS, { recursive: true });
  for (const [w, h, banner] of [[360, 740, true], [390, 640, false], [1280, 800, true], [1280, 800, false]]) {
    const { ctx, page } = await open({ w, h, ls: { 'eggfarm.ui': banner ? DONE : JSON.stringify({ ...JSON.parse(DONE), workersIntroA: true }) } });
    const tag = `${w}x${h} ${banner ? 'banner' : 'no banner'}`;
    // sample every frame from the dispatch (same task) for ~400ms
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 4, coinsCents: 1e9 }; window.__tf = [];
      const t0 = performance.now(), el = document.querySelector('.toast');
      const snap = () => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); window.__tf.push({ t: Math.round(performance.now() - t0), top: r.top, bottom: r.bottom, op: +cs.opacity, vis: cs.visibility, show: el.classList.contains('show') }); };
      g.dispatch({ type: 'buyFarm' }); snap(); const loop = () => { snap(); if (performance.now() - t0 < 400) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
    await page.waitForTimeout(100); if (shot) await page.screenshot({ path: `${TS}/toast-midfade-100ms-${w}x${h}-${banner ? 'banner' : 'nobanner'}.png` });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({ f: window.__tf, ia: document.querySelector('.intro-a:not([hidden])')?.getBoundingClientRect().bottom ?? 0, qb: document.querySelector('#queue').getBoundingClientRect().bottom, docked: matchMedia('(min-width:960px) and (orientation:landscape)').matches, below: document.querySelector('.toast').classList.contains('below') }));
    const edge = Math.max(r.docked ? 0 : r.qb, r.ia), settled = r.f[r.f.length - 1], seen = r.f.filter(x => x.show && x.vis === 'visible' && x.op > 0);
    if (edge === 0) { // 1280 docked, no banner: the intended slide-in from the top (nothing to cross)
      ok(`toast-v3 docked no-banner slides in from above and settles on-screen (${tag})`, settled.op === 1 && settled.top >= 0 && seen.length > 0 && seen[0].top < settled.top - 1 && seen.every(x => x.top <= settled.top + 0.5) && !r.below, JSON.stringify({ first: seen[0], settled, below: r.below }));
    } else {
      ok(`toast-v3 settles 8px below the ${banner ? 'banner' : 'strip'} (${tag})`, settled.op === 1 && Math.abs(settled.top - (edge + 8)) <= 1, JSON.stringify({ settled, edge }));
      ok(`toast-v3 first visible frame already at settled top (±8px fade offset) (${tag})`, seen.length > 0 && seen[0].top >= settled.top - 8.5 && seen[0].top <= settled.top + 0.5, JSON.stringify({ first: seen[0], settled: settled.top }));
      // frames at opacity 0 are invisible, so only frames with opacity > 0 count as "over" the banner/strip
      ok(`toast-v3 never over the ${banner ? 'banner' : 'strip'} in any frame mid-fade (${tag})`, seen.every(x => x.top >= edge - 0.5), JSON.stringify(seen.filter(x => x.top < edge - 0.5).slice(0, 3)));
    }
    // dismissal path (timer-after-show ordering is unit-tested in tests/toast-controller.test.ts): poll, don't sleep (review 148591a n4)
    const gone = await page.waitForFunction(() => { const e = document.querySelector('.toast'), cs = getComputedStyle(e); return !e.classList.contains('show') && cs.opacity === '0' && cs.visibility === 'hidden'; }, null, { timeout: 4000 }).then(() => true, () => false);
    ok(`toast-v3 dismissed within 4s (COOP_TOAST_MS 2.5 s) (${tag})`, gone);
    await ctx.close();
  }
};

// ---------- B3 goal chip SR text ----------
sections.b3 = async () => {
  const { ctx, page } = await open({ ls: { 'eggfarm.ui': DONE } });
  await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 2, coinsCents: 500 }; });
  for (let i = 0; i < 6; i++) { await page.evaluate(() => window.eggfarm.dispatch({ type: 'sellAll' })); await page.waitForTimeout(500); }
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => ({ aria: document.querySelector('#goal').getAttribute('aria-label'), label: document.querySelector('.goal-label').textContent, status: document.querySelector('.goal-status').textContent, live: document.querySelector('#goalLive').textContent }));
  const num = r.status.match(/\d+/)?.[0];
  ok('B3 chip aria-label matches visible target/timer, no "1 minutes"', r.aria.includes(r.label.split(':')[0]) && (!num || r.aria.includes(num)) && !/\b1 (minutes|seconds|hours)\b/.test(r.aria + r.live), JSON.stringify(r));
  await page.waitForTimeout(4500);
  ok('B3 live region cleared after announcing (never stale)', (await page.locator('#goalLive').textContent()) === '' || (await page.locator('#goalLive').textContent()) === r.aria);
  await ctx.close();
};

// ---------- B6 desktop Collect bar vs side panel ----------
sections.b6 = async () => {
  for (const [w, h] of [[1280, 800], [960, 600], [1920, 1080]]) {
    const { ctx, page } = await open({ w, h, ls: { 'eggfarm.ui': DONE } });
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coinsCents: 1e6 }; g.dispatch({ type: 'buyFarm' }); }); await page.waitForTimeout(300);
    const r = await page.evaluate(() => { const q = s => document.querySelector(s).getBoundingClientRect(); return { bar: q('.collectbar').right, collect: q('#collect').right, goal: q('#goal').right, panel: q('#panel-layer').left, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }; });
    ok(`B6 Collect bar clear of the side panel by >=12px (${w}x${h})`, Math.max(r.bar, r.collect, r.goal) <= r.panel - 12 + 0.5 && r.sw <= r.cw, JSON.stringify(r));
    if (shot && w === 1280) await page.screenshot({ path: `${SHOTS}/m3-rc0-desktop-1280.png` });
    await ctx.close();
  }
};

sections.b6b = async () => {
  for (const [w, h] of [[960, 600], [1024, 700], [1212, 800]]) {
    const { ctx, page } = await open({ w, h, ls: { 'eggfarm.ui': DONE } });
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 20, collectionLevel: 20, coop: 1e6, basket: 123456, coinsCents: 1e12, customers: [1,2,3,4,5].map(i => ({ id: i, demand: 999, filled: 0, waitedS: 0 })) }; g.dispatch({ type: 'buyFarm' }); }); await page.waitForTimeout(400);
    const r = await page.evaluate(() => { const q = s => document.querySelector(s).getBoundingClientRect(); return { farmL: q('.farm').left, farmR: q('.farm').right, bar: q('.collectbar').right, barL: q('.collectbar').left, collect: q('#collect').right, panel: q('#panel-layer').left, sw: document.documentElement.scrollWidth }; });
    ok(`B6 stress (F21, 5 customers, big numbers): Collect bar clear of panel, starts >=12px from the left (${w})`, Math.max(r.bar, r.collect) <= r.panel - 12 + 0.5 && r.barL >= 12 && r.sw <= w, JSON.stringify(r));
    await ctx.close();
  }
};

// ---------- S2-5 nav: icon + visible label + aria-label on every button, also after a reload ----------
sections.s25 = async () => {
  const st = JSON.stringify({ version: 5, savedAt: Date.now(), state: { coinsCents: 1e6, coop: 0, basket: 0, collectionLevel: 5, farmLevel: 10, customers: [], nextCustomerInS: 1e9, nextCustomerId: 1, rng: 5, pendingOfflineEggs: 0, celebratedTier: 2,
    workers: { market_hand: { energy: 30, cdS: 1 }, coop_hand: { energy: 90, cdS: 1 }, hawker: { energy: 95, cdS: 0 } }, graderTier: 0, manageCdS: 0, coopFullS: 0 } });
  const { ctx, page } = await open({ w: 390, h: 844, ls: { 'eggfarm.save': st, 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true }) } });
  const read = () => page.evaluate(() => [...document.querySelectorAll('nav.actions button')].filter(b => !b.hidden).map(b => { const r = b.getBoundingClientRect(); return { aria: b.getAttribute('aria-label'), label: b.querySelector('.nav-lbl')?.textContent, icon: !!b.querySelector('img'), badge: b.querySelector('.count-badge:not([hidden])')?.textContent, w: Math.round(r.width), h: Math.round(r.height) }; }));
  const check = (r, tag) => ok(`S2-5 nav ${tag}: 4 buttons, each icon + visible label + aria-label, >=64x44`, r.length === 4 && r.every(x => x.icon && x.label && x.aria && x.w >= 64 && x.h >= 44) && r[2].label === 'Refill' && r[2].aria === 'Refill 1 tired worker' && r[2].h === 64 && r[2].badge === '1', JSON.stringify(r));
  await page.waitForTimeout(300); check(await read(), 'fresh load');
  await page.evaluate(() => window.eggfarm.save()); await page.reload(); await page.getByText('Tap to start').click(); await page.waitForFunction(() => window.eggfarm); await page.waitForTimeout(400);
  const r2 = await read(); check(r2, 'after reload');
  ok('S2-5 exactly one worker button in the DOM after reload', (await page.locator('[data-act=manageAll]').count()) === 1);
  await page.locator('nav [data-act=manageAll]').click(); await page.waitForTimeout(300);
  const cd = await page.evaluate(() => { const b = document.querySelector('nav [data-act=manageAll]'), i = getComputedStyle(b.querySelector('.manage-ico img')); return { label: b.querySelector('.nav-lbl').textContent, aria: b.getAttribute('aria-label'), dis: b.getAttribute('aria-disabled'), filter: i.filter, op: i.opacity }; });
  ok('Review #1: nav Refill icon greyed during cooldown (grayscale(1), opacity .55)', cd.filter === 'grayscale(1)' && cd.op === '0.55', JSON.stringify(cd));
  if (shot) await page.screenshot({ path: `${SHOTS}/rc1-review1-nav-refill-cooldown-390.png`, clip: { x: 0, y: 844 - 80, width: 390, height: 80 } });
  ok('S2-5 cooldown: label "0:NN", aria "Refill available in N seconds", aria-disabled', /^0:\d\d$/.test(cd.label) && /^Refill available in \d+ seconds$/.test(cd.aria) && cd.dis === 'true', JSON.stringify(cd));
  if (shot) await page.screenshot({ path: `${SHOTS}/rc1-s2-5-nav-390.png`, clip: { x: 0, y: 844 - 80, width: 390, height: 80 } });
  await ctx.close();
};
// ---------- S2-8 sign-off: "Wage $0.75/min" for Market Hand at Farm L3 (hire card + worker panel, 390) ----------
sections.wage075 = async () => {
  const { ctx, page } = await open({ w: 390, h: 844, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true }) } });
  await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 3, coinsCents: 1e5, workers: {}, customers: [], nextCustomerInS: 1e9 }; });
  await page.locator('[data-nav=upgrades]').click(); await page.locator('[data-tab=workers]').click(); await page.waitForTimeout(400);
  const hire = await page.evaluate(() => document.querySelector('#uRow [data-w=market_hand] .wage')?.textContent);
  if (shot) await page.locator('#uRow div.wk[data-w=market_hand]').screenshot({ path: `${SHOTS}/rc1-s2-8-wage-075-hire-card-390.png` });
  if (shot) await page.screenshot({ path: `${SHOTS}/rc1-s2-8-wage-075-hire-sheet-390.png` });
  await page.evaluate(() => window.eggfarm.dispatch({ type: 'hire', worker: 'market_hand' })); await page.waitForTimeout(500);
  const panel = await page.evaluate(() => document.querySelector('#uRow [data-w=market_hand] .wage')?.textContent);
  if (shot) await page.locator('#uRow div.wk[data-w=market_hand]').screenshot({ path: `${SHOTS}/rc1-s2-8-wage-075-worker-card-390.png` });
  if (shot) await page.screenshot({ path: `${SHOTS}/rc1-s2-8-wage-075-worker-panel-390.png` });
  ok('S2-8 Market Hand at L3: "Wage $0.75/min" on the hire card and the worker panel', hire === 'Wage $0.75/min' && panel === 'Wage $0.75/min', JSON.stringify({ hire, panel }));
  await ctx.close();
  // 360: hire card, wage line must be whole (no ellipsis/overflow) and on one line
  { const { ctx, page } = await open({ w: 360, h: 800, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true }) } });
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 3, coinsCents: 1e5, workers: {}, customers: [], nextCustomerInS: 1e9 }; });
    await page.locator('[data-nav=upgrades]').click(); await page.locator('[data-tab=workers]').click(); await page.waitForTimeout(400);
    const r = await page.evaluate(() => { const e = document.querySelector('#uRow [data-w=market_hand] .wage'); if (!e) return null;
      const lh = parseFloat(getComputedStyle(e).lineHeight) || parseFloat(getComputedStyle(e).fontSize) * 1.3, rg = document.createRange(); rg.selectNodeContents([...e.childNodes].find(n => n.nodeType === 3) || e);
      return { text: e.textContent, lines: new Set([...rg.getClientRects()].filter(q => q.width > 0).map(q => Math.round(q.top))).size, h: e.getBoundingClientRect().height, lh, clipped: e.scrollWidth > e.clientWidth + 0.5 }; });
    if (shot) await page.locator('#uRow div.wk[data-w=market_hand]').screenshot({ path: `${SHOTS}/rc1-s2-8-wage-075-hire-card-360.png` });
    ok('S2-8 360: hire card "Wage $0.75/min" not truncated, one line', !!r && r.text === 'Wage $0.75/min' && r.lines === 1 && r.h < r.lh * 1.5 && !r.clipped, JSON.stringify(r));

    // Product 10:13: longest two-decimal wage. Real max = Coop Hand at Farm L30; format max = "$999.99/s" (stress, text injected)
    const line = () => page.evaluate(() => { const e = document.querySelector('#uRow div.wk[data-w=coop_hand] .wage'); if (!e) return null; const t = [...e.childNodes].find(n => n.nodeType === 3), rg = document.createRange(); rg.selectNodeContents(t);
      const card = e.closest('.wk').getBoundingClientRect(), r = e.getBoundingClientRect();
      return { text: e.textContent, lines: new Set([...rg.getClientRects()].filter(q => q.width > 0).map(q => Math.round(q.top))).size, clipped: e.scrollWidth > e.clientWidth + 0.5, inCard: r.right <= card.right + 0.5 }; });
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 30, coinsCents: 1e9 }; }); await page.waitForTimeout(500);
    const l30 = await line();
    if (shot) await page.locator('#uRow div.wk[data-w=coop_hand]').screenshot({ path: `${SHOTS}/rc1-s2-8-wage-longest-L30-hire-card-360.png` });
    ok('S2-8 360: longest real wage (Coop Hand, Farm L30) "Wage $0.25/s", one line, not clipped', !!l30 && l30.text === 'Wage $0.25/s' && l30.lines === 1 && !l30.clipped && l30.inCard, JSON.stringify(l30));
    await page.evaluate(() => { const e = document.querySelector('#uRow div.wk[data-w=coop_hand] .wage'); [...e.childNodes].find(n => n.nodeType === 3).textContent = 'Wage $999.99/s'; });
    const mx = await line();
    if (shot) await page.locator('#uRow div.wk[data-w=coop_hand]').screenshot({ path: `${SHOTS}/rc1-s2-8-wage-longest-999.99-hire-card-360.png` });
    ok('S2-8 360: longest two-decimal wage "Wage $999.99/s" (stress) stays on one line, not clipped', !!mx && mx.text === 'Wage $999.99/s' && mx.lines === 1 && !mx.clipped && mx.inCard, JSON.stringify(mx));
    await ctx.close(); }
};
// ---------- Art & UX 10:01: '▼−$0.01/s' double-dash check (code points, pseudo-elements, borders) + zoomed pill at 390 ----------
sections.dash = async () => {
  const { ctx, page } = await open({ w: 390, h: 844, dsf: 4, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true }) } });
  await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 1, coinsCents: 1e6, customers: [], nextCustomerInS: 1e9, workers: { coop_hand: { energy: 90, cdS: 5 } } }; });
  // Art glyph check: paint the exact ▼−$0.01/s string (live net cannot go negative under P1q wages).
  await page.evaluate(() => { const e = document.querySelector('#rate'); e.textContent = '\u25BC\u2212$0.01/s'; e.dataset.sign = 'neg'; e.classList.add('neg'); });
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => { const e = document.querySelector('#rate'), out = { text: e.textContent, cps: [...e.textContent].map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')), html: e.innerHTML, deco: [] };
    for (const el of [e, ...e.querySelectorAll('*'), e.parentElement]) for (const ps of [null, '::before', '::after']) { const cs = getComputedStyle(el, ps);
      const c = cs.content; if (ps && c && c !== 'none' && c !== 'normal') out.deco.push(`${el.id || el.className}${ps} content=${c}`);
      if (!ps && el === e) { for (const k of ['borderLeftWidth', 'borderTopWidth', 'borderBottomWidth', 'textDecorationLine', 'outlineStyle', 'boxShadow', 'backgroundImage']) out[k] = cs[k]; } }
    return out; });
  const between = r.cps.slice(r.cps.indexOf('U+25BC') + 1, r.cps.indexOf('U+0024'));
  console.log(`DASH [${ENGINE}] ${JSON.stringify(r)}`);
  ok('Art & UX 10:01: "▼−$0.01/s" — only U+2212 between ▼ and $, no hyphen/dash, no pseudo content, border, underline or outline', r.text === '\u25BC\u2212$0.01/s' && between.join() === 'U+2212' && !/[-\u2010-\u2015\uFE58\uFE63\uFF0D]/.test(r.text) && r.html === r.text && r.deco.length === 0 && r.borderLeftWidth === '0px' && r.borderTopWidth === '0px' && r.borderBottomWidth === '0px' && r.textDecorationLine === 'none' && r.outlineStyle === 'none' && r.boxShadow === 'none' && r.backgroundImage === 'none', JSON.stringify({ between, ...r }));
  if (shot) { const bb = await page.locator('#rate').boundingBox(), p = 6; await page.screenshot({ path: `${SHOTS}/rc1-review-rate-neg-001-zoom-390.png`, clip: { x: bb.x - p, y: bb.y - p, width: bb.width + 2 * p, height: bb.height + 2 * p } });
    const pill = page.locator('#rate').locator('xpath=..'); await pill.screenshot({ path: `${SHOTS}/rc1-review-rate-neg-001-pill-zoom-390.png` }); }
  await ctx.close();
};
// ---------- B5 / B8 Manage all ----------
sections.b58 = async () => {
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const { ctx, page } = await open({ w, h, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true }) } });
    const set = e => page.evaluate(e => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 10, coinsCents: 1e9, manageCdS: 0, workers: { market_hand: { energy: e[0], cdS: 1 }, coop_hand: { energy: e[1], cdS: 1 }, hawker: { energy: e[2], cdS: 0 } } }; }, e);
    await set([81, 90, 98]); await page.waitForTimeout(300);
    const n1 = await page.locator('[data-act=manageAll]').count(), vis1 = await page.locator('[data-act=manageAll]:visible').count();
    ok(`B8 exactly one Farm View Manage all button in the DOM (${w})`, (await page.locator('.farm-manage-all').count()) === 1);
    ok(`B5 workers at 81-98% -> no Manage all shown (${w})`, vis1 === 0, `dom=${n1}`);
    await set([30, 41, 98]); await page.waitForTimeout(300);
    const vis2 = await page.locator('.farm-manage-all:visible').count();
    if (w > 900) { const bb = await page.locator('.farm-manage-all').boundingBox(); ok('B8 desktop Manage sits in the Upgrades header, 44px tall, labelled (S2-5)', bb && bb.width >= 44 && bb.height === 44 && /Refill \d+ tired workers?/.test(await page.locator('.farm-manage-all').innerText()) && (await page.locator('#p-upgrades header .farm-manage-all').count()) === 1, JSON.stringify(bb)); }
    if (w < 900) { await page.locator('[data-nav=upgrades]').click(); }
    await page.locator('[data-tab=workers]').click(); await page.waitForTimeout(300);
    if (w > 900) { await page.evaluate(() => window.eggfarm.dispatch({ type: 'manageAll' })); await page.waitForTimeout(400);
      const d = await page.evaluate(() => { const r = document.querySelector('.farm-manage-all').getBoundingClientRect(); return { h: r.height, w: r.width, text: document.querySelector('.farm-manage-all').innerText }; });
      ok(`Review #2: docked Refill pill >=44px tall during cooldown (${w})`, d.h >= 44 && /^Ready in \d+s$/.test(d.text.trim()), JSON.stringify(d));
      { const bb = await page.evaluate(() => { const rs = [document.querySelector('.farm-manage-all'), ...document.querySelectorAll('.farm-manage-all *')].map(e => e.getBoundingClientRect()).filter(r => r.width);
          const x = Math.min(...rs.map(r => r.left)), y = Math.min(...rs.map(r => r.top)); return { x, y, width: Math.max(...rs.map(r => r.right)) - x, height: Math.max(...rs.map(r => r.bottom)) - y }; }), pad = 16; // pill + overhanging icon // whole pill in frame (Art & UX 10:01)
        ok(`Review #2b: docked Refill pill fully inside the viewport (${w}) — h=${bb && bb.height}px`, !!bb && bb.x >= 0 && bb.y >= 0 && bb.x + bb.width <= w && bb.y + bb.height <= 900, JSON.stringify(bb));
        console.log(`MEASURE docked Refill pill ${w}: button ${JSON.stringify(d)} painted ${JSON.stringify(bb)}`);
        if (shot) { const x = Math.max(0, bb.x - pad), y = Math.max(0, bb.y - pad); await page.screenshot({ path: `${SHOTS}/rc1-review2-docked-refill-cooldown-${w}.png`, clip: { x, y, width: Math.min(w - x, bb.width + 2 * pad), height: bb.height + 2 * pad } }); } }
      await page.evaluate(() => { window.eggfarm.state = { ...window.eggfarm.state, manageCdS: 0 }; }); await page.waitForTimeout(300); }
    const pill = await page.locator('#uRow .manage-all').textContent().catch(() => '');
    ok(`B5 one worker <= 40% -> Farm View button visible + "Refill 1 tired worker" (${w})`, vis2 === 1 && /Refill 1 tired worker/.test(pill), `vis=${vis2} pill=${pill}`);
    await ctx.close();
  }
};

// ---------- Bug 9 narrow phones (360/375/390; 375x600 forces a desktop scrollbar in headed windows) ----------
const lateSave = () => JSON.stringify({ version: 5, savedAt: Date.now(), state: { coinsCents: 123456789, coop: 50, basket: 200, collectionLevel: 15, farmLevel: 15,
  customers: [1, 2, 3, 4, 5].map(i => ({ id: i, demand: 113, filled: i % 2 ? 26 : 0, waitedS: 3 })), nextCustomerInS: 5, nextCustomerId: 9, rng: 5, pendingOfflineEggs: 0, celebratedTier: 2,
  workers: { market_hand: { energy: 30, cdS: 1 }, coop_hand: { energy: 35, cdS: 1 }, hawker: { energy: 20, cdS: 0 } }, graderTier: 0, manageCdS: 0, coopFullS: 0 } });
sections.bug9 = async () => {
  for (const [w, h] of [[360, 640], [375, 812], [375, 600], [390, 844]]) {
    const { ctx, page } = await open({ w, h, ls: { 'eggfarm.save': lateSave(), 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true }) } });
    const cl = page.locator('#modal-layer.open .close'); if (await cl.count()) await cl.click();
    const m = () => page.evaluate(() => { const d = document.documentElement; const wide = [...document.querySelectorAll('#app *, #panel-layer *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > d.clientWidth + 0.5 && getComputedStyle(e).visibility !== 'hidden'; }).length; return { sw: d.scrollWidth, cw: d.clientWidth, bsw: document.body.scrollWidth, wide }; });
    const res = { farm: await m() };
    await page.locator('[data-nav=market]').click(); await page.waitForTimeout(300); res.market = await m();
    const rows = await page.$$eval('#mRows .order:not([hidden])', rs => rs.map(r => { const a = r.getBoundingClientRect(), b = r.querySelector('.btn').getBoundingClientRect(), t = r.querySelector('.l1').getBoundingClientRect(); return { inside: b.right <= a.right - 8 + 0.5 && b.left >= a.left, lines: Math.round(t.height / 19), text: r.querySelector('.l1').innerText }; }));
    if (shot && w === 375 && h === 812) await page.screenshot({ path: `${SHOTS}/m3-rc0-bug9-375-market.png` });
    await page.locator('.sheet:not([hidden]) .close').click(); await page.locator('[data-nav=upgrades]').click(); await page.waitForTimeout(200); res.upgrades = await m();
    await page.locator('[data-tab=workers]').click(); await page.waitForTimeout(200); res.workers = await m();
    const tabs = await page.$$eval('.tabs button', bs => bs.map(b => b.scrollWidth <= b.clientWidth + 1));
    ok(`Bug9 no sideways scroll on farm/market/upgrades/workers at ${w}x${h}`, Object.values(res).every(r => r.sw <= r.cw && r.bsw <= r.cw && r.wide === 0), JSON.stringify(res));
    ok(`Bug9 Sell buttons inside the card (>=8px), order text <=2 lines, short copy at ${w}`, rows.length > 0 && rows.every(r => r.inside && r.lines <= 2) && rows.every(r => /^(\d[\d.KMBT]*\/\d[\d.KMBT]*( eggs)?|✓ Ready)\s*·\s*\$/.test(r.text)), JSON.stringify(rows.slice(0, 2)));
    ok(`Bug9 tab labels not clipped at ${w}`, tabs.every(Boolean), JSON.stringify(tabs));
    await ctx.close();
  }
};

// ---------- S2-4a / S2-4b (playtest session 2) ----------
sections.s2money = async () => {
  const { ctx, page, errors } = await open({ w: 375, h: 700, touch: true, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true }) } });
  const setL11 = c => page.evaluate(c => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 11, collectionLevel: 9, coinsCents: c, basket: 3000, coop: 0, nextCustomerInS: 0.3,
    workers: { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 }, hawker: { energy: 100, cdS: 0 } } }; g.save(); }, c);
  await setL11(100); await page.locator('[data-nav=upgrades]').click(); await page.locator('[data-tab=farm]').click(); await page.waitForTimeout(200);
  // greyed tap: freeze the economy for the tap (no workers), compare state + save before/after
  await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, workers: {}, customers: [], nextCustomerInS: 999, coinsCents: 100 }; g.save(); });
  await page.waitForTimeout(100);
  const pre = await page.evaluate(() => ({ c: window.eggfarm.state.coinsCents, F: window.eggfarm.state.farmLevel, dis: document.querySelector('#uRow .btn.buy').getAttribute('aria-disabled'), sv: localStorage.getItem('eggfarm.save') }));
  await page.locator('#uRow .btn.buy').click({ force: true, timeout: 5000 }); await page.waitForTimeout(300);
  const post = await page.evaluate(() => ({ c: window.eggfarm.state.coinsCents, F: window.eggfarm.state.farmLevel, hdr: document.querySelector('#coins').textContent, sv: localStorage.getItem('eggfarm.save') }));
  ok('S2-4a greyed Farm L12 tap: money, level, header and save unchanged', pre.dis === 'true' && post.c === pre.c && post.F === 11 && post.hdr === '$1.00' && JSON.parse(post.sv).state.coinsCents === JSON.parse(pre.sv).state.coinsCents, JSON.stringify({ pre: { c: pre.c, dis: pre.dis }, post: { c: post.c, F: post.F, hdr: post.hdr } }));
  // live sheet with rAF stalled (occluded / throttled window)
  await setL11(131_800); await page.waitForTimeout(200);
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  const a = await page.evaluate(() => ({ hdr: document.querySelector('#coins').textContent, hint: document.querySelector('#uRow .hint')?.textContent ?? '' }));
  await page.waitForTimeout(4000);
  const z = await page.evaluate(() => { const s = window.eggfarm.state; const d = s.coinsCents / 100; return { hdr: document.querySelector('#coins').textContent, want: '$' + d.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), hint: document.querySelector('#uRow .hint')?.textContent ?? '' }; });
  const num = t => +t.replace(/[$,]/g, '');
  ok('S2-4b header + sheet live with rAF stalled (within one tick of state)', z.hdr !== a.hdr && Math.abs(num(z.hdr) - num(z.want)) < 50 && z.hint !== a.hint, JSON.stringify({ a, z }));
  ok('S2-4 no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
};

// ---------- S2-3a served dwell (MK-16/18/21) ----------
sections.s23a = async () => {
  const { ctx, page, errors } = await open({ w: 375, h: 700, touch: true, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true }) } });
  await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 12, collectionLevel: 9, coinsCents: 1e7, basket: 1500, coop: 0, celebratedTier: 2, customers: [], nextCustomerInS: 0.2,
    workers: { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 }, hawker: { energy: 100, cdS: 0 } } }; });
  const r = await page.evaluate(async () => { let f = 0, vis = 0, served = 0, maxLife = 0; const born = new Map(); const t0 = performance.now();
    while (performance.now() - t0 < 8000) { await new Promise(res => setTimeout(res, 100)); f++;
      const sv = [...document.querySelectorAll('#queue .chip.served')]; if (sv.length) served++;
      for (const el of sv) { if (!born.has(el)) born.set(el, performance.now()); maxLife = Math.max(maxLife, performance.now() - born.get(el)); }
      if (sv.length || document.querySelector('#queue .chip:not(.empty):not(.served)')) vis++; }
    const el = document.querySelector('#queue .chip.served'); const pe = el ? getComputedStyle(el).pointerEvents : 'none';
    return { vis: vis / f, served: served / f, maxLife: Math.round(maxLife), pe, text: el?.textContent ?? '' }; });
  ok('S2-3a MK-21 a customer card visible >= 40% with Market Hand + 1,500 eggs', r.vis >= 0.4, JSON.stringify(r));
  ok('S2-3a MK-16 Thanks card shows and leaves after ~1.5 s', r.served > 0 && r.maxLife <= 1500 + 250, JSON.stringify(r));
  ok('S2-3a MK-18 dwelling card is not tappable', r.pe === 'none');
  const full = await page.evaluate(async () => { const g = window.eggfarm;
    g.state = { ...g.state, workers: {}, basket: 3, nextCustomerInS: 999, customers: [1, 2, 3, 4, 5, 6, 7].map(i => ({ id: 9000 + i, demand: i === 1 ? 3 : 50, filled: 0, waitedS: 0 })) };
    await new Promise(r => setTimeout(r, 300)); g.dispatch({ type: 'sell', customerId: 9001 });
    let served = 0, pop = '';
    for (let i = 0; i < 15; i++) { await new Promise(r => setTimeout(r, 100)); if (document.querySelector('#queue .chip.served')) served++; const f = [...document.querySelectorAll('.qpop')].pop(); if (f) pop = f.textContent; }
    return { served, pop, waiting: g.state.customers.length }; });
  ok('S2-3a ruling: strip full -> no Thanks card, only a +$X pop', full.served === 0 && /^\+\$/.test(full.pop), JSON.stringify(full));
  ok('S2-3a no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
};

// ---------- S2-8/9/10 ----------
sections.s2810 = async () => {
  const { ctx, page, errors } = await open({ w: 375, h: 700, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true }) } });
  // S2-9: queue fills while the player taps Collect -> Market stays closed, queue-full flag set
  await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 3, coop: 300, basket: 0, workers: {}, nextCustomerInS: 1e9,
    customers: Array.from({ length: 6 }, (_, i) => ({ id: 7000 + i, demand: 20, filled: 0, waitedS: 0 })) }; });
  for (let i = 0; i < 8; i++) { await page.locator('#collect').click(); await page.waitForTimeout(60); }
  const q = await page.evaluate(() => ({ market: !document.querySelector('#p-market').hidden, flag: document.querySelector('[data-nav=market]').dataset.queueFull, rates: window.eggfarmUi.rates().queueFull }));
  ok('S2-9 queue full: Market sheet does not open by itself; queue-full flag exposed', !q.market && q.flag === 'true' && q.rates === true, JSON.stringify(q));
  // S2-8: rates readable
  const r = await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, workers: { market_hand: { energy: 100, cdS: 0 } } }; return window.eggfarmUi.rates(); });
  ok('S2-8 ui.rates(): Market Hand wage 1.25 c/s (exact) at L3; net = income - wages (no double subtract)', r.workers.market_hand.wageCentsPerSec === 1.25 && Math.abs(r.netCentsPerSec - (r.incomeCentsPerSec - r.wageCentsPerSec)) < 1e-6 && r.netCentsPerSec > r.incomeCentsPerSec - 2 * r.wageCentsPerSec - 1e-6, JSON.stringify(r));
  // S2-10: redraw right after an action, even with rAF stalled
  await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 5, collectionLevel: 3, coinsCents: 5e6, workers: {}, customers: [] }; });
  await page.locator('[data-nav=upgrades]').click(); await page.locator('[data-tab=farm]').click(); await page.waitForTimeout(200);
  const z = await page.evaluate(() => { window.requestAnimationFrame = () => 0; const g = window.eggfarm, out = [];
    for (let i = 0; i < 3; i++) { document.querySelector('#uRow .btn.buy').click(); out.push([g.state.farmLevel, document.querySelector('#uRow .lv').textContent]); } return out; });
  ok('S2-10 sheet shows each purchase synchronously (no one-action lag, rAF stalled)', z.every(([F, lv], i) => lv === `L${F}` && F === 6 + i), JSON.stringify(z));
  ok('S2-8/9/10 no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
};

// ---------- Fast Collect taps: 10 taps 50 ms apart -> 10 collects (or as many as eggs allow) ----------
sections.fastcollect = async () => {
  const { ctx, page, errors } = await open({ w: 375, h: 700, touch: true, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true }) } });
  for (const [target, coop] of [['#collect', 500], ['#scene', 500], ['#collect', 23]]) {
    // Freeze the sim clock for the whole tap burst. The hens lay 1.5 eggs/s at L0, so on a slow box (10 taps taking
    // > ~0.65 s) the coop regrew a whole egg and a correct extra collect happened (flaky "-> 5, got 6"). g.frame() first
    // flushes any pending catch-up on the real clock, so it can't land on top of the seeded coop. Taps are what we test.
    const exp = await page.evaluate(coop => { const g = window.eggfarm; g.frame(); const t = Date.now(); window.__realNow ??= Date.now; Date.now = () => t; g.state = { ...g.state, farmLevel: 0, collectionLevel: 0, coop, basket: 0, workers: {}, customers: [], nextCustomerInS: 1e9 };
      window.__n = 0; if (!window.__fc) { window.__fc = 1; g.on(e => { if (e.type === 'collect' && e.eggs > 0) window.__n++; }); }
      const per = 5; return Math.min(10, Math.floor(coop / per) + (coop % per ? 1 : 0)); }, coop);
    const b = await page.locator(target).boundingBox(); const x = b.x + b.width / 2, y = b.y + Math.min(b.height / 2, 60);
    for (let i = 0; i < 10; i++) { await page.touchscreen.tap(x, y); await page.waitForTimeout(50); }
    await page.waitForTimeout(300); const n = await page.evaluate(() => { const n = window.__n; Date.now = window.__realNow; window.eggfarm.frame(); return n; });
    ok(`Fast Collect: 10 taps on ${target} 50 ms apart (coop ${coop}) -> ${exp} collects`, n === exp, `got ${n}`);
  }
  ok('Fast Collect no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
};

// ---------- P1 Vadim playtest: FTUE sell step with no customer (1280) + no caret after clicking the farm ----------
sections.p1ftue = async () => {
  const { ctx, page } = await open({ w: 1280, h: 800 });
  const st = () => page.evaluate(() => { const c = document.querySelector('#collect').getBoundingClientRect(); const top = document.elementFromPoint(c.x + c.width / 2, c.y + c.height / 2);
    const ring = document.querySelector('.onb-ring'); return { step: window.eggfarmOnb?.step, mode: window.eggfarmOnb?.mode, cap: document.querySelector('.onb-txt')?.textContent ?? '', ring: ring ? getComputedStyle(ring).display : 'gone',
      collectTop: !!top && (top.id === 'collect' || !!top.closest('#collect')), cust: window.eggfarm.state.customers.length }; });
  await page.waitForFunction(() => window.eggfarm.state.coop >= 5, null, { timeout: 30000 }); await page.click('#collect'); await page.waitForTimeout(200);
  await page.evaluate(() => { window.eggfarm.state = { ...window.eggfarm.state, customers: [], nextCustomerInS: 30 }; }); await page.waitForTimeout(400);
  const a = await st();
  ok('P1 FTUE sell step, no customer: wait hint, no spotlight, no "customer is waiting"', a.step === 1 && a.mode !== 'mark' && a.ring === 'none' && !/waiting|Tap them/i.test(a.cap), JSON.stringify(a));
  ok('P1 FTUE no customer: Collect is the top element (not blocked)', a.collectTop, JSON.stringify(a));
  await page.click('#collect', { timeout: 2000 }); ok('P1 FTUE no customer: Collect click works', true);
  await page.evaluate(() => { window.eggfarm.state = { ...window.eggfarm.state, nextCustomerInS: 0.5 }; });
  await page.waitForFunction(() => window.eggfarm.state.customers.length > 0 && window.eggfarmOnb?.mode === 'mark', null, { timeout: 5000 }).catch(() => {});
  const b = await st();
  ok('P1 FTUE customer arrives: spotlight returns and Collect still clickable', b.mode === 'mark' && b.ring !== 'none' && b.collectTop, JSON.stringify(b));
  const sell = page.locator('#mRows button[data-id]').first(); await sell.click({ timeout: 3000 }); await page.waitForTimeout(200);
  ok('P1 FTUE sell completes step 2 (no softlock)', (await st()).step === 2, JSON.stringify(await st()));
  await ctx.close();
};
sections.p1caret = async () => {
  for (const [w, h] of [[1280, 800], [390, 844]]) {
    const { ctx, page } = await open({ w, h, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true }) } });
    const sc = await page.locator('#scene').boundingBox();
    for (const [fx, fy] of [[0.5, 0.7], [0.2, 0.85], [0.8, 0.6]]) await page.mouse.click(sc.x + sc.width * fx, sc.y + sc.height * fy);
    await page.mouse.dblclick(sc.x + sc.width * 0.5, sc.y + sc.height * 0.8);
    const r = await page.evaluate(() => { const s = getSelection(), sc = document.querySelector('#scene'); const inScene = !!s && s.rangeCount > 0 && sc.contains(s.anchorNode);
      const cs = getComputedStyle(sc); return { inScene, type: s?.type, text: String(s), ce: document.querySelectorAll('#app [contenteditable]:not([contenteditable=false])').length, us: cs.userSelect || cs.webkitUserSelect, caret: cs.caretColor, active: document.activeElement?.isContentEditable }; });
    ok(`P1 caret: clicking the farm leaves no caret/selection in the scene (${w})`, !r.inScene && !r.text && r.ce === 0 && r.us === 'none' && /rgba\(0, 0, 0, 0\)|transparent/.test(r.caret) && !r.active, JSON.stringify(r));
    await ctx.close();
  }
};

// ---------- Product Oct 16: upgrade-card ETA "Affordable in …" at 360 (one line, muted grey, clock icon) ----------
sections.p1eta = async () => {
  const { ctx, page } = await open({ w: 360, h: 800, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true }) } });
  await page.locator('[data-nav=upgrades]').click(); await page.locator('[data-tab=farm]').click(); await page.waitForSelector('#uRow .hint.eta', { timeout: 5000 });
  const muted = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--c-muted').trim());
  // noincome: layout stub — steady-state incomePerSec is >0 at F0/C0 (UC13); '—' only when income ≤ 0 (unit-tested).
  for (const [name, text] of [['noincome', 'Affordable in —'], ['1h05', 'Affordable in ~1:05:00'], ['moment', 'Affordable in a moment']]) {
    await page.evaluate(t => { window.__etaStub = t; }, text);
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => { const h = document.querySelector('#uRow .hint.eta'); if (window.__etaStub) { h.lastChild.textContent = window.__etaStub; }
      const img = h.querySelector('img'); const cs = getComputedStyle(h); const range = document.createRange(); range.selectNodeContents(h.lastChild); const lines = range.getClientRects().length;
      const card = h.closest('.up') ?? h.parentElement; const c = card.getBoundingClientRect(), hr = h.getBoundingClientRect();
      return { text: h.textContent.trim(), lines, color: cs.color, icon: img?.getAttribute('src')?.includes('offline-earnings') || /offline-earnings/.test(img?.src ?? ''), inside: hr.right <= c.right + 0.5 && hr.left >= c.left - 0.5, card: [c.x, c.y, c.width, c.height] }; });
    const hex = muted.replace('#', ''); const rgb = `rgb(${parseInt(hex.slice(0, 2), 16)}, ${parseInt(hex.slice(2, 4), 16)}, ${parseInt(hex.slice(4, 6), 16)})`;
    ok(`ETA ${name} at 360: ${text ?? 'Affordable in —'} one line, muted grey, clock icon`, r.text === (text ?? 'Affordable in —') && r.lines === 1 && r.color === rgb && r.icon && r.inside, JSON.stringify(r));
    if (shot) { const [x, y, w, h] = r.card; await page.screenshot({ path: `${SHOTS}/eta-360-${name}.png`, clip: { x: Math.max(0, x - 8), y: Math.max(0, y - 8), width: Math.min(360 - Math.max(0, x - 8), w + 16), height: h + 16 } }); }
  }
  await ctx.close();
};

// ---------- P1 Vadim playtest: "Coop upgraded!" toast fully visible below the HUD (1280, 390) ----------
sections.p1toast = async () => {
  for (const [w, h] of [[1280, 800], [390, 844]]) {
    const { ctx, page } = await open({ w, h, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true }) } });
    await page.evaluate(() => { window.eggfarm.state = { ...window.eggfarm.state, farmLevel: 4, coinsCents: 1e9 }; });
    if (w < 960) await page.locator('[data-nav=upgrades]').click();
    await page.locator('[data-tab=farm]').click(); await page.locator('#uRow .btn.buy').click();
    await page.waitForSelector('.toast.show', { timeout: 3000 }); await page.waitForTimeout(450);
    const r = await page.evaluate(() => { const t = [...document.querySelectorAll('.toast.show')].find(e => /Coop upgraded/.test(e.textContent)); const hud = document.querySelector('.hud');
      const a = t.getBoundingClientRect(), b = hud.getBoundingClientRect(); const cx = a.left + a.width / 2, cy = a.top + a.height / 2; const pe = t.style.pointerEvents; t.style.pointerEvents = 'auto'; const top = document.elementFromPoint(cx, cy); t.style.pointerEvents = pe; /* toast is pointer-events:none; probe paint order */
      return { t: [a.left, a.top, a.right, a.bottom].map(Math.round), hud: [b.left, b.top, b.right, b.bottom].map(Math.round), vw: innerWidth, vh: innerHeight, z: getComputedStyle(t).zIndex, hudZ: getComputedStyle(hud).zIndex, onTop: !!top && t.contains(top) }; });
    const [l, tp, rr, bt] = r.t;
    ok(`P1 toast "Coop upgraded!" fully inside viewport, below HUD, on top (${w})`, l >= 0 && tp >= 0 && rr <= r.vw && bt <= r.vh && tp >= r.hud[3] && r.onTop, JSON.stringify(r));
    if (shot) await page.screenshot({ path: `${SHOTS}/p1-toast-coop-upgraded-${w}.png` });
    await ctx.close();
  }
};

// ---------- Art & UX Oct 16: per-worker Refill (nav glyph, >=44px, muted+disabled never hidden) at 360 ----------
sections.p1refill = async () => {
  for (const [name, energy, cd, cap] of [['available', 30, 0, ''], ['not-tired', 90, 0, 'Rested, refill below 40%'], ['cooldown', 30, 12, 'Ready in 12s']]) {
    const sv = JSON.stringify({ version: 5, savedAt: Date.now(), state: { coinsCents: 500000, coop: 0, basket: 0, collectionLevel: 5, farmLevel: 5, customers: [], nextCustomerInS: 50, nextCustomerId: 1, rng: 5, pendingOfflineEggs: 0, celebratedTier: 1,
      workers: { market_hand: { energy, cdS: 1 } }, graderTier: 0, manageCdS: cd, coopFullS: 0 } });
    const { ctx, page } = await open({ w: 360, h: 800, ls: { 'eggfarm.save': sv, 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false }) } });
    const cl = page.locator('#modal-layer.open .close'); if (await cl.count()) await cl.click();
    await page.evaluate(([e, c]) => { const st = window.eggfarm.state; window.eggfarm.state = { ...st, manageCdS: c, workers: { ...st.workers, market_hand: { ...st.workers.market_hand, energy: e } } }; }, [energy, cd]);
    await page.locator('[data-nav=upgrades]').click(); await page.locator('[data-tab=workers]').click(); await page.waitForTimeout(300);
    const r = await page.evaluate(() => { const card = document.querySelector('.wk[data-w=market_hand]'); const btn = card?.querySelector('button[data-act=manage]'); if (!btn) return { missing: true };
      const a = btn.getBoundingClientRect(), img = btn.querySelector('img'), nav = document.querySelector('.nav-manage img'), cs = getComputedStyle(btn);
      return { text: btn.textContent.trim(), w: a.width, h: a.height, vis: cs.display !== 'none' && cs.visibility !== 'hidden' && !btn.hidden, dis: btn.getAttribute('aria-disabled'), glyph: img?.getAttribute('src') === nav?.getAttribute('src'), iw: img?.width, nw: nav?.width,
        cap: card.querySelector('.wk-cap')?.textContent ?? '', bg: cs.backgroundColor, card: (() => { const c = card.getBoundingClientRect(); return [c.x, c.y, c.width, c.height]; })() }; });
    const wantDis = name === 'available' ? 'false' : 'true';
    ok(`Refill worker card ${name} at 360: shown, nav glyph, >=44px, disabled=${wantDis}, caption "${cap}"`, !r.missing && r.text === 'Refill' && r.vis && r.glyph && r.iw === r.nw && r.w >= 44 && r.h >= 44 && r.dis === wantDis && r.cap.trim() === cap, JSON.stringify(r));
    if (shot && r.card) { await page.locator('.wk[data-w=market_hand]').scrollIntoViewIfNeeded(); const bb = await page.locator('.wk[data-w=market_hand]').boundingBox(); await page.screenshot({ path: `${SHOTS}/refill-worker-360-${name}.png`, clip: { x: Math.max(0, bb.x - 8), y: Math.max(0, bb.y - 8), width: Math.min(360, bb.width + 16), height: bb.height + 16 } }); }
    await ctx.close();
  }
};

// ---------- C-AC25 Welcome-back "+N / eggs added to your basket" (360) ----------
sections.p1welcome = async () => {
  for (const [n, hero, l2] of [[1234567, '+1,234,567', 'eggs added to your basket'], [1, '+1', 'egg added to your basket'], [9999999, '+9,999,999', 'eggs added to your basket'], [12345678, '+12.3M', 'eggs added to your basket']]) {
    const sv = JSON.stringify({ version: 5, savedAt: Date.now() - 3600e3, state: { coinsCents: 0, coop: 0, basket: 7, collectionLevel: 0, farmLevel: 0, customers: [], nextCustomerInS: 50, nextCustomerId: 1, rng: 5, pendingOfflineEggs: n, celebratedTier: 0,
      workers: {}, graderTier: 0, manageCdS: 0, coopFullS: 0 } });
    const { ctx, page } = await open({ w: 360, h: 800, ls: { 'eggfarm.save': sv, 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false }) } });
    await page.waitForSelector('#wbGain', { timeout: 5000 }); // natural offline popup first; then pin N exactly via the QA hook
    await page.evaluate(n => { const g = window.eggfarm; g.state = { ...g.state, pendingOfflineEggs: n }; window.eggfarmQaWelcome(); }, n); await page.waitForTimeout(400);
    const r = await page.evaluate(() => { const g = document.querySelector('#wbGain'), h = g.querySelector('.wb-hero'), l = g.querySelector('.wb-line2'); const card = g.closest('.card').getBoundingClientRect();
      const fit = e => e.scrollWidth <= e.clientWidth + 1 && getComputedStyle(e).textOverflow !== 'ellipsis'; const hr = h.getBoundingClientRect(), lr = l.getBoundingClientRect();
      return { hero: h.textContent.trim(), l2: l.textContent.trim(), font: getComputedStyle(h).fontFamily, weight: getComputedStyle(h).fontWeight, anim: getComputedStyle(h).animationName, fit: fit(h) && fit(l), twoLines: lr.top >= hr.bottom - 1,
        centred: Math.abs((hr.left + hr.right) / 2 - (card.left + card.right) / 2) < 3 && Math.abs((lr.left + lr.right) / 2 - (card.left + card.right) / 2) < 3, inside: hr.left >= card.left && hr.right <= card.right && lr.left >= card.left && lr.right <= card.right,
        pend: window.eggfarm.state.pendingOfflineEggs, basket: window.eggfarm.state.basket }; });
    ok(`C-AC25 N=${n}: "${hero}" / "${l2}", two centred lines, Fredoka bold + pop, no truncation (360)`, r.hero === hero && r.l2 === l2 && /Fredoka/i.test(r.font) && +r.weight >= 700 && r.anim === 'popin' && r.fit && r.twoLines && r.centred && r.inside, JSON.stringify(r));
    if (shot && n === 1234567) await page.screenshot({ path: `${SHOTS}/c-ac25-welcome-360-1234567.png` });
    const before = await page.evaluate(() => window.eggfarm.state.basket); await page.click('#wbCollect'); const after = await page.evaluate(() => window.eggfarm.state.basket);
    ok(`C-AC25(d) N=${n}: Collect adds exactly N to the Basket`, after - before === r.pend, `before=${before} after=${after} N=${r.pend}`);
    await ctx.close();
  }
};

// ---------- Product Oct 16: visible "build <sha>" tag, readable, outside tap areas ----------
sections.p1build = async () => {
  for (const [w, h] of [[360, 800], [390, 844], [1280, 800]]) {
    const { ctx, page } = await open({ w, h, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true }) } });
    const r = await page.evaluate(() => { const t = document.querySelector('#buildTag'); const a = t.getBoundingClientRect(); const cs = getComputedStyle(t);
      const hits = [...document.querySelectorAll('button, a, [data-act], .chip, input')].filter(e => { const b = e.getBoundingClientRect(); return b.width && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; }).map(e => e.id || e.className);
      return { text: t.textContent, w: a.width, full: t.scrollWidth <= t.clientWidth + 1, inView: a.left >= 0 && a.right <= innerWidth && a.top >= 0, pe: cs.pointerEvents, fs: parseFloat(cs.fontSize), hits }; });
    ok(`Build tag "build <sha>" visible, not truncated, no tap overlap (${w})`, /^build [0-9a-f]{7,}$/.test(r.text) && r.w > 0 && r.full && r.inView && r.pe === 'none' && r.fs >= 10 && r.hits.length === 0, JSON.stringify(r));
    if (shot && w !== 390) await page.screenshot({ path: `${SHOTS}/build-tag-hud-${w}.png`, clip: { x: 0, y: 0, width: w, height: 64 } });
    await ctx.close();
  }
};
// ---------- v1.6.1 §4 goal label at 360 (review #6: expectations from the MEASURED live label box, no forced width) ----------
sections.goalLabel161 = async () => {
  const { ctx, page } = await open({ w: 360, h: 800, touch: true, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false }) } });
  await page.waitForSelector('.goal-label'); await page.waitForTimeout(300);
  const seen = new Set();
  for (const [name, full, short, gain, fs] of [['farm', 'Farm L30', 'Farm L30', '· +999% income', 0], ['collection', 'Collection L30', 'Coll. L30', '· +999% income', 0],
    ['stress-wrap', 'Hire Market Hand', 'Hire M. Hand', '· +99999% income', 0], ['short-name', 'Collection L30', 'Coll. L30', '· +999% income', 30]]) {
    const r = await page.evaluate(async ([full, short, gain, fs]) => { const el = document.querySelector('.goal-label'); el.style.fontSize = fs ? fs + 'px' : ''; el.style.lineHeight = fs ? Math.round(fs * 17 / 14) + 'px' : '';
      const mk = t => `<span class="g-head"><span class="g-star">★ </span><span class="g-track" data-full="${full}" data-short="${short}">${t}</span></span><span class="g-gain">${gain}</span>`;
      // measure natural widths in a probe that inherits the label's font, outside the flex box
      const probe = document.createElement('span'); probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:-9999px'; el.append(probe);
      const W = html => { probe.innerHTML = html; return probe.getBoundingClientRect().width; };
      const cs0 = getComputedStyle(el); const gap = parseFloat(cs0.columnGap) || 0;
      probe.innerHTML = mk(full); const headF = probe.querySelector('.g-head').getBoundingClientRect().width, gainW = probe.querySelector('.g-gain').getBoundingClientRect().width;
      probe.innerHTML = mk(short); const headS = probe.querySelector('.g-head').getBoundingClientRect().width; probe.remove();
      el.innerHTML = mk(full); window.eggfarmQaFitGoal(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const box = el.clientWidth;
      const want = headF + gap + gainW <= box + 0.5 ? { lines: 1, track: full } : headF <= box + 0.5 && gainW <= box + 0.5 ? { lines: 2, track: full } : { lines: 2, track: short };
      const cs = getComputedStyle(el), lh = parseFloat(cs.lineHeight), t = el.querySelector('.g-track'), gn = el.querySelector('.g-gain'), pill = el.closest('.goal-pill') ?? el.closest('.goal');
      const lines = Math.round(el.getBoundingClientRect().height / lh);
      return { want, box, headF: Math.round(headF), headS: Math.round(headS), gainW: Math.round(gainW), track: t.textContent, gain: gn.textContent, lines, gainRects: gn.getClientRects().length, lh, sw: el.scrollWidth, to: cs.textOverflow, ell: /…/.test(el.textContent), pillH: Math.round(pill.getBoundingClientRect().height), gainBelow: gn.offsetTop > t.offsetTop + 2, gainX: Math.round(gn.getBoundingClientRect().left - t.getBoundingClientRect().right) }; }, [full, short, gain, fs]);
    seen.add(r.want.lines === 1 ? 'one-line' : r.want.track === full ? 'two-line' : 'short-name');
    ok(`Goal label v1.6.1 ${name} at 360 (measured box ${r.box}px): expect ${r.want.lines} line(s) "${r.want.track}", gain unsplit, no ellipsis, strip 40px`,
      r.track === r.want.track && r.lines === r.want.lines && r.gainRects === 1 && r.gain === gain && r.to !== 'ellipsis' && !r.ell && r.sw <= r.box + 0.5 && (r.want.lines === 2 ? r.gainBelow : !r.gainBelow && r.gainX >= 3) && (fs || (r.lh === 17 && r.pillH === 40)), JSON.stringify(r));
    const FCS = process.env.FC_SHOTS; if (FCS) { mkdirSync(FCS, { recursive: true }); const bb = await page.locator('.goal').boundingBox(); await page.screenshot({ path: `${FCS}/cuta3-goal-${name}-360-${ENGINE}.png`, clip: { x: 0, y: Math.max(0, bb.y - 8), width: 360, height: bb.height + 16 } }); }
  }
  ok('Goal label v1.6.1 at 360: one-line, two-line and short-name paths all exercised', ['one-line', 'two-line', 'short-name'].every(k => seen.has(k)), JSON.stringify([...seen]));
  await ctx.close();
};
// ---------- Art & UX 23:25: sticky refill bar opaque + full width + 8px padding; cards scroll-margin (360, 1280 docked) ----------
sections.refillBar = async () => {
  for (const [w, h] of [[360, 800], [1280, 800]]) {
    const sv = JSON.stringify({ version: 5, savedAt: Date.now(), state: { coinsCents: 0, coop: 0, basket: 0, collectionLevel: 10, farmLevel: 12, customers: [], nextCustomerInS: 1e9, nextCustomerId: 9, rng: 5, pendingOfflineEggs: 0, celebratedTier: 2,
      workers: { market_hand: { energy: 0, cdS: 0, unpaid: true }, coop_hand: { energy: 0, cdS: 0 } }, graderTier: 0, manageCdS: 0, coopFullS: 0 } });
    const { ctx, page } = await open({ w, h, touch: w < 600, ls: { 'eggfarm.save': sv, 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false }) } });
    if (await page.locator('[data-nav=upgrades]').isVisible()) await page.locator('[data-nav=upgrades]').click(); await page.locator('[data-tab=workers]').click();
    const has = await page.waitForSelector('#uRow > .refill-wrap', { timeout: 5000 }).then(() => true, () => false);
    if (!has) { ok(`Refill bar ${w}: sticky bar present`, false, 'no #uRow > .refill-wrap in this state'); await ctx.close(); continue; }
    const r = await page.evaluate(async () => { const b = document.querySelector('#uRow > .refill-wrap'), row = document.querySelector('#uRow'), cs = getComputedStyle(b), a = b.getBoundingClientRect();
      const sheet = row.closest('.sheet, .panel, [id^=p-]') ?? row.parentElement; const sr = sheet.getBoundingClientRect();
      const cards = [...row.querySelectorAll('.wk')]; const last = cards[cards.length - 1];
      const varH = parseFloat(getComputedStyle(row).getPropertyValue('--refill-bar-h')); const sm = parseFloat(getComputedStyle(last).scrollMarginTop);
      last.scrollIntoView({ block: 'start' }); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const a2 = b.getBoundingClientRect(), c2 = last.getBoundingClientRect();
      // opacity: sample the element under a point inside the bar's padding; it must be the bar (or its child), not a card behind
      const hit = document.elementFromPoint(a2.left + 4, a2.top + 3); const onBar = !!hit && (hit === b || b.contains(hit));
      return { bg: cs.backgroundColor, pt: cs.paddingTop, pb: cs.paddingBottom, barW: Math.round(a.width), sheetW: Math.round(sr.width), barL: Math.round(a.left - sr.left), varH, barH: Math.round(a.height), sm, cardTop: Math.round(c2.top), barBottom: Math.round(a2.bottom), onBar }; });
    const opaque = /^rgb\(/.test(r.bg) || /, 1\)$/.test(r.bg);
    ok(`Refill bar ${w}: opaque cream, 8px top / 10px bottom padding (cuta3 designer); --refill-bar-h = measured bar + 8; scrolled card clears the bar`,
      opaque && r.pt === '8px' && r.pb === '10px' && Math.abs(r.varH - (r.barH + 8)) <= 1 && r.sm === r.varH && r.cardTop >= r.barBottom - 0.5 && r.onBar, JSON.stringify(r));
    const FCS = process.env.FC_SHOTS; if (FCS) { mkdirSync(FCS, { recursive: true }); await page.evaluate(() => { const row = document.querySelector('#uRow'); const sc = row.closest('.body') ?? row.parentElement; sc.scrollTop = 120; }); await page.waitForTimeout(200); await page.screenshot({ path: `${FCS}/cuta3-refillbar-${w}-${ENGINE}.png` }); }
    await ctx.close();
  }
};
// ---------- rc2-order-sell-preview v1.1 + MK-35: order line fit at 360/375/390/1280 (value never cut; " eggs" dropped first, always at <=375; ✓ Ready; 3-sig counts; 0 eggs -> No eggs) ----------
sections.orderFit11 = async () => {
  const FCS = process.env.FC_SHOTS;
  for (const [w, h] of [[360, 800], [375, 800], [390, 844], [1280, 800]]) {
    const { ctx, page } = await open({ w, h, touch: w < 600, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false }) } });
    const set = bk => page.evaluate(([bk]) => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 30, basket: bk, customers: [{ id: 1, demand: 181.2e9, filled: 1.8e6, waitedS: 0 }, { id: 7, demand: 3976000, filled: 0, waitedS: 0 }, { id: 2, demand: 5, filled: 0, waitedS: 0 }, { id: 3, demand: 9.99e6, filled: 1234567, waitedS: 0 }, { id: 4, demand: 1.8e6, filled: 0, waitedS: 0 }], nextCustomerInS: 1e9 }; }, [bk]);
    await set(0); await page.waitForTimeout(400);
    if (!(await page.locator('.order .l1').first().isVisible().catch(() => false))) { await page.locator('#queue .chip:not(.empty)').first().click({ force: true }).catch(() => {}); await page.waitForTimeout(400); }
    if (!(await page.locator('.order .l1').first().isVisible().catch(() => false))) await page.locator('[data-nav=market]').click().catch(() => {});
    await page.waitForSelector('.order .l1', { timeout: 5000 });
    for (const [name, bk] of [['need', 0], ['partial', 3], ['sell', 1e12]]) {
      await set(bk); await page.waitForTimeout(500);
      const r = await page.$$eval('.order:not([hidden])', rs => rs.filter(x => x.getBoundingClientRect().height > 0).map(x => { const l = x.querySelector('.l1'), e = l.querySelector('.e'), v = l.querySelector('.v'), b = x.querySelector('.btn'), bs = getComputedStyle(b), br = b.getBoundingClientRect(), vr = v.getBoundingClientRect(), xr = x.getBoundingClientRect();
        return { e: e.textContent, v: v.textContent.trim(), btn: b.textContent, bh: Math.round(br.height), bOver: b.scrollWidth > b.clientWidth + 0.5, vOver: v.scrollWidth > v.clientWidth + 0.5 || vr.right > br.left + 0.5, lOver: l.scrollWidth > l.clientWidth + 0.5, bw: Math.round(br.width), fs: bs.fontSize, inCard: br.right <= xr.right + 0.5 }; }));
      const good = r.length >= 4 && r.every(x => !x.vOver && !x.lOver && !x.bOver && x.bh === 44 && x.inCard && !/…/.test(x.e + x.v + x.btn) && /^· \$/.test(x.v)
        && (w > 375 || !/ eggs$/.test(x.e)) && !/\d{4,}/.test(x.e) && (bk === 0 ? x.btn === 'No eggs' : true) && !/Need|\//.test(x.btn) && x.bw === r[0].bw && (!/[KMBT]$/.test(x.v) || x.v.replace(/\D/g, '').length <= 3) && (!/\d[KMBT]/.test(x.e) || x.e.split('/').every(q => !/[KMBT]/.test(q) || q.replace(/\D/g, '').length <= 3)) && (bk >= 1e12 ? x.e === '✓ Ready' : !/Ready/.test(x.e)));
      const v994 = r.find(x => x.v === '· $9.94M'); const need18 = r.find(x => /^1\.8M\/181B/.test(x.e) || x.e === '✓ Ready');
      const small = r.find(x => /^[03]\/5/.test(x.e));
      ok(`Order fit v1.1 ${name} at ${w}: value never cut (incl. row 2 '· $9.94M'), " eggs" dropped first (always <=375), 3-sig counts (incl. 1.8M/181B row), no 'Need x/y' button, fixed equal button width, ${bk === 0 ? '"No eggs", ' : ''}${bk >= 1e12 ? '"✓ Ready", ' : ''}44px buttons`, good && !!v994 && !!need18 && (w <= 375 || bk >= 1e12 || !small || / eggs$/.test(small.e)), JSON.stringify(r));
      if (FCS && (w === 360 || w === 1280)) { mkdirSync(FCS, { recursive: true }); await page.screenshot({ path: `${FCS}/order-${name}-${w}-${ENGINE}.png` }); }
    }
    await ctx.close();
  }
};
// ---------- Cut A v3 (QA Major): Farm card "Limited by collecting ›" never overlaps the "Pays back in" chip (360/375/390, all engines) ----------
sections.farmLimit = async () => {
  const FCS = process.env.FC_SHOTS;
  for (const [w, h] of [[360, 800], [375, 800], [390, 800], [1280, 800]]) for (const [name, coins] of [['affordable', 5e6], ['unaffordable', 995]]) {
    const sv = JSON.stringify({ version: 5, savedAt: Date.now(), state: { coinsCents: coins, coop: 0, basket: 0, collectionLevel: 5, farmLevel: 6, customers: [],
      nextCustomerInS: 1e9, nextCustomerId: 9, rng: 5, pendingOfflineEggs: 0, celebratedTier: 2, workers: {}, graderTier: 0, manageCdS: 0, coopFullS: 0 } });
    const { ctx, page } = await open({ w, h, touch: w < 600, ls: { 'eggfarm.save': sv, 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false }) } });
    if (await page.locator('[data-nav=upgrades]').isVisible()) await page.locator('[data-nav=upgrades]').click(); if (await page.locator('[data-tab=farm]').isVisible()) await page.locator('[data-tab=farm]').click(); await page.waitForSelector('#uRow .hint.limit .link', { timeout: 5000 }); await page.waitForTimeout(250);
    const r = await page.evaluate(() => { const L = document.querySelector('#uRow .hint.limit .link'), wrap = L.parentElement, card = L.closest('.up'), C = card.querySelector('.vchip.pb');
      const R = e => { const a = e.getBoundingClientRect(); return [a.left, a.top, a.right, a.bottom].map(v => Math.round(v * 10) / 10); };
      const hit = R(L); const bs = getComputedStyle(L, '::before'); const it = parseFloat(bs.top), ib = parseFloat(bs.bottom); const hitBox = [hit[0], hit[1] + it, hit[2], hit[3] - ib]; const bh = hitBox[3] - hitBox[1]; const B = R(card.querySelector('.btn')); const ms = getComputedStyle(L);
      const ov = (a, b) => !(a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1]);
      return { link: hit, chip: C ? R(C) : null, card: R(card), pos: getComputedStyle(wrap).position, hitH: bh, text: L.textContent.trim(),
        overlap: C ? ov(hit, R(C)) : false, hitOverlap: C ? ov(hitBox, R(C)) : false, inCard: hit[1] >= R(card)[1] && hit[3] <= R(card)[3], eta: !!card.querySelector('.hint.eta'), inset: [it, ib], negMargin: parseFloat(ms.marginTop) < 0 || parseFloat(ms.marginBottom) < 0, buy: B, gap: Math.round((hit[1] - B[3]) * 10) / 10, hitVsBuy: ov(hitBox, B) }; });
    ok(`Cut A v3 farm card ${name} at ${w}: limiter link (glyph + 44px hit) clear of "Pays back in" chip, in flow, inside card, below Buy >=8px, ::before inset -14px`, r.chip && !r.overlap && !r.hitOverlap && r.pos === 'static' && r.hitH >= 44 && r.inset[0] === -14 && r.inset[1] === -14 && !r.negMargin && r.gap >= 8 && !r.hitVsBuy && r.inCard && r.text === 'Limited by collecting ›', JSON.stringify(r));
    if (FCS) { mkdirSync(FCS, { recursive: true }); const [x, y, x2, y2] = r.card; await page.screenshot({ path: `${FCS}/cuta3-farmcard-${name}-${w}-${ENGINE}.png`, clip: { x: Math.max(0, x - 8), y: Math.max(0, y - 8), width: Math.min(w - Math.max(0, x - 8), x2 - x + 16), height: y2 - y + 16 } }); if (name === 'affordable') await page.screenshot({ path: `${FCS}/cuta3-full-${w}-${ENGINE}.png` }); }
    await ctx.close();
  }
};
// ---------- M4-safety: a save from a newer build is refused untouched (no game, no autosave, .bak/IndexedDB untouched) ----------
sections.newersave = async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  const m4 = JSON.stringify({ version: 99, savedAt: Date.now(), state: { coinsCents: 4242, futureField: 1 } });
  const bak = JSON.stringify({ version: 99, savedAt: Date.now() - 5000, state: { coinsCents: 4000 } });
  await page.addInitScript(([a, c]) => { if (sessionStorage.getItem('seeded')) return; localStorage.setItem('eggfarm.save', a); localStorage.setItem('eggfarm.save.bak', c); sessionStorage.setItem('seeded', '1'); }, [m4, bak]);
  await page.goto(URL0, { waitUntil: 'domcontentloaded' }); await page.getByText('Tap to start').click();
  await page.waitForSelector('.recovery-layer.newer-save', { timeout: 8000 });
  const title = await page.textContent('.newer-save h2');
  await page.waitForTimeout(3500); // > one autosave tick and a few frames
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const st = await page.evaluate(async () => { const keys = Object.keys(localStorage).filter(k => k.startsWith('eggfarm.save'));
    const idb = await new Promise(res => { const r = indexedDB.open('eggfarm'); r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains('save')) return res(null); const g = db.transaction('save').objectStore('save').get('main'); g.onsuccess = () => res(g.result ?? null); g.onerror = () => res('err'); }; r.onerror = () => res('err'); });
    return { save: localStorage.getItem('eggfarm.save'), bak: localStorage.getItem('eggfarm.save.bak'), keys, idb, collect: !!document.querySelector('#collect'), game: 'eggfarm' in window }; });
  ok('M4 newer save: M4A-31(b) copy shown, no game started', title === NEWER_TEXT && !st.collect && !st.game, JSON.stringify({ title, collect: st.collect, game: st.game }));
  ok('M4 newer save: localStorage save + .bak byte-identical, no corrupt copies, IndexedDB not written', st.save === m4 && st.bak === bak && st.keys.sort().join() === 'eggfarm.save,eggfarm.save.bak' && st.idb === null, JSON.stringify({ keys: st.keys, idb: st.idb, same: st.save === m4, bakSame: st.bak === bak }));
  await page.click('#nsRetry'); await page.waitForSelector('.recovery-layer.newer-save', { timeout: 8000 }).catch(() => {});
  ok('M4 newer save: "Try again" reload still refuses and keeps the save', (await page.evaluate(() => localStorage.getItem('eggfarm.save'))) === m4 && errors.length === 0, errors.join(' | '));
  await ctx.close();
};

// Review 8669522: spy every save-key write (localStorage + IndexedDB) and every BroadcastChannel message of a page.
const SPY = () => { window.__w = []; window.__bc = [];
  const ss = Storage.prototype.setItem, rm = Storage.prototype.removeItem;
  Storage.prototype.setItem = function (k, v) { if (String(k).startsWith('eggfarm.save') || k === 'eggfarm.lease') window.__w.push('ls:' + k); return ss.call(this, k, v); };
  Storage.prototype.removeItem = function (k) { if (String(k).startsWith('eggfarm.save') || k === 'eggfarm.lease') window.__w.push('rm:' + k); return rm.call(this, k); };
  const put = IDBObjectStore.prototype.put, del = IDBObjectStore.prototype.delete;
  IDBObjectStore.prototype.put = function (...a) { window.__w.push('idb:put:' + a[1]); return put.apply(this, a); };
  IDBObjectStore.prototype.delete = function (...a) { window.__w.push('idb:del:' + a[0]); return del.apply(this, a); };
  if (window.BroadcastChannel) { const pm = BroadcastChannel.prototype.postMessage; BroadcastChannel.prototype.postMessage = function (m) { window.__bc.push(m?.t); return pm.call(this, m); }; } };
const idbMain = p => p.evaluate(() => new Promise(res => { const r = indexedDB.open('eggfarm', 1); r.onupgradeneeded = () => r.result.createObjectStore('save');
  r.onsuccess = () => { const g = r.result.transaction('save').objectStore('save').get('main'); g.onsuccess = () => { res(g.result ?? null); r.result.close(); }; g.onerror = () => res('err'); }; r.onerror = () => res('err'); }));
const putIdbMain = (p, v) => p.evaluate(v => new Promise(res => { const r = indexedDB.open('eggfarm', 1); r.onupgradeneeded = () => r.result.createObjectStore('save');
  r.onsuccess = () => { const t = r.result.transaction('save', 'readwrite'); t.objectStore('save').put(v, 'main'); t.oncomplete = () => { r.result.close(); res(true); }; }; }), v);
// B1: a v7 save that exists ONLY in IndexedDB (localStorage holds an older valid save) is refused; nothing written anywhere.
sections.newersaveidb = async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const errors = [];
  const v7 = JSON.stringify({ version: 7, savedAt: Date.now(), state: { coinsCents: 70707, futureField: 1 } }), v5 = fx('m2-rc1-v5-12min.json');
  const seed = await ctx.newPage(); await seed.goto(URL0, { waitUntil: 'domcontentloaded' }); await putIdbMain(seed, v7);
  await seed.evaluate(o => { localStorage.clear(); localStorage.setItem('eggfarm.save', o); }, v5); await seed.close();
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(SPY);
  await page.goto(URL0, { waitUntil: 'domcontentloaded' }); await page.getByText('Tap to start').click();
  const shown = await page.waitForSelector('.recovery-layer.newer-save', { timeout: 8000 }).then(() => true, () => false);
  await page.waitForTimeout(3500); await page.evaluate(() => { window.dispatchEvent(new Event('pagehide')); document.dispatchEvent(new Event('visibilitychange')); }); await page.waitForTimeout(300);
  const st = await page.evaluate(() => ({ w: window.__w, bc: window.__bc, save: localStorage.getItem('eggfarm.save'), ver: document.querySelector('.newer-save')?.dataset.version, collect: !!document.querySelector('#collect') }));
  const idb = await idbMain(page);
  ok('B1 v7 only in IndexedDB: refused (.newer-save, data-version=7), no game', shown && st.ver === '7' && !st.collect, JSON.stringify({ shown, ver: st.ver, collect: st.collect }));
  ok('B1 v7 only in IndexedDB: no save/lease write in localStorage or IndexedDB, no lease messages; IDB main + localStorage byte-identical', st.w.length === 0 && st.bc.length === 0 && idb === v7 && st.save === v5, JSON.stringify({ w: st.w, bc: st.bc, idbSame: idb === v7, lsSame: st.save === v5 }));
  ok('B1 no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
};
// m2: corrupt main + newer .bak -> refuse, not a fresh start.
sections.newerbak = async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage(); await page.addInitScript(SPY);
  const v7 = JSON.stringify({ version: 7, savedAt: Date.now(), state: { coinsCents: 1 } });
  await page.addInitScript(c => { if (sessionStorage.getItem('seeded')) return; localStorage.setItem('eggfarm.save', '{"version":6,"sav'); localStorage.setItem('eggfarm.save.bak', c); sessionStorage.setItem('seeded', '1'); window.__w = []; }, v7);
  await page.goto(URL0, { waitUntil: 'domcontentloaded' }); await page.getByText('Tap to start').click();
  const shown = await page.waitForSelector('.recovery-layer.newer-save', { timeout: 8000 }).then(() => true, () => false); await page.waitForTimeout(2500);
  const st = await page.evaluate(() => ({ w: window.__w, bak: localStorage.getItem('eggfarm.save.bak'), keys: Object.keys(localStorage).filter(k => k.startsWith('eggfarm.save')).sort() }));
  ok('m2 corrupt main + v7 .bak: refused, no fresh start, nothing written, no corrupt copies', shown && st.w.length === 0 && st.bak === v7 && st.keys.join() === 'eggfarm.save,eggfarm.save.bak', JSON.stringify(st));
  await ctx.close();
};
// m1: a non-integer version is the corrupt path, not a refusal.
sections.newerfrac = async () => {
  const { ctx, page } = await open({ ls: { 'eggfarm.save': JSON.stringify({ version: 7.5, savedAt: 1, state: { coinsCents: 1 } }) } });
  const st = await page.evaluate(() => ({ newer: !!document.querySelector('.newer-save'), rec: window.eggfarm?.recovery?.reason, corrupt: Object.keys(localStorage).some(k => k.startsWith('eggfarm.save.corrupt.1')) }));
  ok('m1 version 7.5: corrupt path (recovery reason=version, copy preserved), not .newer-save', !st.newer && st.rec === 'version' && st.corrupt, JSON.stringify(st));
  await ctx.close();
};
// M1 + (f)6 second tab, updated for QA BUG-2 (save-durability-2959ba0): a refused build opened next to a live tab. The
// refused tab writes nothing; the live tab's next write sees the newer copy, stops ALL writes, releases the lease and shows
// .newer-save (it used to keep saving, which let it overwrite a newer main within ~3 s).
sections.newertwotab = async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const errors = [];
  const a = await ctx.newPage(); a.on('pageerror', e => errors.push('A:' + e.message));
  await a.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true })); sessionStorage.setItem('seeded', '1'); });
  await a.goto(URL0, { waitUntil: 'domcontentloaded' }); await a.getByText('Tap to start').click(); await a.waitForFunction(() => window.eggfarm); await a.waitForTimeout(500);
  const v7 = JSON.stringify({ version: 7, savedAt: Date.now(), state: { coinsCents: 1 } });
  await a.evaluate(c => localStorage.setItem('eggfarm.save.bak', c), v7); // a newer build's copy appears
  const mainBefore = await a.evaluate(() => localStorage.getItem('eggfarm.save'));
  const b = await ctx.newPage(); b.on('pageerror', e => errors.push('B:' + e.message)); await b.addInitScript(SPY);
  await b.goto(URL0, { waitUntil: 'domcontentloaded' }); await b.getByText('Tap to start').click();
  const shown = await b.waitForSelector('.recovery-layer.newer-save', { timeout: 8000 }).then(() => true, () => false);
  await a.bringToFront(); await a.waitForTimeout(500);
  await a.evaluate(() => { window.eggfarm.dispatch({ type: 'collect' }); window.eggfarm.save(); window.eggfarm.endSession(); });
  const aShown = await a.waitForSelector('.recovery-layer.newer-save', { timeout: 8000 }).then(() => true, () => false);
  await a.waitForTimeout(6000); // > one autosave interval
  const sa = await a.evaluate(() => ({ tabModal: !!document.querySelector('.recovery-layer:not(.newer-save)'), ro: window.eggfarm.readOnly, newer: window.eggfarm.newerSave, lease: JSON.parse(localStorage.getItem('eggfarm.lease')), main: localStorage.getItem('eggfarm.save'), bak: localStorage.getItem('eggfarm.save.bak') }));
  const sb = await b.evaluate(() => ({ w: window.__w, bc: window.__bc, game: 'eggfarm' in window }));
  ok('M1 refused tab next to live tab: refused tab shows .newer-save and posts no flush/claim', shown && sb.bc.length === 0 && !sb.game, JSON.stringify({ shown, bc: sb.bc }));
  ok('BUG-2 live tab: next write refuses, shows .newer-save (no tab-guard modal), read-only, lease released (at 0)', aShown && !sa.tabModal && sa.ro && sa.newer === 7 && sa.lease.at === 0, JSON.stringify({ aShown, ...sa, main: undefined, bak: undefined }));
  ok('BUG-2 live tab wrote nothing after the newer copy appeared: main unchanged, newer .bak intact', sa.main === mainBefore && sa.bak === v7, JSON.stringify({ mainSame: sa.main === mainBefore, bakSame: sa.bak === v7 }));
  ok('(f)6 refused second tab writes nothing (no save/.bak/lease key, no IndexedDB put/delete)', sb.w.length === 0 && errors.length === 0, JSON.stringify(sb.w) + errors.join(' | '));
  await ctx.close();
};
// QA BUG-2 repro (sd.mjs a4): another tab writes a v99 MAIN save while tab 1 plays; tab 1's autosave must not overwrite it.
sections.newermainlive = async () => {
  const { ctx, page, errors } = await open({ ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true }) } });
  const v99 = JSON.stringify({ version: 99, savedAt: Date.now(), state: { coinsCents: 4000 } });
  await page.evaluate(c => localStorage.setItem('eggfarm.save', c), v99);
  const shown = await page.waitForSelector('.recovery-layer.newer-save', { timeout: 9000 }).then(() => true, () => false); // next autosave (5 s)
  await page.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide')); });
  await page.waitForTimeout(6000);
  const st = await page.evaluate(() => new Promise(res => { const r = indexedDB.open('eggfarm'); r.onsuccess = () => { const g = r.result.transaction('save').objectStore('save').get('main'); g.onsuccess = () => res({ main: localStorage.getItem('eggfarm.save'), idbV: JSON.parse(g.result).version, ver: document.querySelector('.newer-save')?.dataset.version }); }; }));
  ok('BUG-2 v99 main written by another tab: autosave/visibility/pagehide never overwrite it; .newer-save shown (v99)', shown && st.main === v99 && st.ver === '99' && errors.length === 0, JSON.stringify({ shown, same: st.main === v99, ver: st.ver, idbV: st.idbV, errors }));
  await ctx.close();
};
// QA BUG-1 (sd.mjs b-savedat-zero/negative) + BUG-5 (null): 0 offline, loaded (no recovery), re-stamped now.
sections.savedatinvalid = async () => {
  for (const v of ['0', '-5000000000000', '1000', 'null', String(Date.now() + 3_600_000) /* future: invalid (Product 15:15) */]) {
    const { ctx, page } = await open({ ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true }) } });
    const seeded = await page.evaluate(v => { const g = window.eggfarm; g.state = { ...g.state, basket: 15, coop: 0 }; g.save(); g.resetting = true;
      const s = localStorage.getItem('eggfarm.save').replace(/"savedAt":\d+/, `"savedAt":${v}`); localStorage.setItem('eggfarm.save', s); return s; }, v);
    const p2 = await ctx.newPage(); await page.close(); await p2.goto(URL0, { waitUntil: 'domcontentloaded' }); await p2.getByText('Tap to start').click(); await p2.waitForFunction(() => window.eggfarm);
    await p2.waitForTimeout(300);
    const st = await p2.evaluate(() => ({ off: window.eggfarm.offline.eggs, pend: window.eggfarm.state.pendingOfflineEggs, basket: window.eggfarm.state.basket, rec: window.eggfarm.recovery, savedAt: JSON.parse(localStorage.getItem('eggfarm.save')).savedAt, modal: !!document.querySelector('.recovery-layer') }));
    ok(`BUG-1/5 savedAt=${v}: 0 offline, main loaded (basket 15, no recovery), savedAt re-stamped now`, st.off === 0 && st.pend === 0 && st.basket === 15 && !st.rec && !st.modal && Date.now() - st.savedAt < 10_000, JSON.stringify({ ...st, seeded: !!seeded }));
    await ctx.close();
  }
};
// QA BUG-3 (sd.mjs e1): main gone from localStorage AND IndexedDB, valid .bak -> restored, never overwritten by a fresh game.
sections.bakrestore = async () => {
  const { ctx, page } = await open({ ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true }) } });
  await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, basket: 15, coop: 0 }; g.save(); g.save(); }); // 2nd save rotates main -> .bak
  await page.evaluate(() => new Promise(res => { const g = window.eggfarm; g.resetting = true; localStorage.setItem('eggfarm.save.bak', localStorage.getItem('eggfarm.save')); localStorage.removeItem('eggfarm.save');
    const r = indexedDB.open('eggfarm'); r.onsuccess = () => { const t = r.result.transaction('save', 'readwrite'); t.objectStore('save').delete('main'); t.oncomplete = () => res(); }; }));
  const p2 = await ctx.newPage(); await page.close(); await p2.goto(URL0, { waitUntil: 'domcontentloaded' }); await p2.getByText('Tap to start').click(); await p2.waitForFunction(() => window.eggfarm);
  await p2.waitForTimeout(8000); // QA saw .bak overwritten ~7 s after a fresh start
  const st = await p2.evaluate(() => ({ basket: window.eggfarm.state.basket, newGame: window.eggfarm.isNewGame, rec: window.eggfarm.recovery && { case: window.eggfarm.recovery.case, reason: window.eggfarm.recovery.reason }, bakBasket: JSON.parse(localStorage.getItem('eggfarm.save.bak')).state.basket, mainBasket: JSON.parse(localStorage.getItem('eggfarm.save')).state.basket }));
  ok('BUG-3 main missing everywhere + valid .bak: restored (basket 15, case R missing), .bak still holds progress after 8 s', st.basket >= 15 && !st.newGame && st.rec?.case === 'R' && st.rec?.reason === 'missing' && st.bakBasket >= 15 && st.mainBasket >= 15, JSON.stringify(st));
  await ctx.close();
};
// QA BUG-4 (sd.mjs e2): Settings -> Reset clears .bak and the IndexedDB copy too.
sections.resetbak = async () => {
  const { ctx, page } = await open({ ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true }) } });
  await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, basket: 15, coop: 0 }; g.save(); g.save(); });
  const had = await page.evaluate(() => localStorage.getItem('eggfarm.save.bak') !== null);
  // drive the real UI path: Settings -> Reset save -> Reset
  await page.locator('#settings, [aria-label="Settings"], .settings-btn').first().click();
  await page.locator('#sReset').click(); await page.locator('#cReset').click();
  await page.getByText('Tap to start').click({ timeout: 15000 }); await page.waitForFunction(() => window.eggfarm, null, { timeout: 10000 }); await page.waitForTimeout(1500);
  const st = await page.evaluate(() => new Promise(res => { const r = indexedDB.open('eggfarm'); r.onsuccess = () => { const g = r.result.transaction('save').objectStore('save').get('main'); g.onsuccess = () => res({ bak: localStorage.getItem('eggfarm.save.bak'), basket: window.eggfarm?.state.basket, idbBasket: g.result ? JSON.parse(g.result).state.basket : null }); }; }));
  ok('BUG-4 Reset clears .bak and IndexedDB: no .bak, fresh state', had && st.bak === null && st.basket === 0 && (st.idbBasket === null || st.idbBasket === 0), JSON.stringify({ had, ...st }));
  await ctx.close();
};

// AC14b save-recovery dialog v2.1 (art-ux/save-recovery-dialog.md): one section per loader outcome.
const RC = {
  restored: { title: 'Welcome back!', body: 'We loaded your backup. You may be a few moments behind.', btn: 'Keep farming', badge: '\u2713', exp: null },
  fresh: { title: 'A fresh start', body: "We couldn't open your farm. Your old save is kept safe.", btn: 'Start farming', badge: '\u2605', exp: 'rc-link' },
  storage: { title: 'A fresh start', body: "We couldn't open your farm. Export it now to keep a copy.", btn: 'Start farming', badge: '!', exp: 'rc-export-q' },
  cantsave: { title: 'Saving is paused', body: "Your farm is fine, but your browser won't let us save right now. Export a copy to keep your progress.", btn: 'Keep farming', badge: '!', exp: 'rc-export-q', expText: 'Export save', aria: 'Export save, downloads a copy of your current farm', icon: 'icon-coop', outcome: 'storage', variant: 'cantsave', maxLines: 3, file: /^eggfarm-save-\d{8}-\d{4}\.json$/ },
};
const QUOTA_SPY = () => { window.__quota = 0; const set = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) { if (String(k).startsWith('eggfarm.save.corrupt')) { window.__quota++; throw new DOMException('full', 'QuotaExceededError'); } return set.call(this, k, v); }; };
let validSave = null;
const getValidSave = async () => { if (validSave) return validSave;
  const { ctx, page } = await open({ ls: { 'eggfarm.ui': DONE } });
  validSave = await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, basket: 15, coop: 0 }; g.save(); return localStorage.getItem('eggfarm.save'); });
  await ctx.close(); return validSave; };
async function recoveryCase(kind, lsOverride, label = kind) {
  const ls = lsOverride ?? (kind === 'cantsave' ? { 'eggfarm.ui': DONE, 'eggfarm.save': await getValidSave() } : kind === 'restored' ? { 'eggfarm.ui': DONE, 'eggfarm.save.bak': await getValidSave() } : { 'eggfarm.ui': DONE, 'eggfarm.save': fx('corrupt-truncated.json'), ...(kind === 'fresh' ? { 'eggfarm.save.bak': '{"version":5,"sav' } : {}) });
  const E = RC[kind];
  for (const [w, h] of [[360, 640], [1280, 800]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, acceptDownloads: true }); const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    if (kind === 'storage') await page.addInitScript(QUOTA_SPY);
    if (kind === 'cantsave') await page.addInitScript(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'eggfarm.lease') throw new DOMException('full', 'QuotaExceededError'); return set.call(this, k, v); }; });
    await page.addInitScript(o => { if (sessionStorage.getItem('seeded')) return; for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); }, ls);
    await page.goto(URL0, { waitUntil: 'domcontentloaded' }); await page.getByText('Tap to start').click(); await page.waitForFunction(() => window.eggfarm);
    await page.waitForSelector('.recovery-layer', { timeout: 5000 });
    // v2.2 fix 1: opaque from the first frame (no opacity animation), and still opaque at rest.
    const op0 = await page.evaluate(() => { const c = document.querySelector('.recovery-card'); let o = 1; for (let e = c; e; e = e.parentElement) o *= +getComputedStyle(e).opacity; return { o, bg: getComputedStyle(c).backgroundColor }; });
    await page.evaluate(() => Promise.all(document.querySelector('.recovery-card').getAnimations().map(a => a.finished))); await page.waitForTimeout(100);
    const op1 = await page.evaluate(() => { const c = document.querySelector('.recovery-card'); let o = 1; for (let e = c; e; e = e.parentElement) o *= +getComputedStyle(e).opacity; return { o, bg: getComputedStyle(c).backgroundColor, toast: !!document.querySelector('.save-warn') }; });
    const st = await page.evaluate(() => { const L = document.querySelector('.recovery-layer'), c = L.querySelector('.recovery-card'), r = c.getBoundingClientRect(), $ = s => c.querySelector(s);
      const ctl = [...c.querySelectorAll('button')].map(b => ({ id: b.id, cls: b.className, h: b.getBoundingClientRect().height, w: b.getBoundingClientRect().width, aria: b.getAttribute('aria-label') }));
      return { outcome: L.dataset.outcome, variant: L.dataset.variant, gOutcome: window.eggfarm.recoveryOutcome, role: c.getAttribute('role'), modal: c.getAttribute('aria-modal'), lb: c.getAttribute('aria-labelledby'), db: c.getAttribute('aria-describedby'),
        title: $('#rcT').textContent, body: $('#rcB').textContent, btn: $('#rcGo').textContent, badge: $('.rc-badge')?.textContent, iconHidden: $('.rc-icon')?.getAttribute('aria-hidden'), ctl, w: Math.round(r.width),
        bodyLines: Math.round($('#rcB').getBoundingClientRect().height / (parseFloat(getComputedStyle($('#rcB')).lineHeight) || 22.4)),
        clipped: r.left < 0 || r.right > innerWidth + 0.5 || c.scrollHeight > c.clientHeight + 1, focus: document.activeElement?.id, inert: document.getElementById('app')?.inert ?? null }; });
    const tag = `AC14b ${label} ${w}`;
    ok(`${tag}: card fully opaque (first frame and at rest)`, op0.o === 1 && op1.o === 1 && op1.bg === 'rgb(255, 255, 255)', JSON.stringify({ op0, op1 }));
    ok(`${tag}: no save-warning toast while the dialog is open`, !op1.toast);
    if (E.icon) ok(`${tag}: icon ${E.icon}`, await page.evaluate(i => document.querySelector('.rc-icon img').src.includes(i), E.icon));
    ok(`${tag}: outcome '${E.outcome ?? kind}'${E.variant ? ` variant '${E.variant}'` : ''}, alertdialog modal labelled/described`, st.outcome === (E.outcome ?? kind) && st.gOutcome === (E.outcome ?? kind) && st.variant === E.variant && st.role === 'alertdialog' && st.modal === 'true' && st.lb === 'rcT' && st.db?.startsWith('rcB'), JSON.stringify({ o: st.outcome, g: st.gOutcome, db: st.db }));
    ok(`${tag}: exact ${E.variant ? 'v2.2' : 'v2.1'} strings + badge, icon hidden`, st.title === E.title && st.body === E.body && st.btn === E.btn && st.badge === E.badge && st.iconHidden === 'true', JSON.stringify([st.title, st.body, st.btn, st.badge]));
    const exp = st.ctl.find(c => c.id === 'rcExport');
    const expText = await page.evaluate(() => document.querySelector('#rcExport')?.textContent ?? null);
    ok(`${tag}: export control ${E.exp ?? 'absent (no raw bytes)'}`, E.exp ? exp?.cls === E.exp && exp.aria === (E.aria ?? 'Export old save, downloads a copy of your old save file') && expText === (E.expText ?? 'Export old save') : !exp, JSON.stringify({ exp: exp ?? null, expText }));
    ok(`${tag}: card width ${w === 360 ? 312 : 440}, body <=${E.maxLines ?? 2} lines, nothing clipped`, st.w === (w === 360 ? 312 : 440) && st.bodyLines <= (E.maxLines ?? 2) && !st.clipped, JSON.stringify({ w: st.w, lines: st.bodyLines }));
    ok(`${tag}: every control >=44 tall (primary >=48, link >=120 wide)`, st.ctl.every(c => c.h >= 44) && st.ctl.find(c => c.id === 'rcGo').h >= 48 && (!exp || exp.cls !== 'rc-link' || exp.w >= 120), JSON.stringify(st.ctl.map(c => [c.id, Math.round(c.w), c.h])));
    ok(`${tag}: initial focus on primary`, st.focus === 'rcGo', st.focus);
    if (shot && !lsOverride) await page.screenshot({ path: `${SHOTS}/save-recovery-v4-${kind}-${w}.png` });
    if (w === 360) {
      const seq = []; for (const k of ['Tab', 'Tab', 'Shift+Tab']) { await page.keyboard.press(k); seq.push(await page.evaluate(() => document.activeElement?.id)); }
      // Art & UX 16:2x: keyboard focus ring on both buttons and the Export link: visible, >=2px, >=3:1 against the card.
      const ring = async () => page.evaluate(() => { const el = document.activeElement, cs = getComputedStyle(el), card = getComputedStyle(el.closest('.recovery-card'));
        const rgb = c => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number), lum = ([r, g, b]) => { const f = v => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const a = lum(rgb(cs.outlineColor)), b = lum(rgb(card.backgroundColor)), cr = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        return { id: el.id, fv: el.matches(':focus-visible'), style: cs.outlineStyle, w: parseFloat(cs.outlineWidth), off: parseFloat(cs.outlineOffset), color: cs.outlineColor, bg: card.backgroundColor, cr: Math.round(cr * 100) / 100 }; });
      const rings = []; const ids = E.exp ? ['rcExport', 'rcGo'] : ['rcGo'];
      await page.keyboard.press('Tab'); // enter keyboard modality (the initial focus is programmatic)
      for (const id of ids) { while ((await page.evaluate(() => document.activeElement?.id)) !== id) await page.keyboard.press('Tab'); rings.push(await ring()); }
      await page.keyboard.press('Tab'); if (E.exp) await page.keyboard.press('Tab'); // back to a neutral state before the wrap check
      while ((await page.evaluate(() => document.activeElement?.id)) !== 'rcGo') await page.keyboard.press('Tab');
      ok(`${tag}: keyboard focus ring visible, >=2px, >=3:1 on ${ids.join('+')}`, rings.every(r => r.style !== 'none' && r.w >= 2 && r.cr >= 3), JSON.stringify(rings));
      console.log('FOCUSRING', label, w, JSON.stringify(rings));
      ok(`${tag}: Tab/Shift+Tab wrap inside the dialog`, E.exp ? seq.join() === 'rcExport,rcGo,rcExport' : seq.every(x => x === 'rcGo'), seq.join());
      await page.keyboard.press('Escape'); await page.mouse.click(5, 5); await page.goBack().catch(() => {}); await page.waitForTimeout(300);
      ok(`${tag}: Esc, scrim tap and Back don't close it`, await page.locator('.recovery-layer').count() === 1);
      if (E.exp) {
        if (kind === 'cantsave') await page.evaluate(() => { window.eggfarm.state = { ...window.eggfarm.state, basket: 33 }; }); // the farm moved on after boot
        let body = null; const dl = page.waitForEvent('download', { timeout: 4000 }).then(async d => { try { body = readFileSync(await d.path(), 'utf8'); } catch { /* */ } return d.suggestedFilename(); }, () => null);
        await page.locator('#rcExport').click(); const name = await dl;
        if (kind === 'cantsave') { let b = null; try { b = JSON.parse(body).state.basket; } catch { /* */ } ok(`${tag}: Export save exports the CURRENT farm (basket 33, not boot 15)`, b === 33, String(b)); } await page.waitForFunction(() => document.querySelector('#rcMsg')?.textContent, null, { timeout: 4000 }).catch(() => {});
        const r = await page.evaluate(() => ({ msg: document.querySelector('#rcMsg')?.textContent, open: !!document.querySelector('.recovery-layer'), busy: document.querySelector('#rcExport')?.getAttribute('aria-busy') }));
        ok(`${tag}: Export downloads ${E.file ? 'eggfarm-save' : 'eggfarm-old-save'}-*.json, says "Saved a copy.", stays open`, (E.file ?? /^eggfarm-old-save-\d{8}-\d{4}\.json$/).test(name ?? '') && r.msg === 'Saved a copy.' && r.open && r.busy === null, JSON.stringify({ name, ...r }));
      }
      if (kind === 'storage') ok(`${tag}: at most one QuotaExceededError (no retry loop)`, (await page.evaluate(() => window.__quota)) <= 1, String(await page.evaluate(() => window.__quota)));
      await page.locator('#rcGo').click(); await page.waitForTimeout(250);
      const after = await page.evaluate(() => ({ open: !!document.querySelector('.recovery-layer'), focus: document.activeElement?.id, inert: document.getElementById('app')?.inert ?? null }));
      ok(`${tag}: primary closes it and focus moves to Collect`, !after.open && after.focus === 'collect', JSON.stringify(after));
      if (kind === 'cantsave') ok(`${tag}: persistent save-warning toast appears only after dismissal`, await page.locator('.save-warn').count() === 1);
      if (kind === 'storage') { await page.locator('#settings, [aria-label="Settings"], .settings-btn').first().click(); await page.waitForTimeout(200);
        ok(`${tag}: Settings shows "Export old save" for the session`, await page.locator('#sOldSave').count() === 1); }
    }
    ok(`${tag}: no page errors`, !errors.length, errors.join(' | ').slice(0, 200));
    await ctx.close();
  }
}
sections.recoveryRestored = () => recoveryCase('restored');
sections.recoveryFresh = () => recoveryCase('fresh');
sections.recoveryBadBakOnly = () => recoveryCase('fresh', { 'eggfarm.ui': DONE, 'eggfarm.save.bak': '{"version":5,"sav' }, 'fresh (SD4-3 main missing + bad .bak)');
sections.recoveryStorage = () => recoveryCase('storage');
sections.recoveryCantSave = () => recoveryCase('cantsave');
sections.recoveryNone = async () => { const { ctx, page } = await open({ ls: { 'eggfarm.ui': DONE, 'eggfarm.save': await getValidSave() } }); await page.waitForTimeout(300);
  ok('AC14b null outcome: no dialog', (await page.locator('.recovery-layer').count()) === 0 && (await page.evaluate(() => window.eggfarm.recoveryOutcome)) === null); await ctx.close(); };

// SECTIONS
// ---------- rc2 Minors: M-SellAll-empty + M-Sold-freeze ----------
sections.rc2minors = async () => {
  const MS = process.env.MINOR_SHOTS ?? `${SHOTS}/rc2-minors`; mkdirSync(MS, { recursive: true });
  for (const [w, h, rmo] of [[360, 740, false], [1280, 800, false], [360, 740, true]]) {
    const { ctx, page, errors } = await open({ w, h, touch: w < 960, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true }) } });
    if (rmo) await page.emulateMedia({ reducedMotion: 'reduce' });
    const tag = `${w}x${h}${rmo ? ' reduced-motion' : ''}`, name = `${w}${w >= 960 ? '-docked' : ''}${rmo ? '-rm' : ''}`;
    if (w < 960) { await page.locator('[data-nav=market]').click(); await page.waitForTimeout(250); }
    // M-SellAll-empty: eggs but no customers
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, basket: 12, coop: 0, customers: [], nextCustomerInS: 999, workers: {} }; });
    await page.waitForTimeout(300);
    const e1 = await page.locator('#sellAll').evaluate(b => ({ t: b.textContent, name: b.getAttribute('aria-label') ?? b.textContent, dis: b.getAttribute('aria-disabled') ?? String(b.disabled) }));
    ok(`M-SellAll-empty eggs + no customers reads "Waiting for customers" (${tag})`, e1.t === 'Waiting for customers' && e1.name === e1.t && e1.dis === 'true', JSON.stringify(e1));
    if (shot && !rmo) await page.screenshot({ path: `${MS}/sellall-waiting-${name}.png` });
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, basket: 0 }; }); await page.waitForTimeout(300);
    ok(`M-SellAll-empty empty basket keeps "No eggs to sell" (${tag})`, (await page.locator('#sellAll').textContent()) === 'No eggs to sell');
    // M-Sold-freeze: one order of 8, basket 8, sell it and sample every frame
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, basket: 8, customers: [{ id: 777, demand: 8, filled: 0, waitedS: 0 }] }; });
    await page.waitForTimeout(400);
    await page.evaluate(() => { window.__sf = []; const t0 = performance.now(), list = document.querySelector('#mRows');
      const snap = () => { const row = list.querySelector('.order[data-id="777"]'), b = row?.querySelector('button'), em = list.querySelector('.empty-state'), cs = b ? getComputedStyle(b) : null;
        window.__sf.push({ t: Math.round(performance.now() - t0), row: !!row, txt: b?.textContent ?? null, line: row?.querySelector('.l1')?.textContent ?? null, dis: b ? b.disabled && b.getAttribute('aria-disabled') === 'true' : null,
          bg: cs?.backgroundColor ?? null, fit: b ? b.scrollWidth <= b.clientWidth + 0.5 && b.scrollHeight <= b.clientHeight + 0.5 : null, fg: cs?.color ?? null, op: row ? +getComputedStyle(row).opacity : null, tf: row ? getComputedStyle(row).transform : null, empty: !!em && !em.hidden,
          // designer minor: no particle (coin flyer / spark / number pop) may overlap the Sold! label text rect
          hits: (() => { if (!b || !/^Sold!/.test(b.textContent)) return 0; const rg = document.createRange(); rg.selectNodeContents(b); const L = rg.getBoundingClientRect();
            return [...document.querySelectorAll('.flyer, .spark, .floater')].filter(p => { const q = p.getBoundingClientRect(), o = +getComputedStyle(p).opacity;
              return o > 0.05 && q.width > 0 && q.right > L.left + 0.5 && q.left < L.right - 0.5 && q.bottom > L.top + 0.5 && q.top < L.bottom - 0.5; }).length; })(),
          parts: document.querySelectorAll('.flyer').length }); };
      list.querySelector('.order[data-id="777"] button').click(); snap(); const loop = () => { snap(); if (performance.now() - t0 < 900) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
    await page.waitForTimeout(110); if ((shot || process.env.MINOR_SHOTS_ALL) && !rmo) await page.screenshot({ path: `${MS}/sold-freeze-mid-110ms-${name}${ENGINE === 'chromium' ? '' : '-' + ENGINE}.png` });
    await page.waitForTimeout(900); if (shot && !rmo) await page.screenshot({ path: `${MS}/sold-after-next-customer-soon-${name}.png` });
    const f = await page.evaluate(() => window.__sf), withRow = f.filter(x => x.row), sold = withRow.filter(x => /^Sold! \+\$/.test(x.txt ?? ''));
    const freeze = sold.filter(x => x.t <= 220), lastRow = withRow.length ? withRow[withRow.length - 1].t : -1, firstEmpty = f.find(x => x.empty)?.t ?? -1;
    ok(`M-Sold-freeze row shows a disabled green "Sold! +$X" chip from the click (${tag})`, sold.length > 0 && sold[0].t <= 40 && sold.every(x => x.dis && x.fit && x.bg === 'rgb(61, 127, 51)' && x.fg === 'rgb(255, 255, 255)'), JSON.stringify(sold[0] ?? withRow[0]));
    ok(`M-Sold-freeze row frozen in place ~240ms (no fade/slide yet) (${tag})`, freeze.length > 0 && freeze.every(x => x.op === 1 && (x.tf === 'none' || x.tf === 'matrix(1, 0, 0, 1, 0, 0)')) && sold[sold.length - 1].t >= 230, JSON.stringify({ n: freeze.length, last: sold[sold.length - 1]?.t }));
    ok(`M-Sold-freeze no coin/spark/pop particle crosses the "Sold! +$X" label (${tag})`, sold.every(x => x.hits === 0) && (rmo || f.some(x => x.parts > 0)), JSON.stringify({ hitFrames: sold.filter(x => x.hits).map(x => x.t).slice(0, 5), sawParticles: f.some(x => x.parts > 0) }));
    ok(`M-Sold-freeze never shows the stale "Sell 8" / "0/8" after the click (${tag})`, withRow.every(x => !/Sell 8|Need/.test(x.txt ?? '') && !/^0\/8/.test(x.line ?? '')), JSON.stringify(withRow.find(x => /Sell 8/.test(x.txt ?? ''))));
    ok(`M-Sold-freeze "Next customer soon…" only after the row has left (${tag})`, lastRow > 0 && firstEmpty > lastRow && !f.some(x => x.row && x.empty), JSON.stringify({ lastRow, firstEmpty }));
    if (rmo) ok(`M-Sold-freeze reduced motion: no slide/scale, gone by ~240+120ms (${tag})`, withRow.every(x => x.tf === "none" || x.tf === "matrix(1, 0, 0, 1, 0, 0)") && lastRow <= 240 + 120 + 80, JSON.stringify({ lastRow, tfs: [...new Set(withRow.map(x => x.tf))], ops: withRow.map(x => x.op).filter(o => o < 1).slice(0, 4) }));
    else ok(`M-Sold-freeze leaves within ~240ms after the freeze (${tag})`, lastRow >= 240 && lastRow <= 240 + 240 + 100, JSON.stringify({ lastRow }));
    if (!rmo) { // review ebbd02e #1: after a row sale, a Market Hand auto-sale must not fly coins from the page origin
      await page.evaluate(() => { window.__fl = []; const g = window.eggfarm; g.state = { ...g.state, basket: 40, customers: [{ id: 778, demand: 30, filled: 0, waitedS: 0 }], workers: { market_hand: { energy: 100, cdS: 0 } } };
        const mo = new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.classList?.contains('flyer')) requestAnimationFrame(() => { const r = n.getBoundingClientRect(); window.__fl.push({ x: r.left, y: r.top }); }); });
        mo.observe(document.body, { childList: true, subtree: true }); });
      await page.waitForFunction(() => window.eggfarm.state.customers.every(c => c.id !== 778 || c.filled > 0), null, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(300);
      const fl = await page.evaluate(() => window.__fl);
      ok(`M-Sold-freeze Market Hand sale after a row sale: no coin starts at the page origin (${tag})`, fl.length > 0 && fl.every(p => p.x >= 4 || p.y >= 4), JSON.stringify({ n: fl.length, worst: fl.filter(p => p.x < 4 && p.y < 4).slice(0, 3) }));
    }
    if (w < 960 && !rmo) { // review c1b4ef5 #1: a Market Hand sale with the sheet closed must not leave a stale "Sold!" row to fade on open
      await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, basket: 0, customers: [{ id: 779, demand: 3, filled: 0, waitedS: 0 }], nextCustomerInS: 999, workers: {} }; }); await page.waitForTimeout(300);
      await page.evaluate(() => (document.querySelector('#p-market .close') ?? document.querySelector('[data-nav=farm]')).click()); /* DOM click (the nav button animates, so Playwright's stable-wait times out); close like rc2minors2 */ await page.waitForTimeout(300);
      const closed = await page.evaluate(() => document.querySelector('#p-market').hidden);
      await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, basket: 10, workers: { market_hand: { energy: 100, cdS: 0 } } }; });
      await page.waitForFunction(() => !window.eggfarm.state.customers.some(c => c.id === 779), null, { timeout: 15000 }).catch(() => {});
      await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, workers: {} }; }); await page.waitForTimeout(600);
      await page.evaluate(() => { window.__st = []; const t0 = performance.now(), loop = () => { { const q = [...document.querySelectorAll('.order .btn.sell')].find(b => b.classList.contains('sold') || b.closest('.order').classList.contains('sold') || /^Sold!/.test(b.textContent)); const r = q?.closest('.order'); window.__st.push(q ? `${r?.dataset.id}:${r?.className}:${q.textContent}` : ''); } /* a plain leave fade of 779 ('No eggs') is the old drop path; only a stale Sold state is the bug */ if (performance.now() - t0 < 400) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
      await page.evaluate(() => document.querySelector('[data-nav=market]').click()); await page.waitForTimeout(450);
      const st = await page.evaluate(() => window.__st), served = await page.evaluate(() => !window.eggfarm.state.customers.some(c => c.id === 779));
      ok(`M-Sold-freeze hidden-sheet Market Hand sale: no stale "Sold!" row on open (${tag})`, closed && served && st.length > 3 && st.every(x => !x), JSON.stringify({ closed, served, n: st.length, staleFrames: st.filter(Boolean).length, first: st.find(Boolean) }));
    }
    ok(`rc2minors no page errors (${tag})`, errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
};
// ---------- QA B4: the green ↑ purchase riser never covers the new upgrade price ----------
sections.b4riser = async () => {
  const MS = process.env.MINOR_SHOTS ?? `${SHOTS}/rc2-minors`; mkdirSync(MS, { recursive: true });
  for (const [w, h] of [[360, 740], [1280, 800]]) {
    const { ctx, page, errors } = await open({ w, h, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true }) } });
    if (w < 960) { await page.locator('[data-nav=upgrades]').click(); await page.waitForTimeout(250); }
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coinsCents: 1e7, customers: [], nextCustomerInS: 999 }; }); await page.waitForTimeout(300);
    const btn = page.locator('#uRow .btn.buy').first();
    await page.evaluate(() => { window.__rs = []; const t0 = performance.now(), loop = () => { const b = document.querySelector('#uRow .btn.buy'), r = document.querySelector('.riser');
      if (b && r) { const a = b.getBoundingClientRect(), q = r.getBoundingClientRect(); window.__rs.push({ t: Math.round(performance.now() - t0), op: +getComputedStyle(r).opacity, hit: q.bottom > a.top + 0.5 && q.top < a.bottom && q.right > a.left && q.left < a.right }); }
      if (performance.now() - t0 < 700) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
    await btn.click(); await page.waitForTimeout(100); if (shot) await page.screenshot({ path: `${MS}/b4-riser-after-buy-100ms-${w}${w >= 960 ? '-docked' : ''}.png` });
    await page.waitForTimeout(700);
    const f = await page.evaluate(() => window.__rs);
    ok(`B4 purchase riser seen and never over the buy button / price (${w})`, f.length > 3 && f.every(x => !x.hit || x.op < 0.05), JSON.stringify({ n: f.length, hit: f.filter(x => x.hit).slice(0, 3) }));
    ok(`B4 no page errors (${w})`, errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
};
// ---------- rc2 Minors 2: M-Order-zero, M-Tut-parity, M-Tut-goal, M-Toast-layer ----------
sections.rc2minors2 = async () => {
  const MS = process.env.MINOR2_SHOTS ?? `${SHOTS}/rc2-minors-2`; mkdirSync(MS, { recursive: true }); const nm = w => `${w}${w >= 960 ? '-docked' : ''}`;
  const DONE2 = JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true });
  for (const [w, h] of [[360, 740], [1280, 800]]) { // M-Order-zero + M-Toast-layer
    const { ctx, page, errors } = await open({ w, h, ls: { 'eggfarm.ui': DONE2 } });
    if (w < 960) { await page.locator('[data-nav=market]').click(); await page.waitForTimeout(250); }
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, basket: 0, coop: 0, nextCustomerInS: 999, customers: [{ id: 501, demand: 13, filled: 0, waitedS: 0 }] }; }); await page.waitForTimeout(400);
    const z = await page.evaluate(() => { const r = document.querySelector('.order[data-id="501"]'); return { e: r?.querySelector('.l1')?.textContent ?? '', aria: r?.querySelector('.bar')?.getAttribute('aria-label') }; });
    ok(`M-Order-zero 0 delivered reads "Wants 13", aria "Customer wants 13 eggs" (${w})`, /^Wants 13/.test(z.e) && z.aria === 'Customer wants 13 eggs', JSON.stringify(z));
    if (shot) await page.screenshot({ path: `${MS}/order-wants-13-${nm(w)}.png` });
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, customers: [{ id: 501, demand: 13, filled: 1, waitedS: 0 }] }; }); await page.waitForTimeout(400);
    const o = await page.evaluate(() => { const r = document.querySelector('.order[data-id="501"]'); return { e: r?.querySelector('.l1')?.textContent ?? '', aria: r?.querySelector('.bar')?.getAttribute('aria-label') }; });
    ok(`M-Order-zero after the first egg reads "1/13" (${w})`, /^1\/13/.test(o.e) && o.aria === 'Order 1 of 13 eggs', JSON.stringify(o));
    // rc2-order-sell-preview §9 fixtures: <=375 drops " eggs" -> 'Wants 13 · $15.34' / 'Wants 181B · $1.78T' on one line, no ellipsis, line 1 <= 170px at 360
    for (const [F, C, d, txt] of [[1, 1, 13, '13 · $15.34'], [24, 29, 181e9, '181B · $1.78T']]) {
      await page.evaluate(([F, C, d]) => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: F, collectionLevel: C, basket: 0, workers: {}, customers: [{ id: 502, demand: d, filled: 0, waitedS: 0 }] }; }, [F, C, d]); await page.waitForTimeout(400);
      const m = await page.evaluate(() => { const l1 = document.querySelector('.order[data-id="502"] .l1'); if (!l1) return null; const rg = document.createRange(); rg.selectNodeContents(l1); const rs = rg.getClientRects(), cs = getComputedStyle(l1);
        return { t: l1.textContent, w: rg.getBoundingClientRect().width, cw: l1.clientWidth, sw: l1.scrollWidth, lines: (() => { const tops = [...rs].filter(r => r.width > 0).map(r => r.top); return tops.length ? 1 + Math.floor((Math.max(...tops) - Math.min(...tops)) / (parseFloat(cs.lineHeight) || 20) + 0.4) : 0; })(), ell: /…/.test(l1.textContent) }; });
      const full = `Wants ${txt.replace(' · ', ' eggs · ')}`, want = w <= 375 ? `Wants ${txt}` : (m && m.t === full ? full : `Wants ${txt}`); // >375: ' eggs' kept only when it fits (181B eggs = 199px > 194)
      ok(`§9 order fit '${want}' one line, no ellipsis, not clipped${w <= 375 ? ', <= 170px' : ''} (${w})`, !!m && m.t === want && m.lines === 1 && !m.ell && m.sw <= m.cw + 0.5 && (w > 375 || m.w <= 170) && (w <= 375 || d !== 13 || m.t === full), JSON.stringify(m));
      if (shot && w <= 375) await page.screenshot({ path: `${MS}/order-wants-${d === 13 ? '13-15.34' : '181B-1.78T'}-${nm(w)}.png` });
    }
    // M-Toast-layer: Welcome-back open, then a 'Coop upgraded!' toast fires (the reload case)
    if (w < 960) { await page.evaluate(() => (document.querySelector('#p-market .close') ?? document.querySelector('[data-nav=farm]')).click()); await page.waitForTimeout(250); }
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, pendingOfflineEggs: 2685, customers: [] }; window.eggfarmQaWelcome(); }); await page.waitForTimeout(200);
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 4, coinsCents: 1e9 }; g.dispatch({ type: 'buyFarm' }); });
    await page.waitForTimeout(350);
    const t = await page.evaluate(() => { const e = document.querySelector('.toast'), m = document.querySelector('#modal-layer'); return { wb: m.classList.contains('open') && !!m.querySelector('#wbT'), vis: getComputedStyle(e).visibility, op: +getComputedStyle(e).opacity }; });
    if (shot) await page.screenshot({ path: `${MS}/welcome-over-toast-${nm(w)}.png` });
    ok(`M-Toast-layer no toast over Welcome-back (${w})`, t.wb && (t.vis === 'hidden' || t.op === 0), JSON.stringify(t));
    await page.locator('#wbCollect').click(); await page.waitForTimeout(450);
    const a = await page.evaluate(() => { const e = document.querySelector('.toast'); return { text: e.textContent, vis: getComputedStyle(e).visibility, modal: document.querySelector('#modal-layer').classList.contains('open') }; });
    ok(`M-Toast-layer the toast shows after Welcome-back closes (${w})`, !a.modal && a.vis === 'visible' && /Coop upgraded/.test(a.text), JSON.stringify(a));
    ok(`rc2minors2 no page errors (${w})`, errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  // M-Toast-layer (designer spec, art-ux screenshot-check-2026-10-17-0722): at 320x568 / 360x420 no toast is visible in ANY frame
  // while #modal-layer.open; held toasts appear after it closes. Two paths: toast raised while open, and toast already up when it opens.
  for (const [w, h] of [[320, 568], [360, 420]]) for (const path of ['during', 'before', 'same']) { // 'same': buy + Welcome-back in one task, toast still pending its settle frame (review e9b9826 #1)
    const { ctx, page, errors } = await open({ w, h, ls: { 'eggfarm.ui': DONE2 } }); const tag = `${w}x${h} ${path}`;
    await page.evaluate(() => { window.__tl = []; const t0 = performance.now(), e = document.querySelector('.toast'), m = document.querySelector('#modal-layer');
      const loop = () => { const cs = getComputedStyle(e); window.__tl.push({ t: Math.round(performance.now() - t0), modal: m.classList.contains('open'), op: +cs.opacity, vis: cs.visibility, text: e.textContent }); if (performance.now() - t0 < 5000) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
    const buy = () => page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 4, coinsCents: 1e9 }; g.dispatch({ type: 'buyFarm' }); });
    const wb = () => page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, pendingOfflineEggs: 2685, customers: [] }; window.eggfarmQaWelcome(); });
    if (path === 'same') await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 4, coinsCents: 1e9 }; g.dispatch({ type: 'buyFarm' }); g.state = { ...g.state, pendingOfflineEggs: 2685, customers: [] }; window.eggfarmQaWelcome(); });
    else if (path === 'during') { await wb(); await page.waitForTimeout(150); await buy(); } else { await buy(); await page.waitForTimeout(400); await wb(); }
    await page.waitForTimeout(500); if (shot) await page.screenshot({ path: `${MS}/toast-layer-welcome-open-${w}x${h}-${path}.png` });
    const opened = await page.evaluate(() => document.querySelector('#modal-layer').classList.contains('open'));
    await page.evaluate(() => document.querySelector('#wbCollect').click()); await page.waitForTimeout(600);
    if (shot) await page.screenshot({ path: `${MS}/toast-layer-after-close-${w}x${h}-${path}.png` });
    const f = await page.evaluate(() => window.__tl), over = f.filter(x => x.modal && x.vis === 'visible' && x.op > 0.01), after = f.filter(x => !x.modal && f.some(y => y.modal && y.t < x.t));
    ok(`M-Toast-layer no toast visible in any frame while the modal is open (${tag})`, opened && f.some(x => x.modal) && over.length === 0, JSON.stringify({ opened, over: over.slice(0, 3) }));
    ok(`M-Toast-layer held 'Coop upgraded!' appears after the modal closes (${tag})`, after.some(x => x.op > 0.9 && /Coop upgraded/.test(x.text)), JSON.stringify(after.slice(-1)));
    ok(`M-Toast-layer no page errors (${tag})`, errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  const caps = {};
  for (const [w, h] of [[360, 800], [390, 844], [1280, 800]]) { // M-Tut-parity (FM-AC4) + M-Tut-goal (fresh onboarding)
    const { ctx, page, errors } = await open({ w, h });
    const cap = () => page.evaluate(() => { const t = document.querySelector('.onb-txt'), r = t?.getBoundingClientRect(); return t ? { t: t.textContent, fit: t.scrollWidth <= t.clientWidth + 0.5 && !/…/.test(t.textContent) && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight } : null; });
    const seen = [];
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coop: 40 }; }); await page.waitForTimeout(400); seen.push(await cap());
    await page.evaluate(() => window.eggfarm.dispatch({ type: 'collect' })); await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, customers: [{ id: 601, demand: 3, filled: 0, waitedS: 0 }], basket: 5 }; }); await page.waitForTimeout(400); seen.push(await cap());
    await page.evaluate(() => window.eggfarm.dispatch({ type: 'sell', customerId: 601 })); await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coinsCents: 1e6 }; }); await page.waitForTimeout(400); seen.push(await cap());
    caps[w] = seen;
    if (shot) await page.screenshot({ path: `${MS}/tutorial-step3-${nm(w)}.png` });
    // M-Tut-goal: $2 short -> hint bubble with the link
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coinsCents: 800 }; }); await page.waitForTimeout(500);
    const hint = await page.evaluate(() => { const t = document.querySelector('.onb-txt'); return { text: t?.textContent ?? '', html: t?.innerHTML ?? '' }; });
    if (shot) await page.screenshot({ path: `${MS}/tutorial-goal-bubble-${nm(w)}.png` });
    ok(`M-Tut-goal bubble reads "$2 to go · Upgrades ›" with NBSPs (${w})`, hint.text === '$2\u00a0to\u00a0go\u00a0·\u00a0Upgrades\u00a0›', JSON.stringify(hint.text));
    await page.locator('.tut-link').click(); await page.waitForTimeout(450);
    const after = await page.evaluate(() => { const b = document.querySelector('#uRow .btn.buy'), r = b?.getBoundingClientRect(); return { upOpen: !document.querySelector('#p-upgrades').hidden || matchMedia('(min-width:960px) and (orientation:landscape)').matches, pulse: !!b?.classList.contains('pulse'), inView: !!r && r.top >= 0 && r.bottom <= innerHeight }; });
    if (shot) await page.screenshot({ path: `${MS}/tutorial-goal-link-tapped-${nm(w)}.png` });
    ok(`M-Tut-goal link opens Upgrades, target Buy in view and pulsing (${w})`, after.upOpen && after.pulse && after.inView, JSON.stringify(after));
    ok(`rc2minors2 tutorial no page errors (${w})`, errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  const FM4 = ['Tap Collect to gather eggs.', 'A customer! Tap Sell to earn coins.', 'Buy your first upgrade: more eggs per tap.'];
  for (const w of [360, 390, 1280]) ok(`M-Tut-parity FM-AC4 step 1/2/3 captions exact, fit, in viewport (${w})`, caps[w]?.length === 3 && caps[w].every((c, i) => c && c.t === FM4[i] && c.fit), JSON.stringify(caps[w]));
  ok('M-Tut-parity tutorial captions identical at 360, 390 and 1280', JSON.stringify(caps[360]) === JSON.stringify(caps[390]) && JSON.stringify(caps[390]) === JSON.stringify(caps[1280]), JSON.stringify(caps));
};
for (const [n, f] of Object.entries(sections)) if (want(n)) { try { await f(); } catch (e) { ok(`${n} threw`, false, String(e).slice(0, 300)); } }
await browser.close(); killSrv();
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'} [${ENGINE}${headless ? '' : ' headed'}] ${r.name}${r.info ? ` — ${r.info}` : ''}`);
console.log(`${results.filter(r => r.pass).length}/${results.length} passed`);
