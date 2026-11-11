import pw from '/workspace/egg-farm-studio/game/node_modules/playwright-core/index.mjs';
const E = process.argv[2]; const br = E === 'chromium' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[E].launch();
for (const [f, s] of [['egg-farm-m3-rc1-dialog-a01faea.html', 'a01faea'], ['egg-farm-m3-rc1-save-v4-aaaa91a.html', 'aaaa91a']]) {
  const ctx = await br.newContext(); const ext = []; await ctx.route('**/*', r => { const u = r.request().url(); if (u.startsWith('file:') || u.startsWith('data:') || u.startsWith('blob:')) return r.continue(); ext.push(u); r.abort(); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto('file://' + process.cwd() + '/assets/' + f); await p.getByText('Tap to start').click({ timeout: 15000 }).catch(() => {}); await p.waitForTimeout(2500);
  const b = await p.evaluate(() => (localStorage.getItem('eggfarm.telemetry') ?? '').match(/"build":"([^"]+)"/)?.[1] ?? null).catch(e => 'ERR ' + e.message);
  console.log(`${typeof b === 'string' && b.includes(s) && !ext.length && !errs.length ? 'PASS' : 'FAIL'} [${E} file://] ${f} build=${b} ext=${JSON.stringify(ext)} errs=${JSON.stringify(errs)}`); await ctx.close(); }
await br.close();
