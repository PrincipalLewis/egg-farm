// Cut A UX extras capture. usage: node capture.mjs <chromium|firefox|webkit>
import { chromium, firefox, webkit } from 'playwright-core';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const ENG = process.argv[2] || 'chromium';
const OUT = '/workspace/egg-farm-studio/qa/m3-recheck/cuta-ux-extras';
const EXPECT = process.env.EXPECT_BUILD;
const port = 4396, base = `http://127.0.0.1:${port}/`;
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: '/tmp/cuta-ux', stdio: 'ignore', detached: true });
const kill = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch {} };
process.on('exit', kill);
for (let i = 0; i < 80; i++) { try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
const L = { chromium, firefox, webkit }[ENG];
const browser = await L.launch(ENG === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {});
const ui = { seenSlots: 5, onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false };
const mk = st => ({ version: 5, savedAt: Date.now(), state: { coinsCents: 7000, coop: 20, basket: 0, collectionLevel: 4, farmLevel: 5,
  customers: [], nextCustomerInS: 30, nextCustomerId: 1, rng: 99, pendingOfflineEggs: 0, celebratedTier: 1, workers: {}, graderTier: 0, manageCdS: 0, coopFullS: 0, ...st } });
const SAVES = {
  base: mk({ customers: [{ id: 1, demand: 17, filled: 0, waitedS: 0 }], nextCustomerId: 2 }),
  // Unpaid: Market Hand + Coop Hand flagged unpaid with $0 (cannot resume). Egg Grader: tier 1 hired at energy 0 => Asleep banner.
  banners: mk({ coinsCents: 0, farmLevel: 18, collectionLevel: 10, celebratedTier: 2, graderTier: 1,
    workers: { market_hand: { energy: 80, cdS: 1, unpaid: true }, coop_hand: { energy: 80, cdS: 2, unpaid: true }, grader: { energy: 0, cdS: 0 } } }),
  // Plain Asleep: Market Hand hired at energy 0 (not unpaid), $70, Farm L5 -> '💤 Asleep, production stopped'.
  asleep: mk({ workers: { market_hand: { energy: 0, cdS: 0 } } }),
};
const report = { engine: ENG, runs: [] };
const TAPPABLE = 'button, [role=tab], [role=button], a[href], a, [onclick], .chip, [class*="chip"], input, select, summary, [tabindex]:not([tabindex="-1"])';
async function open(vp, save) {
  const desktop = vp.width >= 960;
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: desktop ? 1 : 2, ...(ENG === 'firefox' ? {} : { isMobile: !desktop }), hasTouch: !desktop });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(([s, u]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('eggfarm.save', JSON.stringify(s)); localStorage.setItem('eggfarm.ui', JSON.stringify(u)); sessionStorage.setItem('seeded', '1'); } }, [save, ui]);
  await page.goto(base); await page.waitForTimeout(800);
  const tap = page.getByText('Tap to start'); if (await tap.count()) { await tap.first().click(); await page.waitForTimeout(300); }
  await page.evaluate(() => document.querySelectorAll('.coach,.intro-a').forEach(e => e.remove()));
  const bid = await page.evaluate(() => document.querySelector('meta[name=build-id]')?.content || document.documentElement.dataset.build || document.body.dataset.build || null);
  return { ctx, page, errs, bid, desktop };
}
const CLIP = page => page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && !e.closest('[hidden]') && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0 && !['auto','scroll'].includes(cs.overflowX); }).map(e => ({ el: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''), text: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 60), sw: e.scrollWidth, cw: e.clientWidth, ov: getComputedStyle(e).overflowX, to: getComputedStyle(e).textOverflow })));
let clipN = 0;
const dump = async page => { (report.clip ??= []).push({ n: clipN++, url: page.viewportSize(), items: await CLIP(page) }); return dump0(page); };
const dump0 = page => page.evaluate(sel => {
  const vis = el => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[hidden]'); };
  const path = el => { const p = []; let e = el; while (e && e !== document.body && p.length < 4) { let s = e.tagName.toLowerCase(); if (e.id) { s += '#' + e.id; p.unshift(s); break; } const c = [...e.classList].slice(0, 2).join('.'); if (c) s += '.' + c; for (const a of ['data-nav', 'data-tab', 'data-act', 'data-w']) if (e.getAttribute(a)) s += `[${a}="${e.getAttribute(a)}"]`; p.unshift(s); e = e.parentElement; } return p.join(' > '); };
  return [...new Set(document.querySelectorAll(sel))].filter(vis).map(el => { const r = el.getBoundingClientRect(); const w = +r.width.toFixed(2), h = +r.height.toFixed(2);
    return { selector: path(el), text: (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80), ariaLabel: el.getAttribute('aria-label'), role: el.getAttribute('role'), disabled: el.getAttribute('aria-disabled') === 'true' || el.disabled === true,
      rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: w, height: h }, under44: w < 44 || h < 44 }; });
}, TAPPABLE);
for (const vp of (process.env.ONLY ? [] : [{ width: 360, height: 800 }, { width: 1280, height: 720 }])) {
  const tag = `${ENG}-${vp.width}`;
  // (1) closed sheet + nav, (3a) rects in that state
  let { ctx, page, errs, bid, desktop } = await open(vp, SAVES.base);
  if (EXPECT && bid !== EXPECT) { console.error(`BUILD MISMATCH ${bid} != ${EXPECT}`); process.exit(2); }
  await page.evaluate(() => document.querySelectorAll('.sheet:not([hidden]) .close').forEach(b => b.click())); await page.waitForTimeout(1100);
  await page.screenshot({ path: `${OUT}/${tag}-1-closed-nav.png` });
  const rClosed = await dump(page);
  const navVisible = await page.evaluate(() => { const n = document.querySelector('nav.actions'); if (!n) return null; const r = n.getBoundingClientRect(); return { display: getComputedStyle(n).display, rect: { x: r.x, y: r.y, w: r.width, h: r.height } }; });
  await ctx.close();
  // (2) banners: open Upgrades > Workers
  ({ ctx, page, errs: errs, bid } = await open(vp, SAVES.banners));
  await page.waitForTimeout(500);
  const upBtn = page.locator('nav.actions [data-nav=upgrades]');
  if (!desktop && await upBtn.isVisible()) await upBtn.click();
  await page.locator('.tabs [data-tab=workers]').first().click(); await page.waitForTimeout(1100);
  const unpaid = page.locator('.wk-banner.unpaid').first(), grader = page.locator('[data-w=grader] .wk-banner').first();
  const ban = { unpaidCount: await page.locator('.wk-banner.unpaid').count(), unpaidText: await unpaid.textContent().catch(() => null), graderText: await grader.textContent().catch(() => null) };
  await page.screenshot({ path: `${OUT}/${tag}-2-workers-sheet.png` });
  if (ban.unpaidCount) { await unpaid.scrollIntoViewIfNeeded(); await page.locator('.wk', { has: unpaid }).first().screenshot({ path: `${OUT}/${tag}-2a-unpaid-banner.png` }); }
  if (ban.graderText) { await grader.scrollIntoViewIfNeeded(); await page.locator('[data-w=grader].wk').first().screenshot({ path: `${OUT}/${tag}-2b-grader-banner.png` }); await page.screenshot({ path: `${OUT}/${tag}-2c-grader-viewport.png` }); }
  const rSheet = await dump(page);
  await ctx.close();
  const runs = { viewport: vp, buildId: bid, navVisible, banners: ban, pageErrors: errs, tappable: { sheetClosed: rClosed, upgradesWorkersOpen: rSheet } };
  writeFileSync(`${OUT}/${tag}-rects.json`, JSON.stringify(runs, null, 2));
  report.runs.push({ tag, buildId: bid, banners: ban, errs, under44: [...rClosed.map(x => ({ state: 'closed', ...x })), ...rSheet.map(x => ({ state: 'workers', ...x }))].filter(x => x.under44).map(x => `${x.state} | ${x.selector} | "${x.text}" | aria=${x.ariaLabel} | ${x.rect.width}x${x.rect.height}`) });
}

if (true) // (B)
// (B) 360 sheet closed with banner seed -> nav badge
{ const { ctx, page, bid } = await open({ width: 360, height: 800 }, SAVES.banners);
  if (EXPECT && bid !== EXPECT) { console.error('BUILD MISMATCH'); process.exit(2); }
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `${OUT}/${ENG}-360-3-nav-badge.png` });
  const nb = await page.evaluate(() => [...document.querySelectorAll('nav.actions .asleep-badge, nav.actions .badge, nav.actions .count-badge, nav.actions .qdot')].map(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return { selector: e.closest('[data-nav],[data-act]')?.getAttribute('data-nav') || e.closest('[data-act]')?.getAttribute('data-act'), cls: e.className, hidden: e.hidden || cs.display === 'none', text: e.textContent.trim(), rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) }, font: cs.fontSize }; }));
  const up = page.locator('nav.actions [data-nav=upgrades]'); await up.screenshot({ path: `${OUT}/${ENG}-360-3a-nav-badge-crop.png` });
  report.navBadge360 = { ariaUpgrades: await up.getAttribute('aria-label'), badges: nb }; await ctx.close(); }
// (C) plain 'Asleep, production stopped' card
for (const vp of [{ width: 360, height: 800 }, { width: 1280, height: 720 }]) {
  const { ctx, page, desktop } = await open(vp, SAVES.asleep);
  const upBtn = page.locator('nav.actions [data-nav=upgrades]');
  await page.waitForTimeout(1500);
  if (!desktop) { await upBtn.click({ timeout: 10000 }).catch(e => console.error('upclick', e.message.split('\n')[0])); await page.waitForTimeout(600); }
  await page.locator('.tabs [data-tab=workers]').first().click({ timeout: 10000 }).catch(e => console.error('tabclick', e.message.split('\n')[0])); await page.waitForTimeout(1100);
  const card = page.locator('[data-w=market_hand].wk').first();
  if (!(await card.count())) { await page.screenshot({ path: `${OUT}/${ENG}-${vp.width}-4-DEBUG-fail.png` }); console.error('DEBUG', vp.width, await page.evaluate(() => ({ sheets: [...document.querySelectorAll('.sheet')].map(s => s.id + ':' + s.hidden), modal: document.querySelector('.modal')?.outerHTML?.slice(0, 300), wk: document.querySelectorAll('.wk').length }))); await ctx.close(); continue; }
  const txt = await card.locator('.wk-banner').first().textContent().catch(() => null);
  await card.scrollIntoViewIfNeeded(); await card.screenshot({ path: `${OUT}/${ENG}-${vp.width}-4-asleep-card.png` });
  await page.screenshot({ path: `${OUT}/${ENG}-${vp.width}-4a-asleep-viewport.png` });
  const r = await card.locator('.wk-banner').first().boundingBox().catch(() => null);
  const t = await dump(page); writeFileSync(`${OUT}/${ENG}-${vp.width}-asleep-rects.json`, JSON.stringify({ viewport: vp, bannerText: txt, bannerRect: r, tappable: t }, null, 2));
  (report.asleep ??= []).push({ w: vp.width, bannerText: txt, bannerRect: r, under44: t.filter(x => x.under44).map(x => `${x.selector} "${x.text}" ${x.rect.width}x${x.rect.height}`) });
  await ctx.close(); }
console.log(JSON.stringify(report, null, 1));
await browser.close(); kill(); process.exit(0);
