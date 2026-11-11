// Runtime build-id probe: node buildid-probe.mjs <clone> <engine> <port>
import { spawn } from 'node:child_process';
const [clone, engine, port] = process.argv.slice(2);
const pw = await import(clone + '/node_modules/playwright-core/index.mjs');
const srv = spawn('npx', ['vite','preview','--outDir','dist','--port',port,'--strictPort','--host','127.0.0.1'], { cwd: clone, stdio: 'ignore', detached: true });
try {
  for (let i=0;i<60;i++){ try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r=>setTimeout(r,250)); } }
  const b = await (engine==='chromium' ? pw.chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : pw[engine].launch()); const p = await (await b.newContext()).newPage();
  await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(1500); try { await p.getByText('Tap to start').click({timeout:5000}); } catch {} await p.waitForTimeout(2500); await p.evaluate(() => { try { window.eggfarm?.save?.(); } catch {} }); await p.waitForTimeout(500);
  const ids = await p.evaluate(() => { const re=/m3-rc1-pre\+[0-9a-f]+(\+dirty)?/g; const s=new Set(); for (const t of [document.documentElement.outerHTML, document.body.innerText, ...Object.keys(localStorage).map(k=>localStorage.getItem(k))]) for (const m of (t||'').matchAll(re)) s.add(m[0]); return [...s]; });
  console.log(`runtime build ids [${engine}]: ${JSON.stringify(ids)}`); await b.close();
} finally { process.kill(-srv.pid); }
