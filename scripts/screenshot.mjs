// Portrait-phone screenshots of the built game (npm run build && npm run screenshot). Uses system Chrome, headless.
import { chromium } from 'playwright-core';
import { spawnRecorded, stopOrReport } from './recorded-pid.mjs';
const OUT = new URL('../../engineering/screenshots/', import.meta.url).pathname;
const port = 4173, url = `http://127.0.0.1:${port}/?marketSeed=7`;
const { child: srv, rec: srvRec } = spawnRecorded('npx', ['vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1500));
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const errors = [];
async function shot(name, save, after) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push(`${name}: ${e.message}`)); page.on('console', m => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
  await page.addInitScript(([s, ui]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('eggfarm.save', JSON.stringify(s)); localStorage.setItem('eggfarm.ui', JSON.stringify(ui)); sessionStorage.setItem('seeded', '1'); } }, [save(Date.now()), { seenSlots: 3 }]);
  await page.goto(url); await page.getByText('Tap to start').click(); await page.waitForTimeout(400);
  if (after) await after(page);
  await page.screenshot({ path: `${OUT}${name}.png` }); console.log('saved', `${OUT}${name}.png`); await ctx.close();
}
const base = (t, o = {}) => ({ version: 4, savedAt: t, state: { coinsCents: 1240, coop: 35.4, basket: 35, collectionLevel: 1, farmLevel: 3, rng: 7, nextCustomerInS: 6,
  nextCustomerId: 4, pendingOfflineEggs: 0, celebratedTier: 0, customers: [{ id: 2, demand: 31, filled: 0, waitedS: 8 }, { id: 3, demand: 22, filled: 0, waitedS: 2 }], ...o } });
await shot('m1-farm-portrait-390x844', t => base(t));
await shot('m1-market-portrait-390x844', t => base(t), async p => { await p.locator('[data-nav=market]').click(); await p.waitForTimeout(400); });
await shot('m1-upgrades-portrait-390x844', t => base(t, { coinsCents: 4200 }), async p => { await p.locator('[data-nav=upgrades]').click(); await p.waitForTimeout(400); });
await shot('m1-farm-tab-portrait-390x844', t => base(t, { coinsCents: 4200 }), async p => { await p.locator('[data-nav=upgrades]').click(); await p.locator('[data-tab=farm]').click(); await p.waitForTimeout(400); });
await shot('m1-welcome-back-portrait-390x844', t => base(t - 4_320_000), async p => p.waitForTimeout(200));
{ const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); await page.goto(url); await page.getByText('Tap to start').click(); await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}m1-onboarding-portrait-390x844.png` }); console.log('saved onboarding'); await ctx.close(); }
await browser.close(); stopOrReport(srv, srvRec, 'screenshot');
if (errors.length) { console.error('page errors:\n' + errors.join('\n')); process.exit(1); }
