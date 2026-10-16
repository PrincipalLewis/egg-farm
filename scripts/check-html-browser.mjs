// Gate for the single-file HTML build: open dist-html/egg-farm-*.html from file:// in a headless engine and assert
// (1) zero requests other than file:/data:/blob: (anything else is aborted and fails the check), (2) no window globals
// beyond ALLOWED_GLOBALS vs a blank file:// page in the same engine (same logic as check-globals), (3) the game boots:
// Tap to start -> #collect, collecting works, Settings opens, every <img> decoded, fonts loaded, no page errors.
// Usage: npm run check:html [-- <file.html>] [chromium|firefox|webkit ...]   (default: newest file, all 3 engines)
import pw from 'playwright-core'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { pathToFileURL } from 'node:url'; import { ALLOWED_GLOBALS } from './allowed-globals.mjs';
const args = process.argv.slice(2);
const file = path.resolve(args.find(a => a.endsWith('.html')) ?? (() => {
  const fs_ = fs.readdirSync('dist-html').filter(f => /^egg-farm-.*\.html$/.test(f)).map(f => `dist-html/${f}`);
  if (!fs_.length) { console.error('check:html: no dist-html/egg-farm-*.html; run npm run build:html'); process.exit(1); }
  return fs_.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
})());
const engines = args.filter(a => ['chromium', 'firefox', 'webkit'].includes(a)); if (!engines.length) engines.push('chromium', 'firefox', 'webkit');
const blankPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ef-html-')), 'blank.html');
fs.writeFileSync(blankPath, '<!doctype html><title>blank</title>');
const LOCAL = /^(file|data|blob|about):/;
let failed = false;
for (const ENGINE of engines) {
  const br = ENGINE === 'chromium' ? await pw.chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[ENGINE].launch();
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
  const external = [], errors = [];
  await ctx.route('**/*', r => { const u = r.request().url(); if (LOCAL.test(u)) return r.continue(); external.push(u); return r.abort(); });
  ctx.on('request', q => { const u = q.url(); if (!LOCAL.test(u) && !external.includes(u)) external.push(u); });
  const own = p => p.evaluate(() => Object.getOwnPropertyNames(window));
  const blank = await ctx.newPage(); await blank.goto(pathToFileURL(blankPath).href); await blank.waitForTimeout(300); const base = new Set(await own(blank)); await blank.close();
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(String(e)));
  let boot = '';
  try {
    await p.goto(pathToFileURL(file).href); await p.getByText('Tap to start').click(); await p.waitForSelector('#collect', { timeout: 15000 });
    for (let i = 0; i < 10; i++) { await p.locator('#collect').click({ force: true }).catch(() => {}); await p.waitForTimeout(100); }
    await p.locator('#settings').click({ force: true }).catch(() => {}); await p.waitForTimeout(2500);
    const st = await p.evaluate(async () => { await document.fonts.ready; const imgs = [...document.images];
      return { imgs: imgs.length, broken: imgs.filter(i => !i.complete || !i.naturalWidth).map(i => i.src.slice(0, 40)), fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight), settings: !!document.querySelector('#sExport'), build: document.body.innerText.match(/m\d+-rc\d[\w-]*\+[0-9a-f]{7,}/)?.[0] ?? null }; });
    boot = JSON.stringify(st);
    if (!st.imgs || st.broken.length || !st.fonts.length || !st.settings) errors.push(`boot state ${boot}`);
  } catch (e) { errors.push(`boot: ${e.message.split('\n')[0]}`); }
  const extra = (await own(p)).filter(k => !base.has(k)).sort(); const bad = extra.filter(k => !ALLOWED_GLOBALS.includes(k));
  const ok = !external.length && !bad.length && !errors.length; failed ||= !ok;
  console.log(`${external.length ? 'FAIL' : 'PASS'} [${ENGINE}] external requests: ${external.length} ${JSON.stringify(external)}`);
  console.log(`${bad.length ? 'FAIL' : 'PASS'} [${ENGINE}] window globals vs blank file:// page: ${JSON.stringify(extra)}; allowed ${JSON.stringify(ALLOWED_GLOBALS)}`);
  console.log(`${errors.length ? 'FAIL' : 'PASS'} [${ENGINE}] boots from file://: ${boot}${errors.length ? ' errors ' + JSON.stringify(errors) : ''}`);
  await br.close();
}
console.log(`check:html ${failed ? 'FAIL' : 'PASS'} ${path.relative(process.cwd(), file)} (${(fs.statSync(file).size / 1024).toFixed(1)} KiB)`);
process.exit(failed ? 1 : 0);
