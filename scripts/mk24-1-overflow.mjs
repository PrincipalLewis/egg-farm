/** MK-24-1: Sell button never truncates; screenshots + scrollWidth<=clientWidth at 360/375/390/430/1280. */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
const OUT = new URL('../../engineering/screenshots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const port = 4189, base = `http://127.0.0.1:${port}/`;
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
const widths = [360, 375, 390, 430, 1280];
let ok = true;
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
    const sk = b.querySelector('.sk');
    const sy = b.querySelector('.sy');
    const measure = (el) => el ? { sw: el.scrollWidth, cw: el.clientWidth, t: el.textContent } : { sw: 0, cw: 0, t: '' };
    const cs = getComputedStyle(b);
    return {
      label: b.getAttribute('aria-label'),
      text: `${measure(sk).t}|${measure(sy).t}`,
      sw: b.scrollWidth, cw: b.clientWidth,
      sk: measure(sk), sy: measure(sy),
      ellipsis: cs.textOverflow,
      overflow: cs.overflow,
      maxW: cs.maxWidth,
      flexDir: cs.flexDirection,
    };
  }));
  console.log(w, buildId, JSON.stringify(rows, null, 0));
  if (!rows.length) { console.error('NO SELL BUTTONS', w); ok = false; }
  for (const r of rows) {
    if (r.sw > r.cw + 1) { console.error('OVERFLOW btn', w, r); ok = false; }
    if (r.sk.sw > r.sk.cw + 1 || r.sy.sw > r.sy.cw + 1) { console.error('OVERFLOW span', w, r); ok = false; }
    if (/\u2026|\.\.\./.test(r.text) || /Se…/.test(r.text)) { console.error('ELLIPSIS', w, r); ok = false; }
  }
  await p.screenshot({ path: `${OUT}mk24-1-${w}.png` });
  console.log('saved', `${OUT}mk24-1-${w}.png`);
  await ctx.close();
}
await browser.close(); kill();
console.log(ok ? 'MK-24-1 PASS' : 'MK-24-1 FAIL', buildId);
process.exit(ok ? 0 : 1);
