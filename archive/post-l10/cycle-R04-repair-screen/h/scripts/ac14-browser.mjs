// AC14b/c/d in real browsers: recovery dialog R/F/Q (dialog ACs 1-3, 5), quota warning, two tabs. Usage: node scripts/ac14-browser.mjs [chromium|webkit|firefox]
import { chromium, webkit, firefox } from 'playwright-core';
import { spawn } from 'node:child_process'; import { readFileSync } from 'node:fs';
const eng = process.argv[2] || 'chromium'; const port = 5400 + Math.floor(Math.random() * 300);
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
const br = eng === 'webkit' ? await webkit.launch() : eng === 'firefox' ? await firefox.launch() : await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0; const ok = (k, v, d) => { if (!v) bad++; console.log(`[${eng}]`, k, v ? 'PASS' : 'FAIL', JSON.stringify(d ?? '')); };
const URL_ = `http://127.0.0.1:${port}/`; const fx = f => readFileSync(new URL(`../tests/fixtures/saves/${f}`, import.meta.url), 'utf8');
const good = fx('m2-rc1-v5-12min.json'), corrupt = fx('corrupt-truncated.json');
const start = async p => { await p.goto(URL_); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm, null, { timeout: 10000 }); };
// ---- recovery dialog
for (const [cse, ls, quotaCopy, title] of [['R', { 'eggfarm.save': corrupt, 'eggfarm.save.bak': good }, false, 'Welcome back!'], ['F', { 'eggfarm.save': corrupt }, false, 'A fresh start'], ['Q', { 'eggfarm.save': corrupt }, true, 'A fresh start']]) {
  const ctx = await br.newContext({ viewport: { width: 360, height: 640 }, acceptDownloads: true }); const p = await ctx.newPage();
  await p.addInitScript(([ls, q]) => { if (!sessionStorage.getItem('seeded')) { for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); }
    if (q) { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (String(k).startsWith('eggfarm.save.corrupt')) { const e = new DOMException('full', 'QuotaExceededError'); window.__quota = (window.__quota || 0) + 1; throw e; } return set.call(this, k, v); }; } }, [ls, quotaCopy]);
  await p.goto(URL_); await p.getByText('Tap to start').click(); await p.waitForSelector('.recovery-card', { timeout: 10000 });
  const d = await p.evaluate(() => { const c = document.querySelector('.recovery-card'); return { title: c.querySelector('h2').textContent, role: c.getAttribute('role'), modal: c.getAttribute('aria-modal'), focus: document.activeElement?.id, hasExport: !!c.querySelector('#rcExport'), text: c.innerText }; });
  ok(`dialog ${cse} copy/role/focus`, d.title === title && d.role === 'alertdialog' && d.modal === 'true' && d.focus === 'rcGo' && d.hasExport && !/checksum|JSON|corrupt|localStorage/i.test(d.text), d);
  await p.keyboard.press('Escape'); await p.mouse.click(5, 5); await p.waitForTimeout(200);
  ok(`dialog ${cse} Esc / scrim don't close`, await p.locator('.recovery-card').count() === 1);
  const f0 = await p.evaluate(() => document.activeElement?.id || document.activeElement?.tagName); await p.keyboard.press('Tab'); const f1 = await p.evaluate(() => document.activeElement?.id); await p.keyboard.press('Tab'); const f2 = await p.evaluate(() => document.activeElement?.id);
  ok(`dialog ${cse} focus trapped`, f1 === 'rcExport' && f2 === 'rcGo', { f0, f1, f2 });
  let file = null; if (eng !== 'webkit') { const dl = p.waitForEvent('download', { timeout: 5000 }).catch(() => null); await p.locator('#rcExport').click(); const x = await dl; file = x && x.suggestedFilename(); }
  else { await p.locator('#rcExport').click(); file = 'webkit-fallback'; }
  await p.waitForTimeout(400); const msg = await p.locator('#rcMsg').textContent();
  ok(`dialog ${cse} export`, !!file && /^eggfarm-old-save-\d{8}-\d{4}\.json$|webkit-fallback/.test(file) && msg.length > 0 && await p.locator('.recovery-card').count() === 1, { file, msg });
  await p.locator('#rcGo').click(); await p.waitForTimeout(300);
  const after = await p.evaluate(() => ({ open: !!document.querySelector('.recovery-card'), focus: (document.querySelector('#modal-layer.open')?.contains(document.activeElement) ? 'welcome-modal' : '') || document.activeElement?.id || (document.querySelector('#modal-layer.open')?.contains(document.activeElement) ? 'welcome-modal' : ''), quota: window.__quota || 0, coins: window.eggfarm.state.coinsCents, F: window.eggfarm.state.farmLevel, C: window.eggfarm.state.collectionLevel }));
  ok(`dialog ${cse} closes on button, focus -> Collect${cse === 'Q' ? ', single quota attempt' : ''}`, !after.open && (after.focus === 'collect' || after.focus === 'welcome-modal') && (cse !== 'Q' || after.quota === 1) && (cse !== 'R' || (after.F === JSON.parse(good).state.farmLevel && after.C === JSON.parse(good).state.collectionLevel && after.coins > 0)), after);
  await ctx.close();
}
// ---- AC14c quota / private-mode: every save write throws
{ const ctx = await br.newContext({ viewport: { width: 360, height: 640 } }); const p = await ctx.newPage();
  await p.addInitScript(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (String(k).startsWith('eggfarm.save') || k === 'eggfarm.telemetry') { throw new DOMException('full', 'QuotaExceededError'); } return set.call(this, k, v); }; });
  await start(p); await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coop: 50 }; g.save(); g.save(); }); await p.locator('#collect').click(); await p.waitForTimeout(300);
  const r = await p.evaluate(() => ({ notices: document.querySelectorAll('.save-warn').length, text: document.querySelector('.save-warn')?.textContent, basket: window.eggfarm.state.basket, failed: window.eggfarm.telemetry.events().filter(e => e.type === 'save_failed').length }));
  ok('AC14c quota: one "won\'t be saved" notice, game keeps running', r.notices === 1 && /won't be saved/.test(r.text) && r.basket > 0 && r.failed === 1, r); await ctx.close(); }
// ---- AC14d two tabs (rc1: single-tab guard, product/single-tab-guard.md - newest tab owns the save, the older tab stops)
{ const ctx = await br.newContext({ viewport: { width: 360, height: 640 } }); const a = await ctx.newPage(); await start(a);
  await a.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coinsCents: 4242 }; g.save(); });
  const b = await ctx.newPage(); await start(b); await b.waitForTimeout(300);
  const r = await b.evaluate(() => ({ inactive: window.eggfarm.inactive, coins: window.eggfarm.state.coinsCents }));
  await a.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coinsCents: 1 }; g.save(); }); await a.waitForTimeout(100);
  const saved = await b.evaluate(() => JSON.parse(localStorage.getItem('eggfarm.save')).state.coinsCents);
  const aState = await a.evaluate(() => ({ inactive: window.eggfarm.inactive, notice: document.querySelector('.tab-guard h2')?.textContent }));
  ok('AC14d/tab guard: new tab loads the save and owns it; older tab shows the notice and never writes', r.inactive === false && r.coins === 4242 && saved === 4242 && aState.inactive === true && /another tab/.test(aState.notice ?? ''), { ...r, saved, aState }); await ctx.close(); }
await br.close(); process.kill(-srv.pid); process.exit(bad ? 1 : 0);
