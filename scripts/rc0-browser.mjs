// rc0 browser checks + screenshots. Needs a QA build (?ios= flag): npm run build:qa && node scripts/rc0-browser.mjs
// Engine: CLI arg `node scripts/rc0-browser.mjs webkit` or ENGINE=chromium|webkit (default chromium; CLI wins). HEADED=1.
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
const SHOTS = '../engineering/screenshots'; mkdirSync(SHOTS, { recursive: true });
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
    if (await page.locator('#wbCollect').count()) await page.locator('#wbCollect').click();
    await page.waitForTimeout(3000);
    const sold = await page.evaluate(() => JSON.parse(window.eggfarmExportTelemetry()).events.filter(e => e.type === 'sale' || e.type === 'sell').length);
    if (mh) ok('S2-4c line "Market Hand sold 339 right away · +$…", 14px #6B5D52', line && /^Market Hand sold 339 right away\u00a0· \+\$/.test(line) && css[0] === '14px' && css[1] === 'rgb(107, 93, 82)', JSON.stringify({ line, css, b0, sold }));
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
    await page.waitForTimeout(1300);
    const r = await page.evaluate(() => { const e = document.querySelector('#rate'), cs = getComputedStyle(e); return { text: e.textContent, aria: e.getAttribute('aria-label'), sign: e.dataset.sign, color: cs.color, size: cs.fontSize, weight: cs.fontWeight, shook: e.classList.contains('rshake') }; });
    ok('S2-8 negative net rate: "▼−$x.xx/s" (U+2212, no hyphen, 2 decimals), 11px/700 #B83B37, aria "Net income minus N cents per second", shakes once', /^\u25BC\u2212\$\d+\.\d\d\/s$/.test(r.text) && !/-/.test(r.text) && r.sign === 'neg' && r.color === 'rgb(184, 59, 55)' && r.size === '11px' && r.weight === '700' && /^Net income minus [\d.]+ (cents?|dollars) per second$/.test(r.aria) && r.shook, JSON.stringify(r));
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
  for (const w of [390, 1280]) {
    const { ctx, page } = await open({ w, h: w > 900 ? 800 : 844, ls: { 'eggfarm.ui': DONE } });
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 4, coinsCents: 1e9 }; g.dispatch({ type: 'buyFarm' }); });
    await page.waitForTimeout(300); const shown = await page.locator('.toast').evaluate(e => { const r = e.getBoundingClientRect(); return { top: r.top, vis: getComputedStyle(e).visibility, text: e.textContent }; });
    await page.waitForTimeout(1900); const mid = await page.locator('.toast').evaluate(e => getComputedStyle(e).visibility); // 2.2 s: still up (2.5 s)
    await page.waitForTimeout(800);
    const qb = await page.locator('#queue').evaluate(e => e.getBoundingClientRect().bottom); const below = w < 960;
    const after = await page.locator('.toast').evaluate(e => { const r = e.getBoundingClientRect(); return { bottom: r.bottom, vis: getComputedStyle(e).visibility, op: getComputedStyle(e).opacity }; });
    // QA precheck-2fae4c4 §1: width-aware. <960: sits 8px below the queue strip (F1) and fades in place; docked: slides off the top.
    ok(`B2 L5 toast shows then is fully gone (${below ? 'below strip, faded' : 'off the top'}) (${w})`, shown.vis === 'visible' && mid === 'visible' && /Coop upgraded/.test(shown.text) && after.vis === 'hidden' && after.op === '0'
      && (below ? Math.abs(shown.top - (qb + 8)) <= 1 : (shown.top >= 0 && after.bottom <= 0)), JSON.stringify({ shown, mid, after, qb }));
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
  const check = (r, tag) => ok(`S2-5 nav ${tag}: 4 buttons, each icon + visible label + aria-label, >=64x44`, r.length === 4 && r.every(x => x.icon && x.label && x.aria && x.w >= 64 && x.h >= 44) && r[2].label === 'Refill' && r[2].aria === 'Refill 1 tired workers' && r[2].h === 64 && r[2].badge === '1', JSON.stringify(r));
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
  await page.waitForTimeout(1500);
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
    if (w > 900) { const bb = await page.locator('.farm-manage-all').boundingBox(); ok('B8 desktop Manage sits in the Upgrades header, 44px tall, labelled (S2-5)', bb && bb.width >= 44 && bb.height === 44 && /Refill tired \(\d\)/.test(await page.locator('.farm-manage-all').innerText()) && (await page.locator('#p-upgrades header .farm-manage-all').count()) === 1, JSON.stringify(bb)); }
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
    ok(`B5 one worker <= 40% -> Farm View button visible + "Refill tired (1)" (${w})`, vis2 === 1 && /Refill tired \(1\)/.test(pill), `vis=${vis2} pill=${pill}`);
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
    ok(`Bug9 Sell buttons inside the card (>=8px), order text <=2 lines, short copy at ${w}`, rows.length > 0 && rows.every(r => r.inside && r.lines <= 2) && rows.every(r => /^\d[\d.K]*\/\d[\d.K]* eggs\s*·\s*\$/.test(r.text)), JSON.stringify(rows.slice(0, 2)));
    ok(`Bug9 tab labels not clipped at ${w}`, tabs.every(Boolean), JSON.stringify(tabs));
    await ctx.close();
  }
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
  for (const [name, text] of [['noincome', null], ['1h05', 'Affordable in ~1:05:00'], ['moment', 'Affordable in a moment']]) {
    if (text) await page.evaluate(t => { window.__etaStub = t; }, text);
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
  for (const [name, energy, cd, cap] of [['available', 30, 0, ''], ['not-tired', 90, 0, 'Not tired yet'], ['cooldown', 30, 12, 'Ready in 12s']]) {
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

// SECTIONS
for (const [n, f] of Object.entries(sections)) if (want(n)) { try { await f(); } catch (e) { ok(`${n} threw`, false, String(e).slice(0, 300)); } }
await browser.close(); killSrv();
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'} [${ENGINE}${headless ? '' : ' headed'}] ${r.name}${r.info ? ` — ${r.info}` : ''}`);
console.log(`${results.filter(r => r.pass).length}/${results.length} passed`);
