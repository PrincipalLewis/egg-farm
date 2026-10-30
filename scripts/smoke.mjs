// Headless smoke test of the built game: start, collect, sell, buy, queue-full cue, no page errors.
import { chromium } from 'playwright-core';
import { spawnRecorded, stopOrReport } from './recorded-pid.mjs';
const port = 4174; const { child: srv, rec: srvRec } = spawnRecorded('npx', ['vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1500));
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true })).newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
const fail = (m) => { console.error('SMOKE FAIL:', m); process.exitCode = 1; };
await page.goto(`http://127.0.0.1:${port}/?marketSeed=3`);
await page.getByText('Tap to start').click();
await page.waitForFunction(() => window.eggfarm);
if (!(await page.locator('.onb').isVisible())) fail('onboarding overlay not shown on new game');
if (!(await page.locator('.onb-cap').textContent()).includes('Collect')) fail('onboarding step 1 caption');
{ // empty-nest: an empty coop shows no eggs (overlay hidden); >= 1 whole egg shows them
  await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coop: 0.4 }; }); await page.waitForTimeout(50);
  if (await page.locator('#nestEggs').isVisible()) fail('empty coop shows eggs in nest');
  await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coop: 3 }; }); await page.waitForTimeout(50);
  if (!(await page.locator('#nestEggs').isVisible())) fail('coop with eggs shows empty nest'); }
{ const lbl = await page.locator('#collect').textContent(); const dis = await page.locator('#collect').getAttribute('aria-disabled');
  if (/\+0\b/.test(lbl) || (await page.evaluate(() => window.eggfarm.state.coop)) < 1 && dis !== 'true') fail(`collect at empty coop: "${lbl}" disabled=${dis}`); }
await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coop: 40 }; });
for (let i = 0; i < 4; i++) await page.locator('#collect').click();
await page.waitForTimeout(100);
if (!(await page.locator('.onb-cap').textContent()).includes('customer')) fail('onboarding did not advance to step 2');
const fx = await page.evaluate(() => ({ basket: window.eggfarm.state.basket, flyers: document.querySelectorAll('#fx-layer .flyer').length, floaters: document.querySelectorAll('#fx-layer .floater').length }));
if (fx.basket < 20) fail(`collect: basket ${fx.basket}`); if (fx.flyers > 5) fail(`flyers ${fx.flyers} > 5`); if (fx.floaters > 2) fail(`floaters not combined: ${fx.floaters}`);
await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, customers: [{ id: 99, demand: 5, filled: 0, waitedS: 0 }] }; });
await page.locator('[data-nav=market]').click(); await page.locator('button[data-id="99"]').click();
const coins = await page.evaluate(() => window.eggfarm.state.coinsCents); if (coins <= 0) fail('sell gave no coins');
await page.locator('.sheet:not([hidden]) .close').click();
await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coinsCents: 1_000_00 }; });
await page.locator('[data-nav=upgrades]').click(); await page.locator('#uRow .btn.buy').click();
if (await page.evaluate(() => window.eggfarm.state.collectionLevel) !== 1) fail('buy collection');
await page.locator('.sheet:not([hidden]) .close').click();
await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, customers: [1, 2, 3].map(i => ({ id: 200 + i, demand: 5, filled: 0, waitedS: 0 })), nextCustomerInS: 0.05 }; });
await page.waitForTimeout(400);
const q = await page.evaluate(() => ({ tag: !!document.querySelector('.qtag'), bubble: !!document.querySelector('.bubble.qfull') }));
if (!q.tag) fail('no Queue full tag'); if (q.bubble) fail('turned-away customer carries its own Queue full tag (Art&UX 01:17 #3)');
if (await page.locator('.onb').count()) fail('onboarding not closed after collect/sell/upgrade');
const tele = await page.evaluate(() => window.eggfarm.telemetry.events().filter(e => e.type === 'onboarding_step').map(e => e.name));
if (!tele.join().startsWith('collect,sell,upgrade,complete')) fail('onboarding telemetry: ' + tele);
{ // skip path in a fresh profile
  const p2 = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await p2.goto(`http://127.0.0.1:${port}/`); await p2.getByText('Tap to start').click(); await p2.locator('.onb-skip').click(); await p2.waitForTimeout(100);
  if (await p2.locator('.onb').count()) fail('skip did not close onboarding');
  const t2 = await p2.evaluate(() => window.eggfarm.telemetry.events().map(e => e.type)); if (!t2.includes('onboarding_skip')) fail('no onboarding_skip');
  await p2.reload(); await p2.getByText('Tap to start').click(); await p2.waitForTimeout(150); if (await p2.locator('.onb').count()) fail('onboarding shown again after skip');
  await p2.context().close();
}
await page.goto(`http://127.0.0.1:${port}/?debug=1`); await page.getByText('Tap to start').click();
await page.waitForSelector('.dbg');
const before = await page.evaluate(() => window.eggfarm.state.coinsCents); await page.locator('.dbg [data-a=coins100]').click();
{ const lvl = await page.evaluate(() => window.eggfarm.state.collectionLevel);
  await page.locator('.dbg [data-a=onb]').click(); await page.waitForLoadState(); await page.getByText('Tap to start').click(); await page.waitForTimeout(200);
  if (!(await page.locator('.onb').count())) fail('replay onboarding did not show overlay');
  if ((await page.evaluate(() => window.eggfarm.state.collectionLevel)) !== lvl || lvl < 1) fail('replay onboarding lost the save');
  await page.locator('.onb-skip').click(); }
if ((await page.evaluate(() => window.eggfarm.state.coinsCents)) < before + 10000) fail('debug +$100');
await page.goto(`http://127.0.0.1:${port}/`); await page.getByText('Tap to start').click(); await page.waitForTimeout(200);
if (await page.locator('.dbg').count()) fail('debug panel visible without ?debug=1');
{ // M3: next-goal strip visible after FTUE, tap never buys; Settings Export log downloads JSON
  if (!(await page.locator('#goal').isVisible())) fail('next-goal strip not visible');
  const c0 = await page.evaluate(() => JSON.stringify([window.eggfarm.state.coinsCents, window.eggfarm.state.farmLevel, window.eggfarm.state.collectionLevel]));
  await page.locator('#goal').click(); await page.waitForTimeout(150);
  if (c0 !== await page.evaluate(() => JSON.stringify([window.eggfarm.state.coinsCents, window.eggfarm.state.farmLevel, window.eggfarm.state.collectionLevel]))) fail('goal tap bought something');
  if (!(await page.locator('#p-upgrades:not([hidden])').count())) fail('goal tap did not open Upgrades');
  await page.locator('.sheet:not([hidden]) .close').click();
  await page.locator('#settings').click();
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), page.locator('#sExport').click()]);
  const j = JSON.parse(await (await import('node:fs/promises')).readFile(await dl.path(), 'utf8'));
  const ss = j.events.find(e => e.type === 'session_start'); if (!ss?.install_id || !/^m3-pt1\+[0-9a-f]{7,}$/.test(ss.build || '')) fail('export: session_start lacks install_id/build');
  const id = await page.evaluate(() => localStorage.getItem('eggfarm.install_id'));
  await page.locator('#sReset').click(); await page.locator('#cReset').click(); await page.waitForLoadState(); await page.getByText('Tap to start').click(); await page.waitForTimeout(150);
  if (id !== await page.evaluate(() => localStorage.getItem('eggfarm.install_id'))) fail('install_id changed after Reset save');
}
if (errors.length) fail('page errors: ' + errors.join(' | '));
await browser.close(); stopOrReport(srv, srvRec, 'smoke');
console.log(process.exitCode ? 'smoke: FAILED' : 'smoke: OK');
