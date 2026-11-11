// QA: F24 Market perf, headed vs headless, WebKit vs Chromium; plus a blank-page rAF floor (box rendering) and F24 farm view (Market closed).
// Usage: node perf-f24-matrix.mjs <worktree with dist-qa>   (needs DISPLAY for headed)
import { createRequire } from 'node:module'; import path from 'node:path'; import { spawn } from 'node:child_process';
const ROOT = process.argv[2]; const { chromium, webkit } = createRequire(path.join(ROOT, 'package.json'))('playwright-core');
const port = 4400 + Math.floor(Math.random() * 40), S = +(process.env.S || 20);
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true, cwd: ROOT });
await new Promise(r => setTimeout(r, 2500));
const blank = `data:text/html,<div id=x style="width:50px;height:50px;background:red"></div><script>let t=[],l=0;function f(n){if(l)t.push(n-l);l=n;x.style.transform='translateX('+(n%300)+'px)';requestAnimationFrame(f)}requestAnimationFrame(f);window.res=()=>{const s=t.slice(30).sort((a,b)=>a-b);return {frames:s.length,p50:s[s.length>>1],p95:s[Math.floor(s.length*.95)],max:s[s.length-1]}}</script>`;
const rows = [];
for (const eng of ['webkit', 'chromium']) for (const headless of [true, false]) {
  const br = eng === 'webkit' ? await webkit.launch({ headless }) : await chromium.launch({ headless, executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 360, height: 640 } }); const p = await ctx.newPage();
  await p.goto(blank); await p.waitForTimeout(S * 1000); const B = await p.evaluate(() => window.res());
  rows.push({ eng, mode: headless ? 'headless' : 'headed', scene: 'blank rAF', ...B });
  for (const market of [false, true]) {
    const c2 = await br.newContext({ viewport: { width: 360, height: 640 } }); const q = await c2.newPage();
    await q.addInitScript(() => localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sessions: 1 })));
    await q.goto(`http://127.0.0.1:${port}/?perf=1&perfS=${S}&perfWarmS=5`); await q.getByText('Tap to start').click(); await q.waitForFunction(() => window.eggfarm);
    await q.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 24, collectionLevel: 20, coop: 0, basket: 0, coinsCents: 0, customers: Array.from({ length: 10 }, (_, i) => ({ id: 9000 + i, demand: 50 + i, filled: 0, waitedS: i * 2.5 })), nextCustomerId: 9100, nextCustomerInS: 1.5 }; });
    if (market) await q.evaluate(() => document.querySelector('nav [data-nav=market]').click());
    await q.waitForFunction(() => window.eggfarmPerf?.done, null, { timeout: (S + 30) * 1000 }); const r = await q.evaluate(() => window.eggfarmPerf.result);
    rows.push({ eng, mode: headless ? 'headless' : 'headed', scene: market ? 'F24 Market open' : 'F24 farm view', frames: r.frames, p50: r.p50, p95: r.p95, max: r.max, over20Pct: r.over20Pct }); await c2.close();
  }
  await br.close();
}
for (const r of rows) console.log(JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'number' ? +v.toFixed(1) : v]))));
process.kill(-srv.pid); process.exit(0);
