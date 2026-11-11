// PR5 @37524aa: mid-fade reversal. Toast 1 (buyFarm) -> wait for its fade-out to start + ~100ms -> buyFarm again; per-frame log.
// PASS: after re-show, opacity never drops below its value at re-show (no snap to 0), rises to 1, and top never jumps > 8.5px from the settled top. node qa-midfade.mjs <engine> <port> <outdir>
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const pw = createRequire(process.cwd() + '/package.json')('playwright-core');
const [ENG, PORT, OUT] = process.argv.slice(2); if (+PORT === 4173) process.exit(3);
const srv = spawn('npx', ['vite','preview','--outDir','dist-qa','--port',PORT,'--strictPort','--host','127.0.0.1'], { stdio:'ignore', detached:true });
const kill = () => { try { process.kill(-srv.pid,'SIGTERM'); } catch {} }; process.on('exit', kill);
for (let i = 0; i < 240; i++) { try { await fetch(`http://127.0.0.1:${PORT}/`); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
{ const h = await (await fetch(`http://127.0.0.1:${PORT}/`)).text(); const j = h.match(/assets\/index-[^"]+\.js/)[0]; const bb = await (await fetch(`http://127.0.0.1:${PORT}/` + j)).text(); console.log('served build', (bb.match(/m\d+-rc[\w-]*\+[0-9a-f]{7}/) || [])[0]); }
const br = await pw[ENG].launch(ENG === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {});
let fails = 0; const res = {};
for (const [w, h, banner] of [[360,740,true],[390,640,false],[1280,800,true],[1280,800,false]]) {
  const key = `${w}x${h}-${banner ? 'banner' : 'nobanner'}`; const ctx = await br.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(b => { if (!sessionStorage.qa) { localStorage.setItem('eggfarm.ui', JSON.stringify(b ? { onboardingDone: true } : { onboardingDone: true, workersIntroA: true })); sessionStorage.qa = 1; } }, banner);
  await p.goto(`http://127.0.0.1:${PORT}/`, { timeout: 90000 }); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm && window.eggfarm.state, null, { timeout: 30000 }); await p.waitForTimeout(800);
  await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 4, coinsCents: 1e12 }; window.__f = []; window.__re = null; const el = document.querySelector('.toast'); const t0 = performance.now(); let fadeAt = null;
    const loop = () => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el), now = Math.round(performance.now() - t0); window.__f.push({ t: now, top: +r.top.toFixed(1), op: +(+cs.opacity).toFixed(3), show: el.classList.contains('show'), vis: cs.visibility });
      if (fadeAt === null && window.__f.some(x => x.show) && !el.classList.contains('show')) fadeAt = now;
      if (fadeAt !== null && window.__re === null && now - fadeAt >= 100) { window.__re = { t: now, op: +cs.opacity, top: r.top }; g.state = { ...g.state, celebratedTier: 0 }; }
      if (now < 4500) requestAnimationFrame(loop); };
    g.dispatch({ type: 'buyFarm' }); requestAnimationFrame(loop); });
  let shot = false; for (let i = 0; i < 60; i++) { await p.waitForTimeout(80); const re = await p.evaluate(() => window.__re); if (re && !shot) { await p.waitForTimeout(100); await p.screenshot({ path: `${OUT}/${ENG}-midfade-re+100ms-${key}.png` }); shot = true; } if (shot) break; }
  await p.waitForTimeout(1200); const { f, re } = await p.evaluate(() => ({ f: window.__f, re: window.__re }));
  const settled = f.filter(x => x.show && x.op === 1).map(x => x.top); const sTop = settled.length ? settled[0] : null;
  const after = re ? f.filter(x => x.t > re.t && x.t <= re.t + 400) : []; const minOp = after.length ? Math.min(...after.map(x => x.op)) : null; const maxOp = after.length ? Math.max(...after.map(x => x.op)) : null;
  const jump = after.filter(x => x.op > 0 && sTop !== null && Math.abs(x.top - sTop) > 8.5 + (banner || w < 960 ? 0 : 1000)).length;
  const ok = !!re && re.op > 0 && re.op < 1 && minOp >= re.op - 0.06 && maxOp === 1 && !jump && !errs.length; if (!ok) fails++;
  res[key] = { ok, re, sTop, minOpAfter: minOp, maxOpAfter: maxOp, jump, frames: f.length, errs, trace: after.slice(0, 12) };
  console.log(`${ok ? 'PASS' : 'FAIL'} [${ENG}] midfade ${key} reAt=${JSON.stringify(re)} sTop=${sTop} minOpAfter=${minOp} maxOpAfter=${maxOp} jump=${jump} errs=${errs.length} trace=${JSON.stringify(after.slice(0, 6))}`);
  await ctx.close();
}
fs.writeFileSync(`${OUT}/midfade-${ENG}.json`, JSON.stringify(res, null, 1)); await br.close(); kill(); console.log(`DONE midfade ${ENG} fails=${fails}`); process.exit(0);
