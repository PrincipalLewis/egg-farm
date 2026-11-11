import pw from '/workspace/egg-farm-studio/qa/scratch/sd5-1-5d636d8/node_modules/playwright-core/index.mjs';
import { serveOwn } from '/workspace/egg-farm-studio/qa/scratch/sd5-1-5d636d8/scripts/serve-own.mjs';
const E = process.argv[2] ?? 'chromium';
for (const d of ['dist', 'dist-qa']) { const srv = await serveOwn(d, +(process.env.PORT ?? 6790) + (d === 'dist' ? 0 : 1), '/workspace/egg-farm-studio/qa/scratch/sd5-1-5d636d8');
  const br = E === 'chromium' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[E].launch();
  const p = await br.newPage(); await p.goto(srv.url); await p.getByText('Tap to start').click(); await p.waitForTimeout(2500);
  const b = await p.evaluate(() => { const t = localStorage.getItem('eggfarm.telemetry') ?? ''; return (t.match(/"build":"([^"]+)"/) || [])[1] ?? null; });
  console.log(`${b && b.includes('5d636d8') ? 'PASS' : 'FAIL'} [${E} ${d}] runtime build id ${b} at ${srv.url}`); await br.close(); srv.stop(); }
process.exit(0);
