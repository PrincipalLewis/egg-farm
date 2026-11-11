import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process';
const port = 4292; const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
await new Promise(r => setTimeout(r, 5000));
const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const w of [360, 375, 390, 430, 1280]) {
  const ctx = await br.newContext({ viewport: { width: w, height: w > 900 ? 800 : 844 } }); const p = await ctx.newPage();
  await p.addInitScript(() => { if (!sessionStorage.s) { localStorage.setItem('eggfarm.ui', JSON.stringify({ seenSlots: 5, onboardingDone: true, workersIntroA: true, workersIntroB: true })); sessionStorage.s = 1; } });
  await p.goto(`http://127.0.0.1:${port}/`); await p.getByText('Tap to start').click().catch(() => {}); await p.waitForTimeout(500);
  await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, basket: 3, customers: [{ id: 1, demand: 3, filled: 0, waitedS: 0 }, { id: 2, demand: 12, filled: 0, waitedS: 0 }, { id: 3, demand: 5, filled: 0, waitedS: 0 }], nextCustomerInS: 1e9 }; });
  if (w < 960) await p.locator('[data-nav=market]').click(); await p.waitForTimeout(800);
  const r = await p.locator('.order .sell').evaluateAll(bs => bs.map(b => { const cs = getComputedStyle(b); return { label: b.getAttribute('aria-label'), w: b.clientWidth, sw: b.scrollWidth, spans: [...b.querySelectorAll('span')].map(s => ({ t: s.textContent, cw: s.clientWidth, sw: s.scrollWidth })), width: cs.width, maxW: cs.maxWidth, minW: cs.minWidth, fs: cs.fontSize, flexDir: cs.flexDirection }; }));
  console.log(w, JSON.stringify(r));
  await p.screenshot({ path: `/workspace/egg-farm-studio/qa/m3-recheck/qa-bugs-8be6ad4/shots/sellbtn-${w}.png` }); await ctx.close();
}
await br.close(); process.kill(-srv.pid);
