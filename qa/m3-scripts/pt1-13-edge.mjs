// QA PT1-13: WebKit narrow phones, every visible element in #app/#panel-layer within the right edge, on Farm/Market/Upgrades/Workers, F0 and F25+10 customers.
// Usage: node pt1-13-edge.mjs <worktree with dist-qa>
import { createRequire } from 'node:module'; import path from 'node:path'; import { spawn } from 'node:child_process';
const ROOT = process.argv[2]; const { webkit, devices } = createRequire(path.join(ROOT, 'package.json'))('playwright-core');
const port = 4350 + Math.floor(Math.random() * 40);
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true, cwd: ROOT });
await new Promise(r => setTimeout(r, 2500));
const b = await webkit.launch(); const ph = (w, h) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: devices['iPhone SE (3rd gen)'].userAgent });
const P = { 320: ph(320, 568), 360: ph(360, 640), 375: ph(375, 667), 390: ph(390, 844), 'iphone-se': devices['iPhone SE (3rd gen)'] }; let fails = 0;
for (const [n, prof] of Object.entries(P)) for (const F of [0, 25]) {
  const ctx = await b.newContext(prof); const p = await ctx.newPage();
  await p.addInitScript(() => { if (!sessionStorage.s) { localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true })); sessionStorage.s = 1; } });
  await p.goto(`http://127.0.0.1:${port}/`); await p.getByText('Tap to start').tap(); await p.waitForFunction(() => window.eggfarm);
  await p.evaluate(F => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: F, collectionLevel: F, coop: F ? 9.99e12 : 3, basket: F ? 9.99e12 : 0, coinsCents: F ? 9.99e14 : 0,
    workers: F ? { market_hand: { energy: 30, cdS: 1 }, coop_hand: { energy: 35, cdS: 1 }, hawker: { energy: 90, cdS: 0 }, grader: { energy: 20, cdS: 0 } } : {}, customers: Array.from({ length: F ? 10 : 2 }, (_, i) => ({ id: i + 1, demand: F ? 99999 : 8, filled: 0, waitedS: 0 })) }; }, F);
  await p.waitForTimeout(1000);
  const m = () => p.evaluate(() => { const vw = document.documentElement.clientWidth; const bad = [...document.querySelectorAll('#app *, #panel-layer *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > vw + 0.5 && getComputedStyle(e).visibility !== 'hidden'; }).slice(0, 4).map(e => `${e.id || String(e.className).slice(0, 18) || e.tagName}@${Math.round(e.getBoundingClientRect().right)}`); return { vw, extra: document.documentElement.scrollWidth - vw, bad }; });
  const r = { farm: await m() };
  await p.evaluate(() => document.querySelector('nav [data-nav=market]').click()); await p.waitForTimeout(400); r.market = await m();
  await p.evaluate(() => document.querySelector('.sheet:not([hidden]) .close')?.click()); await p.evaluate(() => document.querySelector('nav [data-nav=upgrades]').click()); await p.waitForTimeout(300); r.upgrades = await m();
  await p.evaluate(() => document.querySelector('[data-tab=workers]').click()); await p.waitForTimeout(300); r.workers = await m();
  const pass = Object.values(r).every(x => x.extra <= 0 && x.bad.length === 0); if (!pass) fails++;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${n} F${F} ${JSON.stringify(r)}`); await ctx.close();
}
console.log(`${10 - fails}/10 passed`); await b.close(); process.kill(-srv.pid); process.exit(fails ? 1 : 0);
