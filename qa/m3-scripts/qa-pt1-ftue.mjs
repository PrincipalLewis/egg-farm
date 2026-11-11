import { chromium } from 'playwright-core'; import fs from 'node:fs';
const base = 'http://127.0.0.1:4210/', OUT = '/workspace/egg-farm-studio/qa/m3-pt1/';
const axe = fs.readFileSync('/tmp/efs/lh/node_modules/axe-core/axe.min.js', 'utf8');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const R = {};
const mk = st => ({ version: 5, savedAt: Date.now(), state: { coinsCents: 0, coop: 0, basket: 0, collectionLevel: 0, farmLevel: 0, customers: [], nextCustomerInS: 5, nextCustomerId: 1, rng: 9, pendingOfflineEggs: 0, celebratedTier: 0, workers: {}, graderTier: 0, manageCdS: 0, coopFullS: 0, ...st } });
async function page(vp, save, ui) {
  const ctx = await b.newContext(vp); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(([s, u]) => { if (!sessionStorage.getItem('seeded')) { if (s) localStorage.setItem('eggfarm.save', JSON.stringify(s)); if (u) localStorage.setItem('eggfarm.ui', JSON.stringify(u)); sessionStorage.setItem('seeded', '1'); } }, [save, ui]);
  await p.goto(base); await p.getByText('Tap to start').click(); await p.waitForFunction(() => !!window.eggfarm); await p.waitForTimeout(400);
  p.errs = errs; return p;
}
const M = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, D = { viewport: { width: 1280, height: 800 } };
const onb = p => p.evaluate(() => JSON.parse(window.eggfarmExportTelemetry()).events.filter(e => e.type.startsWith('onboarding')).map(e => `${e.type}:${e.step ?? e.atStep}:${e.name ?? ''}:${e.action ?? ''}`));
const goalHidden = p => p.evaluate(() => document.querySelector('#goal').hidden);
// FTUE complete path (390)
{ const p = await page(M); const r = R.ftue_complete = { hidden_step1: await goalHidden(p) };
  await p.locator('#collect, .collect, button:has-text("Collect")').first().click().catch(() => {}); await p.waitForTimeout(3000);
  await p.evaluate(() => { const g = window.eggfarm; g.dispatch({ type: 'collect' }); }); await p.waitForTimeout(300);
  r.hidden_step2 = await goalHidden(p);
  // finish via sim actions the flow listens to: player sell + upgrade
  await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, basket: 50, coinsCents: 100000 }; g.state.customers.length || (g.state = { ...g.state, customers: [{ id: 999, demand: 5, filled: 0, waitedS: 0 }] }); g.dispatch({ type: 'sell', customerId: g.state.customers[0].id }); });
  await p.waitForTimeout(300); r.hidden_step3 = await goalHidden(p);
  await p.evaluate(() => window.eggfarm.dispatch({ type: 'buyCollection' })); await p.waitForTimeout(600);
  r.hidden_after_complete = await goalHidden(p); r.events = await onb(p); await p.screenshot({ path: OUT + 'ftue-complete-390.png' });
  // reload: onboarding not replayed
  await p.reload(); await p.getByText('Tap to start').click(); await p.waitForTimeout(500); r.overlay_after_reload = await p.locator('.onb-cap').count(); r.errs = p.errs; await p.context().close(); }
// FTUE skip path
{ const p = await page(D); const r = R.ftue_skip = { hidden_step1: await goalHidden(p) }; await p.locator('.onb-skip').click(); await p.waitForTimeout(400);
  r.hidden_after_skip = await goalHidden(p); r.events = await onb(p); await p.context().close(); }
// Workers intro A: F3 affordable / not affordable / once
const done = { onboardingDone: true, seenSlots: 3 };
{ const p = await page(M, mk({ farmLevel: 3, coinsCents: 3900 }), done); const r = R.introA = { poor_shown: await p.locator('.intro-a').count() };
  await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coinsCents: 4000 }; }); await p.waitForTimeout(1200);
  r.affordable_shown = await p.locator('.intro-a').count(); await p.screenshot({ path: OUT + 'introA-390.png' });
  await p.locator('#iaOpen').click().catch(e => r.openErr = String(e).slice(0, 80)); await p.waitForTimeout(400);
  r.workers_tab_open = await p.evaluate(() => !!document.querySelector('[data-tab=workers].active, [data-tab=workers][aria-selected=true]') || !!document.querySelector('[data-act=hire]'));
  await p.evaluate(() => window.eggfarm.dispatch({ type: 'hire', worker: 'market_hand' })); await p.waitForTimeout(800);
  r.introB = await p.locator('text=/energy|Manage/i').count(); r.events = await onb(p);
  await p.reload(); await p.getByText('Tap to start').click(); await p.waitForTimeout(800);
  await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, workers: {}, coinsCents: 5000 }; }); await p.waitForTimeout(1200);
  r.reshown_after_reload_unhired = await p.locator('.intro-a').count(); r.errs = p.errs; await p.context().close(); }
// axe on in-game screens
async function ax(p, tag) { await p.addScriptTag({ content: axe }); const v = await p.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'] })).violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0]?.target?.join(' ') }))); R['axe_' + tag] = v; }
const mid = mk({ farmLevel: 10, collectionLevel: 8, coinsCents: 50000, basket: 40, workers: { market_hand: { energy: 35, cdS: 0 }, coop_hand: { energy: 80, cdS: 0 }, hawker: { energy: 60, cdS: 0 } } });
for (const [vp, n] of [[M, '390'], [D, '1280']]) { const p = await page(vp, mid, done); await ax(p, n + '_farm');
  if (n === '390') { await p.locator('[data-nav=upgrades]').click(); await p.waitForTimeout(300); }
  await p.locator('[data-tab=workers]').click(); await p.waitForTimeout(300); await ax(p, n + '_workers');
  if (n === '390') await p.locator('.scrim').click({ position: { x: 10, y: 10 } }); await p.waitForTimeout(300); await p.locator('#settings').click(); await p.waitForTimeout(300); await ax(p, n + '_settings'); await p.screenshot({ path: OUT + `settings-${n}.png` }); await p.context().close(); }
{ const p = await page(M); await ax(p, '390_onboarding'); await p.context().close(); }
fs.writeFileSync(OUT + 'ftue-a11y-results.json', JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, null, 1)); await b.close(); process.exit(0);
