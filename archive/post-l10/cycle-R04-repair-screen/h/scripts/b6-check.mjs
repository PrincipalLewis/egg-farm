// PT1-12 / B6 regression: at 960x700 with 10 customers the Collect bar's right edge must be <= the side panel's left edge.
// Usage: node scripts/b6-check.mjs [gameDir=.] [widths=960]   (builds nothing; expects <gameDir>/dist-qa). Exit 1 on overlap.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
const dir = process.argv[2] || '.'; const widths = (process.argv[3] || '960').split(',').map(Number);
const port = 4290 + Math.floor(Math.random() * 500);
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true, cwd: dir });
await new Promise(r => setTimeout(r, 2500));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); let bad = 0;
for (const w of widths) for (const n of [0, 5, 10]) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 600 ? 812 : 700 } }); const p = await ctx.newPage();
  await p.addInitScript(() => localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true })));
  await p.goto(`http://127.0.0.1:${port}/`); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm);
  await p.evaluate(n => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 25, collectionLevel: 25, coop: 9.99e15, basket: 9.99e15, coinsCents: 9.99e17, nextCustomerInS: 1e9, customers: Array.from({ length: n }, (_, i) => ({ id: i + 1, demand: 99999, filled: 0, waitedS: 0 })) }; }, n);
  await p.waitForTimeout(1200);
  const r = await p.evaluate(() => { const q = s => document.querySelector(s)?.getBoundingClientRect(); const pl = innerWidth >= 960 ? q('#panel-layer') : null;
    return { bar: q('.collectbar').right, farm: q('.farm').right, panel: pl && pl.width && getComputedStyle(document.querySelector('#panel-layer')).display !== 'none' ? pl.left : innerWidth, sw: document.documentElement.scrollWidth, vw: innerWidth }; });
  const ok = r.bar <= r.panel + 0.5 && r.farm <= r.panel + 0.5 && r.sw <= r.vw;
  if (!ok) bad++; console.log(w, n, JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Math.round(v)]))), ok ? 'ok' : 'OVERLAP');
  await ctx.close();
}
await b.close(); process.kill(-srv.pid); process.exit(bad ? 1 : 0);
