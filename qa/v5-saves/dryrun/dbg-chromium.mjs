import { serve, launch, watch } from '../scripts/lib.mjs';
const srv = await serve('/workspace/egg-farm-studio/qa/v5-saves/dryrun/dbg/.serve', { 'g.html': '/workspace/egg-farm-studio/qa/v5-saves/dryrun/gate-DRYRUN-22eac98/results/rc-egg-farm.html' }, '5961');
const br = await launch(process.argv[2] || 'chromium'); console.log('browser', br.version()); const errs = []; const ctx = await br.newContext(); const p = await ctx.newPage(); watch(p, errs, 'dbg');
p.on('console', m => console.log('console', m.type(), m.text().slice(0, 200)));
if (process.argv[3] === 'clock') await p.clock.install();
await p.goto(srv.url + 'g.html'); await p.waitForTimeout(3000); console.log('title', await p.title(), 'body', (await p.evaluate(() => document.body.innerText)).slice(0, 200).replace(/\n/g, ' / '));
await p.screenshot({ path: '/workspace/egg-farm-studio/qa/v5-saves/dryrun/dbg/shot.png' }); console.log('errs', errs); await br.close(); await srv.stop();
