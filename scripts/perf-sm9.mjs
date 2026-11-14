// SM-9: F20+ save, all 4 workers hired, scripted collect/sell/Manage loop; ?perf=1 sampler (10 s warm-up + 60 s by default).
// Usage: node scripts/perf-sm9.mjs [--headed] [--short]   (headless numbers are informational per the smoke plan)
import { chromium } from 'playwright-core';
import { spawnRecorded, stopOrReport } from './recorded-pid.mjs';
import { readFileSync } from 'node:fs';
const headed = process.argv.includes('--headed'), short = process.argv.includes('--short');
const port = 4176; const { child: srv, rec: srvRec } = spawnRecorded('npx', ['vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1500));
const fx = JSON.parse(readFileSync(new URL('../tests/fixtures/saves/m2-rc1-v5-40min.json', import.meta.url), 'utf8'));
fx.state.farmLevel = Math.max(20, fx.state.farmLevel); fx.state.coinsCents = 5e9; fx.savedAt = Date.now();
fx.state.workers = { market_hand: { energy: 80, cdS: 1 }, coop_hand: { energy: 70, cdS: 1 }, hawker: { energy: 60, cdS: 0 }, grader: { energy: 50, cdS: 0 } };
fx.state.graderTier = Math.max(1, fx.state.graderTier ?? 1);
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', headless: !headed, args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('eggfarm.save', s); localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true })); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(fx));
const q = short ? 'perf=1&perfS=10&perfWarmS=2' : 'perf=1';
await page.goto(`http://127.0.0.1:${port}/?${q}`); await page.getByText('Tap to start').click();
await page.waitForFunction(() => window.eggfarm);
const close = page.locator('#modal-layer.open .close'); if (await close.count()) await close.click();
let res = null;
while (!res) {
  await page.locator('#collect').click({ force: true }).catch(() => {});
  await page.evaluate(() => { const g = window.eggfarm; g.dispatch({ type: 'sellAll' }); g.dispatch({ type: 'manageAll' }); });
  await page.waitForTimeout(250);
  res = await page.evaluate(() => window.eggfarmPerf?.done ? window.eggfarmPerf.result : null);
}
await page.screenshot({ path: '../engineering/screenshots/m3-rc0-sm9-overlay.png' });
console.log(JSON.stringify({ mode: headed ? 'headed' : 'headless', ...res, errors }));
await browser.close(); stopOrReport(srv, srvRec, 'perf-sm9');
if (errors.length) process.exitCode = 1;
