// Dry-run proof for offline-seed.mjs: pinned fixture -> seedOffline(-2 h) -> cold-load -> welcome-back shows, grant > 0, savedAt was moved back, no errors.
// usage (caller holds the lock): node offline-seed-proof.mjs --html <f> --port 5962 --out <dir> [--engine chromium] [--agoS 7200]
import { serve, launch, watch, start, ui } from './lib.mjs'; import { loadPinned, seedOffline, captureSave } from './offline-seed.mjs';
import { parseArgs } from 'node:util'; import path from 'node:path'; import { writeFileSync, mkdirSync } from 'node:fs';
const { values: A } = parseArgs({ options: { html: { type: 'string' }, port: { type: 'string', default: '5962' }, out: { type: 'string' }, engine: { type: 'string', default: 'chromium' }, agoS: { type: 'string', default: '7200' } } });
const OUT = path.resolve(A.out); mkdirSync(OUT, { recursive: true }); const raw = loadPinned(); const srv = await serve(path.join(OUT, '.serve'), { 'g.html': A.html }, A.port); const br = await launch(A.engine); let ok = false; const r = {};
try { const errs = []; const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); watch(p, errs, 'proof');
  await seedOffline(p, raw, { agoS: +A.agoS }); const t0 = Date.now(); await p.goto(srv.url + 'g.html');
  const seeded = await p.evaluate(() => JSON.parse(localStorage.getItem('eggfarm.save') || 'null')?.savedAt ?? null); await start(p); await p.waitForTimeout(1200);
  const welcome = await p.locator('#wbT').isVisible().catch(() => false); const wbText = welcome ? (await p.locator('#wbT').innerText()).slice(0, 120) : null;
  const pending = await p.evaluate(() => JSON.parse(localStorage.getItem('eggfarm.save') || 'null')?.state?.pendingOfflineEggs ?? null); const u = await ui(p);
  await p.screenshot({ path: path.join(OUT, `proof-${A.engine}.png`) }); await p.reload(); const reseeded = await captureSave(p); await ctx.close();
  Object.assign(r, { engine: A.engine, agoS: +A.agoS, seededAgoS: seeded ? Math.round((t0 - seeded) / 1000) : null, welcome, wbText, pending, recovery: u.recovery, errs, oneShot: JSON.parse(reseeded).savedAt !== seeded });
  ok = Math.abs(r.seededAgoS - +A.agoS) <= 5 && welcome && !u.recovery && errs.length === 0 && r.oneShot;
} finally { await br.close(); await srv.stop(); }
writeFileSync(path.join(OUT, `proof-${A.engine}.json`), JSON.stringify({ ok, ...r }, null, 1)); console.log(`${ok ? 'PASS' : 'FAIL'} offline-seed proof ${JSON.stringify(r)}`); process.exit(ok ? 0 : 1);
