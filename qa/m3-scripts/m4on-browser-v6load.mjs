// Browser v6 load: acdbedc fixtures F1-F5 -> 90a9c84 dist-qa (M4 on) in Chromium. cwd = 90a9c84 worktree. PORT, OUT env.
import { chromium, webkit, firefox } from 'playwright-core';
import { spawn } from 'node:child_process'; import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { expectFromEnv, collectBundleIds } from '/workspace/egg-farm-studio/qa/m3-scripts/build-id-expect.mjs'; const BX = expectFromEnv(); // M41-10: BUILD_SHA (default worktree HEAD), BUILD_DIRTY=require, legacy EXPECT_BUILD
const OUT = process.env.OUT, port = +process.env.PORT, base = `http://127.0.0.1:${port}/`, EXPECT = BX.label, ENG = process.argv[2] ?? 'chromium';
const D = '/workspace/egg-farm-studio/qa/m3-recheck/m4-downgrade-fixtures', D2 = '/workspace/egg-farm-studio/qa/m3-recheck/gate4-fixtures'; mkdirSync(OUT, { recursive: true });
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
const kill = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch {} }; process.on('exit', kill);
for (let i = 0; i < 80; i++) { try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
const browser = ENG === 'webkit' ? await webkit.launch() : ENG === 'firefox' ? await firefox.launch() : await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const R = []; const ok = (id, n, p, info) => R.push({ id, n, pass: !!p, info: JSON.stringify(info) });
const CORE = ['coinsCents', 'farmLevel', 'collectionLevel', 'graderTier'], M4 = ['hensLevel', 'eggValueLevel', 'tracksV7', 'v6BackupId', 'celebratedMilestones'];
const read = p => p.evaluate(() => { const g = window.eggfarm, raw = localStorage.getItem('eggfarm.save'), j = JSON.parse(raw);
  return { live: { ...g.state, customers: undefined }, recovery: g.recovery ?? null, pending: g.tracksMigrationPending, saved: j.state, seq: j.saveSeq ?? 0, savedAt: j.savedAt,
    dialog: !!document.querySelector('.save-recovery, .recovery, #modal-layer.open .card') ? document.querySelector('#modal-layer.open .card')?.innerText.slice(0, 200) ?? 'recovery-el' : null }; });
for (const id of ['F1-tracks', 'F2-highlight', 'F3-offline-pending', 'F4-L30max', 'F5-preM4', 'M1-midgame-L18']) {
  const fx = JSON.parse(readFileSync(id === 'M1-midgame-L18' ? `${D2}/M1-midgame-L18-dd52bfd.json` : `${D}/${id}.json`, 'utf8')), s0 = fx.state;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(ls => { if (!sessionStorage.getItem('qs')) { sessionStorage.setItem('qs', '1'); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v); } }, fx.ls);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(base); const t = p.getByText('Tap to start'); if (await t.count()) await t.first().click().catch(() => {});
  await p.waitForFunction(() => window.eggfarm); await p.waitForTimeout(1200);
  const bids = await p.evaluate(collectBundleIds, BX.scan), bc = BX.check(bids), bid = bids.join(','); // M41-10: all bundle ids, helper check
  ok(id, 'runtime build-id', bc.ok, { bid, want: EXPECT, reason: bc.reason });
  const a = await read(p); await p.screenshot({ path: `${OUT}/${ENG}-${id}-load.png` });
  ok(id, 'no recovery', a.recovery === null && !/recover|corrupt|restore/i.test(a.dialog ?? ''), { r: a.recovery, dialog: a.dialog });
  for (const k of CORE) ok(id, `kept ${k}`, JSON.stringify(a.live[k]) === JSON.stringify(s0[k]), [s0[k], a.live[k]]);
  ok(id, 'eggs: basket+pending >= fixture basket+pending', a.live.basket + a.live.pendingOfflineEggs >= s0.basket + s0.pendingOfflineEggs, [s0.basket, s0.pendingOfflineEggs, a.live.basket, a.live.pendingOfflineEggs]);
  if (!['F5-preM4', 'M1-midgame-L18'].includes(id)) for (const k of M4) ok(id, `M4 kept ${k}`, JSON.stringify(a.saved[k]) === JSON.stringify(s0[k]), [s0[k], a.saved[k]]);
  ok(id, 'written on load: saveSeq advanced', a.seq > fx.saveSeq, [fx.saveSeq, a.seq]);
  if (['F5-preM4', 'M1-midgame-L18'].includes(id)) { const m = await p.evaluate(() => window.eggfarm.startTracksMigration?.()); await p.waitForTimeout(500); ok(id, 'pre-M4 migration committed', m === 'committed' || (await read(p)).saved.tracksV7 === 1, m); }
  await p.evaluate(() => { const b = document.querySelector('#wbCollect'); b && b.click(); }); await p.waitForTimeout(300);
  await p.evaluate(() => window.eggfarm.save()); const b1 = await read(p);
  ok(id, 'writable: explicit save advances saveSeq', b1.seq > a.seq, [a.seq, b1.seq]);
  await p.reload(); { const t2 = p.getByText('Tap to start'); await p.waitForTimeout(800); if (await t2.count()) await t2.first().click().catch(() => {}); }
  try { await p.waitForFunction(() => window.eggfarm, null, { timeout: 15000 }); } catch (e) { await p.screenshot({ path: `${OUT}/${id}-reload-STUCK.png` }); writeFileSync(`${OUT}/${id}-reload-STUCK.txt`, await p.evaluate(() => document.body.innerText.slice(0, 2000) + '\nLS:' + localStorage.getItem('eggfarm.save')?.slice(0, 400))); throw e; } await p.waitForTimeout(1200); const c = await read(p); await p.screenshot({ path: `${OUT}/${ENG}-${id}-reload.png` });
  ok(id, 'reload: no recovery', c.recovery === null, c.recovery);
  for (const k of [...CORE, ...M4]) ok(id, `round-trip ${k}`, JSON.stringify(c.saved[k]) === JSON.stringify(b1.saved[k]), [b1.saved[k], c.saved[k]]);
  ok(id, 'round-trip eggs not lost', c.live.basket + c.live.pendingOfflineEggs >= b1.saved.basket + b1.saved.pendingOfflineEggs, [b1.saved.basket, b1.saved.pendingOfflineEggs, c.live.basket, c.live.pendingOfflineEggs]);
  ok(id, 'reload saveSeq advanced', c.seq > b1.seq, [b1.seq, c.seq]);
  ok(id, 'no page errors', !errs.length, errs);
  writeFileSync(`${OUT}/${id}.json`, JSON.stringify({ bid, a, b1, c, errs }, null, 1)); await ctx.close();
}
await browser.close(); kill();
writeFileSync(`${OUT}/result-${ENG}.json`, JSON.stringify(R, null, 1));
for (const r of R) if (!r.pass) console.log(`FAIL ${r.id} ${r.n} ${r.info.slice(0, 300)}`);
for (const id of [...new Set(R.map(r => r.id))]) console.log(`${id}: ${R.filter(r => r.id === id && r.pass).length}/${R.filter(r => r.id === id).length}`);
console.log(`${R.filter(r => r.pass).length}/${R.length}`);
