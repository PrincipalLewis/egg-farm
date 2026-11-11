// OQ-1: corrupt level (farmLevel "abc"), no .bak -> what does the player see? usage: node oq1-nobak.mjs <worktree> <engine> <port> <outdir> <dist>
import { chromium, firefox, webkit } from 'playwright-core'; import { spawn } from 'node:child_process'; import { readFileSync, writeFileSync } from 'node:fs';
const [W, E = 'chromium', P = '5964', OUT, DIST = 'dist-qa'] = process.argv.slice(2);
const srv = spawn('npx', ['vite', 'preview', '--outDir', DIST, '--port', P, '--strictPort', '--host', '127.0.0.1'], { cwd: W, stdio: 'ignore', detached: true });
const fx = readFileSync('/workspace/egg-farm-studio/qa/m3-recheck/oq1/OQ1-farmLevel-abc-nobak.json', 'utf8');
await new Promise(r => setTimeout(r, 2500)); const res = { engine: E, dist: DIST };
const br = await { chromium, firefox, webkit }[E].launch(E === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {});
try { const page = await (await br.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(f => { if (sessionStorage.getItem('s')) return; localStorage.clear(); localStorage.setItem('eggfarm.save', f); localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true })); sessionStorage.setItem('s', '1'); }, fx);
  await page.goto(`http://127.0.0.1:${P}/`); await page.getByText('Tap to start').click(); await page.waitForTimeout(1200);
  res.before = await page.evaluate(() => { const l = document.querySelector('.recovery-layer'); return { dialog: !!l, outcome: l?.dataset.outcome ?? null, variant: l?.dataset.variant ?? null, title: document.querySelector('#rcT')?.textContent ?? null, body: document.querySelector('#rcB')?.textContent ?? null, button: document.querySelector('#rcGo')?.textContent ?? null, exportBtn: !!document.querySelector('#rcExport'), keys: Object.keys(localStorage).sort() }; });
  await page.screenshot({ path: `${OUT}/oq1-${E}-${DIST}-dialog.png` });
  if (res.before.dialog) { await page.locator('#rcGo').click(); await page.waitForTimeout(500); }
  res.after = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('eggfarm.save') ?? 'null'); const ck = Object.keys(localStorage).filter(k => k.startsWith('eggfarm.save.corrupt')); return { coinsCents: s?.state?.coinsCents, farmLevel: s?.state?.farmLevel, hensLevel: s?.state?.hensLevel, corruptKeys: ck, corruptHasAbc: ck.some(k => (localStorage.getItem(k) ?? '').includes('"farmLevel":"abc"')), onb: !!document.querySelector('.onb') }; });
  await page.screenshot({ path: `${OUT}/oq1-${E}-${DIST}-after.png` }); res.pageErrors = errs;
} finally { await br.close(); try { process.kill(-srv.pid); } catch {} }
console.log('OQ1 ' + JSON.stringify(res)); writeFileSync(`${OUT}/oq1-${E}-${DIST}.json`, JSON.stringify(res, null, 1));
