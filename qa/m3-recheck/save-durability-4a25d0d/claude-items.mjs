// Independent repro of Claude QA Tester save-durability-2959ba0 findings. node claude-items.mjs <engine>  (dist-qa)
import pw from '/workspace/qa-sd3/game/node_modules/playwright-core/index.mjs';
import { serveOwn } from '/workspace/qa-sd3/game/scripts/serve-own.mjs'; import fs from 'node:fs';
const E = process.argv[2] ?? 'chromium', G = '/workspace/qa-sd3/game';
const srv = await serveOwn('dist-qa', +(process.env.PORT ?? 5760), G); const U = srv.url;
const br = E === 'chromium' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[E].launch();
const fxRaw = fs.readFileSync(G + '/tests/fixtures/saves/m2-rc1-v5-12min.json', 'utf8');
const log = (k, v) => console.log(`${k} ${JSON.stringify(v)}`);
async function ctxSeed(ls) { const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/__blank', r => r.fulfill({ contentType: 'text/html', body: 'b' }));
  const s = await ctx.newPage(); await s.goto(U + '__blank'); await s.evaluate(o => { localStorage.clear(); for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, { 'eggfarm.ui': JSON.stringify({ onboardingDone: true }), ...ls }); await s.close(); return ctx; }
const boot = async p => { await p.goto(U); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm, null, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(800); };
const st = p => p.evaluate(() => { const j = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return 'ERR'; } }; const m = j('eggfarm.save'), b = j('eggfarm.save.bak');
  return { off: window.eggfarm?.offline, coins: window.eggfarm?.state.coinsCents, farm: window.eggfarm?.state.farmLevel, main: m && { v: m.version, farm: m.state?.farmLevel, savedAt: m.savedAt }, bak: b && { v: b.version, farm: b.state?.farmLevel }, rec: document.querySelector('.recovery-layer')?.innerText?.slice(0, 80) ?? null, welcome: /welcome back/i.test(document.body.innerText) }; });
// (1) savedAt 0 / negative
for (const sv of ['0', '-1', '-1e15', String(Date.now() - 7200e3)]) { const ctx = await ctxSeed({ 'eggfarm.save': fxRaw.replace(/"savedAt":\d+/, `"savedAt":${sv}`) }); const p = await ctx.newPage(); await boot(p);
  const a = await st(p); await p.reload(); await p.getByText('Tap to start').click(); await p.waitForTimeout(1200); const b = await st(p); log(`C1 savedAt=${sv}`, { first: a, reload: b }); await ctx.close(); }
// (2a) old live tab holding the lease; a v7 save appears in main (writer that ignores the lease)
{ const ctx = await ctxSeed({ 'eggfarm.save': fxRaw.replace(/"savedAt":\d+/, `"savedAt":${Date.now()}`) }); const a = await ctx.newPage(); await boot(a);
  const v7 = JSON.stringify({ version: 7, savedAt: Date.now(), state: { coinsCents: 7 } }); await a.evaluate(v => localStorage.setItem('eggfarm.save', v), v7);
  const t = []; for (let i = 0; i < 8; i++) { await a.waitForTimeout(1000); t.push(await a.evaluate(() => JSON.parse(localStorage.getItem('eggfarm.save')).version)); }
  log('C2a v7 written to main under a live lease-holding tab, main version each second', t); await ctx.close(); }
// (2b) realistic: the newer build is a new tab that claims the lease (same lease protocol), then writes v7
{ const ctx = await ctxSeed({ 'eggfarm.save': fxRaw.replace(/"savedAt":\d+/, `"savedAt":${Date.now()}`) }); const a = await ctx.newPage(); await boot(a);
  const b = await ctx.newPage(); await boot(b); await a.waitForTimeout(1500);
  const sa = await a.evaluate(() => ({ inactive: window.eggfarm.inactive, notice: /another tab/i.test(document.body.innerText) }));
  const v7 = JSON.stringify({ version: 7, savedAt: Date.now(), state: { coinsCents: 7 } });
  await b.evaluate(v => { window.eggfarm.resetting = true; localStorage.setItem('eggfarm.save', v); }, v7); // B stops its own saving, acts as the newer build
  await a.bringToFront(); await a.waitForTimeout(6000); await a.evaluate(() => { window.dispatchEvent(new Event('pagehide')); }); await a.waitForTimeout(300);
  log('C2b newer tab claims lease then writes v7: old tab state, main version after 6 s + pagehide', { sa, main: await a.evaluate(() => JSON.parse(localStorage.getItem('eggfarm.save')).version) }); await ctx.close(); }
// (3) main missing (LS + IDB), valid .bak
{ const bak = fxRaw.replace(/"savedAt":\d+/, `"savedAt":${Date.now() - 120e3}`); const ctx = await ctxSeed({ 'eggfarm.save.bak': bak }); const p = await ctx.newPage(); await boot(p);
  const a = await st(p); await p.waitForTimeout(9000); const b = await st(p); log('C3 only valid .bak (farm 10)', { atBoot: a, after9s: b }); await ctx.close(); }
// (4) Reset leaves .bak
{ const ctx = await ctxSeed({ 'eggfarm.save': fxRaw.replace(/"savedAt":\d+/, `"savedAt":${Date.now()}`) }); const p = await ctx.newPage(); await boot(p);
  await p.evaluate(() => window.eggfarm.save()); await p.waitForTimeout(500); await p.evaluate(() => window.eggfarm.save()); const before = await st(p);
  await p.evaluate(() => { const g = window.eggfarm; g.resetting = true; }); // same as cReset handler, driven through UI below
  await p.evaluate(() => { window.eggfarm.resetting = false; });
  await p.locator('#settings').click({ force: true }); await p.locator('#sReset').click(); await p.locator('#cReset').click(); await p.waitForTimeout(2500);
  await p.getByText('Tap to start').click().catch(() => {}); await p.waitForTimeout(1500); const after = await st(p); await p.waitForTimeout(9000); const later = await st(p);
  log('C4 reset', { before, after, after9s: later }); await ctx.close(); }
await br.close(); srv.stop();
