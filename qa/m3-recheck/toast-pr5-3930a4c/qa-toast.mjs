// PR5: 'Coop upgraded!' toast vs 'New helper!' banner (.intro-a) and queue strip. node qa-toast.mjs <engine> <port> <outdir> <label>
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const pw = createRequire(process.cwd() + '/package.json')('playwright-core');
const [ENG, PORT, OUT, LABEL] = process.argv.slice(2); if (+PORT === 4173) process.exit(3);
const srv = spawn('npx', ['vite','preview','--outDir','dist-qa','--port',PORT,'--strictPort','--host','127.0.0.1'], { stdio:'ignore', detached:true });
const kill = () => { try { process.kill(-srv.pid,'SIGTERM'); } catch {} }; process.on('exit', kill);
for (let i = 0; i < 240; i++) { try { await fetch(`http://127.0.0.1:${PORT}/`); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
const br = await pw[ENG].launch(ENG === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {});
const res = {}; let fails = 0;
for (const banner of [true, false]) for (const [w, h] of [[360,740],[390,640],[375,812],[390,844],[430,932],[1024,474],[1280,720],[1280,800],[1366,768]]) {
  const key = `${w}x${h}${banner ? '' : '-nobanner'}`; const ctx = await br.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(b => { if (!sessionStorage.qa) { localStorage.setItem('eggfarm.ui', JSON.stringify(b ? { onboardingDone: true } : { onboardingDone: true, workersIntroA: true })); sessionStorage.qa = 1; } }, banner);
  await p.goto(`http://127.0.0.1:${PORT}/`, { timeout: 90000 }); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm && window.eggfarm.state, null, { timeout: 30000 }); await p.waitForTimeout(800);
  await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 4, coinsCents: 1e9 }; g.dispatch({ type: 'buyFarm' }); });
  const S = []; const t0 = Date.now(); let shot = false;
  while (Date.now() - t0 < 2600) {
    const s = await p.evaluate(() => { const R = e => { const b = e.getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom) }; };
      const ov = (a, c) => a && c && Math.min(a.r,c.r) > Math.max(a.l,c.l) && Math.min(a.b,c.b) > Math.max(a.t,c.t);
      const T = document.querySelector('.toast'), cs = T && getComputedStyle(T); const vis = T && cs.visibility === 'visible' && +cs.opacity > 0.05 && /Coop upgraded/.test(T.textContent);
      const ia = document.querySelector('.intro-a:not([hidden])'); const iar = ia && ia.getBoundingClientRect().height ? R(ia) : null; const q = document.querySelector('#queue'); const qr = q && q.getBoundingClientRect().height ? R(q) : null;
      const tr = T ? R(T) : null; return { vis, op: cs?.opacity, toast: tr, banner: iar, queue: qr, ovBanner: vis && ov(tr, iar), ovQueue: vis && innerWidth < 960 && ov(tr, qr), inVp: !vis || (tr.t >= 0 && tr.r <= innerWidth && tr.l >= 0) }; });
    S.push(s); if (!shot && s.vis && Date.now() - t0 > 250) { await p.screenshot({ path: `${OUT}/${LABEL}-${ENG}-toast-${key}.png` }); shot = true; }
    await p.waitForTimeout(80);
  }
  const vis = S.filter(s => s.vis); const ob = vis.filter(s => s.ovBanner).length, oq = vis.filter(s => s.ovQueue).length, out = vis.filter(s => !s.inVp).length;
  const set = vis.filter(s => +s.op >= 0.95); const sob = set.filter(s => s.ovBanner).length, soq = set.filter(s => s.ovQueue).length, sout = set.filter(s => !s.inVp).length;
  const trans = vis.filter(s => (s.ovBanner || s.ovQueue || !s.inVp)).map(s => `t${s.toast.t}@op${(+s.op).toFixed(2)}`).join(',');
  const ok = vis.length > 0 && !sob && !soq && !sout && !errs.length && (!banner || vis.some(s => s.banner)); if (!ok) fails++;
  const f = set.find(s => s.banner) || set[0] || vis[0];
  console.log(`${LABEL} ${ok ? 'PASS' : 'FAIL'} [${ENG}] ${key} visSamples=${vis.length} ovBanner=${ob} ovQueue=${oq} outVp=${out} settled=${set.length} sOvBanner=${sob} sOvQueue=${soq} sOut=${sout} transientOv=[${trans}] errs=${errs.length} toast=${JSON.stringify(f?.toast)} banner=${JSON.stringify(f?.banner)} queue=${JSON.stringify(f?.queue)}`);
  res[key] = { ok, ob, oq, out, sample: f, errs }; await ctx.close();
}
fs.writeFileSync(`${OUT}/${LABEL}-toast-${ENG}.json`, JSON.stringify(res, null, 1));
await br.close(); kill(); console.log(fails ? `FAILS ${fails} ${LABEL} ${ENG}` : `NO FAILS ${LABEL} ${ENG}`); process.exit(fails ? 1 : 0);
