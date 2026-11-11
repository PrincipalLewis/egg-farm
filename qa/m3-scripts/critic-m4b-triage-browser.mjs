// Item A browser repro: dd52bfd F6+Market Hand storage -> shipped m4b egg-farm.html (sha 0bc5bb72…) on 127.0.0.1:PORT, Chromium, idle 120 s.
import { chromium } from '/workspace/egg-farm-studio/qa/scratch/triage-m4b/dd223f5/node_modules/playwright-core/index.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const PORT = +process.env.PORT, OUT = process.env.OUT, MODE = process.argv[2] ?? 'migrated'; mkdirSync(OUT, { recursive: true });
const fx = JSON.parse(readFileSync('/workspace/egg-farm-studio/qa/m3-recheck/critic-m4b-triage-saves/node-A/A1-dd52bfd-F6-marketHand.json', 'utf8'));
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
if (MODE === 'migrated') await ctx.addInitScript(ls => { if (sessionStorage.getItem('qs')) return; sessionStorage.setItem('qs', '1');
  for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, k === 'eggfarm.save' ? v.replace(/"savedAt":\d+/, `"savedAt":${Date.now() - 2000}`) : v); }, fx.ls); // savedAt -> now-2 s: no offline grant (checksum covers state only)
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://127.0.0.1:${PORT}/egg-farm.html`); await p.waitForTimeout(1500);
const t = p.getByText('Tap to start'); if (await t.count()) await t.first().click().catch(() => {});
await p.waitForTimeout(3000);
const bid = await p.evaluate(() => ({ meta: document.querySelector('meta[name=build-id]')?.content, app: document.querySelector('#app')?.dataset.buildId }));
const st0 = await p.evaluate(() => JSON.parse(localStorage.getItem('eggfarm.save')).state);
await p.screenshot({ path: `${OUT}/${MODE}-t0.png` });
const rows = [];
for (let i = 0; i <= 120; i++) { rows.push({ sec: i, coins: await p.evaluate(() => document.querySelector('#coins')?.textContent), basket: await p.evaluate(() => document.querySelector('#basket')?.textContent) }); await p.waitForTimeout(1000); }
await p.screenshot({ path: `${OUT}/${MODE}-t120.png` });
const st1 = await p.evaluate(() => JSON.parse(localStorage.getItem('eggfarm.save')).state);
const tel = await p.evaluate(() => window.eggfarmExportTelemetry?.());
const globals = await p.evaluate(() => Object.keys(window).filter(k => /eggfarm/i.test(k)));
writeFileSync(`${OUT}/${MODE}-telemetry.json`, typeof tel === 'string' ? tel : JSON.stringify(tel));
const num = s => +String(s).replace(/[$,]/g, '');
const res = { MODE, bid, globals, errs, saved0: { coinsCents: st0.coinsCents, farmLevel: st0.farmLevel, tracksV7: st0.tracksV7, v6BackupId: st0.v6BackupId, workers: st0.workers },
  saved1: { coinsCents: st1.coinsCents, workers: st1.workers }, coinsFirst: rows[0].coins, coinsLast: rows.at(-1).coins, deltaDollars: +(num(rows.at(-1).coins) - num(rows[0].coins)).toFixed(2),
  perSec: +((num(rows.at(-1).coins) - num(rows[0].coins)) / 120).toFixed(4), rows };
writeFileSync(`${OUT}/${MODE}-idle.json`, JSON.stringify(res, null, 1));
console.log(JSON.stringify({ ...res, rows: rows.filter(r => r.sec % 20 === 0) }, null, 1));
await browser.close();
