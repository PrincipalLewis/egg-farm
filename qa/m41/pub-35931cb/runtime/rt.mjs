import { createRequire } from 'node:module';
const require = createRequire('/workspace/egg-farm-studio/qa/wt-pub-35931cb/package.json');
const pw = require('playwright-core');
const out = {};
const br = await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
out.browser = br.version();
for (const f of ['rc1-5d9efa6.html', 'merge-35931cb.html']) {
  const c = await br.newContext({ viewport: { width: 390, height: 844 } }); const p = await c.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(`http://127.0.0.1:5961/${f}`, { waitUntil: 'load' }); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => {
    let tel = null, sessBuilds = [];
    try { tel = JSON.parse(window.eggfarmExportTelemetry()); } catch (e) { tel = 'ERR ' + e; }
    const s = JSON.stringify(tel); const re = /"build":"([^"]*)"/g; let m; while ((m = re.exec(s))) sessBuilds.push(m[1]);
    return { meta: document.querySelector('meta[name="build-id"]')?.content, appData: document.getElementById('app')?.dataset.buildId, telemetryBuilds: [...new Set(sessBuilds)], hasDirty: /\+dirty/.test(document.documentElement.outerHTML) };
  });
  await p.screenshot({ path: `/workspace/egg-farm-studio/qa/m41/pub-35931cb/runtime/${f}.png` });
  out[f] = { ...r, pageErrors: errs }; await c.close();
}
await br.close(); console.log(JSON.stringify(out, null, 2));
