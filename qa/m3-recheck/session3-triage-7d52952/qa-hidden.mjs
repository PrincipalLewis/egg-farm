// S3 hidden-tab over-credit. Serves 7d52952 and a01faea dist-qa side by side in one engine; hides both tabs for HIDE_S (default 600) wall-clock.
// node qa-hidden.mjs <engine> <outdir>   (cwd irrelevant; uses game-rc1 worktrees)
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const [ENG, OUT] = process.argv.slice(2); const HIDE = +(process.env.HIDE_S || 600);
const pw = createRequire('/tmp/qa-rc1v4-7d52952/package.json')('playwright-core');
const builds = [['7d52952', '/tmp/qa-rc1v4-7d52952', 4342], ['a01faea', '/tmp/qa-b2-base-a01faea', 4343]];
const srvs = builds.map(([, d, p]) => spawn('npx', ['vite','preview','--outDir','dist-qa','--port',String(p),'--strictPort','--host','127.0.0.1'], { cwd: d, stdio:'ignore', detached:true }));
const kill = () => srvs.forEach(s => { try { process.kill(-s.pid,'SIGTERM'); } catch {} }); process.on('exit', kill);
for (const [, , p] of builds) for (let i = 0; i < 240; i++) { try { await fetch(`http://127.0.0.1:${p}/`); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
const br = await pw[ENG].launch(ENG === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {});
const DONE = JSON.stringify({ onboardingDone: true, sessions: 3, seenSlots: 99, workersIntroA: true, workersIntroB: true });
const snap = p => p.evaluate(() => { const g = window.eggfarm, s = g.state; return { coins: s.coinsCents, basket: Math.floor(s.basket), coop: Math.floor(s.coop), mh: s.workers.market_hand ? Math.round(s.workers.market_hand.energy) : null, frames: window.__f || 0, vis: document.visibilityState, hidden: document.hidden, modal: !!document.querySelector('.modal'), t: Date.now() }; });
const P = {};
for (const [id, , port] of builds) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  await p.addInitScript(ui => { if (!sessionStorage.qa) { localStorage.setItem('eggfarm.ui', ui); sessionStorage.qa = 1; } }, DONE);
  await p.goto(`http://127.0.0.1:${port}/`, { timeout: 90000 }); await p.getByText('Tap to start').click(); await p.waitForTimeout(800);
  await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 7, collectionLevel: 7, coinsCents: 100000, basket: 100000, workers: { market_hand: { energy: 100, cdS: 0 } } }; window.__f = 0; const f = g.frame.bind(g); g.frame = (...a) => { window.__f++; return f(...a); }; });
  P[id] = { ctx, p };
}
const r = {};
for (const id in P) r[id] = { s0: await snap(P[id].p) };
await new Promise(res => setTimeout(res, 60000)); // 60 s foreground baseline
for (const id in P) r[id].s1 = await snap(P[id].p);
// hide: open a blank page in front in the same context (other origin => no single-tab guard)
const method = {};
for (const id in P) { const f = await P[id].ctx.newPage(); await f.goto('about:blank'); await f.bringToFront(); P[id].front = f; await new Promise(res => setTimeout(res, 500));
  let v = await P[id].p.evaluate(() => document.visibilityState); method[id] = `second page bringToFront -> ${v}`;
  if (v !== 'hidden' && ENG === 'chromium') { const c = await P[id].ctx.newCDPSession(P[id].p); await c.send('Page.setWebLifecycleState', { state: 'active' }).catch(() => {}); await c.send('Emulation.setFocusEmulationEnabled', { enabled: false }).catch(() => {}); P[id].cdp = c;
    // Chromium headless keeps every page visible; force a real hidden state via the page's own visibility API is not possible over CDP, so fall back:
    v = await P[id].p.evaluate(() => document.visibilityState); }
  if (v !== 'hidden') { await P[id].p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    method[id] += ' -> fallback: visibilityState/hidden overridden + visibilitychange dispatched (timers NOT throttled by the engine)'; }
  r[id].sHide = await snap(P[id].p); }
const mid = {}; const t0 = Date.now();
while (Date.now() - t0 < HIDE * 1000) { await new Promise(res => setTimeout(res, 60000)); for (const id in P) (mid[id] ||= []).push(await snap(P[id].p).catch(e => String(e))); }
for (const id in P) { r[id].sBack0 = await snap(P[id].p); await P[id].front.close(); await P[id].p.bringToFront(); await P[id].p.evaluate(() => { if (Object.getOwnPropertyDescriptor(document, 'hidden')) { delete document.hidden; delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); } }); await new Promise(res => setTimeout(res, 2000)); r[id].sBack = await snap(P[id].p); await P[id].p.screenshot({ path: `${OUT}/${ENG}-hidden-${id}-return.png` });
  const fg = r[id].s1.coins - r[id].s0.coins, hid = r[id].sBack0.coins - r[id].sHide.coins, hs = (r[id].sBack0.t - r[id].sHide.t) / 1000;
  r[id].calc = { method: method[id], fgCoins60s: fg, hiddenS: Math.round(hs), hiddenCoins: hid, expectCapCoins_60sOnline: fg, expectIfFullSim: Math.round(fg * hs / 60), ratioVsCap: fg ? +(hid / fg).toFixed(2) : null, framesHidden: r[id].sBack0.frames - r[id].sHide.frames, mhEnergy: [r[id].sHide.mh, r[id].sBack0.mh], verdict: hid > fg * 1.5 ? 'OVER-CREDIT (sim ran while hidden beyond 60 s)' : 'OK (frozen after ~60 s)' };
  r[id].mid = mid[id]; console.log(ENG, id, JSON.stringify(r[id].calc)); }
fs.writeFileSync(`${OUT}/hidden-${ENG}.json`, JSON.stringify(r, null, 1)); await br.close(); kill(); console.log('DONE', ENG); process.exit(0);
