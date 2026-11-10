// Save-recovery dialog v1.1 QA checks 6-8 (Q / storage-full). Usage: node scripts/recovery-v11-browser.mjs [chromium|webkit|firefox]
import { chromium, webkit, firefox } from 'playwright-core';
import { spawn } from 'node:child_process'; import { readFileSync, mkdirSync } from 'node:fs';
const eng = process.argv[2] || 'chromium'; const port = 5700 + Math.floor(Math.random() * 200); const OUT = '../engineering/screenshots/rc0-recovery-v11'; mkdirSync(OUT, { recursive: true });
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
const br = eng === 'webkit' ? await webkit.launch() : eng === 'firefox' ? await firefox.launch() : await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0; const ok = (k, v, d) => { if (!v) bad++; console.log(`[${eng}]`, k, v ? 'PASS' : 'FAIL', JSON.stringify(d ?? '')); };
const corrupt = readFileSync(new URL('../tests/fixtures/saves/corrupt-truncated.json', import.meta.url), 'utf8');
const seed = (failExport) => ([raw, fe]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('eggfarm.save', raw); sessionStorage.setItem('seeded', '1'); }
  const set = Storage.prototype.setItem; window.__quota = 0; Storage.prototype.setItem = function (k, v) { if (String(k).startsWith('eggfarm.save.corrupt')) { window.__quota++; throw new DOMException('full', 'QuotaExceededError'); } return set.call(this, k, v); };
  if (fe) { URL.createObjectURL = () => { throw new Error('blocked'); }; if (navigator.clipboard) navigator.clipboard.writeText = () => Promise.reject(new Error('no')); } };
for (const [w, h] of [[360, 640], [960, 700]]) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, acceptDownloads: true }); const p = await ctx.newPage(); await p.addInitScript(seed(false), [corrupt, false]);
  await p.goto(`http://127.0.0.1:${port}/`); await p.getByText('Tap to start').click(); await p.waitForSelector('.recovery-card'); await p.waitForTimeout(800); // entry animation done
  const r = await p.evaluate(() => { const c = document.querySelector('.recovery-card'), go = c.querySelector('#rcGo'), ex = c.querySelector('#rcExport'); const R = e => e.getBoundingClientRect();
    const ids = s => (c.getAttribute(s) || '').split(' ').map(i => document.getElementById(i)?.textContent).join(' ');
    return { tag: ex.tagName, type: ex.type, cls: ex.className, goH: Math.round(R(go).height), exH: Math.round(R(ex).height), exW: Math.round(R(ex).width), goW: Math.round(R(go).width), below: R(ex).top >= R(go).bottom, border: getComputedStyle(ex).borderTopWidth,
      role: c.getAttribute('role'), modal: c.getAttribute('aria-modal'), name: ids('aria-labelledby'), desc: ids('aria-describedby') }; });
  await p.screenshot({ path: `${OUT}/recovery-q-${w}-${eng}.png` });
  ok(`6 Q export = outlined full-width button >=44px below primary (${w})`, r.tag === 'BUTTON' && r.type === 'button' && r.goH >= 44 && r.exH >= 44 && r.below && Math.abs(r.exW - r.goW) <= 1 && r.border !== '0px', r);
  ok(`8 a11y alertdialog/modal/name/description (${w})`, r.role === 'alertdialog' && r.modal === 'true' && r.name === 'A fresh start' && r.desc === "We couldn't open your saved farm, so a new one is ready for you. Your device is low on space, so we couldn't keep a copy. Export it now if you'd like to keep it.", r);
  if (w === 360) {
    const seq = []; for (let i = 0; i < 4; i++) { await p.keyboard.press('Tab'); seq.push(await p.evaluate(() => document.activeElement?.id)); }
    ok('8 Tab cycles primary <-> Export only', seq.join() === 'rcExport,rcGo,rcExport,rcGo', seq);
    await p.locator('#rcGo').click(); await p.waitForTimeout(300);
    await p.locator('[aria-label=Settings], #settingsBtn, .settings').first().click(); await p.waitForTimeout(400);
    const has = await p.locator('#sOldSave').count(); let same = false;
    if (has && eng !== 'webkit') { const dl = p.waitForEvent('download', { timeout: 5000 }); await p.locator('#sOldSave').click(); const d = await dl; same = readFileSync(await d.path(), 'utf8') === corrupt; } else if (has) same = 'webkit-fallback';
    await p.screenshot({ path: `${OUT}/settings-export-old-save-360-${eng}.png` });
    const quota = await p.evaluate(() => window.__quota); await p.reload(); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm);
    await p.locator('[aria-label=Settings], #settingsBtn, .settings').first().click(); await p.waitForTimeout(400); const after = await p.locator('#sOldSave').count();
    ok('7 Settings "Export old save" same bytes this session, gone after reload, one quota error', has === 1 && !!same && after === 0 && quota === 1, { has, same, after, quota });
  }
  await ctx.close();
}
{ const ctx = await br.newContext({ viewport: { width: 360, height: 640 } }); const p = await ctx.newPage(); await p.addInitScript(seed(true), [corrupt, true]);
  await p.goto(`http://127.0.0.1:${port}/`); await p.getByText('Tap to start').click(); await p.waitForSelector('.recovery-card'); await p.locator('#rcExport').click(); await p.waitForTimeout(500);
  const r = await p.evaluate(() => ({ msg: document.querySelector('#rcMsg').textContent, open: !!document.querySelector('.recovery-card') }));
  ok('v1.1-2 failed export: "Couldn\'t save a copy. Try again." and dialog stays open', r.msg === "Couldn't save a copy. Try again." && r.open, r); await ctx.close(); }
await br.close(); process.kill(-srv.pid); process.exit(bad ? 1 : 0);
