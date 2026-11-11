// Step-by-step smoke on the released file: core loop timing + L30 cap. usage: node smoke-step.mjs <engine> <outdir>
const [E, OUT] = process.argv.slice(2);
const pw = await import('/tmp/qa-g4s/c9d7523/node_modules/playwright-core/index.mjs'); import { readFileSync, writeFileSync } from 'node:fs';
const URL0 = 'file:///workspace/egg-farm-studio/qa/scratch/relchk/egg-farm.html';
const br = await (E === 'chromium' ? pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : pw[E].launch());
const R = { engine: E };
const st = p => p.evaluate(() => { const s = JSON.parse(localStorage.getItem('eggfarm.save') ?? 'null')?.state ?? {}; return { c: s.coinsCents, b: s.basket, F: s.farmLevel, C: s.collectionLevel, H: s.hensLevel, V: s.eggValueLevel }; });
async function ctx() { const c = await br.newContext({ viewport: { width: 390, height: 844 } }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); }); return { c, p, errs }; }
{ // core loop
  const { c, p, errs } = await ctx(); await p.goto(URL0); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.getByText('Tap to start').click(); await p.waitForTimeout(1000);
  const t0 = Date.now(); const log = []; R.core = { bought: null };
  while (Date.now() - t0 < 45000) {
    await p.locator('#collect').click({ timeout: 1000 }).catch(() => {}); await p.waitForTimeout(700); const s = await st(p); log.push(`${Date.now() - t0}ms ${JSON.stringify(s)}`);
    if ((s.b ?? 0) >= 8) { await p.locator('[data-nav=market]').click(); await p.waitForTimeout(200); await p.locator('#sellAll').click({ timeout: 1000 }).catch(() => {}); await p.locator('.sheet:not([hidden]) .close').click().catch(() => {}); log.push('sell'); }
    if ((s.c ?? 0) >= 1000) { await p.locator('[data-nav=upgrades]').click(); await p.waitForTimeout(200); await p.locator('.sheet:not([hidden]) .btn.buy:not([aria-disabled=true])').first().click({ timeout: 1000 }).catch(() => {}); await p.waitForTimeout(300);
      const e = await st(p); if ((e.F + e.C + (e.H ?? 0) + (e.V ?? 0)) > 0) { R.core.bought = Date.now() - t0; R.core.after = e; await p.screenshot({ path: `${OUT}/step-${E}-core-bought.png` }); break; } await p.locator('.sheet:not([hidden]) .close').click().catch(() => {}); }
  }
  R.core.log = log; R.core.errors = errs; if (R.core.bought === null) await p.screenshot({ path: `${OUT}/step-${E}-core-timeout.png` }); await c.close();
}
{ // cap
  const NC = readFileSync('/workspace/egg-farm-studio/qa/scratch/relchk/nearcap-F29-prev7-246de09.json', 'utf8').trim();
  const { c, p, errs } = await ctx(); await p.goto(URL0); await p.evaluate(s => { localStorage.clear(); localStorage.setItem('eggfarm.save', s); localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true })); }, NC);
  const boot = async () => { await p.reload(); await p.getByText('Tap to start').click(); await p.waitForTimeout(2500); await p.locator('#modal-layer.open button').first().click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(1200); await p.locator('.tracks-exp .tracks-exp-ok').click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(300); };
  await boot(); R.cap = { start: await st(p), steps: [] };
  await p.locator('[data-nav=upgrades]').click(); await p.waitForTimeout(300); await p.locator('[data-tab=farm]').click(); await p.waitForTimeout(300);
  const farm = () => p.evaluate(() => ({ btn: !!document.querySelector('.sheet:not([hidden]) .btn.buy[data-kind=farm]'), lv: document.querySelector('[data-track=farm] .lv')?.textContent ?? null, lsF: JSON.parse(localStorage.getItem('eggfarm.save')).state.farmLevel }));
  R.cap.steps.push(['before', await farm()]); await p.screenshot({ path: `${OUT}/step-${E}-cap-F29.png` });
  for (let i = 0; i < 4; i++) { const r = await p.locator('.sheet:not([hidden]) .btn.buy[data-kind=farm]').click({ timeout: 1500 }).then(() => 'clicked', () => 'no-button'); await p.waitForTimeout(400); R.cap.steps.push([r, await farm()]); }
  await p.screenshot({ path: `${OUT}/step-${E}-cap-L30.png` });
  await boot(); R.cap.afterReload = await st(p); await p.locator('[data-nav=upgrades]').click(); await p.waitForTimeout(300); await p.locator('[data-tab=farm]').click(); await p.waitForTimeout(300); R.cap.afterReloadUi = await farm();
  await p.screenshot({ path: `${OUT}/step-${E}-cap-reload.png` }); R.cap.errors = errs; await c.close();
}
await br.close(); writeFileSync(`${OUT}/step-${E}.json`, JSON.stringify(R, null, 1));
console.log('STEP ' + JSON.stringify({ engine: E, coreBoughtMs: R.core.bought, coreAfter: R.core.after, coreErrors: R.core.errors, cap: { start: R.cap.start, steps: R.cap.steps, afterReload: R.cap.afterReload, afterReloadUi: R.cap.afterReloadUi, errors: R.cap.errors } }));
