// file:// and served open sanity of built release html: node m4a-31-fileopen.mjs <worktree> <engine> <port> <shotsdir>
import { spawn } from 'node:child_process'; import { existsSync } from 'node:fs';
const [w, engine, port, shots] = process.argv.slice(2); if (port === '4173') process.exit(2);
const pw = await import(w + '/node_modules/playwright-core/index.mjs');
const srv = spawn('npx', ['vite','preview','--outDir','dist','--port',port,'--strictPort','--host','127.0.0.1'], { cwd: w, stdio: 'ignore', detached: true });
let fails = 0;
try {
  for (let i=0;i<60;i++){ try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r=>setTimeout(r,250)); } }
  const b = await (engine==='chromium' ? pw.chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : pw[engine].launch());
  const single = existsSync(w + '/dist/eggfarm.html') ? w + '/dist/eggfarm.html' : w + '/dist/index.html';
  for (const [name, url] of [['served', `http://127.0.0.1:${port}/`], ['file', 'file://' + single]]) {
    const p = await (await b.newContext()).newPage(); const errs = [];
    p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await p.goto(url); await p.waitForTimeout(2500); try { await p.getByText('Tap to start').click({ timeout: 4000 }); } catch {}
    await p.waitForTimeout(2000); const txt = (await p.evaluate(() => document.body.innerText)).length;
    await p.screenshot({ path: `${shots}/fileopen-${name}-${engine}.png` });
    const ok = txt > 50 && errs.length === 0; if (!ok) fails++;
    console.log(`${ok ? 'OK' : 'FAIL'} ${name} ${engine} textLen=${txt} errors=${JSON.stringify(errs.slice(0,3))}`);
  }
  await b.close();
} finally { process.kill(-srv.pid); }
process.exit(fails ? 1 : 0);
