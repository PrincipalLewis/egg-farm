// M2 placeholder screenshots: Workers tab (F24 with all workers, one Tired, one Asleep) + QA-RC2-2 welcome-back with ?debug=1.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
const OUT = new URL('../../engineering/screenshots/', import.meta.url).pathname;
const port = 4176, base = `http://127.0.0.1:${port}/`;
const srv = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
const kill = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch {} };
setTimeout(() => { kill(); process.exit(2); }, 60000).unref();
await new Promise(r => setTimeout(r, 2000));
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const mk = (savedAt, st) => ({ version: 5, savedAt, state: { coinsCents: 5_000_000, coop: 0, basket: 50, collectionLevel: 12, farmLevel: 24, customers: [], nextCustomerInS: 5, nextCustomerId: 1, rng: 99, pendingOfflineEggs: 0, celebratedTier: 3, workers: {}, graderTier: 0, manageCdS: 0, coopFullS: 0, ...st } });
async function shot(name, save, q, after) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(([s]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('eggfarm.save', JSON.stringify(s)); localStorage.setItem('eggfarm.ui', JSON.stringify({ seenSlots: 5, onboardingDone: true })); sessionStorage.setItem('seeded', '1'); } }, [save]);
  await page.goto(base + q); await page.getByText('Tap to start').click(); await page.waitForTimeout(500);
  await after(page); await page.screenshot({ path: `${OUT}${name}.png` }); if (errs.length) console.log(name, errs); await ctx.close();
}
await shot('m2-workers-tab', mk(Date.now(), { workers: { market_hand: { energy: 82, cdS: 0 }, coop_hand: { energy: 35, cdS: 0 }, hawker: { energy: 0, cdS: 0 }, grader: { energy: 64, cdS: 0 } }, graderTier: 4 }), '', async p => {
  await p.locator('[data-nav=upgrades]').click(); await p.locator('[data-tab=workers]').click(); await p.waitForTimeout(400);
});
await shot('qa-rc2-2-debug-vs-welcome-back', mk(Date.now() - 3600_000, {}), '?debug=1', async p => { await p.waitForTimeout(300); });
// M2 §4.6: shared cooldown ring mid-cooldown (Manage all + every Manage), and the Farm View Manage-all icon.
await shot('m2-workers-ring-cooldown', mk(Date.now(), { workers: { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 38, cdS: 0 }, hawker: { energy: 55, cdS: 0 }, grader: { energy: 90, cdS: 0 } }, graderTier: 4, manageCdS: 16 }), '', async p => {
  await p.locator('[data-nav=upgrades]').click(); await p.locator('[data-tab=workers]').click(); await p.waitForTimeout(400);
});
await shot('m2-farm-manage-all', mk(Date.now(), { workers: { market_hand: { energy: 80, cdS: 0 }, coop_hand: { energy: 38, cdS: 0 }, hawker: { energy: 70, cdS: 0 }, grader: { energy: 90, cdS: 0 } }, graderTier: 4 }), '', async p => { await p.waitForTimeout(300); });
await browser.close(); kill(); process.exit(0);
