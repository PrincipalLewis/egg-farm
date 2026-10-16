/** MK-24-1: Sell button never truncates; screenshots + scrollWidth<=clientWidth at 360/375/390/430/1280. */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const OUT = new URL('../../engineering/screenshots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const port = 4189, base = `http://127.0.0.1:${port}/`;
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
const kill = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch {} };
setTimeout(() => { kill(); process.exit(2); }, 180_000).unref();
await new Promise(r => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
// High basket + long exact-under-1K and short-above-1K labels on several rows.
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
const widths = [360, 375, 390, 430, 1280];
let ok = true, buildId = '';
for (const w of widths) {
  const desktop = w >= 960;
  const ctx = await browser.newContext(desktop
    ? { viewport: { width: w, height: 800 } }
    : { viewport: { width: w, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.addInitScript(([s]) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('eggfarm.save', JSON.stringify(s));
      localStorage.setItem('eggfarm.ui', JSON.stringify({ seenSlots: 5, onboardingDone: true }));
      sessionStorage.setItem('seeded', '1');
    }
  }, [save]);
  await p.goto(base, { timeout: 90_000 });
  await p.getByText('Tap to start').click();
  await p.waitForTimeout(600);
  if (!desktop) { await p.locator('[data-nav=market]').click(); await p.waitForTimeout(500); }
  // Read build id from Settings, then overlay it so the market shot shows it.
  if (!buildId) {
    await p.locator('[data-nav=settings]').click(); await p.waitForTimeout(300);
    const ver = await p.locator('.version').last().textContent();
    buildId = (ver || '').replace(/^Egg Farm\s+/, '').trim() || 'unknown';
    if (!desktop) { await p.locator('[data-nav=market]').click(); await p.waitForTimeout(400); }
    else { await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(200); }
  }
  await p.evaluate((id) => {
    let el = document.getElementById('mk24-build');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mk24-build';
      el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9999;background:#3E2C23;color:#FFF6E5;font:700 12px Nunito,sans-serif;padding:4px 8px;border-radius:8px';
      document.body.appendChild(el);
    }
    el.textContent = id;
  }, buildId);
  await p.waitForTimeout(100);
  const rows = await p.locator('.order .btn.sell').evaluateAll((btns) => btns.map((b) => {
    const sk = b.querySelector('.sk')?.textContent ?? '';
    const sy = b.querySelector('.sy')?.textContent ?? '';
    const cs = getComputedStyle(b);
    return {
      label: b.getAttribute('aria-label'),
      text: `${sk}|${sy}`,
      sw: b.scrollWidth, cw: b.clientWidth,
      skSw: b.querySelector('.sk')?.scrollWidth ?? 0,
      skCw: b.querySelector('.sk')?.clientWidth ?? 0,
      sySw: b.querySelector('.sy')?.scrollWidth ?? 0,
      syCw: b.querySelector('.sy')?.clientWidth ?? 0,
      ellipsis: cs.textOverflow,
      maxW: cs.maxWidth,
      width: cs.width,
    };
  }));
  console.log(w, buildId, rows);
  for (const r of rows) {
    if (r.sw > r.cw + 1) { console.error('OVERFLOW btn', w, r); ok = false; }
    if (r.skSw > r.skCw + 1 || r.sySw > r.syCw + 1) { console.error('OVERFLOW span', w, r); ok = false; }
    if (/\u2026|\.\.\./.test(r.text) || /Se…|Se\.\.\./.test(r.text)) { console.error('ELLIPSIS', w, r); ok = false; }
  }
  await p.screenshot({ path: `${OUT}mk24-1-${w}.png` });
  console.log('saved', `${OUT}mk24-1-${w}.png`);
  await ctx.close();
}
await browser.close(); kill();
console.log(ok ? 'MK-24-1 PASS' : 'MK-24-1 FAIL', buildId);
process.exit(ok ? 0 : 1);
