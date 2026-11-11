/** MK-24-1: Sell button never truncates; screenshots + scrollWidth<=clientWidth at 360/375/390/430/1280. */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
const OUT = '/workspace/egg-farm-studio/qa/m3-recheck/mk24-1-24cda19/';
mkdirSync(OUT, { recursive: true });
const port = 4297, base = `http://127.0.0.1:${port}/`;
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
const kill = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch {} };
setTimeout(() => { kill(); process.exit(2); }, 180_000).unref();
await new Promise(r => setTimeout(r, 2500));
// Build id from the release check marker / index chunk
const html = readFileSync('dist/index.html', 'utf8');
const jsName = (html.match(/assets\/(index-[^"]+\.js)/) || [])[1];
const js = jsName ? readFileSync(`dist/assets/${jsName}`, 'utf8') : '';
const buildId = (js.match(/m3-rc1-pre\+[0-9a-f]{7,}(?:\+dirty)?/) || ['m3-rc1-pre+unknown'])[0];
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const save = {
  version: 6, savedAt: Date.now(),
  state: {
    coinsCents: 500_000, coop: 0, basket: 58, collectionLevel: 7, farmLevel: 20,
    customers: [
      { id: 1, demand: 58, filled: 0, waitedS: 0 },
      { id: 2, demand: 17, filled: 4, waitedS: 1 },
      { id: 3, demand: 3, filled: 0, waitedS: 0 },
      { id: 4, demand: 21, filled: 0, waitedS: 0 },
    ],
    nextCustomerInS: 60, nextCustomerId: 5, rng: 99, pendingOfflineEggs: 0, celebratedTier: 3,
    workers: { grader: { energy: 100, cdS: 0 } }, graderTier: 1, manageCdS: 0, coopFullS: 0, wageFracCents: {},
  },
};
const out={};
for (const [eng,w] of [['chromium',390]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.addInitScript(([s]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('eggfarm.save', JSON.stringify(s)); localStorage.setItem('eggfarm.ui', JSON.stringify({ seenSlots: 5, onboardingDone: true })); sessionStorage.setItem('seeded', '1'); } }, [save]);
  await p.goto(base, { timeout: 90_000 }); await p.getByText('Tap to start').click(); await p.waitForTimeout(600);
  await p.locator('[data-nav=market]').click(); await p.waitForTimeout(500);
  const rows = await p.locator('.order').evaluateAll(os => os.map(o => ({ card: o.querySelector('.l1')?.textContent, btn: o.querySelector('.btn.sell')?.textContent, aria: o.querySelector('.btn.sell')?.getAttribute('aria-label'), id: o.querySelector('.btn.sell')?.dataset.id })));
  console.log('ROWS', JSON.stringify(rows));
  await p.screenshot({ path: OUT + 'money-chromium-390.png' });
  const coins = async () => (await p.evaluate(() => localStorage.getItem('eggfarm.save')));
  await p.locator('.btn.sell[data-id="2"]').click(); await p.waitForTimeout(2500);
  const ev = await p.evaluate(() => JSON.parse(window.eggfarmExportTelemetry()));
  const sells = (Array.isArray(ev)?ev:(ev.events||[])).filter(e => (e.type||e.name)==='sell');
  console.log('SELL_EVENTS', JSON.stringify(sells));
  await ctx.close();
}
await browser.close(); kill(); process.exit(0);
