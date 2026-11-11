// QA standing Safari coverage on Playwright WebKit (proxy, NOT real Safari).
// Usage: node qa/m3-scripts/webkit-safari.mjs <game worktree with built dist> [label]
//   e.g. git worktree add /tmp/efs/wk m3-pt1 && (cd /tmp/efs/wk && ln -s <game>/node_modules . && npm run build)
// Writes qa/m3-webkit/<label>/{results.json,<profile>-*.png}. Exit 1 if any check fails.
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const ROOT = process.argv[2] || '/tmp/efs/wk', LABEL = process.argv[3] || 'run';
// use the game's own playwright-core (matches the installed browser builds)
const { webkit, devices } = createRequire(path.join(ROOT, 'package.json'))('playwright-core');
const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), `../m3-webkit/${LABEL}/`); fs.mkdirSync(OUT, { recursive: true });
const port = 4230 + Math.floor(Math.random() * 50), base = `http://127.0.0.1:${port}/`;
const srv = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true, cwd: ROOT });
const kill = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch {} };
setTimeout(() => { kill(); process.exit(2); }, 600000).unref();
await new Promise(r => setTimeout(r, 2500));
const PROFILES = { 'iphone-15': devices['iPhone 15'], 'iphone-se': devices['iPhone SE (3rd gen)'], 'ipad': devices['iPad (gen 7)'], 'mac-webkit': { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } } };
const lvl = st => ({ version: 5, savedAt: Date.now(), state: { coinsCents: 0, coop: 0, basket: 0, collectionLevel: 0, farmLevel: 0, customers: [], nextCustomerInS: 2, nextCustomerId: 1, rng: 7, pendingOfflineEggs: 0, celebratedTier: 0, workers: {}, graderTier: 0, manageCdS: 0, coopFullS: 0, ...st } });
const results = {}; let anyFail = false;
for (const [name, prof] of Object.entries(PROFILES)) {
  const R = results[name] = { checks: {} }; const touch = !!prof.hasTouch;
  const browser = await webkit.launch(); const ctx = await browser.newContext({ ...prof, acceptDownloads: true });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const tap = async sel => touch ? page.locator(sel).first().tap() : page.locator(sel).first().click();
  const ok = (id, pass, info = {}) => { R.checks[id] = { pass: !!pass, ...info }; if (!pass) anyFail = true; };
  const start = async () => { await page.getByText('Tap to start').waitFor({ timeout: 10000 }); await tap('text=Tap to start'); await page.waitForFunction(() => !!window.eggfarm, null, { timeout: 5000 }); await page.waitForTimeout(400); };
  const st = () => page.evaluate(() => { const s = window.eggfarm.state; return { coins: s.coinsCents, basket: s.basket, coop: s.coop, F: s.farmLevel, C: s.collectionLevel, workers: Object.keys(s.workers) }; });
  try {
    // SM-1 load (fresh) + onboarding shown
    const t0 = Date.now(); await page.goto(base); await start();
    ok('SM-1 load', errs.length === 0 && await page.locator('.onb-cap').count() === 1, { bootMs: Date.now() - t0, build: await page.evaluate(() => window.eggfarm.build) });
    await page.screenshot({ path: `${OUT}/${name}-01-onboarding.png` });
    await tap('.onb-skip'); await page.waitForTimeout(300);
    // SM-2 core loop through the UI: collect (touch), sell to a customer, buy an upgrade
    await page.waitForTimeout(3000); await tap('#collect'); await page.waitForTimeout(200);
    const a = await st();
    await page.waitForFunction(() => window.eggfarm.state.customers.length > 0, null, { timeout: 20000 });
    if (await page.locator('[data-nav=market]').isVisible()) { await tap('[data-nav=market]'); await page.waitForTimeout(300); }
    await tap('button[data-id]'); await page.waitForTimeout(300); const b = await st();
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coinsCents: g.state.coinsCents + 10_000 }; });
    if (await page.locator('.scrim').isVisible().catch(() => false)) { await page.mouse.click(5, 120); await page.waitForTimeout(300); }
    if (await page.locator('[data-nav=upgrades]').isVisible()) { await tap('[data-nav=upgrades]'); await page.waitForTimeout(300); }
    await tap('[data-tab=collection]'); await tap('.btn.buy[data-kind]'); await page.waitForTimeout(300); const c = await st();
    ok('SM-2 core loop', a.basket > 0 && b.coins > 0 && c.C === 1, { afterCollect: a.basket, coinsAfterSell: b.coins, collectionAfterBuy: c.C });
    // SM-3 save + reload
    await page.evaluate(() => window.eggfarm.save()); const before = await st(); await page.reload(); await start(); const after = await st();
    ok('SM-3 save/reload', after.C === before.C && after.F === before.F && Math.abs(after.coins - before.coins) < 500, { before, after });
    // SM-5 workers via UI: F3 save with $50, hire Market Hand, Manage
    await page.evaluate(s => { localStorage.setItem('eggfarm.save', JSON.stringify(s)); }, lvl({ farmLevel: 3, coinsCents: 5000 })); await page.evaluate(() => { window.eggfarm.resetting = true; }); await page.reload(); await start();
    if (await page.locator('.intro-a').count()) await tap('#iaOpen'); else { if (await page.locator('[data-nav=upgrades]').isVisible()) await tap('[data-nav=upgrades]'); await tap('[data-tab=workers]'); }
    await page.waitForTimeout(300); await tap('[data-act=hire][data-w=market_hand]'); await page.waitForTimeout(500);
    const w = await st(); await page.screenshot({ path: `${OUT}/${name}-05-workers.png` });
    ok('SM-5 workers (hire)', w.workers.includes('market_hand') && w.coins <= 1000 && w.coins >= 990, { workers: w.workers, coins: w.coins });
    // Export (Settings)
    if (await page.locator('.scrim').isVisible().catch(() => false)) { await page.mouse.click(5, 120); await page.waitForTimeout(300); }
    await page.evaluate(() => { window.__clip = ''; try { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async t => { window.__clip = t; } }, configurable: true }); } catch {} });
    await tap('#settings'); await page.waitForTimeout(300);
    const dl = page.waitForEvent('download', { timeout: 3000 }).catch(() => null); await tap('#sExport'); const d = await dl; await page.waitForTimeout(500);
    const msg = await page.locator('#sExportMsg').textContent(); const clip = await page.evaluate(() => window.__clip);
    let valid = false; if (d) { const p = `${OUT}/${name}-export.json`; await d.saveAs(p); valid = Array.isArray(JSON.parse(fs.readFileSync(p, 'utf8')).events); } else if (clip) valid = Array.isArray(JSON.parse(clip).events);
    ok('Export log', valid, { via: d ? 'download' : clip ? 'clipboard' : 'none', msg });
    await page.screenshot({ path: `${OUT}/${name}-06-settings.png` });
    // Reset: id + log kept, save_reset logged, fresh game
    const id = await page.evaluate(() => localStorage.getItem('eggfarm.install_id'));
    await tap('#sReset'); await tap('#cReset'); await page.waitForLoadState(); await start();
    const rr = await page.evaluate(() => ({ id: localStorage.getItem('eggfarm.install_id'), save_reset: JSON.parse(localStorage.getItem('eggfarm.telemetry') || '[]').filter(e => e.type === 'save_reset').length, F: window.eggfarm.state.farmLevel, onb: !!document.querySelector('.onb-cap') }));
    ok('Reset', rr.id === id && rr.save_reset >= 1 && rr.F === 0 && rr.onb, rr);
    await tap('.onb-skip');
    // SM-7 layout at device viewport + SM-8 touch
    const L = await page.evaluate(() => {
      const vw = innerWidth, vh = innerHeight, small = [];
      for (const el of document.querySelectorAll('button, [role=button]')) { const r = el.getBoundingClientRect(); if (!r.width || getComputedStyle(el).visibility === 'hidden') continue; if (r.width < 44 || r.height < 44) small.push(`${el.id || el.className || el.textContent.trim().slice(0, 12)} ${Math.round(r.width)}x${Math.round(r.height)}`); }
      const collect = document.querySelector('#collect').getBoundingClientRect();
      return { vw, vh, hOverflow: document.documentElement.scrollWidth > vw + 1, vOverflow: document.documentElement.scrollHeight > vh + 1, collectInView: collect.bottom <= vh && collect.top >= 0, small,
        touchAction: getComputedStyle(document.querySelector('#collect')).touchAction, viewportMeta: document.querySelector('meta[name=viewport]').content };
    });
    await page.screenshot({ path: `${OUT}/${name}-07-farm.png` });
    ok('SM-7 layout', !L.hOverflow && !L.vOverflow && L.collectInView && L.small.length === 0, L);
    // SM-7b right-edge overflow (PT1-13): no visible UI element past the right edge, fresh farm and F25 with 10 customers + huge numbers
    const edge = () => page.evaluate(() => { const vw = document.documentElement.clientWidth; return [...document.querySelectorAll('#app *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > vw + 0.5 && getComputedStyle(e).visibility !== 'hidden'; }).slice(0, 6).map(e => `${e.id || String(e.className).slice(0, 20) || e.tagName}@${Math.round(e.getBoundingClientRect().right)}`); });
    const E0 = await edge();
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 25, collectionLevel: 25, coop: 9.99e12, basket: 9.99e12, coinsCents: 9.99e14, customers: Array.from({ length: 10 }, (_, i) => ({ id: 800 + i, demand: 99999, filled: 0, waitedS: 0 })) }; });
    await page.waitForTimeout(1200); const E1 = await edge(); const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok('SM-7b right edge', E0.length === 0 && E1.length === 0 && sw <= 0, { fresh: E0, f25: E1, extraScroll: sw });
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 0, collectionLevel: 0, coop: 0, basket: 0, coinsCents: 0, customers: [] }; }); await page.waitForTimeout(300);
    if (touch) { // SM-8: 5 rapid taps = 5 collects, no zoom, no text selection
      await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coop: 500, basket: 0 }; });
      for (let i = 0; i < 5; i++) await page.locator('#collect').tap();
      const t = await page.evaluate(() => ({ basket: window.eggfarm.state.basket, scale: window.visualViewport?.scale ?? 1, sel: String(getSelection()) }));
      ok('SM-8 touch', t.basket >= 25 && t.scale === 1 && t.sel === '' && L.touchAction === 'manipulation', t);
    }
    ok('no console/page errors', errs.length === 0, { errs });
  } catch (e) { ok('run', false, { error: String(e).slice(0, 300) }); }
  R.ua = await page.evaluate(() => navigator.userAgent).catch(() => ''); R.viewport = prof.viewport;
  await browser.close();
}
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ label: LABEL, root: ROOT, at: new Date().toISOString(), engine: 'Playwright WebKit (proxy, not Safari)', results }, null, 1));
for (const [n, r] of Object.entries(results)) console.log(n.padEnd(11), Object.entries(r.checks).map(([k, v]) => `${v.pass ? 'PASS' : 'FAIL'} ${k}`).join(' | '));
kill(); process.exit(anyFail ? 1 : 0);
