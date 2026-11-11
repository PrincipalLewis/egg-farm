import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
// 98396ed: ROOT=<worktree> DIST=dist|dist-qa PORT=.. (unique port; refuses to run if the port is busy or serves another build)
const ROOT = process.argv[2] ?? process.env.ROOT ?? '/tmp/efs/pt1', DIST = process.env.DIST ?? 'dist';
const { chromium, firefox, webkit, devices } = createRequire(ROOT + '/package.json')('playwright-core'); // the worktree's playwright build
const port = +(process.env.PORT ?? 4201), base = `http://127.0.0.1:${port}/`;
try { await fetch(base); console.error(`port ${port} already serving - refusing (stale server?)`); process.exit(3); } catch {}
const srv = spawn('npx', ['vite', 'preview', '--outDir', DIST, '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true, cwd: ROOT });
const kill = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch {} };
setTimeout(() => { kill(); process.exit(2); }, 170000).unref();
await new Promise(r => setTimeout(r, 2500));
{ const want = fs.readdirSync(`${ROOT}/${DIST}/assets`).find(f => /^index-.*\.js$/.test(f)); const html = await (await fetch(base)).text(); if (!html.includes(want)) { console.error(`served bundle != ${DIST}/${want}`); kill(); process.exit(4); } }
const OUT = process.env.OUT ?? '/workspace/egg-farm-studio/qa/m3-pt1/'; fs.mkdirSync(OUT, { recursive: true });
const res = {};
async function run(name, type, ctxOpt, launch = {}) {
  const r = res[name] = {}; const b = await type.launch(launch); const ctx = await b.newContext({ acceptDownloads: true, ...ctxOpt });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  try {
    await p.goto(base); await p.getByText('Tap to start').click(); await p.waitForFunction(() => localStorage.getItem('eggfarm.install_id') && typeof window.eggfarmExportTelemetry === 'function', null, { timeout: 15000 }); await p.waitForTimeout(500);
    const id1 = await p.evaluate(() => localStorage.getItem('eggfarm.install_id'));
    // release: eggfarmExportTelemetry() no longer carries install_id (55fcde1) -> QA build uses window.eggfarm.telemetry.exportJSON();
    // release falls back to the persisted ring localStorage['eggfarm.telemetry'] (written on the telemetry flush interval).
    const ev = await p.evaluate(() => { const src = window.eggfarm?.telemetry ? window.eggfarm.telemetry.exportJSON() : JSON.stringify({ events: JSON.parse(localStorage.getItem('eggfarm.telemetry') || '[]') }); return JSON.parse(src).events.filter(e => e.type === 'session_start'); });
    r.install_id = id1; r.session_start = ev.map(e => ({ install_id: e.install_id, build: e.build }));
    await p.locator('#settings').click(); await p.waitForTimeout(300);
    if (name.startsWith('ios')) {
      await p.evaluate(() => { navigator.canShare = () => false; Object.defineProperty(navigator, 'clipboard', { value: { writeText: async t => { window.__clip = t; } }, configurable: true }); });
      await p.locator('#sExport').click(); await p.waitForTimeout(800);
      const clip = await p.evaluate(() => window.__clip || ''); r.export = { via: 'clipboard', ok: !!clip && Array.isArray(JSON.parse(clip).events), msg: await p.locator('#sExportMsg').textContent() };
      // share path
      await p.evaluate(() => { navigator.canShare = () => true; navigator.share = async d => { window.__shared = d.files?.[0]?.name; }; });
      await p.locator('#sExport').click(); await p.waitForTimeout(500);
      r.share = { file: await p.evaluate(() => window.__shared || null), msg: await p.locator('#sExportMsg').textContent() };
      await p.evaluate(() => { navigator.share = async () => { throw new DOMException('cancel', 'AbortError'); }; window.__clip = ''; });
      await p.locator('#sExport').click(); await p.waitForTimeout(500);
      r.shareCancel = { clip: await p.evaluate(() => !!window.__clip), msg: await p.locator('#sExportMsg').textContent() };
    } else {
      const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }), p.locator('#sExport').click()]);
      const path = OUT + name + '-export.json'; await dl.saveAs(path); const j = JSON.parse(fs.readFileSync(path, 'utf8'));
      r.export = { via: 'download', file: dl.suggestedFilename(), events: j.events.length, msg: await p.locator('#sExportMsg').textContent() };
    }
    // Reset save -> install_id kept
    await p.locator('#sReset').click(); await p.locator('#cReset').click(); await p.waitForLoadState(); await p.waitForTimeout(800);
    r.afterReset = await p.evaluate(() => ({ id: localStorage.getItem('eggfarm.install_id'), tel: localStorage.getItem('eggfarm.telemetry'), ui: localStorage.getItem('eggfarm.ui') }));
    // corrupt save -> install_id kept
    await p.evaluate(() => localStorage.setItem('eggfarm.save', '{"version":5,"sta')); await p.reload(); await p.waitForTimeout(800);
    r.afterCorrupt = await p.evaluate(() => localStorage.getItem('eggfarm.install_id'));
    r.idStable = r.afterReset.id === id1 && r.afterCorrupt === id1;
  } catch (e) { r.error = String(e).slice(0, 200); }
  r.errors = errs; await b.close();
}
await run('chromium', chromium, { viewport: { width: 1280, height: 800 } }, { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
await run('firefox', firefox, { viewport: { width: 1280, height: 800 } });
await run('webkit', webkit, { viewport: { width: 1280, height: 800 } });
await run('ios-webkit', webkit, devices['iPhone 13']);
fs.writeFileSync(OUT + 'browser-results.json', JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1)); kill(); process.exit(0);
