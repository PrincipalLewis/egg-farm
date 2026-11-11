// SD4-2 deterministic: localStorage refuses every write (QuotaExceededError) on reload; a fresh lease from a previous session/other id is present.
import pw from '/workspace/qa-sd3/game/node_modules/playwright-core/index.mjs';
import { serveOwn } from '/workspace/qa-sd3/game/scripts/serve-own.mjs'; import fs from 'node:fs';
const E = process.argv[2] ?? 'chromium', G = '/workspace/qa-sd3/game', REPS = +(process.env.REPS ?? 5);
const NO = "Your browser isn't letting us save right now (low space or private mode), so progress won't be saved.";
const srv = await serveOwn(process.env.DIST ?? 'dist', +(process.env.PORT ?? 6720), G); const U = srv.url;
const br = E === 'chromium' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[E].launch();
const fx = fs.readFileSync(G + '/tests/fixtures/saves/m2-rc1-v5-12min.json', 'utf8').replace(/"savedAt":\d+/, `"savedAt":${Date.now() - 60e3}`);
let bad = 0, n = 0;
for (let i = 0; i < REPS; i++) for (const lease of ['own-previous-session', 'other-id-fresh', 'none']) {
  const ctx = await br.newContext({ viewport: i % 2 ? { width: 390, height: 844 } : { width: 1280, height: 800 } }); const p = await ctx.newPage();
  await p.goto(U); await p.evaluate(s => { localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true })); localStorage.setItem('eggfarm.save', s); }, fx);
  await p.reload(); await p.getByText('Tap to start').click(); await p.waitForTimeout(2000 + i * 700);
  if (lease === 'other-id-fresh') await p.evaluate(() => localStorage.setItem('eggfarm.lease', JSON.stringify({ id: 'zzOther', at: Date.now() })));
  if (lease === 'none') await p.evaluate(() => localStorage.removeItem('eggfarm.lease'));
  await p.addInitScript(() => { const ss = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (this === window.localStorage) throw new DOMException('full', 'QuotaExceededError'); return ss.call(this, k, v); }; });
  await p.reload(); await p.getByText('Tap to start').click().catch(() => {}); await p.waitForTimeout(3500);
  const s = await p.evaluate(() => ({ tab: /another tab/i.test(document.body.innerText), warn: document.querySelector('.save-warn')?.textContent ?? null, farm: window.eggfarm?.state?.farmLevel ?? null, collect: !!document.querySelector('#collect') }));
  const good = !s.tab && s.warn === NO; n++; if (!good) bad++;
  console.log(`${good ? 'PASS' : 'FAIL'} [${E}] rep ${i} lease=${lease}: storage refuses writes -> no-storage notice, never 'another tab' — ${JSON.stringify(s)}`); await ctx.close(); }
console.log(`SUMMARY [${E}] bad ${bad}/${n}`); await br.close(); srv.stop(); process.exit(0);
