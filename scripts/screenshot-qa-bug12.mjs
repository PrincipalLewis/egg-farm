// QA BUG-1/2: Sell all label, '+$X' popup and coin delta all equal with the Egg Grader active (390px + desktop 1280).
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
const OUT = new URL('../../engineering/screenshots/', import.meta.url).pathname;
const port = 4178, base = `http://127.0.0.1:${port}/`;
const srv = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
const kill = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch {} };
setTimeout(() => { kill(); process.exit(2); }, 240000).unref();
await new Promise(r => setTimeout(r, 4000));
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const save = { version: 5, savedAt: Date.now(), state: { coinsCents: 500_000, coop: 0, basket: 58, collectionLevel: 7, farmLevel: 20, customers: [{ id: 1, demand: 58, filled: 0, waitedS: 0 }], nextCustomerInS: 60, nextCustomerId: 2, rng: 99, pendingOfflineEggs: 0, celebratedTier: 3, workers: { grader: { energy: 100, cdS: 0 } }, graderTier: 1, manageCdS: 0, coopFullS: 0 } };
const money = t => Math.round(parseFloat(t.replace(/[^0-9.]/g, '')) * 100);
let ok = true;
for (const desktop of [false, true]) {
  const tag = desktop ? 'desktop' : '390';
  const ctx = await browser.newContext(desktop ? { viewport: { width: 1280, height: 800 } } : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.addInitScript(([s]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('eggfarm.save', JSON.stringify(s)); localStorage.setItem('eggfarm.ui', JSON.stringify({ seenSlots: 5, onboardingDone: true })); sessionStorage.setItem('seeded', '1'); } }, [save]);
  await p.goto(base, { timeout: 90000 }); await p.getByText('Tap to start').click(); await p.waitForTimeout(800);
  if (!desktop) await p.locator('[data-nav=market]').click(); await p.waitForTimeout(800);
  const row = await p.locator('.order .v').first().textContent(), btn = await p.locator('#sellAll').textContent(), before = await p.locator('#coins').textContent();
  await p.screenshot({ path: `${OUT}qa-bug12-${tag}-1-before.png` });
  await p.locator('#sellAll').click(); await p.waitForTimeout(150);
  const pop = await p.locator('.floater.coin').first().textContent();
  await p.screenshot({ path: `${OUT}qa-bug12-${tag}-2-popup.png` });
  await p.waitForTimeout(1500); const after = await p.locator('#coins').textContent();
  await p.screenshot({ path: `${OUT}qa-bug12-${tag}-3-after.png` });
  const btnC = money(btn.split('·')[1]), popC = money(pop), delta = money(after) - money(before), rowC = money(row);
  console.log(tag, { row, btn, pop, before, after, rowC, btnC, popC, delta });
  if (!(btnC === popC && popC === delta && rowC === delta)) ok = false;
  await ctx.close();
}
console.log(ok ? 'ALL EQUAL' : 'MISMATCH'); process.exitCode = ok ? 0 : 1;
await browser.close(); kill();
