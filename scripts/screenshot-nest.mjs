// Nest before/after shots: empty coop and coop with eggs, plus Collection tab. Usage: node scripts/screenshot-nest.mjs <prefix>
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
const OUT = new URL('../../engineering/screenshots/', import.meta.url).pathname, prefix = process.argv[2] ?? 'nest';
const port = 4175, srv = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
try {
  await new Promise(r => setTimeout(r, 1500));
  const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const [name, coop, panel] of [['empty-coop', 0, null], ['coop-35', 35, null], ['collection-tab', 35, 'upgrades']]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.addInitScript(([c]) => { localStorage.setItem('eggfarm.ui', JSON.stringify({ seenSlots: 3, onboardingDone: true }));
      localStorage.setItem('eggfarm.save', JSON.stringify({ version: 4, savedAt: Date.now(), state: { coinsCents: 1240, coop: c, basket: 35, collectionLevel: 1, farmLevel: 3, rng: 7,
        nextCustomerInS: 6, nextCustomerId: 4, pendingOfflineEggs: 0, celebratedTier: 0, customers: [] } })); }, [coop]);
    await page.goto(`http://127.0.0.1:${port}/`); await page.getByText('Tap to start').click();
    if (coop === 0) await page.evaluate(() => { const g = window.eggfarm; g.frame = () => {}; g.state = { ...g.state, coop: 0 }; });
    if (panel) await page.locator(`[data-nav=${panel}]`).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}${prefix}-${name}.png` }); console.log('saved', `${prefix}-${name}.png`); await ctx.close();
  }
  await browser.close();
} finally { try { process.kill(-srv.pid); } catch {} }
