// post-rc1: Workers tab icon + Manage all greyed during the shared cooldown (Workers tab, Farm View nav, desktop header).
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
const OUT = new URL('../../engineering/screenshots/', import.meta.url).pathname;
const port = 4177, base = `http://127.0.0.1:${port}/`;
const srv = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
const kill = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch {} };
setTimeout(() => { kill(); process.exit(2); }, 60000).unref();
await new Promise(r => setTimeout(r, 2000));
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const mk = st => ({ version: 5, savedAt: Date.now(), state: { coinsCents: 5_000_000, coop: 0, basket: 50, collectionLevel: 12, farmLevel: 24, customers: [], nextCustomerInS: 5, nextCustomerId: 1, rng: 99, pendingOfflineEggs: 0, celebratedTier: 3, workers: { market_hand: { energy: 80, cdS: 0 }, coop_hand: { energy: 38, cdS: 0 }, hawker: { energy: 70, cdS: 0 }, grader: { energy: 90, cdS: 0 } }, graderTier: 4, manageCdS: 0, coopFullS: 0, ...st } });
async function shot(name, save, after, desktop = false) {
  const ctx = await browser.newContext(desktop ? { viewport: { width: 1280, height: 800 } } : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(([s]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('eggfarm.save', JSON.stringify(s)); localStorage.setItem('eggfarm.ui', JSON.stringify({ seenSlots: 5, onboardingDone: true })); sessionStorage.setItem('seeded', '1'); } }, [save]);
  await page.goto(base); await page.getByText('Tap to start').click(); await page.waitForTimeout(500);
  await after(page); await page.screenshot({ path: `${OUT}${name}.png` }); if (errs.length) { console.log(name, errs); process.exitCode = 1; } await ctx.close();
}
const tab = async p => { await p.locator('[data-nav=upgrades]').click(); await p.locator('[data-tab=workers]').click(); await p.waitForTimeout(400); };
await shot('post-rc1-workers-tab-icon', mk({}), tab);
// Start the cooldown by tapping Farm View Manage all, then capture each copy greyed.
const tapFarm = async p => { await p.locator('nav .farm-manage-all').click(); await p.waitForTimeout(1200); };
await shot('post-rc1-farm-manage-all-cooldown', mk({}), tapFarm);
await shot('post-rc1-workers-manage-all-cooldown', mk({}), async p => { await tapFarm(p); await tab(p); });
await shot('post-rc1-desktop-manage-all-cooldown', mk({}), async p => { await p.locator('.desk-manage-all').click(); await p.waitForTimeout(1200);
  const bg = await p.locator('.desk-manage-all').evaluate(e => [e.getAttribute('aria-disabled'), getComputedStyle(e).backgroundColor]); console.log('desktop', bg); }, true);
await browser.close(); kill();
