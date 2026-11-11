// Claude NEW-2 repro: localStorage full -> single tab locked out? node quota.mjs <engine>; REPS
import pw from '/workspace/qa-sd3/game/node_modules/playwright-core/index.mjs';
import { serveOwn } from '/workspace/qa-sd3/game/scripts/serve-own.mjs'; import fs from 'node:fs';
const E = process.argv[2] ?? 'chromium', G = '/workspace/qa-sd3/game', REPS = +(process.env.REPS ?? 3);
const srv = await serveOwn(process.env.DIST ?? 'dist', +(process.env.PORT ?? 6700), G); const U = srv.url;
const br = E === 'chromium' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[E].launch();
const fx = fs.readFileSync(G + '/tests/fixtures/saves/m2-rc1-v5-12min.json', 'utf8').replace(/"savedAt":\d+/, `"savedAt":${Date.now() - 60e3}`);
const NO = "Your browser isn't letting us save right now (low space or private mode), so progress won't be saved."; let locked = 0, n = 0;
for (let i = 0; i < REPS; i++) for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) for (const stale of [false, true]) {
  const ctx = await br.newContext({ viewport: vp }); const p = await ctx.newPage();
  await p.goto(U); await p.evaluate(s => { localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true })); localStorage.setItem('eggfarm.save', s); }, fx);
  await p.reload(); await p.getByText('Tap to start').click(); await p.waitForTimeout(2500 + (i % 4) * 1500);
  if (stale) await p.evaluate(() => localStorage.setItem('eggfarm.lease', JSON.stringify({ id: 'otherTabStale', at: Date.now() })));
  const filled = await p.evaluate(() => { const big = 'x'.repeat(256 * 1024); let k = 0; for (let sz = big; sz.length >= 16;) { try { localStorage.setItem('junk' + k++, sz); } catch { sz = sz.slice(0, sz.length >> 1); } } return k; });
  await p.waitForTimeout(500 + (i % 3) * 2000); await p.reload(); await p.getByText('Tap to start').click().catch(() => {}); await p.waitForTimeout(3000);
  const s = await p.evaluate(() => ({ tab: /another tab/i.test(document.body.innerText), playHere: !!document.querySelector('button') && /play here/i.test(document.body.innerText), warn: document.querySelector('.save-warn')?.textContent ?? null, lease: localStorage.getItem('eggfarm.lease') }));
  let after = null; if (s.tab) { await p.getByText(/play here/i).first().click().catch(() => {}); await p.waitForTimeout(2000); after = await p.evaluate(() => /another tab/i.test(document.body.innerText)); }
  n++; if (s.tab) locked++;
  const good = !s.tab && s.warn === NO; console.log(`${good ? 'PASS' : 'FAIL'} [${E}] rep ${i} ${vp.width}px stale-other-lease=${stale} quota: single tab ${s.tab ? 'LOCKED OUT (another tab modal)' : 'plays'} — ${JSON.stringify({ ...s, filled, stillLockedAfterPlayHere: after })}`);
  await ctx.close();
}
console.log(`SUMMARY [${E}] lockout ${locked}/${n}`); await br.close(); srv.stop(); process.exit(0);
