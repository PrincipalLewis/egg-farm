// Claude Gamer repro @7d52952. node qa-cg.mjs <engine>  (cwd worktree; PORT)
import { chromium, webkit, firefox } from 'playwright-core'; import { spawn } from 'node:child_process'; import { writeFileSync, mkdirSync } from 'node:fs';
const ENG = process.argv[2] ?? 'chromium', EXPECT = 'm3-rc1-pre+7d52952', OUT = '/workspace/egg-farm-studio/qa/m3-recheck/claude-gamer-triage-7d52952'; mkdirSync(`${OUT}/shots`, { recursive: true });
const port = +(process.env.PORT ?? 4321), base = `http://127.0.0.1:${port}/`;
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
const kill = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch {} }; process.on('exit', kill);
for (let i = 0; i < 80; i++) { try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
const browser = ENG === 'webkit' ? await webkit.launch() : ENG === 'firefox' ? await firefox.launch() : await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const res = { engine: ENG }; let SAVE;
{ const c = await browser.newContext(); const p = await c.newPage(); await p.goto(base); const t = p.getByText('Tap to start'); if (await t.count()) await t.first().click();
  await p.waitForFunction(() => localStorage.getItem('eggfarm.save'), null, { timeout: 15000 });
  const bid = await p.evaluate(async () => { for (const sc of document.querySelectorAll('script[src]')) { const m = (await (await fetch(sc.src)).text()).match(/m3-rc1-pre\+[0-9a-f]{7,}(\+dirty)?/); if (m) return m[0]; } return null; });
  if (bid !== EXPECT) { console.error('BUILD MISMATCH', bid); process.exit(2); } res.build = bid;
  SAVE = JSON.parse(await p.evaluate(() => localStorage.getItem('eggfarm.save'))); delete SAVE.sum; await c.close(); }
async function open(vp, st) {
  const desktop = vp.width >= 960;
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: desktop ? 1 : 2, hasTouch: !desktop, ...(ENG !== 'firefox' && !desktop ? { isMobile: true } : {}) });
  const sv = { ...SAVE, savedAt: Date.now(), state: { ...SAVE.state, ...st } };
  await ctx.addInitScript(([sv]) => { if (sessionStorage.getItem('q')) return; sessionStorage.setItem('q', '1'); localStorage.setItem('eggfarm.save', JSON.stringify(sv)); localStorage.setItem('eggfarm.ui', JSON.stringify({ seenSlots: 5, onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false })); }, [sv]);
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(base); const t = page.getByText('Tap to start'); if (await t.count()) await t.first().click().catch(() => {});
  await page.waitForFunction(() => window.eggfarm); await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelectorAll('.coach,.intro-a').forEach(e => e.remove()));
  return { ctx, page, errs, desktop };
}
const openMarket = async (page, desktop) => { if (!desktop) { await page.locator('nav.actions [data-nav=market]').click(); await page.waitForTimeout(500); } };
const rows = page => page.evaluate(() => [...document.querySelectorAll('#mRows .order')].map(r => ({ cls: r.className, hidden: r.hidden, txt: r.innerText.replace(/\s+/g, ' ').trim(), op: getComputedStyle(r).opacity })));
const tag = vp => `${ENG}-${vp.width}`;
for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  const T = tag(vp), out = res[vp.width] = {};
  // B2: basket 8, no customers
  { const { ctx, page, desktop, errs } = await open(vp, { farmLevel: 1, collectionLevel: 1, basket: 8, coop: 0, coinsCents: 800, customers: [], nextCustomerInS: 60 });
    await openMarket(page, desktop); const sa = await page.locator('#sellAll').innerText(); await page.screenshot({ path: `${OUT}/shots/${T}-B2-basket8-nocust.png` });
    out.B2 = { basket: await page.evaluate(() => document.querySelector('#basket').textContent), sellAll: sa, errs }; await ctx.close(); }
  // B3: one customer demand 8, basket 8 -> click Sell, sample card states; then a fresh order
  { const { ctx, page, desktop, errs } = await open(vp, { farmLevel: 1, collectionLevel: 1, basket: 8, coop: 0, coinsCents: 0, customers: [{ id: 1, demand: 8, filled: 0, waitedS: 0 }], nextCustomerId: 2, nextCustomerInS: 3 });
    await openMarket(page, desktop); const before = await rows(page);
    await page.locator('#mRows .order button').first().click(); const s = [];
    for (const ms of [80, 300, 700, 1500]) { await page.waitForTimeout(ms - (s.length ? [80, 300, 700, 1500][s.length - 1] : 0)); s.push({ ms, rows: await rows(page), sellAll: await page.locator('#sellAll').innerText() }); if (ms === 80 || ms === 300) await page.screenshot({ path: `${OUT}/shots/${T}-B3-after-sell-${ms}ms.png` }); }
    await page.waitForTimeout(3500); const fresh = await rows(page); await page.screenshot({ path: `${OUT}/shots/${T}-B3-new-order.png` });
    const floaters = await page.evaluate(() => [...document.querySelectorAll('.floater')].map(f => f.textContent));
    out.B3 = { before, after: s, fresh, basket: await page.evaluate(() => window.eggfarm.state.basket), floaters, errs }; await ctx.close(); }
  // stray +2: Market open, collect fires (button covered by sheet?)
  { const { ctx, page, desktop } = await open(vp, { farmLevel: 1, collectionLevel: 1, basket: 0, coop: 30, customers: [] });
    await openMarket(page, desktop);
    const cover = await page.evaluate(() => { const b = document.querySelector('#collect') || document.querySelector('.collect'); if (!b) return null; const r = b.getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { collectId: b.id, covered: !b.contains(top), topEl: top?.className || top?.id }; });
    let realClick = 'n/a'; try { await page.locator('#collect').click({ timeout: 1500 }); realClick = 'clicked'; } catch (e) { realClick = 'blocked: ' + e.message.split('\n')[0].slice(0, 80); }
    await page.evaluate(() => document.querySelector('#collect')?.click()); await page.waitForTimeout(120);
    const fl = await page.evaluate(() => [...document.querySelectorAll('.floater')].map(f => { const r = f.getBoundingClientRect(); return { t: f.textContent, x: r.x, y: r.y, z: getComputedStyle(f).zIndex }; }));
    await page.screenshot({ path: `${OUT}/shots/${T}-plus2-market-open.png` }); out.plus2 = { cover, realClick, floaters: fl }; await ctx.close(); }
  // B4: buy Collection, sample ↑ overlap with price
  { const { ctx, page, desktop } = await open(vp, { farmLevel: 5, collectionLevel: 4, coinsCents: 50000, basket: 0, customers: [] });
    if (!desktop) { await page.locator('nav.actions [data-nav=upgrades]').click(); await page.waitForTimeout(500); }
    await page.locator('.tabs [data-tab=collection]').first().click().catch(() => {}); await page.waitForTimeout(400);
    const btn = page.locator('#uRow button.btn, .upg button.btn').first(); const samp = [];
    const meas = () => page.evaluate(() => { const b = document.querySelector('#uRow button.btn, .upg button.btn'); if (!b) return null; const imgs = [...b.querySelectorAll('img,svg,.arrow,.up,[class*=up]')].map(e => { const r = e.getBoundingClientRect(); return { c: e.className?.baseVal ?? e.className, src: e.getAttribute('src'), x: r.x, w: r.width, h: r.height, op: getComputedStyle(e).opacity }; }); const txt = [...b.querySelectorAll('span,b,strong')].map(e => { const r = e.getBoundingClientRect(); return { t: e.textContent, x: r.x, r: r.right, w: r.width }; }); return { text: b.innerText.replace(/\s+/g, ' '), imgs, txt }; });
    samp.push({ ms: 0, m: await meas() }); await btn.click(); let last = 0;
    for (const ms of [100, 400, 1000, 2500]) { await page.waitForTimeout(ms - last); last = ms; samp.push({ ms, m: await meas() }); await page.screenshot({ path: `${OUT}/shots/${T}-B4-after-buy-${ms}ms.png` }); }
    out.B4 = samp; await ctx.close(); }
  // Full coop: coop at cap, no hand
  { const { ctx, page } = await open(vp, { farmLevel: 1, collectionLevel: 1, coop: 9999, basket: 0, customers: [], coinsCents: 0 });
    await page.waitForTimeout(2500);
    const f = await page.evaluate(() => { const b = document.querySelector('#collect'); const cs = getComputedStyle(b); return { coop: window.eggfarm.state.coop, collect: b.innerText.replace(/\s+/g, ' '), bg: cs.backgroundColor, op: cs.opacity, disabled: b.disabled || b.getAttribute('aria-disabled'), full: !document.querySelector('#full')?.hidden, fullTxt: document.querySelector('#full')?.textContent, coopFullMsg: [...document.querySelectorAll('body *')].filter(e => e.children.length === 0 && /coop (is )?full|Collect or hire/i.test(e.textContent)).map(e => e.textContent).slice(0, 3), goal: document.querySelector('#goal')?.innerText.replace(/\s+/g, ' ') }; });
    await page.screenshot({ path: `${OUT}/shots/${T}-fullcoop.png` }); out.full = f; await ctx.close(); }
  // Mid-game +$/s with wages: Farm 5, Market Hand hired, customers + basket; sample rates()
  { const { ctx, page } = await open(vp, { farmLevel: 5, collectionLevel: 4, coinsCents: 2000, basket: 400, coop: 0, workers: { market_hand: { energy: 100, cdS: 0 } }, customers: [{ id: 1, demand: 30, filled: 0, waitedS: 0 }, { id: 2, demand: 30, filled: 0, waitedS: 0 }], nextCustomerId: 3, nextCustomerInS: 2 });
    const smp = []; for (let i = 0; i < 6; i++) { await page.waitForTimeout(2000); smp.push(await page.evaluate(() => { const r = window.eggfarmUi.rates(); const vis = [...document.querySelectorAll('body *')].filter(e => e.children.length === 0 && /\/s\b|\/min\b/.test(e.textContent) && e.getBoundingClientRect().width > 0).map(e => e.textContent.trim()).slice(0, 5); return { coins: window.eggfarm.state.coinsCents, inc: r.incomeCentsPerSec, wage: r.wageCentsPerSec, net: r.netCentsPerSec, vis, goal: document.querySelector('#goal')?.innerText.replace(/\s+/g, ' ') }; })); }
    await page.screenshot({ path: `${OUT}/shots/${T}-midgame-wages.png` }); out.wages = smp; await ctx.close(); }
}
await browser.close(); kill(); writeFileSync(`${OUT}/result-${ENG}.json`, JSON.stringify(res, null, 1)); console.log('done', ENG);
