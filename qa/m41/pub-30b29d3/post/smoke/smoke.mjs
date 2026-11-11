// Patch-1 smoke of the draft asset (== clean build 30b29d3). Usage: node smoke.mjs <chromium|firefox|webkit>. Expects :5961 serving ../serve.
import { createRequire } from 'node:module'; import { writeFileSync } from 'node:fs';
const require = createRequire('/workspace/egg-farm-studio/qa/wt-rc1-5d9efa6/package.json'); const pw = require('playwright-core');
const ENG = process.argv[2]; const DIR = '/workspace/egg-farm-studio/qa/m41/pub-30b29d3/post/smoke'; const URL0 = 'http://127.0.0.1:5961/p1-30b29d3.html'; const X = 'm4.1+30b29d3';
const res = { engine: ENG, checks: [] }; let bad = 0; const ok = (k, v, d) => { if (!v) bad++; res.checks.push({ k, pass: !!v, d }); console.log(`[${ENG}]`, v ? 'PASS' : 'FAIL', k, JSON.stringify(d ?? '')); };
const br = ENG === 'chromium' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[ENG].launch(); res.browser = br.version();
const errs = []; const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
p.on('pageerror', e => errs.push({ t: 'pageerror', m: String(e) })); p.on('console', m => m.type() === 'error' && errs.push({ t: 'console.error', m: m.text(), loc: m.location()?.url })); p.on('response', r => r.status() >= 400 && errs.push({ t: 'http' + r.status(), m: r.url() }));
const ids = () => p.evaluate(() => ({ meta: document.querySelector('meta[name="build-id"]')?.content, app: document.getElementById('app')?.dataset.buildId, dirty: /\+dirty/.test(document.documentElement.outerHTML) }));
const ui = () => p.evaluate(() => ({ coins: document.getElementById('coins')?.textContent, basket: document.getElementById('basket')?.textContent, recovery: !!document.querySelector('.recovery-card, .recovery-layer') }));
const ls = () => p.evaluate(() => { const j = JSON.parse(localStorage.getItem('eggfarm.save') || 'null'); return j && { version: j.version, coinsCents: j.state.coinsCents, basket: j.state.basket, farmLevel: j.state.farmLevel, collectionLevel: j.state.collectionLevel }; });
await p.goto(URL0); const id = await ids(); ok('1 loads; runtime build-id ' + X + ', no +dirty', id.meta === X && id.app === X && !id.dirty, { ...id, browser: res.browser });
await p.getByText('Tap to start').click(); await p.waitForTimeout(1500); const u0 = await ui(); await p.screenshot({ path: `${DIR}/${ENG}-1-boot.png` }); ok('2 fresh boot, no recovery dialog', !u0.recovery, u0);
if (await p.locator('.onb-skip').count()) await p.locator('.onb-skip').click().catch(() => {});
for (let i = 0; i < 24; i++) { await p.locator('#collect').click({ force: true }); await p.waitForTimeout(500); }
const u1 = await ui(); await p.screenshot({ path: `${DIR}/${ENG}-2-collected.png` });
await p.locator('[data-nav=market]').click(); await p.waitForTimeout(500); const sa = await p.locator('#sellAll').textContent(); await p.locator('#sellAll').click(); await p.waitForTimeout(800);
await p.screenshot({ path: `${DIR}/${ENG}-3-sold.png` }); const c = p.locator('.sheet:not([hidden]) .close'); if (await c.count()) await c.first().click();
const u2 = await ui(); ok('3 core loop: collect -> basket up; sell -> coins change', u1.basket !== u0.basket && u2.coins !== u0.coins, { boot: u0, collected: u1, sellAll: sa, sold: u2 });
await p.waitForTimeout(6000); const s1 = await ls(); const u3 = await ui(); ok('4 autosave v6 with coins > 0', s1?.version === 6 && s1.coinsCents > 0, s1);
await p.reload(); await p.getByText('Tap to start').click(); await p.waitForTimeout(1500); const s2 = await ls(); const u4 = await ui(); const id2 = await ids(); await p.screenshot({ path: `${DIR}/${ENG}-4-reloaded.png` });
ok('5 save/reload persists', !u4.recovery && u4.coins === u3.coins && s2.coinsCents >= s1.coinsCents && s2.farmLevel === s1.farmLevel && s2.collectionLevel === s1.collectionLevel && id2.meta === X, { before: { u3, s1 }, after: { u4, s2 }, id2 });
ok('6 0 console/page/HTTP errors', errs.length === 0, errs); res.errors = errs;
await br.close(); res.bad = bad; writeFileSync(`${DIR}/${ENG}-result.json`, JSON.stringify(res, null, 2)); console.log(`[${ENG}] ` + (bad ? `SMOKE: ${bad} FAIL` : 'SMOKE: OK')); process.exit(bad ? 1 : 0);
