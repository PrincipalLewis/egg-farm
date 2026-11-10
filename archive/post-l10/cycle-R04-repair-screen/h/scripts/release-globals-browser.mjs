// Release window-globals allowlist in a real engine: own properties of window on the booted release game (after some
// play, Settings open, ?debug=1&perf=1&ios=1) minus those of a blank page on the same origin in the same engine.
// Fails if anything other than ALLOWED appears. Usage: npm run build && node scripts/release-globals-browser.mjs [chromium|firefox|webkit]
import pw from 'playwright-core'; import { serveOwn } from './serve-own.mjs';
const ENGINE = process.argv[2] ?? process.env.ENGINE ?? 'chromium', port = +(process.env.PORT ?? 0); // 0 = free port (serveOwn prints it)
const ALLOWED = ['eggfarmExportTelemetry'];
const srv = await serveOwn('dist', port);
const br = ENGINE === 'chromium' ? await pw.chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[ENGINE].launch();
const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
await ctx.route('**/__blank', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>blank</title>' }));
const own = p => p.evaluate(() => Object.getOwnPropertyNames(window));
const blank = await ctx.newPage(); await blank.goto(srv.url + '__blank'); await blank.waitForTimeout(300); const base = new Set(await own(blank));
const p = await ctx.newPage(); await p.goto(srv.url + '?debug=1&perf=1&ios=1'); await p.getByText('Tap to start').click(); await p.waitForSelector('#collect');
for (let i = 0; i < 10; i++) { await p.locator('#collect').click({ force: true }).catch(() => {}); await p.waitForTimeout(100); }
await p.locator('#settings').click({ force: true }).catch(() => {}); await p.waitForTimeout(2500);
const extra = (await own(p)).filter(k => !base.has(k)).sort();
// QA B-4: with ?perf=1 the only eggfarm* global (own props and 'in window') is eggfarmExportTelemetry.
const eggG = await p.evaluate(() => { const ks = new Set(Object.getOwnPropertyNames(window)); for (const k in window) ks.add(k); return [...ks].filter(k => /^eggfarm/i.test(k)).sort(); });
const perfOk = JSON.stringify(eggG) === JSON.stringify(['eggfarmExportTelemetry']) && (await p.locator('.perf-ov').count()) === 0;
console.log(`${perfOk ? 'PASS' : 'FAIL'} [${ENGINE}] B-4 release ?perf=1: eggfarm* globals ${JSON.stringify(eggG)}, no perf overlay`);
const inWin = await p.evaluate(() => 'eggfarm' in window);
const ids = await p.evaluate(() => [...document.querySelectorAll('[id],[name]')].map(e => e.id || e.getAttribute('name')).filter(n => /egg/i.test(n)));
// Review 8669522 m4: also gate the refused (newer-save) boot path on real window keys, not just the bundle regex.
await p.close(); const r = await ctx.newPage(); await r.addInitScript(() => { localStorage.setItem('eggfarm.save', JSON.stringify({ version: 7, savedAt: Date.now(), state: {} })); });
await r.goto(srv.url); await r.getByText('Tap to start').click(); await r.waitForSelector('.newer-save'); await r.waitForTimeout(1000);
const extraR = (await own(r)).filter(k => !base.has(k)).sort(); const badR = extraR.filter(k => !ALLOWED.includes(k));
console.log(`${badR.length ? 'FAIL' : 'PASS'} [${ENGINE}] refused newer-save boot window globals vs blank page: ${JSON.stringify(extraR)}`);
const bad = [...extra.filter(k => !ALLOWED.includes(k)), ...badR];
console.log(`${bad.length ? 'FAIL' : 'PASS'} [${ENGINE}] release window globals vs blank page: ${JSON.stringify(extra)}; allowed ${JSON.stringify(ALLOWED)}; not allowed ${JSON.stringify(bad)}; 'eggfarm' in window=${inWin}; egg ids/names ${JSON.stringify(ids)}`);
await br.close(); srv.stop(); process.exit(bad.length || !perfOk ? 1 : 0);
