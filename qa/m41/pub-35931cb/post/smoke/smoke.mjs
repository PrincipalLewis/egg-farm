// Post-publish smoke of the released egg-farm.html (m4.1-5d9efa6). Serves nothing itself; expects :5961 serving ../ (post/).
import { createRequire } from 'node:module'; import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire('/workspace/egg-farm-studio/qa/wt-rc1-5d9efa6/package.json'); const pw = require('playwright-core');
const DIR = '/workspace/egg-farm-studio/qa/m41/pub-35931cb/post/smoke'; const URL0 = 'http://127.0.0.1:5961/egg-farm.html';
const res = { checks: [] }; let bad = 0; const ok = (k, v, d) => { if (!v) bad++; res.checks.push({ k, pass: !!v, d }); console.log(v ? 'PASS' : 'FAIL', k, JSON.stringify(d ?? '')); };
const br = await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); res.browser = br.version();
const watch = (p, sink) => { p.on('pageerror', e => sink.push({ t: 'pageerror', m: String(e) })); p.on('console', m => m.type() === 'error' && sink.push({ t: 'console.error', m: m.text(), loc: m.location()?.url }));
  p.on('response', r => r.status() >= 400 && sink.push({ t: 'http' + r.status(), m: r.url() })); };
const ids = p => p.evaluate(() => ({ meta: document.querySelector('meta[name="build-id"]')?.content, app: document.getElementById('app')?.dataset.buildId, dirty: /\+dirty/.test(document.documentElement.outerHTML) }));
const ls = p => p.evaluate(() => { const raw = localStorage.getItem('eggfarm.save'); let j = null; try { j = JSON.parse(raw); } catch {} const s = j?.state ?? {};
  return { present: !!raw, version: j?.version, coinsCents: s.coinsCents, basket: s.basket, coop: s.coop, farmLevel: s.farmLevel, collectionLevel: s.collectionLevel, keys: Object.keys(localStorage).sort() }; });
const ui = p => p.evaluate(() => ({ coins: document.getElementById('coins')?.textContent, basket: document.getElementById('basket')?.textContent, recovery: !!document.querySelector('.recovery-card, .recovery-layer') }));
// A: fresh boot, play, save, reload
{ const errs = []; const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const p = await ctx.newPage(); watch(p, errs);
  await p.goto(URL0); const id = await ids(p); ok('A1 runtime build-id m4.1+5d9efa6, no +dirty', id.meta === 'm4.1+5d9efa6' && id.app === 'm4.1+5d9efa6' && !id.dirty, id);
  await p.getByText('Tap to start').click(); await p.waitForTimeout(1500); await p.screenshot({ path: `${DIR}/A1-fresh-boot.png` });
  const u0 = await ui(p); ok('A2 fresh boot: no recovery dialog', !u0.recovery, u0);
  if (await p.locator('.onb-skip').count()) await p.locator('.onb-skip').click();
  for (let i = 0; i < 24; i++) { await p.locator('#collect').click({ force: true }); await p.waitForTimeout(500); }
  const u1 = await ui(p); await p.screenshot({ path: `${DIR}/A2-after-collect.png` });
  await p.locator('[data-nav=market]').click(); await p.waitForTimeout(500); await p.screenshot({ path: `${DIR}/A3-market.png` });
  const sa = p.locator('#sellAll'); const saTxt = await sa.textContent(); await sa.click(); await p.waitForTimeout(800);
  await p.screenshot({ path: `${DIR}/A4-after-sell.png` }); const close = p.locator('.sheet:not([hidden]) .close'); if (await close.count()) await close.first().click();
  const u2 = await ui(p); ok('A3 play: collected eggs and sold, coins changed', u1.coins !== u2.coins && u2.coins !== u0.coins, { u0, afterCollect: u1, sellAll: saTxt, afterSell: u2 });
  await p.waitForTimeout(6000); const s1 = await ls(p); const u3 = await ui(p); ok('A4 autosave wrote eggfarm.save with coins > 0', s1.present && s1.coinsCents > 0, s1);
  await p.reload(); await p.getByText('Tap to start').click(); await p.waitForTimeout(1200); const s2 = await ls(p); const u4 = await ui(p); const id2 = await ids(p);
  await p.screenshot({ path: `${DIR}/A5-after-reload.png` });
  ok('A5 reload: state persisted (coins/levels from save, no recovery)', !u4.recovery && s2.coinsCents >= s1.coinsCents && s2.farmLevel === s1.farmLevel && s2.collectionLevel === s1.collectionLevel && u4.coins === u3.coins, { beforeReload: { ui: u3, save: s1 }, afterReload: { ui: u4, save: s2 }, id2 });
  ok('A6 no page/console errors (fresh path)', errs.filter(e => !/favicon/.test(e.m)).length === 0, errs); res.errorsA = errs; await ctx.close(); }
// B: v5 (m2-rc1, pre-M4) save migrates without the recovery dialog
{ const errs = []; const raw = readFileSync(`${DIR}/fixture-m2-rc1-v5-12min.json`, 'utf8'); const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const p = await ctx.newPage(); watch(p, errs);
  await p.addInitScript(r => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('eggfarm.save', r); sessionStorage.setItem('seeded', '1'); } }, raw);
  await p.goto(URL0); await p.getByText('Tap to start').click(); await p.waitForTimeout(2000); await p.screenshot({ path: `${DIR}/B1-v5-boot.png` });
  const u = await ui(p); await p.waitForTimeout(6000); const s = await ls(p); const id = await ids(p);
  ok('B1 v5 fixture boots without recovery dialog', !u.recovery, u);
  ok('B2 migrated: save rewritten at current version, F10/C11 kept, coins >= 15061', s.present && s.version > 5 && s.farmLevel === 10 && s.collectionLevel === 11 && s.coinsCents >= 15061, s);
  ok('B3 runtime build-id', id.meta === 'm4.1+5d9efa6' && !id.dirty, id);
  ok('B4 no page/console errors (v5 path)', errs.filter(e => !/favicon/.test(e.m)).length === 0, errs); res.errorsB = errs; await p.screenshot({ path: `${DIR}/B2-v5-after-autosave.png` }); await ctx.close(); }
await br.close(); res.bad = bad; writeFileSync(`${DIR}/smoke-result.json`, JSON.stringify(res, null, 2)); console.log(bad ? `SMOKE: ${bad} FAIL` : 'SMOKE: OK'); process.exit(bad ? 1 : 0);
