// M4.1 patch 1 Art shots (Art ruling A; D-HOP-2026-10-24-14 / -17 final copy): asleep/unpaid banner (incl. role-dropped variant),
// asleep badges, Refill label, HUD rate, HUD rate with M41-9 big numbers, HUD rate during the refund pop at the coin pill.
// 360x800 / 390x844 / 1280x800. Usage: npm run build:qa && node scripts/m41-p1-shots.mjs [chromium|firefox|webkit]
//   Serves THIS checkout's dist-qa (serveForRun: build-id must be HEAD, clean). Writes /workspace/wt-ui-shots/m41-p1-<sha7>/
//   (<engine>-<view>-<w>.png) + manifest.json (label, state, viewport, engine, file, sha256, measured text). Run inside the
//   browser-test flock. QA handle seeding only (window.eggfarm); the big-number rate uses a seeded balance override (price scale)
//   because real data can't reach $1K/s rates; labelled as such.
import { chromium, webkit, firefox } from 'playwright-core';
import { serveForRun } from './serve-own.mjs';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
const ENGINE = process.argv[2] ?? 'chromium';
if (!['chromium', 'webkit', 'firefox'].includes(ENGINE)) { console.error(`m41-p1-shots: unknown engine ${ENGINE}`); process.exit(2); }
const srv = await serveForRun('dist-qa', 'm41-p1-shots');
const sha7 = execSync('git rev-parse --short=7 HEAD').toString().trim(), OUT = `/workspace/wt-ui-shots/m41-p1-${sha7}`;
mkdirSync(OUT, { recursive: true });
const MAN = `${OUT}/manifest.json`, manifest = existsSync(MAN) ? JSON.parse(readFileSync(MAN, 'utf8')) : { head: execSync('git rev-parse HEAD').toString().trim(), buildId: srv.buildId, shots: [] };
manifest.shots = manifest.shots.filter(s => s.engine !== ENGINE);
const browser = ENGINE === 'webkit' ? await webkit.launch() : ENGINE === 'firefox' ? await firefox.launch() : await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const URL0 = `http://127.0.0.1:${srv.port}/`, UI = JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false });
/** Fresh farm (no seeded save: a v5 save boots as a migration and shows the tracks explainer over the shot), then the state
 *  through the QA handle (as m41-9-uxm-shots). */
async function open(w, h, st) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 600 });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(ui => localStorage.setItem('eggfarm.ui', ui), UI);
  await page.goto(URL0, { waitUntil: 'domcontentloaded' }); await page.getByText('Tap to start').click(); await page.waitForFunction(() => window.eggfarm);
  await page.evaluate(st => { document.getElementById('modal-layer')?.classList.remove('open'); const g = window.eggfarm;
    g.state = { ...g.state, seenTracksExplainer: true, collectionLevel: 20, farmLevel: 30, customers: [], nextCustomerInS: 1e9, graderTier: 1, manageCdS: 0, coinsCents: 0, ...st }; }, st);
  await page.waitForTimeout(600); return { ctx, page, errors };
}
let fails = 0;
async function shot(page, view, w, label, state, measured, clip) {
  const file = `${ENGINE}-${view}-${w}.png`; const buf = await page.screenshot({ path: `${OUT}/${file}`, ...(clip ? { clip } : {}) });
  manifest.shots.push({ file, label: `${label} (${w}px, ${ENGINE})`, view, viewport: w, engine: ENGINE, state, measured, sha256: createHash('sha256').update(buf).digest('hex') });
  console.log(`${file}: ${label} ${JSON.stringify(measured)}`);
}
const toWorkers = async page => { if (await page.locator('[data-nav=upgrades]').isVisible()) await page.locator('[data-nav=upgrades]').click(); await page.locator('[data-tab=workers]').click(); await page.waitForTimeout(500); };
const bannerInfo = page => page.evaluate(() => [...document.querySelectorAll('.wk-banner')].map(bn => { const t = bn.querySelector('.bt'); return { text: t.textContent, full: t.dataset.full, aria: bn.querySelector('.sr')?.textContent, dropped: t.textContent !== t.dataset.full, fits: t.scrollWidth <= t.clientWidth + 0.5, icon: bn.querySelector('img')?.getAttribute('src').split('/').pop() }; }));
const hudClip = async (page, w) => { const bb = await page.locator('header.hud').boundingBox(); return { x: 0, y: 0, width: w, height: Math.ceil(bb.y + bb.height + 8) }; };
const rateInfo = page => page.evaluate(() => { const e = document.querySelector('#rate'), cs = getComputedStyle(e); return { rate: e.textContent, aria: e.getAttribute('aria-label'), sign: e.dataset.sign, color: cs.color, coins: document.querySelector('#coins').textContent }; });
const MH_ASLEEP = { market_hand: { energy: 0, cdS: 0 }, coop_hand: { energy: 90, cdS: 0 }, hawker: { energy: 30, cdS: 0 }, grader: { energy: 90, cdS: 0 } };
const MH_UNPAID = { market_hand: { energy: 60, cdS: 0, unpaid: true }, coop_hand: { energy: 90, cdS: 0 }, hawker: { energy: 30, cdS: 0 }, grader: { energy: 90, cdS: 0 } };
for (const [w, h] of [[360, 800], [390, 844], [1280, 800]]) {
  // 1) Market Hand asleep / unpaid banners (final copy), Workers tab, full viewport
  for (const [view, ws, lab] of [['banner-mh-asleep', MH_ASLEEP, 'Market Hand asleep banner: "Market Hand asleep: sales stopped"'], ['banner-mh-unpaid', MH_UNPAID, 'Market Hand unpaid banner: "Market Hand unpaid: sales stopped"']]) {
    const { ctx, page, errors } = await open(w, h, { workers: ws, coinsCents: view.endsWith('asleep') ? 1e9 : 0 }); // Unpaid needs 0 coins (auto-resume)
    await toWorkers(page); await page.locator('.wk-banner').first().scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
    const bi = await bannerInfo(page); const mh = bi.find(x => /^Market Hand/.test(x.aria ?? ''));
    const want = view.endsWith('asleep') ? 'Market Hand asleep: sales stopped' : 'Market Hand unpaid: sales stopped';
    if (!mh || mh.full !== want || !mh.fits || errors.length) { fails++; console.error(`FAIL ${view} ${w}`, JSON.stringify({ mh, errors })); }
    await shot(page, view, w, `${lab}${mh?.dropped ? ' - role dropped naturally' : ''}`, view, { banner: mh });
    // 2) role-dropped variant: natural if it triggered, else the app's own fit on a forced narrow (230px) banner
    if (view === 'banner-mh-asleep') {
      const forced = !mh?.dropped;
      const r = await page.evaluate(forced => { const bn = [...document.querySelectorAll('.wk-banner')].find(b => /^Market Hand/.test(b.querySelector('.sr')?.textContent ?? ''));
        if (forced) { bn.style.width = '230px'; bn.style.maxWidth = '230px'; window.eggfarmQaFitBanners(); }
        const t = bn.querySelector('.bt'); bn.scrollIntoView({ block: 'center' }); return { text: t.textContent, aria: bn.querySelector('.sr').textContent, fits: t.scrollWidth <= t.clientWidth + 0.5 }; }, forced);
      await page.waitForTimeout(150);
      if (r.text !== 'Asleep: sales stopped' || !r.fits) { fails++; console.error(`FAIL role-drop ${w}`, JSON.stringify(r)); }
      const bb = await page.locator('.wk-banner').first().evaluate(() => 0).then(() => page.evaluate(() => { const bn = [...document.querySelectorAll('.wk-banner')].find(b => /^Market Hand/.test(b.querySelector('.sr')?.textContent ?? '')); const r = bn.closest('.wk').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }));
      await shot(page, 'banner-mh-role-dropped', w, `Role-dropped variant "Asleep: sales stopped" (${forced ? 'forced 230px banner, app fitBanners; full string fits naturally at this width' : 'natural'}), aria keeps the role`, view, { ...r, forced },
        { x: Math.max(0, bb.x - 8), y: Math.max(0, bb.y - 8), width: Math.min(w - Math.max(0, bb.x - 8), bb.width + 16), height: bb.height + 16 });
    }
    await ctx.close();
  }
  // 3) badges (Upgrades nav icon + Workers tab) and 4) Refill labels (nav / docked + Workers tab), 2 asleep + 1 tired
  { const ws = { market_hand: { energy: 0, cdS: 0 }, coop_hand: { energy: 0, cdS: 0 }, hawker: { energy: 30, cdS: 0 }, grader: { energy: 90, cdS: 0 } };
    const { ctx, page } = await open(w, h, { workers: ws });
    const nav = await page.evaluate(() => { const up = document.querySelector('[data-nav=upgrades]'), ma = document.querySelector('[data-act=manageAll]');
      return { upBadge: up.querySelector('.asleep-badge:not([hidden])')?.textContent ?? null, upAria: up.getAttribute('aria-label'), refill: ma?.innerText.replace(/\s+/g, ' ').trim(), refillAria: ma?.getAttribute('aria-label'), refillBadge: ma?.querySelector('.count-badge:not([hidden])')?.textContent ?? null }; });
    if (w < 1000) await shot(page, 'badges-nav-refill', w, 'Farm view: Upgrades asleep badge (2) + nav Refill label/count', 'MH+CH asleep, Hawker tired', nav, { x: 0, y: h - 120, width: w, height: 120 });
    await toWorkers(page);
    const tab = await page.evaluate(() => ({ tabBadge: document.querySelector('.tabs [data-tab=workers] .asleep-badge:not([hidden])')?.textContent ?? null, refillWrap: document.querySelector('#uRow .refill-wrap')?.innerText.replace(/\s+/g, ' ').trim(), caption: document.querySelector('#refillCap')?.textContent }));
    await shot(page, 'badges-workers-tab-refill', w, 'Upgrades > Workers: Workers tab asleep badge + Refill label (refill-wrap)' + (w >= 1000 ? ' + docked header Refill + nav badge' : ''), 'MH+CH asleep, Hawker tired', { ...nav, ...tab });
    // Refill cooldown label
    await page.evaluate(() => window.eggfarm.dispatch({ type: 'manageAll' })); await page.waitForTimeout(400);
    const cd = await page.evaluate(() => ({ refillWrap: document.querySelector('#uRow .refill-wrap')?.innerText.replace(/\s+/g, ' ').trim(), nav: document.querySelector('[data-act=manageAll]')?.innerText.replace(/\s+/g, ' ').trim() }));
    await shot(page, 'refill-cooldown', w, 'Refill during the shared cooldown ("Ready in Ns")', 'after Refill', cd);
    await ctx.close(); }
  // 5) HUD rate: positive / Market Hand asleep ($0.00, red) / negative (wages, MH asleep + CH awake)
  for (const [view, ws, lab] of [['rate-positive', { market_hand: { energy: 90, cdS: 0 }, coop_hand: { energy: 90, cdS: 0 } }, 'HUD rate, all working'],
    ['rate-mh-asleep-zero', { market_hand: { energy: 0, cdS: 0 } }, 'HUD rate, Market Hand asleep only: ⚠ ▼ $0.00/s (§4.2)'],
    ['rate-mh-asleep-negative', { market_hand: { energy: 0, cdS: 0 }, coop_hand: { energy: 90, cdS: 0 } }, 'HUD rate, Market Hand asleep + Coop Hand paid: ⚠ ▼ −$X/s (§4.2)']]) {
    const { ctx, page } = await open(w, h, { workers: ws, coinsCents: 123456 }); await page.waitForTimeout(1200);
    const r = await rateInfo(page); await shot(page, view, w, lab, view, r, await hudClip(page, w)); await ctx.close();
  }
  // 6) HUD rate with M41-9 big numbers (coins $1.23e36 / $999.9Dc; rate via seeded price scale) - QA balance override
  for (const [view, coins, scale, lab] of [['rate-bignum-short', 9.999e37, 1e12, 'HUD rate + coins, M41-9 short forms (coins $999.9Dc; rate scaled ×1e12, QA override)'],
    ['rate-bignum-sci', 1.23e38, 1e35, 'HUD rate + coins, M41-9 scientific (coins $1.23e36; rate scaled ×1e35, QA override)']]) {
    const { ctx, page } = await open(w, h, { workers: { market_hand: { energy: 90, cdS: 0 } }, farmLevel: 30, hensLevel: 30, eggValueLevel: 30, collectionLevel: 30, coinsCents: coins });
    await page.evaluate(scale => { const e = window.eggfarm.b.m4.eggValue; e.levelBonus = e.levelBonus * scale; }, scale); await page.waitForTimeout(1300);
    const r = await rateInfo(page); await shot(page, view, w, lab, view, r, await hudClip(page, w)); await ctx.close();
  }
  // 7) HUD rate during the refund pop at the coin pill. Fresh farm (no seeded v5 save: that boots as a migration with its own card),
  //    state set through the QA handle; pop on "Got it" (UX-M5 / Art ruling #65 (3)), decorative nodes kept + paused (as m41-9-uxm-shots).
  { const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 600 }); const page = await ctx.newPage();
    await page.addInitScript(ui => localStorage.setItem('eggfarm.ui', ui), UI);
    await page.goto(URL0); await page.getByText('Tap to start').click(); await page.waitForFunction(() => window.eggfarm);
    await page.evaluate(() => { document.getElementById('modal-layer')?.classList.remove('open'); const g = window.eggfarm;
      g.state = { ...g.state, seenTracksExplainer: true, farmLevel: 12, collectionLevel: 9, coinsCents: 500000, customers: [], nextCustomerInS: 1e9, workers: { market_hand: { energy: 0, cdS: 0 }, coop_hand: { energy: 90, cdS: 0 } } }; });
    await page.waitForTimeout(1300);
    await page.evaluate(() => { new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && /exp-pop|exp-coin/.test(n.className)) {
      n.remove = () => {}; requestAnimationFrame(() => n.getAnimations().forEach(a => { a.pause(); a.currentTime = 250; })); } }).observe(document.body, { childList: true });
      const g = window.eggfarm; g.migrationRefundCents = 123450; g.state = { ...g.state, coinsCents: g.state.coinsCents + 123450, seenTracksExplainer: false }; g.onTracksCommitted(); });
    await page.waitForSelector('.tracks-exp', { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(400);
    await page.locator('.tracks-exp-ok').first().click({ timeout: 5000 }).catch(e => console.error(`refund card ${w}: ${String(e).slice(0, 300)}`));
    await page.waitForTimeout(200);
    const r = await page.evaluate(() => { const e = document.querySelector('#rate'), pop = document.querySelector('.exp-pop');
      return { pop: pop?.textContent ?? null, card: !!document.querySelector('.tracks-exp'), rate: e.textContent, sign: e.dataset.sign, coins: document.querySelector('#coins').textContent }; });
    if (!r.pop || r.sign !== 'neg') { fails++; console.error(`FAIL refund pop ${w}`, JSON.stringify(r)); }
    await shot(page, 'rate-during-refund-pop', w, 'HUD rate during the refund pop at the coin pill (pop paused at 250 ms; Market Hand asleep -> red rate)', 'refund $1,234.50, Market Hand asleep, Coop Hand paid', r, await hudClip(page, w).then(c => ({ ...c, height: c.height + 40 })));
    await ctx.close(); }
}
await browser.close(); srv.stop();
writeFileSync(MAN, JSON.stringify(manifest, null, 1) + '\n');
console.log(`${manifest.shots.filter(s => s.engine === ENGINE).length} shots -> ${OUT} (fails ${fails})`);
process.exitCode = fails ? 1 : 0;
