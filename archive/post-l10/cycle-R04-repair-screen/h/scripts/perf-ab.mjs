// F24 Market perf A/B (one change per variant) with the SM-9 sampler (?perf=1).
// Usage: [HEADED=1] [SEC=15] node scripts/perf-ab.mjs [webkit|chromium] [variant,...]   (expects dist-qa)
import { webkit, chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
const eng = process.argv[2] || 'webkit'; const port = 4900 + Math.floor(Math.random() * 90);
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
const V = {
  base: '',
  chipFlatBg: '.queue .chip{background:#fff!important}',
  ghostsOff: '.ghost,.bubble{display:none!important}',
  bobTransform: '.hen{--sx:1;will-change:transform;animation-name:bobT!important}.hen.flip{--sx:-1}@keyframes bobT{0%,100%{transform:scaleX(var(--sx))}50%{transform:translateY(-2px) scaleX(var(--sx))}}',
  meterNoTrans: '#meterFill,#meterFill *{transition:none!important}',
  henNoBob: '.hen{animation:none!important}',
  queueNone: '.queue{display:none!important}',
  allNoAnim: '*,*::before,*::after{animation:none!important}',
  allNoTrans: '*,*::before,*::after{transition:none!important}',
  navHidden: 'nav{visibility:hidden!important}',
  hudHidden: 'header,.hud{visibility:hidden!important}',
  queueHidden: '.queue{visibility:hidden!important}',
  chipNoRing: '.queue .chip::before,.queue .chip::after{display:none!important;background:none!important}',
  chipNoAnim: '.queue .chip,.queue .chip *{animation:none!important;transition:none!important}',
  barNoTransition: '.order .bar>i{transition:none!important}',
  noContain: '.order{contain:none!important}',
  noShadowFilter: '#panel-layer, #panel-layer *{box-shadow:none!important;filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
  willChange: '.order{will-change:transform}',
  hideList: '#mRows{visibility:hidden!important}',
  emptyQueue: 'JS:empty', staticQueue: 'JS:static', farmView: 'JS:farm',
};
const pick = (process.argv[3] || Object.keys(V).join(',')).split(',');
const br = eng === 'webkit' ? await webkit.launch({ headless: !process.env.HEADED }) : await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'], headless: !process.env.HEADED });
for (const name of pick) {
  const v = V[name] ?? ''; const ctx = await br.newContext({ viewport: { width: 360, height: 640 } }); const p = await ctx.newPage();
  await p.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.__cb = { n: 0, ms: 0, max: 0 };
    window.requestAnimationFrame = f => raf(t => { const a = performance.now(); f(t); const d = performance.now() - a; const c = window.__cb; c.n++; c.ms += d; if (d > c.max) c.max = d; }); });
  await p.addInitScript(() => localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true })));
  await p.goto(`http://127.0.0.1:${port}/?perf=1&perfS=${process.env.SEC || 15}&perfWarmS=3`); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm);
  await p.evaluate(v => { const g = window.eggfarm; const n = v === 'JS:empty' ? 0 : 10, still = v === 'JS:empty' || v === 'JS:static';
    g.state = { ...g.state, farmLevel: 24, collectionLevel: 20, customers: Array.from({ length: n }, (_, i) => ({ id: 9000 + i, demand: 50 + i, filled: 0, waitedS: still ? -1e9 : i * 2.5 })), nextCustomerId: 9100, nextCustomerInS: still ? 1e9 : 1.5 };
    if (!v.startsWith('JS:')) { const st = document.createElement('style'); st.textContent = v; document.head.append(st); }
    if (v !== 'JS:farm') document.querySelector('nav [data-nav=market]').click(); }, v);
  await p.waitForFunction(() => window.eggfarmPerf?.done, null, { timeout: 120000 }); const s = await p.evaluate(() => window.eggfarmPerf.result);
  const cb = await p.evaluate(() => window.__cb); console.log(name.padEnd(16), 'rafJS/frame', (cb.ms / Math.max(1, cb.n)).toFixed(2), 'max', cb.max.toFixed(1), 'p50', s.p50.toFixed(1), 'p95', s.p95.toFixed(1), 'over20%', s.over20Pct.toFixed(1)); await ctx.close();
}
await br.close(); process.kill(-srv.pid);
