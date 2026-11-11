// Post-publish smoke of the released single-file egg-farm.html over file://. usage: BUILD_SHA=<sha the asset claims> node smoke-release.mjs <playwright-core dir> <engine> <html> <outdir>
// M41-10: build-id verdict via build-id-expect.mjs (BUILD_PREFIX at BUILD_SHA in BUILD_REPO, default game/); surfaces meta, #app[data-build-id],
// telemetry session_start.build + full scan. ONLY=buildid runs just the fresh-session build-id check (no core loop / saves). Exit 1 on build-id FAIL.
const [PWD, E, HTML, OUT] = process.argv.slice(2);
const pw = await import(PWD + '/index.mjs'); import { readFileSync, writeFileSync } from 'node:fs'; import { expectFromEnv, collectSurfaces, surfaceIds } from '/workspace/egg-farm-studio/qa/m3-scripts/build-id-expect.mjs';
if (!process.env.BUILD_SHA) { console.error('smoke-release: set BUILD_SHA=<sha under test> (M41-10)'); process.exit(2); }
const BX = expectFromEnv({ BUILD_REPO: '/workspace/egg-farm-studio/game', ...process.env }); const ONLY = process.env.ONLY ?? '';
const URL0 = /^https?:\/\//.test(HTML) ? HTML : 'file://' + HTML; /* M41-10: http(s) URL accepted for a served check (own port 5961-5964) */ const R = { engine: E, cases: {} }; const G4 = '/workspace/egg-farm-studio/qa/m3-recheck/gate4-fixtures';
const M1 = JSON.parse(readFileSync(`${G4}/M1-midgame-L18-dd52bfd.json`, 'utf8')).ls;
const V6 = { 'eggfarm.save': readFileSync(`${G4}/pre-v7-F30-C30-732e70e.json`, 'utf8').trim() };
const NC = { 'eggfarm.save': readFileSync('/workspace/egg-farm-studio/qa/scratch/relchk/nearcap-F29-prev7-246de09.json', 'utf8').trim() };
const UI = JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true });
const br = await (E === 'chromium' ? pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] }) : pw[E].launch());
const snap = () => { const p = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }; const s = p('eggfarm.save'), b = p('eggfarm.save.bak'), v = p('eggfarm.save.v6_backup');
  const st = s?.state ?? {}; return { ver: s?.version, seq: s?.saveSeq, coins: st.coinsCents, F: st.farmLevel, C: st.collectionLevel, H: st.hensLevel, V: st.eggValueLevel, tracksV7: st.tracksV7 ?? null, v6BackupId: st.v6BackupId ?? null, seen: st.seenTracksExplainer ?? null,
    bak: !!b, bakF: b?.state?.farmLevel ?? null, v6b: !!v, v6bId: v?.migrationId ?? null, v6bRawF: v?.raw ? (JSON.parse(v.raw).state?.farmLevel ?? null) : null, v6bRawCoins: v?.raw ? (JSON.parse(v.raw).state?.coinsCents ?? null) : null,
    card: document.querySelectorAll('.tracks-exp').length, recovery: document.querySelector('.recovery-layer')?.dataset.outcome ?? null, keys: Object.keys(localStorage).sort(), win: 'eggfarm' in window }; };
async function session(name, ls, fn) { const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(URL0); await page.evaluate(o => { localStorage.clear(); for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, ls); // inject before the game boots (reload)
  const boot = async () => { await page.reload(); await page.getByText('Tap to start').click({ timeout: 15000 }); await page.waitForTimeout(3000); out.modal = (out.modal ?? []).concat([await page.evaluate(() => document.querySelector('#modal-layer.open h2')?.textContent ?? null)]); await page.locator('#modal-layer.open button').first().click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(1500); };
  const out = { errors: errs }; await boot();
  try { await fn(page, out, boot); } catch (e) { out.threw = String(e).slice(0, 300); }
  await page.screenshot({ path: `${OUT}/${E}-${name}.png` }); R.cases[name] = out; await ctx.close(); }
// 1 + build-id, 3a fresh: no card; 2 core loop
await session('fresh-coreloop', {}, async (page, out) => {
  out.buildIdSurfaces = await page.evaluate(collectSurfaces, BX.scan); out.buildIds = [...new Set(surfaceIds(out.buildIdSurfaces))];
  if (ONLY === 'buildid') { await page.waitForTimeout(4000); out.buildIdSurfacesEnd = await page.evaluate(collectSurfaces, BX.scan); return; }
  out.start = await page.evaluate(snap); const t0 = Date.now(); const steps = [];
  while (Date.now() - t0 < 90000) {
    for (let k = 0; k < 6; k++) { await page.locator('#collect').click({ force: true, timeout: 1500 }).catch(() => {}); await page.waitForTimeout(80); }
    await page.locator('[data-nav=market]').click({ timeout: 1500 }).catch(() => {}); await page.waitForTimeout(150);
    if (await page.locator('#sellAll').isVisible().catch(() => false)) { await page.locator('#sellAll').click({ force: true, timeout: 1500 }).catch(() => {}); steps.push('sell'); }
    await page.locator('[data-nav=upgrades]').click({ timeout: 1500 }).catch(() => {}); await page.waitForTimeout(150);
    const b = page.locator('#uRow .btn.buy:not([aria-disabled=true])').first(); if (await b.count()) { await b.click({ force: true, timeout: 1500 }).catch(() => {}); steps.push('buy'); }
    await page.locator('[data-nav=farm]').click({ timeout: 1500 }).catch(() => {}); await page.waitForTimeout(100);
    const e = await page.evaluate(snap); if ((e.F + e.C + (e.H ?? 0) + (e.V ?? 0)) > 0) { out.boughtAtMs = Date.now() - t0; break; }
  }
  out.end = await page.evaluate(snap); out.steps = steps.join(','); out.cards = out.end.card; out.buildIdSurfacesEnd = await page.evaluate(collectSurfaces, BX.scan); });
{ const c = R.cases['fresh-coreloop'], all = [...surfaceIds(c.buildIdSurfaces ?? {}), ...surfaceIds(c.buildIdSurfacesEnd ?? {}, { requireTelemetry: true })], k = BX.check(all);
  R.buildIdCheck = { ok: k.ok, want: BX.label, ids: [...new Set(all)], reason: k.reason }; console.log(`${k.ok ? 'PASS' : 'FAIL'} build-id ${E} ${JSON.stringify(R.buildIdCheck)}`); }
if (ONLY !== 'buildid') {
// 3b/4 migrated pre-v7 saves: exactly one card, then 0 after reload; no loss; backups
for (const [name, ls] of [['M1-L18-dd52bfd', M1], ['v6-F30-732e70e', V6]]) await session(name, { ...ls, 'eggfarm.ui': UI }, async (page, out, boot) => {
  out.pre = await page.evaluate(o => { const s = JSON.parse(o).state; return { coins: s.coinsCents, F: s.farmLevel, C: s.collectionLevel }; }, ls['eggfarm.save']);
  await page.waitForTimeout(3000); out.s1 = await page.evaluate(snap); await page.screenshot({ path: `${OUT}/${E}-${name}-s1.png` });
  await page.locator('.tracks-exp .tracks-exp-ok').click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(500);
  await boot(); out.s2 = await page.evaluate(snap); await boot(); out.s3 = await page.evaluate(snap); });
// 6 cap
await session('nearcap-F29', { ...NC, 'eggfarm.ui': UI }, async (page, out, boot) => {
  out.s1 = await page.evaluate(snap); await page.locator('.tracks-exp .tracks-exp-ok').click({ timeout: 3000 }).catch(() => {});
  await page.locator('[data-nav=upgrades]').click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(300);
  await page.locator('[data-tab=farm]').click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(300);
  out.farmTabBtns = await page.evaluate(() => [...document.querySelectorAll('.sheet:not([hidden]) .btn.buy')].map(b => `${JSON.stringify(b.dataset)}|${b.getAttribute('aria-disabled')}|${b.textContent.trim().slice(0, 30)}`));
  out.clicks = []; for (let i = 0; i < 4; i++) { await page.locator('#uRow .btn.buy[data-kind=farm]').click({ force: true, timeout: 3000 }).catch(e => out.clicks.push('err')); await page.waitForTimeout(400);
    out.clicks.push(await page.evaluate(() => ({ lsF: JSON.parse(localStorage.getItem('eggfarm.save')).state.farmLevel, lv: document.querySelector('#uRow [data-track=farm] .lv')?.textContent ?? null, dis: document.querySelector('#uRow .btn.buy[data-kind=farm]')?.getAttribute('aria-disabled') ?? null, btn: document.querySelector('#uRow .btn.buy[data-kind=farm]')?.textContent?.trim() ?? null }))); }
  await boot(); out.s2 = await page.evaluate(snap); });
}
await br.close(); writeFileSync(`${OUT}/${E}.json`, JSON.stringify(R, null, 1)); console.log('SMOKE ' + JSON.stringify(R)); process.exitCode = R.buildIdCheck.ok ? 0 : 1;
