// rc0 browser checks + screenshots. Needs a QA build (?ios= flag): npm run build:qa && node scripts/rc0-browser.mjs
// Usage (also: node scripts/rc0-browser.mjs --help):
//   PORT=<n>       pin the preview port (default: a free port). Non-numeric = exit 2.
//   The served dist-qa must be THIS checkout: build-id hash = HEAD and the same dirty state, else exit 2.
//   ALLOW_DIRTY=1  admit a +dirty build while the tree is dirty (a deliberate flag-off run). ALLOW_NO_GIT=1 skips the check
//                  when git is unavailable. A clean build on a dirty tree (incl. untracked files) is always refused.
//   Flag-off rc0:  set m4.enabled=0 in src/config/balance.json, npm run build:qa, ALLOW_DIRTY=1 node scripts/rc0-browser.mjs;
//                  then revert balance.json and npm run build:qa again (a +dirty build on a clean tree is refused).
// Engine: CLI arg `node scripts/rc0-browser.mjs webkit` or ENGINE=chromium|webkit|firefox (default chromium; CLI wins). HEADED=1.
import { chromium, webkit, firefox } from 'playwright-core';
import { serveForRun } from './serve-own.mjs';
import { readFileSync, mkdirSync } from 'node:fs';
if (process.argv.includes('--help') || process.argv.includes('-h')) { console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(0, 9).map(l => l.replace(/^\/\/ ?/, '')).join('\n')); process.exit(0); }
const ENGINE = process.argv[2] ?? process.env.ENGINE ?? 'chromium';
if (!['chromium', 'webkit', 'firefox'].includes(ENGINE)) { console.error(`rc0-browser: unknown engine ${ENGINE}`); process.exit(2); }
const headless = !process.env.HEADED;
// CCR n-d: no fixed default port (4181 once served a stale foreign build). PORT unset = a free port from the OS; an explicit PORT
// is honoured as-is. serveOwn checks the page on that port is THIS dist-qa (own entry chunk), and expectHeadBuild that its
// build-id is this checkout's HEAD with the same dirty state (ALLOW_DIRTY=1 admits a +dirty build); any mismatch, or a
// non-numeric PORT, exits 2 before any check runs. The server is stopped on every exit path.
const srv = await serveForRun('dist-qa', 'rc0-browser'), port = srv.port; // exits 2 on a bad PORT / foreign or stale build
const killSrv = () => srv.stop();
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
/** CCR m1-new: the description must name the strip's OWN target and status, not just have the right shape.
 *  F4 label → `{Track} level {n}` (`Value`→`Egg value`, `Coll.`→`Collection`; a JS-ellipsised name matches as a prefix);
 *  non-F4 label → `Next goal: {label, L{n} → level {n} (M4 on; f4 = 'off' keeps L{n}), first : → ,}.`; done → `Next goal: all upgrades done.`; status pill → its sentence. */
const descMatchesTarget = (desc, labelText, status, f4) => {
  if (!desc) return false;
  const lbl = labelText.replace(/\u00a0/g, ' ').replace(/^★ /, '');
  if (/^All upgrades done!$/.test(lbl)) return desc === 'Next goal: all upgrades done.';
  const st = status === 'Ready!' ? 'Ready now.' : status === '—' ? 'Sell eggs to earn coins.' : status.startsWith('~') ? 'Ready in about ' : null;
  if (!st || !desc.includes(` ${st}`)) return false;
  if (f4 === 'off') return desc.startsWith(`Next goal: ${lbl.replace(':', ',')}. `); // flag-off AC5 sentence, byte-identical
  if (!f4) return desc.startsWith(`Next goal: ${lbl.replace(/\bL(\d+)\b/, 'level $1').replace(':', ',')}. `); // M4 on: `Farm L2` → `Farm level 2`
  const m = lbl.match(/^(.*?) L(\d+)(?=[: ]|$)/); if (!m) return false;
  const cut = m[1].endsWith('…'), name = cut ? m[1].slice(0, -1) : ({ Value: 'Egg value', 'Coll.': 'Collection' })[m[1]] ?? m[1];
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^Next goal: (best buy, )?${esc(name)}${cut ? '[^,]*' : ''} level ${m[2]}(,|\\.)`).test(desc) && (/^★/.test(labelText) === /^Next goal: best buy, /.test(desc));
};
sections.b3 = async () => {
  const { ctx, page } = await open({ ls: { 'eggfarm.ui': DONE } });
  await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 2, coinsCents: 500 }; });
  for (let i = 0; i < 6; i++) { await page.evaluate(() => window.eggfarm.dispatch({ type: 'sellAll' })); await page.waitForTimeout(500); }
  // CCR n6: seed one real sale so the rolling income is > 0 and B3 covers the `+X% income` + timer variant (F4-11 hides it at 0).
  await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, basket: 20, customers: [{ id: 99001, demand: 5, filled: 0, waitedS: 0 }] }; g.dispatch({ type: 'sellAll' });
    g.state = { ...g.state, coinsCents: 500, customers: [], nextCustomerInS: 1e9 }; });
  await page.waitForTimeout(1200);
  // m4a-spec v1.25 F4-14a + Art 2.5.3 ruling: #goal has no aria-label for ANY target; the accessible name is the visible
  // text (★ / JS `…` aria-hidden) and must START with it; the spoken B3 sentence is the aria-describedby description.
  const r = await page.evaluate(() => { const b = document.querySelector('#goal'), lbl = b.querySelector('.goal-label'), d = b.getAttribute('aria-describedby');
    const vis = n => [...n.childNodes].map(c => c.nodeType === 3 ? c.textContent : c.getAttribute?.('aria-hidden') === 'true' ? '' : vis(c)).join('');
    return { ariaLabel: b.getAttribute('aria-label'), desc: d ? document.getElementById(d)?.textContent ?? null : null, label: lbl.textContent, labelVis: vis(lbl), ng: lbl.classList.contains('ng'),
      status: b.querySelector('.goal-status').textContent, live: document.querySelector('#goalLive').textContent }; });
  const snap = await page.locator('#goal').ariaSnapshot(); r.name = snap.match(/^- '?button "(.*)"'?:?$/m)?.[1]?.replace(/\\"/g, '"') ?? null;
  r.aria = r.desc ?? '';
  const num = r.status.match(/\d+/)?.[0], ws = v => (v ?? '').replace(/\s+/g, ' ').trim(), visible = ws(`${r.labelVis} ${r.status}`);
  ok('B3 chip aria-label matches visible target/timer, no "1 minutes"', r.ariaLabel === null && visible.length > 0 && ws(r.name).startsWith(visible)
      && /^Next goal: (.+\. (Ready now|Ready in about .+|Sell eggs to earn coins)|all upgrades done)\.$/.test(r.desc ?? '') && !/[…★]/.test(r.name + r.desc)
      && (!num || r.aria.includes(num)) && !/\b1 (minutes|seconds|hours)\b/.test(r.aria + r.live)
      && descMatchesTarget(r.desc, r.label, r.status, r.ng), JSON.stringify(r)); // m1-new: the sentence names THIS target
  await page.waitForTimeout(4500);
  ok('B3 live region cleared after announcing (never stale)', (await page.locator('#goalLive').textContent()) === '' || (await page.locator('#goalLive').textContent()) === r.aria);
  await ctx.close();
  // Art 2.5.3 ruling: the non-F4 targets too (FARM, a worker, done). Flag-off is build-time config (not reachable from
  // dist-qa); it shares this code path and is covered in jsdom (tests/m41-8-best-chip.test.ts).
  const W = { energy: 100, cdS: 1 };
  for (const [name, re, st] of [
    ['FARM', /^Farm L\d+/, { farmLevel: 0, hensLevel: 3, eggValueLevel: 3, collectionLevel: 0, coinsCents: 0 }],
    ['FARM ready', /^Farm L\d+/, { farmLevel: 0, hensLevel: 3, eggValueLevel: 3, collectionLevel: 0, coinsCents: 1e13 }],
    ['W1 Market Hand', /^Hire Market Hand$/, { farmLevel: 11, hensLevel: 16, eggValueLevel: 16, collectionLevel: 6, coinsCents: 1e13, workers: { hawker: W } }],
    ['W3 Hawker', /^Hire Hawker$/, { farmLevel: 8, hensLevel: 11, eggValueLevel: 11, collectionLevel: 2, coinsCents: 0 }],
    ['worker', /^Grader tier \d+: ×/, { farmLevel: 18, hensLevel: 15, eggValueLevel: 15, collectionLevel: 15, coinsCents: 0 }],
    ['done', /^All upgrades done!$/, { farmLevel: 30, hensLevel: 99, eggValueLevel: 99, collectionLevel: 30, coinsCents: 0, graderTier: 'max', workers: { market_hand: W, coop_hand: W, hawker: W, grader: W } }]]) {
    const { ctx: c2, page: p2 } = await open({ ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, seenSlots: 6 }) } });
    await p2.evaluate(st => { const g = window.eggfarm;
      g.state = { ...g.state, basket: 20, customers: [{ id: 99001, demand: 5, filled: 0, waitedS: 0 }] }; g.dispatch({ type: 'sellAll' });
      g.state = { ...g.state, ...st, ...(st.graderTier === 'max' ? { graderTier: g.b.workers.grader.tiers.length } : {}), tracksV7: 1, seenTracksExplainer: true, customers: [], nextCustomerInS: 1e9 }; }, st);
    await p2.waitForTimeout(1500);
    const q = await p2.evaluate(() => { const b = document.querySelector('#goal'), lbl = b.querySelector('.goal-label'), d = b.getAttribute('aria-describedby');
      return { ariaLabel: b.getAttribute('aria-label'), desc: d ? document.getElementById(d)?.textContent ?? null : null, label: lbl.textContent, ng: lbl.classList.contains('ng'), status: b.querySelector('.goal-status').textContent }; });
    q.name = (await p2.locator('#goal').ariaSnapshot()).match(/^- '?button "(.*)"'?:?$/m)?.[1]?.replace(/\\"/g, '"') ?? null;
    const ws = v => (v ?? '').replace(/\s+/g, ' ').trim(), visible = ws(`${q.label} ${q.status}`), num = q.status.match(/\d+/)?.[0];
    ok(`B3 ${name} target: no aria-label, name starts with the visible text, B3 sentence is the description`, !q.ng && re.test(ws(q.label)) && q.ariaLabel === null
      && ws(q.name).startsWith(visible) && /^Next goal: (.+\. (Ready now|Ready in about .+|Sell eggs to earn coins)|all upgrades done)\.$/.test(q.desc ?? '')
      && (!num || q.desc.includes(num)) && !/\b1 (minutes|seconds|hours)\b/.test(q.desc) && descMatchesTarget(q.desc, q.label, q.status, false), JSON.stringify(q));
    await c2.close();
  }
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
    ok(`B5 one worker at/below threshold -> Farm View button visible + "Refill 1 tired worker" (${w})`, vis2 === 1 && /Refill 1 tired worker/.test(pill), `vis=${vis2} pill=${pill}`);
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
  const pre = await page.evaluate(() => ({ c: window.eggfarm.state.coinsCents, F: window.eggfarm.state.farmLevel, dis: document.querySelector('#uRow .btn.buy[data-kind=farm]').getAttribute('aria-disabled'), sv: localStorage.getItem('eggfarm.save') }));
  await page.locator('#uRow .btn.buy[data-kind=farm]').click({ force: true, timeout: 5000 }); await page.waitForTimeout(300);
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
    for (let i = 0; i < 3; i++) { document.querySelector('#uRow .btn.buy[data-kind=farm]').click(); out.push([g.state.farmLevel, document.querySelector('#uRow [data-track=farm] .lv').textContent]); } return out; });
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
  // M41-7 integration (Saves loader + UI #58): the loader now supplies `source`, so restored/fresh show the CSR-9 FINAL copy
  // (spec corrupt-save-recovery-spec.m41-final.md CSR-9 M1/M3, sha256 6131c290…433334d; UI strings src/ui/save-recovery.ts CSR_COPY).
  restored: { title: 'Your farm is back!', body: 'We fixed a hiccup and restored your latest save.', btn: 'Continue', badge: '\u2713', exp: null },
  fresh: { title: 'A fresh start', body: "We couldn't recover your save, so we started a new farm for you.", btn: 'Start farming', badge: '\u2605', exp: 'rc-link', expText: 'Export old save file', aria: 'Export old save file, downloads a copy of your old save file' },
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

// CCR 59cce62 n1 / m1: hidden tab loses the save to another tab -> its hidden period ends with the freeze; on show no
// welcome popup and no save from the frozen tab. Shots m1-deactivate at 360, 390 and 1280 on every engine (art-ux re-shoot).
sections.hiddentabguard = async () => {
  for (const w of [360, 390, 1280]) {
    const { ctx, page, errors } = await open({ w, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true }) } });
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 15, coop: 51, coinsCents: 12345 };
      window.__vis = 'visible'; Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.__vis }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__vis === 'hidden' });
      window.__vis = 'hidden'; document.dispatchEvent(new Event('visibilitychange')); });
    const p2 = await ctx.newPage(); await p2.goto(URL0, { waitUntil: 'domcontentloaded' }); await p2.getByText('Tap to start').click(); await p2.waitForFunction(() => window.eggfarm); await p2.waitForTimeout(400);
    const frz = await page.evaluate(() => { const g = window.eggfarm; g.save(); return { inactive: g.inactive, hidden: g.isHidden }; });
    const before = await page.evaluate(() => localStorage.getItem('eggfarm.save'));
    await p2.close(); // B's pagehide save lands before A shows; snapshot again so only A's writes count
    // WebKit propagates B's pagehide localStorage write to A asynchronously: wait until A sees a stable value
    let snap = await page.evaluate(() => localStorage.getItem('eggfarm.save'));
    for (let i = 0; i < 20; i++) { await page.waitForTimeout(150); const v = await page.evaluate(() => localStorage.getItem('eggfarm.save')); if (v === snap && i >= 3) break; snap = v; }
    await page.evaluate(() => { window.__w = 0; const ss = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (String(k).startsWith('eggfarm.save')) window.__w++; return ss.call(this, k, v); };
      window.__vis = 'visible'; document.dispatchEvent(new Event('visibilitychange')); window.eggfarm.save(); });
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => ({ hidden: window.eggfarm.isHidden, welcome: document.querySelectorAll('#wbT').length, guard: !!document.querySelector('.recovery-layer.tab-guard'), writes: window.__w, save: localStorage.getItem('eggfarm.save'),
      playH: Math.round(document.querySelector('#tgPlay')?.getBoundingClientRect().height ?? 0) }));
    ok(`CCR m1 ${w}: hidden tab frozen by another tab -> period ended, no welcome popup, no save after show`, frz.inactive && !frz.hidden && !st.hidden && st.welcome === 0 && st.guard && st.writes === 0 && st.save === snap && before !== null && errors.length === 0, JSON.stringify({ frz, ...st, save: undefined, same: st.save === snap, errors }));
    ok(`Tab guard 'Play here' min-height 48px at ${w} (art-ux dialog.html)`, st.playH >= 48, String(st.playH));
    await page.evaluate(() => document.getAnimations().forEach(a => { try { a.finish(); } catch { a.cancel(); } }));
    await page.screenshot({ path: `${SHOTS}/m1-deactivate-${ENGINE}-${w}.png` });
    await ctx.close();
  }
};

// ===== M4.1 patch 1: S2 asleep signal (AC-R1-R9), sections ported from rc1 7380b86 (s25, dash, bannerFit) onto serveForRun =====
// ---------- S2-8 / AC-R2 HUD net rate (M4.1 patch 1; ported from rc1 7380b86 sections.s289 without the S2-8 wage lines and S2-9 dot) ----------
sections.s28rate = async () => {
  const UI = JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true });
  const { ctx, page } = await open({ w: 390, h: 844, ls: { 'eggfarm.ui': UI } });
  await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 6, coinsCents: 1e6, customers: [], nextCustomerInS: 1e9, workers: { market_hand: { energy: 90, cdS: 5 }, coop_hand: { energy: 90, cdS: 5 } } }; });
  await page.waitForTimeout(1300);
  // m6 (v5 p2): the warning sign is the inline WARN_SVG (shown only with .warn), ▼ sits in an aria-hidden .tri; the text has no U+26A0
  const read = () => page.evaluate(() => { const e = document.querySelector('#rate'), cs = getComputedStyle(e), wi = e.querySelector('svg.wi'); return { text: e.textContent, aria: e.getAttribute('aria-label'), sign: e.dataset.sign, color: cs.color, size: cs.fontSize, weight: cs.fontWeight, role: e.getAttribute('role'), icon: !!wi && getComputedStyle(wi).display !== 'none', tri: e.querySelector('.tri')?.getAttribute('aria-hidden') }; });
  const awake = await read();
  ok('S2-8 HUD rate: awake workers -> "+$X/s" 11px/700 green, role=status, aria "Net income plus …", no warn icon (m6)', /^\+\$[\d.,]+[A-Za-z]*\/s$/.test(awake.text) && !awake.icon && awake.sign === 'pos' && awake.color === 'rgb(61, 127, 51)' && awake.size === '11px' && awake.weight === '700' && awake.role === 'status' && /^Net income plus /.test(awake.aria ?? ''), JSON.stringify(awake));
  // Reviewer m2: drive the real rateView -> headerRateText path (no injected text). Ruling (a): an asleep Coop Hand does not clamp the rate.
  await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, workers: { ...g.state.workers, coop_hand: { ...g.state.workers.coop_hand, energy: 0 } } }; });
  await page.waitForTimeout(1300);
  const ch = await read();
  ok('PM Workers ruling (a) real path: asleep Coop Hand -> header shows the real positive rate, not red, no ⚠ / "stopped"', /^\+\$[\d.,]+[A-Za-z]*\/s$/.test(ch.text) && ch.sign === 'pos' && ch.color !== 'rgb(184, 59, 55)' && !/stopped/.test(ch.aria ?? ''), JSON.stringify(ch));
  // AC-R1m + sales-stopped-spec §4.2 (patch 3/4): an asleep Market Hand sells nothing -> real rate <= 0, red ⚠ ▼, aria "stopped".
  for (const mh of [{ energy: 0, cdS: 5 }, { energy: 60, cdS: 5, unpaid: true }]) {
    await page.evaluate(mh => { const g = window.eggfarm; g.state = { ...g.state, coinsCents: mh.unpaid ? 0 : g.state.coinsCents, workers: { market_hand: mh } }; }, mh); // coins 0: an Unpaid worker auto-resumes when it can be paid
    await page.waitForTimeout(1300);
    const r = await read();
    ok(`AC-R1m / §4.2 real path: Market Hand ${mh.unpaid ? 'unpaid' : 'asleep'} -> HUD rate <= 0 in red (warn SVG + aria-hidden ▼, m6), aria "stopped"`, /^▼ (\u2212)?\$[\d.,]+[A-Za-z]*\/s$/.test(r.text) && r.icon && r.tri === 'true' && r.sign === 'neg' && r.color === 'rgb(184, 59, 55)' && /stopped$/.test(r.aria ?? ''), JSON.stringify(r));
  }
  if (shot) await page.screenshot({ path: `${SHOTS}/m41p1-s2-8-rate-390.png`, clip: { x: 0, y: 0, width: 390, height: 120 } });
  await ctx.close();
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
  const cd = await page.evaluate(() => { const b = document.querySelector('nav [data-act=manageAll]'), i = getComputedStyle(b.querySelector('.manage-ico img')); return { label: b.querySelector('.nav-lbl').textContent, lblHidden: b.querySelector('.nav-lbl').getAttribute('aria-hidden'), aria: b.getAttribute('aria-label'), dis: b.getAttribute('aria-disabled'), filter: i.filter, op: i.opacity }; });
  ok('Review #1: nav Refill icon greyed during cooldown (grayscale(1), opacity .55)', cd.filter === 'grayscale(1)' && cd.op === '0.55', JSON.stringify(cd));
  if (shot) await page.screenshot({ path: `${SHOTS}/rc1-review1-nav-refill-cooldown-390.png`, clip: { x: 0, y: 844 - 80, width: 390, height: 80 } });
  ok('S2-5 cooldown: label "0:NN", aria "Refill, cooling down" with the countdown aria-hidden (review 23a3798 #1), aria-disabled', /^0:\d\d$/.test(cd.label) && cd.aria === 'Refill, cooling down' && cd.lblHidden === 'true' && cd.dis === 'true', JSON.stringify(cd));
  if (shot) await page.screenshot({ path: `${SHOTS}/rc1-s2-5-nav-390.png`, clip: { x: 0, y: 844 - 80, width: 390, height: 80 } });
  await ctx.close();
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
// ---------- art-ux rc2-workers-copy §6 worker banners: one line at 360/390/1280, Nunito 700 >= 12px, 14px SVG icon, longest strings fit, role dropped first (review 23a3798 #2) ----------
sections.bannerFit = async () => {
  const FCS = process.env.FC_SHOTS;
  const LONG = [['Market Hand asleep: sales stopped', 'Asleep: sales stopped'], ['Market Hand unpaid: sales stopped', 'Unpaid: sales stopped'], ['Coop Hand unpaid: collecting stopped', 'Unpaid: collecting stopped'], ['Coop Hand asleep: collecting stopped', 'Asleep: collecting stopped']];
  for (const [w, h] of [[360, 800], [390, 844], [1280, 800]]) {
    const sv = JSON.stringify({ version: 5, savedAt: Date.now(), state: { coinsCents: 0, coop: 0, basket: 0, collectionLevel: 20, farmLevel: 30, customers: [], nextCustomerInS: 1e9, nextCustomerId: 9, rng: 5, pendingOfflineEggs: 0, celebratedTier: 3,
      workers: { market_hand: { energy: 50, cdS: 0, unpaid: true }, coop_hand: { energy: 0, cdS: 0 }, hawker: { energy: 0, cdS: 0 }, grader: { energy: 0, cdS: 0 } }, graderTier: 1, manageCdS: 0, coopFullS: 0 } });
    const { ctx, page } = await open({ w, h, touch: w < 600, ls: { 'eggfarm.save': sv, 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false }) } });
    if (await page.locator('[data-nav=upgrades]').isVisible()) await page.locator('[data-nav=upgrades]').click(); await page.locator('[data-tab=workers]').click();
    await page.waitForSelector('.wk-banner', { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(400);
    const r = await page.evaluate(async (LONG) => {
      const meas = () => [...document.querySelectorAll('.wk-banner')].map(bn => { const t = bn.querySelector('.bt'), ic = bn.querySelector('img'), cs = getComputedStyle(t), br = bn.getBoundingClientRect(), tr = t.getBoundingClientRect(), card = bn.closest('.wk').getBoundingClientRect();
        return { text: t.textContent, full: t.dataset.full, aria: bn.querySelector('.sr')?.textContent, fs: parseFloat(cs.fontSize), fw: cs.fontWeight, ff: cs.fontFamily.split(',')[0], ic: ic ? [Math.round(ic.getBoundingClientRect().width), ic.getAttribute('src').split('/').pop()] : null,
          fits: t.scrollWidth <= t.clientWidth + 0.5, oneLine: tr.height <= parseFloat(cs.lineHeight) * 1.2 + 0.5, h: Math.round(br.height), inCard: br.left >= card.left - 0.5 && br.right <= card.right + 0.5, emoji: /[\u{1F300}-\u{1FAFF}\u26A0]/u.test(bn.textContent) }; });
      const live = meas();
      // longest approved strings on the real banner element, through the app's own fit (eggfarmQaFitBanners)
      const bt = document.querySelector('.wk-banner .bt'), keep = [bt.dataset.full, bt.dataset.short], longest = [];
      for (const [f, sh] of LONG) { bt.dataset.full = f; bt.dataset.short = sh; window.eggfarmQaFitBanners(); await new Promise(r => requestAnimationFrame(r)); const m = meas()[0]; longest.push({ want: f, got: m.text, fits: m.fits, oneLine: m.oneLine, dropped: m.text === sh }); }
      // forced role-drop fallback: a narrow banner must show the short form, still one line, no clipping
      const bn = bt.closest('.wk-banner'); bn.style.maxWidth = '230px'; bn.style.width = '230px'; bt.dataset.full = LONG[0][0]; bt.dataset.short = LONG[0][1]; window.eggfarmQaFitBanners(); await new Promise(r => requestAnimationFrame(r));
      const fb = meas()[0]; bn.style.maxWidth = ''; bn.style.width = ''; bt.dataset.full = keep[0]; bt.dataset.short = keep[1]; window.eggfarmQaFitBanners();
      return { live, longest, fallback: { text: fb.text, fits: fb.fits, oneLine: fb.oneLine } };
    }, LONG);
    const liveOk = r.live.length >= 4 && r.live.every(x => x.fits && x.oneLine && x.fs >= 12 && x.fw === '700' && /Nunito/i.test(x.ff) && x.ic && x.ic[0] === 14 && /icon-(moon|warning)\.svg/.test(x.ic[1]) && x.inCard && !x.emoji && x.aria && /^(Market Hand|Coop Hand|Hawker|Grader) is (asleep|unpaid)\./.test(x.aria) && (x.text === x.full || x.text === x.full.replace(/^(Market Hand|Coop Hand|Hawker|Grader) (\w)/, (_, __, c) => c.toUpperCase())));
    ok(`§6 banners ${w}: live states (Coop Hand asleep, Market Hand unpaid, Hawker + Grader asleep) one line, Nunito 700 >= 12px, 14px moon/warning SVG, no emoji, aria with role`, liveOk, JSON.stringify(r.live));
    { const mh = r.live.find(x => /^Market Hand /.test(x.aria ?? ''));
      ok(`D-HOP-14/-17 banners ${w}: live Market Hand unpaid -> "Market Hand unpaid: sales stopped" (or role dropped "Unpaid: sales stopped"), aria "Market Hand is unpaid. Auto-sales have stopped."`, !!mh && mh.full === 'Market Hand unpaid: sales stopped' && (mh.text === mh.full || mh.text === 'Unpaid: sales stopped') && mh.aria === 'Market Hand is unpaid. Auto-sales have stopped.', JSON.stringify(mh)); }
    ok(`§6 banners ${w}: longest strings fit on one line (full, or role dropped first only when needed)`, r.longest.every(x => x.fits && x.oneLine && (x.got === x.want || x.dropped)), JSON.stringify(r.longest));
    ok(`§6 banners ${w}: forced narrow banner drops the role name ("Asleep: sales stopped"), one line, not clipped`, r.fallback.text === LONG[0][1] && r.fallback.fits && r.fallback.oneLine, JSON.stringify(r.fallback));
    if (FCS && (w === 360 || w === 1280)) { mkdirSync(FCS, { recursive: true }); await page.locator('.wk-banner').first().scrollIntoViewIfNeeded(); await page.screenshot({ path: `${FCS}/banners-${w}-${ENGINE}.png` }); }
    await ctx.close();
  }
};

// ---------- HoQA (via HoE): #scene counts any click as a Collect; real touch taps at 360 on the asleep/unpaid banners, the asleep badges and
// the Refill controls must credit no Collect (no 'collect' dispatch, basket unchanged) and still do their own action. ----------
sections.sceneGuard = async () => {
  const sv = JSON.stringify({ version: 5, savedAt: Date.now(), state: { coinsCents: 0 /* Unpaid Coop Hand stays Unpaid: no auto-collect into the basket */, seenTracksExplainer: true, coop: 40, basket: 7, collectionLevel: 10, farmLevel: 20, customers: [], nextCustomerInS: 1e9, nextCustomerId: 9, rng: 5, pendingOfflineEggs: 0, celebratedTier: 3,
    workers: { market_hand: { energy: 0, cdS: 0 }, coop_hand: { energy: 50, cdS: 0, unpaid: true }, hawker: { energy: 20, cdS: 0 }, grader: { energy: 0, cdS: 0 } }, graderTier: 1, manageCdS: 0, coopFullS: 0 } });
  const { ctx, page, errors } = await open({ w: 360, h: 800, touch: true, ls: { 'eggfarm.save': sv, 'eggfarm.ui': JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false }) } });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const g = window.eggfarm; g.__acts = []; const d = g.dispatch.bind(g); g.dispatch = a => { g.__acts.push(a.type); return d(a); }; });
  const snap = () => page.evaluate(() => ({ acts: window.eggfarm.__acts.slice(), basket: window.eggfarm.state.basket, hawker: window.eggfarm.state.workers.hawker?.energy }));
  const reset = () => page.evaluate(() => { window.eggfarm.__acts.length = 0; });
  const tapEl = async sel => { const loc = typeof sel === 'string' ? page.locator(sel).first() : sel; sel = String(sel); const bb = await loc.boundingBox(); if (!bb) return { sel, missing: true };
    const x = bb.x + bb.width / 2, y = bb.y + bb.height / 2;
    const hit = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return { tag: e ? `${e.tagName.toLowerCase()}.${e.className}` : null, inScene: !!e?.closest('#scene') }; }, [x, y]);
    await page.touchscreen.tap(x, y); await page.waitForTimeout(250); return { sel, x: Math.round(x), y: Math.round(y), ...hit }; };
  // control: a real tap on #scene is a Collect (proves the spy)
  const c = await tapEl('#scene'); const c1 = await snap();
  ok('sceneGuard 360 control: a touch tap on #scene dispatches collect', c1.acts.includes('collect'), JSON.stringify({ c, c1 }));
  await reset(); let b0 = (await snap()).basket;
  const t1 = await tapEl('[data-nav=upgrades] .asleep-badge'); const s1 = await snap(), up = await page.evaluate(() => !document.querySelector('#p-upgrades').hidden);
  ok('sceneGuard 360: tap on the Upgrades nav asleep badge -> no Collect, basket unchanged, opens Upgrades', !t1.missing && !t1.inScene && !s1.acts.includes('collect') && s1.basket === b0 && up, JSON.stringify({ t1, s1, up }));
  const t2 = await tapEl('.tabs [data-tab=workers] .asleep-badge'); await page.waitForSelector('.wk-banner', { timeout: 3000 }).catch(() => {}); const s2 = await snap();
  ok('sceneGuard 360: tap on the Workers tab asleep badge -> no Collect, basket unchanged, Workers tab shown', !t2.missing && !t2.inScene && !s2.acts.includes('collect') && s2.basket === b0 && (await page.locator('.wk-banner').count()) >= 3, JSON.stringify({ t2, s2 }));
  const nb = await page.locator('.wk-banner').count(), bt = [];
  for (let i = 0; i < nb; i++) { await page.locator('.wk-banner').nth(i).scrollIntoViewIfNeeded(); bt.push(await tapEl(page.locator('.wk-banner').nth(i))); }
  const s3 = await snap();
  ok(`sceneGuard 360: taps on all ${nb} asleep/unpaid banners -> no Collect, basket unchanged`, nb >= 3 && bt.every(x => !x.missing && !x.inScene) && !s3.acts.includes('collect') && s3.basket === b0, JSON.stringify({ bt, s3 }));
  const t4 = await tapEl('#uRow .refill-wrap .manage-all'); const s4 = await snap();
  ok('sceneGuard 360: tap on the Workers-tab Refill -> refills (manageAll, Hawker 100), no Collect, basket unchanged', !t4.missing && !t4.inScene && s4.acts.includes('manageAll') && s4.hawker >= 99 && !s4.acts.includes('collect') && s4.basket === b0, JSON.stringify({ t4, s4 }));
  // nav Refill: reopen the farm view, reset the cooldown and tire the Hawker again
  await page.locator('.sheet:not([hidden]) .close').click(); await page.waitForTimeout(250);
  await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, manageCdS: 0, workers: { ...g.state.workers, hawker: { energy: 20, cdS: 0 } } }; g.__acts.length = 0; });
  await page.waitForTimeout(400); b0 = (await snap()).basket;
  const t5 = await tapEl('nav [data-act=manageAll]'); const s5 = await snap();
  ok('sceneGuard 360: tap on the nav Refill -> refills (manageAll, Hawker 100), no Collect, basket unchanged', !t5.missing && !t5.inScene && s5.acts.includes('manageAll') && s5.hawker >= 99 && !s5.acts.includes('collect') && s5.basket === b0, JSON.stringify({ t5, s5 }));
  const t6 = await tapEl('nav [data-act=manageAll] .nav-lbl'); const s6 = await snap(); // during cooldown
  ok('sceneGuard 360: tap on the nav Refill label during cooldown -> no Collect, basket unchanged', !t6.missing && !t6.inScene && !s6.acts.includes('collect') && s6.basket === b0, JSON.stringify({ t6, s6 }));
  ok('sceneGuard 360: no page errors', errors.length === 0, errors.join('|').slice(0, 200));
  await ctx.close();
};

// ---------- HoQA m-RC1-1: the explainer (refund line) entry animation must never put the card over a visible Buy. 375x667, Upgrades >
// Farm, refund card, scrollTop 150..260 (step 10, incl. 200 = the QA repro, data-place band). Every keyframe sample: the card's expin
// animation is paused and stepped through currentTime 0..200 ms every 2 ms (plus the settled frame); the card rect must not intersect
// any Buy rect clipped to the sheet body. ----------
sections.mrc1 = async () => {
  const W = 375, H = 667;
  const { ctx, page, errors } = await open({ w: W, h: H, touch: true, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true, seenSlots: 10, workersIntroA: true, workersIntroB: true, sfx: false }) } });
  await page.evaluate(() => { document.getElementById('modal-layer')?.classList.remove('open'); document.querySelectorAll('.tracks-exp').forEach(e => e.remove()); const g = window.eggfarm;
    g.state = { ...g.state, farmLevel: 3, hensLevel: 2, eggValueLevel: 2, collectionLevel: 1, coinsCents: 5e7, seenTracksExplainer: true, customers: [], nextCustomerInS: 1e9 }; window.eggfarmUi.render(); });
  await page.locator('[data-nav=upgrades]').click(); await page.waitForTimeout(400); await page.locator('[data-tab=farm]').click(); await page.waitForTimeout(400);
  const rows = [];
  for (let s = 150; s <= 260; s += 10) {
    await page.evaluate(s => { document.querySelector('#p-upgrades .body').scrollTop = s; }, s);
    await page.evaluate(() => new Promise(r => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), 40)));
    rows.push(await page.evaluate(async s => {
      document.querySelectorAll('.tracks-exp,.tracks-exp-out,.exp-pop,.exp-coin').forEach(e => e.remove());
      const g = window.eggfarm; g.migrationRefundCents = 123450; g.state = { ...g.state, seenTracksExplainer: false }; g.onTracksCommitted();
      const c = document.querySelector('.tracks-exp'); if (!c) return { s, card: false };
      const anims = c.getAnimations(); anims.forEach(a => a.pause());
      const body = document.querySelector('#p-upgrades .body').getBoundingClientRect();
      const buys = () => [...document.querySelectorAll('#p-upgrades .btn.buy')].map(b => { const r = b.getBoundingClientRect(); return { row: b.closest('.up')?.querySelector('h3')?.textContent, l: r.left, r: r.right, t: Math.max(r.top, body.top, 0), b: Math.min(r.bottom, body.bottom, innerHeight) }; }).filter(x => x.b > x.t);
      let worst = { px: -Infinity }, samples = 0, maxScale = 0;
      const sample = t => { const r = c.getBoundingClientRect(), painted = c.dataset.place !== 'none' && getComputedStyle(c).visibility !== 'hidden'; samples++;
        const m = /matrix\(([^,]+)/.exec(getComputedStyle(c).transform); if (m) maxScale = Math.max(maxScale, +m[1]);
        if (!painted) return; for (const b of buys()) if (r.left < b.r && b.l < r.right) { const px = Math.min(r.bottom, b.b) - Math.max(r.top, b.t); if (px > worst.px) worst = { px: +px.toFixed(3), t, row: b.row, card: [+r.top.toFixed(3), +r.bottom.toFixed(3)], buy: [+b.t.toFixed(3), +b.b.toFixed(3)] }; } };
      for (let t = 0; t <= 200; t += 2) { anims.forEach(a => { a.currentTime = t; }); sample(t); }
      anims.forEach(a => a.finish()); sample('settled');
      return { s, card: true, place: c.dataset.place, anims: anims.map(a => a.animationName), samples, maxScale: +maxScale.toFixed(4), worst };
    }, s));
  }
  console.log(`MRC1 [${ENGINE}] ${JSON.stringify(rows.map(r => [r.s, r.place, r.maxScale, r.worst?.px]))}`);
  const s200 = rows.find(r => r.s === 200);
  ok('HoQA m-RC1-1 375x667: QA repro state reached (scroll 200, refund card placed "band", expin sampled)', s200?.card && s200.place === 'band' && s200.anims.includes('expin') && s200.samples === 102, JSON.stringify(s200));
  ok('HoQA m-RC1-1 375x667: the explainer card never overlaps a visible Buy at any expin keyframe sample (0..200 ms step 2 + settled), scroll 150..260', rows.every(r => !r.card || !(r.worst.px > 0)), JSON.stringify(rows.filter(r => r.worst?.px > 0)));
  ok('HoQA m-RC1-1: expin has no scale overshoot (max scale <= 1)', rows.every(r => !r.card || r.maxScale <= 1 + 1e-6), JSON.stringify(rows.map(r => r.maxScale)));
  ok('HoQA m-RC1-1: no page errors', errors.length === 0, errors.join('|').slice(0, 200));
  await ctx.close();
};

// SECTIONS
// ---------- Major P3: Collection card 'Limited by coop' must not overlap 'Need $X more' (320/360/375/390, still shown at 1280) ----------
sections.p3card = async () => {
  for (const [w, h] of [[320, 568], [360, 640], [375, 667], [390, 844], [1280, 800]]) {
    const { ctx, page, errors } = await open({ w, h, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true }) } });
    if (w < 900) { await page.locator('[data-nav=upgrades]').click(); await page.waitForTimeout(200); }
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 0, collectionLevel: 17, coinsCents: 0, coop: 0, basket: 0, customers: [], nextCustomerInS: 1e9 }; });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const hs = [...document.querySelectorAll('.up .hint')];
      const need = hs.find(e => /^Need \$\S+ more$/.test(e.textContent.trim())), lim = hs.find(e => /Limited by coop/.test(e.textContent));
      const box = e => { if (!e) return null; const a = e.getBoundingClientRect(); return { l: a.left, r: a.right, t: a.top, b: a.bottom, w: a.width, h: a.height, vis: getComputedStyle(e).visibility !== 'hidden' && a.width > 0 && a.height > 0 }; };
      const a = box(need), z = box(lim), same = !!(need && lim && need.closest('.up') === lim.closest('.up'));
      const overlap = a && z ? !(a.r <= z.l || z.r <= a.l || a.b <= z.t || z.b <= a.t) : null;
      const card = (need ?? lim)?.closest('.up'), cb = card?.getBoundingClientRect();
      const inCard = !!(cb && z && a && z.t >= cb.top - 0.5 && z.b <= cb.bottom + 0.5 && a.t >= cb.top - 0.5 && a.b <= cb.bottom + 0.5);
      return { need: a, lim: z, same, overlap, inCard, pos: lim ? getComputedStyle(lim).position : null };
    });
    ok(`P3 Collection card: 'Need $X more' and 'Limited by coop' both shown, same card (${w}x${h})`, r.need?.vis && r.lim?.vis && r.same && r.inCard, JSON.stringify(r));
    ok(`P3 Collection card: 'Limited by coop' does not overlap 'Need $X more' (${w}x${h})`, r.overlap === false && r.pos !== 'absolute', JSON.stringify(r));
    if (shot && w === 375) { const card = page.locator('.up', { has: page.locator('.hint', { hasText: 'Limited by coop' }) }).first(); await card.scrollIntoViewIfNeeded(); await card.screenshot({ path: `${SHOTS}/p3-collection-card-375.png` }); }
    ok(`P3 card no page errors (${w})`, errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
};
// ---------- QA bug-sellall-label-grader: label = payout at Grader 0/1/2, fits at 360 ----------
sections.sellallgrader = async () => {
  const { ctx, page, errors } = await open({ w: 360, h: 640, touch: true, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true }) } });
  await page.locator('[data-nav=market]').click(); await page.waitForTimeout(200);
  const money = t => { const m = /\$([\d,.]+)([KMBT]?)/.exec(t); return m ? +m[1].replace(/,/g, '') * ({ '': 1, K: 1e3, M: 1e6, B: 1e9, T: 1e12 })[m[2]] : NaN; };
  for (const tier of [0, 1, 2]) for (const [eggs, tag] of [[181.2e9, 'QA 181.2B'], [37, '37']]) {
    await page.evaluate(([tier, eggs]) => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 23, collectionLevel: 17, basket: eggs, coop: 0, coinsCents: 0, nextCustomerInS: 999,
      customers: [{ id: 901, demand: Math.ceil(eggs * 0.6), filled: 0, waitedS: 0 }, { id: 902, demand: Math.ceil(eggs * 0.5), filled: 0, waitedS: 0 }],
      workers: tier ? { grader: { energy: 100, cdS: 0 } } : {}, graderTier: tier }; }, [tier, eggs]);
    await page.waitForTimeout(350);
    const m = await page.evaluate(() => { const b = document.querySelector('#sellAll'), r = b.getBoundingClientRect(); return { t: b.textContent, sw: b.scrollWidth, cw: b.clientWidth, l: r.left, r: r.right, vw: innerWidth, c0: window.eggfarm.state.coinsCents }; });
    if (shot && tier === 1 && eggs > 1e9) await page.screenshot({ path: `${SHOTS}/sellall-grader-t1-360.png` });
    ok(`SellAll label fits at 360 (Grader ${tier}, ${tag})`, m.sw <= m.cw + 1 && m.l >= 0 && m.r <= m.vw + 0.5, JSON.stringify(m));
    await page.locator('#sellAll').click(); await page.waitForTimeout(250);
    const delta = (await page.evaluate(() => window.eggfarm.state.coinsCents)) - m.c0, lab = money(m.t), got = delta / 100;
    // displayed precision: 2 dp under $10K, else 3 significant digits (fmtMoney) -> 0.5% covers it; the old bug was x1.5 / x2
    ok(`SellAll label = money gained (Grader ${tier}, ${tag})`, got > 0 && Math.abs(lab - got) <= Math.max(0.005, got * 0.005), JSON.stringify({ label: m.t, gained: got }));
  }
  ok('SellAll grader no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
};
sections.sellallgraderfit = async () => { // review 948180e #4: fit at 390 and 1280 (docked) too, QA-scale Grader 2 label
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const { ctx, page } = await open({ w, h, ls: { 'eggfarm.ui': JSON.stringify({ onboardingDone: true }) } });
    if (w < 960) { await page.locator('[data-nav=market]').click(); await page.waitForTimeout(200); }
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 23, collectionLevel: 17, basket: 181.2e9, coop: 0, nextCustomerInS: 999,
      customers: [{ id: 901, demand: 2e11, filled: 0, waitedS: 0 }], workers: { grader: { energy: 100, cdS: 0 } }, graderTier: 2 }; });
    await page.waitForTimeout(350);
    const m = await page.evaluate(() => { const b = document.querySelector('#sellAll'), r = b.getBoundingClientRect(); return { t: b.textContent, sw: b.scrollWidth, cw: b.clientWidth, l: r.left, r: r.right, vw: innerWidth }; });
    ok(`SellAll Grader 2 label fits at ${w}`, /\$[\d.]+[BT]/.test(m.t) && m.sw <= m.cw + 1 && m.l >= 0 && m.r <= m.vw + 0.5, JSON.stringify(m));
    await ctx.close();
  }
};
// ---------- M4 gate5: tracks explainer (EXP1) + F2 Upgrades tabs; G5SHOTS=<dir> writes shots + entries ----------
// v1.15 (m4a-spec, CEO): non-modal card; outside taps register and do not close it
sections.g5 = async () => {
  const EXP_WAIT_MS = 2500;
  const G5 = process.env.G5SHOTS, MODE = 'nonmodal'; if (G5) mkdirSync(G5, { recursive: true }); const entries = [];
  const DONE = JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false });
  const rect = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; }, sel);
  const hit = (a, b) => !!a && !!b && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  const cardUp = async (page, what, w) => { const up = await page.waitForFunction(() => { const c = document.querySelector('.tracks-exp'); return !!c && getComputedStyle(c).opacity === '1'; }, null, { timeout: 3000 }).then(() => true, () => false); ok(`G5 card fully up (opacity 1) for ${what} shot at ${w}`, up); return up; };
  const shotIt = async (page, name, w, h, state, extra = {}) => { if (!G5) return; const f = `${ENGINE}-${name}-${w}x${h}.png`; await page.screenshot({ path: `${G5}/${f}` }); const activeElement = await page.evaluate(() => { const a = document.activeElement; return a ? a.tagName + (a.id ? '#' + a.id : '') + (a.dataset.tab ? `[data-tab=${a.dataset.tab}]` : '') + (a.dataset.nav ? `[data-nav=${a.dataset.nav}]` : '') + (a.className ? '.' + String(a.className).trim().split(/\s+/).join('.') : '') : null; }); entries.push({ file: f, engine: ENGINE, viewport: `${w}x${h}`, state, activeElement, ...extra }); };
  for (const [w, h] of [[360, 800], [375, 812], [390, 844], [1280, 800]]) {
    const { ctx, page, errors } = await open({ w, h, ls: { 'eggfarm.save': fx('m2-rc1-v5-12min.json'), 'eggfarm.ui': DONE } });
    await page.waitForTimeout(1500);
    const both = await page.evaluate(() => ({ modal: !!document.querySelector('#modal-layer.open'), card: !!document.querySelector('.tracks-exp') }));
    ok(`G5 A explainer waits behind Welcome back (never two dialogs) at ${w}`, both.modal && !both.card, JSON.stringify(both));
    await page.getByRole('button', { name: 'Collect', exact: true }).click({ timeout: 3000 }).catch(() => {});
    await page.waitForSelector('.tracks-exp', { timeout: 4000 }).catch(() => {});
    // fire a toast while the card is open (coop tier celebration): it must be held, not overlap
    await page.evaluate(() => { window.eggfarm.state.celebratedTier = -1; }); await page.waitForTimeout(400);
    const c = await page.evaluate(() => { const e = document.querySelector('.tracks-exp'); if (!e) return null;
      return { t: e.querySelector('h2').textContent, p: e.querySelector('p').textContent, btns: e.querySelectorAll('button').length, bh: e.querySelector('button').offsetHeight, focus: document.activeElement === e.querySelector('button'), seen: window.eggfarm.state.seenTracksExplainer, modal: !!document.querySelector('#modal-layer.open') }; });
    ok(`G5 EXP1 card shown after Collect, focus on Got it, alone at ${w}`, c && c.t === 'Upgrades got an upgrade!' && c.p === 'Hens and Egg value are now separate. Top them up!' && c.btns === 1 && c.bh >= 48 && c.focus && c.seen === true && !c.modal, JSON.stringify(c));
    const toastShown = await page.evaluate(() => { const t = document.querySelector('.toast'); return !!t && t.classList.contains('show') && getComputedStyle(t).visibility !== 'hidden' && t.getBoundingClientRect().height > 0; });
    const tr = await rect(page, '.toast'), cr = await rect(page, '.tracks-exp');
    ok(`G5 A toast held while the card is open (no overlap) at ${w}`, !toastShown || !hit(tr, cr), JSON.stringify({ toastShown, tr, cr }));
    const behind = await page.evaluate(() => { const r = document.querySelector('.tracks-exp')?.getBoundingClientRect(); if (!r) return null; const out = []; for (const [x, y] of [[r.left + 6, r.top + 10], [r.right - 6, r.top + 10], [r.left + 6, r.top + 40]]) { const els = document.elementsFromPoint(x, y).slice(0, 6).map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '')); out.push(els); } return out; });
    ok(`G5 probe: elements behind the card corners at ${w}`, true, JSON.stringify(behind));
    ok(`G5 no toast DOM shown while the card is open at ${w}`, await page.evaluate(() => !document.querySelector('.toast.show') && ![...document.querySelectorAll('.toast,[role=status].toast')].some(t => t.classList.contains('show'))));
    await cardUp(page, 'explainer', w);
    await shotIt(page, 'explainer', w, h, 'offline return collected, coop toast fired + held, card open', { asserted: 'card visible, no toast overlap, no modal' });
    if (MODE === 'nonmodal') {
      const col = await rect(page, '.collect, #collect, button.collect'); ok(`G5 C card does not cover Collect at ${w}`, !hit(cr, col), JSON.stringify({ cr, col }));
    }
    // close with Got it, focus returns (to the active Upgrades tab when the panel is open; else back to the page)
    await page.locator('.tracks-exp-ok').click(); await page.waitForTimeout(500);
    ok(`G5 Got it closes the card at ${w}`, (await page.locator('.tracks-exp').count()) === 0);
    const fo = await page.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute('data-tab') || document.activeElement?.tagName);
    ok(`G5 focus not lost after Got it (sheet closed) at ${w}`, fo !== 'BODY', fo);
    await shotIt(page, 'focus-after-gotit', w, h, 'card closed via Got it (sheet closed), focus target visible', { focus: fo });
    const toastAfter = await page.evaluate(() => (document.querySelector('.toast')?.textContent ?? ''));
    ok(`G5 A held toast plays after close at ${w}`, /Coop upgraded/.test(toastAfter), toastAfter);
    // Upgrades + B/C tap semantics on a re-shown card (debug hook: clear the flag, re-trigger via the commit hook)
    if (w < 900) { await page.locator('[data-nav=upgrades]').click(); } await page.locator('[data-tab=farm]').click(); await page.waitForTimeout(250);
    await page.evaluate(() => document.querySelector('[data-tab=farm]').scrollIntoView({ block: 'nearest' }));
    await page.evaluate(() => { const g = window.eggfarm; g.state.coinsCents = 1e12; g.state = { ...g.state, seenTracksExplainer: false }; g.onTracksCommitted(); });
    await page.waitForSelector('.tracks-exp', { timeout: 3000 }).catch(() => {});
    const F0 = await page.evaluate(() => window.eggfarm.state.farmLevel);
    const buyR = await rect(page, '#uRow .btn.buy[data-kind=farm]'), cr2 = await rect(page, '.tracks-exp');
    ok(`G5 C card does not cover Buy at ${w}`, !hit(cr2, buyR), JSON.stringify({ cr2, buyR }));
    { const colR = await rect(page, '#collect'); ok(`G5 C card does not cover Collect at ${w}`, !colR || !hit(cr2, colR), JSON.stringify({ cr2, colR })); }
    await page.locator('#uRow .btn.buy[data-kind=farm]').click({ timeout: 5000 }); await page.waitForTimeout(250);
    const F1 = await page.evaluate(() => window.eggfarm.state.farmLevel), open1 = (await page.locator('.tracks-exp').count()) === 1;
    ok(`G5 C outside tap on Buy buys 1 and the card stays at ${w}`, F1 === F0 + 1 && open1, JSON.stringify({ F0, F1, open1 }));
    await cardUp(page, 'buy-tap-card-stays', w);
    await shotIt(page, 'buy-tap-card-stays', w, h, 'Buy tapped while card up: bought 1, card stays; card rect clear of Buy and Collect', { F0, F1, cardRect: cr2, buyRect: buyR });
    const tabs = await page.$$eval('[data-tab]', bs => bs.map(x => ({ h: x.getBoundingClientRect().height, p: x.querySelector('.tab-pill').getBoundingClientRect().height })));
    ok(`G5 F2 Upgrades tabs pill >=36 and hit >=44 at ${w}`, tabs.length === 3 && tabs.every(t => t.p >= 36 && t.h >= 44), JSON.stringify(tabs));
    // Esc / Enter / (C: card tap) close paths, focus back to the active Upgrades tab
    for (const how of ['Escape', 'Enter', 'card']) {
      await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, seenTracksExplainer: false }; document.querySelectorAll('.tracks-exp').forEach(e => e.remove()); g.onTracksCommitted(); });
      await page.waitForSelector('.tracks-exp', { timeout: 3000 }).catch(() => {});
      if (how === 'card') await page.locator('.tracks-exp h2').click(); else await page.keyboard.press(how);
      await page.waitForTimeout(250);
      const st = await page.evaluate(() => ({ open: !!document.querySelector('.tracks-exp'), focus: document.activeElement?.getAttribute('data-tab') ?? document.activeElement?.tagName }));
      ok(`G5 close via ${how} + focus on the active Upgrades tab at ${w}`, !st.open && st.focus === 'farm', JSON.stringify(st));
      if (w === 360) await shotIt(page, `focus-after-${how.toLowerCase()}`, w, h, `card closed via ${how}, focus ring on the Farm tab`);
    }
    {
      // #65 CCR M1: the Buy click above scrolled the sheet (Farm Buy into view); a 206px refund card has no slot clear of every Buy
      // there (place 'none', kept hidden; covered by scripts/m41-9-scroll-sweep.mjs), so this shot re-shows it with the sheet at the top.
      await page.evaluate(() => { const g = window.eggfarm; const b = document.querySelector('#p-upgrades .body'); if (b) b.scrollTop = 0; g.migrationRefundCents = 123456; g.state = { ...g.state, seenTracksExplainer: false }; document.querySelectorAll('.tracks-exp').forEach(e => e.remove()); g.onTracksCommitted(); });
      await page.waitForSelector('.tracks-exp-refund', { timeout: 3000 }).catch(() => {});
      { const pl = await page.evaluate(() => document.querySelector('.tracks-exp')?.dataset.place ?? null); ok(`G5 refund card on screen (place ${pl}, not none) with the sheet at the top at ${w}`, !!pl && pl !== 'none', pl); }
      const rl = await page.evaluate(() => document.querySelector('.tracks-exp-refund')?.textContent.trim() ?? null);
      ok(`G5 refund line shown when migrationRefundCents > 0 at ${w}`, rl === 'We refunded +$1,234.56 for your old upgrades.', rl);
      await cardUp(page, 'refund-line', w);
      await shotIt(page, 'refund-line', w, h, 'card with refund line (migrationRefundCents=123456, debug-set)');
      await page.locator('.tracks-exp-ok').click(); await page.evaluate(() => { window.eggfarm.migrationRefundCents = 0; });
    }
    await shotIt(page, 'upgrades-tabs', w, h, 'Upgrades > Farm tab, tabs 36px pill / 44px hit', { asserted_tab: 'farm', checks: tabs });
    await page.evaluate(() => window.eggfarm.save()); await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByText('Tap to start').click().catch(() => {}); await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Collect', exact: true }).click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(1300);
    ok(`G5 EXP1 not shown again after reload at ${w}`, (await page.locator('.tracks-exp').count()) === 0);
    await shotIt(page, 'after-reload', w, h, 'reloaded after the card was seen: no re-show');
    ok(`G5 no page errors at ${w}`, errors.length === 0, errors.join('|').slice(0, 200));
    await ctx.close();
  }
  for (const [w, h] of [[360, 800], [375, 812], [390, 844], [1280, 800]]) {
    const { ctx, page } = await open({ w, h, ls: { 'eggfarm.ui': DONE } });
    await page.waitForTimeout(2500);
    const st = await page.evaluate(() => ({ card: !!document.querySelector('.tracks-exp'), m: window.eggfarm.state.tracksV7, seen: window.eggfarm.state.seenTracksExplainer ?? null }));
    ok(`G5 new save never shows the explainer at ${w}`, !st.card && st.m === 1, JSON.stringify(st));
    await shotIt(page, 'new-save', w, h, 'fresh M4 farm: no explainer');
    await ctx.close();
  }
  // HoE Major #49: storage really blocked (localStorage.setItem throws, via an init script after seeding). The migrated save
  // must never show the card (the flag could not persist, so it would re-show on every load), and a reload changes nothing.
  for (const [w, h] of [[360, 800]]) {
    // Phase 0 (storage working): load the v5 save so the tracksV7 migration commits with its v6 backup, but stop while the
    // card is still queued behind Welcome back (flag unset). Snapshot localStorage: a committed migration, not yet explained.
    let snap; { const o = await open({ w, h, ls: { 'eggfarm.save': fx('m2-rc1-v5-12min.json'), 'eggfarm.ui': DONE } }); await o.page.waitForTimeout(1500);
      snap = await o.page.evaluate(() => ({ ls: Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])), migrated: window.eggfarm.tracksMigratedWithBackup, seen: window.eggfarm.state.seenTracksExplainer ?? null, card: !!document.querySelector('.tracks-exp') }));
      await o.ctx.close(); }
    ok(`G5 storage blocked: precondition, migrated with backup and not yet explained at ${w}`, snap.migrated === true && !snap.seen && !snap.card, JSON.stringify({ migrated: snap.migrated, seen: snap.seen, card: snap.card }));
    const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(o => { if (sessionStorage.getItem('seeded')) return; for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); }, snap.ls);
    await page.addInitScript(() => { window.__setItemThrows = 0; Storage.prototype.setItem = function () { window.__setItemThrows++; throw new DOMException('blocked', 'QuotaExceededError'); }; });
    const look = async () => { await page.goto(URL0, { waitUntil: 'domcontentloaded' }); await page.getByText('Tap to start').click(); await page.waitForFunction(() => window.eggfarm);
      for (let i = 0; i < 3; i++) { await page.waitForTimeout(600); for (const n of ['Collect', 'Continue', 'OK', 'Got it', 'Close']) await page.getByRole('button', { name: n, exact: true }).first().click({ timeout: 300 }).catch(() => {}); }
      await page.waitForTimeout(EXP_WAIT_MS);
      return page.evaluate(() => ({ card: !!document.querySelector('.tracks-exp'), seen: window.eggfarm.state.seenTracksExplainer ?? null, m: window.eggfarm.state.tracksV7, migrated: window.eggfarm.tracksMigratedWithBackup, throws: window.__setItemThrows })); };
    const s1 = await look();
    ok(`G5 storage blocked: setItem throws and no card at ${w}`, s1.throws > 0 && s1.migrated === true && !s1.card && !s1.seen, JSON.stringify(s1));
    await shotIt(page, 'storage-blocked', w, h, 'localStorage.setItem throws (init script): migrated save, no explainer', s1);
    const s2 = await look();
    ok(`G5 storage blocked: still no card after reload at ${w}`, s2.throws > 0 && s2.migrated === true && !s2.card && !s2.seen, JSON.stringify(s2));
    await shotIt(page, 'storage-blocked-after-reload', w, h, 'storage still blocked, reloaded: no explainer', s2);
    ok(`G5 storage blocked: no page errors at ${w}`, errors.length === 0, errors.join('|').slice(0, 200));
    await ctx.close();
  }
  // HoE #49b: a real QuotaExceededError AFTER load (lease fine, so lease.storageBlocked stays false): the flag write fails
  // (Game sets storageFailed), so the card must not appear.
  for (const [w, h] of [[360, 800]]) {
    let snap; { const o = await open({ w, h, ls: { 'eggfarm.save': fx('m2-rc1-v5-12min.json'), 'eggfarm.ui': DONE } }); await o.page.waitForTimeout(1500);
      snap = await o.page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]))); await o.ctx.close(); }
    // localStorage accepts everything (lease, boot saves) until the save carrying seenTracksExplainer=true: that write gets a real
    // QuotaExceededError, as when the disk fills right then. Installed by an init script after seeding; Game.save sets storageFailed.
    const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(o => { if (sessionStorage.getItem('seeded')) return; for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); }, snap);
    await page.addInitScript(() => { window.__quota = 0; const orig = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (this === localStorage && String(v).includes('"seenTracksExplainer":true')) { window.__quota++; throw new DOMException('quota', 'QuotaExceededError'); } return orig.call(this, k, v); }; });
    await page.goto(URL0, { waitUntil: 'domcontentloaded' }); await page.getByText('Tap to start').click(); await page.waitForFunction(() => window.eggfarm);
    const pre = await page.evaluate(() => ({ migrated: window.eggfarm.tracksMigratedWithBackup, quotaAtBoot: window.__quota }));
    await page.getByRole('button', { name: 'Collect', exact: true }).click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(EXP_WAIT_MS);
    const st = await page.evaluate(() => ({ card: !!document.querySelector('.tracks-exp'), failed: window.eggfarm.storageFailed, quota: window.__quota }));
    ok(`G5 quota after load: precondition (migrated with backup, explainer due) at ${w}`, pre.migrated === true, JSON.stringify(pre));
    ok(`G5 quota after load: QuotaExceededError on the flag write, no card at ${w}`, st.quota > 0 && st.failed === true && !st.card, JSON.stringify(st));
    await shotIt(page, 'quota-after-load', w, h, 'QuotaExceededError after load (flag write failed): no explainer', st);
    ok(`G5 quota after load: no page errors at ${w}`, errors.length === 0, errors.join('|').slice(0, 200));
    await ctx.close();
  }
  if (G5) { const { writeFileSync } = await import('node:fs'); writeFileSync(`${G5}/entries-${ENGINE}.json`, JSON.stringify(entries, null, 1)); }
};
for (const [n, f] of Object.entries(sections)) if (want(n)) { try { await f(); } catch (e) { ok(`${n} threw`, false, String(e).slice(0, 300)); } }
await browser.close(); killSrv();
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'} [${ENGINE}${headless ? '' : ' headed'}] ${r.name}${r.info ? ` — ${r.info}` : ''}`);
console.log(`${results.filter(r => r.pass).length}/${results.length} passed`);
