// rc0 browser checks + screenshots. Needs a QA build (?ios= flag): npm run build:qa && node scripts/rc0-browser.mjs
// Engine: CLI arg `node scripts/rc0-browser.mjs webkit` or ENGINE=chromium|webkit (default chromium; CLI wins). HEADED=1.
import { chromium, webkit } from 'playwright-core';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
const ENGINE = process.argv[2] ?? process.env.ENGINE ?? 'chromium';
if (!['chromium', 'webkit'].includes(ENGINE)) { console.error(`rc0-browser: unknown engine ${ENGINE}`); process.exit(2); }
const headless = !process.env.HEADED;
// PORT: was a fixed 4181, which collided with parallel worktrees
const port = +(process.env.PORT ?? 4300 + Math.floor(Math.random() * 600)); const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
const killSrv = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch { } };
for (let i = 0; i < 240; i++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
const SHOTS = '../engineering/screenshots'; mkdirSync(SHOTS, { recursive: true });
const shot = ENGINE === 'chromium' && headless; // screenshots once, from headless Chromium
const browser = ENGINE === 'webkit' ? await webkit.launch({ headless }) : await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', headless, args: ['--no-sandbox'] });
const results = []; const ok = (name, pass, info = '') => { results.push({ name, pass: !!pass, info }); if (!pass) process.exitCode = 1; };
const URL0 = `http://127.0.0.1:${port}/`;
const fx = f => readFileSync(new URL(`../tests/fixtures/saves/${f}`, import.meta.url), 'utf8');
async function open({ w = 390, h = 844, ls = {}, q = '', touch = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, acceptDownloads: true });
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
    if (shot && F === 4) await page.screenshot({ path: `${SHOTS}/rc1-s2-1-toast-over-sheet-390.png` });
    await page.waitForTimeout(1600);
  }
  await page.locator('.sheet:not([hidden]) .close').click(); await page.waitForTimeout(100);
  ok('S2-1 coop bounce plays once the sheet closes', await page.evaluate(() => document.querySelector('#coop').classList.contains('bounce')));
  if (shot) await page.screenshot({ path: `${SHOTS}/rc1-s2-1-coop-l20-390.png` });
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
    await page.waitForTimeout(2200);
    const qb = await page.locator('#queue').evaluate(e => e.getBoundingClientRect().bottom); const below = w < 960;
    const after = await page.locator('.toast').evaluate(e => { const r = e.getBoundingClientRect(); return { bottom: r.bottom, vis: getComputedStyle(e).visibility, op: getComputedStyle(e).opacity }; });
    // QA precheck-2fae4c4 §1: width-aware. <960: sits 8px below the queue strip (F1) and fades in place; docked: slides off the top.
    ok(`B2 L5 toast shows then is fully gone (${below ? 'below strip, faded' : 'off the top'}) (${w})`, shown.vis === 'visible' && /Coop upgraded/.test(shown.text) && after.vis === 'hidden' && after.op === '0'
      && (below ? Math.abs(shown.top - (qb + 8)) <= 1 : (shown.top >= 0 && after.bottom <= 0)), JSON.stringify({ shown, after, qb }));
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
  const read = () => page.evaluate(() => [...document.querySelectorAll('nav.actions button')].filter(b => !b.hidden).map(b => { const r = b.getBoundingClientRect(); return { aria: b.getAttribute('aria-label'), label: b.querySelector('.nav-lbl')?.textContent, icon: !!b.querySelector('img'), w: Math.round(r.width), h: Math.round(r.height) }; }));
  const check = (r, tag) => ok(`S2-5 nav ${tag}: 4 buttons, each icon + visible label + aria-label, >=64x44`, r.length === 4 && r.every(x => x.icon && x.label && x.aria && x.w >= 64 && x.h >= 44) && r[2].label === 'Manage' && r[2].aria === 'Manage tired workers, 1 tired', JSON.stringify(r));
  await page.waitForTimeout(300); check(await read(), 'fresh load');
  await page.evaluate(() => window.eggfarm.save()); await page.reload(); await page.getByText('Tap to start').click(); await page.waitForFunction(() => window.eggfarm); await page.waitForTimeout(400);
  const r2 = await read(); check(r2, 'after reload');
  ok('S2-5 exactly one worker button in the DOM after reload', (await page.locator('[data-act=manageAll]').count()) === 1);
  await page.locator('nav [data-act=manageAll]').click(); await page.waitForTimeout(300);
  const cd = await page.evaluate(() => { const b = document.querySelector('nav [data-act=manageAll]'); return { label: b.querySelector('.nav-lbl').textContent, aria: b.getAttribute('aria-label'), dis: b.getAttribute('aria-disabled') }; });
  ok('S2-5 cooldown: label "0:NN", aria "available in N seconds", aria-disabled', /^0:\d\d$/.test(cd.label) && /available in \d+ seconds/.test(cd.aria) && cd.dis === 'true', JSON.stringify(cd));
  if (shot) await page.screenshot({ path: `${SHOTS}/rc1-s2-5-nav-390.png`, clip: { x: 0, y: 844 - 80, width: 390, height: 80 } });
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

// SECTIONS
for (const [n, f] of Object.entries(sections)) if (want(n)) { try { await f(); } catch (e) { ok(`${n} threw`, false, String(e).slice(0, 300)); } }
await browser.close(); killSrv();
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'} [${ENGINE}${headless ? '' : ' headed'}] ${r.name}${r.info ? ` — ${r.info}` : ''}`);
console.log(`${results.filter(r => r.pass).length}/${results.length} passed`);
