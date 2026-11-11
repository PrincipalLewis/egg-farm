// Save migration 5d9efa6 (Latest) -> 30b29d3 (patch 1), and v5 -> 30b29d3. Chromium. Expects :5961 serving ../serve.
import { createRequire } from 'node:module'; import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire('/workspace/egg-farm-studio/qa/wt-rc1-5d9efa6/package.json'); const pw = require('playwright-core');
const DIR = '/workspace/egg-farm-studio/qa/m41/pub-30b29d3/mig'; const B = 'http://127.0.0.1:5961/';
const OLD = B + 'm41-5d9efa6.html', NEW = B + 'p1-30b29d3.html'; const V5 = readFileSync(`${DIR}/fixture-m2-rc1-v5-12min.json`, 'utf8');
const res = {}; let bad = 0; const ok = (k, v, d) => { if (!v) bad++; (res.checks ??= []).push({ k, pass: !!v, d }); console.log(v ? 'PASS' : 'FAIL', k, JSON.stringify(d ?? '')); };
const br = await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); res.browser = br.version();
const watch = (p, sink, tag) => { p.on('pageerror', e => sink.push({ tag, t: 'pageerror', m: String(e) })); p.on('console', m => m.type() === 'error' && sink.push({ tag, t: 'console.error', m: m.text(), url: p.url(), loc: m.location()?.url })); p.on('response', r => r.status() >= 400 && sink.push({ tag, t: 'http' + r.status(), m: r.url() })); };
const raw = p => p.evaluate(() => localStorage.getItem('eggfarm.save'));
const sum = r => { let j = null; try { j = JSON.parse(r); } catch {} const s = j?.state ?? {}; const w = s.workers ?? {};
  return { version: j?.version, coinsCents: s.coinsCents, basket: s.basket, coop: s.coop && Math.floor(s.coop), farmLevel: s.farmLevel, collectionLevel: s.collectionLevel, graderTier: s.graderTier,
    workers: Object.keys(w).sort(), workerEnergy: Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v && Math.round(v.energy * 10) / 10])),
    trackish: Object.fromEntries(Object.entries(s).filter(([k, v]) => /hens|egg.?value|track|level/i.test(k) && k !== 'farmLevel' && k !== 'collectionLevel')), stateKeys: Object.keys(s).sort() }; };
const ui = p => p.evaluate(() => ({ coins: document.getElementById('coins')?.textContent, basket: document.getElementById('basket')?.textContent, recovery: !!document.querySelector('.recovery-card, .recovery-layer'),
  build: document.querySelector('meta[name="build-id"]')?.content, dirty: /\+dirty/.test(document.documentElement.outerHTML) }));
const start = async p => { await p.getByText('Tap to start').click(); await p.waitForTimeout(1200); if (await p.locator('.onb-skip').count()) await p.locator('.onb-skip').click().catch(() => {}); };
const closeSheet = async p => { const c = p.locator('.sheet:not([hidden]) .close'); if (await c.count()) await c.first().click().catch(() => {}); await p.waitForTimeout(200); };
const play = async (p, tag, taps) => { for (let i = 0; i < taps; i++) { await p.locator('#collect').click({ force: true }); await p.waitForTimeout(400); }
  await p.locator('[data-nav=market]').click(); await p.waitForTimeout(400); const sa = p.locator('#sellAll'); const label = await sa.textContent(); if (await sa.getAttribute('aria-disabled') !== 'true') await sa.click(); await p.waitForTimeout(500); await closeSheet(p);
  await p.locator('[data-nav=upgrades]').click(); await p.waitForTimeout(400); const buy = p.locator('#uRow .btn.buy.affordable'); let bought = 0;
  for (let i = 0; i < 3 && await buy.count(); i++) { await buy.first().click(); bought++; await p.waitForTimeout(300); }
  await p.screenshot({ path: `${DIR}/${tag}-old-upgrades.png` }); await closeSheet(p); return { sellAll: label, upgradesBought: bought }; };
const nothingLost = (b, a) => ({ levels: a.farmLevel === b.farmLevel && a.collectionLevel === b.collectionLevel && a.graderTier === b.graderTier, workers: JSON.stringify(a.workers) === JSON.stringify(b.workers),
  keysKept: b.stateKeys.every(k => a.stateKeys.includes(k)), track: JSON.stringify(a.trackish) === JSON.stringify(b.trackish), coins: a.coinsCents >= b.coinsCents, v6: a.version === 6 });
async function upgradePath(tag, seed) {
  const errs = []; const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const p = await ctx.newPage(); watch(p, errs, tag + ':old'); if (seed) await p.addInitScript(r => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('eggfarm.save', r); sessionStorage.setItem('seeded', '1'); } }, seed);
  await p.goto(OLD); await start(p); const oldBoot = await ui(p); const pl = await play(p, tag, 30); await p.waitForTimeout(6000);
  const uOld = await ui(p); await p.screenshot({ path: `${DIR}/${tag}-old-before-close.png` }); await p.close({ runBeforeUnload: true });
  const q = await ctx.newPage(); watch(q, errs, tag + ':new'); await q.goto(B); const rb = await raw(q); writeFileSync(`${DIR}/${tag}-save-5d9efa6.json`, rb ?? '');
  const before = sum(rb); await q.goto(NEW); const pre = await ui(q); await start(q); const uNew = await ui(q); await q.screenshot({ path: `${DIR}/${tag}-new-boot.png` }); await q.waitForTimeout(6000);
  const ra = await raw(q); writeFileSync(`${DIR}/${tag}-save-after-30b29d3.json`, ra ?? ''); const after = sum(ra); await q.screenshot({ path: `${DIR}/${tag}-new-after-autosave.png` });
  const nl = nothingLost(before, after); res[tag] = { oldBoot, play: pl, uiOld: uOld, before, uiNewPreStart: pre, uiNew: uNew, after, nothingLost: nl, errors: errs };
  ok(`${tag}: old build m4.1+5d9efa6 / new build m4.1+30b29d3, no +dirty`, oldBoot.build === 'm4.1+5d9efa6' && uNew.build === 'm4.1+30b29d3' && !uNew.dirty, { old: oldBoot.build, new: uNew.build });
  ok(`${tag}: 30b29d3 boot, no recovery dialog`, !pre.recovery && !uNew.recovery, { pre, uNew });
  ok(`${tag}: v6 save, nothing lost (levels, workers, tracks, keys; coins >=)`, Object.values(nl).every(Boolean), { before, after, nl });
  ok(`${tag}: 0 page/console/HTTP errors`, errs.length === 0, errs); await ctx.close(); }
await upgradePath('M1-fresh-play', null);
await upgradePath('M2-v5-workers-via-5d9efa6', V5);
{ // M3: v5 fixture straight into 30b29d3; M4: M2's 5d9efa6 save cold-seeded alone into 30b29d3
  for (const [tag, seed] of [['M3-v5-direct', V5], ['M4-5d9efa6-save-cold-seed', readFileSync(`${DIR}/M2-v5-workers-via-5d9efa6-save-5d9efa6.json`, 'utf8')]]) {
    const errs = []; const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const p = await ctx.newPage(); watch(p, errs, tag);
    await p.addInitScript(r => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('eggfarm.save', r); sessionStorage.setItem('seeded', '1'); } }, seed);
    const before = sum(seed); await p.goto(NEW); const pre = await ui(p); await start(p); const u = await ui(p); await p.screenshot({ path: `${DIR}/${tag}-boot.png` }); await p.waitForTimeout(6000);
    const ra = await raw(p); writeFileSync(`${DIR}/${tag}-save-after-30b29d3.json`, ra ?? ''); const after = sum(ra); await p.screenshot({ path: `${DIR}/${tag}-after-autosave.png` });
    const nl = nothingLost(before, after); if (tag.startsWith('M3')) { nl.keysKept = true; nl.track = true; } // v5 has no M4 tracks / v6 keys: judged on levels, workers, grader, coins
    res[tag] = { before, uiPreStart: pre, ui: u, after, nothingLost: nl, errors: errs };
    ok(`${tag}: build m4.1+30b29d3, no recovery dialog`, u.build === 'm4.1+30b29d3' && !u.dirty && !pre.recovery && !u.recovery, { pre, u });
    ok(`${tag}: migrated to v6, nothing lost`, Object.values(nl).every(Boolean), { before, after, nl });
    ok(`${tag}: 0 page/console/HTTP errors`, errs.length === 0, errs); await ctx.close(); } }
await br.close(); res.bad = bad; writeFileSync(`${DIR}/mig-result.json`, JSON.stringify(res, null, 2)); console.log(bad ? `MIG: ${bad} FAIL` : 'MIG: OK'); process.exit(bad ? 1 : 0);
