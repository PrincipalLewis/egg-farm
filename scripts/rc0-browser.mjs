// rc0 browser checks + screenshots. Needs a QA build (?ios= flag): npm run build:qa && node scripts/rc0-browser.mjs
// Engine: CLI arg `node scripts/rc0-browser.mjs webkit` or ENGINE=chromium|webkit|firefox (default chromium; CLI wins). HEADED=1.
import { chromium, webkit, firefox } from 'playwright-core';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
const ENGINE = process.argv[2] ?? process.env.ENGINE ?? 'chromium';
if (!['chromium', 'webkit', 'firefox'].includes(ENGINE)) { console.error(`rc0-browser: unknown engine ${ENGINE}`); process.exit(2); }
const headless = !process.env.HEADED;
const port = +(process.env.PORT ?? 4181); const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
const killSrv = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch { } };
await new Promise(r => setTimeout(r, 1500));
const SHOTS = process.env.SHOTS ?? '../engineering/screenshots'; mkdirSync(SHOTS, { recursive: true });
const shot = ENGINE === 'chromium' && headless; // screenshots once, from headless Chromium
const browser = ENGINE === 'webkit' ? await webkit.launch({ headless }) : ENGINE === 'firefox' ? await firefox.launch({ headless }) : await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', headless, args: ['--no-sandbox'] });
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
    const axe = readFileSync(process.env.AXE_PATH || '/tmp/axe/node_modules/axe-core/axe.min.js', 'utf8') // AXE_PATH overrides the default manual install;
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

// ---------- B5 / B8 Manage all ----------
sections.b58 = async () => {
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const { ctx, page } = await open({ w, h, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true }) } });
    const set = e => page.evaluate(e => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 10, coinsCents: 1e9, manageCdS: 0, workers: { market_hand: { energy: e[0], cdS: 1 }, coop_hand: { energy: e[1], cdS: 1 }, hawker: { energy: e[2], cdS: 0 } } }; }, e);
    await set([81, 90, 98]); await page.waitForTimeout(300);
    const n1 = await page.locator('[data-act=manageAll]').count(), vis1 = await page.locator('[data-act=manageAll]:visible').count();
    ok(`B8 exactly one Farm View Manage all button in the DOM (${w})`, (await page.locator('.farm-manage-all').count()) === 1);
    ok(`B5 workers at 81-98% -> no Manage all shown (${w})`, vis1 === 0, `dom=${n1}`);
    await set([30, 51, 98]); await page.waitForTimeout(300);
    const vis2 = await page.locator('.farm-manage-all:visible').count();
    if (w > 900) { const bb = await page.locator('.farm-manage-all').boundingBox(); ok('B8 desktop Manage all sits in the Upgrades header, 44x44', bb && bb.width === 44 && bb.height === 44 && (await page.locator('#p-upgrades header .farm-manage-all').count()) === 1, JSON.stringify(bb)); }
    if (w < 900) { await page.locator('[data-nav=upgrades]').click(); }
    await page.locator('[data-tab=workers]').click(); await page.waitForTimeout(300);
    const pill = await page.locator('#uRow .manage-all').textContent().catch(() => '');
    ok(`B5 one worker at/below threshold -> Farm View button visible + "(1 need it)" (${w})`, vis2 === 1 && /\(1 need it\)/.test(pill), `vis=${vis2} pill=${pill}`);
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
    const rows = await page.$$eval('#mRows .order:not([hidden])', rs => rs.map(r => { const a = r.getBoundingClientRect(), b = r.querySelector('.btn').getBoundingClientRect(), t = r.querySelector('.l1').getBoundingClientRect(); return { inside: b.right <= a.right - 8 + 0.5 && b.left >= a.left, lines: Math.round(t.height / 19), text: r.querySelector('.l1').innerText.replace(/[ \t\r\n]+/g, ' ').trim() }; }));
    if (shot && w === 375 && h === 812) await page.screenshot({ path: `${SHOTS}/m3-rc0-bug9-375-market.png` });
    await page.locator('.sheet:not([hidden]) .close').click(); await page.locator('[data-nav=upgrades]').click(); await page.waitForTimeout(200); res.upgrades = await m();
    await page.locator('[data-tab=workers]').click(); await page.waitForTimeout(200); res.workers = await m();
    const tabs = await page.$$eval('.tabs button', bs => bs.map(b => b.scrollWidth <= b.clientWidth + 1));
    ok(`Bug9 no sideways scroll on farm/market/upgrades/workers at ${w}x${h}`, Object.values(res).every(r => r.sw <= r.cw && r.bsw <= r.cw && r.wide === 0), JSON.stringify(res));
    ok(`Bug9 Sell buttons inside the card (>=8px), order text <=2 lines, short copy at ${w}`, rows.length > 0 && rows.every(r => r.inside && r.lines <= 2) && rows.every(r => /^\d[\d.K]*\/\d[\d.K]*[ \u00a0]*\u00a0[ \u00a0]*eggs\s*·\s*\$/.test(r.text)), JSON.stringify(rows.slice(0, 2)));
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
  ok('S2-8 ui.rates(): Market Hand wage 1.25 c/s (exact) at L3, net rate readable', r.workers.market_hand.wageCentsPerSec === 1.25 && typeof r.netCentsPerSec === 'number', JSON.stringify(r));
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

// ---------- QA TUT-1: docked desktop tutorial Sell step targets a Sell button that really sells ----------
sections.tut1docked = async () => {
  for (const [w, h] of [[1024, 474], [1280, 720], [1366, 768]]) {
    const { ctx, page, errors } = await open({ w, h });
    const onbStep = () => page.evaluate(() => JSON.parse(localStorage.getItem('eggfarm.ui') ?? '{}').onbStep ?? 0);
    for (let i = 0; i < 6; i++) { await page.locator('#collect').click(); await page.waitForTimeout(120); }
    await page.evaluate(() => { const g = window.eggfarm; if (!g.state.customers.length) g.state = { ...g.state, nextCustomerInS: 0 }; });
    await page.waitForFunction(() => window.eggfarm.state.customers.length > 0 && document.querySelector('#mRows button[data-id]'), null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(400);
    const step0 = await onbStep();
    const tgt = await page.evaluate(() => { const r = document.querySelector('.onb-ring'); if (!r || r.style.display === 'none') return null; const b = r.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
      const ring = r.style.pointerEvents; r.style.pointerEvents = 'none'; const el = document.elementFromPoint(x, y); r.style.pointerEvents = ring;
      const btn = el?.closest('button'); return { x, y, sell: !!btn?.closest('#mRows') && btn.hasAttribute('data-id'), tag: btn ? btn.className : el?.className }; });
    const before = await page.evaluate(() => ({ coins: window.eggfarm.state.coinsCents, cust: window.eggfarm.state.customers.length }));
    if (tgt) await page.mouse.click(tgt.x, tgt.y); await page.waitForTimeout(600);
    const after = await page.evaluate(() => ({ coins: window.eggfarm.state.coinsCents, cust: window.eggfarm.state.customers.length })); const step1 = await onbStep();
    ok(`TUT-1 docked ${w}x${h}: Sell step targets a Sell button; clicking it sells and advances the step`, !!tgt?.sell && after.coins > before.coins && step1 > step0 && errors.length === 0, JSON.stringify({ tgt, before, after, step0, step1, errors }));
    await ctx.close();
  }
};

// ---------- S2 hidden tab (bug-offline-overcredit.md, C-AC36): 671 s hidden -> frozen after 60 s, paid via the offline popup ----------
sections.hiddentab = async () => {
  const { ctx, page, errors } = await open({ ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true }) } });
  await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 15, coop: 51, coinsCents: 12345 };
    const real = Date.now; window.__real = real; window.__off = 0; window.__t0 = null; Date.now = () => (window.__t0 ?? real()) + window.__off;
    window.__vis = 'visible'; Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.__vis }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__vis === 'hidden' }); });
  await page.waitForTimeout(300);
  const hid = await page.evaluate(() => { window.__t0 = window.__real(); /* freeze the clock at the hide: away must be exactly 671 s, no real-time leak between evaluates */ window.__vis = 'hidden'; document.dispatchEvent(new Event('visibilitychange')); const g = window.eggfarm; return { coins: g.state.coinsCents, pend: g.state.pendingOfflineEggs, saved: JSON.parse(localStorage.getItem('eggfarm.save')).state.coinsCents }; });
  const mid = await page.evaluate(() => { const g = window.eggfarm; for (let s = 60; s <= 671; s += 60) { window.__off = Math.min(671, s) * 1000; g.frame(); } window.__off = 671_000; g.frame(); return { hidden: g.isHidden }; });
  const back = await page.evaluate(() => { window.__vis = 'visible'; document.dispatchEvent(new Event('visibilitychange')); const g = window.eggfarm; return { coins: g.state.coinsCents, pend: g.state.pendingOfflineEggs, away: g.offline.awayS, eggs: g.offline.eggs }; });
  await page.waitForTimeout(300);
  const modal = await page.locator('#wbT').count();
  ok('S2 hidden tab: hide save is the hide snapshot; 671 s hidden pays the offline grant (away 671 s), coins as at the hide, welcome popup shown',
    mid.hidden && hid.coins > 0 && hid.saved === hid.coins && back.away === 671 && back.eggs > 0 && back.pend === hid.pend + back.eggs && back.coins === hid.coins && modal === 1 && errors.length === 0, JSON.stringify({ hid, back, modal, errors }));
  await ctx.close();
};

// SECTIONS
for (const [n, f] of Object.entries(sections)) if (want(n)) { try { await f(); } catch (e) { ok(`${n} threw`, false, String(e).slice(0, 300)); } }
await browser.close(); killSrv();
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'} [${ENGINE}${headless ? '' : ' headed'}] ${r.name}${r.info ? ` — ${r.info}` : ''}`);
console.log(`${results.filter(r => r.pass).length}/${results.length} passed`);
