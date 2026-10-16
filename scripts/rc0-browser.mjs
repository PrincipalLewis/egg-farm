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
    if (w > 900) { const bb = await page.locator('.farm-manage-all').boundingBox(); ok('B8 desktop Manage all sits in the Upgrades header, 44x44', bb && bb.width === 44 && bb.height === 44 && (await page.locator('#p-upgrades header .farm-manage-all').count()) === 1, JSON.stringify(bb)); }
    if (w < 900) { await page.locator('[data-nav=upgrades]').click(); }
    await page.locator('[data-tab=workers]').click(); await page.waitForTimeout(300);
    const pill = await page.locator('#uRow .manage-all').textContent().catch(() => '');
    ok(`B5 one worker <= 40% -> Farm View button visible + "(1 need it)" (${w})`, vis2 === 1 && /\(1 need it\)/.test(pill), `vis=${vis2} pill=${pill}`);
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
    const exp = await page.evaluate(coop => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 0, collectionLevel: 0, coop, basket: 0, workers: {}, customers: [], nextCustomerInS: 1e9 };
      window.__n = 0; if (!window.__fc) { window.__fc = 1; g.on(e => { if (e.type === 'collect' && e.eggs > 0) window.__n++; }); }
      const per = 5; return Math.min(10, Math.floor(coop / per) + (coop % per ? 1 : 0)); }, coop);
    const b = await page.locator(target).boundingBox(); const x = b.x + b.width / 2, y = b.y + Math.min(b.height / 2, 60);
    for (let i = 0; i < 10; i++) { await page.touchscreen.tap(x, y); await page.waitForTimeout(50); }
    await page.waitForTimeout(300); const n = await page.evaluate(() => window.__n);
    ok(`Fast Collect: 10 taps on ${target} 50 ms apart (coop ${coop}) -> ${exp} collects`, n === exp, `got ${n}`);
  }
  ok('Fast Collect no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
};

// SECTIONS
for (const [n, f] of Object.entries(sections)) if (want(n)) { try { await f(); } catch (e) { ok(`${n} threw`, false, String(e).slice(0, 300)); } }
await browser.close(); killSrv();
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'} [${ENGINE}${headless ? '' : ' headed'}] ${r.name}${r.info ? ` — ${r.info}` : ''}`);
console.log(`${results.filter(r => r.pass).length}/${results.length} passed`);
