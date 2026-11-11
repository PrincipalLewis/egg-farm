import pw from '/workspace/qa-cuta-1371305/node_modules/playwright-core/index.mjs'; import { spawn } from 'node:child_process';
const [dir, port] = process.argv.slice(2);
const srv = spawn('npx', ['vite','preview','--outDir',dir,'--port',port,'--strictPort','--host','127.0.0.1'], { stdio:'ignore', detached:true, cwd: process.cwd() });
await new Promise(r => setTimeout(r, 3000));
const b = await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const p = await b.newPage();
for (const q of ['', '?perf=1']) { await p.goto(`http://127.0.0.1:${port}/${q}`); await p.getByText('Tap to start').click().catch(()=>{}); await p.waitForTimeout(6000); console.log(q || '(none)', JSON.stringify(await p.evaluate(() => Object.keys(window).filter(k => /eggfarm/i.test(k))))); }
await b.close(); process.kill(-srv.pid);
