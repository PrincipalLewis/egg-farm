// PR #12 L30-19b functional. usage: node qa-pr12-func.mjs <engine> <portM4> <portOff> <sha7> <outdir>
import pw from 'playwright-core'; import fs from 'fs';
const [E, PM, PO, S7, OUT] = process.argv.slice(2); const res = [];
const rec = (n, p, i) => { res.push({ e: E, n, p, i }); console.log(`${p === true ? 'PASS' : p === false ? 'FAIL' : 'NOTE'} ${E} ${n} ${JSON.stringify(i)}`); };
const b = await pw[E].launch(E === 'chromium' ? { executablePath: '/usr/bin/google-chrome' } : {});
const farmTab = async pg => { await pg.locator('nav [data-nav=upgrades]').click({ force: true }); await pg.locator('.tabs [data-tab=farm]').click({ force: true }); await pg.waitForTimeout(300); };
const boot = async (pg, port) => { await pg.goto(`http://127.0.0.1:${port}/`); await pg.getByText('Tap to start').click(); await pg.waitForFunction(() => window.eggfarm, null, { timeout: 15000 }); };
const bid = pg => pg.evaluate(async () => { const t = await Promise.all([...document.scripts].filter(s => s.src).map(s => fetch(s.src).then(r => r.text()))); return (t.join().match(/m3-rc1-pre\+[0-9a-f]+(\+dirty)?/) || [null])[0]; });
const visible = pg => pg.evaluate(() => { const l = document.querySelector('[data-testid=hire-nudge-line]'); return !!l && !l.hidden && l.getBoundingClientRect().height > 0; });
const saved = pg => pg.evaluate(() => { window.eggfarm.save(); const r = localStorage.getItem('eggfarm.save'); return r; });
try {
  // ---- flag ON ----
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const pg = await ctx.newPage();
  await pg.addInitScript(() => { if (!sessionStorage.qaInit) { localStorage.clear(); localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true })); sessionStorage.qaInit = 1; } });
  await boot(pg, PM); const id = await bid(pg); rec('ON build ID (+dirty = QA-only m4.enabled=1 edit)', id === `m3-rc1-pre+${S7}+dirty` || id === `m3-rc1-pre+${S7}`, id);
  rec('ON live cap (maxLevel) = 30', await pg.evaluate(() => window.eggfarm.balance.maxLevel) === 30, await pg.evaluate(() => window.eggfarm.balance.maxLevel));
  await pg.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 24, coinsCents: 5e7 }; }); await farmTab(pg); await pg.waitForTimeout(1200);
  rec('ON F24: no nudge', !(await visible(pg)), null);
  const t0 = Date.now(); await pg.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 25 }; });
  let ms = null; for (let i = 0; i < 40; i++) { if (await visible(pg)) { ms = Date.now() - t0; break; } await pg.waitForTimeout(50); }
  rec('ON F25, 0 workers: nudge within 1 s', ms !== null && ms <= 1000, { ms });
  const x = await pg.evaluate(() => { const x = document.querySelector('[data-testid=hire-nudge-dismiss]'); const r = x?.getBoundingClientRect(); return x && { w: r.width, h: r.height, aria: x.getAttribute('aria-label') }; });
  rec('ON dismiss × 44x44 + aria-label', !!x && x.w >= 44 && x.h >= 44 && !!x.aria, x);
  await pg.locator('[data-testid=hire-nudge-dismiss]').click(); await pg.waitForTimeout(400);
  const f = await pg.evaluate(() => ({ hidden: !(document.querySelector('[data-testid=hire-nudge-line]')?.getBoundingClientRect().height > 0), focus: document.activeElement?.matches('button.btn.buy[data-kind="farm"]'), fe: document.activeElement?.outerHTML.slice(0, 80) }));
  rec('ON dismiss hides nudge', f.hidden, null); rec('ON focus -> Farm Buy after dismiss', !!f.focus, f.fe);
  await pg.waitForTimeout(1500); rec('ON stays hidden this session', !(await visible(pg)), null);
  const s1 = await saved(pg); rec('ON dismiss does not persist hireNudgeDone', !/hireNudgeDone/.test(s1 || ''), null);
  await pg.reload(); await pg.getByText('Tap to start').click(); await pg.waitForFunction(() => window.eggfarm); await farmTab(pg); await pg.waitForTimeout(1200);
  rec('ON returns next session (reload)', await visible(pg), await pg.evaluate(() => window.eggfarm.state.farmLevel));
  // first hire via the UI
  await pg.locator('[data-testid=hire-nudge]').click(); await pg.waitForTimeout(800);
  const hb = pg.locator('.wk button.btn:not([disabled])').first(); const hasHb = await hb.count();
  if (hasHb) await hb.click(); await pg.waitForTimeout(1000);
  const hired = await pg.evaluate(() => Object.values(window.eggfarm.state.workers).some(Boolean));
  rec('ON first hire done via Workers tab', hired, null);
  await pg.locator('.tabs [data-tab=farm]').click({ force: true }); await pg.waitForTimeout(800); rec('ON first hire clears nudge (Farm tab + dots)', !(await visible(pg)) && await pg.evaluate(() => ![...document.querySelectorAll('[data-testid=new-dot]')].some(d => d.getBoundingClientRect().width > 0)), null);
  const s2 = await saved(pg); rec('ON hireNudgeDone:1 saved after hire', /"hireNudgeDone":1/.test(s2 || ''), null);
  await pg.reload(); await pg.getByText('Tap to start').click(); await pg.waitForFunction(() => window.eggfarm); await farmTab(pg); await pg.waitForTimeout(1200);
  rec('ON stays cleared after reload', !(await visible(pg)), null);
  await pg.screenshot({ path: `${OUT}/${E}-func-on-after-hire.png` }); await ctx.close();
  // ---- flag OFF ----
  const c2 = await b.newContext({ viewport: { width: 390, height: 844 } }); const p2 = await c2.newPage();
  await p2.addInitScript(() => { if (!sessionStorage.qaInit) { localStorage.clear(); localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true })); sessionStorage.qaInit = 1; } });
  await boot(p2, PO); const id2 = await bid(p2); rec('OFF build ID', id2 === `m3-rc1-pre+${S7}`, id2);
  rec('OFF flag off', await p2.evaluate(() => !window.eggfarm.balance.m4?.enabled), null);
  await p2.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 25, coinsCents: 5e7 }; }); await farmTab(p2); await p2.waitForTimeout(1500);
  const off = await p2.evaluate(() => ({ line: !!document.querySelector('[data-testid=hire-nudge-line]')?.getBoundingClientRect().height, dots: [...document.querySelectorAll('[data-testid=new-dot]')].filter(d => d.getBoundingClientRect().width > 0).length }));
  rec('OFF F25: no nudge, no dots', !off.line && off.dots === 0, off);
  const s3 = await saved(p2); rec('OFF save has no hireNudgeDone', !!s3 && !/hireNudgeDone/.test(s3), null);
  await c2.close();
} catch (e) { rec('script error', false, String(e).slice(0, 300)); }
await b.close(); fs.writeFileSync(`${OUT}/${E}-func-results.json`, JSON.stringify(res, null, 1));
console.log(`SUMMARY-FUNC ${E} ${res.filter(r => r.p === true).length} pass ${res.filter(r => r.p === false).length} fail`);
