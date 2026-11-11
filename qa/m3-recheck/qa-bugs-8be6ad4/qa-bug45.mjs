import { chromium, firefox, webkit } from 'playwright-core';
import { spawn } from 'node:child_process';
const OUT = process.argv[2], ENG = process.argv[3] ?? 'chromium'; const port = 4292, base = `http://127.0.0.1:${port}/`;
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
const kill = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch {} };
setTimeout(() => { kill(); process.exit(2); }, 400000).unref();
await new Promise(r => setTimeout(r, 5000));
const browser = ENG === 'firefox' ? await firefox.launch() : ENG === 'webkit' ? await webkit.launch() : await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let fails = 0, n = 0; const ok = (t, p, i) => { n++; if (!p) fails++; console.log(`${p ? 'PASS' : 'FAIL'} [${ENG}] ${t} ${JSON.stringify(i)}`); };
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.addInitScript(() => { if (!sessionStorage.getItem('s')) { localStorage.setItem('eggfarm.ui', JSON.stringify({ seenSlots: 5, onboardingDone: true, workersIntroA: true, workersIntroB: true })); sessionStorage.setItem('s', '1'); } });
await p.goto(base, { timeout: 120000 }); await p.getByText('Tap to start').click({ timeout: 60000 }).catch(() => {}); await p.waitForTimeout(800);
await p.evaluate(() => { window.__log = []; const t0 = performance.now(); window.__t = () => performance.now() - t0;
  new MutationObserver(ms => ms.forEach(m => { m.addedNodes.forEach(x => { if (x.classList?.contains('floater') || x.classList?.contains('ghost')) { x.__id = Math.random(); window.__log.push({ ev: 'add', cls: x.className, t: window.__t(), txt: x.textContent, id: x.__id }); } });
    m.removedNodes.forEach(x => { if (x.classList?.contains('floater') || x.classList?.contains('ghost')) window.__log.push({ ev: 'rm', cls: x.className, t: window.__t(), txt: x.textContent, id: x.__id }); }); })).observe(document.body, { childList: true, subtree: true }); });
// BUG-5: two collects ~550 ms apart -> merged '+N' floater, must live ~750 ms after the 2nd tap
for (const [gap, taps] of [[200, 6], [240, 5]]) {
  await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coop: 500, basket: 0 }; window.__log.length = 0; });
  const [t1, t2] = await p.evaluate(([gap, taps]) => new Promise(res => { const b = document.querySelector('#collect'), ts = []; let i = 0;
    const go = () => { b.click(); ts.push(window.__t()); if (++i < taps) setTimeout(go, gap); else res([ts[0], ts[ts.length - 1], ts]); }; go(); }), [gap, taps]);
  await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/bug5-${ENG}-gap${gap}-mid.png` });
  const live = await p.evaluate(() => [...document.querySelectorAll('.floater:not(.coin)')].map(e => e.textContent));
  await p.waitForTimeout(1200);
  const log = await p.evaluate(() => window.__log.filter(e => !/coin/.test(e.cls)));
  const adds = log.filter(e => e.ev === 'add'), rm = log.find(e => e.ev === 'rm' && e.id === adds[0]?.id);
  const life2 = rm ? rm.t - t2 : null;
  ok(`BUG-5 ${taps} taps ${gap}ms apart (chain ${Math.round(t2 - t1)}ms > 750): one merged floater, removed ~750ms after the LAST tap`, adds.length === 1 && rm && life2 >= 650 && rm.t - t1 > 800, { t1, t2, adds: adds.length, rmAt: rm?.t, lifeAfterLast: life2, live300msAfterLast: live, finalTxt: rm?.txt });
}
// BUG-4: partial-served customer leaves on timeout, and sold-out leave
for (const [label, filled, basket] of [['partial', 2, 0], ['soldout', 0, 0]]) {
  await p.evaluate(([f, bk]) => { const g = window.eggfarm; const pat = 1e9; g.state = { ...g.state, basket: bk, coop: 0, customers: [{ id: 777 + f, demand: 6, filled: f, waitedS: 0 }], nextCustomerInS: 1e9 }; window.__log.length = 0; }, [filled, basket]);
  await p.waitForTimeout(600);
  await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, customers: g.state.customers.map(c => ({ ...c, waitedS: 1e6 })) }; });
  const samples = [];
  for (let i = 0; i < 14; i++) { const s = await p.evaluate(() => { const e = document.querySelector('.ghost'); if (!e) return null; const cs = getComputedStyle(e); return { t: window.__t(), op: +cs.opacity, tr: cs.transform, cls: e.className, txt: e.textContent }; }); samples.push(s); if (i === 3) await p.screenshot({ path: `${OUT}/bug4-${ENG}-${label}.png` }); await p.waitForTimeout(100); }
  await p.waitForTimeout(1200);
  const log = await p.evaluate(() => window.__log.filter(e => /ghost/.test(e.cls)));
  const add = log.find(e => e.ev === 'add'), rm = log.find(e => e.ev === 'rm');
  const seen = samples.filter(Boolean), slid = seen.some(s => s.op < 0.95 && s.tr !== 'none'), opaqueFirst = seen.length && seen[0].op > 0.9;
  ok(`BUG-4 ${label}: ghost waves, then slides out and fades; lives ~1.5 s (not ~300 ms)`, add && rm && rm.t - add.t >= 1000 && slid && opaqueFirst, { cls: add?.cls, txt: add?.txt, lifeMs: rm && add ? Math.round(rm.t - add.t) : null, firstOp: seen[0]?.op, minOp: Math.min(...seen.map(s => s.op)), anyTransform: seen.some(s => s.tr !== 'none') });
}
ok('no page errors', errs.length === 0, errs);
console.log(`${n - fails}/${n} passed`); process.exitCode = fails ? 1 : 0; await browser.close(); kill();
